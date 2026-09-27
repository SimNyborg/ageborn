/**
 * Result screen model (A9 #7): the outcome from the player's side and the staged reward list
 * (A6.3: trophies tick, Amber, capsule or Clay pip, Codex points, quest progress; each skippable).
 */
import type { MatchResultInput, RewardStep } from '@/contracts';
import type { MatchResultKind } from './profile';

export function resultKind(input: MatchResultInput): MatchResultKind {
  const w = input.outcome.winner;
  if (w === null) return 'draw';
  return w === input.mySide ? 'win' : 'loss';
}

/** Reward steps in the order they are revealed (as meta returns them), dropping empty ones. */
export function stagedRewards(rewards: readonly RewardStep[]): RewardStep[] {
  return rewards.filter((r) => {
    switch (r.kind) {
      case 'amber':
      case 'dust':
        return r.amount > 0;
      case 'codex':
        return r.points > 0;
      default:
        return true;
    }
  });
}

/** Stagger between two reward reveals (A9 #7), and the trophy count-up time. */
export const REWARD_STEP_MS = 650;
export const COUNT_UP_MS = 600;

/** The capsule earned in this match, if any (Result → Capsule opening, A9 flow). */
export function earnedCapsule(rewards: readonly RewardStep[]): string | null {
  for (const r of rewards) if (r.kind === 'capsule') return r.capsuleId;
  return null;
}
