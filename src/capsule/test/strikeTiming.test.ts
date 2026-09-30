/**
 * The hammer's timing window (DESIGN A10 step 3, owner request 2026-09-29): the pure window logic in
 * ms, and the honesty rule that a tap's timing is feel only. Whatever the player taps, the plan, the
 * timeline, every cue of the plan and every tier the drum shows are the same; only the graded layer
 * (a sound, the view's flourish) differs.
 */
import { describe, expect, it } from 'vitest';
import { FakeAudio } from '@/contracts/fakes/audio';
import { planCapsuleShow, SHOW_TIMING, type ShowPlan, type ShowStep } from '../plan';
import { ShowRunner, type ShowView, type StrikeHit, type TimedStrike } from '../runner';
import { comboPitchBp, gradeOffset, judgeTap, MAX_OUTPUT_LATENCY_MS, nextCombo, STRIKE_WINDOW, strikeOffsetMs, windowCloseMs, windowForOutputLatency } from '../strikeTiming';
import { reveal, stack, testCatalog } from './fixtures';

const catalog = testCatalog();
const W = STRIKE_WINDOW;
const I = SHOW_TIMING.strikeImpactMs;
/** A tap measured this late in step time is dead on the (latency-corrected) hit. */
const ON = I + W.latencyMs;

describe('strike timing window (pure, ms)', () => {
  it('grades a latency-corrected offset: Perfect ±60, Good ±140, else a miss', () => {
    expect(W).toEqual({ perfectMs: 60, goodMs: 140, latencyMs: 30, lockMs: 180, minGapMs: 150 });
    expect(gradeOffset(0)).toBe('perfect');
    expect(gradeOffset(-60)).toBe('perfect');
    expect(gradeOffset(60)).toBe('perfect');
    expect(gradeOffset(-61)).toBe('good');
    expect(gradeOffset(61)).toBe('good');
    expect(gradeOffset(-140)).toBe('good');
    expect(gradeOffset(140)).toBe('good');
    expect(gradeOffset(-141)).toBe('miss');
    expect(gradeOffset(141)).toBe('miss');
  });

  it('centres the window a little after the hit, for display, audio and touch latency', () => {
    expect(strikeOffsetMs(I, I)).toBe(-W.latencyMs);
    expect(strikeOffsetMs(ON, I)).toBe(0);
    expect(judgeTap(ON, I)).toEqual({ grade: 'perfect', offsetMs: 0 });
    // Measured on the hit itself: still Perfect (the latency is inside the window).
    expect(judgeTap(I, I)?.grade).toBe('perfect');
    expect(judgeTap(ON + 60, I)?.grade).toBe('perfect');
    expect(judgeTap(ON + 61, I)?.grade).toBe('good');
    expect(judgeTap(ON - 61, I)?.grade).toBe('good');
  });

  it('is not a reflex test: a reaction to the hit (180 ms or more after it) is outside the window', () => {
    expect(judgeTap(I + 180, I)).toBeNull();
    expect(judgeTap(I + 250, I)).toBeNull();
    expect(windowCloseMs(I)).toBe(I + W.latencyMs + W.goodMs);
  });

  it('counts one tap per strike from the lock on, so an early tap is a miss and earlier taps are ignored', () => {
    expect(judgeTap(ON - 180, I)).toEqual({ grade: 'miss', offsetMs: -180 });
    expect(judgeTap(ON - 141, I)?.grade).toBe('miss');
    expect(judgeTap(ON - 181, I)).toBeNull();
    expect(judgeTap(0, I)).toBeNull();
  });

  it('starts the lock after the third tick, so a tap on each tick never uses up the strike', () => {
    for (let k = 0; k < SHOW_TIMING.strikeTicks; k++) expect(judgeTap(k * SHOW_TIMING.strikeBeatMs, I)).toBeNull();
    // Even a tap on the third tick a little late (40 ms) is not counted yet.
    expect(judgeTap(2 * SHOW_TIMING.strikeBeatMs + 40, I)).toBeNull();
  });

  it('makes a counted tap that follows the last one too closely a miss (mashing), not one on the beat', () => {
    expect(judgeTap(ON, I, W, W.minGapMs - 1)).toEqual({ grade: 'miss', offsetMs: 0 });
    expect(judgeTap(ON, I, W, W.minGapMs)).toEqual({ grade: 'perfect', offsetMs: 0 });
    expect(judgeTap(ON, I, W, SHOW_TIMING.strikeBeatMs)?.grade).toBe('perfect');
  });

  it('follows the audio output latency (half of it, clamped), keeping the window inside the strike', () => {
    expect(windowForOutputLatency(0)).toEqual(W);
    expect(windowForOutputLatency(40).latencyMs).toBe(W.latencyMs + 20);
    expect(windowForOutputLatency(150).latencyMs).toBe(W.latencyMs + MAX_OUTPUT_LATENCY_MS / 2);
    expect(windowForOutputLatency(-5)).toEqual(W);
    expect(windowForOutputLatency(Number.NaN)).toEqual(W);
    const widest = windowForOutputLatency(1000);
    expect(windowCloseMs(SHOW_TIMING.strikeImpactMs, widest)).toBeLessThan(SHOW_TIMING.strikeMs);
  });

  it('builds a combo on consecutive Perfects only, and pitches the Perfect ring up a major scale', () => {
    let c = 0;
    for (const g of ['perfect', 'perfect', 'perfect'] as const) c = nextCombo(c, g);
    expect(c).toBe(3);
    expect(nextCombo(3, 'good')).toBe(0);
    expect(nextCombo(3, 'miss')).toBe(0);
    expect(nextCombo(3, null)).toBe(0);
    expect([1, 2, 3, 4, 5, 6, 7].map(comboPitchBp)).toEqual([10000, 11225, 12599, 13348, 14983, 16818, 16818]);
  });

  it('is deterministic integer maths', () => {
    for (let t = 0; t < 800; t += 7) {
      const a = judgeTap(t, I);
      const b = judgeTap(t, I);
      expect(a).toEqual(b);
      if (a) expect(Number.isInteger(a.offsetMs)).toBe(true);
    }
  });
});

