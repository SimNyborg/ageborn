/**
 * Plays a `ShowPlan` back in time (DESIGN A10 Input column).
 *
 * The runner owns the clock of the show: strikes land on their beat by themselves and a tap near
 * the hit is graded (A10 step 3, `strikeTiming.ts`), taps speed card flips up, holding fast-forwards,
 * skip jumps to the next step that may not be skipped (a first-ever Legendary walkout) or to the
 * summary; it fires the plan's sound cues and tells a `ShowView` what to draw. A grade is feel only:
 * it never changes a step, a cue of the plan or the timeline. It knows nothing about Pixi, so it is
 * unit-tested with a recording view.
 */
import type { AudioService } from '@/contracts';
import type { Cue, ShowPlan, ShowStep, StepKind, StrikeStep, SummitStrikeStep } from './plan';
import { comboPitchBp, judgeTap, nextCombo, STRIKE_WINDOW, windowCloseMs, type StrikeGrade, type StrikeWindow } from './strikeTiming';

/** A strike or summit strike: the steps that land on a beat and can be timed. */
export type TimedStrike = StrikeStep | SummitStrikeStep;

/** A graded tap on a hammer blow (feel only, never a result). */
export interface StrikeHit {
  stepId: string;
  grade: StrikeGrade;
  /** Latency-corrected ms from the hit (negative = early). */
  offsetMs: number;
  /** Consecutive Perfects including this one (0 unless Perfect). */
  combo: number;
  /** The tap came after the hammer had landed (the view adds the flourish at once). */
  afterImpact: boolean;
}

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
  /**
   * A tap on a hammer blow was graded (before the hit: dress the coming hit; after it: add the
   * flourish now). Called at most once per strike, never for a skipped one.
   */
  strikeHit?(step: TimedStrike, hit: StrikeHit): void;
}

export interface RunnerState {
  index: number;
  kind: StepKind;
  phase: 'run' | 'done';
  /** "Tap as the hammer lands!" is shown late in the charge and through the strikes until the first tap. */
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
  /** Every graded tap on a hammer blow (bench log, tests). */
  onHit?: (hit: StrikeHit, step: TimedStrike) => void;
  /** Time scale while holding (default 3). */
  fastForwardScale?: number;
  /** Time scale for the rest of a step after a tap (default 4). */
  rushScale?: number;
  /** The timing window (default `STRIKE_WINDOW`). */
  strikeWindow?: StrikeWindow;
}

/** Steps a tap speeds up ("Tap flips faster", A10 step 5). Strikes keep their beat: a tap there is graded. */
const RUSHABLE: ReadonlySet<StepKind> = new Set<StepKind>(['burst', 'firstTier', 'volley', 'fan', 'signal', 'flip', 'duplicates', 'miniWalkout', 'walkout', 'crateOpen']);
/** Steps that land on a beat and grade a tap near their hit. */
const TIMED: ReadonlySet<StepKind> = new Set<StepKind>(['strike', 'summitStrike']);
/** Steps that are "visually" opened: after these the capsule is open. */
const OPENING: ReadonlySet<StepKind> = new Set<StepKind>(['burst', 'volley', 'crateOpen']);

/** The tap prompt appears this far into the charge (A10 step 2). */
const CHARGE_PROMPT_AT = 0.6;
/** Longest frame the runner integrates at once (a hidden tab must not jump the show). */
export const MAX_FRAME_MS = 250;
const WALKOUT_DUCK_DB = -6;
/** The Platinum and Aeon stingers ring on past the pop. */
const BURST_DUCK_TAIL_MS = 1800;
/** The graded layer over the hit: a heavy ring for Perfect (climbing with the combo), a light one for Good. */
const HIT_SOUND: Readonly<Record<Exclude<StrikeGrade, 'miss'>, { sound: string; volumeDb: number }>> = {
  perfect: { sound: 'cap_strike_perfect', volumeDb: -2 },
  good: { sound: 'cap_strike_good', volumeDb: -6 },
};

function isTimed(s: ShowStep | undefined): s is TimedStrike {
  return s !== undefined && TIMED.has(s.kind);
}

export class ShowRunner {
  private i = -1;
  private t = 0;
  private cueIdx = 0;
  private phase: RunnerState['phase'] = 'run';
  private holding = false;
  private rush = false;
  private opened = false;
  /** The current strike's one judged tap has been used (or its window has closed). */
  private judged = false;
  /** A grade given before the hit: its sound plays on the hit. */
  private pendingHit: StrikeHit | null = null;
  /** Consecutive Perfects (cosmetic, this show only). */
  private combo = 0;
  /** The player has tapped a strike (the prompt then steps aside). */
  private struck = false;
  private last: RunnerState | null = null;
  private readonly ffScale: number;
  private readonly rushScale: number;
  private readonly win: StrikeWindow;

