/**
 * Capsule statistics (DESIGN B13 meta, C4 #5 "published odds pass the chi-square test at p > 0.01";
 * C2/WP7 DoD: the 10^5 variant of `tools/drops.ts`'s 10^6 run). 100,000 openings through the `Meta`
 * contract in the last arena (full pool, random Legendaries), every 5th a Daily Capsule.
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleTier, Foil, Rarity, SaveDoc } from '@/contracts';
import { C, M, clock, lastPending, passesChi2, scripted } from './helpers';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const FOILS: Foil[] = ['holo', 'silver', 'bronze', 'none'];
const TIERS: CapsuleTier[] = ['clay', 'bronze', 'silver', 'jade', 'aeon'];
const OPENINGS = 100_000;
const STREAMS = 10;

interface Tally {
  bagGroups: number;
  badBagGroups: number;
  daily: number[];
  foils: number[];
  rolled: number[];
  aeon: number;
  aeonSkins: number;
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
    daily: [0, 0, 0, 0, 0],
    foils: [0, 0, 0, 0],
    rolled: [0, 0, 0, 0],
    aeon: 0,
    aeonSkins: 0,
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
      if (cap.tier === 'aeon') {
        tally.aeon += 1;
        if (cap.contents.skin) tally.aeonSkins += 1;
      }
      if (kind === 'win') {
        group.push(cap.tier);
        if (group.length === 100) {
          tally.bagGroups += 1;
          if (TIERS.some((t) => group.filter((x) => x === t).length !== C.capsules.bag[t])) tally.badBagGroups += 1;
          group = [];
        }
      }
      if (rs.length !== def.stacks) tally.stackCountMisses += 1;
      const left = [...rs];
      let ok = true;
      for (const r of def.guaranteed) {
        let k = left.indexOf(r);
        if (k < 0 && r === 'rare' && def.rareToLegendaryBp > 0) k = left.indexOf('legendary');
        if (k < 0) ok = false;
        else left.splice(k, 1);
      }
      if (!ok) tally.guaranteeMisses += 1;
      // Stacks no pity rule could touch (A6.5 thresholds with a margin); Jade's conversion looks like a roll.
      const p = o.reveal.pityBefore;
      const pityFree = p.sinceEpic <= 7 && p.sinceLegendary <= 23 && (!unownedBefore || p.sinceNewCard <= 2);
      if (ok && pityFree && cap.tier !== 'jade') for (const r of left) tally.rolled[RARITIES.indexOf(r)]! += 1;
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

  it('every 100 Win Capsules hold exactly 30 Clay, 40 Bronze, 20 Silver, 7 Jade and 3 Aeon', () => {
    expect(t.bagGroups).toBe(OPENINGS * 0.8 / 100);
    expect(t.badBagGroups).toBe(0);
  });

  it('stack counts and guarantees always hold', () => {
    expect(t.stackCountMisses).toBe(0);
    expect(t.guaranteeMisses).toBe(0);
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
    expect(passesChi2(t.daily, TIERS.map((tier) => C.capsules.dailyOddsBp[tier]))).toBe(true);
    const skin = C.capsules.tiers.aeon.skinChanceBp;
    expect(passesChi2([t.aeonSkins, t.aeon - t.aeonSkins], [skin, 10000 - skin])).toBe(true);
  });
});
