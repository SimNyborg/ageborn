/**
 * B3 step 16, win check (DESIGN A2.10): a destroyed base loses (both on one tick: draw); a retreat is a
 * loss; a War Path victory rule (A18.7.3: the marked turret fell, or the base held out to the set time)
 * wins; at the Final Bell the higher base HP% wins and a gap ≤ 0.5% (50 bp) is a draw.
 */
import type { MatchOutcome, Side } from '@/contracts';
import { emit } from '../events';
import { baseHpBp, type Ctx } from '../state';

export function winSystem(ctx: Ctx): void {
  const s = ctx.s;
  if (s.outcome) return;
  const [a, b] = s.sides;
  const bp: [number, number] = [baseHpBp(a), baseHpBp(b)];
  let winner: Side | null = null;
  let reason: MatchOutcome['reason'] | null = null;
  const dead0 = a.baseHp <= 0;
  const dead1 = b.baseHp <= 0;
  if (dead0 || dead1) {
    reason = dead0 && dead1 ? 'bothDestroyed' : 'baseDestroyed';
    winner = dead0 && dead1 ? null : dead0 ? 1 : 0;
  } else if (a.retreated || b.retreated) {
    reason = 'retreat';
    winner = a.retreated && b.retreated ? null : a.retreated ? 1 : 0;
  } else if (ctx.targetSide !== null && s.sides[ctx.targetSide === 0 ? 1 : 0].markHp === 0) {
    // A18.7.3 "Take the tower": the marked turret fell.
    reason = 'objective';
    winner = ctx.targetSide;
  } else if (ctx.surviveTick !== null && ctx.tick >= ctx.surviveTick) {
    // A18.7.3 "Hold out": the side's base still stands at the set time.
    reason = 'objective';
    winner = ctx.surviveSide;
  } else if (ctx.finalBellTick !== null && ctx.tick >= ctx.finalBellTick) {
    reason = 'finalBell';
    const gap = bp[0] - bp[1];
    winner = Math.abs(gap) <= ctx.econ.drawGapBp ? null : gap > 0 ? 0 : 1;
  }
  if (reason === null) return;
  const outcome: MatchOutcome = { winner, reason, tick: ctx.tick, baseHpBp: bp };
  s.outcome = outcome;
  s.phase = 'ended';
  emit(ctx, { e: 'matchEnded', result: outcome });
}
