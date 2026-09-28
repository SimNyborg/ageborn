/**
 * The Supply Capsule (DESIGN A15.4, A6.3, A6.4).
 *
 * - The allowance (`capsules.dailyBank`) gains 1 at each local 04:00 once it is unlocked, up to 7
 *   (`accrueDaily` in `daily.ts` adds it; the cap comes from {@link supplyRules}).
 * - Every 3rd finished match (`matchesPlayed` = 3, 6, 9 …, any mode but the tutorial, a Retreat
 *   included) turns one banked allowance into a Supply Capsule (`PendingCapsule.kind 'daily'`).
 *   With no allowance banked, nothing happens.
 * - The first Supply Capsule is granted right after capsule 2 is opened, with no matches needed
 *   (`open.ts`), so the A8 beat at about 10:00 is unchanged.
 * - Odds as the old Daily Capsule (Bronze 78%, Silver 15%, Jade 5%, Aeon 2%), climb from Bronze.
 *
 * Every Supply Capsule needs play: the allowance only says how many matches can turn into one.
 */
import type { MatchResultInput, PendingCapsule, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { grantCapsuleAt } from './capsules/grant';

/** A15.4 numbers. Read from `content.capsules.supply` when the content has it (WP1), else the DESIGN values. */
export interface SupplyRules {
  matchesPerCapsule: number;
  allowanceMax: number;
}

const DEFAULT_SUPPLY: SupplyRules = { matchesPerCapsule: 3, allowanceMax: 7 };

/** The Supply rules of a content set. */
export function supplyRules(t: Content): SupplyRules {
  const s = (t.capsules as { supply?: Partial<SupplyRules> }).supply;
  const pos = (v: unknown, d: number) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : d);
  return {
    matchesPerCapsule: pos(s?.matchesPerCapsule, DEFAULT_SUPPLY.matchesPerCapsule),
    allowanceMax: pos(s?.allowanceMax, DEFAULT_SUPPLY.allowanceMax),
  };
}

/** True when a finished match of this mode counts toward the Supply Capsule (A15.4: all but the tutorial). */
export function countsForSupply(mode: MatchResultInput['mode']): boolean {
  return mode !== 'tutorial';
}

/**
 * Called after a finished match has been counted in `matchesPlayed`: on every 3rd match, one banked
 * allowance becomes a Supply Capsule (rolled now, A6.4). Returns the capsule, or null.
 */
export function supplyAfterMatch(
  s: SaveDoc,
  t: Content,
  mode: MatchResultInput['mode'],
  now: number,
): { save: SaveDoc; capsule: PendingCapsule | null } {
  if (!countsForSupply(mode)) return { save: s, capsule: null };
  const r = supplyRules(t);
  if (s.matchesPlayed <= 0 || s.matchesPlayed % r.matchesPerCapsule !== 0) return { save: s, capsule: null };
  if (s.capsules.dailyBank <= 0) return { save: s, capsule: null };
  // `grantCapsuleAt('daily')` takes one allowance from the bank.
  const g = grantCapsuleAt(s, 'daily', t, now);
  return { save: g.save, capsule: g.capsule };
}

/**
 * Finished matches until the next Supply Capsule, for the capsule tray line "Supply Capsule: 2 more
 * matches" (A15.4). Null while no allowance is banked (the tray then shows nothing).
 */
export function supplyMatchesLeft(s: Pick<SaveDoc, 'matchesPlayed' | 'capsules'>, t: Content): number | null {
  if (s.capsules.dailyBank <= 0) return null;
  const n = supplyRules(t).matchesPerCapsule;
  const into = ((s.matchesPlayed % n) + n) % n;
  return n - into;
}
