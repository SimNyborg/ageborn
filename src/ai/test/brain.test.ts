import { describe, expect, it } from 'vitest';
import type { Observation } from '@/contracts';
import { LANE_MLU, MILLI as MLU, seedSfc32 } from '@/core';
import { cardBook } from '../book';
import { Brain, heavyDominant, monoFactorBp, type DecisionTrace } from '../brain';
import { Ledger } from '../ledger';
import { BotMemory } from '../memory';
import { BALANCED_WEIGHTS, personalityFor, weightsBp, type Weights } from '../personalities';
import { SCORE } from '../scoring';
import { tierParams, type TierParams } from '../tiers';
import { buildView } from '../view';
import { AGES, content, observation, unit } from './helpers';

/** Lane length in lu (A17.2). */
const L = LANE_MLU / MLU;

/**
 * The ROI tests below were written for Meteor Shower at 100 gold and cap 4 (before the MVP power trim:
 * 125 gold, cap 3); the book and the observations keep those numbers so the arithmetic in the comments holds.
 */
const ROI_POWER = { cost: 100, maxTargets: 4 };
const book = cardBook({ ...content, powers: { ...content.powers, meteor_shower: { ...content.powers.meteor_shower!, ...ROI_POWER } } });
const MILLI = 1000;

interface BrainOptions {
  tier?: number;
  tierOverride?: Partial<TierParams>;
  general?: string;
  weights?: Partial<Weights>;
  openings?: string[];
  seed?: string;
}

/**
 * A brain with mistakes off unless the test turns them on, and no opening unless given. The War Council
 * items other than the Economy income picks (A18.5.8) are off unless the test sets `researchFromTicks`.
 */
function brainFor(o: BrainOptions = {}): { brain: Brain; tier: TierParams } {
  const tier = { ...tierParams(o.tier ?? 10), mistakeBp: 0, researchFromTicks: 1_000_000_000, ...o.tierOverride };
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

/** Candidate action kinds; an Economy income research (the Treasury before A18.5.4) reads `treasury`. */
const kinds = (t: DecisionTrace): string[] =>
  t.candidates.map((c) => (c.action.kind === 'research' && c.action.pick.track === 'economy' ? 'treasury' : c.action.kind));
/** The Granary research (the first Economy income pick, 150 gold; A18.5.4). */
const GRANARY = { kind: 'research', cost: 150 * MILLI, pick: { id: 'economy.granary' } };

/** The upper-tier craft (owner feedback 2026-09-28) switched off, for tests of the plain A7.2/A7.3 rules. */
const NO_CRAFT: Partial<TierParams> = { econPlan: false, waveCommit: false, baseTurrets: 0 };

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
    // A Bonker (70 lu/s × 1.25 march = 87 lu/s, A17.2) at 500 lu: outside 300 lu now, but tier VII sees it
    // 0.5 s late and the Ascension takes 2.5 s, so it would be within 300 lu (500 − 87 × 3.05 = 234) before
    // the ageUp.
    // Decided 1 s after XP filled, inside the 2 s cap.
    const near = [unit(0, 'bonker', 500)];
    const t7 = decide(brainFor({ tier: 7 }).brain, ready(30, { units: near }), { history: [ready(10, { units: near })] });
    expect(kinds(t7)).not.toContain('evolve');
    // Tier V has no safety check at all.
    const t5 = decide(brainFor({ tier: 5 }).brain, ready(100, { units: near }), { history: [ready(10, { units: near })] });
    expect(t5.action).toEqual({ kind: 'evolve' });
    // 100 lu further out the window is open for tier VII too (600 − 265 = 335).
    const far = [unit(0, 'bonker', 600)];
    expect(decide(brainFor({ tier: 7 }).brain, ready(30, { units: far }), { history: [ready(10, { units: far })] }).action).toEqual({ kind: 'evolve' });
    // Air units never block the window.
    const air = [unit(0, 'bonker', 350, { air: true })];
    expect(decide(brainFor({ tier: 10 }).brain, ready(12, { units: air }), { history: [ready(10, { units: air })] }).action).toEqual({ kind: 'evolve' });
  });

  it('casts a power whose ROI clears the bar before evolving (the new slot keeps at most 75%)', () => {
    // Four weakened Bonkers: Meteor Shower kills them (4 × 65 = 260 gold for 100 → ROI 26,000).
    const units = [500, 510, 520, 530].map((p) => unit(0, 'bonker', p, { hp: 5000 }));
    const o = (tick: number) => ready(tick, { powerPpm: 1000000, gold: 1000 * MILLI, units, power: 'meteor_shower', powerCost: ROI_POWER.cost });
    const { brain } = brainFor();
    const t = decide(brain, o(40), { history: [o(10)] });
    expect(t.action?.kind).toBe('power');
    expect(t.candidates[0]?.score).toBe(SCORE.power);
  });
});

