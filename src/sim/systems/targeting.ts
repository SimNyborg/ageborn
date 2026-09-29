/**
 * Targeting (DESIGN A2.7 Targeting, A2.8 turrets, A5 per-card rules).
 *
 * Candidates are enemy units in range that the attack can hit, in either direction. The enemy base
 * (target −1) is a candidate only when no unit candidate exists, so a unit hitting the base switches to
 * an enemy unit the moment one is in range (no stickiness for the base). Priority classes: `front` (all equal),
 * `armored` (armored or mech first), `backline` (ranged or support first), `air` (air first); ties go
 * to the smaller distance, then the lower id. Units keep their target (stickiness) until it dies,
 * leaves range plus the 20 lu leash or becomes unhittable, and re-check every 1.0 s, switching to a
 * candidate of a better class or one at least 60 lu closer. Ranged units switch at once to an enemy
 * within 30 lu (self-defence). Turrets measure from their own gate and pick afresh for every shot.
 */
import type { Side, TargetPriority } from '@/contracts';
import { isLeaping, rangeBonus } from '../damage';
import { centreDist, distFromGate, distToEnemyGate, edgeDist, isAheadOrLevel, pOf, xOf } from '../geometry';
import { DENSE_SCAN_STEP, TAG, type AttackRules, type UnitRules } from '../rules';
import { MAX_HALF, unitsBetween } from '../spatial';
import { BASE_TARGET, LANE, NO_TARGET, other, type Ctx, type UnitRt } from '../state';
import { alive, findUnit, unitRules } from '../units';

/** An attack's range for this unit: the card range plus research (Long Draw, ranged attacks only; A18.5.2). */
export function rangeOf(ctx: Ctx, u: UnitRt, a: AttackRules): number {
  return a.range + rangeBonus(ctx, u, a.melee);
}

/** Priority class of a base target: below every unit. */
const BASE_CLASS = 2;

/** True when the attack can hit the target at all (air/ground flags; leaping units dodge melee). */
export function canHit(a: AttackRules, target: UnitRt): boolean {
  if (target.air ? !a.hitsAir : !a.hitsGround) return false;
  if (a.melee && isLeaping(target)) return false;
  return true;
}

export function priorityClass(prio: TargetPriority, r: UnitRules): number {
  switch (prio) {
    case 'armored':
      return (r.tags & (TAG.armored | TAG.mech)) !== 0 ? 0 : 1;
    case 'backline':
      return (r.tags & (TAG.ranged | TAG.support)) !== 0 ? 0 : 1;
    case 'air':
      return r.air ? 0 : 1;
    default:
      return 0;
  }
}

interface Pick {
  id: number;
  cls: number;
  dist: number;
}

/** Best unit candidate for a unit's attack (or null). */
function bestUnitCandidate(
  ctx: Ctx,
  u: UnitRt,
  r: UnitRules,
  a: AttackRules,
  maxDist: number,
  onlyBlocking: boolean,
  prio: TargetPriority = a.priority,
): Pick | null {
  let best: Pick | null = null;
  const reach = maxDist + r.half + MAX_HALF;
  const foes = unitsBetween(ctx, other(u.side), u.x - reach, u.x + reach, ctx.scratch);
  for (let i = 0; i < foes.length; i += 1) {
    const e = foes[i] as UnitRt;
    if (!canHit(a, e)) continue;
    const er = unitRules(ctx, e);
    const d = edgeDist(u.x, r.half, e.x, er.half);
    if (d > maxDist || d < a.minRange) continue;
    if (onlyBlocking && (e.air || !isAheadOrLevel(u.side, u.x, e.x))) continue;
    const cls = priorityClass(prio, er);
    if (!best || cls < best.cls || (cls === best.cls && (d < best.dist || (d === best.dist && e.id < best.id)))) {
      best = { id: e.id, cls, dist: d };
    }
  }
  return best;
}

/** Can this unit attack hit the enemy base from where it stands? */
export function baseInRange(ctx: Ctx, u: UnitRt, r: UnitRules, a: AttackRules, extra: number): boolean {
  if (!a.hitsGround) return false;
  const d = distToEnemyGate(u.side, u.x, r.half);
  return d <= rangeOf(ctx, u, a) + extra && d >= a.minRange;
}

