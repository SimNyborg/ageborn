import { describe, expect, expectTypeOf, it } from 'vitest';
import type { BotController, Command, Observation, Side } from '@/contracts';
import { createSim } from '@/sim';
import { BotMatch, botProfile, createBot, tierParams, type AiBotController, type UtilityController } from '@/ai';
import { AI_STANCE_GAP_TICKS, cardBook } from '../book';
import { Ledger, ACTION_WINDOW_TICKS } from '../ledger';
import { BOT_EMOTES, EmotePolicy, REPLY_GAP_TICKS } from '../emotes';
import { seedSfc32 } from '@/core';
import { balanced, content, matchConfig, observation, unit } from './helpers';

const book = cardBook(content);

/** Runs a Short War between two Balanced bots and returns the match driver. */
function play(tiers: [number, number], seed: number, ticks = 2400): BotMatch {
  const cfg = matchConfig({ seed, format: 'short' });
  const bots = tiers.map((t, side) => createBot(balanced(t), side as Side, seed, content));
  const m = new BotMatch(
    createSim(cfg),
    bots.map((controller, side) => ({ side: side as Side, controller })),
  );
  while (!m.ended && m.sim.state.tick < ticks) m.tick();
  return m;
}

describe('BotController contract (B10, A7.1)', () => {
  it('receives only an Observation', () => {
    expectTypeOf<Parameters<BotController['onTick']>>().toEqualTypeOf<[Observation]>();
    expectTypeOf<ReturnType<BotController['onTick']>>().toEqualTypeOf<Command[]>();
  });

  it('exposes the tier snapshot delay and only commands its own side', () => {
    for (const tier of [0, 3, 7, 10]) {
      const bot = createBot(balanced(tier), 1, 5, content);
      expect(bot.snapshotDelayTicks).toBe(tierParams(tier).snapshotDelayTicks);
    }
    const m = play([7, 3], 11);
    expect(m.botCommands.length).toBeGreaterThan(20);
    const bySide = m.botCommands.every((c) => c.side === 0 || c.side === 1);
    expect(bySide).toBe(true);
  });

  it('decides the same from a detached copy of the observation (no hidden reference to the sim)', () => {
    const cfg = matchConfig({ seed: 21 });
    const sim = createSim(cfg);
    const a = createBot(balanced(7), 1, 21, content);
    const b = createBot(balanced(7), 1, 21, content);
    for (let i = 0; i < 1500; i += 1) {
      const obs = sim.observe(1);
      const copy = JSON.parse(JSON.stringify(obs)) as Observation;
      const ca = a.onTick(obs);
      const cb = b.onTick(Object.freeze(copy));
      expect(cb).toEqual(ca);
      sim.step(ca.map((c, seq) => ({ ...c, tick: sim.state.tick + 1, seq })));
    }
  });

  it('is deterministic: same seed, same commands', () => {
    const a = play([5, 5], 31);
    const b = play([5, 5], 31);
    expect(b.botCommands).toEqual(a.botCommands);
    expect(b.sim.hash()).toBe(a.sim.hash());
    const c = play([5, 5], 32);
    expect(c.botCommands).not.toEqual(a.botCommands);
  });

  it('respects the action cap of its tier in every 10 s window', () => {
    for (const tiers of [
      [0, 1],
      [10, 7],
    ] as [number, number][]) {
      const m = play(tiers, 41, 7200);
      for (const side of [0, 1] as const) {
        const cap = tierParams(tiers[side]).maxActionsPer10s;
        const ticks = m.botCommands.filter((c) => c.side === side).map((c) => c.tick);
        for (let i = 0; i < ticks.length; i += 1) {
          const inWindow = ticks.filter((t) => t > (ticks[i] as number) - ACTION_WINDOW_TICKS && t <= (ticks[i] as number)).length;
          expect(inWindow, `tier ${tiers[side]} at tick ${ticks[i]}`).toBeLessThanOrEqual(cap);
        }
      }
    }
  });

  it('runs its brain on the decision interval (while the action cap has room)', () => {
    for (const tier of [0, 5, 10]) {
      const bot = createBot(balanced(tier), 1, 3, content) as UtilityController;
      const sim = createSim(matchConfig({ seed: 3 }));
      for (let i = 0; i < 400; i += 1) {
        bot.onTick(sim.observe(1));
        sim.step([]);
      }
      const every = tierParams(tier).decisionTicks;
      const ticks = bot.traces.map((t) => t.tick);
      expect(ticks.length).toBeGreaterThan(1);
      for (let i = 1; i < ticks.length; i += 1) expect(((ticks[i] as number) - (ticks[i - 1] as number)) % every).toBe(0);
    }
  });
});

