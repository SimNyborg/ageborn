/**
 * The raw Part A tables (DESIGN B4 `raw/`, C2/WP0 task 8), aggregated. Data only: the WP1 compiler
 * (`src/content/compile.ts`) and the WP2 compile shim read `raw` and convert units (B3, B4).
 *
 * After Phase 2 the tuning agent owns these numbers (C2 Phase 3). The golden replays use the frozen
 * copy in `tests/fixtures/content`, so tuning here never breaks them.
 */
import { bronze, bronzePowers } from './bronze';
import { cosmic, cosmicPowers } from './cosmic';
import { ageScale, battle, damageMods, economy, formats, windowFormatId, WINDOW_CLOCKS, WINDOW_XP } from './economy';
import { future } from './future';
import { gunpowder } from './gunpowder';
import { industrial, industrialPowers } from './industrial';
import { medieval } from './medieval';
import { modern, modernPowers } from './modern';
import { powers } from './powers';
import { research } from './research';
import { stone } from './stone';
import type { RawContent } from './types';

export type { RawAgeScale, RawAgeTables, RawBattleRules, RawContent, RawDamageMods } from './types';
export {
  ageScale,
  battle,
  bronze,
  bronzePowers,
  cosmic,
  cosmicPowers,
  damageMods,
  economy,
  formats,
  windowFormatId,
  WINDOW_CLOCKS,
  WINDOW_XP,
  future,
  gunpowder,
  industrial,
  industrialPowers,
  modernPowers,
  medieval,
  modern,
  powers,
  research,
  stone,
};

export const raw: RawContent = {
  ages: [stone, bronze, medieval, gunpowder, industrial, modern, future, cosmic],
  // A5.7 powers, then the A17.11 powers of the new ages (the compiler sorts them by age and slot)
  powers: [...powers, ...bronzePowers, ...industrialPowers, ...modernPowers, ...cosmicPowers],
  economy,
  ageScale,
  formats,
  battle,
  damageMods,
  research,
};
