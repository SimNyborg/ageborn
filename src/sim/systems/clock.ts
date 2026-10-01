/**
 * B3 step 2, clock and phase (DESIGN A2.10): Regulation → Overdrive → Siege, and Siege base decay
 * (0.5% of max HP per second, applied every 20 ticks). The phase only moves forward.
 *
 * Last Base Standing (A2.10.1): a format with Siege steps has no symmetric decay. Each step emits
 * `escalated` when it begins, and in a Crumble step the rope takes its rate from the side (or both
 * sides) whose half holds the fight, on the same 20-tick decay beat, through `damageBase`.
 */
import { BP, TICKS_PER_SECOND } from '@/core';
import { damageBase } from '../damage';
import { escalationNow, ropeTargets } from '../escalation';
import { emit } from '../events';
import type { Ctx } from '../state';

export function clockSystem(ctx: Ctx): void {
  const s = ctx.s;
  const t = ctx.tick;
  if (ctx.siegeTick !== null && t >= ctx.siegeTick && s.phase !== 'siege') {
    s.phase = 'siege';
    emit(ctx, { e: 'phaseChanged', phase: 'siege' });
  } else if (ctx.overdriveTick !== null && t >= ctx.overdriveTick && s.phase === 'regulation') {
    s.phase = 'overdrive';
    emit(ctx, { e: 'phaseChanged', phase: 'overdrive' });
  }
  if (s.phase !== 'siege' || ctx.siegeTick === null) return;
  const step = ctx.econ.siege.decayStepTicks;
  const beat = t > ctx.siegeTick && (t - ctx.siegeTick) % step === 0;
  if (ctx.escalation) {
    ctx.escalation.forEach((x, i) => {
      if (x.tick === t) emit(ctx, { e: 'escalated', step: i + 1 });
    });
    const now = escalationNow(ctx, t);
    if (!beat || now === null || now.crumbleBpPerSec <= 0) return;
    const hit = ropeTargets(ctx, t);
    for (const side of [0, 1] as const) {
      if (!hit[side]) continue;
      const b = s.sides[side];
      const loss = Math.trunc((b.baseMaxHp * now.crumbleBpPerSec * step) / (BP * TICKS_PER_SECOND));
      const amount = loss < b.baseHp ? loss : b.baseHp;
      if (amount <= 0) continue;
      damageBase(ctx, side, null, amount);
      emit(ctx, { e: 'crumbled', side, amount });
    }
    return;
  }
  if (beat) {
    for (const side of [0, 1] as const) {
      const b = s.sides[side];
      const loss = Math.trunc((b.baseMaxHp * ctx.econ.siege.decayBpPerStep) / BP);
      if (loss > 0) damageBase(ctx, side, null, loss);
    }
  }
}
