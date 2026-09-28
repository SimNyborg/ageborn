/**
 * B3 step 2, clock and phase (DESIGN A2.10): Regulation → Overdrive → Siege, and Siege base decay
 * (0.5% of max HP per second, applied every 20 ticks). The phase only moves forward.
 *
 * "The rope" (A16.4 lever L6, `economy.siege.ropeDecayBpPerSec`): when set, the decay step hits only
 * the side losing the contact point, the midpoint of the two ground fronts (a side without ground units
 * counts its own gate as its front). A contact point exactly at mid-lane falls back to the symmetric
 * decay, so a dead-even lane still decays both bases.
 */
import type { Side } from '@/contracts';
import { BP } from '@/core';
import { damageBase } from '../damage';
import { emit } from '../events';
import { pOf } from '../geometry';
import { LANE, type Ctx } from '../state';
import { alive } from '../units';

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
    const siege = ctx.econ.siege;
    const step = siege.decayStepTicks;
    if (t > ctx.siegeTick && (t - ctx.siegeTick) % step === 0) {
      const loser = siege.ropeBpPerStep > 0 ? ropeLoser(ctx) : null;
      for (const side of [0, 1] as const) {
        const b = s.sides[side];
        const bp = loser === null ? siege.decayBpPerStep : loser === side ? siege.ropeBpPerStep : 0;
        const loss = Math.trunc((b.baseMaxHp * bp) / BP);
        if (loss > 0) damageBase(ctx, side, null, loss);
      }
    }
  }
}

/** The side whose half holds the contact point, or null when it sits exactly at mid-lane. */
function ropeLoser(ctx: Ctx): Side | null {
  const front: [number, number] = [0, 0];
  for (const u of ctx.s.units) {
    if (u.air || !alive(u)) continue;
    const p = pOf(u.x, u.side);
    if (p > front[u.side]) front[u.side] = p;
  }
  // Contact point in side 0's frame, doubled to stay in integers: front0 + (L − front1).
  const twice = front[0] + (LANE - front[1]);
  if (twice < LANE) return 0;
  if (twice > LANE) return 1;
  return null;
}
