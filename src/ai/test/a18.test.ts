/**
 * A18 AI rules (DESIGN A18.4.2, A18.5.8, A18.6): the War Council by tier and General, the three stances
 * and the Hold flag, research timing, the thin-army push and the pacing-aware income timing. All from the
 * observation a player sees (A7.1).
 */
import { describe, expect, it } from 'vitest';
import type { Observation, ResearchPickDef } from '@/contracts';
import { LANE_MLU, MILLI as MLU, seedSfc32 } from '@/core';
import { cardBook, matchClock } from '../book';
import { Brain, type DecisionTrace } from '../brain';
import { Ledger } from '../ledger';
import { BotMemory } from '../memory';
import { BALANCED_WEIGHTS, personalityFor, weightsBp, type Weights } from '../personalities';
import { tierParams, type TierParams } from '../tiers';
import { buildView } from '../view';
import { content, observation, unit } from './helpers';

const L = LANE_MLU / MLU;
const book = cardBook(content);
const MILLI = 1000;
const generals = content.generals as { list: Record<string, { weights: Weights }> };

function brainFor(o: { tier?: number; tierOverride?: Partial<TierParams>; general?: string; seed?: string } = {}): Brain {
  const tier = { ...tierParams(o.tier ?? 10), mistakeBp: 0, ...o.tierOverride };
  const weights = o.general ? (generals.list[o.general]?.weights ?? BALANCED_WEIGHTS) : BALANCED_WEIGHTS;
  return new Brain(
    { book, tier, persona: personalityFor(content, o.general ?? 'echo'), weights: weightsBp(weights), mistakeBonusBp: 0, openings: [] },
    seedSfc32(o.seed ?? 'a18-test'),
  );
}

function decide(brain: Brain, obs: Observation, history: Observation[] = [], ledger = new Ledger(book), rng = 'decide'): DecisionTrace {
  const mem = new BotMemory(book);
  for (const h of history) mem.observe(h);
  mem.observe(obs);
  return brain.decide(buildView(obs, obs.tick + 6, book, ledger), mem, seedSfc32(rng));
}

const kinds = (t: DecisionTrace): string[] => t.candidates.map((c) => c.action.kind);
const picked = (t: DecisionTrace): ResearchPickDef | null => (t.action?.kind === 'research' ? t.action.pick : null);
const turret = { card: 'rock_tosser', age: 'stone' as const };
const foeTurrets = (n: number) => ({ turrets: [0, 1, 2, 3].map((i) => (i < n ? turret : null)) });
const mine = (n: number, p: number, card = 'bonker') => Array.from({ length: n }, (_, i) => unit(1, card, p + i * 10));
const foes = (n: number, p: number, card = 'bonker') => Array.from({ length: n }, (_, i) => unit(0, card, p + i * 10));
/** Research on (no tier start time), no gold float, no Economy income goal in the way. */
const RESEARCH_ON: Partial<TierParams> = { researchFromTicks: 0, researchGapTicks: 0, goldFloat: 0, treasuryMax: 0 };

