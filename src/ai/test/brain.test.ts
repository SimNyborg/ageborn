import { describe, expect, it } from 'vitest';
import type { Observation } from '@/contracts';
import { seedSfc32 } from '@/core';
import { cardBook } from '../book';
import { Brain, monoFactorBp, type DecisionTrace } from '../brain';
import { Ledger } from '../ledger';
import { BotMemory } from '../memory';
import { BALANCED_WEIGHTS, personalityFor, weightsBp, type Weights } from '../personalities';
import { SCORE } from '../scoring';
import { tierParams, type TierParams } from '../tiers';
import { buildView } from '../view';
import { content, observation, unit } from './helpers';

const book = cardBook(content);
const MILLI = 1000;

interface BrainOptions {
  tier?: number;
  tierOverride?: Partial<TierParams>;
  general?: string;
  weights?: Partial<Weights>;
  openings?: string[];
  seed?: string;
}

/** A brain with mistakes off unless the test turns them on, and no opening unless given. */
function brainFor(o: BrainOptions = {}): { brain: Brain; tier: TierParams } {
  const tier = { ...tierParams(o.tier ?? 10), mistakeBp: 0, ...o.tierOverride };
  const brain = new Brain(
    {
      book,
      tier,
      persona: personalityFor(content, o.general ?? 'echo'),
      weights: weightsBp({ ...BALANCED_WEIGHTS, ...o.weights }),
      mistakeBonusBp: 0,
      openings: o.openings ?? [],
    },
    seedSfc32(o.seed ?? 'brain-test'),
  );
  return { brain, tier };
}

/** One decision on `obs`, with memory fed `history` first (oldest first). */
function decide(brain: Brain, obs: Observation, o: { history?: Observation[]; now?: number; rng?: string; memory?: BotMemory } = {}): DecisionTrace {
  const mem = o.memory ?? new BotMemory(book);
  for (const h of o.history ?? []) mem.observe(h);
  mem.observe(obs);
  const v = buildView(obs, o.now ?? obs.tick + 6, book, new Ledger(book));
  return brain.decide(v, mem, seedSfc32(o.rng ?? 'decide'));
}

const kinds = (t: DecisionTrace): string[] => t.candidates.map((c) => c.action.kind);

