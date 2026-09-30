/**
 * Plausible human errors (DESIGN A7.2 "Choice"): with probability (1 − mistake rate) the bot takes its
 * best action; otherwise it makes one of these mistakes. Each needs a situation where it can happen;
 * the bot picks uniformly among the mistakes the situation allows, and "float gold" (doing nothing this
 * decision) when none fits. A bot never makes "computer-stupid" moves such as selling every turret:
 * every mistake is an action a real player might take.
 */
import { pick, type Sfc32State } from '@/core';
import type { BotAction } from './actions';

export type MistakeKind = 'overCommit' | 'evolveBeforePush' | 'powerOnFew' | 'leaveMountEmpty' | 'floatGold' | 'forgetAntiAir' | 'fortInFrontOfHeavies';

export const MISTAKE_KINDS: readonly MistakeKind[] = ['overCommit', 'evolveBeforePush', 'powerOnFew', 'leaveMountEmpty', 'floatGold', 'forgetAntiAir', 'fortInFrontOfHeavies'];

/** The alternative action each mistake would take in this decision, or undefined when it cannot happen. */
export interface MistakeOptions {
  /** Charge into turret range: switch Hold to Charge, or keep training into a failed push gate. */
  overCommit?: BotAction;
  /** Evolve although enemies are at the gate. */
  evolveBeforePush?: BotAction;
  /** Fire the power at a zone holding only a unit or two. */
  powerOnFew?: BotAction;
  /** Skip the turret the bot wanted: its best non-turret action instead (null = nothing). */
  leaveMountEmpty?: BotAction | null;
  /** Train the best unit that cannot hit the enemy air units. */
  forgetAntiAir?: BotAction;
  /** Place a wall (or tower, or trap) in front of a wave of Heavies, which break it ×2 (A16.14.7). */
  fortInFrontOfHeavies?: BotAction;
}

export interface Mistake {
  kind: MistakeKind;
  action: BotAction | null;
}

/** Picks one of the mistakes the situation allows (seeded); "float gold" when none fits. */
export function pickMistake(rng: Sfc32State, o: MistakeOptions): Mistake {
  const options: Mistake[] = [];
  for (const kind of MISTAKE_KINDS) {
    const a = o[kind as Exclude<MistakeKind, 'floatGold'>];
    if (kind !== 'floatGold' && a !== undefined) options.push({ kind, action: a });
  }
  return options.length > 0 ? pick(rng, options) : { kind: 'floatGold', action: null };
}
