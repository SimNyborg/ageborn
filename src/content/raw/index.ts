/**
 * The raw Part A tables (DESIGN B4 `raw/`, C2/WP0 task 8), aggregated. Data only: the WP1 compiler
 * (`src/content/compile.ts`) and the WP2 compile shim read `raw` and convert units (B3, B4).
 *
 * After Phase 2 the tuning agent owns these numbers (C2 Phase 3). The golden replays use the frozen
 * copy in `tests/fixtures/content`, so tuning here never breaks them.
 */
import { ageScale, battle, damageMods, economy, formats } from './economy';
import { future } from './future';
import { gunpowder } from './gunpowder';
import { medieval } from './medieval';
import { modern } from './modern';
import { powers } from './powers';
import { stone } from './stone';
import type { RawContent } from './types';

export type { RawAgeScale, RawAgeTables, RawBattleRules, RawContent, RawDamageMods } from './types';
export { ageScale, battle, damageMods, economy, formats, future, gunpowder, medieval, modern, powers, stone };

export const raw: RawContent = {
  ages: [stone, medieval, gunpowder, modern, future],
  powers,
  economy,
  ageScale,
  formats,
  battle,
  damageMods,
};