describe('ledger: own commands the delayed observation does not show yet', () => {
  it('never spends the same gold twice before the observation catches up', () => {
    const ledger = new Ledger(book);
    ledger.record({ kind: 'train', slot: 0, card: 'bonker', cost: 50000 }, 100, 101);
    const granary = content.research.picks.find((p) => p.id === 'economy.granary')!;
    ledger.record({ kind: 'research', pick: granary, cost: 200000 }, 110, 111);
    expect(ledger.pendingGold()).toBe(250000);
    expect(ledger.pendingTrains()).toEqual(['bonker']);
    ledger.sync(observation({ tick: 101 }));
    expect(ledger.pendingGold()).toBe(200000);
    ledger.sync(observation({ tick: 111 }));
    expect(ledger.pendingGold()).toBe(0);
  });

  it('keeps mounts busy while building and learns a locked stance or an automatic Last Stand', () => {
    const ledger = new Ledger(book);
    ledger.record({ kind: 'build', mount: 1, slot: 0, card: 'rock_tosser', cost: 150000 }, 100, 101);
    expect(ledger.mountBusyUntil[1]).toBe(101 + content.ticks.turretBuild + 1);
    ledger.record({ kind: 'stance', stance: 'hold' }, 200, 201);
    // The rules let a stance change every tick (no cooldown since 2026-10-07); a bot keeps its own
    // 3 s gap so it never flickers between stances.
    expect(AI_STANCE_GAP_TICKS).toBe(60);
    expect(ledger.stanceReadyTick).toBe(201 + Math.max(AI_STANCE_GAP_TICKS, content.ticks.stanceCooldown));
    ledger.sync(observation({ tick: 205, stance: 'charge' }));
    expect(ledger.stanceEnabled).toBe(false);
    ledger.record({ kind: 'lastStand' }, 300, 301);
    ledger.sync(observation({ tick: 305, lastStand: 'armed' }));
    expect(ledger.lastStandManual).toBe(false);
  });

  it('treats an Evolve that never starts as the final age, and blocks age-dependent commands near ageUp', () => {
    const ledger = new Ledger(book);
    ledger.recordEvolve(100, 101, 0);
    expect(ledger.ageUncertain(110)).toBe(false);
    expect(ledger.ageUncertain(101 + content.ticks.ascend - 2)).toBe(true);
    ledger.sync(observation({ tick: 101 + content.ticks.ascend + 2, ageIndex: 0 }));
    expect(ledger.finalAge).toBe(true);
    expect(ledger.evolve).toBeNull();
    const ok = new Ledger(book);
    ok.recordEvolve(100, 101, 0);
    ok.sync(observation({ tick: 160, ageIndex: 1 }));
    expect(ok.evolve).toBeNull();
    expect(ok.finalAge).toBe(false);
  });
});

describe('emote rule (A7.2)', () => {
  it('uses only GG, Salute and Thumbs up, at most once on its own', () => {
    const p = new EmotePolicy(seedSfc32('e'));
    const sent: string[] = [];
    for (let t = 0; t < 2000; t += 10) {
      const e = p.next(observation({ tick: t, baseHpBp: 500 }), t, true);
      if (e) sent.push(e);
    }
    expect(sent.length).toBeLessThanOrEqual(1);
    for (const e of sent) expect(BOT_EMOTES).toContain(e);
  });

  it('replies to the player at most once per 20 s, after a human delay', () => {
    let replies = 0;
    for (let seed = 0; seed < 20; seed += 1) {
      const p = new EmotePolicy(seedSfc32(`r${seed}`));
      let lastReply = -100000;
      for (let t = 0; t < 2000; t += 1) {
        if (t % 50 === 0) p.hear('laugh', t);
        const e = p.next(observation({ tick: t }), t, true);
        if (e) {
          expect(BOT_EMOTES).toContain(e);
          expect(t - lastReply).toBeGreaterThanOrEqual(REPLY_GAP_TICKS);
          lastReply = t;
          replies += 1;
        }
      }
    }
    expect(replies).toBeGreaterThan(0);
  });

  it('relays player emotes through the match driver and replies legally', () => {
    const cfg = matchConfig({ seed: 51 });
    const bot = createBot(balanced(5), 1, 51, content) as AiBotController;
    const m = new BotMatch(createSim(cfg), [{ side: 1, controller: bot }]);
    const rejected: string[] = [];
    for (let i = 0; i < 1200; i += 1) {
      const extra: Command[] = i % 100 === 10 ? [{ t: 'emote', side: 0, emote: 'thumbsUp' }] : [];
      for (const e of m.tick(extra)) if (e.e === 'commandRejected' && e.side === 1) rejected.push(e.reason);
    }
    const botEmotes = m.botCommands.filter((c) => c.t === 'emote');
    expect(botEmotes.length).toBeGreaterThan(0);
    expect(rejected).toEqual([]);
  });
});

describe('observation hygiene', () => {
  it('ignores observations for the other side and finished matches', () => {
    const bot = createBot(balanced(10), 1, 1, content);
    expect(bot.onTick(observation({ side: 0, gold: 900000 }))).toEqual([]);
    expect(bot.onTick(observation({ side: 1, phase: 'ended', gold: 900000 }))).toEqual([]);
  });

  it('builds profiles from content weights and personality openings', () => {
    const p = botProfile(content, { generalId: 'kettle', tier: 3, favoriteCard: 'bonker', stanceLocked: true });
    expect(p.weights.aggr).toBe(90);
    expect(p.openings).toContain('favorite:bonker');
    expect(p.openings).toContain('rule:noStance');
    expect(p.openings[0]).toBe('train:infantry');
    const commander = botProfile(content, { generalId: 'commander', personalityOf: 'moss', tier: 3 });
    expect(commander.generalId).toBe('moss');
    expect(commander.weights.turret).toBe(90);
    // Unknown generals get the plain Balanced brain.
    expect(botProfile(content, { generalId: 'nobody', tier: 2 }).weights.aggr).toBe(50);
  });

  it('keeps unit ids and card names out of its commands (commands address slots)', () => {
    const bot = createBot(balanced(10), 1, 1, content);
    const out = bot.onTick(observation({ tick: 200, gold: 500000, units: [unit(0, 'bonker', 300)] }));
    for (const c of out) expect(Object.keys(c).every((k) => ['t', 'side', 'slot', 'mount', 'p', 'stance', 'emote'].includes(k))).toBe(true);
  });
});