/** The plan's count-in: three rising ticks one beat apart, the hit on the fourth beat. */
describe('the count-in (plan)', () => {
  it('ticks on beats 1-3 and lands every strike and summit strike on beat 4', () => {
    const p = planCapsuleShow(reveal({ tier: 'aeon', stacks: [] }), { catalog });
    const timed = p.steps.filter((s): s is TimedStrike => s.kind === 'strike' || s.kind === 'summitStrike');
    expect(timed).toHaveLength(6);
    for (const s of timed) {
      const ticks = s.cues.filter((c) => c.sound === 'cap_strike_tick');
      expect(ticks.map((c) => c.atMs)).toEqual([0, 200, 400]);
      expect(ticks.map((c) => c.pitchBp)).toEqual([10000, 11225, 12599]);
      expect(s.impactMs).toBe(3 * SHOW_TIMING.strikeBeatMs);
      // The window closes inside the step, so no tap is ever judged against the next one.
      expect(windowCloseMs(s.impactMs)).toBeLessThan(s.durationMs);
    }
  });
});

// -----------------------------------------------------------------------------------------------
// Honesty: timing is feel only (A10, A15.3 "Tapping only reveals it").

class TraceView implements ShowView {
  readonly trace: string[] = [];
  readonly hits: StrikeHit[] = [];
  enter(step: ShowStep, instant: boolean): void {
    this.trace.push(`enter ${step.id}${instant ? '!' : ''} ${shows(step)}`);
  }
  progress(): void {}
  exit(step: ShowStep): void {
    this.trace.push(`exit ${step.id}`);
  }
  strikeHit(_s: TimedStrike, hit: StrikeHit): void {
    this.hits.push(hit);
  }
}

