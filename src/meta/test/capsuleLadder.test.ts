/**
 * The 2026-09-29 capsule ladder in the meta rules (DESIGN A6.4, A6.5, A10, B8; owner request "more
 * capsule tiers"): capsule skins, the Aeon Collection, crafting, summit strikes, the first-of-tier
 * flag, the 200-slot bag's size and the legacy skill Aeons.
 */
import { describe, expect, it } from 'vitest';
import type { PendingCapsule, SaveDoc } from '@/contracts';
import type { Content, CosmeticItemDef } from '@/content';
import { migrate } from '@/save/migrations';
import capsuleLadderPre from '@/save/test/fixtures/capsule-ladder-pre.json';
import { bagLeft, bagTotal, copiesStillNeeded, grantCapsuleAt, openCapsuleWith, strikeCounts, STRIKES } from '../capsules';
import { craftCosmetic, exclusiveSets, firstOfTierFlag, rollCapsuleCosmetic } from '../cosmetics';
import { grantLegacySkillAeons, LEGACY_SKILL_AEON_FLAG, legacySkillAeonCount } from '../legacyAeons';
import { C, clock, lastPending, M, scripted, T0 } from './helpers';

const SKIN_RARITIES = ['rare', 'epic', 'legendary'] as const;
const legendaries = (tier: PendingCapsule['tier']): number => C.capsules.tiers[tier].guaranteed.filter((r) => r === 'legendary').length;
const topTier = C.capsules.tierOrder[C.capsules.tierOrder.length - 1]!;

/** The content with a 4-item collection exclusive to the top tier (the Aeon Collection, A6.4 step 8). */
function withAeonSet(): Content {
  const items: CosmeticItemDef[] = [
    { id: 'aeon_hourglass', collection: 'decoration', rarity: 'legendary', source: { kind: 'capsuleTier', tier: topTier }, art: 'cosmetic.decoration.aeon_hourglass', nameKey: 'cosmetic.decoration.aeon_hourglass.name', kind: 'trophy' },
    { id: 'eternal_dawn', collection: 'baseFlag', rarity: 'legendary', source: { kind: 'capsuleTier', tier: topTier }, art: 'cosmetic.baseFlag.eternal_dawn', nameKey: 'cosmetic.baseFlag.eternal_dawn.name' },
    { id: 'frozen_moment', collection: 'emote', rarity: 'legendary', source: { kind: 'capsuleTier', tier: topTier }, art: 'cosmetic.emote.frozen_moment', nameKey: 'cosmetic.emote.frozen_moment.name', theme: 'general' },
    { id: 'across_the_ages', collection: 'quote', rarity: 'legendary', source: { kind: 'capsuleTier', tier: topTier }, art: 'cosmetic.quote.across_the_ages', nameKey: 'cosmetic.quote.across_the_ages.name', textKey: 'cosmetic.quote.across_the_ages.text' },
  ];
  const col = C.cosmetics.collections;
  return { ...C, cosmetics: { ...C.cosmetics, collections: { ...col, items: [...col.items, ...items] } } };
}

describe('capsule skins (A6.4 step 7)', () => {
  it('Platinum and Aeon always hold a skin, Aeon Epic or better; Wardrobe pity never moves', () => {
    let s = scripted(40, 7);
    for (const tier of C.capsules.tierOrder.filter((t) => C.capsules.tiers[t].skinChanceBp >= 10000)) {
      const min = SKIN_RARITIES.indexOf(C.capsules.tiers[tier].skinMinRarity);
      for (let i = 0; i < 60; i += 1) {
        const pity = s.pity;
        const g = M.grantCapsule(s, 'road', C, clock(), { tier });
        const cap = lastPending(g);
        expect(cap.contents.skin, tier).not.toBeNull();
        expect(SKIN_RARITIES.indexOf(C.skins[cap.contents.skin!]!.rarity), tier).toBeGreaterThanOrEqual(min);
        const o = M.openCapsule(g, cap.id);
        expect(o.save.pity.wardrobeSinceEpic).toBe(pity.wardrobeSinceEpic);
        expect(o.save.pity.wardrobeSinceLegendary).toBe(pity.wardrobeSinceLegendary);
        s = o.save;
      }
    }
  });

  it('Aeon skins split 82 / 18 between Epic and Legendary', () => {
    let epic = 0;
    let legendary = 0;
    for (let seed = 0; seed < 600; seed += 1) {
      const cap = lastPending(M.grantCapsule(scripted(1000 + seed, 7), 'road', C, clock(), { tier: topTier }));
      const r = C.skins[cap.contents.skin!]!.rarity;
      if (r === 'epic') epic += 1;
      if (r === 'legendary') legendary += 1;
    }
    expect(epic + legendary).toBe(600);
    expect(legendary / 600).toBeGreaterThan(0.1);
    expect(legendary / 600).toBeLessThan(0.27);
  });
});

