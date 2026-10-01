/**
 * Last Base Standing (DESIGN A2.10.1): the Siege steps of a war with no Final Bell, and the Crumble rope.
 *
 * The current step is a pure function of the tick and the format (no hashed state): step k is reached
 * once `tick ≥ escalation[k − 1].tick`, so step 0 is before Siege I. A format with a Final Bell has no
 * steps and nothing here applies, so every timed format replays bit-identically.
 *
 * The rope (Crumble steps): every Siege decay step (20 ticks), each side's front is the own-frame
 * progress of its most advanced live ground unit; forts, levies, summons (Vanguard, drops, riders) and
 * air units do not count, and a side with none has front 0. The side whose front is more than the dead
 * band (40 lu) behind the other's crumbles; within the band, or with both sides empty, both crumble.
 */
import type { Side } from '@/contracts';
import { pOf } from './geometry';
import type { EscalationRt } from './rules';
import type { Ctx } from './state';

/** The step reached at `tick` (0 before Siege I, 1 = Siege I, ...); 0 in a format without steps. */
export function escalationStep(ctx: Ctx, tick: number = ctx.tick): number {
  const steps = ctx.escalation;
  if (!steps) return 0;
  let k = 0;
  while (k < steps.length && tick >= (steps[k] as EscalationRt).tick) k += 1;
  return k;
}

/** The step in force at `tick`, or null before Siege I and in a format without steps. */
export function escalationNow(ctx: Ctx, tick: number = ctx.tick): EscalationRt | null {
  const k = escalationStep(ctx, tick);
  return k > 0 ? ((ctx.escalation as readonly EscalationRt[])[k - 1] as EscalationRt) : null;
}

/** True while a Crumble step is in force (the rope runs and evolving does not heal). */
export function crumbleActive(ctx: Ctx, tick: number = ctx.tick): boolean {
  const s = escalationNow(ctx, tick);
  return s !== null && s.crumbleBpPerSec > 0;
}

/** A side's front for the rope: own-frame p (milli-lu) of its most advanced live ground unit, 0 when none. */
export function ropeFront(ctx: Ctx, side: Side): number {
  let best = 0;
  for (const u of ctx.s.units) {
    if (u.side !== side || u.hp <= 0 || u.mode === 'dying' || u.air || u.summoned || u.fort) continue;
    if (ctx.rules.unitList[u.ci]?.levy) continue;
    const p = pOf(u.x, side);
    if (p > best) best = p;
  }
  return best;
}

/** Which sides the rope takes now, by Side (both false outside a Crumble step). */
export function ropeTargets(ctx: Ctx, tick: number = ctx.tick): [boolean, boolean] {
  if (!crumbleActive(ctx, tick)) return [false, false];
  const f0 = ropeFront(ctx, 0);
  const f1 = ropeFront(ctx, 1);
  const band = ctx.econ.siege.ropeDeadBand;
  return [f0 <= f1 + band, f1 <= f0 + band];
}