/** Distance and class of the current target, or null when it is no longer valid (range + leash). */
function currentTarget(ctx: Ctx, u: UnitRt, r: UnitRules, a: AttackRules, targetId: number): Pick | null {
  const leash = ctx.econ.leash;
  if (targetId === BASE_TARGET) {
    return baseInRange(ctx, u, r, a, leash) ? { id: BASE_TARGET, cls: BASE_CLASS, dist: distToEnemyGate(u.side, u.x, r.half) } : null;
  }
  if (targetId === NO_TARGET) return null;
  const e = findUnit(ctx, targetId);
  if (!e || !alive(e) || e.side === u.side || !canHit(a, e)) return null;
  const er = unitRules(ctx, e);
  const d = edgeDist(u.x, r.half, e.x, er.half);
  if (d > rangeOf(ctx, u, a) + leash || d < a.minRange) return null;
  return { id: e.id, cls: priorityClass(a.priority, er), dist: d };
}

/** Bomber (A2.7 Air units): ground enemies within ±window of its x, else the base at the gate. */
function bomberTarget(ctx: Ctx, u: UnitRt, r: UnitRules, a: AttackRules, window: number): number {
  let bestId = NO_TARGET;
  let bestD = 0;
  const foes = a.hitsGround ? unitsBetween(ctx, other(u.side), u.x - window, u.x + window, ctx.scratch) : [];
  for (let i = 0; i < foes.length; i += 1) {
    const e = foes[i] as UnitRt;
    if (e.air) continue;
    const d = centreDist(u.x, e.x);
    if (bestId === NO_TARGET || d < bestD || (d === bestD && e.id < bestId)) {
      bestId = e.id;
      bestD = d;
    }
  }
  if (bestId !== NO_TARGET) return bestId;
  return baseInRange(ctx, u, r, a, 0) ? BASE_TARGET : NO_TARGET;
}

/**
 * Updates the target of attack `ai` of unit `u` for this tick (B3 step 8, retarget part).
 * Leaves `targetId` as a unit id, BASE_TARGET or NO_TARGET.
 */
export function updateTarget(ctx: Ctx, u: UnitRt, r: UnitRules, ai: number): void {
  const a = r.attacks[ai] as AttackRules;
  const st = u.attacks[ai];
  if (!st) return;
  const tick = ctx.tick;
  const retarget = ctx.econ.retargetTicks;
  const range = rangeOf(ctx, u, a);
  if (r.bomber) {
    st.targetId = bomberTarget(ctx, u, r, a, r.bomber.window);
    return;
  }
  // Siege-only (Battering Ram): the base when in range; units only while they block it (A5.3).
  if (r.siegeOnly) {
    if (baseInRange(ctx, u, r, a, 0)) {
      st.targetId = BASE_TARGET;
      return;
    }
    const cur = currentTarget(ctx, u, r, a, st.targetId);
    if (cur && cur.id !== BASE_TARGET && cur.dist <= range) return;
    const blocker = bestUnitCandidate(ctx, u, r, a, range, true);
    st.targetId = blocker ? blocker.id : NO_TARGET;
    return;
  }
  // Self-defence (A2.7): a ranged unit switches at once to an enemy within 30 lu.
  if (r.ranged) {
    const cur = st.targetId > 0 ? currentTarget(ctx, u, r, a, st.targetId) : null;
    if (!cur || cur.dist > ctx.econ.selfDefense) {
      const near = bestUnitCandidate(ctx, u, r, a, Math.min(range, ctx.econ.selfDefense), false, 'front');
      if (near && near.id !== st.targetId) {
        st.targetId = near.id;
        st.retargetTick = tick + retarget;
        return;
      }
    }
  }
  const cur = currentTarget(ctx, u, r, a, st.targetId);
  if (cur && cur.id === BASE_TARGET) {
    // The base is a candidate only while no unit candidate exists (A2.7), so it is never sticky: a
    // unit hitting the base turns to an enemy unit as soon as one is in range.
    const best = bestUnitCandidate(ctx, u, r, a, range, false);
    if (best) {
      st.targetId = best.id;
      st.retargetTick = tick + retarget;
    }
    return;
  }
  if (!cur) {
    const best = bestUnitCandidate(ctx, u, r, a, range, false);
    if (best) st.targetId = best.id;
    else st.targetId = baseInRange(ctx, u, r, a, 0) ? BASE_TARGET : NO_TARGET;
    st.retargetTick = tick + retarget;
    return;
  }
  if (tick >= st.retargetTick) {
    st.retargetTick = tick + retarget;
    const best = bestUnitCandidate(ctx, u, r, a, range, false);
    if (best && best.id !== cur.id && (best.cls < cur.cls || best.dist + ctx.econ.retargetCloser <= cur.dist)) {
      st.targetId = best.id;
    }
  }
}

