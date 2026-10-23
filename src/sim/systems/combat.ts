/**
 * B3 step 8, unit attack state machines (DESIGN A2.7 Attack cycle), in id order.
 *
 * 1. When a target is valid (in range) and `tick ≥ nextAttack`, the attack starts:
 *    impactTick = tick + round(interval × windupPct), nextAttack = tick + interval, where
 *    interval = round(baseTicks × 10,000 / (10,000 + attackSpeedBp)) is fixed at the start. The first swing
 *    of a fresh engagement adds a wait of 0 or 3 ticks to both (A9a de-phase, SIM_VERSION 9.0.0).
 * 2. At impactTick, if the target is still valid (alive, hittable, within range + leash), a melee attack
 *    schedules its impact and a ranged attack spawns a projectile.
 * 3. Otherwise the attack whiffs; the cooldown stays spent. A melee swing whose target died picks afresh among
 *    the targets in range first (A9b retarget whiffs, SIM_VERSION 10.0.0).
 * Only attack 0 stops movement; secondary attacks (riders, the Behemoth MG) fire whenever they have a target.
 */
import { BP, randRange, roundDiv } from '@/core';
import { isLeaping, isStunned, makeImpact, statusBp, unitAttackSpeedBp, unitDamageBonusBp } from '../damage';
import { emit } from '../events';
import { xOf } from '../geometry';
import type { AttackRules, UnitRules } from '../rules';
import { BASE_TARGET, other, type AttackRt, type Ctx, type UnitRt } from '../state';
import { alive, findUnit, unitRules } from '../units';
import { pickContacts, towerFire } from './forts';
import { fireProjectile } from './projectiles';
import { repickForImpact, targetInRange, targetValidForImpact, updateTarget } from './targeting';

export function combatSystem(ctx: Ctx): void {
  // A16.14.2: the fort contact set is re-picked every tick before any attack starts.
  pickContacts(ctx);
  const units = ctx.s.units;
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i] as UnitRt;
    if (!alive(u) || isLeaping(u)) continue;
    const r = unitRules(ctx, u);
    if (u.fort) {
      // Walls and camps never attack; a field tower fires like a stationary archer (A16.14.3).
      if (u.fort.kind === 'tower') towerFire(ctx, u, r);
      continue;
    }
    const stunned = isStunned(u);
    let engaged = false;
    for (let ai = 0; ai < r.attacks.length; ai += 1) {
      const st = u.attacks[ai] as AttackRt;
      const a = r.attacks[ai] as AttackRules;
      if (st.impactTick !== 0 && st.impactTick <= ctx.tick) resolveWindup(ctx, u, r, ai, a, st);
      if (stunned) continue;
      if (st.impactTick === 0) updateTarget(ctx, u, r, ai);
      const inRange = targetInRange(ctx, u, r, ai);
      if (st.impactTick === 0 && ctx.tick >= st.nextAttackTick && inRange) {
        startAttack(ctx, u, r, ai, a, st);
      }
      if (ai === 0 && (inRange || st.impactTick !== 0)) engaged = true;
    }
    // A18.4.2 engagement freshness: attack 0 had a target in range (or a windup) this tick.
    if (engaged) u.lastEngagedTick = ctx.tick;
  }
}

/** Is a first-hit bonus armed for this unit (card ability or research, A2.7, A18.5.2)? */
function hasFirstHit(ctx: Ctx, u: UnitRt, r: UnitRules): boolean {
  if (r.firstHit) return true;
  const fx = u.fx;
  if (!fx) return false;
  return fx.firstHitBp > 0 || fx.firstHitKb > 0 || (fx.firstHitHoldBp > 0 && ctx.s.sides[u.side].stance === 'hold');
}

