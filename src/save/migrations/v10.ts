/**
 * Save version 10: the Sundial (DESIGN A6.3, A15.4; owner request 2026-09-29 "a free capsule every 5
 * hours", built 2026-09-30). The Sundial replaces capsule charges and the Supply allowance.
 *
 * - No shape change; only meanings change. `capsules.charges` is now the number of ready Sundial
 *   capsules (maximum 34) and `chargesUpdatedAt` the start of the current 5 h period. Banked charges
 *   carry over one-for-one as ready capsules. `capsules.dailyBank` is the Supply allowance left from
 *   before 2026-09-30; it never grows again. Kind `win` shows as "Sundial Capsule".
 * - `flags['notice.sundial']` (the one-time "The Sundial" card in the Capsules tab) is set for a save
 *   that has played a match (`matchesPlayed > 0`). A new save never gets it.
 * - A save that was full under the old cap (28 or more charges) gets `flags['sundial.restart']`: the
 *   old rule never moved `chargesUpdatedAt` while full, so the new rule would count every 5 h since the
 *   bank filled and turn 28 into up to 34 at the first tick. Meta's first timer tick instead restarts
 *   the period at that moment and clears the flag (a migration has no clock), so full saves carry over
 *   one-for-one too.
 * - A Clay meter left at 2 pips (the meter now needs 2) turns into its Clay capsule at the first timer
 *   tick after load (meta), not here: rolling a capsule needs the content.
 * - Additive and idempotent: a re-run changes nothing. A closed notice is never set again, because
 *   the step only runs once per save (from v9).
 *
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

/** The one-time Capsules tab card (meta reads the same key: `META_FLAGS.sundialNotice`). */
export const SUNDIAL_NOTICE_FLAG = 'notice.sundial';

/** Restart the Sundial's period at the first tick (meta reads the same key: `META_FLAGS.sundialRestart`). */
export const SUNDIAL_RESTART_FLAG = 'sundial.restart';

/** The capsule charge bank's cap before the Sundial (A15.4 until 2026-09-30). */
const OLD_CHARGES_MAX = 28;

type Doc = Record<string, unknown> & { v: number; matchesPlayed?: unknown; flags?: unknown; capsules?: unknown };

function flagsOf(doc: Doc): Record<string, unknown> {
  return doc.flags !== null && typeof doc.flags === 'object' && !Array.isArray(doc.flags) ? (doc.flags as Record<string, unknown>) : {};
}

export const v10: SaveVersion = {
  v: 10,
  summary: 'The Sundial (A6.3): charges become ready Sundial capsules; a one-time notice for saves that have played',
  up: (input) => {
    const doc = input as Doc;
    const played = typeof doc.matchesPlayed === 'number' && doc.matchesPlayed > 0;
    if (played) doc.flags = { ...flagsOf(doc), [SUNDIAL_NOTICE_FLAG]: true };
    const caps = doc.capsules !== null && typeof doc.capsules === 'object' ? (doc.capsules as { charges?: unknown }) : null;
    if (caps && typeof caps.charges === 'number' && caps.charges >= OLD_CHARGES_MAX) doc.flags = { ...flagsOf(doc), [SUNDIAL_RESTART_FLAG]: true };
    return { ...doc, v: 10 };
  },
};
