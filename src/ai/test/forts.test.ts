/**
 * Forts for bots (DESIGN A16.14.7, spec section 9): kinds per tier and General, the fort view, the
 * planner (pads, ledger, waves, breakers, camps), push gate D, the structure row of the counter term,
 * memory and estimator exclusions, and real-sim matches in which bots place forts under the player's rules.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, CardId, FortKind, Loadout, Observation, ObservedFort, Side } from '@/contracts';
import { MILLI, seedSfc32 } from '@/core';
import { createSim } from '@/sim';
import { botFortCard, botProfile, createBot, fortKindsFor, runHeadless } from '@/ai';
import { cardBook } from '../book';
import { Brain, type DecisionTrace } from '../brain';
import { counterScore, counterTargets, sampleOfForts, sampleOfUnits } from '../counters';
import { FoeGoldEstimator } from '../estimate';
import { FORT_SCORE, fortDefence, fortGoal, planFort, type FortPlanInput } from '../forts';
import { Ledger } from '../ledger';
import { BotMemory } from '../memory';
import { pickMistake } from '../mistakes';
import { parseOpenings } from '../openings';
import { BALANCED_WEIGHTS, personalityFor, weightsBp } from '../personalities';
import { tierParams, type TierParams } from '../tiers';
import { buildView, type View } from '../view';
import { AGES, baselineLoadout, balanced, content, matchConfig, observation, sideConfig, unit } from './helpers';

const book = cardBook(content);
const LANE = 2000;

/** The Fort card of a kind in an age. */
function fortOf(age: AgeId, kind: FortKind): CardId {
  const f = Object.values(content.forts).find((x) => x.age === age && x.fortKind === kind);
  if (!f) throw new Error(`no ${kind} in ${age}`);
  return f.id;
}

/** The observed Fort slot: every Home pad legal and safe unless overridden. */
function fortSlot(card: CardId, o: Partial<ObservedFort> & { safe?: boolean[]; legal?: boolean[] } = {}): ObservedFort {
  const def = content.forts[card];
  const pads = [160, 230, 300, 640, 820].map((p, i) => {
    const home = i < 3;
    const kindOk = home || def?.pads === 'any';
    const legal = o.legal?.[i] ?? kindOk;
    return { p, kind: home ? ('home' as const) : ('field' as const), legal, safe: legal && (o.safe?.[i] ?? true), reason: legal ? null : 'fortPadKind', towerRange: 0 };
  });
  return { card, cost: def?.cost ?? 125, readyTicks: 0, alive: 0, campAlive: false, pads, ...o, ...(o.pads ? { pads: o.pads } : {}) };
}

/** An observation with a Fort slot (the bot is side 1, as in `observation`). */
function withFort(obs: Observation, fort: ObservedFort | null, extra: { traps?: Observation['traps']; foeFort?: Observation['foe']['fort'] } = {}): Observation {
  return { ...obs, me: { ...obs.me, fort }, foe: { ...obs.foe, fort: extra.foeFort ?? null }, traps: extra.traps ?? [] };
}

function view(obs: Observation, ledger = new Ledger(book)): View {
  return buildView(obs, obs.tick + 6, book, ledger);
}

function input(o: { tier?: number; general?: string; banking?: boolean; goal?: number | null; campAge?: number | null; force?: 'safe' | 'any' | null } = {}): FortPlanInput {
  return {
    book,
    tier: { ...tierParams(o.tier ?? 7), mistakeBp: 0 },
    persona: personalityFor(content, o.general ?? 'echo'),
    banking: o.banking ?? false,
    goal: o.goal ?? null,
    urgent: false,
    afterOpening: true,
    campAge: o.campAge ?? null,
    force: o.force ?? null,
  };
}

// Stone baselines: Infantry, Ranged and Heavy Commons (A5), and the levy of the War Camp.
const stone = baselineLoadout(content, 'stone');
const INF = stone.units[0] as CardId;
const RNG = stone.units[1] as CardId;
const HVY = stone.units[2] as CardId;
const LEVY = content.forts[fortOf('stone', 'camp')]?.camp?.spawn as CardId;

