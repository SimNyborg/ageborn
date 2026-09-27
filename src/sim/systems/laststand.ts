/**
 * B3 step 12, Last Stand (DESIGN A2.11): arms when the base is at or below 25% HP; a tap (or the
 * automatic trigger at 10%) starts a 1.0 s charge; then a volley hits every enemy unit (ground and air)
 * within 450 lu of the gate for 200 × P(current age) × loadout multiplier (Legendaries 50%) and knocks
 * ground units back 80 lu. Once per match; kills pay 30% gold and no XP.
 */
import type { Side } from '@/contracts';
import { BP } from '@/core';
import { makeImpact } from '../damage';
import { emit } from '../events';
import { distFromGate } from '../geometry';
import { LAST_STAND_SOURCE_ID, ageOf, baseHpBp, type Ctx } from '../state';
import { alive, unitRules } from '../units';
import { loadoutLevelBp } from './powers';

/** `sourceCard` of Last Stand hits and kills. */
export const LAST_STAND_CARD = 'last_stand';

/** Starts the 1.0 s charge (manual command or automatic trigger). */
export function startLastStand(ctx: Ctx, side: Side): void {
  const s = ctx.s.sides[side];
  s.lastStand = 'charging';
  s.lastStandFireTick = ctx.tick + ctx.econ.lastStand.chargeTicks;
  emit(ctx, { e: 'lastStandCharge', side });
}

export function lastStandSystem(ctx: Ctx): void {
  const ls = ctx.econ.lastStand;
  for (const side of [0, 1] as const) {
    const s = ctx.s.sides[side];
    if (s.lastStand === 'used') continue;
    const bp = baseHpBp(s);
    if (s.lastStand === 'locked' && bp <= ls.thresholdBp) {
      s.lastStand = 'armed';
      emit(ctx, { e: 'lastStandArmed', side });
    }
    if (s.lastStand === 'armed' && bp <= ls.autoBp) startLastStand(ctx, side);
    if (s.lastStand === 'charging' && ctx.tick >= s.lastStandFireTick) fire(ctx, side);
  }
}

function fire(ctx: Ctx, side: Side): void {
  const s = ctx.s.sides[side];
  const ls = ctx.econ.lastStand;
  s.lastStand = 'used';
  s.lastStandFireTick = 0;
  emit(ctx, { e: 'lastStandFire', side });
  const pBp = ctx.rules.pBp[ageOf(ctx, side)];
  const perP = Math.trunc((ls.damagePerP * 100 * pBp) / BP);
  const dmg = Math.trunc((perP * loadoutLevelBp(ctx, side)) / BP);
  for (const e of ctx.s.units) {
    if (e.side === side || !alive(e)) continue;
    if (distFromGate(side, e.x, unitRules(ctx, e).half) > ls.radius) continue;
    const imp = makeImpact(side, LAST_STAND_SOURCE_ID, LAST_STAND_CARD);
    imp.sourceKind = 'lastStand';
    imp.dmgType = 'blast';
    imp.dmg = dmg;
    imp.power = true;
    imp.targetId = e.id;
    imp.x = e.x;
    imp.hitsAir = true;
    imp.kb = ls.knockback;
    ctx.impacts.push(imp);
  }
}
