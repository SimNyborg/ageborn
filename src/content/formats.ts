/**
 * Match formats (DESIGN A2.10). The timers live in `raw/economy.ts` (`formats`), where WP0 encoded
 * them for the sim shim; this module fixes the display order and which modes use each format.
 * Which ladder formats an arena offers is in `arenas.ts`.
 */
import type { FormatId } from '@/contracts/ids';

/** Tutorial, then shortest to longest. */
export const FORMAT_ORDER: readonly FormatId[] = ['tutorial', 'short', 'standard', 'full'];

/** Where each format is used (A2.10 "Used in"; A6.10 Conquest; A9.1 Daily Challenge). */
export const FORMAT_MODES: Record<FormatId, readonly ('tutorial' | 'ladder' | 'skirmish' | 'daily' | 'conquest')[]> = {
  tutorial: ['tutorial'],
  short: ['ladder', 'skirmish'],
  // A17.18 owner decision: Conquest plays Standard War
  standard: ['ladder', 'daily', 'conquest', 'skirmish'],
  full: ['ladder', 'skirmish'],
};