/** Is the (valid) target of attack `ai` within attack range right now? */
export function targetInRange(ctx: Ctx, u: UnitRt, r: UnitRules, ai: number): boolean {
  const a = r.attacks[ai];
  const st = u.attacks[ai];
  if (!a || !st || st.targetId === NO_TARGET) return false;
  if (st.targetId === BASE_TARGET) return baseInRange(ctx, u, r, a, 0);
  const e = findUnit(ctx, st.targetId);
  if (!e || !alive(e) || !canHit(a, e)) return false;
  if (r.bomber) return centreDist(u.x, e.x) <= r.bomber.window;
  const d = edgeDist(u.x, r.half, e.x, unitRules(ctx, e).half);
  return d <= rangeOf(ctx, u, a) && d >= a.minRange;
}

/** Is the target still valid for a pending impact (alive, hittable, within range + leash)? */
export function targetValidForImpact(ctx: Ctx, u: UnitRt, r: UnitRules, ai: number): boolean {
  const a = r.attacks[ai];
  const st = u.attacks[ai];
  if (!a || !st || st.targetId === NO_TARGET) return false;
  if (st.targetId === BASE_TARGET) return baseInRange(ctx, u, r, a, ctx.econ.leash);
  const e = findUnit(ctx, st.targetId);
  if (!e || !alive(e) || !canHit(a, e)) return false;
  if (r.bomber) return centreDist(u.x, e.x) <= r.bomber.window + ctx.econ.leash;
  return edgeDist(u.x, r.half, e.x, unitRules(ctx, e).half) <= rangeOf(ctx, u, a) + ctx.econ.leash;
}

// ---------------------------------------------------------------------------------------------
// Turrets (A2.8): range from the own gate, capped; never the base.

export interface TurretPick {
  id: number;
  /** Aim point (densest scan), else the target's x. */
  x: number;
}

function turretCandidate(a: AttackRules, range: number, side: Side, e: UnitRt, er: UnitRules): number {
  if (e.side === side || !alive(e) || !canHit(a, e)) return -1;
  const d = distFromGate(side, e.x, er.half);
  if (d > range || d < a.minRange) return -1;
  return d;
}

/** A turret's range now: the card range plus research (Watchtowers), at most the 560 lu hard cap (A18.2). */
export function turretRange(ctx: Ctx, side: Side, a: AttackRules): number {
  const r = a.range + ctx.s.sides[side].fx.turretRange;
  const cap = ctx.econ.turretRangeHardCap;
  return r > cap ? (a.range > cap ? a.range : cap) : r;
}

/** Enemy units whose centre is within `range` + the largest half-width of `side`'s gate. */
function nearGate(ctx: Ctx, side: Side, range: number): UnitRt[] {
  const span = range + MAX_HALF;
  const lo = side === 0 ? 0 : LANE - span;
  const hi = side === 0 ? span : LANE;
  return unitsBetween(ctx, other(side), lo, hi, ctx.scratch);
}

/** Picks a turret target for a shot, or null. */
export function pickTurretTarget(ctx: Ctx, side: Side, a: AttackRules): TurretPick | null {
  const range = turretRange(ctx, side, a);
  if (a.priority === 'densest') return densestTurretTarget(ctx, side, a, range);
  if (a.drag > 0) return toadTarget(ctx, side, a, range);
  let best: (Pick & { x: number }) | null = null;
  for (const e of nearGate(ctx, side, range)) {
    const er = unitRules(ctx, e);
    const d = turretCandidate(a, range, side, e, er);
    if (d < 0) continue;
    const cls = priorityClass(a.priority, er);
    if (!best || cls < best.cls || (cls === best.cls && (d < best.dist || (d === best.dist && e.id < best.id)))) {
      best = { id: e.id, cls, dist: d, x: e.x };
    }
  }
  return best ? { id: best.id, x: best.x } : null;
}

