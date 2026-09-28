/**
 * B3 step 2, clock and phase (DESIGN A2.10): Regulation → Overdrive → Siege, and Siege base decay
 * (0.5% of max HP per second, applied every 20 ticks). The phase only moves forward.
 */
import { BP } from '@/core';
import { damageBase } from '../damage';
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
  if (s.phase === 'siege' && ctx.siegeTick !== null) {
    const step = ctx.econ.siege.decayStepTicks;
    if (t > ctx.siegeTick && (t - ctx.siegeTick) % step === 0) {
      for (const side of [0, 1] as const) {
        const b = s.sides[side];
        const loss = Math.trunc((b.baseMaxHp * ctx.econ.siege.decayBpPerStep) / BP);
        if (loss > 0) damageBase(ctx, side, null, loss);
      }
    }
  }
}
