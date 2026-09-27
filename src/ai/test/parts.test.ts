/**
 * Openings, the scripted Old Grogg brain, personalities, the foe gold estimator, memory and the
 * layering of the AI package.
 */
import { describe, expect, it } from 'vitest';
import type { Side } from '@/contracts';
import { seedSfc32 } from '@/core';
import { createSim } from '@/sim';
import { BotMatch, GROGG_SCRIPT, ScriptedController, UtilityController, createBot, parseScript, personalityFor, readGeneral } from '@/ai';
import { cardBook } from '../book';
import { BotMemory, evolveVisible } from '../memory';
import { parseOpenings } from '../openings';
import { balanced, content, matchConfig, observation, sideConfig } from './helpers';

const book = cardBook(content);

describe('openings (A7.2)', () => {
  it('parses steps, alternatives and directives', () => {
    const plan = parseOpenings(['train:ranged', 'turret', 'bogus', 'train:heavy|treasury', 'favorite:bonker', 'rule:noStance'], seedSfc32('o'));
    expect(plan.favorite).toBe('bonker');
    expect(plan.noStance).toBe(true);
    expect(plan.autoLastStand).toBe(false);
    expect(plan.steps.length).toBe(3);
    expect(plan.steps).toContainEqual({ kind: 'train', group: 'ranged' });
  });

  it('varies with the seed but is fixed for a seed', () => {
    const tokens = ['train:infantry', 'train:infantry|train:ranged', 'train:heavy|turret', 'mount|treasury'];
    const a = parseOpenings(tokens, seedSfc32('x'));
    expect(parseOpenings(tokens, seedSfc32('x'))).toEqual(a);
    const variants = new Set<string>();
    for (let i = 0; i < 40; i += 1) variants.add(JSON.stringify(parseOpenings(tokens, seedSfc32(`v${i}`)).steps));
    expect(variants.size).toBeGreaterThan(3);
  });

  it('every General opens with its own build (A7.4)', () => {
    expect(personalityFor(content, 'pip').opening.slice(0, 2)).toEqual(['train:ranged', 'train:infantry']);
    expect(personalityFor(content, 'kettle').opening.every((s) => s.includes('infantry'))).toBe(true);
    expect(personalityFor(content, 'moss').opening[0]).toBe('turret');
    expect(personalityFor(content, 'ledger').opening).toContain('treasury');
  });
});

describe('Old Grogg, the scripted tutorial brain (A7.4, A8)', () => {
  it('parses the script language', () => {
    expect(parseScript(['at 3000 train training_dummy', 'every 8000 from 1000 until 20000 turret rock_tosser', 'emote gg', 'at 500 emote salute', 'at x train y'])).toEqual([
      { from: 60, every: null, until: null, action: { kind: 'train', card: 'training_dummy' } },
      { from: 20, every: 160, until: 400, action: { kind: 'turret', card: 'rock_tosser' } },
      { from: 10, every: null, until: null, action: { kind: 'emote', emote: 'salute' } },
    ]);
  });

  it('is the brain createBot gives Grogg', () => {
    expect(createBot({ ...balanced(0), generalId: 'grogg', openings: [] }, 1, 1, content)).toBeInstanceOf(ScriptedController);
    expect(createBot(balanced(3), 1, 1, content)).toBeInstanceOf(UtilityController);
    expect(readGeneral(content, 'grogg')?.scripted).toBe(true);
  });

  it('sends Training Dummies on the script, never evolves, and never issues an illegal command', () => {
    const grogg = readGeneral(content, 'grogg');
    const plan = (content.generals as { list: Record<string, { warPlan: object }> }).list.grogg?.warPlan;
    const cfg = matchConfig({
      seed: 7,
      format: 'tutorial',
      sides: [sideConfig(content), sideConfig(content, { loadouts: plan as never })],
      training: { enemyBaseStartBp: 5000, noClock: true, trays: { stone: [0] }, manualLastStand: [false, false], stanceEnabled: [false, false] },
    });
    const bot = createBot({ generalId: 'grogg', tier: 0, mistakeBonusBp: 0, weights: grogg!.weights, openings: [] }, 1, 7, content);
    const m = new BotMatch(createSim(cfg), [{ side: 1 as Side, controller: bot }]);
    const rejected: string[] = [];
    let evolved = false;
    while (m.sim.state.tick < 3000) {
      for (const e of m.tick()) {
        if (e.e === 'commandRejected' && e.side === 1) rejected.push(`${e.t}:${e.reason}`);
        if (e.e === 'ascendStart' && e.side === 1) evolved = true;
      }
    }
    expect(rejected).toEqual([]);
    expect(evolved).toBe(false);
    const trains = m.botCommands.filter((c) => c.t === 'train');
    expect(trains.length).toBeGreaterThanOrEqual(4);
    // The first Dummy goes out 3 s in (plus the 1 s reaction delay), the Tuskback (slot 1) at 0:40.
    expect(trains[0]?.tick).toBeGreaterThanOrEqual(60);
    expect(trains.some((c) => c.t === 'train' && c.slot === 1 && c.tick >= 800)).toBe(true);
    expect(m.botCommands.every((c) => c.t === 'train' || c.t === 'emote')).toBe(true);
    expect(GROGG_SCRIPT.length).toBeGreaterThan(0);
  });
});

