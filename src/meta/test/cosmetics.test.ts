/**
 * The cosmetic collections (DESIGN A18.9.4): owning, equipping, drops with their disclosed odds,
 * state-earned items, crafting, completion counts and looks; from save v14 the scenes per age, one base
 * skin per age across both skin systems, national flags bought with Dust and the release gate (PLAN 2b,
 * 2c, 2d, 2e). Owned by Track C (the Flag Atlas's own rules: `flagAtlas.test.ts`, Track D).
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import type { Content, CosmeticItemDef } from '@/content';
import { grantCapsuleAt, grantCrateAt, openCapsuleWith, openCrate } from '../capsules';
import {
  botLook,
  collectionItems,
  collectionProgress,
  cosmeticCraftPrice,
  cosmeticItem,
  cosmeticKey,
  cosmeticOdds,
  craftCosmetic,
  equipCosmetic,
  nationalFlagPrice,
  ownsCosmetic,
  poolItems,
  rollCapsuleCosmetic,
  sideLook,
  syncEarnedCosmetics,
} from '../cosmetics';
import { equipSkin } from '../warplan';
import { C, clock, fresh, M, scripted, T0 } from './helpers';

const col = C.cosmetics.collections;
const withOwned = (s: SaveDoc, ...keys: string[]): SaveDoc => ({ ...s, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, ...keys] } });
const ok = <T,>(r: { ok: true; value: T } | { ok: false; reason: string }): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
};

describe('a new save (A18.9.4)', () => {
  it('equips the starters and no national flag', () => {
    const s = fresh();
    expect(s.cosmetics.equipped).toEqual({ ...col.defaults, baseSkins: {} });
    expect(s.cosmetics.equipped.nationalFlag).toBeNull();
    expect(s.rng.cosmetic).toHaveLength(4);
  });

  it('owns the starters and the six starter emotes, nothing else', () => {
    const s = fresh();
    for (const x of col.items) expect(ownsCosmetic(s, C, cosmeticKey(x)), cosmeticKey(x)).toBe(x.source.kind === 'start');
    for (const e of ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg']) expect(ownsCosmetic(s, C, e)).toBe(true);
  });
});

describe('equipping', () => {
  it('equips owned items and refuses the rest', () => {
    const s = withOwned(fresh(), 'nationalFlag.dk', 'baseSkin.frost_cave', 'decoration.lion_statue', 'emote.clap', 'quote.charge');
    expect(equipCosmetic(s, C, { slot: 'nationalFlag', key: 'nationalFlag.se' })).toEqual({ ok: false, reason: 'notOwned' });
    expect(equipCosmetic(s, C, { slot: 'nationalFlag', key: 'baseFlag.ember' })).toEqual({ ok: false, reason: 'wrongCollection' });
    const a = ok(equipCosmetic(s, C, { slot: 'nationalFlag', key: 'nationalFlag.dk' }));
    expect(a.cosmetics.equipped.nationalFlag).toBe('nationalFlag.dk');
    const b = ok(equipCosmetic(a, C, { slot: 'nationalFlag', key: null }));
    expect(b.cosmetics.equipped.nationalFlag).toBeNull();
  });

  it('puts a base skin only on its own age', () => {
    const s = withOwned(fresh(), 'baseSkin.frost_cave');
    expect(equipCosmetic(s, C, { slot: 'baseSkin', age: 'medieval', key: 'baseSkin.frost_cave' })).toEqual({ ok: false, reason: 'wrongAge' });
    const a = ok(equipCosmetic(s, C, { slot: 'baseSkin', age: 'stone', key: 'baseSkin.frost_cave' }));
    expect(a.cosmetics.equipped.baseSkins).toEqual({ stone: 'baseSkin.frost_cave' });
    expect(ok(equipCosmetic(a, C, { slot: 'baseSkin', age: 'stone', key: null })).cosmetics.equipped.baseSkins).toEqual({});
  });

  it('moves a decoration between anchors instead of showing it twice', () => {
    const s = withOwned(fresh(), 'decoration.lion_statue');
    const a = ok(equipCosmetic(s, C, { slot: 'decoration', anchor: 1, key: 'decoration.lion_statue' }));
    const b = ok(equipCosmetic(a, C, { slot: 'decoration', anchor: 2, key: 'decoration.lion_statue' }));
    expect(b.cosmetics.equipped.decorations).toEqual(['decoration.fire_bowl', null, 'decoration.lion_statue']);
    expect(equipCosmetic(s, C, { slot: 'decoration', anchor: 3, key: null })).toEqual({ ok: false, reason: 'badAnchor' });
  });

  it('fills the wheels with owned emotes and quotes only, within their size', () => {
    const s = withOwned(fresh(), 'emote.clap', 'quote.charge');
    expect(ok(equipCosmetic(s, C, { slot: 'emotes', keys: ['gg', 'emote.clap'] })).cosmetics.equipped.emotes).toEqual(['gg', 'emote.clap']);
    expect(equipCosmetic(s, C, { slot: 'emotes', keys: ['emote.party'] })).toEqual({ ok: false, reason: 'notOwned' });
    expect(equipCosmetic(s, C, { slot: 'emotes', keys: ['gg', 'gg'] })).toEqual({ ok: false, reason: 'duplicate' });
    const nine = ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg', 'emote.clap', 'emote.heart', 'emote.wow'];
    expect(equipCosmetic(s, C, { slot: 'emotes', keys: nine })).toEqual({ ok: false, reason: 'wheelFull' });
    expect(ok(equipCosmetic(s, C, { slot: 'quotes', keys: ['quote.charge'] })).cosmetics.equipped.quotes).toEqual(['quote.charge']);
    expect(equipCosmetic(s, C, { slot: 'quotes', keys: ['emote.clap'] })).toEqual({ ok: false, reason: 'wrongCollection' });
  });

  it('shows only owned items in a match look', () => {
    const s = fresh();
    const tampered: SaveDoc = { ...s, cosmetics: { ...s.cosmetics, equipped: { ...s.cosmetics.equipped, nationalFlag: 'nationalFlag.us' } } };
    expect(sideLook(tampered, C).nationalFlag).toBeNull();
    expect(sideLook(s, C)).toMatchObject({ baseFlag: 'baseFlag.ember', decorations: ['decoration.fire_bowl', null, 'decoration.fern'] });
  });
});

describe('drops (disclosed odds)', () => {
  it('Time Capsules hold a capsule-pool item at about the disclosed chance', () => {
    let s = scripted(7, 2);
    let hits = 0;
    const n = 400;
    for (let i = 0; i < n; i += 1) {
      const g = grantCapsuleAt(s, 'win', C, T0, { tier: 'silver' });
      const key = g.capsule.contents.cosmetic;
      if (key) {
        hits += 1;
        expect(poolItems(C, 'capsule').map(cosmeticKey)).toContain(key);
      }
      s = { ...g.save, capsules: { ...g.save.capsules, pending: [] } };
    }
    const p = col.drops.capsuleChanceBp.silver / 10000;
    const sd = Math.sqrt(n * p * (1 - p));
    expect(Math.abs(hits - n * p)).toBeLessThan(4 * sd);
  });

  it('never changes the cards: the same capsule stream rolls the same stacks with any cosmetic stream', () => {
    const s = scripted(3, 2);
    const a = grantCapsuleAt({ ...s, rng: { ...s.rng, cosmetic: [1, 2, 3, 4] } }, 'win', C, T0, { tier: 'jade' });
    const b = grantCapsuleAt({ ...s, rng: { ...s.rng, cosmetic: [9, 8, 7, 6] } }, 'win', C, T0, { tier: 'jade' });
    expect(a.capsule.contents.stacks).toEqual(b.capsule.contents.stacks);
    expect(a.save.rng.capsule).toEqual(b.save.rng.capsule);
  });

  it('script and Age Unlock capsules hold no item', () => {
    const s = fresh();
    for (let i = 0; i < 3; i += 1) expect(grantCapsuleAt(s, 'win', C, T0).capsule.contents.cosmetic ?? null).toBeNull();
    expect(grantCapsuleAt(scripted(1, 2), 'ageUnlock', C, T0, { age: 'medieval' }).capsule.contents.cosmetic ?? null).toBeNull();
  });

  it('every Wardrobe Crate holds a crate-pool item; no duplicate until the pool rarity is owned', () => {
    let s = scripted(5, 1);
    const seen = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      const g = grantCrateAt(s, 'weekly', C, T0);
      const key = g.crate.cosmetic;
      expect(key).toBeTruthy();
      expect(poolItems(C, 'crate').map(cosmeticKey)).toContain(key);
      if (seen.has(key!)) {
        // a duplicate only once every crate item of its rarity has been handed out
        const rarity = col.items.find((x) => cosmeticKey(x) === key)!.rarity;
        for (const x of poolItems(C, 'crate', rarity)) expect(seen.has(cosmeticKey(x))).toBe(true);
      }
      seen.add(key!);
      s = g.save;
    }
  });

  it('opening grants the item; a duplicate pays its Dust instead', () => {
    const s0 = scripted(5, 1);
    const g = grantCrateAt(s0, 'weekly', C, T0);
    const key = g.crate.cosmetic!;
    const opened = openCrate(g.save, g.crate.id, C).save;
    expect(opened.cosmetics.owned).toContain(key);
    // the same item again (e.g. crafted meanwhile): Dust
    const again = grantCrateAt(opened, 'weekly', C, T0);
    const dup = { ...again.save, capsules: { ...again.save.capsules, wardrobe: [{ ...again.crate, cosmetic: key }] } };
    const x = C.cosmetics.collections.items.find((i) => cosmeticKey(i) === key)!;
    const before = dup.currencies.dust + (dup.skins.owned.includes(again.crate.skin) ? C.rarities.skins[again.crate.rarity].duplicateDust : 0);
    expect(openCrate(dup, again.crate.id, C).save.currencies.dust).toBe(before + col.drops.duplicateDust[x.rarity]);
  });

  it('opening a capsule grants its item', () => {
    const s = scripted(11, 2);
    const g = grantCapsuleAt(s, 'win', C, T0, { tier: 'aeon' });
    const withItem = { ...g.save, capsules: { ...g.save.capsules, pending: [{ ...g.capsule, contents: { ...g.capsule.contents, cosmetic: 'nationalFlag.dk' } }] } };
    expect(openCapsuleWith(withItem, g.capsule.id, C).save.cosmetics.owned).toContain('nationalFlag.dk');
  });

  it('discloses the odds of both pools', () => {
    const o = cosmeticOdds(fresh(), C);
    expect(o.capsule.rarities.reduce((n, r) => n + r.bp, 0)).toBe(10000);
    expect(o.crate.rarities.reduce((n, r) => n + r.bp, 0)).toBe(10000);
    for (const r of [...o.capsule.rarities, ...o.crate.rarities]) if (r.bp > 0) expect(r.items).toBeGreaterThan(0);
    expect(o.capsuleChanceBp).toEqual(col.drops.capsuleChanceBp);
  });
});

describe('earned items, crafting and completion', () => {
  it('grants road items when their node is claimed and feat items when the feat is found', () => {
    const s = fresh();
    const road = col.items.find((x) => x.source.kind === 'road')!;
    const feat = col.items.find((x) => x.source.kind === 'feat')!;
    const trophies = road.source.kind === 'road' ? road.source.trophies : 0;
    const featId = feat.source.kind === 'feat' ? feat.source.feat : '';
    const earned = syncEarnedCosmetics({ ...s, trophies: { ...s.trophies, roadClaimed: [trophies] }, flags: { ...s.flags, [`feat.${featId}`]: true } }, C);
    expect(earned.granted).toContain(cosmeticKey(road));
    expect(earned.granted).toContain(cosmeticKey(feat));
    expect(syncEarnedCosmetics(earned.save, C).granted).toEqual([]);
  });

  it('claiming a road node through the meta rules grants its item', () => {
    const road = col.items.find((x) => x.source.kind === 'road' && x.source.trophies === 250)!;
    const s = fresh();
    const r = M.claimRoadNode({ ...s, trophies: { current: 300, best: 300, roadClaimed: [50, 100, 150, 200] } }, 250, C, clock());
    expect(r.ok && r.value.cosmetics.owned).toContain(cosmeticKey(road));
  });

  it('crafts pool items with Dust, and only those', () => {
    const s = { ...fresh(), currencies: { amber: 0, dust: 1000 } };
    const after = ok(craftCosmetic(s, C, 'emote.heart'));
    expect(after.cosmetics.owned).toContain('emote.heart');
    expect(after.currencies.dust).toBe(1000 - col.drops.craftDust.common);
    expect(craftCosmetic(after, C, 'emote.heart')).toEqual({ ok: false, reason: 'owned' });
    expect(craftCosmetic(s, C, 'decoration.star_trophy')).toEqual({ ok: false, reason: 'notCraftable' });
    expect(craftCosmetic({ ...s, currencies: { amber: 0, dust: 0 } }, C, 'emote.wow')).toEqual({ ok: false, reason: 'notEnoughDust' });
  });

  it('counts completion per collection', () => {
    const p = collectionProgress(withOwned(fresh(), 'nationalFlag.dk', 'nationalFlag.se'), C);
    expect(p.nationalFlag).toEqual({ owned: 2, total: col.items.filter((x) => x.collection === 'nationalFlag').length });
    expect(p.quote.owned).toBe(4);
    expect(p.baseFlag.owned).toBe(2);
  });

  it('gives AI opponents a seeded look without a national flag', () => {
    const a = botLook(C, 'Old Grogg');
    expect(botLook(C, 'Old Grogg')).toEqual(a);
    expect(a.nationalFlag).toBeNull();
    expect(a.baseFlag).toMatch(/^baseFlag\./);
  });
});

describe('battle backdrops (A18.9.4 "Backdrops", owner request 2026-09-30)', () => {
  it('starts on the classic skies and equips only an owned backdrop', () => {
    const s = fresh();
    expect(s.cosmetics.equipped.backdrop).toBeNull();
    expect(equipCosmetic(s, C, { slot: 'backdrop', key: 'backdrop.winterfall' })).toEqual({ ok: false, reason: 'notOwned' });
    expect(equipCosmetic(withOwned(s, 'baseFlag.oak'), C, { slot: 'backdrop', key: 'baseFlag.oak' })).toEqual({ ok: false, reason: 'wrongCollection' });
    const a = ok(equipCosmetic(withOwned(s, 'backdrop.winterfall'), C, { slot: 'backdrop', key: 'backdrop.winterfall' }));
    expect(a.cosmetics.equipped.backdrop).toBe('backdrop.winterfall');
    expect(ok(equipCosmetic(a, C, { slot: 'backdrop', key: null })).cosmetics.equipped.backdrop).toBeNull();
  });

  it('shows the player\'s backdrop in the match look; AI bots keep the classic sky', () => {
    const s = ok(equipCosmetic(withOwned(fresh(), 'backdrop.thunderstorm'), C, { slot: 'backdrop', key: 'backdrop.thunderstorm' }));
    expect(sideLook(s, C).backdrop).toBe('backdrop.thunderstorm');
    // an item no longer owned (a save edited by hand) is never shown
    const lost = { ...s, cosmetics: { ...s.cosmetics, owned: s.cosmetics.owned.filter((k) => k !== 'backdrop.thunderstorm') } };
    expect(sideLook(lost, C).backdrop).toBeNull();
    for (const seed of ['Pip', 'The Warden', 'AI Commander 7']) expect(botLook(C, seed).backdrop).toBeNull();
  });

  it('are earned like the other collections: capsule and crate pools (craftable), the Trophy Road', () => {
    const items = col.items.filter((x) => x.collection === 'backdrop');
    expect(items.length).toBeGreaterThanOrEqual(8);
    const kinds = new Set(items.map((x) => x.source.kind));
    for (const k of ['capsule', 'crate', 'road']) expect(kinds.has(k as never), k).toBe(true);
    expect(items.some((x) => x.source.kind === 'start')).toBe(false);
    expect(poolItems(C, 'capsule').some((x) => x.collection === 'backdrop')).toBe(true);
    expect(poolItems(C, 'crate').some((x) => x.collection === 'backdrop')).toBe(true);
    // Legendary backdrops never sit in the capsule pool (its Legendary odds are 0)
    for (const x of items) if (x.rarity === 'legendary') expect(x.source.kind).not.toBe('capsule');
    const craft = ok(craftCosmetic({ ...withOwned(fresh()), currencies: { ...fresh().currencies, dust: 5000 } }, C, 'backdrop.golden_dusk'));
    expect(craft.cosmetics.owned).toContain('backdrop.golden_dusk');
    expect(collectionProgress(fresh(), C).backdrop).toEqual({ owned: 0, total: items.length });
  });

  it('grants a road backdrop with its claimed Trophy Road node', () => {
    const s = fresh();
    const road = col.items.find((x) => x.collection === 'backdrop' && x.source.kind === 'road')!;
    const trophies = road.source.kind === 'road' ? road.source.trophies : 0;
    const claimed = { ...s, trophies: { ...s.trophies, roadClaimed: [...s.trophies.roadClaimed, trophies] } };
    expect(syncEarnedCosmetics(claimed, C).granted).toContain(cosmeticKey(road));
  });
});

/** The content with extra items (unreleased ones, scenes) appended; `cosmeticItem` indexes it afresh. */
function withItems(...extra: CosmeticItemDef[]): Content {
  return { ...C, cosmetics: { ...C.cosmetics, collections: { ...col, items: [...col.items, ...extra] } } };
}
const scene = (id: string, age: CosmeticItemDef['age'], o: Partial<CosmeticItemDef> = {}): CosmeticItemDef => ({
  id,
  collection: 'scene',
  rarity: 'rare',
  source: { kind: 'capsule' },
  art: `cosmetic.scene.${id}`,
  nameKey: `cosmetic.scene.${id}.name`,
  age,
  ...o,
});

