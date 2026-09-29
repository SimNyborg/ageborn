/**
 * Turrets (DESIGN A2.8): build, sell and modernise timers (B3 step 4) and firing (B3 step 9, mount
 * order, side 0 then side 1, collect only).
 *
 * Turrets are invulnerable, never target bases, measure range from their own gate (capped at 480 lu on
 * the card, 560 lu with research, A18.2), have a 0% windup and deal ×0.5 damage in Siege. Older-age
 * turrets keep firing at their original stats; Defences research applies to every own turret at once.
 */
import type { Side } from '@/contracts';
import { BP, MILLI, randRange, roundDiv } from '@/core';
import { emit } from '../events';
import { xOf } from '../geometry';
import { levelBp, scaleCenti, type TurretRules } from '../rules';
import { type Ctx, type TurretRt, turretSourceId } from '../state';
import { fireProjectile } from './projectiles';
import { pickTurretTarget } from './targeting';

export function turretRules(ctx: Ctx, t: TurretRt): TurretRules | undefined {
  return ctx.rules.turrets[t.card];
}

/** B3 step 4 (turret part): build, sell and modernise timers. */
export function turretTimerSystem(ctx: Ctx): void {
  for (const side of [0, 1] as const) {
    const s = ctx.s.sides[side];
    for (let m = 0; m < s.turrets.length; m += 1) {
      const t = s.turrets[m];
      if (!t || t.state === 'active' || ctx.tick < t.readyTick) continue;
      if (t.state === 'selling') {
        const tr = turretRules(ctx, t);
        s.turrets[m] = null;
        // Refunds are not income: no `goldEarned` event (the HUD reads the gold from state).
        if (tr) s.gold += Math.trunc((tr.cost * MILLI * ctx.econ.sellRefundBp) / BP);
        continue;
      }
      // building or replacing: ready to fire
      t.state = 'active';
      t.attack.nextAttackTick = ctx.tick;
      emit(ctx, { e: 'turretBuilt', side, mount: m, card: t.card });
    }
  }
}

/** B3 step 9: turret attacks, mount order, side 0 then side 1. */
export function turretFireSystem(ctx: Ctx): void {
  for (const side of [0, 1] as const) {
    const s = ctx.s.sides[side];
    for (let m = 0; m < s.turrets.length; m += 1) {
      const t = s.turrets[m];
      if (!t || t.state !== 'active' || ctx.tick < t.attack.nextAttackTick) continue;
      // Suppress (A2.9.7): a silenced mount starts no attack until its silence ends.
      if (ctx.tick < (s.mountSilencedUntil[m] ?? 0)) continue;
      const tr = turretRules(ctx, t);
      if (!tr) continue;
      fireTurret(ctx, side, m, t, tr);
    }
  }
}

function fireTurret(ctx: Ctx, side: Side, mount: number, t: TurretRt, tr: TurretRules): void {
  const a = tr.attack;
  const pick = pickTurretTarget(ctx, side, a);
  if (!pick) {
    t.attack.targetId = 0;
    return;
  }
  t.attack.targetId = pick.id;
  t.attack.lastAttackTick = ctx.tick;
  // A18.5.3 Quick Loaders and Arsenal apply at once to every own turret, within the A18.2 caps.
  const fx = ctx.s.sides[side].fx;
  const caps = ctx.econ.caps;
  const speedBp = fx.turretAttackSpeedBp > caps.attackSpeedBp ? caps.attackSpeedBp : fx.turretAttackSpeedBp;
  const interval = speedBp > 0 ? Math.max(1, roundDiv(a.intervalTicks * BP, BP + speedBp)) : a.intervalTicks;
  t.attack.nextAttackTick = ctx.tick + interval;
  const dmgBuffBp = fx.turretDamageBp > caps.damageBp ? caps.damageBp : fx.turretDamageBp;
  emit(ctx, { e: 'turretFired', side, mount, targetId: pick.id });
  const dmg = scaleCenti(a.damage, levelBp(ctx.econ, t.level));
  const gateX = xOf(0, side);
  for (let v = 0; v < a.volley; v += 1) {
    // Congreve scatter (A5.4): each rocket lands within ±scatter of the aim point (sim RNG).
    const jitter = a.scatter > 0 ? randRange(ctx.s.rng, -a.scatter, a.scatter) : 0;
    fireProjectile(ctx, {
      side,
      sourceId: turretSourceId(side, mount),
      sourceCard: t.card,
      sourceKind: 'turret',
      owner: 'turret',
      ri: tr.idx,
      a,
      attackIndex: 0,
      targetId: pick.id,
      fromX: gateX,
      toX: pick.x + jitter,
      dmg,
      vsBase: dmg,
      dmgBuffBp,
      mount,
    });
  }
}