/** What a step shows: the tier a strike climbs to, the burst's tier, a card's rarity. */
function shows(s: ShowStep): string {
  switch (s.kind) {
    case 'strike':
    case 'summitStrike':
      return `${s.from}->${s.to}`;
    case 'burst':
      return s.tier;
    case 'signal':
    case 'flip':
      return `${s.card.key}:${s.card.rarity}`;
    default:
      return '';
  }
}

/**
 * Plays `plan` in 16 ms frames, tapping at each absolute time in `schedule` (between frames, with
 * the sub-frame offset). Returns the step trace, the plan cues heard with their frame times, the
 * graded layers, the step start times and the total time.
 */
function play(plan: ShowPlan, schedule: number[] = []) {
  const view = new TraceView();
  const audio = new FakeAudio();
  const cues: string[] = [];
  const starts = new Map<string, number>();
  let now = 0;
  const runner = new ShowRunner(plan, view, { audio, onCue: (c, s) => cues.push(`${now}:${s.id}:${c.sound}@${c.atMs}`) });
  runner.start();
  let k = 0;
  while (!runner.done && now < 60000) {
    const s = runner.step;
    if (s && !starts.has(s.id)) starts.set(s.id, now - runner.stepTimeMs);
    while (k < schedule.length && (schedule[k] ?? Infinity) <= now + 16) {
      runner.tap(Math.max(0, (schedule[k] ?? 0) - now));
      k++;
    }
    runner.update(16);
    now += 16;
  }
  return { view, trace: view.trace, cues, hits: view.hits, graded: audio.played().filter((id) => id === 'cap_strike_perfect' || id === 'cap_strike_good'), ms: now, starts, runner };
}

const plans: [string, () => ShowPlan][] = [
  ['Silver from Clay', () => planCapsuleShow(reveal({ tier: 'silver', stacks: [stack('bonker', 'common', { copies: 3 }), stack('sabertooth', 'epic', { isNew: true })] }), { catalog })],
  ['Jade from Bronze', () => planCapsuleShow(reveal({ tier: 'jade', startTier: 'bronze', kind: 'daily', stacks: [stack('spear_hunter', 'rare')] }), { catalog })],
  ['Aeon from Clay', () => planCapsuleShow(reveal({ tier: 'aeon', stacks: [stack('matriarch', 'legendary')] }), { catalog })],
];