/** The first-hit multiplier and knockback of a unit's engagement hit (card ability plus research). */
function firstHitBonus(ctx: Ctx, u: UnitRt, r: UnitRules): { bp: number; kb: number } {
  let bp = r.firstHit ? r.firstHit.multBp : BP;
  let kb = r.firstHit ? r.firstHit.knockback : 0;
  const fx = u.fx;
  if (fx) {
    bp += fx.firstHitBp;
    if (fx.firstHitHoldBp > 0 && ctx.s.sides[u.side].stance === 'hold') bp += fx.firstHitHoldBp;
    kb += fx.firstHitKb;
  }
  return { bp, kb };
}

/** A 32-bit integer mix of a unit id and a tick (deterministic, `Math.imul` only, B3), unsigned. */
function phaseHash(id: number, tick: number): number {
  let h = Math.imul(id ^ 0x5bd1e995, 0x9e3779b1) ^ Math.imul(tick + 0x632be5ab, 0x85ebca77);
  h ^= h >>> 15;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 13;
  return h >>> 0;
}

/**
 * A9a, de-phase the metronome (A2.7 Attack cycle, queue item 38, SIM_VERSION 9.0.0). Equal-range pairs walk
 * into range on one tick and most cards of a kind share one interval, so the two would otherwise swing and
 * land together for the whole fight (mirror exchanges, double KOs). The first swing of a fresh engagement
 * waits 0 or `max` extra ticks, picked by a hash of the unit id and the tick (no RNG draw). When the
 * target's own pending swing on this unit would land fewer than `max` ticks from this one, the unit takes
 * the nearest wait (0 to `max`) that keeps the two impacts `max` apart, or else the one that keeps them
 * furthest apart: a duel lands its blows `max` ticks apart, whoever is first.
 */
function firstSwingWait(ctx: Ctx, u: UnitRt, st: AttackRt, impact: number, max: number): number {
  const d = (phaseHash(u.id, ctx.tick) & 1) === 1 ? max : 0;
  if (st.targetId <= 0) return d;
  const ts = findUnit(ctx, st.targetId)?.attacks[0];
  if (!ts || ts.targetId !== u.id || ts.impactTick === 0) return d;
  const gap = (k: number): number => Math.abs(impact + k - ts.impactTick);
  if (gap(d) >= max) return d;
  // The cost of a wait: its distance from the drawn one when it keeps the impacts apart, else how close it
  // leaves them (any wait that keeps them apart beats every one that does not); ties keep the shorter wait.
  let best = d;
  let bestCost = Number.MAX_SAFE_INTEGER;
  for (let k = 0; k <= max; k += 1) {
    const cost = gap(k) >= max ? Math.abs(k - d) : max * 4 - gap(k);
    if (cost < bestCost) {
      bestCost = cost;
      best = k;
    }
  }
  return best;
}

function startAttack(ctx: Ctx, u: UnitRt, r: UnitRules, ai: number, a: AttackRules, st: AttackRt): void {
  const tick = ctx.tick;
  const speedBp = unitAttackSpeedBp(ctx, u);
  let interval = speedBp !== 0 ? Math.max(1, roundDiv(a.intervalTicks * BP, BP + speedBp)) : a.intervalTicks;
  // A snare (A2.9.6) slows attacks too: attack speed × (1 − s), after the A18.2 caps.
  const snare = statusBp(u, 'snare');
  if (snare > 0) interval = Math.max(1, roundDiv(interval * BP, BP - (snare >= BP ? BP - 1 : snare)));
  let windup = roundDiv(interval * a.windupPct, 100);
  // A9a: the first swing of a fresh engagement (attack 0 had no target in range and no windup last tick) waits
  // 0 or `dephaseTicks` more (`firstSwingWait`), on the windup and the interval alike: the clip's held extreme
  // absorbs it (B5: the view scales the clip to `windupTicks`) and the swings after it keep the unit's rate.
  const wait = ctx.econ.dephaseTicks;
  if (wait > 0 && ai === 0 && u.lastEngagedTick < tick - 1) {
    const d = firstSwingWait(ctx, u, st, tick + windup, wait);
    windup += d;
    interval += d;
  }
  // A18.4.2: the first hit of an engagement is the first attack after 4 s with no target in range.
  st.firstHit = ai === 0 && tick - u.lastEngagedTick >= ctx.econ.freshTicks && hasFirstHit(ctx, u, r);
  st.lastAttackTick = tick;
  st.nextAttackTick = tick + interval;
  st.impactTick = tick + windup;
  emit(ctx, { e: 'attackStarted', id: u.id, targetId: st.targetId, windupTicks: windup, attackIndex: ai });
  if (windup === 0) resolveWindup(ctx, u, r, ai, a, st);
}