/** A non-breaker wave in the bot's half: Infantry and Ranged at p 700-900 (enemy side 0, bot side 1). */
function softWave(): Observation['units'] {
  return [unit(0, INF, 700), unit(0, INF, 720), unit(0, RNG, 800), unit(0, RNG, 820), unit(0, INF, 900), unit(0, RNG, 880)];
}

describe('fort kinds by tier and General (A16.14.7)', () => {
  it('0-I place none, II-IV walls and traps, V-X every kind; VII-X never while banking', () => {
    expect(tierParams(0).fortKinds).toEqual([]);
    expect(tierParams(1).fortKinds).toEqual([]);
    for (const t of [2, 3, 4]) expect([...tierParams(t).fortKinds].sort()).toEqual(['trap', 'wall']);
    for (const t of [5, 7, 10]) expect([...tierParams(t).fortKinds].sort()).toEqual(['camp', 'tower', 'trap', 'wall']);
    expect(tierParams(6).fortNoBank).toBe(false);
    expect(tierParams(7).fortNoBank).toBe(true);
  });

  it('a General adds its preferred kinds to a non-empty list and removes the ones it never uses', () => {
    const kinds = (tier: number, g: string): FortKind[] => [...fortKindsFor(tierParams(tier), personalityFor(content, g))].sort();
    expect(kinds(3, 'kettle')).toEqual(['camp', 'trap', 'wall']);
    expect(kinds(3, 'boomsworth')).toEqual(['tower', 'trap', 'wall']);
    expect(kinds(1, 'kettle')).toEqual([]);
    expect(kinds(7, 'ledger')).toEqual(['camp', 'trap', 'wall']);
    expect(kinds(4, 'warden')).toEqual(['camp', 'tower', 'trap', 'wall']);
  });

  it('botFortCard: the preferred kind within the source filter, else the wall; none below tier II', () => {
    expect(botFortCard(content, 'stone', { generalId: 'echo', tier: 7 })).toBe(fortOf('stone', 'wall'));
    expect(botFortCard(content, 'stone', { generalId: 'kettle', tier: 7 })).toBe(fortOf('stone', 'camp'));
    expect(botFortCard(content, 'bronze', { generalId: 'boomsworth', tier: 7 })).toBe(fortOf('bronze', 'tower'));
    expect(botFortCard(content, 'bronze', { generalId: 'boomsworth', tier: 7, allowed: () => false })).toBe(fortOf('bronze', 'wall'));
    expect(botFortCard(content, 'medieval', { generalId: 'moss', tier: 3 })).toBe(fortOf('medieval', 'wall'));
    expect(botFortCard(content, 'stone', { generalId: 'kettle', tier: 1 })).toBeNull();
  });
});

