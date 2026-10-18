/**
 * A live (online) match in the battle session (queue item 34, `session.ts`): no pause (P and back ask for
 * the menu), no tempo of its own, no pause on a hidden tab, missed time caught up deterministically (the
 * bots keep playing, the view silent, input held, a slice per frame), and away too long ends as a Retreat.
 * Offline sessions are unchanged (session.test.ts).
 */
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { BotController, Command, Observation, OpponentSpec } from '@/contracts';
import { content } from '@/content';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { fakeContent } from '@/contracts/fakes/content';
import { createFakeSim, FakeSim } from '@/contracts/fakes/sim';
import { BattleView } from '@/render/battleView';
import type { LabelFactory } from '@/render/feel/numbers';
import { createSim, SIM_VERSION } from '@/sim';
import { createFallbackBot } from '../fallbackBot';
import { generalOpponent, quickBattle } from '../matchSetup';
import { BattleSessionImpl, MAX_AWAY_MS, type BattleSessionOptions, type FrameScheduler } from '../session';
import { FakeVisibility, ManualScheduler, RecordingView, profile } from './helpers';

const opponent: OpponentSpec = generalOpponent(fakeContent, { generalId: 'pip', displayName: 'AI Pip', tier: 0, level: 1, format: 'short', seed: 1 });

/** Records silence and catch-up steps too. */
class SilentView extends RecordingView {
  silent: boolean[] = [];
  /** The renders that were catch-up steps (not drawn frames; the Auto preset must not time them). */
  catchUpRenders: number[] = [];
  setSilent(on: boolean): void {
    this.silent.push(on);
  }
  override render(alpha: number, frameMs: number, catchUp?: boolean): void {
    super.render(alpha, frameMs);
    if (catchUp === true) this.catchUpRenders.push(frameMs);
  }
}

function liveSession(o: Partial<BattleSessionOptions> = {}) {
  const sim = createFakeSim();
  const view = new SilentView();
  const s = new BattleSessionImpl({ sim, mode: 'ladder', opponent, simVersion: 'test', view, live: true, ...o });
  return { s, view, sim };
}

/** A live session over the real sim (the fake sim's scripted match ends at tick 240), with the fallback bot. */
function realSession(o: Partial<BattleSessionOptions> = {}) {
  const setup = quickBattle(null, content, { generalId: 'kettle', displayName: 'AI Kettle', format: 'standard', seed: 9 });
  const sim = createSim(setup.config);
  const s = new BattleSessionImpl({
    sim,
    mode: 'ladder',
    opponent: setup.opponent,
    simVersion: SIM_VERSION,
    bots: [{ side: 1, controller: createFallbackBot(profile(3), 1, 9, content) }],
    live: true,
    ...o,
  });
  return { s, sim };
}

/** A bot that counts the ticks it was asked about. */
class CountingBot implements BotController {
  readonly snapshotDelayTicks = 0;
  ticks = 0;
  onTick(_obs: Observation): Command[] {
    this.ticks += 1;
    return [];
  }
}

/** A scheduler whose clock moves `step` ms every time it is read (to see the per-frame budget work). */
class BusyScheduler implements FrameScheduler {
  t = 0;
  constructor(private readonly step = 1) {}
  request(): number {
    return 1;
  }
  cancel(): void {}
  now(): number {
    this.t += this.step;
    return this.t;
  }
}

describe('a live match never pauses (queue item 34)', () => {
  it("the player's pause asks for the menu instead and the battle runs on", () => {
    const { s, sim } = liveSession();
    s.start();
    s.pause();
    expect(s.status.value).toBe('running');
    expect(s.pauseAsks.value).toBe(1);
    s.pause('hidden');
    s.pause('system');
    expect(s.pauseAsks.value).toBe(1);
    s.advance(100);
    expect(sim.state.tick).toBe(2);
    expect(s.hud.value.paused).toBe(false);
  });

  it('a hidden tab does not pause it', () => {
    const vis = new FakeVisibility();
    const { s } = liveSession({ visibility: vis });
    s.start();
    vis.set(true);
    expect(s.status.value).toBe('running');
    vis.set(false);
    expect(s.status.value).toBe('running');
  });

  it('a battle that starts while hidden starts running (offline it would start paused)', () => {
    const vis = new FakeVisibility();
    vis.hidden = true;
    const { s } = liveSession({ visibility: vis });
    s.start();
    expect(s.status.value).toBe('running');
  });

  it('starts at 1x whatever the default speed; the speed button does nothing, an agreed speed applies', () => {
    const { s, view, sim } = liveSession({ speed: 2 });
    expect(s.currentSpeed).toBe(1);
    s.start();
    s.setSpeed(2);
    expect(s.currentSpeed).toBe(1);
    s.setAgreedSpeed(2);
    expect(s.currentSpeed).toBe(2);
    expect(view.speed).toBe(2);
    expect(s.hud.value.speed).toBe(2);
    s.advance(50);
    expect(sim.state.tick).toBe(2);
  });
});