  constructor(
    readonly plan: ShowPlan,
    private readonly view: ShowView,
    private readonly o: RunnerOptions = {},
  ) {
    this.ffScale = o.fastForwardScale ?? 3;
    this.rushScale = o.rushScale ?? 4;
    this.win = o.strikeWindow ?? STRIKE_WINDOW;
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

  /** Consecutive Perfects so far (cosmetic). */
  get comboCount(): number {
    return this.combo;
  }

  /** The current time scale (fast-forward or a tap's hurry), for ambient animation. */
  get timeScale(): number {
    const s = this.step;
    return s && this.phase === 'run' ? this.scaleFor(s) : 1;
  }

  get state(): RunnerState {
    const s = this.step;
    const kind: StepKind = s?.kind ?? 'summary';
    const striking = s !== undefined && (TIMED.has(s.kind) || s.kind === 'summitRise') && !this.struck;
    return {
      index: this.i,
      kind,
      phase: this.phase,
      prompt: this.phase !== 'done' && (striking || (s?.kind === 'charge' && this.t >= s.durationMs * CHARGE_PROMPT_AT)) ? 'tap' : null,
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
      const scale = this.scaleFor(s);
      const remain = s.durationMs - this.t;
      const adv = real * scale;
      const before = this.t;
      if (adv < remain) {
        this.t += adv;
        this.fireCues(s);
        this.passBeat(s, before);
        this.view.progress(s, this.t, adv);
        real = 0;
      } else {
        this.t = s.durationMs;
        this.fireCues(s);
        this.passBeat(s, before);
        this.view.progress(s, this.t, remain);
        this.view.exit(s);
        real -= remain / scale;
        this.enter(this.i + 1);
      }
    }
    this.emit();
  }

  /**
   * A tap. On a hammer blow it is graded against the hit (A10 step 3); the strike lands on its beat
   * either way. Elsewhere it hurries the current reveal. `lateMs` is how long after the last
   * `update` the tap happened (real ms), so a tap between frames is judged where it really was.
   */
  tap(lateMs = 0): void {
    const s = this.step;
    if (!s || this.phase === 'done') return;
    if (isTimed(s)) {
      this.struck = true;
      this.judge(s, this.t + Math.max(0, Math.min(MAX_FRAME_MS, lateMs)) * this.scaleFor(s));
    } else if (s.kind === 'summitRise' || (s.kind === 'charge' && this.t >= s.durationMs * CHARGE_PROMPT_AT)) {
      // Before the count-in: the prompt is answered; the beat is not hurried.
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
    this.combo = 0;
    this.enter(Math.min(j, steps.length - 1));
    this.emit();
  }

  private scaleFor(s: ShowStep): number {
    let k = 1;
    if (this.holding && s.fastForward) k = this.ffScale;
    if (this.rush && s.fastForward && RUSHABLE.has(s.kind)) k = Math.max(k, this.rushScale);
    return k;
  }

  /** Grades the strike's one counted tap (feel only: nothing in the plan or the timeline changes). */
  private judge(s: TimedStrike, tapMs: number): void {
    if (this.judged || tapMs > s.durationMs) return;
    const j = judgeTap(tapMs, s.impactMs, this.win);
    if (!j) return;
    this.judged = true;
    this.combo = nextCombo(this.combo, j.grade);
    const afterImpact = this.t >= s.impactMs;
    const hit: StrikeHit = { stepId: s.id, grade: j.grade, offsetMs: j.offsetMs, combo: this.combo, afterImpact };
    this.view.strikeHit?.(s, hit);
    this.o.onHit?.(hit, s);
    // The graded layer lands on the hit: now if the hammer is already down, else when it lands.
    if (afterImpact) this.playHit(hit);
    else this.pendingHit = hit;
  }

  /** The beat passes the hit (the pending graded layer sounds) and then the window's close. */
  private passBeat(s: ShowStep, before: number): void {
    if (!isTimed(s)) return;
    if (before < s.impactMs && this.t >= s.impactMs && this.pendingHit) {
      this.playHit(this.pendingHit);
      this.pendingHit = null;
    }
    if (!this.judged && this.t >= windowCloseMs(s.impactMs, this.win)) {
      // No tap on this blow: it landed on its own, and a run of Perfects ends here.
      this.judged = true;
      this.combo = 0;
    }
  }

  private playHit(hit: StrikeHit): void {
    if (hit.grade === 'miss') return;
    const h = HIT_SOUND[hit.grade];
    this.o.audio?.play(h.sound, { volumeDb: h.volumeDb, pitchBp: hit.grade === 'perfect' ? comboPitchBp(hit.combo) : 10000 });
  }

  private enter(i: number): void {
    const s = this.plan.steps[i];
    if (!s) {
      this.phase = 'done';
      return;
    }
    const prev = this.step;
    // A strike cut short (skip) before its window closed ends the run of Perfects.
    if (isTimed(prev) && !this.judged) this.combo = 0;
    this.i = i;
    this.t = 0;
    this.cueIdx = 0;
    this.rush = false;
    this.judged = false;
    this.pendingHit = null;
    if (OPENING.has(s.kind)) this.opened = true;
    this.view.enter(s, false);
    this.phase = s.kind === 'summary' ? 'done' : 'run';
    if ((s.kind === 'walkout' || s.kind === 'miniWalkout') && this.o.audio) {
      this.o.audio.music.duck(WALKOUT_DUCK_DB, s.durationMs);
    }
    // Platinum and Aeon bursts duck the music under their stinger and its tail (A10 step 4).
    if (s.kind === 'burst' && s.duckDb < 0 && this.o.audio) this.o.audio.music.duck(s.duckDb, s.durationMs + BURST_DUCK_TAIL_MS);
    // Cues at 0 ms play on entry, not a frame later.
    if (this.phase === 'run') this.fireCues(s);
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
      l.prompt === s.prompt &&
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
