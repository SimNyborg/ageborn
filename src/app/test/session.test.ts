import { describe, expect, it } from 'vitest';
import type { BotController, Command, Observation, OpponentSpec, SimEvent } from '@/contracts';
import { content } from '@/content';
import { fakeContent } from '@/contracts/fakes/content';
import { createFakeSim, fakeMatchConfig } from '@/contracts/fakes/sim';
import { buildReplay, createSim, replayMatch, SIM_VERSION } from '@/sim';
import { InMemorySaveStore } from '@/contracts/fakes/saveStore';
import { createFallbackBot } from '../fallbackBot';
import { generalOpponent, quickBattle } from '../matchSetup';
import { BattleSessionImpl, HUD_INTERVAL_MS, type BattleSessionOptions } from '../session';
import { FakeVisibility, ManualScheduler, RecordingView, profile } from './helpers';

const opponent: OpponentSpec = generalOpponent(fakeContent, { generalId: 'pip', displayName: 'AI Pip', tier: 0, level: 1, format: 'short', seed: 1 });

function fakeSession(o: Partial<BattleSessionOptions> = {}): { s: BattleSessionImpl; view: RecordingView; sim: ReturnType<typeof createFakeSim> } {
  const sim = createFakeSim();
  const view = new RecordingView();
  const s = new BattleSessionImpl({ sim, mode: 'skirmish', opponent, simVersion: 'test', view, ...o });
  return { s, view, sim };
}

/** A bot that records the ticks of the observations it receives and trains slot 0 once. */
class ProbeBot implements BotController {
  seen: number[] = [];
  constructor(
    readonly snapshotDelayTicks: number,
    private readonly out: (obs: Observation) => Command[] = () => [],
  ) {}
  onTick(obs: Observation): Command[] {
    this.seen.push(obs.tick);
    return this.out(obs);
  }
}