describe('stances and the Hold flag (A18.4.2)', () => {
  it('falls back from tier V when under 0.5× the enemy army with the enemy past mid-lane and near its turret cover; never below V, never from Overdrive on', () => {
    const obs = observation({ tick: 1200, units: [...mine(1, 300), ...foes(4, 600, 'tuskback')] });
    expect(decide(brainFor({ tier: 5 }), obs).action).toEqual({ kind: 'stance', stance: 'fallback' });
    expect(kinds(decide(brainFor({ tier: 4 }), obs))).not.toContain('stance');
    // Enemy past mid-lane but still more than 200 lu from the turret cover (480 lu): no Fall back yet.
    const far = observation({ tick: 1200, units: [...mine(1, 300), ...foes(4, 700, 'tuskback')] });
    expect(decide(brainFor({ tier: 5 }), far).action).not.toEqual({ kind: 'stance', stance: 'fallback' });
    // Never from Overdrive on (the late game pushes).
    expect(decide(brainFor({ tier: 5 }), observation({ tick: 1200, phase: 'overdrive', units: obs.units })).action).not.toEqual({ kind: 'stance', stance: 'fallback' });
    expect(kinds(decide(brainFor({ tier: 5 }), observation({ tick: 1200, phase: 'siege', units: obs.units })))).not.toContain('stance');
  });

  it('defending, holds with the flag just inside its turret cover (480 − 80 = 400 lu)', () => {
    const t = decide(
      brainFor({ tier: 5 }),
      observation({ tick: 1200, mountsOwned: 2, turrets: [turret, turret, null, null], units: [...mine(3, 300), ...foes(5, 900)] }),
    );
    expect(t.action).toEqual({ kind: 'stance', stance: 'hold', holdP: 400 });
  });

  it('gathering a wave, holds where its army value is highest, short of mid-lane and of the enemy', () => {
    // Push gate fails against two turrets; the army stands around p 620.
    const t = decide(brainFor({ tier: 5 }), observation({ tick: 1200, foe: foeTurrets(2), units: mine(3, 610) }));
    expect(t.action).toEqual({ kind: 'stance', stance: 'hold', holdP: 620 });
    // An army far forward is held at mid-lane − 200 lu.
    const fwd = decide(brainFor({ tier: 5 }), observation({ tick: 1200, foe: foeTurrets(3), units: mine(3, 950) }));
    expect(fwd.action).toEqual({ kind: 'stance', stance: 'hold', holdP: L / 2 - 200 });
  });

  it('moves the flag while Holding (no stance change needed), at most once per 1 s', () => {
    const obs = observation({ tick: 1200, stance: 'hold', holdP: 320, foe: foeTurrets(2), units: mine(3, 610) });
    const t = decide(brainFor({ tier: 5 }), obs);
    expect(t.action).toEqual({ kind: 'flag', holdP: 620 });
    // A flag move just issued: the next waits for the 1 s flag cooldown.
    const ledger = new Ledger(book);
    ledger.record({ kind: 'flag', holdP: 500 }, obs.tick, obs.tick + 1);
    expect(kinds(decide(brainFor({ tier: 5 }), observation({ tick: 1202, stance: 'hold', holdP: 500, foe: foeTurrets(2), units: mine(3, 610) }), [], ledger))).not.toContain('flag');
  });

  it('tiers 0-II never move the flag (Moss holds at tier II at the default flag; at tier III she places it)', () => {
    const obs = observation({ tick: 1200, foe: foeTurrets(2), units: mine(3, 610) });
    expect(decide(brainFor({ tier: 2, general: 'moss' }), obs).action).toEqual({ kind: 'stance', stance: 'hold' });
    expect(decide(brainFor({ tier: 3, general: 'moss' }), obs).action).toEqual({ kind: 'stance', stance: 'hold', holdP: 620 });
  });

  it('War Horns keeps the flag at p ≤ 480 (its damage bonus needs it)', () => {
    const research = { owned: ['command.war_horns'], current: null, progressBp: 0, ranksOpen: 1 };
    const t = decide(brainFor({ tier: 5 }), observation({ tick: 1200, research, foe: foeTurrets(2), units: mine(3, 610) }));
    expect(t.action).toEqual({ kind: 'stance', stance: 'hold', holdP: 480 });
  });
});

describe('punish a thin army (A18.6: Normal = tier IV and up)', () => {
  it('pushes with ≥ 1.5× the enemy army that can soak its turrets, where the push gate would bank', () => {
    // D = 2 turrets (600) + 50 at their gate = 650; gate 1.3 × 650 = 845. 14 Bonkers (700) fail the gate,
    // but 700 ≥ 1.5 × 50 and ≥ 600 of turret defence.
    const obs = observation({ tick: 1200, foe: foeTurrets(2), units: [...mine(14, 300), unit(0, 'bonker', L - 100)] });
    expect(decide(brainFor({ tier: 4 }), obs).pushOk).toBe(true);
    expect(decide(brainFor({ tier: 3 }), obs).pushOk).toBe(false);
    // Not with too little to soak the turrets.
    const few = observation({ tick: 1200, foe: foeTurrets(2), units: [...mine(10, 300), unit(0, 'bonker', L - 100)] });
    expect(decide(brainFor({ tier: 4 }), few).pushOk).toBe(false);
  });
});