describe('the Aeon Collection (A6.4 step 8)', () => {
  const T = withAeonSet();

  it('an Aeon holds an item the player lacks and no unopened capsule holds, then +500 Dust once the set is done', () => {
    let s = scripted(50, 7);
    const seen: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const g = grantCapsuleAt(s, 'road', T, T0, { tier: topTier });
      const key = g.capsule.contents.cosmetic;
      expect(key).toBeTruthy();
      expect(seen).not.toContain(key);
      seen.push(key!);
      expect(g.capsule.contents.dust).toBe(C.capsules.tiers[topTier].bonusDust);
      s = g.save; // kept unopened: the next Aeon must not repeat it
    }
    expect(new Set(seen).size).toBe(4);
    const fifth = grantCapsuleAt(s, 'road', T, T0, { tier: topTier });
    expect(seen).not.toContain(fifth.capsule.contents.cosmetic);
    expect(fifth.capsule.contents.dust).toBe(C.capsules.tiers[topTier].bonusDust + C.capsules.exclusiveCompleteDust);
  });

  it('never changes the cards (its own stream) and never appears below the top tier', () => {
    const s = scripted(51, 7);
    const plain = grantCapsuleAt(s, 'road', C, T0, { tier: topTier }).capsule;
    const withSet = grantCapsuleAt(s, 'road', T, T0, { tier: topTier }).capsule;
    expect(withSet.contents.stacks).toEqual(plain.contents.stacks);
    expect(withSet.contents.skin).toEqual(plain.contents.skin);
    for (const tier of C.capsules.tierOrder.filter((t) => !C.capsules.tiers[t].exclusiveItems)) {
      for (let seed = 0; seed < 30; seed += 1) {
        const key = rollCapsuleCosmetic(scripted(60 + seed, 7), T, tier, 'road', false).key;
        expect(key === null || !key.startsWith('decoration.aeon_') ).toBe(true);
      }
    }
  });

  it('without Aeon items in the content an Aeon rolls the normal pool and adds no Dust', () => {
    const r = rollCapsuleCosmetic(scripted(52, 7), C, topTier, 'road', false);
    expect(r.dust).toBe(0);
  });

  it('crafting is locked before the first Aeon, then costs 3,000 Dust', () => {
    const s: SaveDoc = { ...scripted(53, 7), currencies: { amber: 0, dust: 5000 } };
    expect(craftCosmetic(s, T, 'quote.across_the_ages')).toEqual({ ok: false, reason: 'locked' });
    const opened: SaveDoc = { ...s, flags: { ...s.flags, [firstOfTierFlag(topTier)]: true } };
    const r = craftCosmetic(opened, T, 'quote.across_the_ages');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.currencies.dust).toBe(5000 - C.capsules.exclusiveCraftDust);
    expect(r.value.cosmetics.owned).toContain('quote.across_the_ages');
    expect(craftCosmetic(r.value, T, 'quote.across_the_ages')).toEqual({ ok: false, reason: 'owned' });
    expect(exclusiveSets(r.value, T)).toEqual([
      { tier: topTier, owned: 1, total: 4, craftable: true, craftDust: 3000, completeDust: 500 },
    ]);
    expect(exclusiveSets(r.value, C)).toEqual([]);
  });
});

