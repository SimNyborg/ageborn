/**
 * B3 step 4, Ascension timers (DESIGN A2.4 Evolve). At the end of the 2.5 s Ascension (`ageUp`):
 * age +1, XP −= threshold, base HP keeps its percentage then heals 5% of the new max (A2.2), Age Power
 * charge becomes min(charge, 50%), queued items convert to the new loadout's card of the same role group
 * (keeping progress; nothing charged or refunded), and 2 Vanguard Common Infantry spawn free at p = 20.
 */
import type { Side } from '@/contracts';
import { BP } from '@/core';
import { emit } from '../events';
import { xOf } from '../geometry';
import { ageOf, cardLevel, loadoutOf, thresholdOf, type Ctx } from '../state';
import { spawnUnit } from '../units';

export function ascendSystem(ctx: Ctx): void {
  for (const side of [0, 1] as const) {
    const s = ctx.s.sides[side];
    if (s.ascendUntil > 0 && ctx.tick >= s.ascendUntil) ageUp(ctx, side);
  }
}

function ageUp(ctx: Ctx, side: Side): void {
  const s = ctx.s.sides[side];
  const threshold = thresholdOf(ctx, side) ?? 0;
  s.ascendUntil = 0;
  s.ageIndex += 1;
  s.xp = s.xp > threshold ? s.xp - threshold : 0;
  const age = ageOf(ctx, side);
  // Base HP: keep the percentage, then heal 5% of the new max (A2.2).
  const oldMax = s.baseMaxHp;
  const newMax = ctx.rules.baseHp[age] * 100;
  let hp = oldMax > 0 ? Math.trunc((s.baseHp * newMax) / oldMax) : newMax;
  hp += Math.trunc((newMax * ctx.econ.evolveHealBp) / BP);
  s.baseMaxHp = newMax;
  s.baseHp = hp > newMax ? newMax : hp;
  if (s.powerPpm > ctx.econ.powerCarryCap) s.powerPpm = ctx.econ.powerCarryCap;
  emit(ctx, { e: 'ageUp', side, age });
  // Queue conversion (A2.4).
  const lo = loadoutOf(ctx, side);
  if (lo) {
    for (const item of s.queue) {
      const to = lo.units.find((c) => c !== null && ctx.rules.units[c]?.group === item.group);
      if (!to || to === item.card) continue;
      const from = item.card;
      const r = ctx.rules.units[to];
      item.card = to;
      if (r) item.total = r.trainTicks;
      emit(ctx, { e: 'queueConverted', side, from, to });
    }
  }
  // Vanguard (A2.4): summoned, no pop, no bounty.
  const vanguard = ctx.rules.vanguard[age];
  if (vanguard) {
    const level = cardLevel(ctx, side, vanguard);
    for (let i = 0; i < ctx.econ.vanguardCount; i += 1) {
      spawnUnit(ctx, side, vanguard, xOf(ctx.econ.spawnP, side), level, true);
    }
  }
}

/** Milli-XP helper for tests and the observation: XP as bp of the current threshold (final age: of Overcharge). */
export function xpBp(ctx: Ctx, side: Side): number {
  const t = thresholdOf(ctx, side) ?? ctx.econ.overchargeXp;
  if (t <= 0) return 0;
  return Math.trunc((ctx.s.sides[side].xp * BP) / t);
}