describe('research timing (A18.5.8 "Uses enemy research")', () => {
  const NO_CRAFT: Partial<TierParams> = { waveCommit: false, punishThin: false };
  const done = { owned: ['troops.infantry.weapons'], current: null, progressBp: 0, ranksOpen: 1 };

  it('V-VI push when their own Troops item lands: gate × 0.8 for 20 s', () => {
    // D = 300 (one turret): gate 390, × 0.8 = 312. 7 Bonkers = 350.
    const before = observation({ tick: 1100, foe: foeTurrets(1), units: mine(7, 300) });
    const now = observation({ tick: 1200, foe: foeTurrets(1), units: mine(7, 300), research: done });
    expect(decide(brainFor({ tier: 5, tierOverride: NO_CRAFT }), now, [before]).pushOk).toBe(true);
    expect(decide(brainFor({ tier: 4, tierOverride: NO_CRAFT }), now, [before]).pushOk).toBe(false);
    // 25 s later the window has passed.
    const later = observation({ tick: 1700, foe: foeTurrets(1), units: mine(7, 300), research: done });
    // (an own unit past mid-lane a moment ago keeps the attack clock at ×1)
    const raid = observation({ tick: 1690, foe: foeTurrets(1), units: [unit(1, 'bonker', L / 2 + 100)], research: done });
    expect(decide(brainFor({ tier: 5, tierOverride: NO_CRAFT }), later, [before, now, raid]).pushOk).toBe(false);
  });

  it('VII-X strike while the enemy Troops item is past half (× 0.9) and wait out its fresh wave (× 1.15)', () => {
    // D = 600 (two turrets): gate 780; × 0.9 = 702. 15 Bonkers = 750.
    const running = { owned: [], current: 'troops.heavy.weapons', progressBp: 6000, ranksOpen: 1 };
    const obs = observation({ tick: 1200, foe: { ...foeTurrets(2), research: running }, units: mine(15, 300) });
    expect(decide(brainFor({ tier: 7, tierOverride: NO_CRAFT }), obs).pushOk).toBe(true);
    expect(decide(brainFor({ tier: 6, tierOverride: NO_CRAFT }), obs).pushOk).toBe(false);
    // Just landed: 17 Bonkers (850) pass the plain gate (780) but not × 1.15 (897).
    const landed = { owned: ['troops.heavy.weapons'], current: null, progressBp: 0, ranksOpen: 1 };
    const before = observation({ tick: 1100, foe: { ...foeTurrets(2), research: running }, units: mine(17, 300) });
    const after = observation({ tick: 1200, foe: { ...foeTurrets(2), research: landed }, units: mine(17, 300) });
    expect(decide(brainFor({ tier: 7, tierOverride: NO_CRAFT }), after, [before]).pushOk).toBe(false);
    expect(decide(brainFor({ tier: 6, tierOverride: NO_CRAFT }), after, [before]).pushOk).toBe(true);
  });

  it('VII-X evolve away from the enemy research: not while its fresh Troops wave is on the bot\'s half', () => {
    const landed = { owned: ['troops.heavy.weapons'], current: null, progressBp: 0, ranksOpen: 1 };
    const running = { owned: [], current: 'troops.heavy.weapons', progressBp: 9000, ranksOpen: 1 };
    const raid = foes(1, 800);
    const ready = (tick: number, research: Observation['foe']['research']) => observation({ tick, xpBp: 10200, foe: { research }, units: raid });
    // The foe stands 800 lu out: the plain safe window holds, so tier VII would evolve at once ...
    expect(kinds(decide(brainFor({ tier: 7 }), ready(1200, running), [ready(1190, running)]))).toContain('evolve');
    // ... but not right after the enemy's Troops item landed.
    expect(kinds(decide(brainFor({ tier: 7 }), ready(1200, landed), [ready(1190, running)]))).not.toContain('evolve');
  });
});

