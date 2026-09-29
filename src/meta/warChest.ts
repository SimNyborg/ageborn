/**
 * The War Chest (DESIGN A15.5): counting wins fill a bar; at 20 the chest opens at once and grants a
 * Wardrobe Crate and an Age Capsule, and the bar restarts at 0. Progress never resets: no weekly
 * gate, no cap, no timer, and `tickTimers` never touches it.
 *
 * Data: `QuestState.weekly.progress` holds the count (0-19) and `content.quests.weekly` is the chest
 * (its `target` = wins per chest, its rewards = what it grants); `weekKey` is unused. The crate uses
 * `PendingCrate.source 'weekly'`.
 *
 * A counting win is a win in Ladder or the Daily Challenge, or a Conquest win that earns a star or
 * beats a General whose tier is at least the player's skill tier − 2 (A15.9). Skirmish and the
 * tutorial never count, so farming an easy AI gives nothing.
 */
import type { AgeId, MatchResultInput, PendingCapsule, PendingCrate, RewardStep, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { roundDiv } from '@/core';
import { grantCapsuleAt } from './capsules/grant';
import { grantCrateAt } from './capsules/wardrobe';

/** Wins per chest: the War Chest quest's `target` in `content.quests.weekly` (20, A15.5). */
export function winsPerChest(t: Content): number {
  return Math.max(1, t.quests.weekly.target);
}

/** Internal skill tier (A15.9): clamp(round((MMR − 870) / 100), 0, 10). Never shown. */
export function skillTier(mmr: number, t: Content): number {
  const m = t.arenas.ladder.mmr;
  return Math.max(0, Math.min(10, roundDiv(Math.trunc(mmr) - m.tierOffset, m.tierDivisor)));
}

/** Facts about one finished match that decide whether it is a counting win. */
export interface CountingFacts {
  mode: MatchResultInput['mode'];
  win: boolean;
  /** The opponent's AI tier. */
  opponentTier: number;
  /** A Conquest star was earned by this match. */
  earnedStar: boolean;
  /** The player's MMR before the match. */
  mmr: number;
}

/** A15.5 "counting win". */
export function isCountingWin(f: CountingFacts, t: Content): boolean {
  if (!f.win) return false;
  switch (f.mode) {
    case 'ladder':
    case 'daily':
      return true;
    case 'conquest':
    case 'warPath':
      return f.earnedStar || f.opponentTier >= skillTier(f.mmr, t) - 2;
    default:
      return false;
  }
}

/** War Chest progress for the Home bar ("War Chest 13/20"). */
export function warChestProgress(s: Pick<SaveDoc, 'quests'>, t: Content): { wins: number; of: number } {
  const of = winsPerChest(t);
  return { wins: Math.max(0, Math.min(of - 1, s.quests.weekly.progress)), of };
}

/**
 * Adds one counting win. At the goal the chest is granted at once (a Wardrobe Crate and an Age
 * Capsule for `age`, or the default age) and the bar restarts at 0.
 */
export function addWarChestWin(
  s: SaveDoc,
  t: Content,
  now: number,
  age?: AgeId,
): { save: SaveDoc; steps: RewardStep[]; crate: PendingCrate | null; capsule: PendingCapsule | null } {
  const goal = winsPerChest(t);
  const weekly = s.quests.weekly;
  const progress = Math.max(0, weekly.progress) + 1;
  if (progress < goal) {
    return { save: { ...s, quests: { ...s.quests, weekly: { ...weekly, progress, claimed: false } } }, steps: [], crate: null, capsule: null };
  }
  let save: SaveDoc = { ...s, quests: { ...s.quests, weekly: { ...weekly, progress: 0, claimed: false } } };
  const steps: RewardStep[] = [];
  let crate: PendingCrate | null = null;
  let capsule: PendingCapsule | null = null;
  // The chest's rewards are data (`content.quests.weekly.rewards`): a Wardrobe Crate and an Age Capsule.
  for (const r of t.quests.weekly.rewards) {
    if (r.kind === 'wardrobe') {
      const c = grantCrateAt(save, 'weekly', t, now);
      save = c.save;
      crate = c.crate;
      steps.push({ kind: 'crate', crateId: c.crate.id });
    } else if (r.kind === 'ageCapsule') {
      const g = grantCapsuleAt(save, 'age', t, now, age ? { age } : {});
      save = g.save;
      capsule = g.capsule;
      steps.push({ kind: 'capsule', capsuleId: g.capsule.id });
    } else if (r.kind === 'amber') {
      save = { ...save, currencies: { ...save.currencies, amber: save.currencies.amber + r.amount } };
      steps.push({ kind: 'amber', amount: r.amount });
    } else if (r.kind === 'dust') {
      save = { ...save, currencies: { ...save.currencies, dust: save.currencies.dust + r.amount } };
      steps.push({ kind: 'dust', amount: r.amount });
    }
  }
  return { save, steps, crate, capsule };
}