describe('evolve (A7.2)', () => {
  const ready = (tick: number, extra: Parameters<typeof observation>[0] = {}) => observation({ tick, xpBp: 10200, ...extra });

  it('scores 1.2 once XP is ready and the tier delay has passed', () => {
    const { brain } = brainFor({ tier: 10 });
    const t = decide(brain, ready(30), { history: [ready(10)] });
    expect(t.action).toEqual({ kind: 'evolve' });
    expect(t.candidates[0]?.score).toBe(SCORE.evolve);
  });

  it('waits for the evolve delay (tier 0: 10 s)', () => {
    const { brain } = brainFor({ tier: 0 });
    expect(decide(brain, ready(100), { history: [ready(10)] }).action).toBeNull();
    const { brain: b2 } = brainFor({ tier: 0 });
    expect(decide(b2, ready(210), { history: [ready(10)] }).action).toEqual({ kind: 'evolve' });
  });

  it('below tier VII evolves after the delay with no safety check (A16.3 rule 2)', () => {
    const units = [unit(0, 'bonker', 250)];
    // Tier V: 3 s delay (60 ticks), then it evolves even with a foe at the gate.
    expect(kinds(decide(brainFor({ tier: 5 }).brain, ready(60, { units }), { history: [ready(10, { units })] }))).not.toContain('evolve');
    expect(decide(brainFor({ tier: 5 }).brain, ready(75, { units }), { history: [ready(10, { units })] }).action).toEqual({ kind: 'evolve' });
  });

  it('tiers VII and X wait for a safe window for at most 2 s / 0.5 s, then evolve anyway (A16.3 rule 2)', () => {
    const units = [unit(0, 'bonker', 250)];
    // Tier VII: 1.5 s into constant pressure it still waits; after 2 s it evolves.
    expect(kinds(decide(brainFor({ tier: 7 }).brain, ready(40, { units }), { history: [ready(10, { units })] }))).not.toContain('evolve');
    expect(decide(brainFor({ tier: 7 }).brain, ready(51, { units }), { history: [ready(10, { units })] }).action).toEqual({ kind: 'evolve' });
    // Tier X: the cap is 0.5 s.
    expect(kinds(decide(brainFor({ tier: 10 }).brain, ready(18, { units }), { history: [ready(10, { units })] }))).not.toContain('evolve');
    expect(decide(brainFor({ tier: 10 }).brain, ready(21, { units }), { history: [ready(10, { units })] }).action).toEqual({ kind: 'evolve' });
    // m_greed ≥ 1.3 never waits.
    const { brain: greedy } = brainFor({ tier: 7, weights: { greed: 95 } });
    expect(kinds(decide(greedy, ready(20, { units }), { history: [ready(10, { units })] }))).toContain('evolve');
  });

  it('never evolves in the final age: XP sits at 100% only there, with a full charge', () => {
    const final = (tick: number) => observation({ tick, xpBp: 10000, powerPpm: 1000000 });
    const { brain } = brainFor();
    expect(kinds(decide(brain, final(40), { history: [final(10)] }))).not.toContain('evolve');
  });

  it('tiers VII and X wait for a safe window: no foe can reach 300 lu of the gate during the Ascension', () => {
    // A Bonker (70 lu/s) at 500 lu: outside 300 lu now, but tier VII sees it 0.5 s late and the
    // Ascension takes 2.5 s, so it would be within 300 lu (500 − 70 × 3.05 = 286) before the ageUp.
    // Decided 1 s after XP filled, inside the 2 s cap.
    const near = [unit(0, 'bonker', 500)];
    const t7 = decide(brainFor({ tier: 7 }).brain, ready(30, { units: near }), { history: [ready(10, { units: near })] });
    expect(kinds(t7)).not.toContain('evolve');
    // Tier V has no safety check at all.
    const t5 = decide(brainFor({ tier: 5 }).brain, ready(100, { units: near }), { history: [ready(10, { units: near })] });
    expect(t5.action).toEqual({ kind: 'evolve' });
    // 30 lu further out the window is open for tier VII too.
    const far = [unit(0, 'bonker', 530)];
    expect(decide(brainFor({ tier: 7 }).brain, ready(30, { units: far }), { history: [ready(10, { units: far })] }).action).toEqual({ kind: 'evolve' });
    // Air units never block the window.
    const air = [unit(0, 'bonker', 350, { air: true })];
    expect(decide(brainFor({ tier: 10 }).brain, ready(12, { units: air }), { history: [ready(10, { units: air })] }).action).toEqual({ kind: 'evolve' });
  });

  it('fires a full power into a zone before evolving, so the 50% carry cap wastes nothing', () => {
    const units = [unit(0, 'tuskback', 500)];
    const o = (tick: number) => ready(tick, { powerPpm: 1000000, units, power: 'meteor_shower' });
    const { brain } = brainFor();
    expect(decide(brain, o(40), { history: [o(10)] }).action?.kind).toBe('power');
  });
});

describe('power (A7.2)', () => {
  // A barrage power, and enemies on the bot's half (so the push gate stays out of the way).
  const power = 'meteor_shower';
  const crowd = (n: number) => Array.from({ length: n }, (_, i) => unit(0, 'bonker', 500 + i * 10));

  it('casts when the best zone holds at least threshold × m_patience', () => {
    // Tier III threshold 250 gold; 6 Bonkers = 300 gold.
    const { brain } = brainFor({ tier: 3 });
    const t = decide(brain, observation({ powerPpm: 1000000, power, units: crowd(6) }));
    expect(t.action?.kind).toBe('power');
    // Tier V threshold 350: not enough.
    const { brain: b5 } = brainFor({ tier: 5 });
    expect(decide(b5, observation({ powerPpm: 1000000, power, units: crowd(6) })).action).toBeNull();
    // Patience 95 (m 1.45) raises tier III's bar to 362.
    const { brain: patient } = brainFor({ tier: 3, weights: { patience: 95 } });
    expect(decide(patient, observation({ powerPpm: 1000000, power, units: crowd(6) })).action).toBeNull();
  });

  it('casts on ≥ 100 gold when the own base took damage in the last 3 s', () => {
    const { brain } = brainFor({ tier: 7 });
    const units = crowd(3);
    const t = decide(brain, observation({ tick: 50, powerPpm: 1000000, power, units, baseHpBp: 9000 }), {
      history: [observation({ tick: 20, powerPpm: 1000000, power, units, baseHpBp: 10000 })],
    });
    expect(t.action?.kind).toBe('power');
  });

  it('aims within the tier aim error of the zone centre, clamped to 150-1,050', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const { brain } = brainFor({ tier: 0, tierOverride: { powerThreshold: 100 } });
      const t = decide(brain, observation({ powerPpm: 1000000, power, units: crowd(4) }), { rng: seed });
      const a = t.action;
      expect(a?.kind).toBe('power');
      if (a?.kind === 'power' && a.p !== null) {
        expect(a.p).toBeGreaterThanOrEqual(150);
        expect(a.p).toBeLessThanOrEqual(1050);
        expect(Math.abs(a.p - 515)).toBeLessThanOrEqual(250 + 200);
      }
    }
  });
});

