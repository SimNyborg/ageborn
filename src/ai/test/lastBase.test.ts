/**
 * Last Base Standing AI (DESIGN A2.10.1 "AI"): bots read the public schedule from the observation, so
 * they play no Final Bell (the window alone would say Full War), keep researching through Siege, and a
 * bot whose base crumbles alone goes all-in. Still labelled AI everywhere; only commands, never stats.
 */
import { describe, expect, it } from 'vitest';
import type { Observation, ObservedEscalation } from '@/contracts';
import { seedSfc32 } from '@/core';
import { cardBook, matchClock, observedClock } from '../book';
import { Brain, type DecisionTrace } from '../brain';
import { Ledger } from '../ledger';
import { BotMemory } from '../memory';
import { BALANCED_WEIGHTS, personalityFor, weightsBp } from '../personalities';
import { tierParams, type TierParams } from '../tiers';
import { buildView } from '../view';
import { content, observation } from './helpers';

const book = cardBook(content);
const MILLI = 1000;
const RESEARCH_ON: Partial<TierParams> = { researchFromTicks: 0, researchGapTicks: 0, goldFloat: 0, treasuryMax: 0 };

const STEPS: ObservedEscalation['steps'] = (content.formats['last']?.escalation ?? []).map((x) => ({
  tick: x.atMs / 50,
  baseDamageBp: x.baseDamageBp,
  turretDamageBp: x.turretDamageBp,
  crumbleBpPerSec: x.crumbleBpPerSec,
}));

function esc(step: number, crumbling: [boolean, boolean] = [false, false]): ObservedEscalation {
  return { step, steps: STEPS, crumbling };
}

function brainFor(o: { tier?: number; tierOverride?: Partial<TierParams> } = {}): Brain {
  const tier = { ...tierParams(o.tier ?? 8), mistakeBp: 0, ...o.tierOverride };
  return new Brain({ book, tier, persona: personalityFor(content, 'echo'), weights: weightsBp(BALANCED_WEIGHTS), mistakeBonusBp: 0, openings: [] }, seedSfc32('lbs-test'));
}

function decide(brain: Brain, obs: Observation): DecisionTrace {
  const mem = new BotMemory(book);
  mem.observe(obs);
  return brain.decide(buildView(obs, obs.tick + 6, book, new Ledger(book)), mem, seedSfc32('decide'));
}

describe('Last Base Standing bots (A2.10.1)', () => {
  it('play by the public schedule: Siege I at 14:30 and no Final Bell (not the Full War clock of the same ages)', () => {
    const full = observation({});
    expect(observedClock(book, full)).toEqual(matchClock(book, full.ages));
    expect(observedClock(book, full).finalBell).toBe(21000);
    expect(observedClock(book, { ...full, escalation: esc(0) })).toEqual({ overdrive: 14400, siege: 17400, finalBell: null });
  });

  it('keep researching in Siege when there is no Final Bell; a timed war stops research in Siege', () => {
    const at = (tick: number, e?: ObservedEscalation): Observation => ({ ...observation({ tick, phase: 'siege', gold: 900 * MILLI }), ...(e ? { escalation: e } : {}) });
    expect(decide(brainFor({ tierOverride: RESEARCH_ON }), at(18000)).goal?.kind).not.toBe('research');
    expect(decide(brainFor({ tierOverride: RESEARCH_ON }), at(21000, esc(2))).goal?.kind).toBe('research');
    // In Crumble too, while its own base is not the one crumbling alone (the helper plays side 1).
    expect(decide(brainFor({ tierOverride: RESEARCH_ON }), at(27000, esc(4, [true, false]))).goal?.kind).toBe('research');
  });

  it('a bot crumbling alone goes all-in: no saving goal, every train scored up', () => {
    // The helper plays side 1; 900 gold and research on, so a calm bot would save for a War Council item.
    const base = (e: ObservedEscalation): Observation => ({ ...observation({ tick: 27000, phase: 'siege', gold: 900 * MILLI }), escalation: e });
    const best = (t: DecisionTrace): number => Math.max(...t.candidates.filter((c) => c.action.kind === 'train').map((c) => c.score));
    const both = decide(brainFor({ tierOverride: RESEARCH_ON }), base(esc(4, [true, true])));
    const foeAlone = decide(brainFor({ tierOverride: RESEARCH_ON }), base(esc(4, [true, false])));
    const meAlone = decide(brainFor({ tierOverride: RESEARCH_ON }), base(esc(4, [false, true])));
    expect(both.goal?.kind).toBe('research');
    expect(foeAlone.goal?.kind).toBe('research');
    expect(meAlone.goal).toBeNull();
    expect(meAlone.action?.kind).toBe('train');
    expect(best(meAlone)).toBeGreaterThan(best(both));
  });
});
