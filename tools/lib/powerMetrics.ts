/**
 * The A2.9.12 power metrics over a set of match sides (DESIGN A2.9.12 gates, A2.14):
 *
 * - power share of gold: gold paid for casts ÷ gold earned;
 * - power share of enemy value killed: card value killed by powers ÷ all enemy card value killed
 *   (summons count 0);
 * - army share touched by one cast: the card value a cast touched ÷ the enemy's on-lane army value when
 *   it was cast, over casts into an army worth ≥ 750 (p50);
 * - the largest single cast: card value killed by one cast (p99 and max);
 * - casts per side per age stay (median over stays of at least 20 s), the share of stays with a cast and
 *   with a Field cast, casts per side per match;
 * - value per gold of damaging casts: card value killed × 1.3 (the card plus the 30% bounty) ÷ cost.
 *
 * Pure: the numbers come from `MatchSummary` sides (`SideStats.power`).
 */
import type { CardId, CompiledContent, PowerFamily } from '../../src/contracts';
import type { CastRecord, SideStats } from './metrics';
import { median, quantile } from './stats';

/** A2.9.12: the army share is measured on casts into an army worth at least this (whole gold). */
export const ARMY_SHARE_MIN = 750;
/** Stays shorter than this (a fast double evolve, the last seconds) are left out of the per-stay numbers. */
export const STAY_MIN_SEC = 20;
/** A kill is worth the card plus the 30% power bounty (A2.9.2) in the value-per-gold number. */
const KILL_WORTH = 1.3;
/** Families that deal no damage: their value per gold is not a kill count (buffs, the cloud, drops, Suppress). */
const NON_DAMAGE: readonly PowerFamily[] = ['rally', 'ward', 'mend', 'cloud', 'drop', 'suppress'];

export interface PowerSummary {
  sides: number;
  casts: number;
  goldSharePct: number;
  killSharePct: number;
  /** Median share (percent) of the enemy army value one cast touched, casts into armies ≥ 750. */
  armyShareP50: number;
  armyShareSamples: number;
  largestCastP99: number;
  largestCastMax: number;
  castsPerStayMedian: number;
  castsPerStayMean: number;
  stays: number;
  staysWithCastPct: number;
  staysWithFieldCastPct: number;
  castsPerMatchMedian: number;
  valuePerGoldMedian: number;
  valuePerGoldSamples: number;
}

export interface PowerRow {
  power: CardId;
  casts: number;
  killMean: number;
  valuePerGoldMean: number;
  zeroKillPct: number;
  touchedMean: number;
}

const pct = (a: number, b: number): number => (b > 0 ? (a * 100) / b : Number.NaN);

function isDamaging(content: CompiledContent, power: CardId): boolean {
  const f = content.powers[power]?.family;
  return f !== undefined && !NON_DAMAGE.includes(f);
}

/** The A2.9.12 power numbers over the given sides (both sides of a mirror, or the subject's side). */
export function powerSummary(content: CompiledContent, sides: readonly SideStats[]): PowerSummary {
  let gold = 0;
  let earned = 0;
  let killed = 0;
  let powerKilled = 0;
  const armyShares: number[] = [];
  const kills: number[] = [];
  const vpg: number[] = [];
  const perStay: number[] = [];
  const perMatch: number[] = [];
  let stays = 0;
  let withCast = 0;
  let withField = 0;
  let casts = 0;
  for (const s of sides) {
    const p = s.power;
    if (!p) continue;
    gold += p.gold;
    earned += s.goldEarned;
    killed += p.killValue;
    powerKilled += p.powerKillValue;
    perMatch.push(p.casts.length);
    casts += p.casts.length;
    for (const c of p.casts) {
      kills.push(c[2]);
      if (c[3] >= ARMY_SHARE_MIN) armyShares.push(pct(c[4], c[3]));
      if (isDamaging(content, c[0]) && c[6] > 0) vpg.push((c[2] * KILL_WORTH) / c[6]);
    }
    for (const st of p.stays) {
      if (st[1] < STAY_MIN_SEC) continue;
      stays += 1;
      perStay.push(st[2]);
      if (st[2] > 0) withCast += 1;
      if (st[3] > 0) withField += 1;
    }
  }
  return {
    sides: sides.length,
    casts,
    goldSharePct: pct(gold, earned),
    killSharePct: pct(powerKilled, killed),
    armyShareP50: median(armyShares),
    armyShareSamples: armyShares.length,
    largestCastP99: quantile(kills, 0.99),
    largestCastMax: kills.length ? Math.max(...kills) : Number.NaN,
    castsPerStayMedian: median(perStay),
    castsPerStayMean: perStay.length ? perStay.reduce((a, b) => a + b, 0) / perStay.length : Number.NaN,
    stays,
    staysWithCastPct: pct(withCast, stays),
    staysWithFieldCastPct: pct(withField, stays),
    castsPerMatchMedian: median(perMatch),
    valuePerGoldMedian: median(vpg),
    valuePerGoldSamples: vpg.length,
  };
}

/** Per power: casts, mean card value killed, mean value per gold, the share of casts that killed nothing. */
export function powerRows(sides: readonly SideStats[], only?: (c: CastRecord) => boolean): PowerRow[] {
  const by = new Map<CardId, CastRecord[]>();
  for (const s of sides) {
    for (const c of s.power?.casts ?? []) {
      if (only && !only(c)) continue;
      const list = by.get(c[0]) ?? [];
      list.push(c);
      by.set(c[0], list);
    }
  }
  const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.NaN);
  return [...by.entries()]
    .map(([power, cs]) => ({
      power,
      casts: cs.length,
      killMean: mean(cs.map((c) => c[2])),
      valuePerGoldMean: mean(cs.map((c) => (c[6] > 0 ? (c[2] * KILL_WORTH) / c[6] : 0))),
      zeroKillPct: pct(cs.filter((c) => c[2] === 0).length, cs.length),
      touchedMean: mean(cs.map((c) => c[5])),
    }))
    .sort((a, b) => a.power.localeCompare(b.power));
}