describe('Last Stand (A7.2)', () => {
  const near = (n: number) => Array.from({ length: n }, (_, i) => unit(0, 'bonker', 100 + i * 20));
  it('fires when armed and ≥ 4 enemies are within 450 lu', () => {
    const { brain } = brainFor();
    expect(decide(brain, observation({ lastStand: 'armed', baseHpBp: 2000, units: near(4) })).action).toEqual({ kind: 'lastStand' });
    expect(kinds(decide(brainFor().brain, observation({ lastStand: 'armed', baseHpBp: 2000, units: near(3) })))).not.toContain('lastStand');
    expect(kinds(decide(brainFor().brain, observation({ lastStand: 'locked', baseHpBp: 2000, units: near(6) })))).not.toContain('lastStand');
  });

  it('leaves it to the automatic trigger when the base may reach 10% before the command runs', () => {
    const { brain } = brainFor({ tier: 0 });
    const t = decide(brain, observation({ tick: 40, lastStand: 'armed', baseHpBp: 1300, units: near(5) }), {
      history: [observation({ tick: 20, lastStand: 'armed', baseHpBp: 1500, units: near(5) })],
    });
    expect(kinds(t)).not.toContain('lastStand');
  });

  it('respects the autoLastStand rule', () => {
    const { brain } = brainFor({ openings: ['rule:autoLastStand'] });
    expect(kinds(decide(brain, observation({ lastStand: 'armed', baseHpBp: 2000, units: near(5) })))).not.toContain('lastStand');
  });
});

