import { describe, expect, it } from 'vitest';
import { fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { afterOnboardingMatch, bootRoute, completeStep, onboardingStep, showWarPlanPrompt, unlocks } from '../onboarding';

describe('first-session flow (A8, A9)', () => {
  it('a first launch goes straight into the tutorial; a finished onboarding goes Home (B11 boot step 6)', () => {
    expect(bootRoute(null)).toBe('tutorial');
    expect(onboardingStep(null)).toBe('match1');
    expect(bootRoute(fakeSaveDoc({ tutorial: { step: 2, hintsShown: {} } }))).toBe('tutorial');
    expect(bootRoute(fakeSaveDoc({ tutorial: { step: 4, hintsShown: {} } }))).toBe('home');
  });

  it('walks match 1 → capsule 1 → match 2 → capsule 2 → Home and never goes back', () => {
    let s = fakeSaveDoc();
    for (const step of ['match1', 'capsule1', 'match2', 'capsule2'] as const) {
      expect(onboardingStep(s)).toBe(step);
      s = completeStep(s, step);
    }
    expect(onboardingStep(s)).toBe('home');
    expect(completeStep(s, 'match1')).toBe(s);
  });

  it('match 1 lost replays it; match 2 moves on either way (A8 "a loss still gives rewards")', () => {
    expect(afterOnboardingMatch('match1', true)).toBe('capsule1');
    expect(afterOnboardingMatch('match1', false)).toBe('match1');
    expect(afterOnboardingMatch('match2', false)).toBe('capsule2');
  });

  it('unlocks War Plan and Skirmish after match 3, stance in match 4, Last Stand in match 5 (A3)', () => {
    expect(unlocks(null)).toEqual({ warPlan: false, skirmish: false, stance: false, lastStandButton: false });
    expect(unlocks(fakeSaveDoc({ matchesPlayed: 3 }))).toEqual({ warPlan: true, skirmish: true, stance: true, lastStandButton: false });
    expect(unlocks(fakeSaveDoc({ matchesPlayed: 4 }))).toEqual({ warPlan: true, skirmish: true, stance: true, lastStandButton: true });
    expect(showWarPlanPrompt(fakeSaveDoc({ matchesPlayed: 3 }))).toBe(true);
    expect(showWarPlanPrompt(fakeSaveDoc({ matchesPlayed: 3, flags: { 'tutorial.warPlanPrompt': true } }))).toBe(false);
  });
});