/** The windup ends: deliver the attack or whiff. */
function resolveWindup(ctx: Ctx, u: UnitRt, r: UnitRules, ai: number, a: AttackRules, st: AttackRt): void {
  let valid = targetValidForImpact(ctx, u, r, ai);
  // A9b: a melee swing whose target died before the impact lands on a fresh pick in range instead of the air.
  if (!valid && ctx.econ.retargetWhiffs && repickForImpact(ctx, u, r, ai)) valid = targetValidForImpact(ctx, u, r, ai);
  const firstHit = st.firstHit;
  const bite = st.bite;
  st.impactTick = 0;
  st.firstHit = false;
  if (ai === 0) st.bite = false;
  if (!valid) return;
  const dmg = u.dmg[ai] ?? 0;
  const vsBase = u.vsBase[ai] ?? 0;
  const buff = unitDamageBonusBp(ctx, u);
  const fh = firstHit ? firstHitBonus(ctx, u, r) : null;
  if (a.melee) {
    const imp = makeImpact(u.side, u.id, u.card);
    imp.dmgType = a.dmgType;
    imp.dmg = dmg;
    imp.vsBase = vsBase;
    imp.atk = a;
    imp.dmgBuffBp = buff;
    imp.srcX = u.x;
    imp.srcRange = a.range;
    imp.srcCls = u.cls;
    imp.forts = true;
    if (u.fx) {
      imp.vsTags = u.fx.vsTags;
      imp.vsBp = u.fx.vsBp;
    }
    imp.hitsGround = a.hitsGround;
    imp.hitsAir = a.hitsAir;
    imp.area = a.area;
    imp.radius = a.radius;
    imp.targetId = st.targetId;
    if (st.targetId === BASE_TARGET) {
      imp.x = xOf(0, other(u.side));
    } else {
      const t = findUnit(ctx, st.targetId);
      imp.x = t ? t.x : u.x;
    }
    if (fh) {
      imp.bonusBp = fh.bp;
      imp.bonusKb = fh.kb;
    }
    if (bite && r.pounce) imp.bonusBp = Math.trunc((imp.bonusBp * r.pounce.biteBp) / BP);
    ctx.impacts.push(imp);
    return;
  }
  const toX = st.targetId === BASE_TARGET ? xOf(0, other(u.side)) : (findUnit(ctx, st.targetId)?.x ?? u.x);
  for (let v = 0; v < a.volley; v += 1) {
    // A unit volley with scatter (SIM_VERSION 7.2.0, Gunpowder wave: the Rocket Cart) lands each projectile
    // within ±scatter of the aim point, like the Congreve turret (sim RNG; no draw when scatter is 0).
    const jitter = a.scatter > 0 ? randRange(ctx.s.rng, -a.scatter, a.scatter) : 0;
    fireProjectile(ctx, {
      side: u.side,
      sourceId: u.id,
      sourceCard: u.card,
      sourceKind: 'unit',
      owner: 'unit',
      ri: r.idx,
      a,
      attackIndex: ai,
      targetId: st.targetId,
      fromX: u.x,
      toX: toX + jitter,
      dmg,
      vsBase,
      dmgBuffBp: buff,
      mount: -1,
      srcCls: u.cls,
      ...(u.fx ? { vsTags: u.fx.vsTags, vsBp: u.fx.vsBp } : {}),
      // A ranged first hit (A17.15: Harpoon Gunner's Reel In) rides on the first projectile of the volley.
      ...(fh && v === 0 ? { bonusBp: fh.bp, bonusKb: fh.kb } : {}),
    });
  }
}
