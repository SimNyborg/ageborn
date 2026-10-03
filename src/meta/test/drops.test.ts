/**
 * Capsule statistics (DESIGN B13 meta, C4 #5 "published odds pass the chi-square test at p > 0.01";
 * C2/WP7 DoD: the 10^5 variant of `tools/drops.ts`'s 10^6 run). 100,000 openings through the `Meta`
 * contract in the last arena (full pool, random Legendaries), every 5th a Daily Capsule.
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleTier, Foil, Rarity, SaveDoc } from '@/contracts';
import { isReleased } from '@/content';
import { C, M, clock, lastPending, passesChi2, scripted } from './helpers';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const FOILS: Foil[] = ['holo', 'silver', 'bronze', 'none'];
const TIERS: readonly CapsuleTier[] = C.capsules.tierOrder;
const BAG_SIZE = TIERS.reduce((n, t) => n + C.capsules.bag[t], 0);
const SKIN_RARITIES = ['rare', 'epic', 'legendary'] as const;
const OPENINGS = 100_000;
const STREAMS = 10;

interface Tally {
  bagGroups: number;
  badBagGroups: number;
  daily: number[];
  foils: number[];
  rolled: number[];
  /** Per tier with 0 < skinChanceBp < 100%: capsules and skins. */
  skinTier: Map<CapsuleTier, [number, number]>;
  /** Sure-skin tiers without a skin, or with one below `skinMinRarity`. */
  skinMisses: number;
  /** Fewer Legendary stacks than guaranteed, a repeated card, or wrong extra-stack copies. */
  legendaryMisses: number;
  maxNoEpic: number;
  maxNoLegendary: number;
  maxNoNew: number;
  guaranteeMisses: number;
  stackCountMisses: number;
}

function run(): Tally {
  const tally: Tally = {
    bagGroups: 0,
    badBagGroups: 0,
    daily: TIERS.map(() => 0),
    foils: [0, 0, 0, 0],
    rolled: [0, 0, 0, 0],
    skinTier: new Map(),
    skinMisses: 0,
    legendaryMisses: 0,
    maxNoEpic: 0,
    maxNoLegendary: 0,
    maxNoNew: 0,
    guaranteeMisses: 0,
    stackCountMisses: 0,
  };
  const pool = [...C.order.units, ...C.order.turrets];
  const clk = clock();
  for (let stream = 0; stream < STREAMS; stream += 1) {
    let s: SaveDoc = scripted(100 + stream, C.arenas.list.length - 1);
    let group: CapsuleTier[] = [];
    let noEpic = 0;
    let noLegendary = 0;
    let noNew = 0;
    for (let i = 0; i < OPENINGS / STREAMS; i += 1) {
      const kind = (i + 1) % 5 === 0 ? 'daily' : 'win';
      const unownedBefore = pool.some((id) => !s.collection[id]);
      const g = M.grantCapsule(s, kind, C, clk);
      const o = M.openCapsule(g, lastPending(g).id);
      s = o.save;
      const cap = o.reveal.capsule;
      const def = C.capsules.tiers[cap.tier];
      const rs = cap.contents.stacks.map((x) => x.rarity);
      for (const st of cap.contents.stacks) tally.foils[FOILS.indexOf(st.foil)]! += 1;
      if (kind === 'daily') tally.daily[TIERS.indexOf(cap.tier)]! += 1;
      if (def.skinChanceBp > 0 && def.skinChanceBp < 10000) {
        const acc = tally.skinTier.get(cap.tier) ?? [0, 0];
        acc[0] += 1;
        if (cap.contents.skin) acc[1] += 1;
        tally.skinTier.set(cap.tier, acc);
      }
      if (def.skinChanceBp >= 10000) {
        const skin = cap.contents.skin ? C.skins[cap.contents.skin] : undefined;
        if (!skin || SKIN_RARITIES.indexOf(skin.rarity) < SKIN_RARITIES.indexOf(def.skinMinRarity)) tally.skinMisses += 1;
      }
      const wantLegendaries = def.guaranteed.filter((r) => r === 'legendary').length;
      const legendaryStacks = cap.contents.stacks.filter((x) => x.rarity === 'legendary');
      if (legendaryStacks.length < wantLegendaries) tally.legendaryMisses += 1;
      if (new Set(cap.contents.stacks.map((x) => x.card)).size !== cap.contents.stacks.length) tally.legendaryMisses += 1;
      if (wantLegendaries >= 2 && !legendaryStacks.some((x) => x.copies === def.extraLegendaryCopies)) tally.legendaryMisses += 1;
      if (kind === 'win') {
        group.push(cap.tier);
        if (group.length === BAG_SIZE) {
          tally.bagGroups += 1;
          if (TIERS.some((t) => group.filter((x) => x === t).length !== C.capsules.bag[t])) tally.badBagGroups += 1;
          group = [];
        }
      }
      if (rs.length !== def.stacks) tally.stackCountMisses += 1;
      const left = [...rs];
      let ok = true;
      for (const r of def.guaranteed) {
        const k = left.indexOf(r);
        if (k < 0) ok = false;
        else left.splice(k, 1);
      }
      if (!ok) tally.guaranteeMisses += 1;
      // Stacks no pity rule could touch (A6.5 thresholds with a margin).
      const p = o.reveal.pityBefore;
      const pityFree = p.sinceEpic <= 7 && p.sinceLegendary <= 23 && (!unownedBefore || p.sinceNewCard <= 2);
      if (ok && pityFree) for (const r of left) tally.rolled[RARITIES.indexOf(r)]! += 1;
      noEpic = rs.includes('epic') ? 0 : noEpic + 1;
      noLegendary = rs.includes('legendary') ? 0 : noLegendary + 1;
      noNew = cap.contents.stacks.some((x) => x.isNew) || !unownedBefore ? 0 : noNew + 1;
      tally.maxNoEpic = Math.max(tally.maxNoEpic, noEpic);
      tally.maxNoLegendary = Math.max(tally.maxNoLegendary, noLegendary);
      tally.maxNoNew = Math.max(tally.maxNoNew, noNew);
    }
  }
  return tally;
}