describe('timing a strike never changes the result (A10, A15.3)', () => {
  for (const [name, make] of plans) {
    it(`${name}: the same steps, tiers, cues and timeline for every tap pattern`, () => {
      const plan = make();
      const frozen = JSON.stringify(plan);
      const base = play(plan);
      const timed = plan.steps.filter((s): s is TimedStrike => s.kind === 'strike' || s.kind === 'summitStrike');
      const strikeIds = timed.map((s) => s.id);
      // The untouched run's step start times schedule the taps (offsets from the corrected hit).
      const startOf = (id: string) => base.starts.get(id) ?? 0;
      const at = (off: number) => strikeIds.map((id) => startOf(id) + ON + off);
      const patterns: Record<string, number[]> = {
        perfect: at(0),
        good: at(100),
        early: at(-160),
        // Tapping along with the count-in: a tap on each tick, then the beat.
        tapAlong: timed.flatMap((s) => [0, 200, 400].map((t) => startOf(s.id) + t).concat(startOf(s.id) + ON)),
        // Past the window but still inside the strike: too late to count.
        late: at(150),
        // Mashing through every hammer blow, every 23 ms.
        mash: timed.flatMap((s) => Array.from({ length: Math.floor(s.durationMs / 23) }, (_, i) => startOf(s.id) + i * 23)),
        mixed: strikeIds.map((id, i) => startOf(id) + ON + [0, -90, 0, -250, 0, 0][i % 6]!),
      };
      for (const [label, taps] of Object.entries(patterns)) {
        const r = play(plan, taps);
        expect(r.trace, label).toEqual(base.trace);
        expect(r.cues, label).toEqual(base.cues);
        expect(r.ms, label).toBe(base.ms);
        expect([...r.starts], label).toEqual([...base.starts]);
      }
      // Nothing in the plan was touched.
      expect(JSON.stringify(plan)).toBe(frozen);
      // And the grades are what the taps earned.
      const perfect = play(plan, patterns.perfect);
      expect(perfect.hits.map((h) => h.grade)).toEqual(strikeIds.map(() => 'perfect'));
      expect(perfect.hits.map((h) => h.combo)).toEqual(strikeIds.map((_, i) => i + 1));
      expect(perfect.graded).toHaveLength(strikeIds.length);
      const good = play(plan, patterns.good);
      expect(good.hits.every((h) => h.grade === 'good' && h.combo === 0)).toBe(true);
      const early = play(plan, patterns.early);
      expect(early.hits.every((h) => h.grade === 'miss')).toBe(true);
      expect(early.hits).toHaveLength(strikeIds.length);
      expect(early.graded).toEqual([]);
      // Ticks tapped along are ignored; the tap on the beat is the one judged, and it is Perfect.
      const along = play(plan, patterns.tapAlong);
      expect(along.hits.map((h) => h.grade)).toEqual(strikeIds.map(() => 'perfect'));
      expect(along.hits.map((h) => h.combo)).toEqual(strikeIds.map((_, i) => i + 1));
      // Too late to count at all: the strike just landed on its own.
      expect(play(plan, patterns.late).hits).toEqual([]);
      const mash = play(plan, patterns.mash);
      expect(mash.hits).toHaveLength(strikeIds.length);
      expect(mash.hits.every((h) => h.grade === 'miss')).toBe(true);
    });
  }

  it('judges a tap between frames where it really was', () => {
    const plan = plans[0]![1]();
    const base = play(plan);
    const start = base.starts.get('strike-0') ?? 0;
    // 61 ms early and 60 ms early land in the same 16 ms frame but grade differently.
    const g = play(plan, [start + ON - 61]);
    const p = play(plan, [start + ON - 60]);
    expect(g.hits.map((h) => [h.grade, h.offsetMs])).toEqual([['good', -61]]);
    expect(p.hits.map((h) => [h.grade, h.offsetMs])).toEqual([['perfect', -60]]);
  });

  it('plays the graded layer on the hit for an early tap and at once for a late one', () => {
    const plan = plans[0]![1]();
    const base = play(plan);
    const start = base.starts.get('strike-0') ?? 0;
    const heard = (taps: number[]) => {
      const view = new TraceView();
      const audio = new FakeAudio();
      const runner = new ShowRunner(plan, view, { audio });
      runner.start();
      let now = 0;
      let k = 0;
      let at = -1;
      while (!runner.done && now < 5000 && at < 0) {
        while (k < taps.length && (taps[k] ?? Infinity) <= now + 16) runner.tap(Math.max(0, (taps[k++] ?? 0) - now));
        runner.update(16);
        now += 16;
        if (audio.played().includes('cap_strike_perfect')) at = now;
      }
      return { at, hit: view.hits[0] };
    };
    const early = heard([start + I - 20]);
    expect(early.hit?.afterImpact).toBe(false);
    // With the hit's frame (the first frame at or after the hit).
    expect(early.at).toBe(start + Math.ceil(I / 16) * 16);
    const late = heard([start + I + 70]);
    expect(late.hit?.afterImpact).toBe(true);
    expect(late.at).toBe(start + Math.ceil((I + 70) / 16) * 16);
  });

  it('ends a run of Perfects on a strike without a tap', () => {
    const plan = plans[2]![1]();
    const base = play(plan);
    const on = (id: string) => (base.starts.get(id) ?? 0) + ON;
    const r = play(plan, [on('strike-0'), on('strike-1'), on('strike-3'), on('summitStrike-0'), on('summitStrike-1')]);
    expect(r.hits.map((h) => h.combo)).toEqual([1, 2, 1, 2, 3]);
  });
});
