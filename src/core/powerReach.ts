/**
 * Age Power reach, cap, screen, strike pick and reload math (DESIGN A2.9.3-A2.9.7), shared by the sim,
 * the AI, the renderer and the HUD so every layer agrees on where a power may land, whom it may touch,
 * and when it is ready. Pure integer helpers.
 *
 * Positions are own-frame p (measured from the caster's gate) in one consistent unit per call: the sim
 * and the AI use milli-lu, the HUD may use lu. {@link powerReachRules} builds the rules in that unit.
 */
import type { EconomyRules, PowerEconomyRules, PowerReach, PowerSlot } from '@/contracts';
import { BP, LANE_MLU, MILLI, PPM } from './fixed';

/**
 * Whether battles send each side's Field power (A2.9.13). P1 kept it off (one power button, the Home
 * slot) until the HUD dock shipped in P2. MVP fix 2026-10-01: the dock, the Army slot, the AI and the
 * balance tools (which always played both slots) are built, and an earned slot showing "Coming soon"
 * broke U15, so it is on: the match rule follows the Field slot flag (and the Daily always plays both
 * slots). Here in `core` so the meta match rule and the Army screen read one switch (the UI may not
 * import meta).
 */
export const FIELD_SLOT_IN_BATTLE = true;

/** The slots in index order: per-slot arrays hold Home at 0 and Field at 1 (A2.9.1). */
export const POWER_SLOTS: readonly PowerSlot[] = ['home', 'field'];

/** Index of a slot in per-slot arrays (`SideState.powerPpm`). */
export function slotIndex(slot: PowerSlot): 0 | 1 {
  return slot === 'home' ? 0 : 1;
}

/** Is this a power slot name? */
export function isPowerSlot(v: unknown): v is PowerSlot {
  return v === 'home' || v === 'field';
}

/** DESIGN A2.9 values, for content that predates `economy.power` (contract fakes, old fixtures). */
export const DEFAULT_POWER_ECONOMY: Readonly<PowerEconomyRules> = {
  startBp: 2500,
  emptyReloadMs: 40000,
  homeLineP: 1000,
  frontReachLu: 150,
  frontFloorP: 480,
  frontRank: 1,
  strikePickLu: 80,
  strikeEpicBp: 5000,
  legendaryControlBp: 5000,
  lockMs: 0,
};

/** The content's power economy, field by field, falling back to {@link DEFAULT_POWER_ECONOMY}. */
export function powerEconomyOf(e: EconomyRules | undefined): PowerEconomyRules {
  const d = DEFAULT_POWER_ECONOMY;
  const o = (e as { power?: Partial<PowerEconomyRules> } | undefined)?.power;
  if (!o || typeof o !== 'object') return { ...d };
  const n = (k: keyof PowerEconomyRules): number => {
    const v = o[k];
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.trunc(v) : d[k];
  };
  return {
    startBp: n('startBp'),
    emptyReloadMs: n('emptyReloadMs') > 0 ? n('emptyReloadMs') : d.emptyReloadMs,
    homeLineP: n('homeLineP'),
    frontReachLu: n('frontReachLu'),
    frontFloorP: n('frontFloorP'),
    frontRank: n('frontRank') > 0 ? n('frontRank') : d.frontRank,
    strikePickLu: n('strikePickLu'),
    strikeEpicBp: n('strikeEpicBp'),
    legendaryControlBp: n('legendaryControlBp'),
    lockMs: n('lockMs'),
  };
}

/** Reach rules in one position unit (lu × `scale`). */
export interface PowerReachRules {
  lane: number;
  /** The A2.1 aim clamp [150, 1,850]. */
  zoneMin: number;
  zoneMax: number;
  homeLineP: number;
  frontReach: number;
  frontFloor: number;
  frontRank: number;
  strikePick: number;
  /** The card turret range cap (480): Suppress needs F ≥ lane − cap − frontReach. */
  turretRangeCap: number;
  /** Auto-aim scan step (10 lu). */
  scanStep: number;
}