describe('the fort view (A16.14.7: forts apart from units)', () => {
  it('lists forts and traps apart, never as army, and values levies at their AI value with cap rank 1', () => {
    const wall = fortOf('stone', 'wall');
    const obs = withFort(
      observation({
        units: [
          { ...unit(1, wall, 300), fort: 'wall' },
          { ...unit(0, fortOf('stone', 'tower'), LANE - 230), fort: 'tower', scaffold: true },
          { ...unit(0, LEVY, 900), summoned: true },
          unit(0, INF, 950),
        ],
      }),
      fortSlot(wall),
      { traps: [{ id: 77, side: 0, card: fortOf('stone', 'trap'), p: (LANE - 160) * MILLI, armed: true, charges: 3 }] },
    );
    const v = view(obs);
    expect(v.myForts.map((f) => f.kind)).toEqual(['wall']);
    expect(v.foeForts.map((f) => [f.kind, f.scaffold])).toEqual([['tower', true]]);
    expect(v.foeTraps.map((t) => t.id)).toEqual([77]);
    expect(v.mine).toHaveLength(0);
    expect(v.myArmy).toBe(0);
    expect(v.foeArmy).toBe(book.units[INF]!.value + (book.units[LEVY]?.value ?? 0));
    const levy = v.foes.find((u) => u.card === LEVY)!;
    expect(levy.levy).toBe(true);
    expect(levy.capRank).toBe(1);
    expect(levy.value).toBe(content.units[LEVY]?.aiValue);
    // The power front never counts a fort.
    expect(v.powerFront).toBeNull();
  });

  it('a pending placement takes its pad and restarts the slot until the observation shows it', () => {
    const wall = fortOf('stone', 'wall');
    const obs = withFort(observation({ gold: 500 * MILLI }), fortSlot(wall));
    const ledger = new Ledger(book);
    ledger.record({ kind: 'fort', pad: 2, card: wall, cost: 125 * MILLI }, obs.tick + 6, obs.tick + 7);
    const v = view(obs, ledger);
    expect(v.fort?.ready).toBe(false);
    expect(v.fort?.alive).toBe(1);
    expect(v.fort?.pads[2]?.legal).toBe(false);
    expect(v.gold).toBe(375 * MILLI);
  });

  it('the slot reads ready when its recharge ends before a command issued now runs', () => {
    const wall = fortOf('stone', 'wall');
    expect(view(withFort(observation({}), fortSlot(wall, { readyTicks: 7 }))).fort?.ready).toBe(true);
    expect(view(withFort(observation({}), fortSlot(wall, { readyTicks: 8 }))).fort?.ready).toBe(false);
  });
});

