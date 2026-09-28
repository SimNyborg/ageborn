/**
 * Save version 1: the first release format, exactly the `SaveDoc` of DESIGN B15 (`contracts/save.ts`).
 *
 * Version 1 is the base of the chain, so it has no `up` step. Its frozen fixture is
 * `src/save/test/fixtures/v1.json`; it must load in every later build (DESIGN B13 Save).
 */
import type { SaveVersion } from './types';

export const v1: SaveVersion = {
  v: 1,
  summary: 'First release format (DESIGN B15 SaveDoc).',
};
