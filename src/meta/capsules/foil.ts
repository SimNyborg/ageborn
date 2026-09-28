/**
 * Foils (DESIGN A6.4 step 5, A5.8): each stack rolls a foil on a 10,000-bp scale: Holo 25 bp,
 * Silver foil 100 bp, Bronze foil 400 bp, else none. A foil unlocks for that card if it beats the
 * one owned. Foils are cosmetic only.
 */
import type { Foil } from '@/contracts';
import type { Rarities } from '@/content';
import { randInt, type Sfc32State } from '@/core';

/** The foil scale in bp. */
export const FOIL_SCALE_BP = 10000;

/** Rolls one stack's foil (one draw from `rng`). */
export function rollFoil(rng: Sfc32State, rarities: Rarities): Foil {
  const r = randInt(rng, FOIL_SCALE_BP);
  let acc = 0;
  for (const foil of rarities.foilOrder) {
    if (foil === 'none') continue;
    acc += rarities.foils[foil].rollBp;
    if (r < acc) return foil;
  }
  return 'none';
}

/** The better of two foils by rank (Holo > Silver > Bronze > none). */
export function betterFoil(a: Foil, b: Foil, rarities: Rarities): Foil {
  return rarities.foils[b].rank > rarities.foils[a].rank ? b : a;
}