/** Builds the reach rules from the content economy; `scale` 1,000 gives milli-lu (the sim), 1 gives lu. */
export function powerReachRules(e: EconomyRules, scale: number = MILLI): PowerReachRules {
  const pe = powerEconomyOf(e);
  const clamp = e.powerZoneClamp ?? [150, 1850];
  return {
    lane: Math.trunc((LANE_MLU * scale) / MILLI),
    zoneMin: clamp[0] * scale,
    zoneMax: clamp[1] * scale,
    homeLineP: pe.homeLineP * scale,
    frontReach: pe.frontReachLu * scale,
    frontFloor: pe.frontFloorP * scale,
    frontRank: pe.frontRank,
    strikePick: pe.strikePickLu * scale,
    turretRangeCap: e.turretRangeCap * scale,
    scanStep: 10 * scale,
  };
}

/** An own unit as the front F sees it (A2.9.4). `p` is own-frame; pass only living own units. */
export interface FrontCandidate {
  id: number;
  p: number;
  air: boolean;
  summoned: boolean;
  /** Mid-leap (a pounce or blink in progress). */
  leaping?: boolean;
  /** Burrowed (A16.15; not built yet). */
  burrowed?: boolean;
  /** A structure (forts, A16.14; not built yet). */
  structure?: boolean;
}

/**
 * The front F (A2.9.4): the p of the `rank`-th frontmost own unit that is on the ground, surfaced,
 * trained (not summoned), not a structure and not mid-leap. Ties: the lower id ranks first. Null = none.
 */
export function frontP(own: readonly FrontCandidate[], rank: number): number | null {
  const ps: FrontCandidate[] = [];
  for (const u of own) {
    if (u.air || u.summoned || u.leaping || u.burrowed || u.structure) continue;
    ps.push(u);
  }
  if (ps.length === 0) return null;
  ps.sort((a, b) => b.p - a.p || a.id - b.id);
  const r = rank < 1 ? 1 : rank;
  const u = ps[r - 1];
  return u ? u.p : null;
}

/**
 * The band a zone centre may take (A2.9.4), [min, max] inclusive, or null for `army` (no aim).
 * `zone` is the full zone width in the same unit. `front` is F or null.
 */
export function reachBand(reach: PowerReach, zone: number, front: number | null, r: PowerReachRules): [number, number] | null {
  const half = Math.trunc(zone / 2);
  switch (reach) {
    case 'home': {
      const max = r.homeLineP - half;
      return [r.zoneMin, max < r.zoneMin ? r.zoneMin : max];
    }
    case 'front': {
      const f = front === null || front < r.frontFloor ? r.frontFloor : front;
      const max = f + r.frontReach;
      const m = max > r.zoneMax ? r.zoneMax : max;
      return [r.zoneMin, m < r.zoneMin ? r.zoneMin : m];
    }
    case 'anywhere':
      return [r.zoneMin, r.zoneMax];
    case 'army':
    case 'lane':
      // No aim: `army` acts on own units, `lane` on the screen over the whole lane (A2.9.4).
      return null;
  }
}

/**
 * The reach area's upper bound (A2.9.4, the hard mask): an effect never touches an enemy whose own-frame
 * centre p is above it. Home: the Home line (inclusive). Front: the band max plus half the zone.
 * Anywhere and army: the whole lane.
 */
export function reachAreaMax(reach: PowerReach, zone: number, band: readonly [number, number] | null, r: PowerReachRules): number {
  if (reach === 'home') return r.homeLineP;
  if (reach === 'front' && band) return band[1] + Math.trunc(zone / 2);
  return r.lane;
}

/** Clamps an aim into a band. */
export function clampToBand(p: number, band: readonly [number, number]): number {
  return p < band[0] ? band[0] : p > band[1] ? band[1] : p;
}

/**
 * A hittable enemy (or an own unit, for buffs) in cap order (A2.9.5): `p` in the caster's own frame.
 * `capRank` ranks whole groups: 0 (default) for every unit, 1 for levies (A16.14.3), so a levy never takes
 * a cap slot while another eligible unit does not have one.
 */