describe('push gate, banking and stance (A7.2)', () => {
  const foeTurret = { turrets: [{ card: 'rock_tosser', age: 'stone' as const }, null, null, null] };

  it('fails the gate against a turret with no army, holds at tier V+, banks for Treasury', () => {
    const { brain } = brainFor({ tier: 5 });
    const t = decide(brain, observation({ tick: 400, gold: 100 * MILLI, foe: foeTurret }));
    expect(t.pushOk).toBe(false);
    expect(t.banking).toBe(true);
    expect(t.defence).toBe(300);
    expect(t.goal).toEqual({ kind: 'treasury', amount: 200 * MILLI });
    expect(t.action).toEqual({ kind: 'stance', stance: 'hold' });
    expect(kinds(t)).not.toContain('train');
  });

  it('never holds below tier V, and never while the stance is locked', () => {
    expect(kinds(decide(brainFor({ tier: 4 }).brain, observation({ tick: 400, foe: foeTurret })))).not.toContain('stance');
    expect(kinds(decide(brainFor({ tier: 5, openings: ['rule:noStance'] }).brain, observation({ tick: 400, foe: foeTurret })))).not.toContain('stance');
  });

  it('spends the bank in one wave once the gold lifts the army over the gate', () => {
    const { brain } = brainFor({ tier: 7, tierOverride: { treasuryMax: 0 } });
    // D = 300 → the gate needs 390; 420 gold is enough for a wave.
    const t = decide(brain, observation({ tick: 400, gold: 420 * MILLI, foe: foeTurret }));
    expect(t.pushOk).toBe(false);
    expect(t.banking).toBe(false);
    // It still holds at the line while the wave gathers; the trains are on the table.
    expect(t.action).toEqual({ kind: 'stance', stance: 'hold' });
    expect(kinds(t)).toContain('train');
  });

  it('counts enemy units within 500 lu of their gate in D, and never banks while the enemy is on its half', () => {
    const { brain } = brainFor({ tier: 5 });
    const t = decide(brain, observation({ tick: 400, units: [unit(0, 'bonker', 1150), unit(0, 'tuskback', 650)] }));
    expect(t.defence).toBe(50);
    const { brain: b2 } = brainFor({ tier: 5 });
    const defending = decide(b2, observation({ tick: 400, foe: foeTurret, units: [unit(0, 'bonker', 500)] }));
    expect(defending.pushOk).toBe(false);
    expect(defending.banking).toBe(false);
  });

  it('charges in Siege whatever the gate says', () => {
    const { brain } = brainFor({ tier: 5 });
    const t = decide(brain, observation({ tick: 6000, phase: 'siege', stance: 'hold', foe: foeTurret }));
    expect(t.pushOk).toBe(true);
    expect(t.action).toEqual({ kind: 'stance', stance: 'charge' });
  });

  it('prefers range ≥ 250 while the gate fails (+0.3)', () => {
    const modern = { ageIndex: 3, treasury: 3, tray: ['trench_raider', 'rifleman', null, null, null], gold: 1000 * MILLI, tick: 400 };
    const gate = decide(brainFor({ tier: 7 }).brain, observation({ ...modern, foe: foeTurret }));
    const open = decide(brainFor({ tier: 7 }).brain, observation(modern));
    const score = (t: DecisionTrace, card: string) => t.candidates.find((c) => c.action.kind === 'train' && c.action.card === card)?.score ?? 0;
    expect(gate.pushOk).toBe(false);
    expect(score(gate, 'rifleman') - score(open, 'rifleman')).toBe(3000);
    expect(score(gate, 'trench_raider') - score(open, 'trench_raider')).toBe(0);
  });
});

describe('attack clock (A7.2)', () => {
  it('raises train scores 10% per 5 s after 60 s without passing mid-lane', () => {
    const { brain } = brainFor();
    const t = decide(brain, observation({ tick: 2000 }), { now: 2000 });
    // quiet = 2000 ticks → (2000 − 1200) / 100 = 8 steps → ×1.8
    expect(t.clockBp).toBe(18000);
    const { brain: b2 } = brainFor();
    expect(decide(b2, observation({ tick: 600 }), { now: 600 }).clockBp).toBe(10000);
  });
});

describe('saving goals and economy', () => {
  it('banks for Treasury while the gate is quiet in the first 3:00, then buys it', () => {
    const { brain } = brainFor({ tier: 7 });
    const t = decide(brain, observation({ tick: 600, gold: 220 * MILLI }));
    expect(t.goal).toEqual({ kind: 'treasury', amount: 200 * MILLI });
    expect(t.action).toEqual({ kind: 'treasury', cost: 200 * MILLI });
  });

  it('does not buy Treasury after 3:00, above the tier max, or with enemies within 600 lu', () => {
    expect(kinds(decide(brainFor({ tier: 7 }).brain, observation({ tick: 3700, gold: 600 * MILLI })))).not.toContain('treasury');
    expect(kinds(decide(brainFor({ tier: 1 }).brain, observation({ tick: 600, gold: 600 * MILLI })))).not.toContain('treasury');
    expect(kinds(decide(brainFor({ tier: 7 }).brain, observation({ tick: 600, gold: 600 * MILLI, units: [unit(0, 'bonker', 550)] })))).not.toContain(
      'treasury',
    );
  });

  it('saves 350 for a Legendary: other trains are penalised by 0.8', () => {
    const tray = ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'mammoth_matriarch'];
    const { brain } = brainFor({ tier: 7, weights: { legendary: 90 }, tierOverride: { treasuryMax: 0 } });
    const t = decide(brain, observation({ tick: 1000, gold: 300 * MILLI, tray }));
    expect(t.goal).toEqual({ kind: 'legendary', amount: 350 * MILLI, card: 'mammoth_matriarch' });
    // Every affordable card would drop gold below 350: all trains fall under the saving bar.
    expect(t.action).toBeNull();
  });

  it('floats gold to the tier target before training (tier 0: 450)', () => {
    const { brain } = brainFor({ tier: 0 });
    // First decision below the cheapest card: spending mode off.
    decide(brain, observation({ tick: 100, gold: 20 * MILLI }));
    expect(decide(brain, observation({ tick: 200, gold: 300 * MILLI })).action).toBeNull();
    expect(decide(brain, observation({ tick: 300, gold: 460 * MILLI })).action?.kind).toBe('train');
  });

  it('modernises an outdated turret at rebuild tiers when calm', () => {
    const { brain } = brainFor({ tier: 5 });
    const med = content.formats.full.ages[1];
    expect(med).toBe('medieval');
    const t = decide(
      brain,
      observation({
        tick: 5000,
        ageIndex: 1,
        gold: 200 * MILLI,
        treasury: 3,
        tray: ['footman', 'longbowman', null, null, null],
        turretCards: ['crossbow_nest', 'pitch_cauldron'],
        turrets: [{ card: 'rock_tosser', age: 'stone' }, null, null, null],
      }),
    );
    const mod = t.candidates.find((c) => c.action.kind === 'modernise');
    expect(mod?.action).toMatchObject({ kind: 'modernise', mount: 0 });
    // New price minus 50% of the old: 150 − 75 = 75 for the Crossbow Nest, 175 − 75 for the Cauldron.
    expect([75 * MILLI, 100 * MILLI]).toContain((mod?.action as { cost: number }).cost);
  });

  it('wants a turret under pressure', () => {
    const { brain } = brainFor({ tier: 5 });
    const units = [unit(0, 'tuskback', 400)];
    const t = decide(brain, observation({ tick: 400, gold: 200 * MILLI, units, treasury: 3 }));
    expect(t.candidates.some((c) => c.action.kind === 'build')).toBe(true);
  });
});

