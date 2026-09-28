/**
 * The cosmetic collections (DESIGN A18.9.4): owning, equipping, drops with their disclosed odds,
 * state-earned items, crafting, completion counts and looks.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { grantCapsuleAt, grantCrateAt, openCapsuleWith, openCrate } from '../capsules';
import {
  botLook,
  collectionProgress,
  cosmeticKey,
  cosmeticOdds,
  craftCosmetic,
  equipCosmetic,
  ownsCosmetic,
  poolItems,
  sideLook,
  syncEarnedCosmetics,
} from '../cosmetics';
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
    const after = ok(craftCosmetic(s, C, 'nationalFlag.dk'));
    expect(after.cosmetics.owned).toContain('nationalFlag.dk');
    expect(after.currencies.dust).toBe(1000 - col.drops.craftDust.common);
    expect(craftCosmetic(after, C, 'nationalFlag.dk')).toEqual({ ok: false, reason: 'owned' });
    expect(craftCosmetic(s, C, 'decoration.star_trophy')).toEqual({ ok: false, reason: 'notCraftable' });
    expect(craftCosmetic({ ...s, currencies: { amber: 0, dust: 0 } }, C, 'nationalFlag.se')).toEqual({ ok: false, reason: 'notEnoughDust' });
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