describe('the fort planner (A16.14.7)', () => {
  const wall = fortOf('stone', 'wall');
  const gold = 400 * MILLI;

  it('places a wall on the most forward safe Home pad against a wave in its half', () => {
    const v = view(withFort(observation({ gold, units: softWave() }), fortSlot(wall, { safe: [true, true, false] })));
    const plan = planFort(v, input());
    expect(plan.action).toEqual({ kind: 'fort', pad: 1, card: wall, cost: 125 * MILLI });
    expect(plan.score).toBe(FORT_SCORE);
  });

  it('never in front of breakers: that is only the "wall in front of Heavies" mistake', () => {
    const heavy = [unit(0, HVY, 700), unit(0, HVY, 760), unit(0, HVY, 820), unit(0, INF, 900)];
    const v = view(withFort(observation({ gold, units: heavy }), fortSlot(wall)));
    const plan = planFort(v, input());
    expect(plan.action).toBeNull();
    expect(plan.inFrontOfHeavies?.kind).toBe('fort');
    expect(pickMistake(seedSfc32('m'), { fortInFrontOfHeavies: plan.inFrontOfHeavies! })).toEqual({ kind: 'fortInFrontOfHeavies', action: plan.inFrontOfHeavies });
  });

  it('waits for a real wave, a safe pad, the price plus the gold float, and never places in Siege', () => {
    const one = [unit(0, INF, 800)];
    expect(planFort(view(withFort(observation({ gold, units: one }), fortSlot(wall))), input()).action).toBeNull();
    // The bot's own army in its half outnumbers the wave (1.2 × rule).
    const mine = [unit(1, HVY, 600), unit(1, HVY, 620), unit(1, HVY, 640), unit(1, HVY, 660)];
    expect(planFort(view(withFort(observation({ gold, units: [...softWave(), ...mine] }), fortSlot(wall))), input()).action).toBeNull();
    expect(planFort(view(withFort(observation({ gold, units: softWave() }), fortSlot(wall, { safe: [false, false, false] }))), input()).action).toBeNull();
    const float = tierParams(7).goldFloat;
    expect(planFort(view(withFort(observation({ gold: (125 + float - 1) * MILLI, units: softWave() }), fortSlot(wall))), input()).action).toBeNull();
    expect(planFort(view(withFort(observation({ gold: (125 + float) * MILLI, units: softWave() }), fortSlot(wall))), input()).action).not.toBeNull();
    expect(planFort(view(withFort(observation({ gold, units: softWave(), phase: 'siege' }), fortSlot(wall))), input()).action).toBeNull();
  });

  it('with only a short-range turret built, reads the rear pad as it would with none (cover rule, A16.14.2)', () => {
    // The Pitch Cauldron (130 lu) puts the cover limit below pad 160, so the sim marks every Home pad unsafe.
    const turrets: Observation['me']['turrets'] = [{ card: 'pitch_cauldron', age: 'medieval' }, null, null, null];
    const unsafe = fortSlot(wall, { safe: [false, false, false] });
    // Stone Infantry walks 87 lu/s: 6 s (scaffold + 1 s) is 522 lu, so the wave is read just past mid-lane.
    // (MVP balance pass: walls go up once the wave is in the bot's half, so the wave stands just inside it.)
    const crossing = softWave().map((u) => ({ ...u, p: u.p + 80 * MILLI }));
    const far = view(withFort(observation({ gold, units: crossing, turrets }), unsafe));
    expect(planFort(far, input()).action).toEqual({ kind: 'fort', pad: 0, card: wall, cost: 125 * MILLI });
    // An enemy that would reach pad 160 before the scaffold completes keeps it unsafe.
    const near = view(withFort(observation({ gold, units: [...crossing, unit(0, INF, 350)], turrets }), unsafe));
    expect(planFort(near, input()).action).toBeNull();
  });

  it('obeys the tier: 0-I none, a tower needs V, VII+ keeps the gold for a banked wave', () => {
    const tower = fortOf('stone', 'tower');
    const mk = (card: CardId): View => view(withFort(observation({ gold, units: softWave() }), fortSlot(card)));
    expect(planFort(mk(wall), input({ tier: 1 })).action).toBeNull();
    expect(planFort(mk(wall), input({ tier: 3 })).action).not.toBeNull();
    expect(planFort(mk(tower), input({ tier: 4 })).action).toBeNull();
    expect(planFort(mk(tower), input({ tier: 5 })).action).not.toBeNull();
    expect(planFort(mk(wall), input({ tier: 6, banking: true })).action).not.toBeNull();
    expect(planFort(mk(wall), input({ tier: 7, banking: true })).action).toBeNull();
  });

  it('respects the caps: 2 alive, one camp, and room in the pop', () => {
    expect(planFort(view(withFort(observation({ gold, units: softWave() }), fortSlot(wall, { alive: 2 }))), input()).action).toBeNull();
    expect(planFort(view(withFort(observation({ gold, units: softWave(), pop: 58 }), fortSlot(wall))), input()).action).toBeNull();
    const camp = fortOf('stone', 'camp');
    const charging = [unit(1, INF, 600), unit(1, RNG, 560)];
    expect(planFort(view(withFort(observation({ gold, units: charging }), fortSlot(camp, { campAlive: true }))), input()).action).toBeNull();
  });

  it('a camp goes up while Charging with 2+ trained units, on the most forward safe pad, once per age', () => {
    const camp = fortOf('stone', 'camp');
    const charging = [unit(1, INF, 950), unit(1, RNG, 930)];
    const v = view(withFort(observation({ gold, units: charging }), fortSlot(camp, { safe: [true, true, true, true, false] })));
    const plan = planFort(v, input());
    expect(plan.action?.pad).toBe(3);
    expect(planFort(v, input({ campAge: v.ageIndex })).action).toBeNull();
    // Kettle keeps one up whenever none stands.
    expect(planFort(v, input({ general: 'kettle', campAge: v.ageIndex })).action?.pad).toBe(3);
    // Summons and levies are not trained units.
    const summoned = [{ ...unit(1, INF, 950), summoned: true }, unit(1, RNG, 930)];
    expect(planFort(view(withFort(observation({ gold, units: summoned }), fortSlot(camp))), input()).action).toBeNull();
    expect(planFort(view(withFort(observation({ gold, units: charging, stance: 'hold' }), fortSlot(camp))), input()).action).toBeNull();
  });

  it('a rejected camp command leaves the age camp unspent; a camp it sees go up spends it', () => {
    const camp = fortOf('stone', 'camp');
    const charging = [unit(1, INF, 950), unit(1, RNG, 930)];
    const brain = new Brain(
      { book, tier: { ...tierParams(7), mistakeBp: 0, researchFromTicks: 1e9 }, persona: personalityFor(content, 'echo'), weights: weightsBp(BALANCED_WEIGHTS), mistakeBonusBp: 0, openings: [] },
      seedSfc32('b'),
    );
    const offers = (units: Observation['units'], tick: number): boolean =>
      brain
        .decide(view(withFort(observation({ tick, gold, units }), fortSlot(camp, { safe: [true, true, true, true, false] }))), new BotMemory(book), seedSfc32('d'))
        .candidates.some((c) => c.action.kind === 'fort');
    expect(offers(charging, 1200)).toBe(true);
    // The command was rejected (no camp ever showed up): the next look still offers the camp.
    expect(offers(charging, 1260)).toBe(true);
    // Its camp is seen standing, then falls: once per age, so no second camp.
    const up = [...charging, { ...unit(1, camp, 1180), fort: 'camp' as const }];
    offers(up, 1300);
    expect(offers(charging, 1400)).toBe(false);
  });

  it('plans the gold in its ledger: a saving goal for a wave about to cross mid-lane', () => {
    const coming = [unit(0, INF, 1150), unit(0, INF, 1180), unit(0, RNG, 1200), unit(0, RNG, 1220), unit(0, INF, 1250), unit(0, RNG, 1240)];
    const g = fortGoal(view(withFort(observation({ gold: 0, units: coming }), fortSlot(wall))), input());
    expect(g).toEqual({ amount: (125 + tierParams(7).goldFloat) * MILLI, why: 'defend' });
    const brain = new Brain(
      { book, tier: { ...tierParams(7), mistakeBp: 0, researchFromTicks: 1e9 }, persona: personalityFor(content, 'echo'), weights: weightsBp(BALANCED_WEIGHTS), mistakeBonusBp: 0, openings: [] },
      seedSfc32('b'),
    );
    const obs = withFort(observation({ tick: 1200, gold: 100 * MILLI, units: coming }), fortSlot(wall));
    const t: DecisionTrace = brain.decide(view(obs), new BotMemory(book), seedSfc32('d'));
    expect(t.goal).toEqual({ kind: 'fort', amount: (125 + tierParams(7).goldFloat) * MILLI });
  });

  it('the brain picks the fort over training once the wave is in its half', () => {
    const brain = new Brain(
      { book, tier: { ...tierParams(7), mistakeBp: 0, researchFromTicks: 1e9 }, persona: personalityFor(content, 'echo'), weights: weightsBp(BALANCED_WEIGHTS), mistakeBonusBp: 0, openings: [] },
      seedSfc32('b'),
    );
    const obs = withFort(observation({ tick: 1200, gold, units: softWave() }), fortSlot(wall));
    const t = brain.decide(view(obs), new BotMemory(book), seedSfc32('d'));
    expect(t.action?.kind).toBe('fort');
    // The placebo rule never places, and the tools' forced rule places without a wave.
    const placebo = new Brain({ book, tier: tierParams(7), persona: personalityFor(content, 'echo'), weights: weightsBp(BALANCED_WEIGHTS), mistakeBonusBp: 0, openings: ['rule:noFort'] }, seedSfc32('b'));
    expect(placebo.decide(view(obs), new BotMemory(book), seedSfc32('d')).candidates.some((c) => c.action.kind === 'fort')).toBe(false);
    const quiet = withFort(observation({ tick: 1200, gold }), fortSlot(wall, { safe: [true, false, false] }));
    expect(planFort(view(quiet), input({ force: 'safe' })).action?.pad).toBe(0);
    expect(planFort(view(quiet), input({ force: 'any' })).action?.pad).toBe(2);
    expect(parseOpenings(['rule:fortForce:any', 'rule:noFort'], seedSfc32('o'))).toMatchObject({ fortForce: 'any', noFort: true });
  });
});