describe('strikes and the first of a tier (A10)', () => {
  it('main strikes climb up to Gold, summit strikes above it, for every start and final pair', () => {
    const order = C.capsules.tierOrder;
    const top = order.indexOf(C.capsules.summitAbove);
    for (let a = 0; a < order.length; a += 1) {
      for (let b = a; b < order.length; b += 1) {
        const { main, summit } = strikeCounts(C, order[a]!, order[b]!);
        expect(main).toBeLessThanOrEqual(STRIKES);
        expect(summit).toBe(Math.max(0, b - Math.max(top, a)));
        expect(main + summit).toBe(Math.min(b - a, STRIKES + summit));
      }
    }
    expect(strikeCounts(C, 'clay', 'aeon')).toEqual({ main: 4, summit: 2 });
    expect(strikeCounts(C, 'bronze', 'platinum')).toEqual({ main: 3, summit: 1 });
    expect(strikeCounts(C, 'bronze', 'gold')).toEqual({ main: 3, summit: 0 });
    expect(strikeCounts(C, 'platinum', 'platinum')).toEqual({ main: 0, summit: 0 });
  });

  it('the reveal carries 4 back-loaded main strikes plus the summit climbs', () => {
    const s = scripted(70, 7);
    const g = grantCapsuleAt(s, 'win', C, T0, { tier: topTier });
    const o = openCapsuleWith(g.save, g.capsule.id, C);
    expect(o.reveal.strikeClimbs).toEqual([true, true, true, true]);
    expect(o.reveal.climbs).toBe(6);
  });

  it('firstOfTier is true once per Legendary tier and sets capsule.first.<tier>', () => {
    let s = scripted(71, 7);
    for (const tier of C.capsules.tierOrder) {
      for (let i = 0; i < 2; i += 1) {
        const g = grantCapsuleAt(s, 'road', C, T0, { tier });
        const o = openCapsuleWith(g.save, g.capsule.id, C);
        expect(o.reveal.firstOfTier, `${tier} #${i}`).toBe(i === 0 && legendaries(tier) > 0);
        if (legendaries(tier) > 0) expect(o.save.flags[firstOfTierFlag(tier)]).toBe(true);
        s = o.save;
      }
    }
  });
});

describe('the 200-slot bag (A6.4)', () => {
  it('a fresh bag records its size; the total shown is the stored size or a fresh bag', () => {
    const s = scripted(80, 7);
    expect(s.capsules.bagSize).toBe(0);
    expect(bagTotal(s.capsules, C.capsules)).toBe(200);
    const g = M.grantCapsule(s, 'win', C, clock());
    expect(g.capsules.bag).toHaveLength(199);
    expect(g.capsules.bagSize).toBe(200);
    expect(bagTotal({ bag: [0, 6], bagSize: 100 }, C.capsules)).toBe(100);
    expect(bagLeft([0, 6], C.capsules)).toEqual({ clay: 1, bronze: 0, silver: 0, jade: 0, gold: 0, platinum: 0, aeon: 1 });
  });

  it('an old 100 bag finishes with its old mix, then a 200 bag starts', () => {
    const s: SaveDoc = { ...scripted(81, 7), capsules: { ...scripted(81, 7).capsules, bag: [0, 6], bagSize: 100 } };
    const a = M.grantCapsule(s, 'win', C, clock());
    expect(a.capsules.bagSize).toBe(100);
    expect(a.capsules.bag).toHaveLength(1);
    const b = M.grantCapsule(a, 'win', C, clock());
    expect(b.capsules.bag).toEqual([]);
    expect(b.capsules.bagSize).toBe(0);
    expect(new Set([lastPending(a).tier, lastPending(b).tier])).toEqual(new Set(['clay', 'aeon']));
    const c = M.grantCapsule(b, 'win', C, clock());
    expect(c.capsules.bag).toHaveLength(199);
    expect(c.capsules.bagSize).toBe(200);
  });
});