describe('BattleSession loop (DESIGN B6)', () => {
  it('runs one tick per 50 ms of game time, scaled by speed, and renders every frame', () => {
    const { s, view, sim } = fakeSession();
    s.start();
    s.advance(40);
    expect(sim.state.tick).toBe(0);
    s.advance(10);
    expect(sim.state.tick).toBe(1);
    s.setSpeed(2);
    s.advance(50);
    expect(sim.state.tick).toBe(3);
    s.setSpeed(1.5);
    s.advance(100);
    expect(sim.state.tick).toBe(6);
    expect(view.renders.length).toBe(4);
    expect(view.speed).toBe(1.5);
  });

  it('clamps a long frame to 250 ms (B6)', () => {
    const { s, sim } = fakeSession();
    s.start();
    s.advance(5000);
    expect(sim.state.tick).toBe(5);
  });

  it('adds no time during a global freeze (A12)', () => {
    const { s, view, sim } = fakeSession();
    s.start();
    view.frozen = true;
    s.advance(200);
    expect(sim.state.tick).toBe(0);
    view.frozen = false;
    s.advance(50);
    expect(sim.state.tick).toBe(1);
  });

  it('interpolation alpha is the accumulator remainder over 50 ms', () => {
    const { s, view } = fakeSession();
    s.start();
    s.advance(75);
    expect(view.renders.at(-1)?.alpha).toBeCloseTo(0.5);
  });

  it('pause stops time, resume continues; the view and HUD see the state', () => {
    const { s, view, sim } = fakeSession();
    expect(s.hud.value.paused).toBe(true);
    s.start();
    expect(view.paused).toBe(false);
    expect(s.hud.value.paused).toBe(false);
    s.pause();
    expect(s.status.value).toBe('paused');
    expect(view.paused).toBe(true);
    s.advance(500);
    expect(sim.state.tick).toBe(0);
    s.resume();
    s.advance(100);
    expect(sim.state.tick).toBe(2);
  });

  it('auto-pauses when the tab is hidden and stays paused when it returns (C5 #20)', () => {
    const visibility = new FakeVisibility();
    const { s } = fakeSession({ visibility });
    s.start();
    visibility.set(true);
    expect(s.status.value).toBe('paused');
    expect(s.pauseReason).toBe('hidden');
    visibility.set(false);
    expect(s.status.value).toBe('paused');
    s.resume();
    expect(s.status.value).toBe('running');
    s.dispose();
    expect(visibility.listeners).toBe(0);
  });

  it('stamps human commands with sim.tick + 1 and a per-side seq, and records them', () => {
    const { s, sim } = fakeSession();
    s.issue({ t: 'train', side: 0, slot: 0 }); // before start: ignored
    s.start();
    s.issue({ t: 'train', side: 0, slot: 0 });
    s.issue({ t: 'research', side: 0, track: 'economy', rank: 1, pick: 0 });
    s.issue({ t: 'train', side: 1, slot: 0 }); // not the player's side: ignored
    s.advance(50);
    expect(sim.received).toEqual([
      { t: 'train', side: 0, slot: 0, tick: 1, seq: 1 },
      { t: 'research', side: 0, track: 'economy', rank: 1, pick: 0, tick: 1, seq: 2 },
    ]);
    s.issue({ t: 'evolve', side: 0 });
    s.advance(50);
    expect(sim.received.at(-1)).toEqual({ t: 'evolve', side: 0, tick: 2, seq: 3 });
    expect(s.commands).toHaveLength(3);
  });

  it('feeds each bot the observation from snapshotDelayTicks ago (B6, B10)', () => {
    const bot = new ProbeBot(3);
    const { s } = fakeSession({ bots: [{ side: 1, controller: bot }] });
    s.start();
    s.fastForward(8);
    // Before tick t+1 the newest observation is of tick t; the bot sees t − 3, clamped at 0.
    expect(bot.seen).toEqual([0, 0, 0, 0, 1, 2, 3, 4]);
  });

  it('stamps bot commands for their own side only (A7.1)', () => {
    const bot = new ProbeBot(0, (obs) => (obs.tick === 0 ? [{ t: 'train', side: 1, slot: 0 }, { t: 'train', side: 0, slot: 0 }] : []));
    const { s, sim } = fakeSession({ bots: [{ side: 1, controller: bot }] });
    s.start();
    s.fastForward(2);
    expect(sim.received).toEqual([{ t: 'train', side: 1, slot: 0, tick: 1, seq: 1 }]);
    expect(s.droppedBotCommands).toBe(1);
  });

  it("relays the other side's emotes to bots that answer them (A7.2)", () => {
    class EmoteBot extends ProbeBot {
      heard: [string, number][] = [];
      hearEmote(emote: string, tick: number): void {
        this.heard.push([emote, tick]);
      }
    }
    const bot = new EmoteBot(0, (obs) => (obs.tick === 2 ? [{ t: 'emote', side: 1, emote: 'gg' }] : []));
    const { s, sim } = fakeSession({ bots: [{ side: 1, controller: bot }] });
    // The fake sim echoes emote commands as events, like the real one.
    const step = sim.step.bind(sim);
    sim.step = (cmds) => [...step(cmds), ...cmds.filter((c) => c.t === 'emote').map((c) => ({ e: 'emote' as const, side: c.side, emote: (c as { emote: 'gg' | 'laugh' }).emote, tick: c.tick }))];
    s.start();
    s.issue({ t: 'emote', side: 0, emote: 'laugh' });
    s.fastForward(5);
    // The player's emote reaches the bot; the bot's own emote does not come back to it.
    expect(bot.heard).toEqual([['laugh', 1]]);
  });

  it('passes every tick of events to the view and to tick listeners', () => {
    const { s, view } = fakeSession();
    const seen: SimEvent[] = [];
    s.onTick((ev) => seen.push(...ev));
    s.start();
    s.fastForward(30);
    expect(view.events.map((e) => e.e)).toContain('unitSpawned');
    expect(seen).toEqual(view.events);
  });

  it('ends: stops stepping, builds the result and the replay, calls onEnd once', () => {
    const { s, sim, view } = fakeSession();
    const ends: string[] = [];
    s.onEnd((r) => ends.push(r.outcome.reason));
    s.start();
    s.fastForward(10_000);
    expect(s.status.value).toBe('ended');
    expect(sim.state.tick).toBe(240);
    expect(ends).toEqual(['retreat']);
    const r = s.result!;
    expect(r.input.mode).toBe('skirmish');
    expect(r.input.opponent.isAI).toBe(true);
    expect(r.input.mySide).toBe(0);
    expect(r.input.stats.durationMs).toBe(240 * 50);
    expect(r.replay).toMatchObject({ v: 1, simVersion: 'test', contentHash: fakeContent.hash, seed: 1, format: 'short', finalHash: sim.hash() });
    // The view keeps animating after the end, but no more ticks run.
    const renders = view.renders.length;
    s.advance(500);
    expect(sim.state.tick).toBe(240);
    expect(view.renders.length).toBe(renders + 1);
    // Late listeners get the result at once.
    s.onEnd((r2) => ends.push(r2.outcome.reason));
    expect(ends).toEqual(['retreat', 'retreat']);
  });

  it('updates the HUD signal at most at 15 Hz on the scheduler', () => {
    const scheduler = new ManualScheduler();
    const { s } = fakeSession({ scheduler });
    s.start();
    let updates = 0;
    const off = s.hud.subscribe(() => (updates += 1));
    updates = 0;
    for (let i = 0; i < 60; i += 1) scheduler.frame(1000 / 60);
    off();
    // One second of 60 fps frames: about 15 HUD updates, never one per frame.
    expect(updates).toBeGreaterThanOrEqual(14);
    expect(updates).toBeLessThanOrEqual(16);
    expect(HUD_INTERVAL_MS).toBeCloseTo(66.67, 1);
  });

  it('drives itself from the scheduler and stops on dispose', () => {
    const scheduler = new ManualScheduler();
    const { s, sim, view } = fakeSession({ scheduler });
    s.start();
    expect(scheduler.pending).toBe(1);
    scheduler.frame(16);
    scheduler.frame(50);
    expect(sim.state.tick).toBe(1);
    s.dispose();
    expect(scheduler.pending).toBe(0);
    expect(view.destroyed).toBe(true);
    expect(s.status.value).toBe('disposed');
  });

  it('tells the platform when gameplay starts and stops', () => {
    const calls: string[] = [];
    const platform = {
      init: async () => undefined,
      loadingFinished: () => calls.push('loaded'),
      gameplayStart: () => calls.push('start'),
      gameplayStop: () => calls.push('stop'),
      commercialBreak: async () => undefined,
      features: { reelReveal: true, externalLinks: true },
    };
    const { s } = fakeSession({ platform });
    s.start();
    s.pause();
    s.resume();
    s.fastForward(10_000);
    expect(calls).toEqual(['start', 'stop', 'start', 'stop']);
  });
});

