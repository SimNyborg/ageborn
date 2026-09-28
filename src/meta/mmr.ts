/**
 * Hidden MMR and the ladder tier (DESIGN A6.8).
 *
 * - Elo with K = 32, starting at 1,000. A tier's rating is 800 + 100 × tier (tier 0 = 800 ...
 *   tier X = 1,800). Only ladder matches move MMR (Conquest never does, A6.10).
 * - Tier = clamp(round((MMR − 870) / 100), arena min, arena max), which targets a 60% expected
 *   player win rate. Fairness (win rate) is the only tuning target.
 *
 * Meta is integer-only (B2), so the Elo expectation 1 / (1 + 10^(−d/400)) comes from a table in bp
 * every 25 rating points (interpolated linearly between entries, within 3 bp of the formula; 0.01 MMR at K = 32).
 */
import type { ArenaDef, LadderRules } from '@/content';
import { roundDiv } from '@/core';

/** E(d) in bp for d = 0, 25, ..., 1,000 rating points of advantage. */
export const ELO_EXPECTED_BP: readonly number[] = [
  5000, 5359, 5715, 6063, 6401, 6725, 7034, 7325, 7597, 7850, 8083, 8296, 8490, 8666, 8823, 8965, 9091, 9203, 9302,
  9390, 9468, 9536, 9595, 9648, 9693, 9733, 9768, 9799, 9825, 9848, 9868, 9886, 9901, 9914, 9926, 9935, 9944, 9952,
  9958, 9964, 9968,
];
const STEP = 25;

/** Elo expected score in bp for a rating advantage `diff` (player − opponent). */
export function expectedScoreBp(diff: number): number {
  const d = Math.abs(Math.trunc(diff));
  const last = ELO_EXPECTED_BP.length - 1;
  const i = Math.floor(d / STEP);
  let e: number;
  if (i >= last) e = ELO_EXPECTED_BP[last] ?? 10000;
  else {
    const a = ELO_EXPECTED_BP[i] ?? 5000;
    const b = ELO_EXPECTED_BP[i + 1] ?? a;
    e = a + roundDiv((b - a) * (d - i * STEP), STEP);
  }
  return diff >= 0 ? e : 10000 - e;
}

/** A tier's Elo rating (A6.8). */
export function tierRating(rules: LadderRules, tier: number): number {
  return rules.mmr.tierRatingBase + rules.mmr.tierRatingStep * tier;
}

/** The MMR after a ladder match against a bot of `tier`. */
export function updateMmr(mmr: number, tier: number, result: 'win' | 'loss' | 'draw', rules: LadderRules): number {
  const score = result === 'win' ? 10000 : result === 'draw' ? 5000 : 0;
  const expected = expectedScoreBp(mmr - tierRating(rules, tier));
  return mmr + roundDiv(rules.mmr.k * (score - expected), 10000);
}

/** The ladder tier for an MMR inside an arena's tier range (A6.8). */
export function ladderTier(mmr: number, arena: ArenaDef, rules: LadderRules): number {
  const raw = roundDiv(mmr - rules.mmr.tierOffset, rules.mmr.tierDivisor);
  return Math.max(arena.botTiers[0], Math.min(arena.botTiers[1], raw));
}
