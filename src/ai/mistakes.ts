/**
 * Plausible human errors (DESIGN A7.2 "Choice"): with probability (1 − mistake rate) the bot takes its
 * best action; otherwise it makes one of these mistakes. Each needs a situation where it can happen;
 * "float gold" (doing nothing this decision) always can. A bot never makes "computer-stupid" moves
 * such as selling every turret: every mistake is an action a real player might take.
 */
import { pick, type Sfc32State } from '@/core';
import type { BotAction } from './actions';

export type MistakeKind = 'overCommit' | 'evolveBeforePush' | 'powerOnFew' | 'leaveMountEmpty' | 'floatGold' | 'forgetAntiAir';

export const MISTAKE_KINDS: readonly MistakeKind[] = ['overCommit', 'evolveBeforePush', 'powerOnFew', 'leaveMountEmpty', 'floatGold', 'forgetAntiAir'];

/** The alternative action each mistake would take in this decision, or undefined when it cannot happen. */
export interface MistakeOptions {
  /** Charge into turret range: switch Hold to Charge, or train the best unit ignoring the push gate. */
  overCommit?: BotAction;
  /** Evolve although enemies are at the gate. */
  evolveBeforePush?: BotAction;
  /** Fire the power at a zone holding only a unit or two. */
  powerOnFew?: BotAction;
  /** Skip the turret the bot wanted: its best non-turret action instead (null = nothing). */
  leaveMountEmpty?: BotAction | null;
  /** Train the best unit that cannot hit the enemy air units. */
  forgetAntiAir?: BotAction;
}

export interface Mistake {
  kind: MistakeKind;
  action: BotAction | null;
}

/** Picks one possible mistake uniformly (seeded). "Float gold" is always possible. */
export function pickMistake(rng: Sfc32State, o: MistakeOptions): Mistake {
  const options: Mistake[] = [{ kind: 'floatGold', action: null }];
  for (const kind of MISTAKE_KINDS) {
    if (kind === 'floatGold') continue;
    const a = o[kind];
    if (a !== undefined) options.push({ kind, action: a });
  }
  return pick(rng, options);
}
