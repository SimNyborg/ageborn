import { describe, expect, it } from 'vitest';
import { FakeAudio } from '@/contracts/fakes/audio';
import { nominalDurationMs, planCapsuleShow, planOpenAll, planWardrobeShow, SHOW_TIMING, type ShowPlan, type ShowStep } from '../plan';
import { ShowRunner, type RunnerState, type ShowView, type StrikeHit, type TimedStrike } from '../runner';
import { crate, reveal, stack, testCatalog } from './fixtures';

const catalog = testCatalog();

class RecordingView implements ShowView {
  readonly log: string[] = [];
  readonly entered: { id: string; instant: boolean }[] = [];
  readonly lastT = new Map<string, number>();
  readonly hits: StrikeHit[] = [];
  enter(step: ShowStep, instant: boolean): void {
    this.entered.push({ id: step.id, instant });
    this.log.push(`enter ${step.id}${instant ? ' (instant)' : ''}`);
  }
  progress(step: ShowStep, tMs: number): void {
    this.lastT.set(step.id, tMs);
  }
  exit(step: ShowStep): void {
    this.log.push(`exit ${step.id}`);
  }
  strikeHit(_step: TimedStrike, hit: StrikeHit): void {
    this.hits.push(hit);
  }
}

function setup(plan: ShowPlan) {
  const view = new RecordingView();
  const audio = new FakeAudio();
  const states: RunnerState[] = [];
  const runner = new ShowRunner(plan, view, { audio, onState: (s) => states.push(s) });
  runner.start();
  return { view, audio, runner, states };
}

/** Advances in 16 ms frames until done or `maxMs` of real time has passed. Returns elapsed ms. */
function run(runner: ShowRunner, maxMs = 120000, each?: (ms: number) => void): number {
  let ms = 0;
  while (!runner.done && ms < maxMs) {
    runner.update(16);
    ms += 16;
    each?.(ms);
  }
  return ms;
}

const silver = () =>
  planCapsuleShow(
    reveal({
      tier: 'silver',
      stacks: [stack('bonker', 'common', { copies: 6 }), stack('spear_hunter', 'rare', { copies: 3 }), stack('sabertooth', 'epic', { isNew: true })],
    }),
    { catalog },
  );

