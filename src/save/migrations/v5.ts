/**
 * Save version 5: the War Path (DESIGN A18.7.10, ui-plan 6.4).
 *
 * - Adds `warPath`: stars and crowns per level, relics (v1.1), the chosen difficulty (Normal) and a
 *   loss streak for "Try Easy".
 * - A profile that already finished onboarding (tutorial step 4) played the training match and match
 *   2, which are War Path Stone levels 1 and 2 now: both count as beaten with one star, and `legacy`
 *   keeps every Home feature it could already open (A15.1: nothing earned is taken back). A profile
 *   past the training match only (step 2 or 3) gets Stone level 1.
 *
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

/** The onboarding step of a finished onboarding (`home`). */
const HOME_STEP = 4;
/** The step after capsule 1: the training match was won. */
const MATCH2_STEP = 2;

type Doc = Record<string, unknown> & { v: number; tutorial?: { step?: unknown } };

export const v5: SaveVersion = {
  v: 5,
  summary: 'The War Path: stars, crowns and difficulty per save (A18.7.10)',
  up: (input) => {
    const doc = input as Doc;
    const step = typeof doc.tutorial?.step === 'number' ? doc.tutorial.step : 0;
    const stars: Record<string, number> = {};
    const crowns: Record<string, number> = {};
    if (step >= MATCH2_STEP) {
      stars['wp.stone.l01'] = 1;
      crowns['wp.stone.l01'] = 2;
    }
    if (step >= HOME_STEP) {
      stars['wp.stone.l02'] = 1;
      crowns['wp.stone.l02'] = 2;
    }
    const warPath = { path: 'normal', stars, crowns, relics: [], difficulty: 'normal', lossStreak: 0, legacy: step >= HOME_STEP };
    return { ...doc, warPath, v: 5 };
  },
};
