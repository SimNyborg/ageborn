/**
 * Plays a `ShowPlan` back in time (DESIGN A10 Input column).
 *
 * The runner owns the clock of the show: it waits for strike taps (auto after 1.5 s idle), speeds
 * card flips up on tap, fast-forwards while the player holds, skips to the next step that may not be
 * skipped (a first-ever Legendary walkout) or to the summary, fires the plan's sound cues and tells a
 * `ShowView` what to draw. It knows nothing about Pixi, so it is unit-tested with a recording view.
 */
import type { AudioService } from '@/contracts';
import type { Cue, ShowPlan, ShowStep, StepKind, StrikeStep } from './plan';

/**
 * What the stage implements. Called in order: enter → progress* → exit, once per step. A skipped
 * step gets `enter(step, true)` and `exit(step)` with no progress in between, and the current step
 * may be exited early, so `exit` must always leave the step's end state (without effects).
 */
export interface ShowView {
  /** A step starts. `instant` means it is being skipped: prepare its end state, play no effects. */
  enter(step: ShowStep, instant: boolean): void;
  /** Every frame while the step runs: step-local time and the (scaled) frame delta, both in ms. */
  progress(step: ShowStep, tMs: number, dtMs: number): void;
  /** The step ends (or is cut short by a skip): settle into its end state. */
  exit(step: ShowStep): void;
  /** Frames while a strike waits for its tap. */
  waiting?(step: StrikeStep, idleMs: number, dtMs: number): void;
}

export interface RunnerState {
  index: number;
  kind: StepKind;
  phase: 'wait' | 'run' | 'done';
  /** "Tap!" is shown while a strike waits. */
  prompt: 'tap' | null;
  canSkip: boolean;
  canFastForward: boolean;
  holding: boolean;
  /** The burst has happened: the Amber counter may pour. */
  opened: boolean;
}

export interface RunnerOptions {
  audio?: AudioService | null;
  /** Called whenever `state` changes (not every frame). */
  onState?: (s: RunnerState) => void;
  /** Every cue as it plays (the bench shows a sound log). */
  onCue?: (cue: Cue, step: ShowStep) => void;
  /** Time scale while holding (default 3). */
  fastForwardScale?: number;
  /** Time scale for the rest of a step after a tap (default 4). */
  rushScale?: number;
}

/** Steps a tap speeds up ("Tap flips faster", A10 step 5). Strikes use taps as hammer blows instead. */
const RUSHABLE: ReadonlySet<StepKind> = new Set<StepKind>(['burst', 'volley', 'fan', 'signal', 'flip', 'duplicates', 'miniWalkout', 'walkout', 'reelWinner']);
/** Steps that are "visually" opened: after these the capsule is open. */
const OPENING: ReadonlySet<StepKind> = new Set<StepKind>(['burst', 'volley', 'reel', 'crateArrival']);

/** Longest frame the runner integrates at once (a hidden tab must not jump the show). */
export const MAX_FRAME_MS = 250;
const WALKOUT_DUCK_DB = -6;

export class ShowRunner {
  private i = -1;
  private t = 0;
  private idle = 0;
  private cueIdx = 0;
  private phase: RunnerState['phase'] = 'run';
  private holding = false;
  private rush = false;
  private tapQueued = false;
  private opened = false;
  private last: RunnerState | null = null;
  private readonly ffScale: number;
  private readonly rushScale: number;

  constructor(
    readonly plan: ShowPlan,
    private readonly view: ShowView,
    private readonly o: RunnerOptions = {},
  ) {
    this.ffScale = o.fastForwardScale ?? 3;
    this.rushScale = o.rushScale ?? 4;
  }

  get step(): ShowStep | undefined {
    return this.plan.steps[this.i];
  }

  get stepTimeMs(): number {
    return this.t;
  }

  get done(): boolean {
    return this.phase === 'done';
  }

  /** The current time scale (fast-forward or a tap's hurry), for ambient animation. */
  get timeScale(): number {
    const s = this.step;
    return s && this.phase === 'run' ? this.scaleFor(s) : 1;
  }

  get state(): RunnerState {
    const s = this.step;
    const kind: StepKind = s?.kind ?? 'summary';
    return {
      index: this.i,
      kind,
      phase: this.phase,
      prompt: this.phase === 'wait' ? 'tap' : null,
      canSkip: s !== undefined && this.phase !== 'done' && s.skippable && s.kind !== 'summary',
      canFastForward: s !== undefined && this.phase !== 'done' && s.fastForward,
      holding: this.holding,
      opened: this.opened,
    };
  }

  /** Enters the first step. */
  start(): void {
    if (this.i >= 0) return;
    this.enter(0);
    this.emit();
  }

