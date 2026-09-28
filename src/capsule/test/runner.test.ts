import { describe, expect, it } from 'vitest';
import { FakeAudio } from '@/contracts/fakes/audio';
import { planCapsuleShow, planOpenAll, planWardrobeShow, type ShowPlan, type ShowStep } from '../plan';
import { ShowRunner, type RunnerState, type ShowView } from '../runner';
import { crate, reveal, stack, testCatalog } from './fixtures';

const catalog = testCatalog();

class RecordingView implements ShowView {
  readonly log: string[] = [];
  readonly entered: { id: string; instant: boolean }[] = [];
  readonly lastT = new Map<string, number>();
  waits = 0;
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
  waiting(): void {
    this.waits++;
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
  it('plays the whole show on its own: strikes auto-fire after 1.5 s idle', () => {
    const { view, audio, runner } = setup(silver());
    const ms = run(runner);
    expect(runner.done).toBe(true);
    expect(runner.state.kind).toBe('summary');
    expect(view.waits).toBeGreaterThan(0);
    // Four strikes, each idles 1.5 s: the untouched show takes at least 4 × 1.5 s longer.
    expect(ms).toBeGreaterThan(4 * 1500);
    // Each strike lands with a thump under its clunk or climb note; the burst builds on a riser.
    const capsuleSounds = audio.played().filter((id) => id.startsWith('cap_') || id === 'evolve_riser');
    expect(capsuleSounds.slice(0, 8)).toEqual(['cap_thud', 'cap_riser', 'cap_clunk', 'cap_clunk', 'cap_climb_1', 'cap_climb_2', 'evolve_riser', 'cap_burst']);
    expect(audio.played()).toContain('cap_climb_2');
    expect(audio.played()).toContain('rarity_epic');
    // Every step entered once, in order, none instantly.
    expect(view.entered.map((e) => e.id)).toEqual(runner.plan.steps.map((s) => s.id));
    expect(view.entered.every((e) => !e.instant)).toBe(true);
  });

  it('shows "Tap!" while a strike waits and fires the strike on tap', () => {
    const { runner, states } = setup(silver());
    run(runner, 5000, () => undefined);
    // After arrival + charge (2 s) the first strike waits.
    const waiting = states.find((s) => s.kind === 'strike' && s.phase === 'wait');
    expect(waiting?.prompt).toBe('tap');
    const r2 = setup(silver()).runner;
    let t = 0;
    while (r2.state.phase !== 'wait') {
      r2.update(16);
      t += 16;
    }
    expect(t).toBeGreaterThanOrEqual(2000);
    r2.tap();
    expect(r2.state.phase).toBe('run');
    r2.update(100);
    expect(r2.state.index).toBe(2);
  });

  it('shows "Tap!" late in the charge and a tap there queues the first strike', () => {
    const { runner } = setup(silver());
    while (runner.state.kind !== 'charge') runner.update(16);
    expect(runner.state.prompt).toBeNull();
    runner.tap();
    while (runner.state.prompt !== 'tap') runner.update(16);
    expect(runner.state.kind).toBe('charge');
    runner.tap();
    while (runner.state.kind === 'charge') runner.update(16);
    expect(runner.state.kind).toBe('strike');
    expect(runner.state.phase).toBe('run');
  });

  it('tapping quickly strikes back to back without waiting', () => {
    const { runner } = setup(silver());
    while (runner.state.phase !== 'wait') runner.update(16);
    let ms = 0;
    while (runner.state.kind === 'strike' || runner.state.kind === 'charge') {
      runner.tap();
      runner.update(16);
      ms += 16;
    }
    expect(runner.state.kind).toBe('burst');
    // 4 strikes of 0.6 s with no idle time.
    expect(ms).toBeLessThanOrEqual(4 * 600 + 64);
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
