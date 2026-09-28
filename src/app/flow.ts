/**
 * Match end flow (DESIGN B11 "on end calls meta rewards then saves", A9 Result, C2/WP11 "Result →
 * meta → save flow with tap-to-skip reward staging").
 *
 * 1. The replay goes into the store's ring of 20 (B8 `ageborn.replays`).
 * 2. Meta turns the result into rewards and a new save (pure, B9). Capsules are rolled here, at
 *    grant time, so the save is written immediately, before any result or capsule animation (B8).
 * 3. Hint counts and the onboarding step are stored with it.
 * 4. The result screen stages the rewards one at a time; each tap skips to the next (`RewardStager`).
 */
import { signal, type ReadonlySignal, type Signal } from '@preact/signals';
import type { AgeId, MatchResultInput, ReplayDoc, RewardStep, SaveDoc } from '@/contracts';
import type { MetaRules } from '@/meta';
import type { MatchSetup } from './matchSetup';
import { afterOnboardingMatch, completeStep, onboardingStep, ONBOARDING_STEPS, type OnboardingStep } from './onboarding';
import type { Services } from './services';

export interface MatchEndResult {
  save: SaveDoc | null;
  rewards: RewardStep[];
  /** For onboarding matches: where the flow goes next. */
  onboarding: OnboardingStep | null;
}

export type FinishServices = Pick<Services, 'meta' | 'saveStore' | 'content' | 'clock'>;

/** Applies a finished match to the save and persists both the save and the replay. */
export async function finishMatch(
  services: FinishServices,
  save: SaveDoc | null,
  setup: Pick<MatchSetup, 'mode'>,
  input: MatchResultInput,
  replay: ReplayDoc,
  hintsShown: Record<string, number> = {},
  o: { age?: AgeId } = {},
): Promise<MatchEndResult> {
  try {
    services.saveStore.pushReplay(replay);
  } catch {
    // A replay that cannot be stored (quota) must never cost the player the match's rewards (B8).
  }
  if (!save) return { save: null, rewards: [], onboarding: null };
  let next: SaveDoc;
  let rewards: RewardStep[] = [];
  if (services.meta) {
    // WP7's rules take the Age Capsule age the player picked (A6.4); the bare contract has 4 arguments.
    const apply = services.meta.applyMatchResult as MetaRules['applyMatchResult'];
    const r = o.age ? apply(save, input, services.content, services.clock, { age: o.age }) : services.meta.applyMatchResult(save, input, services.content, services.clock);
    next = r.save;
    rewards = r.rewards;
  } else {
    // Without meta (Phase 1) only the match count moves, so staged unlocks still progress.
    next = { ...save, matchesPlayed: save.matchesPlayed + 1 };
  }
  next = { ...next, tutorial: { ...next.tutorial, hintsShown: { ...next.tutorial.hintsShown, ...hintsShown } } };
  let onboarding: OnboardingStep | null = null;
  if (setup.mode === 'tutorial') {
    const step = onboardingStep(save);
    const won = input.outcome.winner === input.mySide;
    onboarding = afterOnboardingMatch(step, won);
    const idx = ONBOARDING_STEPS.indexOf(onboarding);
    if (idx > 0) next = completeStep(next, ONBOARDING_STEPS[idx - 1]!);
  }
  await services.saveStore.save(next, { immediate: true });
  return { save: next, rewards, onboarding };
}

/** Default time each reward step stays before the next one appears on its own. */
export const REWARD_STEP_MS = 900;

/**
 * Stages reward steps one at a time (A9 Result: "rewards staged one at a time ..., each skippable
 * with a tap"). `revealed` counts the steps on screen; a tap reveals the next one at once.
 */
export class RewardStager {
  readonly steps: readonly RewardStep[];
  readonly revealed: ReadonlySignal<number>;
  private readonly sig: Signal<number>;
  private elapsed = 0;

  constructor(
    steps: readonly RewardStep[],
    private readonly stepMs: number = REWARD_STEP_MS,
  ) {
    this.steps = steps;
    this.sig = signal(steps.length > 0 ? 1 : 0);
    this.revealed = this.sig;
  }

  get done(): boolean {
    return this.sig.peek() >= this.steps.length;
  }

  /** Advances the automatic reveal by real time. */
  update(dtMs: number): void {
    if (this.done) return;
    this.elapsed += Math.max(0, dtMs);
    while (!this.done && this.elapsed >= this.stepMs) {
      this.elapsed -= this.stepMs;
      this.sig.value = this.sig.peek() + 1;
    }
  }

  /** A tap skips the current step's animation: the next step appears at once. */
  tap(): void {
    if (this.done) return;
    this.elapsed = 0;
    this.sig.value = this.sig.peek() + 1;
  }

  skipAll(): void {
    this.sig.value = this.steps.length;
  }
}