describe('BattleSession with the real sim', () => {
  function realMatch(seed: number) {
    const setup = quickBattle(null, content, { generalId: 'kettle', displayName: 'AI Kettle', format: 'short', seed });
    const sim = createSim(setup.config);
    const bots = [
      { side: 1 as const, controller: createFallbackBot(profile(3), 1, seed, content) },
      { side: 0 as const, controller: createFallbackBot(profile(5), 0, seed + 1, content) },
    ];
    const s = new BattleSessionImpl({ sim, mode: setup.mode, opponent: setup.opponent, simVersion: SIM_VERSION, bots });
    s.start();
    s.fastForward(20 * 60 * 10);
    return { s, sim };
  }

  it('plays a bot-vs-bot Short War to the end and records a replay identical to the sim log', () => {
    const { s, sim } = realMatch(7);
    expect(s.status.value).toBe('ended');
    const r = s.result!.replay;
    expect(r).toEqual(buildReplay(sim));
    const again = replayMatch(r, content);
    expect(again.state.outcome).toEqual(r.result);
    expect(again.hash()).toBe(r.finalHash);
    // A replay is small (B3: about 5-20 KB).
    expect(JSON.stringify(r).length).toBeLessThan(40_000);
  });

  it('pushes replays into the store ring of 20', () => {
    const store = new InMemorySaveStore();
    for (let i = 0; i < 3; i += 1) store.pushReplay(realMatch(100 + i).s.result!.replay);
    expect(store.loadReplays()).toHaveLength(3);
    expect(fakeMatchConfig().sides[1].isBot).toBe(true);
  });
});
