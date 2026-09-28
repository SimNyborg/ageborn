/**
 * Pity and protection counters (DESIGN A6.5). All counters are visible on every capsule screen.
 *
 * - Epic pity: at least one Epic stack every 10 capsules.
 * - Legendary pity: with n = the capsule's count since the last Legendary (this one included), no
 *   bonus for n ≤ 25, a (n − 25) × 5% chance for 26 ≤ n ≤ 39, a sure Legendary at n = 40.
 * - New-card protection: at least one unowned card every 5 capsules while the pool has unowned cards.
 * - Wardrobe pity: Epic or better at least every 5 crates; Legendary at least every 25.
 *
 * **When counters move.** `SaveDoc.pity` counts *opened* capsules since the last hit (A6.5: "count
 * every opened capsule"); `openCapsule` advances it and reports it before and after. Contents are
 * rolled earlier, at grant time (A6.4), when other capsules may still be unopened. The roll therefore
 * uses a conservative n: the opened count, plus every pending counted capsule as if it were a miss,
 * plus this one. With nothing pending (the usual case) that is exactly the A6.5 count; with capsules
 * pending, pity triggers no later than the rule needs in *any* order the player opens them, so a
 * "guaranteed within N" line on screen is always true. Wardrobe Crates work the same way.
 */
import type { SaveDoc } from '@/contracts';
import type { CapsuleTables, Content } from '@/content';

export type PityCounters = SaveDoc['pity'];

/** The n values (1-based, this capsule included) a capsule roll uses. */
export interface PityDraw {
  epicN: number;
  legendaryN: number;
  newCardN: number;
}

export function zeroPity(): PityCounters {
  return { sinceEpic: 0, sinceLegendary: 0, sinceNewCard: 0, opened: 0, wardrobeSinceEpic: 0, wardrobeSinceLegendary: 0 };
}

/** Pending capsules whose kind counts toward pity (every kind except Age Unlock, A6.5). */
export function countedPending(s: SaveDoc, t: Content): number {
  let n = 0;
  for (const p of s.capsules.pending) if (t.capsules.kinds[p.kind]?.countsForPity !== false) n += 1;
  return n;
}

/** The n values for the next rolled capsule (see the module note on pending capsules). */
export function pityDraw(s: SaveDoc, t: Content): PityDraw {
  const ahead = countedPending(s, t) + 1;
  return {
    epicN: s.pity.sinceEpic + ahead,
    legendaryN: s.pity.sinceLegendary + ahead,
    newCardN: s.pity.sinceNewCard + ahead,
  };
}

/** Legendary pity chance in bp for a capsule that is number `n` since the last Legendary (A6.5). */
export function legendaryPityBp(caps: CapsuleTables, n: number): number {
  const p = caps.pity;
  if (n >= p.legendaryGuaranteeAt) return 10000;
  if (n <= p.legendaryFreeUntil) return 0;
  return Math.min(10000, (n - p.legendaryFreeUntil) * p.legendaryStepBp);
}

/** What an opened capsule did to the counters. */
export interface OpenedFacts {
  hasEpic: boolean;
  hasLegendary: boolean;
  /** A card that was unowned when revealed. */
  gotNew: boolean;
  /** The arena's drop pool had an unowned card before this capsule. */
  unownedInPool: boolean;
}

/** Counters after opening one counted capsule. */
export function advancePity(p: PityCounters, f: OpenedFacts): PityCounters {
  return {
    ...p,
    opened: p.opened + 1,
    sinceEpic: f.hasEpic ? 0 : p.sinceEpic + 1,
    sinceLegendary: f.hasLegendary ? 0 : p.sinceLegendary + 1,
    // "while unowned cards exist in the pool": with none left the run ends (nothing to protect).
    sinceNewCard: f.gotNew || !f.unownedInPool ? 0 : p.sinceNewCard + 1,
  };
}

/** The wardrobe n values for the next rolled crate (conservative over pending crates). */
export function wardrobeDraw(s: SaveDoc): { epicN: number; legendaryN: number } {
  const ahead = s.capsules.wardrobe.length + 1;
  return { epicN: s.pity.wardrobeSinceEpic + ahead, legendaryN: s.pity.wardrobeSinceLegendary + ahead };
}

/** Counters after opening one Wardrobe Crate of `rarity`. */
export function advanceWardrobePity(p: PityCounters, rarity: 'rare' | 'epic' | 'legendary'): PityCounters {
  return {
    ...p,
    wardrobeSinceEpic: rarity === 'rare' ? p.wardrobeSinceEpic + 1 : 0,
    wardrobeSinceLegendary: rarity === 'legendary' ? 0 : p.wardrobeSinceLegendary + 1,
  };
}