export interface CapCandidate {
  id: number;
  p: number;
  capRank?: number;
}

/** Cap order (A2.9.5): `capRank` first, then the lowest own-frame p (nearest the caster's gate), ties to the lower id. */
export function capCompare(a: CapCandidate, b: CapCandidate): number {
  return (a.capRank ?? 0) - (b.capRank ?? 0) || a.p - b.p || a.id - b.id;
}

/**
 * The screen (A2.9.5): the eligible set is the units already in the cast's `hitIds` plus the first
 * (`maxTargets` − |hitIds|) other hittable enemies of the reach area in cap order. `inArea` must hold
 * only hittable enemies inside the reach area. A dead unit in `hitIds` keeps its place.
 */
export function eligibleIds(inArea: readonly CapCandidate[], maxTargets: number, hitIds: readonly number[]): Set<number> {
  const out = new Set<number>(hitIds);
  let room = maxTargets - hitIds.length;
  if (room <= 0) return out;
  const sorted = [...inArea].sort(capCompare);
  for (const c of sorted) {
    if (room <= 0) break;
    if (out.has(c.id)) continue;
    out.add(c.id);
    room -= 1;
  }
  return out;
}

/** A scored target of the auto-aim scan: own-frame p and its value (card cost). */
export interface AimCandidate {
  p: number;
  value: number;
}

/**
 * Auto-aim (A2.9.4): scan zone centres over the band in `step` increments; score = the summed value
 * of the candidates (the eligible enemies) whose centre is within zone / 2. Best wins, ties the lower
 * p. A score of 0 means nothing to hit (`powerNoTarget` for damage and control powers).
 */
export function autoAim(band: readonly [number, number], zone: number, cands: readonly AimCandidate[], step: number): { p: number; score: number } {
  const half = Math.trunc(zone / 2);
  let bestP = band[0];
  let best = 0;
  const st = step > 0 ? step : 1;
  for (let c = band[0]; c <= band[1]; c += st) {
    let score = 0;
    for (const e of cands) {
      const d = e.p > c ? e.p - c : c - e.p;
      if (d <= half) score += e.value;
    }
    if (score > best) {
      best = score;
      bestP = c;
    }
  }
  return { p: bestP, score: best };
}

/** A strike candidate (A2.9.7): an eligible enemy (hittable, never burrowed or a structure). */
export interface StrikeCandidate {
  id: number;
  /** Own-frame p of the caster. */
  p: number;
  /** Card cost, whole gold. */
  cost: number;
  /** Current HP (plus shields, same unit as the damage). */
  hp: number;
  epic: boolean;
  legendary: boolean;
}

/**
 * Manual strike pick (A2.9.7): among candidates within `pickRange` of the aim, the one nearest the aim;
 * ties to the higher card cost, then the lower id. Null when none.
 */
export function strikePick(cands: readonly StrikeCandidate[], aimP: number, pickRange: number): number | null {
  let best: StrikeCandidate | null = null;
  let bestD = 0;
  for (const c of cands) {
    const d = c.p > aimP ? c.p - aimP : aimP - c.p;
    if (d > pickRange) continue;
    if (!best || d < bestD || (d === bestD && (c.cost > best.cost || (c.cost === best.cost && c.id < best.id)))) {
      best = c;
      bestD = d;
    }
  }
  return best ? best.id : null;
}

/** Strike damage after the Epic and Legendary rules (not stacked; A2.9.6). */
export function strikeDamageOn(c: StrikeCandidate, damage: number, epicBp: number, legendaryBp: number): number {
  if (c.legendary) return Math.trunc((damage * legendaryBp) / BP);
  if (c.epic) return Math.trunc((damage * epicBp) / BP);
  return damage;
}

/**
 * The AI value of damage on one target, in milli-gold (A2.9.9): a kill counts card cost × 1.3, other
 * damage 0.4 × cost × damage ÷ current HP.
 */
