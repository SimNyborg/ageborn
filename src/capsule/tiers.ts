/**
 * Tier order and the back-loaded climb (DESIGN A10 step 3).
 *
 * The number of climbs k equals the pre-rolled tier index above the start tier. Of the 4 strikes,
 * the first 4 − k never climb and the last k always climb, so a climb is never followed by a
 * non-climb. The final tier is the rolled result; the strikes only reveal it.
 */
import type { CapsuleReveal, CapsuleTier } from '@/contracts';

/** Clay → Aeon (DESIGN A6.4). */
export const TIER_ORDER: readonly CapsuleTier[] = ['clay', 'bronze', 'silver', 'jade', 'aeon'];

/** Hammer strikes per climbing capsule (A10 step 3). */
export const STRIKES = 4;

export function tierIndex(tier: CapsuleTier): number {
  const i = TIER_ORDER.indexOf(tier);
  if (i < 0) throw new Error(`Unknown capsule tier "${String(tier)}"`);
  return i;
}

export function tierAt(index: number): CapsuleTier {
  const t = TIER_ORDER[Math.max(0, Math.min(TIER_ORDER.length - 1, index))];
  return t ?? 'clay';
}

/** Climbs from `start` to the rolled `tier`; never negative. */
export function climbCount(start: CapsuleTier, tier: CapsuleTier): number {
  return Math.max(0, tierIndex(tier) - tierIndex(start));
}

/** The back-loaded strike pattern: 4 − k misses, then k climbs. */
export function strikePattern(k: number): boolean[] {
  const climbs = Math.max(0, Math.min(STRIKES, Math.trunc(k)));
  return Array.from({ length: STRIKES }, (_, i) => i >= STRIKES - climbs);
}

/** True when no climb is followed by a non-climb. */
export function isBackLoaded(strikes: readonly boolean[]): boolean {
  let climbed = false;
  for (const s of strikes) {
    if (s) climbed = true;
    else if (climbed) return false;
  }
  return true;
}

export interface ResolvedStrikes {
  /** The tier the drum shows before the first strike (never above the rolled tier). */
  startShown: CapsuleTier;
  /** Always the back-loaded pattern for the rolled climb count. */
  strikes: boolean[];
  climbs: number;
  /** Tier shown after each strike (index i = after strike i). */
  tiersAfter: CapsuleTier[];
  /** Mismatches between the reveal's own fields and its tiers (logged in dev, never shown). */
  issues: string[];
}

/**
 * Derives the strikes from the capsule's start tier and rolled tier, which are the source of truth.
 * The reveal's `climbs` and `strikeClimbs` are cross-checked: a mismatch is reported but can never
 * make the show fake a near miss or reveal another tier than the rolled one.
 */
export function resolveStrikes(reveal: Pick<CapsuleReveal, 'capsule' | 'climbs' | 'strikeClimbs'>): ResolvedStrikes {
  const { startTier, tier } = reveal.capsule;
  const issues: string[] = [];
  if (tierIndex(startTier) > tierIndex(tier)) {
    issues.push(`start tier ${startTier} is above the rolled tier ${tier}`);
  }
  const climbs = climbCount(startTier, tier);
  const strikes = strikePattern(climbs);
  if (reveal.climbs !== climbs) issues.push(`reveal.climbs is ${reveal.climbs}, tiers give ${climbs}`);
  const given = reveal.strikeClimbs;
  if (given.length !== STRIKES || given.some((s, i) => s !== strikes[i])) {
    issues.push(`reveal.strikeClimbs [${given.join(',')}] differs from the back-loaded pattern [${strikes.join(',')}]`);
  }
  const startIdx = Math.min(tierIndex(startTier), tierIndex(tier));
  const tiersAfter: CapsuleTier[] = [];
  let idx = startIdx;
  for (const s of strikes) {
    if (s) idx++;
    tiersAfter.push(tierAt(idx));
  }
  return { startShown: tierAt(startIdx), strikes, climbs, tiersAfter, issues };
}
