/**
 * Opening capsules and crates (DESIGN A6.4 steps 5-6, A6.5 counters, A10 climb, A10.1 reel, B8
 * "rolled before any animation").
 */
import { describe, expect, it } from 'vitest';
import type { PendingCapsule, SaveDoc } from '@/contracts';
import { seedSfc32 } from '@/core';
import { rollSkinRarity, strikePattern } from '../capsules';
import { C, M, clock, deepFreeze, fresh, lastPending, ownsAll, passesChi2, scripted } from './helpers';

function withPending(s: SaveDoc, cap: PendingCapsule): SaveDoc {
  return { ...s, capsules: { ...s.capsules, pending: [...s.capsules.pending, cap] } };
}

function capsule(o: Partial<PendingCapsule> & Pick<PendingCapsule, 'contents'>): PendingCapsule {
  return { id: 'cap_test', kind: 'win', tier: 'silver', startTier: 'clay', scriptIndex: null, age: null, createdAt: 1, ...o };
}

describe('openCapsule', () => {
  it('reveals exactly what was rolled at grant time; the save holds the roll before opening', () => {
    const s = scripted(5, 7);
    const g = M.grantCapsule(s, 'win', C, clock());
    const cap = lastPending(g);
    const again = M.grantCapsule(s, 'win', C, clock());
    expect(lastPending(again)).toEqual(cap);
    const o = M.openCapsule(deepFreeze(g), cap.id);
    expect(o.reveal.capsule.contents.stacks.map((x) => [x.card, x.copies, x.foil])).toEqual(cap.contents.stacks.map((x) => [x.card, x.copies, x.foil]));
    expect(o.save.capsules.pending.find((p) => p.id === cap.id)).toBeUndefined();
  });

  it('adds copies, Amber and Dust; a new card starts at L1 with its copies; foils only improve', () => {
    const s = fresh();
    const cap = capsule({
      contents: {
        stacks: [
          { card: 'bonker', rarity: 'common', copies: 6, isNew: false, foil: 'holo', dust: 0 },
          { card: 'drum_shaman', rarity: 'rare', copies: 3, isNew: true, foil: 'bronze', dust: 0 },
        ],
        amber: 300,
        dust: 0,
        skin: null,
      },
    });
    const base: SaveDoc = { ...s, collection: { ...s.collection, bonker: { level: 2, copies: 1, isNew: false, foil: 'silver' } } };
    const o = M.openCapsule(withPending(base, cap), cap.id);
    expect(o.save.collection['bonker']).toEqual({ level: 2, copies: 7, isNew: false, foil: 'holo' });
    expect(o.save.collection['drum_shaman']).toEqual({ level: 1, copies: 3, isNew: true, foil: 'bronze' });
    expect(o.save.currencies.amber).toBe(s.currencies.amber + 300);
    // A worse foil never replaces a better one.
    const worse = capsule({ id: 'cap_2', contents: { stacks: [{ card: 'bonker', rarity: 'common', copies: 1, isNew: false, foil: 'bronze', dust: 0 }], amber: 0, dust: 0, skin: null } });
    expect(M.openCapsule(withPending(o.save, worse), 'cap_2').save.collection['bonker']?.foil).toBe('holo');
  });

  it('copies of a max-level card convert to Dust at reveal time (A6.4 step 6)', () => {
    const s = fresh();
    const maxed: SaveDoc = { ...s, collection: { ...s.collection, tuskback: { level: 10, copies: 0, isNew: false, foil: 'none' } } };
    const cap = capsule({
      contents: { stacks: [{ card: 'tuskback', rarity: 'common', copies: 14, isNew: false, foil: 'none', dust: 0 }], amber: 0, dust: 100, skin: null },
    });
    const o = M.openCapsule(withPending(maxed, cap), cap.id);
    expect(o.reveal.capsule.contents.stacks[0]?.dust).toBe(14 * 5);
    expect(o.reveal.capsule.contents.dust).toBe(100);
    expect(o.save.collection['tuskback']?.copies).toBe(0);
    expect(o.save.currencies.dust).toBe(s.currencies.dust + 100 + 70);
  });

  it('each tier pays its table Amber and bonus Dust; Gold, Platinum and Aeon hold 1, 2 and 3 Legendaries (A6.4, A10)', () => {
    for (const arena of [0, 7]) {
      let s = scripted(21 + arena, arena);
      for (const tier of C.capsules.tierOrder) {
        const def = C.capsules.tiers[tier];
        for (let i = 0; i < 40; i += 1) {
          const g = M.grantCapsule(s, 'road', C, clock(), { tier });
          const cap = lastPending(g);
          expect(cap.contents.amber).toBe(def.amber);
          expect(cap.contents.dust).toBe(def.bonusDust);
          expect(cap.contents.stacks).toHaveLength(def.stacks);
          const legendaries = def.guaranteed.filter((r) => r === 'legendary').length;
          expect(cap.contents.stacks.filter((x) => x.rarity === 'legendary').length, tier).toBeGreaterThanOrEqual(legendaries);
          const o = M.openCapsule(g, cap.id);
          const stackDust = o.reveal.capsule.contents.stacks.reduce((n, x) => n + x.dust, 0);
          expect(o.save.currencies.amber).toBe(g.currencies.amber + def.amber);
          expect(o.save.currencies.dust).toBe(g.currencies.dust + o.reveal.capsule.contents.dust + stackDust);
          s = o.save;
        }
      }
    }
  });

  it('NEW is decided at reveal: a card crafted meanwhile is not new', () => {
    const s = { ...fresh(), currencies: { amber: 0, dust: 500 } };
    const cap = capsule({ contents: { stacks: [{ card: 'friar', rarity: 'rare', copies: 3, isNew: true, foil: 'none', dust: 0 }], amber: 0, dust: 0, skin: null } });
    const crafted = M.craft(withPending(s, cap), 'friar', C);
    expect(crafted.ok).toBe(true);
    if (!crafted.ok) return;
    const o = M.openCapsule(crafted.value, cap.id);
    expect(o.reveal.capsule.contents.stacks[0]?.isNew).toBe(false);
    expect(o.save.collection['friar']?.copies).toBe(4);
  });

  it('a duplicate bonus skin becomes Dust; a new one is owned (A6.4 Aeon, A6.6)', () => {
    const s = fresh();
    const cap = capsule({ tier: 'aeon', contents: { stacks: [], amber: 0, dust: 0, skin: 'pumpkin_head' } });
    const first = M.openCapsule(withPending(s, cap), cap.id);
    expect(first.save.skins.owned).toContain('pumpkin_head');
    expect(first.reveal.capsule.contents.dust).toBe(0);
    const second = M.openCapsule(withPending(first.save, { ...cap, id: 'cap_b' }), 'cap_b');
    expect(second.reveal.capsule.contents.dust).toBe(C.rarities.skins.rare.duplicateDust);
    expect(second.save.currencies.dust).toBe(first.save.currencies.dust + C.rarities.skins.rare.duplicateDust);
  });

  it('climbs: k strikes climb, back-loaded (A10 step 3; C5 #28)', () => {
    expect(strikePattern(0)).toEqual([false, false, false, false]);
    expect(strikePattern(2)).toEqual([false, false, true, true]);
    expect(strikePattern(4)).toEqual([true, true, true, true]);
    let s = scripted(11, 7);
    for (let i = 0; i < 200; i += 1) {
      const g = M.grantCapsule(s, i % 3 === 0 ? 'daily' : 'win', C, clock());
      const cap = lastPending(g);
      const o = M.openCapsule(g, cap.id);
      const order = C.capsules.tierOrder;
      const k = order.indexOf(cap.tier) - order.indexOf(cap.startTier);
      expect(o.reveal.climbs).toBe(k);
      const main = Math.min(k, Math.max(0, order.indexOf(C.capsules.summitAbove) - order.indexOf(cap.startTier)));
      expect(o.reveal.strikeClimbs.filter(Boolean)).toHaveLength(main);
      const firstClimb = o.reveal.strikeClimbs.indexOf(true);
      if (firstClimb >= 0) expect(o.reveal.strikeClimbs.slice(firstClimb).every(Boolean)).toBe(true);
      if (cap.kind === 'daily') expect(cap.startTier).toBe('bronze');
      else expect(cap.startTier).toBe('clay');
      s = o.save;
    }
    const road = M.grantCapsule(s, 'road', C, clock(), { tier: 'jade' });
    expect(lastPending(road)).toMatchObject({ tier: 'jade', startTier: 'jade' });
  });

  it('pity before and after are the counters around this opening (A6.5)', () => {
    let s = scripted(12, 7);
    s = { ...s, pity: { ...s.pity, sinceEpic: 3, sinceLegendary: 7, opened: 20 } };
    const g = M.grantCapsule(s, 'win', C, clock(), { tier: 'silver' });
    const o = M.openCapsule(g, lastPending(g).id);
    expect(o.reveal.pityBefore).toEqual(s.pity);
    expect(o.reveal.pityAfter.opened).toBe(21);
    expect(o.reveal.pityAfter.sinceEpic).toBe(0);
    const hasLeg = o.reveal.capsule.contents.stacks.some((x) => x.rarity === 'legendary');
    expect(o.reveal.pityAfter.sinceLegendary).toBe(hasLeg ? 0 : 8);
    expect(o.save.pity).toEqual(o.reveal.pityAfter);
  });

  it('the first Supply Capsule arrives right after capsule 2 is opened (A6.3, A15.4)', () => {
    let s = fresh();
    for (let i = 0; i < 2; i += 1) {
      expect(s.capsules.dailyBank).toBe(0);
      const g = M.grantCapsule(s, 'win', C, clock());
      s = M.openCapsule(g, lastPending(g).id).save;
    }
    expect(s.capsules.pending.filter((p) => p.kind === 'daily')).toHaveLength(1);
    expect(s.capsules.dailyBank).toBe(0);
    expect(s.capsules.dailyNextAt).toBeNull();
    // Retired 2026-09-30 (A15.4): no allowance timer starts and none accrues.
    const ticked = M.tickTimers(s, { now: () => clock().now() + 3 * 86_400_000 });
    expect(ticked.capsules.dailyNextAt).toBeNull();
    expect(ticked.capsules.dailyBank).toBe(0);
  });

  it('an unknown id is a programming error', () => {
    expect(() => M.openCapsule(fresh(), 'nope')).toThrow();
  });
});

