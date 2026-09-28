/**
 * The first-session flow (DESIGN A8, A9 flow): Boot ─first launch─> Tutorial match 1 ─> Capsule 1
 * ─> Home ─Battle─> Match 2 ─> Capsule 2 + upgrade ─> Home. No menu, name prompt or account screen
 * before the first win (A8).
 *
 * Owner feedback 2026-09-28: Home is the hub from right after capsule 1. While the step is `match2`
 * the start screen is Home (with War Plan, Collection, Capsules, Customize and Trophy Road open)
 * and its Battle button offers match 2 vs Pip as the suggested battle.
 *
 * The step lives in `SaveDoc.tutorial.step` (0-4), so a reload resumes where the player left off.
 * Staged unlocks (War Plan, Customize and Skirmish after match 1, the stance from match 1, the Last
 * Stand button from match 2) follow the match count (`tutorial/scripts.ts` STAGES).
 */
import type { SaveDoc } from '@/contracts';
import { STAGES } from '@/tutorial';

export const ONBOARDING_STEPS = ['match1', 'capsule1', 'match2', 'capsule2', 'home'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** The current onboarding step of a save (a missing save is a first launch). */
export function onboardingStep(save: SaveDoc | null): OnboardingStep {
  const i = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, save?.tutorial.step ?? 0));
  return ONBOARDING_STEPS[i]!;
}

/** B11 Boot step 6: route to the tutorial or Home (Home from match 2 on, owner feedback 2026-09-28). */
export function bootRoute(save: SaveDoc | null): 'tutorial' | 'home' {
  return homeStep(onboardingStep(save)) ? 'home' : 'tutorial';
}

/**
 * True when the start screen is Home for this step: after onboarding, and already while match 2 is
 * next (it starts from Home's Battle button).
 */
export function homeStep(step: OnboardingStep | string): boolean {
  return step === 'home' || step === 'match2';
}

/** The save with the onboarding moved past `done` (never backwards). */
export function completeStep(save: SaveDoc, done: OnboardingStep): SaveDoc {
  const next = ONBOARDING_STEPS.indexOf(done) + 1;
  if (next <= save.tutorial.step) return save;
  return { ...save, tutorial: { ...save.tutorial, step: Math.min(next, ONBOARDING_STEPS.length - 1) } };
}

/**
 * The step after a finished onboarding match. Match 2 moves on even after a loss ("a loss still
 * gives rewards plus a retry", A8: the retry is offered on the result screen, not forced). Match 1
 * cannot really be lost, but a loss replays it.
 */
export function afterOnboardingMatch(step: OnboardingStep, won: boolean): OnboardingStep {
  if (step === 'match1') return won ? 'capsule1' : 'match1';
  if (step === 'match2') return 'capsule2';
  return step;
}

/** What the player can open, by matches played (A3 unlock order). */
export function unlocks(save: SaveDoc | null): { warPlan: boolean; skirmish: boolean; stance: boolean; lastStandButton: boolean } {
  const played = save?.matchesPlayed ?? 0;
  const next = played + 1;
  return {
    warPlan: played >= STAGES.warPlanAfterMatch,
    skirmish: played >= STAGES.skirmishAfterMatch,
    stance: next >= STAGES.stanceFromMatch,
    lastStandButton: next >= STAGES.lastStandFromMatch,
  };
}

