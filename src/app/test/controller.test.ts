import { describe, expect, it, vi } from 'vitest';
import { UtilityController } from '@/ai';
import type { FakeAudio } from '@/contracts/fakes/audio';
import { FixedClock } from '@/contracts/fakes/clock';
import { AppController, ART_WAIT_MS, QUICK_BATTLE_GENERAL } from '../controller';
import type { SessionView } from '../session';
import { difficultyTier } from '../matchSetup';
import { buildServices, DEFAULT_CHOICE } from '../services';

/** The controller's own flow without meta and save (the meta screens are tested in metaUi.test.ts). */
const NO_META = { ...DEFAULT_CHOICE, save: 'memory', meta: 'none' } as const;

async function controller() {
  const services = await buildServices({ choice: NO_META, clock: new FixedClock() });
  const c = new AppController(services, { save: null, autopilot: true, delay: async () => undefined });
  return { c, services };
}

/** Runs the battle on screen to its end and lets the end flow settle. */
async function finish(c: AppController): Promise<void> {
  const r = c.route.value;
  if (r.id !== 'battle') throw new Error(`not in battle: ${r.id}`);
  r.battle.session.fastForward(20 * 60 * 12);
  for (let i = 0; i < 10 && c.route.value.id === 'battle'; i += 1) await Promise.resolve();
}

describe('AppController: the first session (A8, A9 flow)', () => {
  it('title shows match 1 waiting behind Play; one tap starts it', async () => {
    const { c } = await controller();
    c.showTitle();
    const r = c.route.value;
    expect(r.id).toBe('title');
    if (r.id !== 'title') return;
    expect(r.battle?.setup.opponent.generalId).toBe('grogg');
    expect(r.battle?.session.status.value).toBe('ready');
    c.play();
    expect(c.route.value.id).toBe('battle');
    expect(r.battle?.session.status.value).toBe('running');
  });

  it('match 1 → result → match 2 → result → onboarding done, replays kept', async () => {
    const { c, services } = await controller();
    c.showTitle();
    c.play();
    await finish(c);
    const r1 = c.route.value;
    expect(r1.id).toBe('result');
    if (r1.id !== 'result') return;
    expect(r1.result.input.outcome.winner).toBe(0);
    expect(r1.result.setup.matchNumber).toBe(1);
    expect(c.step.value).toBe('capsule1');

    c.next();
    expect(c.step.value).toBe('match2');
    const r2 = c.route.value;
    expect(r2.id).toBe('battle');
    if (r2.id !== 'battle') return;
    expect(r2.battle.setup.opponent).toMatchObject({ generalId: 'pip', tier: 0, isAI: true, format: 'short' });
    await finish(c);
    expect(c.route.value.id).toBe('result');
    expect(c.step.value).toBe('capsule2');
    c.next();
    expect(c.step.value).toBe('home');
    // After onboarding the start screen keeps the training match vs Old Grogg waiting (Phase 2a).
    const r3 = c.route.value;
    expect(r3.id).toBe('title');
    if (r3.id === 'title') expect(r3.battle?.setup).toMatchObject({ mode: 'tutorial', matchNumber: 1, opponent: { generalId: 'grogg', isAI: true } });
    expect(services.saveStore.loadReplays()).toHaveLength(2);
    expect(c.replays.value).toHaveLength(2);
    expect(services.eventLog.entries().filter((e) => e.kind === 'matchEnd')).toHaveLength(2);
  }, 60_000);

  it('a lost match 2 offers a retry, and Next still moves on (A8 "a loss still gives rewards plus a retry")', async () => {
    const { c } = await controller();
    c.showTitle();
    c.play();
    await finish(c);
    c.next();
    const m2 = c.route.value;
    if (m2.id !== 'battle') throw new Error('match 2 should be running');
    // Retreat (a loss) a minute in; it is open from the start since 2026-10-07 (A2.10).
    m2.battle.session.fastForward(20 * 62);
    expect(m2.battle.session.status.value).toBe('running');
    m2.battle.session.issue({ t: 'retreat', side: 0 });
    await finish(c);
    const lost = c.route.value;
    if (lost.id !== 'result') throw new Error('result expected');
    expect(lost.result.input.outcome).toMatchObject({ winner: 1, reason: 'retreat' });
    expect(c.canRetry(lost.result)).toBe(true);
    expect(c.step.value).toBe('capsule2');

    c.retry();
    const again = c.route.value;
    if (again.id !== 'battle') throw new Error('the retry should be running');
    expect(again.battle.setup).toMatchObject({ mode: 'tutorial', matchNumber: 2, opponent: { generalId: 'pip', isAI: true } });
    expect(again.battle.session.status.value).toBe('running');
    await finish(c);
    expect(c.route.value.id).toBe('result');
    expect(c.step.value).toBe('capsule2');
    c.next();
    expect(c.step.value).toBe('home');
  }, 60_000);

  it('names the player from i18n before a save exists (no hard-coded label)', async () => {
    const { c, services } = await controller();
    c.showTitle();
    const r = c.route.value;
    if (r.id !== 'title' || !r.battle) throw new Error('match 1 should wait on the title');
    expect(r.battle.setup.config.sides[0].label).toBe(services.i18n.t('app.you'));
    expect(r.battle.setup.config.sides[1].label).toBe(services.i18n.t('general.grogg.name'));
  });

  it('Quick Battle: Short War vs an AI General at Normal (tier IV); play again, replay, quit', async () => {
    const { c, services } = await controller();
    const b = c.quickBattle('short');
    expect(b.setup.opponent).toMatchObject({ generalId: QUICK_BATTLE_GENERAL, tier: difficultyTier(services.content), isAI: true, format: 'short' });
    expect(b.session.status.value).toBe('running');
    await finish(c);
    const r = c.route.value;
    expect(r.id).toBe('result');
    if (r.id !== 'result') return;
    c.watchReplay(r.result.replay);
    expect(c.route.value.id).toBe('replay');
    c.home();
    expect(c.route.value.id).toBe('title');
    const again = c.quickBattle('standard');
    expect(again.setup.config.format).toBe('standard');
    c.quit();
    expect(again.session.status.value).toBe('disposed');
  }, 60_000);

  it('the start screen offers the training match vs Old Grogg at any step; Play again replays it', async () => {
    const { c } = await controller();
    const b = c.training();
    expect(b.setup).toMatchObject({ mode: 'tutorial', matchNumber: 1, brain: { kind: 'grogg' }, opponent: { generalId: 'grogg', isAI: true } });
    expect(c.route.value.id).toBe('battle');
    await finish(c);
    expect(c.route.value.id).toBe('result');
    c.playAgain();
    const again = c.route.value;
    if (again.id !== 'battle') throw new Error('the training match should run again');
    expect(again.battle.setup.opponent.generalId).toBe('grogg');
    expect(again.battle).not.toBe(b);
  }, 60_000);

  it('sets the A14.3 music cues: menu on the title, the first age in battle, stop on quit', async () => {
    const services = await buildServices({ choice: { ...NO_META, audio: 'fake' }, clock: new FixedClock() });
    const audio = services.audio as FakeAudio;
    const c = new AppController(services, { save: null, delay: async () => undefined });
    c.showTitle();
    c.quickBattle('short');
    c.quit();
    const music = audio.calls.filter((x) => x.method === 'music.setCue' || x.method === 'music.stop');
    expect(music).toEqual([
      { method: 'music.setCue', cue: 'music.menu', o: { fadeMs: 600 } },
      { method: 'music.setCue', cue: 'music.stone', o: { fadeMs: 600 } },
      { method: 'music.stop', fadeMs: 600 },
      { method: 'music.setCue', cue: 'music.menu', o: { fadeMs: 600 } },
    ]);
  });

  it('the dev autopilot plays the player side with the real AI outside the tutorial (B13)', async () => {
    const { c } = await controller();
    const b = c.quickBattle('short');
    const bots = (b.session as unknown as { bots: { side: number; controller: unknown }[] }).bots;
    expect(bots.map((x) => x.side).sort()).toEqual([0, 1]);
    expect(bots.find((x) => x.side === 0)?.controller).toBeInstanceOf(UtilityController);
    await finish(c);
    const r = c.route.value;
    if (r.id !== 'result') throw new Error('result expected');
    expect(r.result.replay.commands.some((x) => x.side === 0)).toBe(true);
  }, 60_000);
});