describe('train choice', () => {
  it('scores by the A7.2 formula and picks counters at full depth', () => {
    const { brain } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    const units = [unit(0, 'tuskback', 500), unit(0, 'tuskback', 520)];
    const t = decide(brain, observation({ tick: 5000, gold: 500 * MILLI, units }));
    expect(t.action).toMatchObject({ kind: 'train', card: 'spear_hunter' });
  });

  it('counter depth 0 picks weighted at random from the loadout', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i += 1) {
      const { brain } = brainFor({ tier: 1, tierOverride: { goldFloat: 0 }, seed: `r${i}` });
      const t = decide(brain, observation({ tick: 5000, gold: 500 * MILLI }), { rng: `r${i}` });
      if (t.action?.kind === 'train') seen.add(t.action.card);
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it('counter depth 0 draws only among trains that clear the saving bar', () => {
    const tray = ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'mammoth_matriarch'];
    for (let i = 0; i < 30; i += 1) {
      const { brain } = brainFor({ tier: 1, tierOverride: { goldFloat: 0 }, seed: `s${i}` });
      // Saving 350 for the Legendary: every other card would dip below the goal (f_save).
      const t = decide(brain, observation({ tick: 1000, gold: 380 * MILLI, tray }), { rng: `s${i}` });
      expect(t.goal).toMatchObject({ kind: 'legendary', amount: 350 * MILLI });
      expect(t.action).toMatchObject({ kind: 'train', card: 'mammoth_matriarch' });
    }
  });

  it('never trains a second Legendary, past the queue or past the pop cap', () => {
    const tray = ['bonker', null, null, null, 'mammoth_matriarch'];
    const { brain } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    const t = decide(brain, observation({ tick: 5000, gold: 900 * MILLI, tray, queue: ['mammoth_matriarch'] }));
    expect(t.candidates.some((c) => c.action.kind === 'train' && c.action.card === 'mammoth_matriarch')).toBe(false);
    const full = decide(brainFor({ tier: 10 }).brain, observation({ tick: 5000, gold: 900 * MILLI, queue: ['bonker', 'bonker', 'bonker', 'bonker', 'bonker'] }));
    expect(full.candidates.some((c) => c.action.kind === 'train')).toBe(false);
    const capped = decide(brainFor({ tier: 10 }).brain, observation({ tick: 5000, gold: 900 * MILLI, pop: 59 }));
    expect(capped.candidates.some((c) => c.action.kind === 'train')).toBe(false);
  });
});

