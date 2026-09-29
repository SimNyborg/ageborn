// FROZEN FIXTURE (DESIGN C2/WP0 task 8): a copy of src/content/raw/index.ts taken in Phase 0 (2026-09-27).
// Golden replays compile this content, so balance tuning in src/content/raw never breaks them.
// Never edit it. To re-baseline, copy src/content/raw again and re-record every golden replay.

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
import { research } from './research';
import { stone } from './stone';
import type { RawContent } from './types';

export type { RawAgeScale, RawAgeTables, RawBattleRules, RawContent, RawDamageMods } from './types';
export { ageScale, battle, damageMods, economy, formats, future, gunpowder, medieval, modern, powers, research, stone };

export const raw: RawContent = {
  ages: [stone, medieval, gunpowder, modern, future],
  powers,
  economy,
  ageScale,
  formats,
  battle,
  damageMods,
  research,
};