describe('scenes per age (save v14, PLAN 2b)', () => {
  const T = withItems(scene('glacier_valley', 'stone'), scene('sabre_savanna', 'stone', { rarity: 'epic', source: { kind: 'crate' } }), scene('misty_moor', 'medieval'));

  it('a new save shows every classic scene', () => {
    expect(fresh().cosmetics.equipped.scenes).toEqual({});
    expect(sideLook(fresh(), C).scenes).toEqual({});
  });

  it('equips an owned scene on its own age only, and clears it back to the classic', () => {
    const s = withOwned(fresh(), 'scene.glacier_valley', 'scene.misty_moor');
    const a = ok(equipCosmetic(s, T, { slot: 'scene', age: 'stone', key: 'scene.glacier_valley' }));
    expect(a.cosmetics.equipped.scenes).toEqual({ stone: 'scene.glacier_valley' });
    const b = ok(equipCosmetic(a, T, { slot: 'scene', age: 'medieval', key: 'scene.misty_moor' }));
    expect(b.cosmetics.equipped.scenes).toEqual({ stone: 'scene.glacier_valley', medieval: 'scene.misty_moor' });
    expect(ok(equipCosmetic(b, T, { slot: 'scene', age: 'stone', key: null })).cosmetics.equipped.scenes).toEqual({ medieval: 'scene.misty_moor' });
    expect(equipCosmetic(s, T, { slot: 'scene', age: 'bronze', key: 'scene.glacier_valley' })).toEqual({ ok: false, reason: 'wrongAge' });
    expect(equipCosmetic(s, T, { slot: 'scene', age: 'stone', key: 'scene.sabre_savanna' })).toEqual({ ok: false, reason: 'notOwned' });
  });

  it('rejects unknown keys and other collections', () => {
    const s = withOwned(fresh(), 'scene.glacier_valley', 'backdrop.winterfall');
    expect(equipCosmetic(s, T, { slot: 'scene', age: 'stone', key: 'scene.atlantis' })).toEqual({ ok: false, reason: 'wrongCollection' });
    expect(equipCosmetic(s, T, { slot: 'scene', age: 'stone', key: 'backdrop.winterfall' })).toEqual({ ok: false, reason: 'wrongCollection' });
    expect(equipCosmetic(s, C, { slot: 'scene', age: 'stone', key: 'scene.glacier_valley' })).toEqual({ ok: false, reason: 'wrongCollection' });
  });

  it('shows owned scenes in the match look; the sky stays one for every age; AI bots keep the classics', () => {
    let s = withOwned(fresh(), 'scene.glacier_valley', 'backdrop.winterfall');
    s = ok(equipCosmetic(s, T, { slot: 'scene', age: 'stone', key: 'scene.glacier_valley' }));
    s = ok(equipCosmetic(s, T, { slot: 'backdrop', key: 'backdrop.winterfall' }));
    expect(sideLook(s, T)).toMatchObject({ scenes: { stone: 'scene.glacier_valley' }, backdrop: 'backdrop.winterfall' });
    // a scene no longer owned, or one on the wrong age (a save edited by hand), is never shown
    const lost = { ...s, cosmetics: { ...s.cosmetics, owned: s.cosmetics.owned.filter((k) => k !== 'scene.glacier_valley') } };
    expect(sideLook(lost, T).scenes).toEqual({});
    const moved = { ...s, cosmetics: { ...s.cosmetics, equipped: { ...s.cosmetics.equipped, scenes: { bronze: 'scene.glacier_valley' } } } };
    expect(sideLook(moved, T).scenes).toEqual({});
    for (const seed of ['Pip', 'The Warden', 'AI Commander 7']) expect(botLook(T, seed).scenes).toEqual({});
  });

  it('counts scenes in the collection progress, and rolls released scenes from the capsule pool', () => {
    expect(collectionProgress(withOwned(fresh(), 'scene.glacier_valley'), T).scene).toEqual({ owned: 1, total: 3 });
    expect(poolItems(T, 'capsule').map(cosmeticKey)).toEqual(expect.arrayContaining(['scene.glacier_valley', 'scene.misty_moor']));
    expect(poolItems(T, 'crate').map(cosmeticKey)).toContain('scene.sabre_savanna');
  });
});