export function damageValue(cost: number, damage: number, hp: number): number {
  if (hp <= 0) return 0;
  if (damage >= hp) return cost * 1300;
  return Math.trunc((400 * cost * damage) / hp);
}

/**
 * Strike ranking for auto-aim and bots (A2.9.7): candidates by strike value, best first; ties to the
 * lower own-frame p, then the lower id. `damage` is the total of all shots.
 */
export function strikeRank(cands: readonly StrikeCandidate[], damage: number, epicBp: number, legendaryBp: number): StrikeCandidate[] {
  const scored = cands.map((c) => ({ c, v: damageValue(c.cost, strikeDamageOn(c, damage, epicBp, legendaryBp), c.hp) }));
  scored.sort((a, b) => b.v - a.v || a.c.p - b.c.p || a.c.id - b.c.id);
  return scored.map((s) => s.c);
}

/** The lowest front F from which Suppress may be cast: lane − turret range cap − front reach (1,370 lu). */
export function suppressMinFront(r: PowerReachRules): number {
  return r.lane - r.turretRangeCap - r.frontReach;
}

/** Suppress is legal only while F ≥ {@link suppressMinFront} (A2.9.4). */
export function suppressLegal(front: number | null, r: PowerReachRules): boolean {
  return front !== null && front >= suppressMinFront(r);
}

/** Reload rate in bp: 10,000 plus every rate bonus (bonuses add; A2.9.3). */
export function reloadRateBp(bonusesBp: readonly number[]): number {
  let v = BP;
  for (const b of bonusesBp) v += b;
  return v > 0 ? v : 1;
}

/**
 * One tick of reload (A2.9.3): num = 1,000,000 × rateBp + rem; den = reloadTicks × 10,000;
 * gain = trunc(num ÷ den); rem = num − gain × den; progress capped at 1,000,000 (rem then 0).
 */
export function reloadStep(ppm: number, rem: number, rateBp: number, reloadTicks: number): { ppm: number; rem: number } {
  if (ppm >= PPM) return { ppm: PPM, rem: 0 };
  const den = (reloadTicks > 0 ? reloadTicks : 1) * BP;
  const num = PPM * rateBp + rem;
  const gain = Math.trunc(num / den);
  const next = ppm + gain;
  if (next >= PPM) return { ppm: PPM, rem: 0 };
  return { ppm: next, rem: num - gain * den };
}

/** Ticks until a slot is reloaded with the same integer formula as {@link reloadStep} (0 when ready). */
export function reloadTicksLeft(ppm: number, rem: number, rateBp: number, reloadTicks: number): number {
  if (ppm >= PPM) return 0;
  const den = (reloadTicks > 0 ? reloadTicks : 1) * BP;
  const perTick = PPM * (rateBp > 0 ? rateBp : 1);
  const need = (PPM - ppm) * den - rem;
  if (need <= 0) return 1;
  return Math.trunc((need + perTick - 1) / perTick);
}

/** The effective reload shown to players, ms: reloadMs × 10,000 ÷ rateBp (A2.9.3). */
export function effectiveReloadMs(reloadMs: number, rateBp: number): number {
  return Math.trunc((reloadMs * BP) / (rateBp > 0 ? rateBp : 1));
}

/**
 * The effective price (A2.9.2): cost modifiers multiply, truncated to whole gold:
 * trunc(cost × Π(10,000 − bp) ÷ 10,000ⁿ). `discountsBp` are the discounts (2,000 = −20%).
 */
export function effectiveCost(cost: number, discountsBp: readonly number[]): number {
  let num = cost;
  let den = 1;
  for (const d of discountsBp) {
    if (d === 0) continue;
    const f = BP - d;
    num *= f < 0 ? 0 : f;
    den *= BP;
  }
  return Math.trunc(num / den);
}

/** Pulses of a `field` effect: max(1, durationMs ÷ 500), 10 ticks apart (A2.9.7). */
export function fieldPulses(durationMs: number): number {
  const n = Math.trunc(durationMs / 500);
  return n > 1 ? n : 1;
}
