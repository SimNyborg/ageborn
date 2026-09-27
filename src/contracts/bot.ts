/**
 * AI General contracts (DESIGN B15 `bot.ts`, A7, B10). Implemented by WP3 in `src/ai`.
 *
 * Bots issue ordinary commands through the same queue as the player and see only a delayed
 * `Observation` (DESIGN A7.1, B10). Bots are always labeled AI (A7.1).
 */
import type { Command } from './commands';
import type { CompiledContent } from './content';
import type { Side } from './ids';
import type { Observation } from './observation';

/** A General at a tier (DESIGN A7.3 tiers, A7.4 generals, A7.2 utility weights). */
export interface BotProfile {
  generalId: string;
  tier: number;
  mistakeBonusBp: number;
  weights: { aggr: number; turret: number; economy: number; greed: number; patience: number; legendary: number; hold: number };
  openings: string[];
}

/**
 * A bot. The session stamps tick and seq on returned commands, and feeds `onTick` the observation
 * from `snapshotDelayTicks` ago (DESIGN B6, B10).
 */
export interface BotController {
  readonly snapshotDelayTicks: number;
  onTick(obs: Observation): Command[];
}

/** Signature of `createBot` in `src/ai/createBot.ts` (WP3, DESIGN B10). */
export type CreateBot = (profile: BotProfile, side: Side, seed: number, content: CompiledContent) => BotController;