describe('a live match catches up the time it missed (queue item 34)', () => {
  it('a long frame (frames stopped while hidden) is caught up instead of clamped, and the bots play through it', () => {
    const bot = new CountingBot();
    const { s, sim, view } = liveSession({ bots: [{ side: 1, controller: bot }] });
    s.start();
    s.advance(4000);
    // 250 ms in the frame clock plus 3,750 ms owed = 80 ticks, all run (no scheduler: no budget)
    expect(sim.state.tick).toBe(80);
    expect(bot.ticks).toBe(80);
    expect(s.catchUp.value).toBeNull();
    expect(s.catchingUp).toBe(false);
    // the view is silent during the catch-up and advanced every 5 ticks without drawing each one
    expect(view.silent).toEqual([true, false]);
    expect(view.renders.filter((r) => r.frameMs === 250).length).toBe(Math.floor(75 / 5));
    // those steps are flagged so the view's Auto preset does not take them for slow frames (it would drop
    // to Lite after any absence of a few seconds), and so is the frame's own render: it caught up (review O B2)
    expect(view.catchUpRenders).toEqual([...new Array<number>(15).fill(250), 4000]);
    expect(view.renders.length).toBe(15 + 1);
    // the next, ordinary frame is timed again
    s.advance(16);
    expect(view.catchUpRenders).toHaveLength(16);
    expect(view.renders).toHaveLength(17);
  });

  it('is deterministic: one long gap or many frames reach the same tick and state', () => {
    const a = liveSession();
    a.s.start();
    a.s.advance(3000);
    const b = liveSession();
    b.s.start();
    for (let i = 0; i < 60; i += 1) b.s.advance(50);
    expect(a.sim.state.tick).toBe(b.sim.state.tick);
    expect(a.sim.hash()).toBe(b.sim.hash());
  });

  it('runs a slice per frame on a real clock, holds input meanwhile and reports its progress', () => {
    const sch = new BusyScheduler();
    const { s, sim } = liveSession({ scheduler: sch });
    s.start();
    s.owe(9000);
    expect(s.catchUp.value).toMatchObject({ behindMs: 9000, doneBp: 0 });
    s.advance(16);
    const first = sim.state.tick;
    expect(first).toBeGreaterThan(4);
    expect(first).toBeLessThan(180);
    expect(s.catchingUp).toBe(true);
    const mid = s.catchUp.value!;
    expect(mid.doneBp).toBeGreaterThan(0);
    expect(mid.doneBp).toBeLessThan(10_000);
    // input waits until the battle has caught up
    s.issue({ t: 'train', side: 0, slot: 0 });
    let frames = 0;
    while (s.catchingUp && frames < 100) {
      s.advance(16);
      frames += 1;
    }
    expect(s.catchUp.value).toBeNull();
    expect(frames).toBeGreaterThan(0);
    expect(s.commands.filter((c) => c.side === 0)).toEqual([]);
  });

  it('measures the away time on the wall clock too (a suspended app may stop the frame clock)', () => {
    const vis = new FakeVisibility();
    let wall = 1_000_000;
    const sch = new ManualScheduler();
    const { s, sim } = liveSession({ visibility: vis, scheduler: sch, wallClock: () => wall });
    s.start();
    sch.frame(16);
    sch.frame(16);
    const before = sim.state.tick;
    vis.set(true);
    wall += 10_000;
    vis.set(false);
    // the frame clock moved only 16 ms (it stood still while suspended), the wall clock 10 s
    sch.frame(16);
    expect(sim.state.tick - before).toBeGreaterThanOrEqual(199);
    expect(sim.state.tick - before).toBeLessThanOrEqual(201);
  });

  it('owes nothing for time before the start (the art loading, the countdown)', () => {
    const sch = new ManualScheduler();
    const { s, sim } = liveSession({ scheduler: sch });
    sch.frame(16);
    sch.frame(30_000);
    s.start();
    sch.frame(16);
    expect(sim.state.tick).toBe(0);
    sch.frame(50);
    expect(sim.state.tick).toBe(1);
  });

  it('stops catching up when the match ends during it', () => {
    const { s, sim, view } = liveSession();
    s.start();
    // the fake sim's skirmish ends at tick 240 (12 s)
    s.advance(20_000);
    expect(s.status.value).toBe('ended');
    expect(sim.state.outcome).not.toBeNull();
    expect(s.catchUp.value).toBeNull();
    expect(view.silent.at(-1)).toBe(false);
  });

  it('offline matches never owe time (the long frame is clamped as before)', () => {
    const sim = createFakeSim();
    const s = new BattleSessionImpl({ sim, mode: 'skirmish', opponent, simVersion: 'test' });
    s.start();
    s.owe(5000);
    s.advance(5000);
    expect(sim.state.tick).toBe(5);
    expect(s.catchUp.value).toBeNull();
  });

  it("the battle view's Auto graphics keep their preset through a catch-up (its steps are not slow frames)", () => {
    const labels: LabelFactory = () => {
      const root = new Container();
      return { root, setText: (t) => (root.label = t), setStyle: () => {} };
    };
    const run = (catchUp: boolean) => {
      const view = new BattleView({ sim: new FakeSim(), art: new FakeArtProvider(), audio: new FakeAudio(), labelFactory: labels });
      view.resize(1280, 720);
      // two seconds of smooth 60 fps frames (past the monitor's warm-up), then a 15 s catch-up's steps
      for (let i = 0; i < 120; i += 1) view.render(0, 1000 / 60);
      for (let i = 0; i < 60; i += 1) view.render(0, 250, catchUp);
      for (let i = 0; i < 30; i += 1) view.render(0, 1000 / 60);
      const preset = view.preset;
      view.destroy();
      return preset;
    };
    expect(run(true)).toBe('high');
    // timed as frames, the same steps would have dropped the match to Lite (DPR 1, fewer effects)
    expect(run(false)).toBe('lite');
  });

  it("keeps the Auto graphics through a long catch-up whose real frames take two vsyncs (review O B2)", () => {
    const labels: LabelFactory = () => {
      const root = new Container();
      return { root, setText: (t) => (root.label = t), setStyle: () => {} };
    };
    // a phone: catch-up frames take 33 ms (the slice and the HUD on top of a normal frame), the steps between
    // them are flagged; before the fix the frames' own renders were timed and 30 of them meant Lite for good
    const run = (flagFrames: boolean) => {
      const bv = new BattleView({ sim: new FakeSim(), art: new FakeArtProvider(), audio: new FakeAudio(), labelFactory: labels });
      bv.resize(1280, 720);
      const view = {
        onEvents: () => undefined,
        render: (a: number, f: number, c?: boolean) => bv.render(a, f, flagFrames ? c : c === true && f !== 33),
        simFrozen: false,
        setSpeed: () => undefined,
        setPaused: () => undefined,
      };
      const sch = new BusyScheduler(3);
      const { s } = realSession({ view, scheduler: sch });
      // five seconds of smooth 60 fps frames first: the monitor's 3 s window is full, as in a running match
      for (let i = 0; i < 300; i += 1) bv.render(0, 1000 / 60);
      s.start();
      s.owe(110_000);
      let frames = 0;
      while (s.catchingUp && frames < 400) {
        s.advance(33);
        frames += 1;
      }
      for (let i = 0; i < 30; i += 1) s.advance(1000 / 60);
      const out = { preset: bv.preset, frames };
      s.dispose();
      bv.destroy();
      return out;
    };
    const fixed = run(true);
    // more than the ~31 two-vsync frames that tip a full window of 60 fps frames over the 20 ms average
    expect(fixed.frames).toBeGreaterThanOrEqual(35);
    expect(fixed.preset).toBe('high');
    // the same frames timed (the old behaviour) drop the match to Lite
    expect(run(false).preset).toBe('lite');
  });

  it('owes a suspend no visibility event reported (the wall clock jumped, the frame clock did not; review O nit 8)', () => {
    let wall = 5_000_000;
    const sch = new ManualScheduler();
    const { s, sim } = realSession({ scheduler: sch, wallClock: () => wall });
    s.start();
    sch.frame(16);
    wall += 16;
    sch.frame(16);
    wall += 16;
    const before = sim.state.tick;
    // a laptop asleep for 20 s: performance.now stood still, Date.now did not, and no visibilitychange came
    wall += 20_000;
    sch.frame(16);
    expect(sim.state.tick - before).toBeGreaterThanOrEqual(399);
    expect(sim.state.tick - before).toBeLessThanOrEqual(401);
    // a small wall clock wobble (an NTP nudge, a slow frame) owes nothing extra
    const mid = sim.state.tick;
    wall += 900;
    sch.frame(16);
    expect(sim.state.tick - mid).toBeLessThanOrEqual(1);
  });

  it('uses a larger slice once the cue shows, so a long catch-up ends sooner (review O nit 9)', () => {
    const sch = new BusyScheduler();
    const { s, sim } = realSession({ scheduler: sch });
    s.start();
    s.owe(60_000);
    const per: number[] = [];
    for (let i = 0; i < 60 && s.catchingUp; i += 1) {
      const t0 = sim.state.tick;
      s.advance(16);
      per.push(sim.state.tick - t0);
    }
    // the first frames run the 12 ms slice; once the catch-up has run 150 ms (the cue's delay) frames run more
    expect(Math.max(...per)).toBeGreaterThan(per[0]! * 2);
  });

  it('still gets shorter every frame on a device so slow that its frames owe more than the slice runs', () => {
    // each frame takes 600 ms (350 ms over B6's clamp is owed again, 7 ticks) and every clock read costs 13 ms,
    // so the budget alone allows 4 ticks a frame and the debt would grow for ever: the slice still runs this
    // frame's debt and 4 ticks more (CI's WebKit, the flaky hidden-tab e2e)
    class SlowScheduler implements FrameScheduler {
      t = 0;
      request(): number {
        return 1;
      }
      cancel(): void {}
      now(): number {
        this.t += 13;
        return this.t;
      }
    }
    const { s } = realSession({ scheduler: new SlowScheduler() });
    s.start();
    s.owe(8000);
    let frames = 0;
    let last = s.catchUp.value!.behindGameMs;
    while (s.catchingUp && frames < 200) {
      s.advance(600);
      frames += 1;
      const now = s.catchUp.value?.behindGameMs ?? 0;
      expect(now).toBeLessThan(last);
      last = now;
    }
    expect(s.catchingUp).toBe(false);
    expect(frames).toBeLessThan(60);
  });
});