describe('personalities (A7.4)', () => {
  it('reads Generals from content and falls back to the Balanced brain', () => {
    expect(readGeneral(content, 'rook')?.counterWeightBp).toBe(15000);
    expect(readGeneral(content, 'boomsworth')?.signatureCards).toContain('howitzer');
    expect(personalityFor(content, 'tempest').powerForEvolveMoments).toBe(true);
    expect(personalityFor(content, 'kettle').allInBeforeEvolve).toBe(true);
    expect(personalityFor(content, 'moss').pushGateBp).toBeGreaterThan(personalityFor(content, 'pip').pushGateBp);
    expect(personalityFor(content, 'echo').id).toBe('mirror');
    expect(personalityFor(content, 'ai-commander-123').id).toBe('mirror');
    const noTable = { ...content, generals: null };
    expect(readGeneral(noTable, 'rook')).toBeNull();
    expect(personalityFor(noTable, 'grogg').scripted).toBe(true);
  });
});

describe('memory and the foe gold estimator (A7.1)', () => {
  it('tracks the foe gold from time, Treasury, turrets and kills, close to the truth', () => {
    const cfg = matchConfig({ seed: 61 });
    const sim = createSim(cfg);
    const seats = [0, 1].map((side) => ({ side: side as Side, controller: createBot(balanced(5), side as Side, 61, content) }));
    const m = new BotMatch(sim, seats);
    const mem = new BotMemory(book);
    let worst = 0;
    while (!m.ended && sim.state.tick < 3000) {
      m.tick();
      mem.observe(sim.observe(0));
      const truth = sim.state.sides[1].gold + sim.state.sides[1].queue.reduce((a, q) => a + (book.units[q.card]?.cost ?? 0), 0);
      worst = Math.max(worst, Math.abs(mem.estimator.gold - truth));
    }
    // Queued units are paid before they show, bounties are approximate: within 300 gold all match long.
    expect(worst).toBeLessThan(300000);
    expect(mem.estimator.income).toBeGreaterThan(0);
  });

  it('knows Evolve from the observation alone', () => {
    expect(evolveVisible(observation({ xpBp: 10001 }))).toBe(true);
    expect(evolveVisible(observation({ xpBp: 10000, powerPpm: 500000 }))).toBe(true);
    expect(evolveVisible(observation({ xpBp: 10000, powerPpm: 1000000 }))).toBe(false);
    expect(evolveVisible(observation({ xpBp: 9999 }))).toBe(false);
  });

  it('remembers enemy cards for 45 s', () => {
    const mem = new BotMemory(book);
    mem.observe(observation({ tick: 10, units: [{ id: 1, side: 0, card: 'tuskback', level: 1, p: 500000, hp: 1, maxHp: 1, shield: 0, air: false }] }));
    mem.observe(observation({ tick: 20 }));
    expect(mem.remembered().map((r) => r.card)).toEqual(['tuskback']);
    mem.observe(observation({ tick: 20 + 45 * 20 + 1 }));
    expect(mem.remembered()).toEqual([]);
  });
});

describe('layering (DESIGN B2)', () => {
  const sources = import.meta.glob<string>('../*.ts', { query: '?raw', import: 'default', eager: true });
  it('imports only contracts and core', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
    for (const [file, src] of Object.entries(sources)) {
      const specs = [...src.matchAll(/from\s+'([^']+)'/g)].map((x) => x[1] as string);
      for (const spec of specs) {
        const ok = spec.startsWith('./') || spec === '@/contracts' || spec.startsWith('@/contracts/') || spec === '@/core' || spec.startsWith('@/core/');
        expect(ok, `${file} imports ${spec}`).toBe(true);
      }
    }
  });

  it('never touches Math.random, Date or float literals in the brain', () => {
    for (const [file, src] of Object.entries(sources)) {
      expect(/Math\.random|Date\.now|new Date|performance\./.test(src), file).toBe(false);
    }
  });
});
