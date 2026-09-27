/**
 * B3 step 3, economy: passive gold and XP (× phase and modifier), XP cap, Overcharge conversion and
 * Age Power charge (DESIGN A2.3, A2.4, A2.9, A2.10). Also the shared gold and XP helpers.
 *
 * Passive income accrues every tick; one `goldEarned` / `xpEarned` event per second reports it, so the
 * event stream stays small (docs/decisions.md, WP2).
 */
import type { Side } from '@/contracts';
import { BP, PPM, TICKS_PER_SECOND } from '@/core';
import { emit } from '../events';
import { isFinalAge, xpCapOf, type Ctx } from '../state';

/** Adds XP (milli) to a side, clamped to the XP cap (A2.4). Emits `xpEarned` with the amount credited. */
export function addXp(ctx: Ctx, side: Side, amount: number, reason: 'passive' | 'kill' | 'loss' | 'base'): number {
  if (amount <= 0) return 0;
  const s = ctx.s.sides[side];
  const cap = xpCapOf(ctx, side);
  const room = cap - s.xp;
  const add = amount < room ? amount : room > 0 ? room : 0;
  if (add <= 0) return 0;
  s.xp += add;
  if (reason === 'passive') s.passiveXpAcc += add;
  else emit(ctx, { e: 'xpEarned', side, amount: add, reason });
  return add;
}

/** Adds gold (milli). Bounties emit `goldEarned` at once; passive gold is reported once per second. */
export function addGold(ctx: Ctx, side: Side, amount: number, reason: 'bounty' | 'passive', x?: number): void {
  if (amount <= 0) return;
  const s = ctx.s.sides[side];
  s.gold += amount;
  if (reason === 'passive') s.passiveGoldAcc += amount;
  else emit(ctx, x === undefined ? { e: 'goldEarned', side, amount, reason } : { e: 'goldEarned', side, amount, reason, x });
}

/** Adds Age Power charge (ppm), capped at 100%; emits `powerReady` when it fills. */
export function addPower(ctx: Ctx, side: Side, ppm: number): void {
  const s = ctx.s.sides[side];
  if (s.powerPpm >= PPM || ppm <= 0) return;
  s.powerPpm += ppm;
  if (s.powerPpm >= PPM) {
    s.powerPpm = PPM;
    emit(ctx, { e: 'powerReady', side });
  }
}

/** Passive gold per tick for a side (milli): base × phase × modifier, plus Treasury (never doubled). */
export function passiveGoldPerTick(ctx: Ctx, side: Side): number {
  const e = ctx.econ;
  let base = Math.trunc((e.passiveGoldPerTick * ctx.mods.passiveGoldBp) / BP);
  if (ctx.s.phase === 'overdrive' || ctx.s.phase === 'siege') base = Math.trunc((base * e.overdrive.baseGoldBp) / BP);
  return base + ctx.s.sides[side].treasury * e.treasuryGoldPerTickPerLevel;
}

export function economySystem(ctx: Ctx): void {
  const e = ctx.econ;
  const hot = ctx.s.phase === 'overdrive' || ctx.s.phase === 'siege';
  let xpTick = e.passiveXpPerTick;
  let powerTick = Math.trunc((e.powerPerTick * ctx.mods.powerChargeBp) / BP);
  if (hot) {
    xpTick = Math.trunc((xpTick * e.overdrive.xpBp) / BP);
    powerTick = Math.trunc((powerTick * e.overdrive.powerBp) / BP);
  }
  for (const side of [0, 1] as const) {
    const s = ctx.s.sides[side];
    addGold(ctx, side, passiveGoldPerTick(ctx, side), 'passive');
    addXp(ctx, side, xpTick, 'passive');
    // XP cap (the cap can drop at ageUp; every gain is clamped too).
    const cap = xpCapOf(ctx, side);
    if (s.xp > cap) s.xp = cap;
    // Overcharge (A2.4): in the final age, while the charge is below 100%, every 1,200 XP becomes +25%.
    if (isFinalAge(ctx, side)) {
      while (s.xp >= e.overchargeXp && s.powerPpm < PPM) {
        s.xp -= e.overchargeXp;
        addPower(ctx, side, e.overchargePpm);
      }
    }
    addPower(ctx, side, powerTick);
    if (ctx.tick % TICKS_PER_SECOND === 0) {
      if (s.passiveGoldAcc > 0) emit(ctx, { e: 'goldEarned', side, amount: s.passiveGoldAcc, reason: 'passive' });
      if (s.passiveXpAcc > 0) emit(ctx, { e: 'xpEarned', side, amount: s.passiveXpAcc, reason: 'passive' });
      s.passiveGoldAcc = 0;
      s.passiveXpAcc = 0;
    }
  }
}