/**
 * Grumpy Toad (A5.2): the nearest enemy ranged or support ground unit in range, else the
 * second-frontmost small or medium ground enemy in range (the frontmost when it is the only one).
 */
function toadTarget(ctx: Ctx, side: Side, a: AttackRules, range: number): TurretPick | null {
  let back: Pick | null = null;
  const small: Pick[] = [];
  for (const e of nearGate(ctx, side, range)) {
    const er = unitRules(ctx, e);
    const d = turretCandidate(a, range, side, e, er);
    if (d < 0 || e.air) continue;
    if ((er.tags & (TAG.ranged | TAG.support)) !== 0) {
      if (!back || d < back.dist || (d === back.dist && e.id < back.id)) back = { id: e.id, cls: 0, dist: d };
    }
    if (er.def.size === 'small' || er.def.size === 'medium') small.push({ id: e.id, cls: 0, dist: d });
  }
  let pick = back;
  if (!pick && small.length > 0) {
    small.sort((p, q) => p.dist - q.dist || p.id - q.id);
    pick = small[small.length > 1 ? 1 : 0] as Pick;
  }
  if (!pick) return null;
  const u = findUnit(ctx, pick.id);
  return u ? { id: u.id, x: u.x } : null;
}

/**
 * Densest point (A2.7 `densest`): the p in [pMin, pMax] (side frame, 10 lu steps) that maximises the
 * summed card cost of hittable enemies whose centre lies within `window`. Ties keep the lowest p.
 * Returns null when no enemy scores.
 */
export function densestP(
  ctx: Ctx,
  side: Side,
  pMin: number,
  pMax: number,
  window: number,
  hitsGround: boolean,
  hitsAir: boolean,
): number | null {
  let bestP = -1;
  let bestScore = 0;
  for (let p = pMin; p <= pMax; p += DENSE_SCAN_STEP) {
    const x = xOf(p, side);
    let score = 0;
    for (const e of ctx.s.units) {
      if (e.side === side || !alive(e) || (e.air ? !hitsAir : !hitsGround)) continue;
      if (centreDist(x, e.x) <= window) score += unitRules(ctx, e).cost;
    }
    if (score > bestScore) {
      bestScore = score;
      bestP = p;
    }
  }
  return bestP < 0 ? null : bestP;
}

/** Gravity Well: aim at the densest point in range; the primary is the enemy nearest that point. */
function densestTurretTarget(ctx: Ctx, side: Side, a: AttackRules, range: number): TurretPick | null {
  let lo = -1;
  let hi = -1;
  for (const e of nearGate(ctx, side, range)) {
    const er = unitRules(ctx, e);
    const d = turretCandidate(a, range, side, e, er);
    if (d < 0) continue;
    const p = pOf(e.x, side);
    if (lo < 0 || p < lo) lo = p;
    if (p > hi) hi = p;
  }
  if (lo < 0) return null;
  // Scan the candidates' span on the 10 lu grid measured from the gate.
  const start = Math.max(0, Math.trunc((lo - a.radius) / DENSE_SCAN_STEP) * DENSE_SCAN_STEP);
  const end = Math.min(range, hi + a.radius);
  const p = densestP(ctx, side, start, end, a.radius, a.hitsGround, a.hitsAir);
  if (p === null) return null;
  const x = xOf(p, side);
  let bestId = NO_TARGET;
  let bestD = 0;
  for (const e of ctx.s.units) {
    if (e.side === side || !alive(e) || !canHit(a, e)) continue;
    const d = centreDist(x, e.x);
    if (d > a.radius) continue;
    if (bestId === NO_TARGET || d < bestD || (d === bestD && e.id < bestId)) {
      bestId = e.id;
      bestD = d;
    }
  }
  return bestId === NO_TARGET ? null : { id: bestId, x };
}