describe('answering forts (A16.14.7)', () => {
  it('push gate D: walls and towers near their gate count 2 × their price, camps and traps 1 ×', () => {
    const v = view(
      withFort(
        observation({
          units: [
            { ...unit(0, fortOf('stone', 'wall'), LANE - 300), fort: 'wall' },
            { ...unit(0, fortOf('stone', 'tower'), LANE - 160), fort: 'tower' },
            { ...unit(0, fortOf('stone', 'camp'), LANE - 820), fort: 'camp' },
          ],
        }),
        null,
        { traps: [{ id: 5, side: 0, card: fortOf('stone', 'trap'), p: (LANE - 230) * MILLI, armed: true, charges: 3 }] },
      ),
    );
    // The camp on a Field pad (820 from their gate) is outside 500 lu.
    expect(fortDefence(v.foeForts, v.foeTraps)).toBe(2 * 125 + 2 * 150 + 100);
  });

  it('the structure row: Heavies beat walls, air flies over them, ranged fire does half', () => {
    const wallSample = sampleOfForts([{ card: fortOf('stone', 'wall'), value: 125 }]);
    const heavy = counterScore(book, HVY, wallSample);
    const ranged = counterScore(book, RNG, wallSample);
    const infantry = counterScore(book, INF, wallSample);
    expect(heavy).toBe(10000);
    expect(infantry).toBe(5000);
    expect(ranged).toBe(2500);
    const air = Object.values(book.units).find((u) => u.air && !u.hidden && !u.breaker);
    if (air) {
      expect(counterScore(book, air.id, wallSample)).toBeGreaterThan(infantry);
      expect(counterScore(book, air.id, sampleOfForts([{ card: fortOf(air.age, 'tower'), value: 150 }]))).toBeLessThanOrEqual(5000);
    }
    // Siege-only units break forts too; every age's Heavy Common is a breaker (has-a-starter-answer).
    for (const age of AGES) expect(book.units[baselineLoadout(content, age).units[2] as CardId]?.breaker).toBe(true);
    // Mixed with units, a wall shifts the counter term toward Heavies.
    const units = sampleOfUnits(view(observation({ units: softWave() })).foes);
    expect(counterScore(book, HVY, [...units, ...wallSample])).toBeGreaterThan(counterScore(book, HVY, units));
  });
});