describe('War Council choices (A18.5.8)', () => {
  it('starts nothing new with less than 90 s to the Final Bell', () => {
    const bell = matchClock(book, observation({}).ages).finalBell ?? 0;
    expect(bell).toBe(21000);
    expect(decide(brainFor({ tier: 8, tierOverride: RESEARCH_ON }), observation({ tick: bell - 1700, gold: 900 * MILLI })).goal?.kind).not.toBe('research');
    expect(decide(brainFor({ tier: 8, tierOverride: RESEARCH_ON }), observation({ tick: bell - 1900, gold: 900 * MILLI })).goal?.kind).toBe('research');
  });

  it('researches Defences only with a turret up (or as Mama Moss, who plans them)', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const p = picked(decide(brainFor({ tier: 8, seed, tierOverride: RESEARCH_ON }), observation({ tick: 1200, gold: 900 * MILLI })));
      expect(p?.track, p?.id).not.toBe('defences');
    }
    const moss = picked(decide(brainFor({ tier: 3, general: 'moss', tierOverride: RESEARCH_ON }), observation({ tick: 1200, gold: 900 * MILLI })));
    expect(moss?.track).toBe('defences');
  });

  it('tiers II-IV read the pick hint against what they see: pressed by Bonkers they pick a defensive or anti-swarm item', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      // 150 gold of Bonkers within 480 lu: pressure, not yet urgent.
      const obs = observation({ tick: 1200, gold: 150 * MILLI, units: foes(3, 400) });
      const p = picked(decide(brainFor({ tier: 3, tierOverride: RESEARCH_ON }), obs, [], new Ledger(book), seed));
      expect(['defend', 'vsSwarm'], p?.id).toContain(p?.aiHint);
    }
  });

  it('never researches Ambush (a Hold-only bonus) at a tier that never Holds', () => {
    const research = { owned: ['troops.antiArmor.hunters'], current: null, progressBp: 0, ranksOpen: 2 };
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const obs = observation({ tick: 1200, gold: 300 * MILLI, research, units: mine(4, 300, 'spear_hunter') });
      const p = picked(decide(brainFor({ tier: 4, tierOverride: RESEARCH_ON }), obs, [], new Ledger(book), seed));
      expect(p?.id).not.toBe('troops.antiArmor.ambush');
    }
  });

  it('deepens the line of the class that makes up its army', () => {
    const research = { owned: ['troops.heavy.weapons', 'troops.infantry.weapons'], current: null, progressBp: 0, ranksOpen: 2 };
    const obs = observation({ tick: 1200, gold: 300 * MILLI, research, units: mine(4, 300, 'tuskback') });
    expect(picked(decide(brainFor({ tier: 3, tierOverride: RESEARCH_ON }), obs))?.group).toBe('heavy');
  });

  it('Rook counters the Scouted classes even with none on the lane', () => {
    const scouted = ['tuskback', 'mammoth_matriarch'].filter((c) => content.units[c]);
    const obs = observation({ tick: 1200, gold: 150 * MILLI, foe: { scouted } });
    for (const seed of ['a', 'b', 'c']) {
      expect(picked(decide(brainFor({ tier: 7, general: 'rook', tierOverride: RESEARCH_ON }), obs, [], new Ledger(book), seed))?.aiHint).toBe('vsHeavy');
    }
  });

  it('tiers 0-I pick at random, weighted by the General\'s style: Kettle leans on the Infantry line', () => {
    let infantry = 0;
    for (let i = 0; i < 20; i += 1) {
      const t = decide(brainFor({ tier: 1, general: 'kettle', tierOverride: RESEARCH_ON }), observation({ tick: 1100, gold: 150 * MILLI }), [], new Ledger(book), `k${i}`);
      const goal = t.goal?.kind === 'research' ? t.goal.pick : null;
      expect(goal).not.toBeNull();
      if (goal?.startsWith('troops.infantry.')) infantry += 1;
      expect(goal).not.toBe('economy.forage');
    }
    // Infantry has 2 of the 13 open picks, but Kettle's style weighs it ×2.2.
    expect(infantry).toBeGreaterThanOrEqual(4);
  });
});

describe('pacing (A18.3): income research timing follows the match clocks', () => {
  it('reads the clocks of the observed window: Short 5:00 / 6:30 / 8:30, Full 12:00 / 14:30 / 17:30', () => {
    expect(matchClock(book, content.formats.short?.ages)).toEqual({ overdrive: 6000, siege: 7800, finalBell: 10200 });
    expect(matchClock(book, content.formats.full?.ages)).toEqual({ overdrive: 14400, siege: 17400, finalBell: 21000 });
  });
});
