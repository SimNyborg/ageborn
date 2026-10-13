/**
 * Save version 15: the NEW pip on collection items (PLAN 2a "NEW until seen"; round 2 of the Customize
 * build). Additive and idempotent; nothing is taken away.
 *
 * - `cosmetics.fresh` joins the cosmetics: the collection keys that came from a capsule, a crate or an
 *   earned reward and have not been shown in Customize yet. It starts empty, so everything a player
 *   owned before this version counts as seen and no old item suddenly says NEW.
 * - A doc that already has a list (a re-run) keeps it; anything else in that place becomes `[]`.
 * - A missing `cosmetics` is left to the schema (v3 creates it; this step never invents one).
 *
 * Never edit this step; a later change needs a new version.
 */
import type { SaveVersion } from './types';

type Doc = Record<string, unknown> & { v: number; cosmetics?: Record<string, unknown> | null };

const isRecord = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);

export const v15: SaveVersion = {
  v: 15,
  summary: 'NEW pip: cosmetics.fresh ([] = every item owned so far counts as seen)',
  up: (input) => {
    const doc = input as Doc;
    const cos = doc.cosmetics;
    if (isRecord(cos)) {
      const had = cos['fresh'];
      const fresh = Array.isArray(had) ? had.filter((k): k is string => typeof k === 'string') : [];
      doc.cosmetics = { ...cos, fresh };
    }
    return { ...doc, v: 15 };
  },
};