describe('away too long leaves a live match (queue item 34)', () => {
  function realLive() {
    const setup = quickBattle(null, content, { generalId: 'kettle', displayName: 'AI Kettle', format: 'short', seed: 9 });
    const sim = createSim(setup.config);
    const s = new BattleSessionImpl({
      sim,
      mode: 'ladder',
      opponent: setup.opponent,
      simVersion: SIM_VERSION,
      bots: [{ side: 1, controller: createFallbackBot(profile(3), 1, 9, content) }],
      live: true,
    });
    return { s, sim };
  }

  it(`an absence longer than ${MAX_AWAY_MS / 1000} s ends the match at once as a Retreat (a loss, as a reload)`, () => {
    const { s, sim } = realLive();
    s.start();
    s.advance(50);
    const ended: string[] = [];
    s.onEnd((r) => ended.push(r.outcome.reason));
    s.advance(MAX_AWAY_MS + 1000);
    expect(s.status.value).toBe('ended');
    expect(sim.state.outcome).toMatchObject({ winner: 1, reason: 'retreat' });
    expect(ended).toEqual(['retreat']);
    expect(s.awayForfeit.value).toBe(true);
    // it did not simulate the two minutes first
    expect(sim.state.tick).toBeLessThan(10);
  });

  it('a shorter absence is caught up and the match goes on', () => {
    const { s, sim } = realLive();
    s.start();
    s.advance(60_000);
    expect(s.status.value).toBe('running');
    expect(sim.state.tick).toBe(1200);
    expect(s.awayForfeit.value).toBe(false);
  });

  it('lets a Retreat through while it catches up (leaving never waits); other input stays held (review O nit 2)', () => {
    const { s, sim } = realLive();
    s.start();
    s.advance(50);
    s.owe(9000);
    expect(s.catchingUp).toBe(true);
    s.issue({ t: 'train', side: 0, slot: 0 });
    s.issue({ t: 'retreat', side: 0 });
    s.advance(16);
    expect(s.status.value).toBe('ended');
    expect(sim.state.outcome).toMatchObject({ winner: 1, reason: 'retreat' });
    expect(s.commands.filter((c) => c.side === 0).map((c) => c.t)).toEqual(['retreat']);
    expect(s.catchUp.value).toBeNull();
  });

  it('time owed never piles up past the limit (a device too slow to keep up drops the excess)', () => {
    const sim = createFakeSim();
    const s = new BattleSessionImpl({ sim, mode: 'ladder', opponent, simVersion: 'test', live: true, scheduler: new BusyScheduler() });
    s.start();
    for (let i = 0; i < 5; i += 1) s.owe(MAX_AWAY_MS - 1000);
    expect(s.catchUp.value!.behindMs).toBeLessThanOrEqual(MAX_AWAY_MS);
    expect(s.awayForfeit.value).toBe(false);
  });
});