describe('the release gate (PLAN 2e)', () => {
  const hidden = [
    scene('held_capsule', 'stone', { released: false }),
    scene('held_crate', 'bronze', { rarity: 'epic', source: { kind: 'crate' }, released: false }),
    scene('held_road', 'medieval', { rarity: 'epic', source: { kind: 'road', trophies: 250 }, released: false }),
  ];
  const T = withItems(...hidden);
  const keys = hidden.map(cosmeticKey);

  it('keeps unreleased items in the content but out of every pool and the odds', () => {
    for (const k of keys) expect(cosmeticItem(T, k), k).toBeDefined();
    const pooled = [...poolItems(T, 'capsule'), ...poolItems(T, 'crate')].map(cosmeticKey);
    for (const k of keys) expect(pooled).not.toContain(k);
    expect(cosmeticOdds(fresh(), T)).toEqual(cosmeticOdds(fresh(), C));
    // a capsule never rolls one, over many draws
    let s = scripted(9, 2);
    for (let i = 0; i < 200; i += 1) {
      const r = rollCapsuleCosmetic(s, T, 'aeon', 'win', false);
      expect(keys).not.toContain(r.key);
      s = { ...s, rng: { ...s.rng, cosmetic: r.rng } };
    }
  });

  it('never grants, crafts, equips, counts or shows one', () => {
    const claimed = { ...fresh(), trophies: { ...fresh().trophies, roadClaimed: [250] }, currencies: { amber: 0, dust: 9999 } };
    expect(syncEarnedCosmetics(claimed, T).granted).not.toContain('scene.held_road');
    expect(craftCosmetic(claimed, T, 'scene.held_capsule')).toEqual({ ok: false, reason: 'unreleased' });
    const owning = withOwned(fresh(), ...keys);
    expect(equipCosmetic(owning, T, { slot: 'scene', age: 'stone', key: 'scene.held_capsule' })).toEqual({ ok: false, reason: 'unreleased' });
    const forced = { ...owning, cosmetics: { ...owning.cosmetics, equipped: { ...owning.cosmetics.equipped, scenes: { stone: 'scene.held_capsule' } } } };
    expect(sideLook(forced, T).scenes).toEqual({});
    expect(collectionProgress(owning, T).scene).toEqual({ owned: 0, total: 0 });
    expect(collectionItems(T, 'scene')).toEqual([]);
  });
});

