/**
 * B3 step 3, economy: passive gold and XP (× phase and modifier), XP cap, Overcharge conversion and
 * Age Power reload per slot (DESIGN A2.3, A2.4, A2.9.3, A2.10). Also the shared gold and XP helpers.
 *
 * Passive income accrues every tick; one `goldEarned` / `xpEarned` event per second reports it, so the
 * event stream stays small (docs/decisions.md, WP2).
 */
import type { PowerSlot, Side } from '@/contracts';
import { BP, POWER_SLOTS, PPM, TICKS_PER_SECOND, reloadStep, slotIndex } from '@/core';
import { emit } from '../events';
import { isFinalAge, slotPower, xpCapOf, type Ctx } from '../state';
import { powerRateBp, slotReloadTicks } from './powers';

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

/**
 * Adds reload progress (ppm) to one power slot, capped at 100% (the remainder is then cleared); emits
 * `powerReady` when a slot with an equipped power fills (A2.9.3).
 */
export function addPower(ctx: Ctx, side: Side, slot: PowerSlot, ppm: number): void {
  const s = ctx.s.sides[side];
  const i = slotIndex(slot);
  if (s.powerPpm[i] >= PPM || ppm <= 0) return;
  s.powerPpm[i] += ppm;
  if (s.powerPpm[i] >= PPM) {
    s.powerPpm[i] = PPM;
    s.powerRem[i] = 0;
    if (slotPower(ctx, side, slot) !== null) emit(ctx, { e: 'powerReady', side, slot });
  }
}

/**
 * Overcharge's target (A2.9.3): the less-reloaded equipped slot below 100% (ties: Home), or null when
 * every equipped slot is full (or none is equipped).
 */
function overchargeSlot(ctx: Ctx, side: Side): PowerSlot | null {
  const s = ctx.s.sides[side];
  let best: PowerSlot | null = null;
  for (const slot of POWER_SLOTS) {
    if (slotPower(ctx, side, slot) === null) continue;
    const v = s.powerPpm[slotIndex(slot)];
    if (v >= PPM) continue;
    if (best === null || v < s.powerPpm[slotIndex(best)]) best = slot;
  }
  return best;
}

/** One tick of reload for both slots of a side (A2.9.3); empty slots accrue at `emptyReloadMs`. */
function reloadSide(ctx: Ctx, side: Side): void {
  const s = ctx.s.sides[side];
  const rate = powerRateBp(ctx, side);
  for (const slot of POWER_SLOTS) {
    const i = slotIndex(slot);
    if (s.powerPpm[i] >= PPM) continue;
    const next = reloadStep(s.powerPpm[i], s.powerRem[i], rate, slotReloadTicks(ctx, side, slot));
    s.powerPpm[i] = next.ppm;
    s.powerRem[i] = next.rem;
    if (next.ppm >= PPM && slotPower(ctx, side, slot) !== null) emit(ctx, { e: 'powerReady', side, slot });
  }
}

/**
 * Passive gold per tick for a side (milli): base × phase × modifier, plus the Economy research income
 * (Granary, Market), which Overdrive never doubles (A18.5.4).
 */
export function passiveGoldPerTick(ctx: Ctx, side: Side): number {
  const e = ctx.econ;
  let base = Math.trunc((e.passiveGoldPerTick * ctx.mods.passiveGoldBp) / BP);
  if (ctx.s.phase === 'overdrive' || ctx.s.phase === 'siege') base = Math.trunc((base * e.overdrive.baseGoldBp) / BP);
  return base + ctx.s.sides[side].fx.incomePerTick;
}

export function economySystem(ctx: Ctx): void {
  const e = ctx.econ;
  const hot = ctx.s.phase === 'overdrive' || ctx.s.phase === 'siege';
  let xpTick = e.passiveXpPerTick;
  if (hot) xpTick = Math.trunc((xpTick * e.overdrive.xpBp) / BP);
  for (const side of [0, 1] as const) {
    const s = ctx.s.sides[side];
    addGold(ctx, side, passiveGoldPerTick(ctx, side), 'passive');
    addXp(ctx, side, xpTick, 'passive');
    // XP cap (the cap can drop at ageUp; every gain is clamped too).
    const cap = xpCapOf(ctx, side);
    if (s.xp > cap) s.xp = cap;
    // Overcharge (A2.4, A2.9.3): in the final age every 1,650 XP adds +25% to the less-reloaded equipped
    // slot (ties: Home); XP is consumed only while an equipped slot is below 100%.
    if (isFinalAge(ctx, side)) {
      let slot = overchargeSlot(ctx, side);
      while (s.xp >= e.overchargeXp && slot !== null) {
        s.xp -= e.overchargeXp;
        addPower(ctx, side, slot, e.overchargePpm);
        slot = overchargeSlot(ctx, side);
      }
    }
    // Reload (A2.9.3): Signal Fires and Power Hour add to the rate.
    reloadSide(ctx, side);
    if (ctx.tick % TICKS_PER_SECOND === 0) {
      if (s.passiveGoldAcc > 0) emit(ctx, { e: 'goldEarned', side, amount: s.passiveGoldAcc, reason: 'passive' });
      if (s.passiveXpAcc > 0) emit(ctx, { e: 'xpEarned', side, amount: s.passiveXpAcc, reason: 'passive' });
      s.passiveGoldAcc = 0;
      s.passiveXpAcc = 0;
    }
  }
}
