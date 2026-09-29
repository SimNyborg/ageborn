/**
 * Openings, the scripted Old Grogg brain, personalities, the foe gold estimator, memory and the
 * layering of the AI package.
 */
import { describe, expect, it } from 'vitest';
import type { Side } from '@/contracts';
import { seedSfc32 } from '@/core';
import { createSim } from '@/sim';
import { BotMatch, GROGG_SCRIPT, ScriptedController, UtilityController, createBot, parseScript, parseScriptFull, personalityFor, readGeneral } from '@/ai';
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
  it('drops Dummy sends while 3 of his units are alive', () => {
    const script = parseScriptFull(['max-alive 3 training_dummy', 'every 1000 train training_dummy']);
    expect(script.maxAlive).toEqual({ training_dummy: 3 });
    const bot = createBot({ ...balanced(0), generalId: 'grogg', openings: ['max-alive 3 training_dummy', 'every 1000 train training_dummy'] }, 1, 1, content);
    const plan = (content.generals as { list: Record<string, { warPlan: object }> }).list.grogg?.warPlan;
    const sim = createSim(matchConfig({ seed: 2, training: { noClock: true }, sides: [sideConfig(content), sideConfig(content, { loadouts: plan as never })] }));
    const m = new BotMatch(sim, [{ side: 1 as Side, controller: bot }]);
    let most = 0;
    while (sim.state.tick < 1200) {
      m.tick();
      const mine = sim.state.units.filter((u) => u.side === 1).length + sim.state.sides[1].queue.length;
      most = Math.max(most, mine);
    }
    // Nobody fights back: the first three Dummies live on, so every later send is dropped.
    expect(m.botCommands.length).toBe(3);
    expect(most).toBe(3);
  });

  it('parses the script language', () => {
    expect(parseScript(['at 3000 train training_dummy', 'every 8000 from 1000 until 20000 turret rock_tosser', 'emote gg', 'at 500 emote salute', 'at x train y'])).toEqual([
      { from: 60, every: null, until: null, action: { kind: 'train', card: 'training_dummy' } },
      { from: 20, every: 160, until: 400, action: { kind: 'turret', card: 'rock_tosser' } },
      { from: 10, every: null, until: null, action: { kind: 'emote', emote: 'salute' } },
    ]);
  });

  it('keeps the A7 bot rules: GG, Salute or Thumbs up only, one own emote per match, the action cap', () => {
    expect(parseScript(['at 100 emote laugh', 'at 200 emote angry', 'at 300 emote cry']).length).toBe(0);
    const plan = (content.generals as { list: Record<string, { warPlan: object }> }).list.grogg?.warPlan;
    const run = (openings: string[], ticks: number): BotMatch => {
      const bot = createBot({ ...balanced(0), generalId: 'grogg', openings }, 1, 3, content);
      const sim = createSim(matchConfig({ seed: 3, training: { noClock: true }, sides: [sideConfig(content), sideConfig(content, { loadouts: plan as never })] }));
      const m = new BotMatch(sim, [{ side: 1 as Side, controller: bot }]);
      while (sim.state.tick < ticks) m.tick();
      return m;
    };
    const emotes = run(['at 1000 emote gg', 'at 6000 emote salute', 'at 12000 emote thumbsUp'], 400).botCommands.filter((c) => c.t === 'emote');
    expect(emotes.map((c) => (c.t === 'emote' ? c.emote : null))).toEqual(['gg']);
    // A Dummy every 0.5 s: tier 0 allows 2 commands per 10 s, so the sends wait for room.
    const trains = run(['every 500 train training_dummy'], 800).botCommands.map((c) => c.tick);
    expect(trains.length).toBeGreaterThan(0);
    for (const t of trains) expect(trains.filter((u) => u > t - 200 && u <= t).length).toBeLessThanOrEqual(2);
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
    // Nobody fights back here, so after the first three sends his units stay alive and the rest drop.
    expect(trains.length).toBeGreaterThanOrEqual(3);
    // The first Dummy goes out at 0:02, the Tuskback (slot 1) at 0:19 (WP11's retimed match 1).
    expect(trains[0]?.tick).toBeGreaterThanOrEqual(40);
    expect(trains.some((c) => c.t === 'train' && c.slot === 1 && c.tick >= 380 && c.tick <= 420)).toBe(true);
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
  it('tracks the foe gold from time, Treasury, turrets and kills, close to the truth all match long', () => {
    for (const [seed, format] of [
      [61, 'short'],
      [2, 'full'],
      [4, 'full'],
    ] as const) {
      const sim = createSim(matchConfig({ seed, format }));
      const seats = [0, 1].map((side) => ({ side: side as Side, controller: createBot(balanced(5), side as Side, seed, content) }));
      const m = new BotMatch(sim, seats);
      const mem = new BotMemory(book);
      let worst = 0;
      while (!m.ended) {
        m.tick();
        mem.observe(sim.observe(0));
        // The foe's queue is invisible, so the truth counts gold paid into it as unspent.
        const truth = sim.state.sides[1].gold + sim.state.sides[1].queue.reduce((a, q) => a + (book.units[q.card]?.cost ?? 0), 0);
        worst = Math.max(worst, Math.abs(mem.estimator.gold - truth));
      }
      // Summons, power and Last Stand kills and underdog bounties are modelled; what remains is a mount
      // bought but not yet built on, or a queue item converted at an ageUp, or a unit killed on the tick it
      // spawned (never observed). On the 2,000 lu lane seed 2 Full War has both at once for about 6 s: the
      // 350 gold third mount and a 110 gold Repair Drone that an Orbital Lance killed at its spawn (445).
      expect(worst, `seed ${seed} ${format}`).toBeLessThan(500000);
      expect(mem.estimator.income).toBeGreaterThan(0);
    }
    // Two whole matches (Full War has eight ages since A17.8): about 2 s alone, more under a loaded run.
  }, 30000);

  it('knows Evolve from the observation alone', () => {
    expect(evolveVisible(observation({ xpBp: 10001 }))).toBe(true);
    expect(evolveVisible(observation({ xpBp: 10000, powerPpm: 500000 }))).toBe(true);
    expect(evolveVisible(observation({ xpBp: 10000, powerPpm: 1000000 }))).toBe(false);
    expect(evolveVisible(observation({ xpBp: 9999 }))).toBe(false);
  });

  it('remembers enemy cards for 45 s', () => {
    const mem = new BotMemory(book);
    mem.observe(observation({ tick: 10, units: [{ id: 1, side: 0, card: 'tuskback', level: 1, p: 500000, hp: 1, maxHp: 1, shield: 0, air: false, summoned: false }] }));
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