describe('mistakes (A7.2 Choice)', () => {
  it('replaces the best action with a plausible error at the mistake rate', () => {
    const { brain } = brainFor({ tier: 10, tierOverride: { mistakeBp: 10000, goldFloat: 0, treasuryMax: 0 } });
    const units = [unit(0, 'balloon_admiral', 700, { air: true })];
    const t = decide(brain, observation({ tick: 5000, gold: 500 * MILLI, units }));
    expect(t.reason).toBe('mistake');
    expect(['forgetAntiAir', 'floatGold', 'overCommit', 'leaveMountEmpty', 'powerOnFew', 'evolveBeforePush']).toContain(t.mistake);
    if (t.mistake === 'forgetAntiAir' && t.action?.kind === 'train') expect(book.units[t.action.card]?.hitsAir).toBe(false);
  });

  it('makes no mistake when there is nothing to do', () => {
    const { brain } = brainFor({ tier: 0, tierOverride: { mistakeBp: 10000 } });
    const t = decide(brain, observation({ tick: 5000, gold: 0 }));
    expect(t.reason).toBe('wait');
    expect(t.mistake).toBeNull();
  });
});

describe('personalities (A7.4)', () => {
  it('Kettle pushes all-in before evolving: Evolve waits while units can be trained', () => {
    const w = content.generals as { list: Record<string, { weights: Weights }> };
    const { brain } = brainFor({ general: 'kettle', weights: w.list.kettle?.weights, tierOverride: { goldFloat: 0, treasuryMax: 0 } });
    const o = (tick: number) => observation({ tick, xpBp: 10200, gold: 300 * MILLI });
    const t = decide(brain, o(40), { history: [o(10)] });
    expect(t.action?.kind).toBe('train');
  });

  it('Ledger rushes Treasury 3 by 2:30 whatever its tier', () => {
    const w = content.generals as { list: Record<string, { weights: Weights }> };
    const { brain } = brainFor({ tier: 3, general: 'ledger', weights: w.list.ledger?.weights });
    const t = decide(brain, observation({ tick: 1000, gold: 400 * MILLI, treasury: 2 }));
    expect(t.goal).toEqual({ kind: 'treasury', amount: 550 * MILLI });
  });

  it('Moss holds at her tiers (II-IV) although A7.3 allows Hold only from tier V', () => {
    const w = content.generals as { list: Record<string, { weights: Weights }> };
    const foe = { turrets: [{ card: 'rock_tosser', age: 'stone' as const }, null, null, null] };
    const moss = decide(brainFor({ tier: 3, general: 'moss', weights: w.list.moss?.weights }).brain, observation({ tick: 400, foe }));
    expect(moss.pushOk).toBe(false);
    expect(moss.action).toEqual({ kind: 'stance', stance: 'hold' });
    const echo = decide(brainFor({ tier: 3 }).brain, observation({ tick: 400, foe }));
    expect(kinds(echo)).not.toContain('stance');
  });

  it('Rook weighs counters ×1.5', () => {
    expect(personalityFor(content, 'rook').counterWeightBp).toBe(15000);
  });
});

describe('openings (A7.2)', () => {
  it('plays the opening steps first, then the utility brain', () => {
    const { brain } = brainFor({ tier: 10, openings: ['train:ranged', 'train:infantry'] });
    const first = decide(brain, observation({ tick: 10, gold: 175 * MILLI }));
    expect(first).toMatchObject({ reason: 'opening', action: { kind: 'train', card: 'pebbler' } });
    const second = decide(brain, observation({ tick: 30, gold: 100 * MILLI }));
    expect(second).toMatchObject({ reason: 'opening', action: { kind: 'train', card: 'bonker' } });
    expect(brain.inOpening).toBe(false);
  });

  it('waits for an unaffordable step and abandons the opening under pressure', () => {
    const { brain } = brainFor({ tier: 10, openings: ['treasury', 'train:infantry'] });
    expect(decide(brain, observation({ tick: 10, gold: 100 * MILLI })).action).toBeNull();
    expect(brain.inOpening).toBe(true);
    const units = [unit(0, 'tuskback', 200), unit(0, 'tuskback', 230), unit(0, 'tuskback', 260)];
    decide(brain, observation({ tick: 20, gold: 100 * MILLI, units }));
    expect(brain.inOpening).toBe(false);
  });
});