describe('Legendary catch-up input (A6.4 step 4)', () => {
  it('counts the copies to the cap after unopened capsules', () => {
    const s = scripted(90, 7);
    const up = C.rarities.cards.legendary.upgradeCopies;
    const full = up.reduce((a, b) => a + b, 0);
    const withCard: SaveDoc = { ...s, collection: { ...s.collection, mothership: { level: 1, copies: 1, isNew: false, foil: 'none' } } };
    expect(copiesStillNeeded(withCard, C).get('mothership')).toBe(full - 1);
    const pending: PendingCapsule = {
      id: 'p', kind: 'road', tier: 'gold', startTier: 'gold', scriptIndex: null, age: null, createdAt: T0,
      contents: { stacks: [{ card: 'mothership', rarity: 'legendary', copies: 2, isNew: false, foil: 'none', dust: 0 }], amber: 0, dust: 0, skin: null },
    };
    const both: SaveDoc = { ...withCard, capsules: { ...withCard.capsules, pending: [pending] } };
    expect(copiesStillNeeded(both, C).get('mothership')).toBe(full - 3);
    const maxed: SaveDoc = { ...s, collection: { ...s.collection, mothership: { level: C.economy.maxLevel, copies: 0, isNew: false, foil: 'none' } } };
    expect(copiesStillNeeded(maxed, C).get('mothership')).toBe(0);
  });
});

describe('legacy skill Aeons (B8, the v6 migration)', () => {
  function migrated(): SaveDoc {
    const m = migrate(JSON.parse(JSON.stringify(capsuleLadderPre)));
    if (!m.ok) throw new Error(m.reason);
    return m.doc as SaveDoc;
  }

  it('one tick grants one new Aeon per claimed skill source, once, and deletes the flag', () => {
    const s = migrated();
    expect(s.flags[LEGACY_SKILL_AEON_FLAG]).toBe(true);
    expect(legacySkillAeonCount(s, C)).toBe(1);
    const before = s.capsules.pending.length;
    const t1 = M.tickTimers(s, clock());
    const added = t1.capsules.pending.slice(before);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ kind: 'road', tier: topTier, startTier: topTier });
    expect(added[0]!.contents.stacks.filter((x) => x.rarity === 'legendary').length).toBeGreaterThanOrEqual(legendaries(topTier));
    expect(t1.flags[LEGACY_SKILL_AEON_FLAG]).toBeUndefined();
    const t2 = M.tickTimers(t1, clock());
    expect(t2.capsules.pending).toHaveLength(t1.capsules.pending.length);
    // The notice counts what was granted, not a source claimed after the update
    expect(legacySkillAeonCount(t2, C)).toBe(1);
    const later: SaveDoc = { ...t2, conquest: { ...t2.conquest, milestonesClaimed: [9, 18, 27] } };
    expect(legacySkillAeonCount(later, C)).toBe(1);
    const fresh = scripted(96, 7);
    expect(legacySkillAeonCount({ ...fresh, trophies: { ...fresh.trophies, roadClaimed: [4000] } }, C)).toBe(0);
  });

  it('counts the road summit, Conquest 27 stars and the War Path finale', () => {
    const s = migrated();
    const finale = C.warPath.order.find((id) => C.warPath.levels[id]?.reward.capsule === topTier);
    const all: SaveDoc = {
      ...s,
      conquest: { ...s.conquest, milestonesClaimed: [9, 18, 27] },
      warPath: { ...s.warPath, stars: { ...s.warPath.stars, ...(finale ? { [finale]: 1 } : {}) } },
    };
    const want = 2 + (finale ? 1 : 0);
    expect(legacySkillAeonCount(all, C)).toBe(want);
    const kinds = grantLegacySkillAeons(all, C, T0).capsules.pending.slice(s.capsules.pending.length).map((p) => p.kind);
    expect(kinds).toEqual(['road', 'conquest', ...(finale ? ['warPath'] : [])]);
  });

  it('does nothing without the flag', () => {
    const s = scripted(95, 7);
    expect(grantLegacySkillAeons(s, C, T0)).toBe(s);
  });
});

describe('rule code is data-driven (A6.4)', () => {
  it('names no tier id in the capsule rules', () => {
    const sources = import.meta.glob<string>(['../capsules/*.ts', '../economy.ts', '../legacyAeons.ts', '../tables.ts', '../cosmetics.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    expect(Object.keys(sources).length).toBeGreaterThan(8);
    for (const [f, code] of Object.entries(sources)) {
      for (const id of ['aeon', 'jade', 'gold', 'platinum']) expect(code.includes(`'${id}'`), `${f} names '${id}'`).toBe(false);
    }
  });
});