describe('openWardrobe (A6.4, A6.5, A10.1)', () => {
  it('reveals the pre-rolled skin with no reel (A15.3): reelTiles is empty and a reload shows the same reveal', () => {
    let s = fresh(21);
    for (let i = 0; i < 20; i += 1) {
      s = M.grantWardrobe(s, 'codex', C, clock());
      const crate = s.capsules.wardrobe[0]!;
      const o = M.openWardrobe(s, crate.id);
      const r = o.reveal;
      expect(r.reelTiles).toEqual([]);
      expect(r.crate.skin).toBe(crate.skin);
      expect(r.crate.rarity).toBe(crate.rarity);
      expect(M.openWardrobe(s, crate.id).reveal).toEqual(r);
      expect(o.save.capsules.wardrobe.some((c) => c.id === crate.id)).toBe(false);
      s = o.save;
    }
  });

  it('crate odds 78/18/4, no duplicate until a rarity is complete, wardrobe pity 5 and 25', () => {
    let s = ownsAll(fresh(22));
    const counts = { rare: 0, epic: 0, legendary: 0 };
    let sinceEpic = 0;
    let sinceLeg = 0;
    let maxEpic = 0;
    let maxLeg = 0;
    const n = 6000;
    for (let i = 0; i < n; i += 1) {
      const before = new Set(s.skins.owned);
      s = M.grantWardrobe(s, 'codex', C, clock());
      const crate = s.capsules.wardrobe[0]!;
      const pool = Object.values(C.skins).filter((d) => d.inCratePool && d.rarity === crate.rarity).map((d) => d.id);
      if (pool.some((id) => !before.has(id))) expect(before.has(crate.skin)).toBe(false);
      const o = M.openWardrobe(s, crate.id);
      expect(o.reveal.crate.duplicateDust).toBe(before.has(crate.skin) ? C.rarities.skins[crate.rarity].duplicateDust : 0);
      s = o.save;
      counts[crate.rarity] += 1;
      sinceEpic = crate.rarity === 'rare' ? sinceEpic + 1 : 0;
      sinceLeg = crate.rarity === 'legendary' ? 0 : sinceLeg + 1;
      maxEpic = Math.max(maxEpic, sinceEpic);
      maxLeg = Math.max(maxLeg, sinceLeg);
    }
    expect(maxEpic).toBeLessThanOrEqual(4);
    expect(maxLeg).toBeLessThanOrEqual(24);
    // Pity lifts Epic and Legendary above the base odds (a Rare-only run ends at 5 crates).
    expect(counts.epic + counts.legendary).toBeGreaterThan(n * 0.22);
    expect(s.skins.owned.filter((id) => C.skins[id]?.inCratePool).length).toBe(11);
    expect(s.skins.owned).not.toContain('crystal_spire');
  });

  it('the base crate odds are exactly the published 78/18/4 (chi-square)', () => {
    const rng = seedSfc32(99);
    const counts = [0, 0, 0];
    for (let i = 0; i < 50000; i += 1) counts[['rare', 'epic', 'legendary'].indexOf(rollSkinRarity(C, rng, null))]! += 1;
    expect(passesChi2(counts, [7800, 1800, 400])).toBe(true);
  });
});