describe('national flags are bought with Dust (PLAN 2d, owner decisions 2026-10-08)', () => {
  it('are never in a drop pool; the pools hold the released capsule and crate items, and the odds count them', () => {
    for (const pool of ['capsule', 'crate'] as const) {
      expect(poolItems(C, pool).filter((x) => x.collection === 'nationalFlag')).toEqual([]);
      expect(poolItems(C, pool)).toEqual(col.items.filter((x) => x.source.kind === pool && x.released !== false));
    }
    const o = cosmeticOdds(fresh(), C);
    for (const r of o.capsule.rarities) expect(r.items, r.rarity).toBe(poolItems(C, 'capsule', r.rarity).length);
    for (const r of o.crate.rarities) expect(r.items, r.rarity).toBe(poolItems(C, 'crate', r.rarity).length);
  });

  it('cost 500 Dust each; a save with no national flag gets its first one for 0, once, any country', () => {
    const rich = { ...fresh(), currencies: { amber: 0, dust: 1200 } };
    const dk = cosmeticItem(C, 'nationalFlag.dk')!;
    expect(cosmeticCraftPrice(C, dk)).toBe(500);
    expect(nationalFlagPrice(rich, C)).toBe(0);
    expect(cosmeticCraftPrice(C, dk, rich)).toBe(0);
    const first = ok(craftCosmetic(rich, C, 'nationalFlag.dk'));
    expect(first.currencies.dust).toBe(1200);
    expect(first.cosmetics.owned).toContain('nationalFlag.dk');
    expect(nationalFlagPrice(first, C)).toBe(500);
    const second = ok(craftCosmetic(first, C, 'nationalFlag.br'));
    expect(second.currencies.dust).toBe(700);
    expect(craftCosmetic(second, C, 'nationalFlag.se').ok).toBe(true);
    expect(craftCosmetic({ ...second, currencies: { amber: 0, dust: 499 } }, C, 'nationalFlag.se')).toEqual({ ok: false, reason: 'notEnoughDust' });
    expect(craftCosmetic(second, C, 'nationalFlag.dk')).toEqual({ ok: false, reason: 'owned' });
    // the switch off: every flag at its price, the first too
    const off = { ...C, cosmetics: { ...C.cosmetics, collections: { ...col, drops: { ...col.drops, firstFlagFree: false } } } } as Content;
    expect(nationalFlagPrice(rich, off)).toBe(500);
  });

  it('a flag an unopened capsule already holds is opened, not bought (its promise stays true)', () => {
    const s = scripted(11, 2);
    const g = grantCapsuleAt(s, 'win', C, T0, { tier: 'gold' });
    const legacy = { ...g.save, currencies: { amber: 0, dust: 5000 }, capsules: { ...g.save.capsules, pending: [{ ...g.capsule, contents: { ...g.capsule.contents, cosmetic: 'nationalFlag.jp' } }] } };
    expect(craftCosmetic(legacy, C, 'nationalFlag.jp')).toEqual({ ok: false, reason: 'pending' });
    expect(openCapsuleWith(legacy, g.capsule.id, C).save.cosmetics.owned).toContain('nationalFlag.jp');
  });
});