describe('AppController: a battle waits for its unit sheets (G7, Safari memory)', () => {
  /** A view whose decks' sheets load until the test says so. */
  function slowArt(): { view: () => SessionView; done: () => void } {
    let resolve: (() => void) | null = null;
    let loaded = false;
    const ready = new Promise<void>((r) => (resolve = r));
    return {
      view: () => ({
        onEvents: () => undefined,
        render: () => undefined,
        simFrozen: false,
        setSpeed: () => undefined,
        setPaused: () => undefined,
        artReady: () => (loaded ? null : ready),
      }),
      done: () => {
        loaded = true;
        resolve?.();
      },
    };
  }

  it('the clock starts once the sheets are in, so no unit appears without its art', async () => {
    const services = await buildServices({ choice: NO_META, clock: new FixedClock() });
    const art = slowArt();
    const c = new AppController(services, { save: null, autopilot: true, delay: async () => undefined, createView: art.view });
    c.showTitle();
    c.play();
    const r = c.route.value;
    if (r.id !== 'battle') throw new Error('battle expected');
    expect(r.battle.session.status.value).toBe('ready');
    art.done();
    await Promise.resolve();
    await Promise.resolve();
    expect(r.battle.session.status.value).toBe('running');
  });

  it('the dev fast-forward starts it at once; the late art then starts nothing twice', async () => {
    const services = await buildServices({ choice: NO_META, clock: new FixedClock() });
    const art = slowArt();
    const c = new AppController(services, { save: null, autopilot: true, delay: async () => undefined, createView: art.view });
    c.showTitle();
    c.play();
    const r = c.route.value;
    if (r.id !== 'battle') throw new Error('battle expected');
    c.startNow();
    expect(r.battle.session.status.value).toBe('running');
    r.battle.session.pause();
    art.done();
    await Promise.resolve();
    await Promise.resolve();
    // the waiting start was dropped: the paused battle stays paused
    expect(r.battle.session.status.value).toBe('paused');
  });

  it('starts anyway after ART_WAIT_MS (a sheet still missing then draws its fallback)', async () => {
    vi.useFakeTimers();
    try {
      const services = await buildServices({ choice: NO_META, clock: new FixedClock() });
      const art = slowArt();
      const c = new AppController(services, { save: null, autopilot: true, delay: async () => undefined, createView: art.view });
      c.showTitle();
      c.play();
      const r = c.route.value;
      if (r.id !== 'battle') throw new Error('battle expected');
      await vi.advanceTimersByTimeAsync(ART_WAIT_MS - 100);
      expect(r.battle.session.status.value).toBe('ready');
      await vi.advanceTimersByTimeAsync(200);
      expect(r.battle.session.status.value).toBe('running');
    } finally {
      vi.useRealTimers();
    }
  });
});