describe('ShowRunner (DESIGN A10 Input)', () => {
  it('plays the whole show on its own: every strike lands on its beat without a tap', () => {
    const { view, audio, runner } = setup(silver());
    const ms = run(runner);
    expect(runner.done).toBe(true);
    expect(runner.state.kind).toBe('summary');
    // Four strikes of 800 ms each, no waiting: the untouched show is the plan's nominal length.
    expect(ms).toBeGreaterThanOrEqual(nominalDurationMs(runner.plan) - 16);
    expect(ms).toBeLessThanOrEqual(nominalDurationMs(runner.plan) + 48);
    // Each strike counts in with three rising ticks, then lands with its clunk or climb note.
    const capsuleSounds = audio.played().filter((id) => (id.startsWith('cap_') && id !== 'cap_strike_tick') || id === 'evolve_riser');
    expect(capsuleSounds.slice(0, 8)).toEqual(['cap_thud', 'cap_riser', 'cap_clunk', 'cap_clunk', 'cap_climb_1', 'cap_climb_2', 'evolve_riser', 'cap_burst']);
    expect(audio.played().filter((id) => id === 'cap_strike_tick')).toHaveLength(12);
    // No tap, no graded layer.
    expect(audio.played()).not.toContain('cap_strike_perfect');
    expect(view.hits).toEqual([]);
    expect(audio.played()).toContain('rarity_epic');
    // Every step entered once, in order, none instantly.
    expect(view.entered.map((e) => e.id)).toEqual(runner.plan.steps.map((s) => s.id));
    expect(view.entered.every((e) => !e.instant)).toBe(true);
  });

  it('shows the tap prompt late in the charge and through the strikes until the first tap', () => {
    const { runner } = setup(silver());
    while (runner.state.kind !== 'charge') runner.update(16);
    expect(runner.state.prompt).toBeNull();
    while (runner.state.prompt !== 'tap') runner.update(16);
    expect(runner.state.kind).toBe('charge');
    // A tap in the charge neither hurries it nor starts the strikes early.
    const idx = runner.state.index;
    const t = runner.stepTimeMs;
    runner.tap();
    runner.update(16);
    expect(runner.state.index).toBe(idx);
    expect(runner.stepTimeMs).toBeCloseTo(t + 16, 5);
    while (runner.state.kind === 'charge') runner.update(16);
    expect(runner.state.kind).toBe('strike');
    expect(runner.state.prompt).toBe('tap');
    runner.tap();
    expect(runner.state.prompt).toBeNull();
  });

  it('keeps the beat when the player mashes: strikes never hurry or wait', () => {
    const plain = setup(silver());
    while (plain.runner.state.kind !== 'strike') plain.runner.update(16);
    let quiet = 0;
    while (plain.runner.state.kind === 'strike') {
      plain.runner.update(16);
      quiet += 16;
    }
    const masher = setup(silver());
    while (masher.runner.state.kind !== 'strike') masher.runner.update(16);
    let mashed = 0;
    while (masher.runner.state.kind === 'strike') {
      masher.runner.tap();
      masher.runner.update(16);
      mashed += 16;
    }
    expect(mashed).toBe(quiet);
    expect(Math.abs(quiet - 4 * SHOW_TIMING.strikeMs)).toBeLessThanOrEqual(16);
    // Mashing uses up each strike's one judged tap early: no Perfects to farm.
    expect(masher.view.hits.every((h) => h.grade === 'miss')).toBe(true);
    expect(masher.view.hits).toHaveLength(4);
  });

  it('fast-forwards at 3× while held, and taps hurry a flip', () => {
    const plain = setup(silver());
    const t1 = run(plain.runner);
    const held = setup(silver());
    held.runner.setHold(true);
    const t2 = run(held.runner);
    expect(t2).toBeLessThan(t1 / 2.5);

    const tapper = setup(silver());
    while (tapper.runner.state.kind !== 'flip') tapper.runner.update(16);
    const idx = tapper.runner.state.index;
    const flipMs = tapper.runner.step?.durationMs ?? 0;
    tapper.runner.tap();
    let ms = 0;
    while (tapper.runner.state.index === idx) {
      tapper.runner.update(16);
      ms += 16;
    }
    // Hurried at 4×, the flip (with its snap and count-up) ends in a quarter of its time.
    expect(ms).toBeLessThanOrEqual(Math.ceil(flipMs / 4 / 16) * 16 + 32);
    expect(ms).toBeLessThan(flipMs / 2);
  });

  it('skip jumps to the summary, finishing skipped steps silently', () => {
    const { view, audio, runner } = setup(silver());
    runner.update(100);
    expect(runner.state.canSkip).toBe(true);
    audio.clear();
    runner.skip();
    expect(runner.done).toBe(true);
    expect(runner.state.kind).toBe('summary');
    expect(runner.state.opened).toBe(true);
    expect(audio.played()).toEqual([]);
    const instant = view.entered.filter((e) => e.instant).map((e) => e.id);
    expect(instant).toContain('burst');
    expect(instant).toContain('strike-3');
    // Skipped steps are entered and exited, never progressed.
    expect(view.lastT.has('strike-3')).toBe(false);
    expect(view.log).toContain('exit strike-3');
    expect(view.log).toContain('exit arrival');
  });

  it('never skips a first-ever Legendary walkout, and cannot fast-forward it', () => {
    const plan = planCapsuleShow(
      reveal({
        tier: 'aeon',
        stacks: [stack('bonker', 'common'), stack('matriarch', 'legendary', { isNew: true })],
        firstLegendary: ['matriarch'],
      }),
      { catalog },
    );
    const { runner, audio } = setup(plan);
    runner.update(50);
    runner.skip();
    expect(runner.state.kind).toBe('walkout');
    expect(runner.state.canSkip).toBe(false);
    expect(runner.state.canFastForward).toBe(false);
    runner.skip();
    runner.tap();
    runner.setHold(true);
    let ms = 0;
    while (runner.state.kind === 'walkout') {
      runner.update(16);
      ms += 16;
    }
    expect(ms).toBeGreaterThanOrEqual(9000 - 16);
    expect(ms).toBeLessThanOrEqual(10000);
    expect(audio.played()).toContain('walkout_bass');
    expect(audio.calls.some((c) => c.method === 'music.duck')).toBe(true);
    // After the walkout, Skip works again.
    runner.setHold(false);
    runner.skip();
    expect(runner.state.kind).toBe('summary');
  });

  it('lets a repeat Legendary walkout be skipped', () => {
    const plan = planCapsuleShow(reveal({ tier: 'aeon', stacks: [stack('matriarch', 'legendary')] }), { catalog });
    const { runner } = setup(plan);
    while (runner.state.kind !== 'walkout') runner.update(16);
    expect(runner.state.canSkip).toBe(true);
    runner.skip();
    expect(runner.state.kind).toBe('summary');
  });

  it('plays every cue exactly once, in plan order', () => {
    const plan = silver();
    const cues: string[] = [];
    const runner = new ShowRunner(plan, new RecordingView(), { onCue: (c, s) => cues.push(`${s.id}:${c.sound}@${c.atMs}`) });
    runner.start();
    run(runner);
    const expected = plan.steps.flatMap((s) => s.cues.map((c) => `${s.id}:${c.sound}@${c.atMs}`));
    expect(cues).toEqual(expected);
  });

  it('clamps long frames so a hidden tab does not jump the show', () => {
    const { runner } = setup(silver());
    runner.update(60000);
    expect(runner.state.index).toBeLessThanOrEqual(1);
  });

  it('runs Open all and the Wardrobe Crate card flip to their summaries', () => {
    const all = planOpenAll(
      Array.from({ length: 10 }, (_, i) =>
        reveal({ id: `c${i}`, tier: i === 9 ? 'jade' : 'bronze', stacks: [stack(`u${i}`, i % 4 === 0 ? 'epic' : 'common', { isNew: i === 4 })] }),
      ),
      { catalog },
    );
    const a = setup(all);
    run(a.runner);
    expect(a.runner.done).toBe(true);
    expect(a.audio.played().filter((s) => s === 'cap_burst')).toHaveLength(10);

    const w = setup(planWardrobeShow(crate('ghost_corsair', 'epic'), { catalog }));
    const ms = run(w.runner);
    expect(w.runner.done).toBe(true);
    expect(ms).toBeGreaterThanOrEqual(500 + 700 + 300 + 800 - 32);
    expect(w.audio.played()).not.toContain('reel_tick');
    expect(w.audio.played()).toContain('rarity_epic');
  });
});