describe('one base skin per age across both skin systems (save v14, PLAN 2c)', () => {
  const crystal = (s: SaveDoc): SaveDoc => ({ ...s, skins: { owned: [...s.skins.owned, 'crystal_spire'], equipped: { ...s.skins.equipped } } });

  it('a cosmetic base skin replaces the troop skin of that base, which stays owned', () => {
    let s = crystal(withOwned(fresh(), 'baseSkin.midnight_neon', 'baseSkin.frost_cave'));
    s = ok(equipSkin(s, 'base.future', 'crystal_spire', C));
    expect(s.skins.equipped['base.future']).toBe('crystal_spire');
    const a = ok(equipCosmetic(s, C, { slot: 'baseSkin', age: 'future', key: 'baseSkin.midnight_neon' }));
    expect(a.cosmetics.equipped.baseSkins).toEqual({ future: 'baseSkin.midnight_neon' });
    expect(a.skins.equipped['base.future']).toBeUndefined();
    expect(a.skins.owned).toContain('crystal_spire');
    // another age's skin leaves the Future troop skin alone
    const b = ok(equipCosmetic(s, C, { slot: 'baseSkin', age: 'stone', key: 'baseSkin.frost_cave' }));
    expect(b.skins.equipped['base.future']).toBe('crystal_spire');
  });

  it('the troop skin replaces the cosmetic skin of that age, which stays owned', () => {
    let s = crystal(withOwned(fresh(), 'baseSkin.midnight_neon', 'baseSkin.frost_cave'));
    s = ok(equipCosmetic(s, C, { slot: 'baseSkin', age: 'future', key: 'baseSkin.midnight_neon' }));
    s = ok(equipCosmetic(s, C, { slot: 'baseSkin', age: 'stone', key: 'baseSkin.frost_cave' }));
    const a = ok(equipSkin(s, 'base.future', 'crystal_spire', C));
    expect(a.skins.equipped['base.future']).toBe('crystal_spire');
    expect(a.cosmetics.equipped.baseSkins).toEqual({ stone: 'baseSkin.frost_cave' });
    expect(a.cosmetics.owned).toContain('baseSkin.midnight_neon');
    // clearing the troop skin changes nothing else
    expect(ok(equipSkin(a, 'base.future', null, C)).cosmetics.equipped.baseSkins).toEqual({ stone: 'baseSkin.frost_cave' });
  });
});

