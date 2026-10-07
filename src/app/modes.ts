/**
 * Mode wiring (DESIGN A9 Mode select, A6.3 Ladder, A6.10 Conquest, A9 Skirmish, A9.1 Daily
 * Challenge, C2/WP11): every mode asks meta for an AI opponent (A6.8 matchmaking) and turns it into
 * a `MatchSetup`. The onboarding matches are built in `matchSetup.ts` instead.
 *
 * - Ladder: an optional format from the format picker (every length from Arena 1, owner decision 2026-10-03).
 * - Conquest: the chosen General of the board (from Arena 3), Full War.
 * - Skirmish: General or Echo, tier, format and "Standard levels" (after match 3). With Standard
 *   levels every card on both sides plays at L7 (A6.8): meta sets the bot's, the setup the player's.
 * - Daily Challenge: Standard War at the ladder tier with one symmetric modifier, disclosed on VS.
 *
 * The opponent's name goes through i18n (named Generals come as string keys) before it becomes the
 * HUD nameplate.
 */
import type { FormatId, I18n, SaveDoc, SkirmishOptions } from '@/contracts';
import { matchSetupFor, type MatchSetup } from './matchSetup';
import { displayName } from './names';
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

export type ModeServices = Pick<Services, 'meta' | 'content' | 'clock'> & { i18n?: Pick<I18n, 't' | 'has'> };

/** Picks the opponent through meta and builds the match (throws when meta is not wired yet). */
export function setupForMode(services: ModeServices, save: SaveDoc, req: ModeRequest): MatchSetup {
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
  const i18n = services.i18n;
  return matchSetupFor(save, opponent, req.mode, services.content, {
    ...(i18n ? { opponentLabel: displayName(opponent.displayName, i18n) } : {}),
    standardLevels: req.mode === 'skirmish' && req.options.standardLevels,
  });
}