describe('memory and the gold estimate ignore forts and levies (A16.14.3)', () => {
  it('levies and forts never move the attack clock, the quiet-lane test or the composition memory', () => {
    const mem = new BotMemory(book);
    mem.observe(
      observation({
        tick: 400,
        units: [
          { ...unit(1, LEVY, 1500), summoned: true },
          { ...unit(1, fortOf('stone', 'camp'), 1180), fort: 'camp' },
          { ...unit(0, LEVY, 300), summoned: true },
          { ...unit(0, fortOf('stone', 'wall'), 700), fort: 'wall' },
        ],
      }),
    );
    expect(mem.pastMidTick).toBe(0);
    expect(mem.foeOnMyHalfTick).toBe(0);
    expect(mem.remembered()).toEqual([]);
    mem.observe(observation({ tick: 420, units: [unit(1, INF, 1500), unit(0, INF, 300)] }));
    expect(mem.pastMidTick).toBe(420);
    expect(mem.foeOnMyHalfTick).toBe(420);
  });

  it('other summons (an enemy paradrop past mid-lane, own riders) never move the clocks or the memory either', () => {
    const mem = new BotMemory(book);
    mem.observe(observation({ tick: 400, units: [{ ...unit(1, INF, 1500), summoned: true }, { ...unit(0, INF, 300), summoned: true }] }));
    expect(mem.pastMidTick).toBe(0);
    expect(mem.foeOnMyHalfTick).toBe(0);
    expect(mem.remembered()).toEqual([]);
    expect(counterTargets(view(observation({ units: [{ ...unit(1, INF, 1500), summoned: true }] })).foes, null, 0)).toEqual([]);
  });

  it('foe levies are free, foe traps and forts are paid at their price', () => {
    const est = new FoeGoldEstimator(book);
    est.observe(observation({ tick: 0, units: [{ ...unit(0, LEVY, 1800), summoned: true }] }));
    expect(est.spent).toBe(0);
    est.observe({ ...observation({ tick: 0 }), traps: [{ id: 9, side: 0, card: fortOf('stone', 'trap'), p: 1840 * MILLI, armed: false, charges: 3 }] });
    expect(est.spent).toBe(100 * MILLI);
    est.observe(observation({ tick: 0, units: [{ ...unit(0, fortOf('stone', 'wall'), 1700), fort: 'wall' }] }));
    expect(est.spent).toBe(225 * MILLI);
  });

  it('an own fort that falls under attack pays the foe half its price; one that crumbles alone pays nothing', () => {
    const wall = fortOf('stone', 'wall');
    const attacked = new FoeGoldEstimator(book);
    attacked.observe(observation({ tick: 20, units: [{ ...unit(1, wall, 300, { id: 1 }), fort: 'wall' }, unit(0, HVY, 330)] }));
    const before = attacked.income;
    attacked.observe(observation({ tick: 21, units: [unit(0, HVY, 330)] }));
    expect(attacked.income - before).toBeGreaterThanOrEqual(62 * MILLI);
    const alone = new FoeGoldEstimator(book);
    alone.observe(observation({ tick: 20, units: [{ ...unit(1, wall, 300, { id: 2 }), fort: 'wall' }] }));
    const b2 = alone.income;
    alone.observe(observation({ tick: 21, units: [] }));
    expect(alone.income - b2).toBeLessThan(MILLI);
  });
});