describe('the Flag Atlas rewards are earned (PLAN 2d)', () => {
  const pennant: CosmeticItemDef = { id: 'pennant_oceania', collection: 'baseFlag', rarity: 'epic', source: { kind: 'flagRegion', region: 'oceania' }, art: 'cosmetic.baseFlag.pennant_oceania', nameKey: 'cosmetic.baseFlag.pennant_oceania.name' };
  const compass: CosmeticItemDef = { id: 'world_compass', collection: 'baseFlag', rarity: 'legendary', source: { kind: 'flagsOwned', count: 3 }, art: 'cosmetic.baseFlag.world_compass', nameKey: 'cosmetic.baseFlag.world_compass.name' };
  const T = withItems(pennant, compass);

  it('a region reward with every flag of its region, the total reward with the count (the Other flags do not count)', () => {
    const oceania = col.items.filter((x) => x.collection === 'nationalFlag' && x.region === 'oceania').map(cosmeticKey);
    expect(oceania.length).toBeGreaterThan(0);
    const partial = withOwned(fresh(), ...oceania.slice(1), 'nationalFlag.fo', 'nationalFlag.gl', 'nationalFlag.gb_eng');
    expect(syncEarnedCosmetics(partial, T).granted).not.toContain('baseFlag.pennant_oceania');
    expect(syncEarnedCosmetics(partial, T).granted).not.toContain('baseFlag.world_compass');
    const full = withOwned(partial, oceania[0]!, 'nationalFlag.dk');
    const g = syncEarnedCosmetics(full, T).granted;
    expect(g).toContain('baseFlag.pennant_oceania');
    expect(g).toContain('baseFlag.world_compass');
    expect(syncEarnedCosmetics(syncEarnedCosmetics(full, T).save, T).granted).toEqual([]);
  });

  it('AI bots never fly them (they never collect flags)', () => {
    for (let i = 0; i < 200; i += 1) expect(['baseFlag.pennant_oceania', 'baseFlag.world_compass']).not.toContain(botLook(T, `General ${i}`).baseFlag);
  });
});
