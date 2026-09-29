/**
 * Tier order and the back-loaded climb (DESIGN A10 step 3).
 *
 * The 4 main strikes climb up to the summit tier (Gold): k_main = min(tier, summit) − start, clamped
 * to 0..4. Of the 4 strikes, the first 4 − k_main never climb and the last k_main always climb, so a
 * climb is never followed by a non-climb. Each tier above Gold is one summit strike that always
 * climbs (Platinum 1, Aeon 2). The final tier is the rolled result; the strikes only reveal it.
 *
 * TIER_ORDER and SUMMIT_ABOVE mirror the content (`capsules.tierOrder`, `capsules.summitAbove`), which
 * this layer cannot import (B2); `test/metaReveals.test.ts` checks they agree with meta.
 */
import type { CapsuleReveal, CapsuleTier } from '@/contracts';

/** Clay → Aeon (DESIGN A6.4). */
export const TIER_ORDER: readonly CapsuleTier[] = ['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon'];

/** The highest tier the main strikes reach; each tier above it is a summit strike (A10). */
export const SUMMIT_ABOVE: CapsuleTier = 'gold';

/**
 * Legendary crests per tier: one per guaranteed Legendary (A10; Gold 1, Platinum 2, Aeon 3). A mirror
 * of `content.capsules.tiers[t].guaranteed` (this layer cannot import content, B2), checked against
 * it in `test/metaReveals.test.ts`, so the drum never keys a crest on a tier name.
 */
export const LEGENDARY_CRESTS: Readonly<Record<CapsuleTier, number>> = { clay: 0, bronze: 0, silver: 0, jade: 0, gold: 1, platinum: 2, aeon: 3 };

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

/** Crests a drum of this tier carries (0 below Gold). */
export function crestCount(tier: CapsuleTier): number {
  return LEGENDARY_CRESTS[tier];
}

/** Summit gems a drum of this tier carries: one per tier above SUMMIT_ABOVE (Platinum 1, Aeon 2). */
export function summitGemCount(tier: CapsuleTier): number {
  return Math.max(0, tierIndex(tier) - tierIndex(SUMMIT_ABOVE));
}

/** The carved rings a drum of this tier lights: 1 (Clay) to 5 (Gold and above). */
export function litRingCount(tier: CapsuleTier): number {
  return Math.min(tierIndex(tier), tierIndex(SUMMIT_ABOVE)) + 1;
}

/** True for the tiers reached by a summit strike (above SUMMIT_ABOVE). */
export function isSummitTier(tier: CapsuleTier): boolean {
  return tierIndex(tier) > tierIndex(SUMMIT_ABOVE);
}

/** Climbs from `start` to the rolled `tier` (main plus summit strikes); never negative. */
export function climbCount(start: CapsuleTier, tier: CapsuleTier): number {
  const { main, summit } = strikeSplit(start, tier);
  return main + summit;
}

/** The climbs of the 4 main strikes (up to SUMMIT_ABOVE, 0..4) and the summit strikes above it. */
export function strikeSplit(start: CapsuleTier, tier: CapsuleTier): { main: number; summit: number } {
  const s = tierIndex(start);
  const f = tierIndex(tier);
  const top = tierIndex(SUMMIT_ABOVE);
  return { main: Math.max(0, Math.min(STRIKES, Math.min(f, top) - s)), summit: Math.max(0, f - Math.max(top, s)) };
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
  /** Always the back-loaded pattern of the 4 main strikes for the rolled climb count. */
  strikes: boolean[];
  /** Main plus summit climbs. */
  climbs: number;
  /** Tier shown after each main strike (index i = after strike i). */
  tiersAfter: CapsuleTier[];
  /** Tier reached by each summit strike (Platinum, then Aeon); empty at Gold or below. */
  summitTiers: CapsuleTier[];
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
  const split = strikeSplit(startTier, tier);
  const climbs = split.main + split.summit;
  const strikes = strikePattern(split.main);
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
  const summitTiers: CapsuleTier[] = [];
  for (let i = 0; i < split.summit; i++) summitTiers.push(tierAt(++idx));
  return { startShown: tierAt(startIdx), strikes, climbs, tiersAfter, summitTiers, issues };
}