  /** Advances by one frame of real time. */
  update(frameMs: number): void {
    if (this.i < 0) this.start();
    let real = Math.max(0, Math.min(MAX_FRAME_MS, frameMs));
    // A frame may finish several short steps; the guard bounds the work per frame.
    for (let guard = 0; guard < 32 && real > 0 && this.phase !== 'done'; guard++) {
      const s = this.step;
      if (!s) break;
      if (this.phase === 'wait' && s.kind === 'strike') {
        if (this.tapQueued || this.holding) {
          this.tapQueued = false;
          this.setPhase('run');
          continue;
        }
        const room = s.maxWaitMs - this.idle;
        const used = Math.min(room, real);
        this.idle += used;
        this.view.waiting?.(s, this.idle, used);
        real -= used;
        if (this.idle >= s.maxWaitMs) this.setPhase('run');
        continue;
      }
      const scale = this.scaleFor(s);
      const remain = s.durationMs - this.t;
      const adv = real * scale;
      if (adv < remain) {
        this.t += adv;
        this.fireCues(s);
        this.view.progress(s, this.t, adv);
        real = 0;
      } else {
        this.t = s.durationMs;
        this.fireCues(s);
        this.view.progress(s, this.t, remain);
        this.view.exit(s);
        real -= remain / scale;
        this.enter(this.i + 1);
      }
    }
    this.emit();
  }

  /** A tap: fires a waiting strike, queues the next one, or hurries the current reveal. */
  tap(): void {
    const s = this.step;
    if (!s || this.phase === 'done') return;
    if (this.phase === 'wait') {
      this.tapQueued = false;
      this.setPhase('run');
    } else if (s.kind === 'strike') {
      this.tapQueued = true;
    } else if (RUSHABLE.has(s.kind) && s.fastForward) {
      this.rush = true;
    }
    this.emit();
  }

  /** Hold to fast-forward (A10 step 5). */
  setHold(on: boolean): void {
    this.holding = on;
    this.emit();
  }

  /**
   * Skips to the next step that may not be skipped (a first-ever Legendary walkout) or to the
   * summary. Skipped steps jump to their end state without effects or sounds.
   */
  skip(): void {
    const s = this.step;
    if (!s || !this.state.canSkip) return;
    const steps = this.plan.steps;
    let j = this.i + 1;
    while (j < steps.length) {
      const n = steps[j];
      if (!n || !n.skippable || n.kind === 'summary') break;
      j++;
    }
    this.t = s.durationMs;
    this.view.exit(s);
    for (let k = this.i + 1; k < j; k++) {
      const n = steps[k];
      if (!n) continue;
      if (OPENING.has(n.kind)) this.opened = true;
      this.view.enter(n, true);
      this.view.exit(n);
    }
    this.tapQueued = false;
    this.enter(Math.min(j, steps.length - 1));
    this.emit();
  }

  private scaleFor(s: ShowStep): number {
    let k = 1;
    if (this.holding && s.fastForward) k = this.ffScale;
    if (this.rush && s.fastForward && RUSHABLE.has(s.kind)) k = Math.max(k, this.rushScale);
    return k;
  }

  private enter(i: number): void {
    const s = this.plan.steps[i];
    if (!s) {
      this.phase = 'done';
      return;
    }
    this.i = i;
    this.t = 0;
    this.idle = 0;
    this.cueIdx = 0;
    this.rush = false;
    if (OPENING.has(s.kind)) this.opened = true;
    this.view.enter(s, false);
    if (s.kind === 'summary') {
      this.phase = 'done';
    } else if (s.kind === 'strike' && !this.tapQueued && !this.holding) {
      this.phase = 'wait';
    } else {
      if (s.kind === 'strike') this.tapQueued = false;
      this.phase = 'run';
    }
    if ((s.kind === 'walkout' || s.kind === 'miniWalkout') && this.o.audio) {
      this.o.audio.music.duck(WALKOUT_DUCK_DB, s.durationMs);
    }
    // Cues at 0 ms play on entry, not a frame later.
    if (this.phase === 'run') this.fireCues(s);
  }

  private setPhase(p: RunnerState['phase']): void {
    this.phase = p;
    const s = this.step;
    if (p === 'run' && s) this.fireCues(s);
  }

  private fireCues(s: ShowStep): void {
    const cues = s.cues;
    while (this.cueIdx < cues.length) {
      const c = cues[this.cueIdx];
      if (!c || c.atMs > this.t) break;
      this.cueIdx++;
      this.play(c, s);
    }
  }

  private play(c: Cue, s: ShowStep): void {
    this.o.onCue?.(c, s);
    const audio = this.o.audio;
    if (!audio) return;
    const opts: { pitchBp?: number; volumeDb?: number } = {};
    if (c.pitchBp !== undefined) opts.pitchBp = c.pitchBp;
    if (c.volumeDb !== undefined) opts.volumeDb = c.volumeDb;
    audio.play(c.sound, opts);
  }

  private emit(): void {
    const s = this.state;
    const l = this.last;
    if (
      l &&
      l.index === s.index &&
      l.phase === s.phase &&
      l.holding === s.holding &&
      l.canSkip === s.canSkip &&
      l.canFastForward === s.canFastForward &&
      l.opened === s.opened
    ) {
      return;
    }
    this.last = s;
    this.o.onState?.(s);
  }
}
