/**
 * Mode wiring (DESIGN A9 Mode select, A6.3 Ladder, A6.10 Conquest, A9 Skirmish, A9.1 Daily
 * Challenge, C2/WP11): every mode asks meta for an AI opponent (A6.8 matchmaking) and turns it into
 * a `MatchSetup`. The onboarding matches are built in `matchSetup.ts` instead.
 *
 * - Ladder: an optional format from the format picker (from Arena 2).
 * - Conquest: the chosen General of the board (from Arena 3), Full War.
 * - Skirmish: General or Echo, tier, format and "Standard levels" (after match 3).
 * - Daily Challenge: Standard War at the ladder tier with one symmetric modifier, disclosed on VS.
 */
import type { FormatId, SaveDoc, SkirmishOptions } from '@/contracts';
import { matchSetupFor, type MatchSetup } from './matchSetup';
import type { Services } from './services';

export type PlayMode = 'ladder' | 'conquest' | 'skirmish' | 'daily';

export type ModeRequest =
  | { mode: 'ladder'; format?: FormatId }
  | { mode: 'conquest'; general: string }
  | { mode: 'skirmish'; options: SkirmishOptions }
  | { mode: 'daily' };

export class ModeUnavailableError extends Error {
  constructor(what: string) {
    super(`mode unavailable: ${what}`);
    this.name = 'ModeUnavailableError';
  }
}

/** Picks the opponent through meta and builds the match (throws when meta is not wired yet). */
export function setupForMode(services: Pick<Services, 'meta' | 'content' | 'clock'>, save: SaveDoc, req: ModeRequest): MatchSetup {
  const meta = services.meta;
  if (!meta) throw new ModeUnavailableError('meta rules are not wired (Phase 2)');
  const o =
    req.mode === 'ladder'
      ? req.format
        ? { format: req.format }
        : {}
      : req.mode === 'conquest'
        ? { conquestGeneral: req.general }
        : req.mode === 'skirmish'
          ? { skirmish: req.options, format: req.options.format }
          : {};
  const opponent = meta.pickOpponent(save, req.mode, services.content, services.clock, o);
  if (!opponent.isAI) throw new Error('every v1 opponent must be an AI (A7.1)');
  return matchSetupFor(save, opponent, req.mode, services.content);
}