/** The baseline plan with each age's Fort card of `kind` (null = no Fort card). */
function planWith(kind: FortKind | null): Partial<Record<AgeId, Loadout>> {
  const out: Partial<Record<AgeId, Loadout>> = {};
  for (const age of AGES) out[age] = { ...baselineLoadout(content, age), fort: kind ? fortOf(age, kind) : null };
  return out;
}

function fortMatch(seed: number, format: string, kind: FortKind | null | [FortKind | null, FortKind | null], tiers: [number, number], generals: [string, string] = ['echo', 'echo']) {
  const kinds = Array.isArray(kind) ? kind : [kind, kind];
  const cfg = matchConfig({ seed, format, sides: [sideConfig(content, { level: 7, loadouts: planWith(kinds[0] ?? null) }), sideConfig(content, { level: 7, loadouts: planWith(kinds[1] ?? null) })] });
  const sim = createSim(cfg);
  const seats = [0, 1].map((s) => ({ side: s as Side, controller: createBot(botProfile(content, { generalId: generals[s] as string, tier: tiers[s] as number }), s as Side, seed, content) }));
  const placed: { side: Side; card: CardId; pad: number }[] = [];
  const result = runHeadless(sim, seats, {
    onEvents: (ev) => {
      for (const e of ev) if (e.e === 'fortPlaced') placed.push({ side: e.side, card: e.card, pad: e.pad });
    },
  });
  return { result, placed, hash: sim.hash() };
}