describe('power (A2.9.9)', () => {
  // Meteor Shower: Home bombard, 100 gold, cap 5, ~140 damage per touched unit at L1.
  const power = 'meteor_shower';
  const gold = 1000 * MILLI;
  /** Bonkers on the bot's half; `hp` in centi (a 100 HP Bonker dies to 140, a 400 HP one takes chip damage). */
  const crowd = (n: number, hp = 10000, at = 500) => Array.from({ length: n }, (_, i) => unit(0, 'bonker', at + i * 10, { hp }));
  const obs = (units: ReturnType<typeof unit>[], o: Parameters<typeof observation>[0] = {}) => observation({ powerPpm: 1000000, power, powerCost: ROI_POWER.cost, gold, units, ...o });
  const castsAt = (tier: number, o: Observation, extra: Partial<TierParams> = {}, general?: string) =>
    kinds(decide(brainFor({ tier, tierOverride: extra, ...(general ? { general } : {}) }).brain, o)).includes('power');

  it('casts when value × 10,000 ÷ cost clears the tier ROI bar', () => {
    // Two kills (2 × 65) and a full-HP Bonker (0.4 × 50 × 140 / 400 = 7): 137 gold → ROI 13,700.
    const units = [...crowd(2), unit(0, 'bonker', 530, { hp: 40000 })];
    expect(castsAt(5, obs(units))).toBe(true); // bar 12,000
    expect(castsAt(7, obs(units))).toBe(false); // bar 15,000
    // Four kills: 260 → ROI 26,000 clears X's 18,000.
    expect(castsAt(10, obs(crowd(4)))).toBe(true);
  });

  it('easy tiers waste casts on chip damage; better tiers wait for kills', () => {
    // Five Bonkers at 180 HP, Meteor Shower caps at 4: 4 × 0.4 × 50 × 140 / 180 = 62 gold → ROI 6,222.
    const units = crowd(5, 18000);
    expect(castsAt(0, obs(units))).toBe(true); // bar 6,000
    expect(castsAt(1, obs(units))).toBe(false); // bar 8,000
    expect(castsAt(5, obs(units))).toBe(false);
  });

  it('the power patience weight shifts the bar by (w − 50) × 40', () => {
    // ROI 13,700 vs tier V 12,000: patience 95 adds 1,800 → 13,800, which it no longer clears.
    const units = [...crowd(2), unit(0, 'bonker', 530, { hp: 40000 })];
    const patient = brainFor({ tier: 5, weights: { patience: 95 } }).brain;
    expect(kinds(decide(patient, obs(units)))).not.toContain('power');
    const { brain: plain6 } = brainFor({ tier: 6 }); // 13,500
    expect(kinds(decide(plain6, obs(units)))).toContain('power');
    const patient6 = brainFor({ tier: 6, weights: { patience: 95 } }).brain; // 15,300
    expect(kinds(decide(patient6, obs(units)))).not.toContain('power');
    const eager = brainFor({ tier: 6, weights: { patience: 0 } }).brain; // 13,500 − 2,000
    expect(kinds(decide(eager, obs(units)))).toContain('power');
  });

  it('never counts enemies past the Home line for a Home power', () => {
    expect(castsAt(0, obs(crowd(5, 10000, 1100)))).toBe(false);
  });

  it('casts whatever the bar when the own base took damage in the last 3 s and the value is ≥ 100', () => {
    const units = [...crowd(2), unit(0, 'bonker', 530, { hp: 40000 })];
    const t = decide(brainFor({ tier: 10 }).brain, obs(units, { tick: 50, baseHpBp: 9000 }), { history: [obs(units, { tick: 20, baseHpBp: 10000 })] });
    expect(t.action?.kind).toBe('power');
  });

  it('tier X casts on any value while its own base is below 25%; lower tiers keep their bar', () => {
    // Five full-HP Bonkers: ROI 7,000, far below X's 18,000.
    const units = crowd(5, 20000);
    expect(castsAt(10, obs(units))).toBe(false);
    expect(castsAt(10, obs(units, { baseHpBp: 2000 }))).toBe(true);
    expect(castsAt(7, obs(units, { baseHpBp: 2000 }))).toBe(false);
  });

  it('never offers a cast with nothing to act on, whatever the override', () => {
    // No enemy on the lane: auto-aim would meet powerNoTarget (A2.9.4), so no tier casts, not even X at 20%.
    expect(castsAt(0, obs([], { baseHpBp: 2000 }))).toBe(false);
    expect(castsAt(10, obs([], { baseHpBp: 2000 }))).toBe(false);
  });

  it('bait discipline (VII+): no Home cast on covered targets worth < 200 unless the base was just hit', () => {
    // Three dying Bonkers (150 card value): ROI 19,500 clears VII's bar, but it is a bait.
    expect(castsAt(5, obs(crowd(3)))).toBe(true);
    expect(castsAt(7, obs(crowd(3)))).toBe(false);
    expect(castsAt(7, obs(crowd(4)))).toBe(true);
    const t = decide(brainFor({ tier: 7 }).brain, obs(crowd(3), { tick: 50, baseHpBp: 9000 }), { history: [obs(crowd(3), { tick: 20, baseHpBp: 10000 })] });
    expect(kinds(t)).toContain('power');
  });

  it('pays the effective cost: an unaffordable slot is never a candidate, and a pending cast books its gold', () => {
    expect(castsAt(5, obs(crowd(4), { gold: 99 * MILLI }))).toBe(false);
    const { brain } = brainFor({ tier: 5 });
    const t = decide(brain, obs(crowd(4)));
    const a = t.action;
    expect(a?.kind).toBe('power');
    if (a?.kind === 'power') {
      expect(a.cost).toBe(100 * MILLI);
      expect(a.slot).toBe('home');
      // Aimed inside the Home band: [150, 1,000 − 200].
      expect(a.p).not.toBeNull();
      expect(a.p ?? 0).toBeGreaterThanOrEqual(150);
      expect(a.p ?? 0).toBeLessThanOrEqual(800);
      const ledger = new Ledger(book);
      ledger.record(a, 106, 107);
      const v = buildView(obs(crowd(4)), 106, book, ledger);
      expect(v.gold).toBe(gold - 100 * MILLI);
      expect(v.powerSlots).toEqual([]);
    }
  });

  it('tiers 0-II keep to the Home slot', () => {
    // Stampede (Field charge): own front at 400, four dying Bonkers in its run.
    const units = [unit(1, 'bonker', 400), ...crowd(4, 5000, 450)];
    const o = observation({ powerPpm: 1000000, power: 'stampede', gold, units });
    expect(castsAt(2, o, { powerRoiBp: 0 })).toBe(false);
    expect(castsAt(3, o)).toBe(true);
  });

  it('aims area powers within the tier aim error, clamped into the reach band', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const { brain } = brainFor({ tier: 0 });
      const t = decide(brain, obs(crowd(4)), { rng: seed });
      const a = t.action;
      expect(a?.kind).toBe('power');
      if (a?.kind === 'power' && a.p !== null) {
        expect(a.p).toBeGreaterThanOrEqual(150);
        expect(a.p).toBeLessThanOrEqual(800);
        expect(Math.abs(a.p - 515)).toBeLessThanOrEqual(250 + 200);
      }
    }
  });

  it('takes the slot with the best value − cost when both are castable', () => {
    // Home Meteor Shower on three dying Bonkers near the gate; Field Stampede only reaches one of them.
    const units = [unit(1, 'bonker', 800), ...crowd(3, 5000, 400), unit(0, 'bonker', 850, { hp: 5000 })];
    const powers: Observation['me']['powers'] = {
      home: { card: 'meteor_shower', ppm: 1000000, cost: 100, reloadMs: 40000, rateBp: 10000 },
      field: { card: 'stampede', ppm: 1000000, cost: 100, reloadMs: 40000, rateBp: 10000 },
    };
    const t = decide(brainFor({ tier: 3 }).brain, observation({ powers, gold, units }));
    const a = t.action;
    expect(a?.kind).toBe('power');
    if (a?.kind === 'power') expect(a.slot).toBe('home');
  });

  it('reads the enemy rings (V+): a ready, scouted enemy Home bombard or sweep stiffens the push gate', () => {
    // D = 300 (one enemy turret); 8 own Bonkers (400) clear 1.3 × D = 390 but not × 1.2 = 468.
    // Six enemy Bonkers at 1,400 (outside their gate zone) keep the thin-army rule out of it.
    const mine = [...Array.from({ length: 8 }, (_, i) => unit(1, 'bonker', 700 + i * 10)), ...Array.from({ length: 6 }, (_, i) => unit(0, 'bonker', 1400 + i * 5))];
    const foe = (ppm: number): Partial<Observation['foe']> => ({
      turrets: [{ card: 'rock_tosser', age: 'stone' }, null, null, null],
      powers: { home: { card: 'rockslide', ppm }, field: { card: null, ppm: 0 } },
    });
    const at = (tier: number, ppm: number) => decide(brainFor({ tier, tierOverride: NO_CRAFT }).brain, observation({ tick: 900, units: mine, foe: foe(ppm) })).pushOk;
    expect(at(5, 500000)).toBe(true);
    expect(at(5, 1000000)).toBe(false);
    expect(at(4, 1000000)).toBe(true);
  });

  it('bait, then wave (VII+): sends only cheap bait while the enemy Home power is up, then releases the bank', () => {
    const foe: Partial<Observation['foe']> = {
      turrets: [{ card: 'rock_tosser', age: 'stone' }, null, null, null],
      powers: { home: { card: 'rockslide', ppm: 1000000 }, field: { card: null, ppm: 0 } },
    };
    const { brain } = brainFor({ tier: 7, tierOverride: { treasuryMax: 0 } });
    const mem = new BotMemory(book);
    // No enemy turret, so the gate passes: with 250 in hand (the bait bank is 300) the bank still comes
    // first (nothing is trained), while tier V, which does not bait, trains.
    const open: Partial<Observation['foe']> = { powers: foe.powers! };
    expect(kinds(decide(brainFor({ tier: 7, tierOverride: { treasuryMax: 0 } }).brain, observation({ tick: 900, gold: 250 * MILLI, foe: open })))).not.toContain('train');
    expect(kinds(decide(brainFor({ tier: 5, tierOverride: { treasuryMax: 0 } }).brain, observation({ tick: 900, gold: 250 * MILLI, foe: open })))).toContain('train');
    const o1 = observation({ tick: 900, gold: 600 * MILLI, foe });
    const t1 = decide(brain, o1, { memory: mem });
    // The bait is the cheapest tray unit (the Bonker, 50), and nothing else is bought.
    expect(t1.action).toMatchObject({ kind: 'train', card: 'bonker' });
    expect(kinds(t1).filter((k) => k !== 'train' && k !== 'stance')).toEqual([]);
    // Once 150 gold of bait is out, it trains nothing more while it waits.
    const again = (tick: number) => decide(brain, observation({ tick, gold: 550 * MILLI, foe }), { memory: mem });
    again(920);
    again(940);
    expect(kinds(again(960))).not.toContain('train');
    // The enemy casts its Home power (its telegraph shows): the bank is released into the wave.
    const cast = observation({ tick: 980, gold: 450 * MILLI, foe: { ...foe, powers: { home: { card: 'rockslide', ppm: 0 }, field: { card: null, ppm: 0 } } }, telegraphs: [{ side: 0, slot: 'home', power: 'rockslide', p: 1500000, zone: 450000, impactTick: 1000, targetId: -1 }] });
    const t2 = decide(brain, cast, { memory: mem });
    expect(kinds(t2).filter((k) => k === 'train').length).toBeGreaterThan(1);
  });

  it('bait, then wave also goes into a full ring whose card is not scouted yet', () => {
    const foe: Partial<Observation['foe']> = { powers: { home: { card: null, ppm: 1000000 }, field: { card: null, ppm: 0 } } };
    const t = decide(brainFor({ tier: 7, tierOverride: { treasuryMax: 0 } }).brain, observation({ tick: 900, gold: 600 * MILLI, foe }));
    expect(t.action).toMatchObject({ kind: 'train', card: 'bonker' });
  });

  it('counter-timing (X): the Home bar rises by 3,000 while the enemy banks', () => {
    // Three kills and chip damage on a fourth: ROI 20,200 clears X's 18,000, not 21,000. The enemy army
    // is 200 gold (< 300); the gold estimate says whether it is banking.
    const units = crowd(3, 5000, 600).concat([unit(0, 'bonker', 700, { hp: 40000 })]);
    const o = obs(units, { tick: 1200 });
    const mem = new BotMemory(book);
    mem.estimator.gold = 500 * MILLI;
    expect(kinds(decide(brainFor({ tier: 10 }).brain, o, { memory: mem }))).not.toContain('power');
    const poor = new BotMemory(book);
    poor.estimator.gold = 0;
    expect(kinds(decide(brainFor({ tier: 10 }).brain, o, { memory: poor }))).toContain('power');
  });

  it('offers the "power on a unit or two" mistake below the bar', () => {
    const units = crowd(1, 20000);
    let seen = false;
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) {
      const t = decide(brainFor({ tier: 5, tierOverride: { mistakeBp: 10000 }, seed }).brain, obs(units), { rng: seed });
      if (t.mistake === 'powerOnFew') {
        seen = true;
        expect(t.action?.kind).toBe('power');
      }
    }
    expect(seen).toBe(true);
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
    expect(t.goal).toEqual({ kind: 'treasury', amount: 150 * MILLI });
    // A18.4.2: tier V moves the flag; with no army out it stays at the default (320).
    expect(t.action).toEqual({ kind: 'stance', stance: 'hold' });
    expect(kinds(t)).not.toContain('train');
  });

  it('never holds below tier V, and never while the stance is locked', () => {
    expect(kinds(decide(brainFor({ tier: 4 }).brain, observation({ tick: 400, foe: foeTurret })))).not.toContain('stance');
    expect(kinds(decide(brainFor({ tier: 5, openings: ['rule:noStance'] }).brain, observation({ tick: 400, foe: foeTurret })))).not.toContain('stance');
  });

  it('spends the bank in one wave once the gold lifts the army over the gate', () => {
    const { brain } = brainFor({ tier: 7, tierOverride: { treasuryMax: 0, ...NO_CRAFT } });
    // D = 300 → the gate needs 390; 420 gold is enough for a wave.
    const t = decide(brain, observation({ tick: 400, gold: 420 * MILLI, foe: foeTurret }));
    expect(t.pushOk).toBe(false);
    expect(t.banking).toBe(false);
    // It still holds at the line while the wave gathers; the trains are on the table.
    expect(t.action).toMatchObject({ kind: 'stance', stance: 'hold' });
    expect(kinds(t)).toContain('train');
  });

  it('counts enemy units within 500 lu of their gate in D, and never banks while the enemy is on its half', () => {
    const { brain } = brainFor({ tier: 5 });
    const t = decide(brain, observation({ tick: 700, units: [unit(0, 'bonker', L - 50), unit(0, 'tuskback', L - 550)] }));
    expect(t.defence).toBe(50);
    // A17.13: in the first 30 s freshly spawned units walking out of their gate zone are not defence.
    const { brain: early } = brainFor({ tier: 5 });
    expect(decide(early, observation({ tick: 400, units: [unit(0, 'bonker', L - 50)] })).defence).toBe(0);
    const { brain: b2 } = brainFor({ tier: 5 });
    const defending = decide(b2, observation({ tick: 400, foe: foeTurret, units: [unit(0, 'bonker', 500)] }));
    expect(defending.pushOk).toBe(false);
    expect(defending.banking).toBe(false);
  });

  it('counts a held enemy line in D, ×1.5 once it has been held for 20 s (a set ball, the flag_ball row)', () => {
    // Two Tuskbacks (150 each) holding in their own half, short of their gate zone (A18.12 flag_ball).
    const held = (tick: number, stance: 'hold' | 'charge' = 'hold') =>
      observation({ tick, foe: { stance, holdP: 800 }, units: [unit(0, 'tuskback', 1200), unit(0, 'tuskback', 1250)] });
    const { brain } = brainFor({ tier: 7 });
    expect(decide(brain, held(1000)).defence).toBe(300);
    expect(decide(brain, held(1300)).defence).toBe(300);
    expect(decide(brain, held(1400)).defence).toBe(450);
    // A charge in between starts the count again (a bot's pause between waves is not a ball).
    decide(brain, held(1420, 'charge'));
    expect(decide(brain, held(1440)).defence).toBe(300);
    // Below tier VI the held line is not read at all.
    const { brain: low } = brainFor({ tier: 5 });
    decide(low, held(1000));
    expect(decide(low, held(1400)).defence).toBe(0);
  });

  it('holds without turrets against a one-type army of 450+ gold when weaker (A17.13), not against a mix', () => {
    // Own army: one Bonker (50) on its side of the lane; foe: four Tuskbacks (600, all Heavy) on their half.
    const mine = unit(1, 'bonker', 400);
    const heavies = [0, 1, 2, 3].map((i) => unit(0, 'tuskback', L - 700 - i * 30));
    const { brain } = brainFor({ tier: 5 });
    expect(decide(brain, observation({ tick: 1200, units: [mine, ...heavies] })).action).toEqual({ kind: 'stance', stance: 'hold' });
    // A mixed army of the same value does not trigger it (no turrets, so the A7.3 Hold rule is off).
    const mixed = [unit(0, 'tuskback', L - 700), unit(0, 'tuskback', L - 730), unit(0, 'pebbler', L - 760), unit(0, 'pebbler', L - 780), unit(0, 'bonker', L - 800), unit(0, 'bonker', L - 820)];
    const { brain: b2 } = brainFor({ tier: 5 });
    expect(kinds(decide(b2, observation({ tick: 1200, units: [mine, ...mixed] })))).not.toContain('stance');
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
    expect(t.goal).toEqual({ kind: 'treasury', amount: 150 * MILLI });
    expect(t.action).toMatchObject(GRANARY);
  });

  it('does not buy Treasury late (3/5 of the Overdrive time: 7:12 in Full War), above the tier max, or with enemies on its own half (A17.13)', () => {
    expect(kinds(decide(brainFor({ tier: 7, tierOverride: NO_CRAFT }).brain, observation({ tick: 8700, gold: 600 * MILLI })))).not.toContain('treasury');
    // Before then it does.
    expect(kinds(decide(brainFor({ tier: 7, tierOverride: NO_CRAFT }).brain, observation({ tick: 8500, gold: 600 * MILLI })))).toContain('treasury');
    expect(kinds(decide(brainFor({ tier: 1 }).brain, observation({ tick: 600, gold: 600 * MILLI })))).not.toContain('treasury');
    expect(kinds(decide(brainFor({ tier: 7 }).brain, observation({ tick: 600, gold: 600 * MILLI, units: [unit(0, 'bonker', L / 2 - 50)] })))).not.toContain(
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
    const med = content.formats.full!.ages[2];
    expect(med).toBe('medieval');
    const t = decide(
      brain,
      observation({
        tick: 5000,
        ageIndex: 2,
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

  it('Ledger rushes the Economy income research (Granary, then Market) by 2:30 whatever its tier', () => {
    const w = content.generals as { list: Record<string, { weights: Weights }> };
    const { brain } = brainFor({ tier: 3, general: 'ledger', weights: w.list.ledger?.weights });
    const granary = { owned: ['economy.granary'], current: null, progressBp: 0, ranksOpen: 2 };
    const t = decide(brain, observation({ tick: 1000, gold: 400 * MILLI, treasury: 1, research: granary }));
    expect(t.goal).toEqual({ kind: 'treasury', amount: 300 * MILLI });
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
    const t = decide(brain, observation({ tick: 5000, gold: 90 * MILLI, units: heavies(L - 500) }));
    expect(t.goal).toEqual({ kind: 'counter', amount: 100 * MILLI, card: 'spear_hunter' });
    expect(t.action?.kind === 'train' && t.action.card !== 'spear_hunter').toBe(false);
    // Once affordable, the counter is trained.
    const t2 = decide(brain, observation({ tick: 5040, gold: 105 * MILLI, units: heavies(L - 550) }));
    expect(t2.action).toMatchObject({ kind: 'train', card: 'spear_hunter' });
  });

  it('rule 1: an unaffordable card is never trained, and the goal lapses after 8 s or with a foe at 300 lu', () => {
    const { brain } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    decide(brain, observation({ tick: 5000, gold: 90 * MILLI, units: heavies(700) }));
    const still = decide(brain, observation({ tick: 5100, gold: 90 * MILLI, units: heavies(700) }));
    expect(still.goal?.kind).toBe('counter');
    for (const c of still.candidates) if (c.action.kind === 'train') expect(c.action.cost).toBeLessThanOrEqual(90 * MILLI);
    // A mixed army (Heavies below half its value) at 280 lu: the goal lapses and the bot trains.
    const mixed = [...heavies(700), ...[0, 1, 2, 3, 4, 5, 6].map((i) => unit(0, 'bonker', 280 + i * 10))];
    const { brain: b2 } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    decide(b2, observation({ tick: 5000, gold: 90 * MILLI, units: heavies(700) }));
    const close = decide(b2, observation({ tick: 5020, gold: 90 * MILLI, units: mixed }));
    expect(close.goal).toBeNull();
    expect(close.action?.kind).toBe('train');
  });

  it('A7.2 "Answer Heavy with Anti-heavy": Heavies at the gate keep the bot banking and never draw a trickle', () => {
    // Two Tuskbacks camp 280 lu from the gate: the bot banks (for a first turret on its free mount,
    // then for the counter) instead of sending the one Bonker it can afford into them.
    const { brain } = brainFor({ tier: 10, tierOverride: { treasuryMax: 0, goldFloat: 0 } });
    decide(brain, observation({ tick: 5000, gold: 90 * MILLI, units: heavies(700) }));
    const camp = decide(brain, observation({ tick: 5020, gold: 90 * MILLI, units: heavies(280) }));
    expect(camp.goal).not.toBeNull();
    expect(['turret', 'counter']).toContain(camp.goal?.kind);
    expect(camp.candidates.filter((c) => c.action.kind === 'train' && c.action.card === 'bonker')).toEqual([]);
    // The trigger: Heavies are at least half the visible value and the army is worth 300 or more.
    expect(heavyDominant(heavies(280).map((u) => ({ value: 150, def: content.units[u.card] })))).toBe(true);
    expect(heavyDominant([{ value: 150, def: content.units['tuskback'] }])).toBe(false);
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

describe('upper-tier craft (owner feedback 2026-09-28)', () => {
  const foeTurret = { turrets: [{ card: 'rock_tosser', age: 'stone' as const }, null, null, null] };

  it('waves: needs a 15% margin over the gate to go, then keeps charging until half the wave is lost or it is worth less than D', () => {
    const { brain } = brainFor({ tier: 7, tierOverride: { treasuryMax: 0, punishThin: false } });
    const army = (n: number) => Array.from({ length: n }, (_, i) => unit(1, 'bonker', 300 + i * 10));
    // D = 300, gate ×1.3 = 390; 8 Bonkers (400) pass the plain gate but not the 15% margin (448).
    expect(decide(brain, observation({ tick: 1000, units: army(8), foe: foeTurret })).pushOk).toBe(false);
    // 9 Bonkers (450) start a wave ...
    expect(decide(brain, observation({ tick: 1010, units: army(9), foe: foeTurret })).pushOk).toBe(true);
    // ... that keeps going at 7 (350 ≥ half of 450 and ≥ D), though the plain gate would now fail ...
    expect(decide(brain, observation({ tick: 1020, units: army(7), foe: foeTurret })).pushOk).toBe(true);
    // ... and ends at 5 (250 < D = 300; A18 retune).
    expect(decide(brain, observation({ tick: 1030, units: army(5), foe: foeTurret })).pushOk).toBe(false);
    // Without the craft (tier V) the plain gate flips at once.
    const { brain: plain } = brainFor({ tier: 5 });
    expect(decide(plain, observation({ tick: 1000, units: army(8), foe: foeTurret })).pushOk).toBe(true);
  });

  it('buys Treasury late (after 7:12 in Full War) against a passive foe while it pays back within 4:00; tier V does not', () => {
    // No enemy has been on the bot's half since the start: a passive foe. (An own unit past mid-lane a
    // moment ago keeps the attack clock at ×1.)
    const history = [observation({ tick: 8650, units: [unit(1, 'bonker', L / 2 + 100)] })];
    expect(decide(brainFor({ tier: 7 }).brain, observation({ tick: 8700, gold: 600 * MILLI }), { history }).action).toMatchObject(GRANARY);
    expect(kinds(decide(brainFor({ tier: 5 }).brain, observation({ tick: 8700, gold: 600 * MILLI })))).not.toContain('treasury');
    // Both income picks owned (Granary, Market): nothing left to buy.
    const both = { owned: ['economy.granary', 'economy.market'], current: null, progressBp: 0, ranksOpen: 2 };
    expect(kinds(decide(brainFor({ tier: 7 }).brain, observation({ tick: 8700, gold: 900 * MILLI, treasury: 2, research: both })))).not.toContain('treasury');
    // A foe on the bot's half in the last 20 s is not passive.
    const mem = new BotMemory(book);
    const raid = observation({ tick: 8400, units: [unit(0, 'bonker', 700)] });
    expect(kinds(decide(brainFor({ tier: 7 }).brain, observation({ tick: 8700, gold: 600 * MILLI }), { history: [raid], memory: mem }))).not.toContain('treasury');
    // Not in Overdrive.
    expect(kinds(decide(brainFor({ tier: 7 }).brain, observation({ tick: 8700, phase: 'overdrive', gold: 600 * MILLI })))).not.toContain('treasury');
  });

  it('does not spend a Treasury goal into a push-gate wave', () => {
    // Tier VII, D = 300: 180 gold would be a wave for the plain rule, but the bot banks for the level.
    const t = decide(brainFor({ tier: 7 }).brain, observation({ tick: 400, gold: 180 * MILLI, foe: foeTurret }));
    expect(t.goal).toEqual({ kind: 'treasury', amount: 150 * MILLI });
    expect(kinds(t)).not.toContain('train');
  });

  it('keeps base turrets from Bronze on without pressure (1 from tier VI, 2 from VIII)', () => {
    const bronze = baselineTurretsObs();
    const history = [observation({ tick: 2350, units: [unit(1, 'bonker', L / 2 + 100)] })];
    const t8 = decide(brainFor({ tier: 8, tierOverride: { treasuryMax: 0 } }).brain, bronze, { history });
    expect(t8.action?.kind).toBe('build');
    const t5 = decide(brainFor({ tier: 5, tierOverride: { treasuryMax: 0 } }).brain, bronze, { history });
    expect(kinds(t5).includes('build') && t5.action?.kind === 'build').toBe(false);
  });

  it('turns the craft on from tier VI', () => {
    expect(tierParams(5)).toMatchObject({ econPlan: false, waveCommit: false, baseTurrets: 0 });
    expect(tierParams(6)).toMatchObject({ econPlan: true, waveCommit: true, baseTurrets: 1 });
    expect(tierParams(8)).toMatchObject({ baseTurrets: 2 });
    expect(tierParams(10)).toMatchObject({ baseTurrets: 2 });
  });
});

/** Bronze Age, 400 gold, one owned mount, no enemy anywhere. */
function baselineTurretsObs(): Observation {
  const bronze = AGES[1] as 'bronze';
  const units = Object.values(content.units).filter((u) => u.age === bronze && !u.hidden && u.rarity === 'common');
  const turrets = Object.values(content.turrets).filter((u) => u.age === bronze && u.rarity === 'common');
  return observation({
    tick: 2400,
    ageIndex: 1,
    gold: 400 * MILLI,
    tray: units.slice(0, 5).map((u) => u.id),
    turretCards: turrets.slice(0, 2).map((u) => u.id),
  });
}

describe('War Council use (A18.5.8)', () => {
  const research = (t: DecisionTrace) => (t.action?.kind === 'research' ? t.action.pick : null);
  const RESEARCH_ON = { treasuryMax: 0, goldFloat: 0 };

  it('saves for a research item once the tier\'s time has come, then starts it', () => {
    const early = decide(brainFor({ tier: 7, tierOverride: { ...RESEARCH_ON, researchFromTicks: 600 } }).brain, observation({ tick: 400, gold: 400 * MILLI }));
    expect(early.goal?.kind === 'research').toBe(false);
    const { brain } = brainFor({ tier: 7, tierOverride: { ...RESEARCH_ON, researchFromTicks: 600 } });
    const t = decide(brain, observation({ tick: 700, gold: 400 * MILLI }));
    expect(t.goal?.kind).toBe('research');
    expect(research(t)?.rank).toBe(1);
    // the slot is busy while it runs: no second item
    const busy = { owned: [], current: research(t)?.id ?? '', progressBp: 100, ranksOpen: 1 };
    expect(kinds(decide(brain, observation({ tick: 900, gold: 900 * MILLI, research: busy })))).not.toContain('research');
  });

  it('opens Troops lines only for classes in its tray (research compatibility, A18.5.2)', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const { brain } = brainFor({ tier: 3, seed, tierOverride: { ...RESEARCH_ON, researchFromTicks: 0 } });
      const p = research(decide(brain, observation({ tick: 700, gold: 400 * MILLI, tray: ['bonker', 'pebbler', null, null, null] })));
      expect(p === null || p.group === null || p.group === 'infantry' || p.group === 'ranged', p?.id).toBe(true);
    }
  });

  it('counter scoring (tier V and up) answers what it sees: Heavies call for an anti-Heavy pick', () => {
    const heavy = Array.from({ length: 6 }, (_, i) => unit(0, 'tuskback', 1200 + i * 20));
    const { brain } = brainFor({ tier: 8, tierOverride: { ...RESEARCH_ON, researchFromTicks: 0 } });
    const tr = decide(brain, observation({ tick: 700, gold: 400 * MILLI, units: heavy }));
    // The planned item (bought now, or right after the Anti-heavy card it trains first, A7.2).
    const planned = tr.goal?.kind === 'research' ? content.research.picks.find((q) => q.id === (tr.goal as { pick: string }).pick) : research(tr);
    expect(planned?.aiHint).toBe('vsHeavy');
    // With an Anti-heavy card in the tray, the plan is its own Troops line (A7.2 "Answer Heavy").
    expect(planned?.group).toBe('antiArmor');
  });

  it('Mama Moss researches Defences first; Kettle never takes Forage', () => {
    const w = content.generals as { list: Record<string, { weights: Weights }> };
    const moss = brainFor({ tier: 6, general: 'moss', weights: w.list.moss?.weights, tierOverride: { ...RESEARCH_ON, researchFromTicks: 0 } }).brain;
    expect(research(decide(moss, observation({ tick: 700, gold: 400 * MILLI })))?.track).toBe('defences');
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const kettle = brainFor({ tier: 1, seed, general: 'kettle', weights: w.list.kettle?.weights, tierOverride: { ...RESEARCH_ON, researchFromTicks: 0 } }).brain;
      expect(research(decide(kettle, observation({ tick: 700, gold: 400 * MILLI })))?.id).not.toBe('economy.forage');
    }
  });

  it('tiers: first research 1:30 at 0-I, 1:00 at II-IV, 0:45 at V-VI, 0:30 from VII', () => {
    expect([0, 3, 6, 8].map((t) => tierParams(t).researchFromTicks)).toEqual([1800, 1200, 900, 600]);
    expect([0, 3, 6, 8].map((t) => tierParams(t).researchMode)).toEqual(['random', 'hint', 'counter', 'counter']);
  });
});