describe('answers to spam (A16.3)', () => {
  const heavies = (p: number) => [unit(0, 'tuskback', p), unit(0, 'tuskback', p + 20)];

  it('rule 1: saves for an unaffordable counter instead of answering with what it can afford', () => {
    const { brain } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    // 90 gold: Bonker and Pebbler are affordable, the Spear Hunter (100) is the counter to Heavies.
    const t = decide(brain, observation({ tick: 5000, gold: 90 * MILLI, units: heavies(700) }));
    expect(t.goal).toEqual({ kind: 'counter', amount: 100 * MILLI, card: 'spear_hunter' });
    expect(t.action?.kind === 'train' && t.action.card !== 'spear_hunter').toBe(false);
    // Once affordable, the counter is trained.
    const t2 = decide(brain, observation({ tick: 5040, gold: 105 * MILLI, units: heavies(650) }));
    expect(t2.action).toMatchObject({ kind: 'train', card: 'spear_hunter' });
  });

  it('rule 1: an unaffordable card is never trained, and the goal lapses after 8 s or with a foe at 300 lu', () => {
    const { brain } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    decide(brain, observation({ tick: 5000, gold: 90 * MILLI, units: heavies(700) }));
    const still = decide(brain, observation({ tick: 5100, gold: 90 * MILLI, units: heavies(700) }));
    expect(still.goal?.kind).toBe('counter');
    for (const c of still.candidates) if (c.action.kind === 'train') expect(c.action.cost).toBeLessThanOrEqual(90 * MILLI);
    // 8 s later (160 ticks) the goal is gone (a fresh one may be set only by a new decision to save).
    const { brain: b2 } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    decide(b2, observation({ tick: 5000, gold: 90 * MILLI, units: heavies(700) }));
    const close = decide(b2, observation({ tick: 5020, gold: 90 * MILLI, units: heavies(280) }));
    expect(close.goal).toBeNull();
    expect(close.action?.kind).toBe('train');
  });

  it('rule 1: no counter goal once the counter is affordable', () => {
    const { brain } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    const t = decide(brain, observation({ tick: 5000, gold: 120 * MILLI, units: heavies(700) }));
    expect(t.goal).toBeNull();
  });

  it('rule 3: the counter weight grows smoothly with the largest role-group share (×1 at 40%, ×1.5 at 60%, ×2 at 80%+)', () => {
    const u = (group: 'heavy' | 'infantry' | 'ranged', value: number) => ({ value, def: { group } });
    expect(monoFactorBp([])).toBe(10000);
    expect(monoFactorBp([u('heavy', 40), u('infantry', 30), u('ranged', 30)])).toBe(10000);
    expect(monoFactorBp([u('heavy', 60), u('infantry', 40)])).toBe(15000);
    expect(monoFactorBp([u('heavy', 80), u('infantry', 20)])).toBe(20000);
    expect(monoFactorBp([u('heavy', 100)])).toBe(20000);
    // No cliff: 50% gives ×1.25.
    expect(monoFactorBp([u('heavy', 50), u('infantry', 50)])).toBe(12500);
  });

  it('rule 3: against a one-type army the float target shrinks, so the bot answers sooner', () => {
    // Tier 0 floats to 450; against pure Heavies (×2) the target is 225.
    const { brain } = brainFor({ tier: 3, tierOverride: { treasuryMax: 0 } });
    decide(brain, observation({ tick: 100, gold: 20 * MILLI }));
    const t = decide(brain, observation({ tick: 5000, gold: 200 * MILLI, units: heavies(900) }));
    expect(t.spending).toBe(true);
  });

  it('rule 4: no Legendary saving goal while the push gate fails', () => {
    const tray = ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'mammoth_matriarch'];
    const foe = { turrets: [{ card: 'rock_tosser', age: 'stone' as const }, null, null, null] as Observation['foe']['turrets'] };
    const { brain } = brainFor({ tier: 7, weights: { legendary: 90 }, tierOverride: { treasuryMax: 0 } });
    const t = decide(brain, observation({ tick: 1000, gold: 300 * MILLI, tray, foe }));
    expect(t.pushOk).toBe(false);
    expect(t.goal).toBeNull();
  });
});