describe('bots place forts in real matches, under the player rules (A16.14.7)', () => {
  it('tier VII camps: placed, never rejected, deterministic', { timeout: 60000 }, () => {
    const a = fortMatch(3, 'standard', 'camp', [7, 7]);
    expect(a.placed.length).toBeGreaterThan(0);
    expect(a.result.rejected.filter((r) => r.t === 'fort')).toEqual([]);
    for (const p of a.placed) expect(content.forts[p.card]?.fortKind).toBe('camp');
    const b = fortMatch(3, 'standard', 'camp', [7, 7]);
    expect(b.hash).toBe(a.hash);
  });

  it('tier VII walls, towers and traps: Home pads only, never rejected for a rule the bot could see', { timeout: 60000 }, () => {
    for (const kind of ['wall', 'tower', 'trap'] as const) {
      // A wave worth a fort does not come every match: the first of a few fixed seeds with one.
      let m = fortMatch(1, 'short', [null, kind], [7, 7]);
      for (let seed = 2; seed <= 30 && m.placed.length === 0; seed += 1) m = fortMatch(seed, 'short', [null, kind], [7, 7]);
      expect(m.placed.length, kind).toBeGreaterThan(0);
      for (const p of m.placed) {
        expect(p.side).toBe(1);
        expect(content.forts[p.card]?.fortKind).toBe(kind);
        expect(p.pad).toBeLessThan(3);
      }
      // The observation is a few ticks old: only a unit walking onto the pad in the meantime may reject it.
      for (const x of m.result.rejected.filter((r) => r.t === 'fort')) expect(['fortPadEnemy']).toContain(x.reason);
    }
  });

  it('tiers II-IV never place a tower or a camp, even with one in the plan', { timeout: 60000 }, () => {
    for (const kind of ['tower', 'camp'] as const) {
      const m = fortMatch(3, 'short', [null, kind], [7, 4]);
      expect(m.result.commands.filter((c) => c.t === 'fort'), kind).toEqual([]);
    }
  });

  it('tiers 0-I never place a fort; a loadout without a Fort card never sends a fort command', { timeout: 60000 }, () => {
    const low = fortMatch(5, 'short', 'wall', [1, 0]);
    expect(low.result.commands.filter((c) => c.t === 'fort')).toEqual([]);
    const none = fortMatch(5, 'short', null, [7, 7]);
    expect(none.result.commands.filter((c) => c.t === 'fort')).toEqual([]);
  });

  it('forced placement (tools) re-places on every recharge and pays from the ledger', { timeout: 60000 }, () => {
    const plan = planWith('wall');
    const cfg = matchConfig({ seed: 2, format: 'short', sides: [sideConfig(content, { level: 7, loadouts: plan }), sideConfig(content, { level: 7, loadouts: plan })] });
    const sim = createSim(cfg);
    const forced = balanced(7);
    const seats = [
      { side: 0 as Side, controller: createBot({ ...forced, openings: [...forced.openings, 'rule:fortForce:safe'] }, 0, 2, content) },
      { side: 1 as Side, controller: createBot(balanced(7), 1, 2, content) },
    ];
    let placed = 0;
    const r = runHeadless(sim, seats, {
      onEvents: (ev) => {
        for (const e of ev) if (e.e === 'fortPlaced' && e.side === 0) placed += 1;
      },
    });
    // One fort up at a time (`maxAlive` 1): a wall that is never broken stands about 2:45 before it has
    // decayed, so a Short War holds at least 3 placements (MVP balance pass: the seed's flow changed).
    expect(placed).toBeGreaterThanOrEqual(3);
    // Only the recharge, caps or a wave walking onto the pad during the reaction delay may reject it.
    for (const x of r.rejected.filter((q) => q.t === 'fort')) expect(['fortPadEnemy', 'noGold', 'popFull', 'fortMax', 'fortSiege']).toContain(x.reason);
  });
});

describe('tier params stay typed', () => {
  it('fort columns exist on every tier', () => {
    for (let t = 0; t <= 10; t += 1) {
      const p: TierParams = tierParams(t);
      expect(Array.isArray(p.fortKinds)).toBe(true);
    }
  });
});
