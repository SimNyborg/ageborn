/**
 * B3 step 8, unit attack state machines (DESIGN A2.7 Attack cycle), in id order.
 *
 * 1. When a target is valid (in range) and `tick ≥ nextAttack`, the attack starts:
 *    impactTick = tick + round(interval × windupPct), nextAttack = tick + interval, where
 *    interval = round(baseTicks × 10,000 / (10,000 + attackSpeedBp)) is fixed at the start.
 * 2. At impactTick, if the target is still valid (alive, hittable, within range + leash), a melee attack
 *    schedules its impact and a ranged attack spawns a projectile.
 * 3. Otherwise the attack whiffs; the cooldown stays spent.
 * Only attack 0 stops movement; secondary attacks (riders, the Behemoth MG) fire whenever they have a target.
 */
import { BP, roundDiv } from '@/core';
import { isLeaping, isStunned, makeImpact, unitAttackSpeedBp, unitDamageBonusBp } from '../damage';
import { emit } from '../events';
import { xOf } from '../geometry';
import type { AttackRules, UnitRules } from '../rules';
import { BASE_TARGET, other, type AttackRt, type Ctx, type UnitRt } from '../state';
import { alive, findUnit, unitRules } from '../units';
import { fireProjectile } from './projectiles';
import { targetInRange, targetValidForImpact, updateTarget } from './targeting';

export function combatSystem(ctx: Ctx): void {
  const units = ctx.s.units;
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i] as UnitRt;
    if (!alive(u) || isLeaping(u)) continue;
    const r = unitRules(ctx, u);
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

function startAttack(ctx: Ctx, u: UnitRt, r: UnitRules, ai: number, a: AttackRules, st: AttackRt): void {
  const tick = ctx.tick;
  const speedBp = unitAttackSpeedBp(ctx, u);
  const interval = speedBp !== 0 ? Math.max(1, roundDiv(a.intervalTicks * BP, BP + speedBp)) : a.intervalTicks;
  const windup = roundDiv(interval * a.windupPct, 100);
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
  const valid = targetValidForImpact(ctx, u, r, ai);
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
      toX,
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