describe(`${OPENINGS} capsule openings through Meta (A6.4, A6.5, C4 #5)`, () => {
  const t = run();

  it('every 200 Win Capsules hold exactly 60 Clay, 80 Bronze, 40 Silver, 13 Jade, 4 Gold, 2 Platinum and 1 Aeon', () => {
    expect(BAG_SIZE).toBe(200);
    expect(t.bagGroups).toBe(OPENINGS * 0.8 / BAG_SIZE);
    expect(t.badBagGroups).toBe(0);
  });

  it('stack counts and guarantees always hold', () => {
    expect(t.stackCountMisses).toBe(0);
    expect(t.guaranteeMisses).toBe(0);
  });

  it('Gold, Platinum and Aeon hold 1, 2 and 3 different Legendaries; sure skins are never missing or below their floor', () => {
    expect(t.legendaryMisses).toBe(0);
    expect(t.skinMisses).toBe(0);
  });

  it('pity boundaries: an Epic every 10, a Legendary by 40, a new card every 5 while any remain', () => {
    expect(t.maxNoEpic).toBeLessThanOrEqual(C.capsules.pity.epicEvery - 1);
    expect(t.maxNoLegendary).toBeLessThanOrEqual(C.capsules.pity.legendaryGuaranteeAt - 1);
    expect(t.maxNoNew).toBeLessThanOrEqual(C.capsules.pity.newCardEvery - 1);
  });

  it('published odds pass chi-square at p > 0.01: stack rarity, foils, Daily tiers, Aeon skin', () => {
    const roll = C.capsules.stackRollBp;
    expect(passesChi2(t.rolled, RARITIES.map((r) => roll[r]))).toBe(true);
    const f = C.rarities.foils;
    const none = 10000 - f.holo.rollBp - f.silver.rollBp - f.bronze.rollBp;
    expect(passesChi2(t.foils, [f.holo.rollBp, f.silver.rollBp, f.bronze.rollBp, none])).toBe(true);
    const supply = TIERS.filter((tier) => C.capsules.dailyOddsBp[tier] > 0);
    expect(passesChi2(supply.map((tier) => t.daily[TIERS.indexOf(tier)]!), supply.map((tier) => C.capsules.dailyOddsBp[tier]))).toBe(true);
    expect(t.skinTier.size).toBeGreaterThan(0);
    for (const [tier, [n, skins]] of t.skinTier) {
      const skin = C.capsules.tiers[tier].skinChanceBp;
      expect(passesChi2([skins, n - skins], [skin, 10000 - skin]), tier).toBe(true);
    }
  });
});

describe('drop pools by arena (A17.13)', () => {
  it('Arena 1 drops the Short War ages, Arena 2 the Standard War ages, Arena 3 and up all 8', async () => {
    const { poolOf } = await import('../tables');
    // The 88 original cards: 11 per age (7 units, 4 turrets) wherever their age drops.
    const original = (i: number) => poolOf(C, C.arenas.list[i]!.dropAges, i).cards.filter((id) => !(id in C.cardArena)).length;
    expect([original(0), original(1), original(2), original(7)]).toEqual([44, 66, 88, 88]);
    // X0: content-wave cards join from the arena their rarity unlocks (Commons 2, Rares 3, Epics 4, Legendaries 5).
    const wave = (i: number) => poolOf(C, C.arenas.list[i]!.dropAges, i).cards.filter((id) => id in C.cardArena);
    expect(wave(0)).toEqual([]);
    for (let i = 1; i < C.arenas.list.length; i += 1) {
      for (const id of wave(i)) expect(C.cardArena[id]! <= i + 1, `${id} in arena ${i + 1}`).toBe(true);
      // The release gate: a wave card whose art has not shipped drops nowhere (x0.test.ts runs the wave with the gate open).
      const want = Object.entries(C.cardArena).filter(([id, a]) => a <= i + 1 && isReleased(C, id) && C.arenas.list[i]!.dropAges.includes((C.units[id] ?? C.turrets[id])!.age)).length;
      expect(wave(i)).toHaveLength(want);
    }
    const ages = new Set(poolOf(C, C.arenas.list[0]!.dropAges).cards.map((id) => (C.units[id] ?? C.turrets[id])!.age));
    expect([...ages].sort()).toEqual(['bronze', 'gunpowder', 'medieval', 'stone']);
  });
});
