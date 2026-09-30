/**
 * The hammer's timing window (DESIGN A10 step 3, owner request 2026-09-29).
 *
 * Every strike lands on a steady beat by itself: three rising count-in ticks, then the hit on the
 * fourth beat. A tap near the hit is graded Perfect or Good and only changes the feel of that hit
 * (hit-stop, flash, sparks, a layered sound, a small "Perfect!" pop and a cosmetic combo). The grade
 * never reaches the plan: the tier, the contents, the climb and the timeline are the same for every
 * tap pattern, so "Tapping only reveals it" (A15.3) stays true. A miss or an early tap still strikes
 * normally, on the beat, with no penalty sound or text.
 *
 * Pure and deterministic in integer ms, so the window is unit-tested without a renderer.
 */

/** The judged window, in ms of real time around the hit. */
export interface StrikeWindow {
  /** |offset| at or below this is Perfect. */
  perfectMs: number;
  /** |offset| at or below this (and above Perfect) is Good. */
  goodMs: number;
  /**
   * How late a tap on the true hit is measured: the frame showing the hit reaches the screen a
   * frame or two after it is drawn, the hit sound has its output latency, and a touch reaches the
   * page some ms after the finger lands, minus the habit of tapping slightly ahead of a beat. The
   * window is centred this much after the hit.
   */
  latencyMs: number;
  /**
   * The first tap closer than this before the hit uses up the strike's one judged tap (a miss when
   * it is early). Earlier taps are ignored, so a player tapping along with the count-in (a tap on
   * each tick, 200 ms apart) keeps the strike for the tap on the beat: the lock starts just outside
   * the Good window, after the third tick.
   */
  lockMs: number;
  /**
   * A judged tap that comes less than this after the previous tap (any tap, counted or not) is a
   * miss: mashing cannot farm Perfects, while tapping along with the 200 ms count-in still can.
   */
  minGapMs: number;
}

/**
 * Tuned 2026-09-29 (docs/decisions.md): a casual player extrapolating a 200 ms count-in taps with a
 * spread of about ±50 ms (1 SD) on a phone. ±60 ms Perfect is then hit roughly 2 times in 3 (4 in a
 * row about 1 in 5), ±140 ms Good almost always, and a pure reaction to the hit (≥ 180 ms after it)
 * falls outside both, so it is timing, not reflex. The lock (180 ms, from 2026-09-30) starts after
 * the third tick even for a tap-along on the ticks; mashing is stopped by `minGapMs` instead.
 */
export const STRIKE_WINDOW: Readonly<StrikeWindow> = { perfectMs: 60, goodMs: 140, latencyMs: 30, lockMs: 180, minGapMs: 150 };

/**
 * The most audio output latency the window follows (a device reporting more is centred here): half
 * of it (+25 ms) keeps the window's late edge inside the strike (600 + 55 + 140 < 800 ms).
 */
export const MAX_OUTPUT_LATENCY_MS = 50;

/**
 * The window for a device whose audio reaches the ear `outputLatencyMs` late (the AudioContext's
 * `outputLatency`, or `baseLatency`, in ms): the centre moves later by half of it (a player times to
 * the ticks and to the closing ring at once), the latency clamped to 0..`MAX_OUTPUT_LATENCY_MS`.
 * Integer ms. A calibration setting can replace this later.
 */
export function windowForOutputLatency(outputLatencyMs: number, w: StrikeWindow = STRIKE_WINDOW): StrikeWindow {
  const ms = Number.isFinite(outputLatencyMs) ? Math.max(0, Math.min(MAX_OUTPUT_LATENCY_MS, outputLatencyMs)) : 0;
  return { ...w, latencyMs: w.latencyMs + Math.round(ms / 2) };
}

export type StrikeGrade = 'perfect' | 'good' | 'miss';

export interface StrikeJudgement {
  grade: StrikeGrade;
  /** Latency-corrected offset from the hit in ms (negative = early). */
  offsetMs: number;
}

/** The latency-corrected offset of a tap at `tapMs` from a hit at `impactMs` (step-local ms). */
export function strikeOffsetMs(tapMs: number, impactMs: number, w: StrikeWindow = STRIKE_WINDOW): number {
  return Math.round(tapMs) - w.latencyMs - Math.round(impactMs);
}

/** Grade of a latency-corrected offset. */
export function gradeOffset(offsetMs: number, w: StrikeWindow = STRIKE_WINDOW): StrikeGrade {
  const a = Math.abs(offsetMs);
  if (a <= w.perfectMs) return 'perfect';
  if (a <= w.goodMs) return 'good';
  return 'miss';
}

/**
 * Judges a tap at step time `tapMs` against the hit at `impactMs`. Returns null when the tap is too
 * early to count (before the lock) or after the window has closed; a counted tap is the strike's one
 * judged tap. `sincePrevTapMs` is how long after the previous tap it came (show time); a counted
 * tap closer than `minGapMs` to it is a miss (mashing).
 */
export function judgeTap(tapMs: number, impactMs: number, w: StrikeWindow = STRIKE_WINDOW, sincePrevTapMs = Infinity): StrikeJudgement | null {
  const offsetMs = strikeOffsetMs(tapMs, impactMs, w);
  if (offsetMs < -Math.max(w.lockMs, w.goodMs) || offsetMs > w.goodMs) return null;
  return { grade: sincePrevTapMs < w.minGapMs ? 'miss' : gradeOffset(offsetMs, w), offsetMs };
}

/** Step time after which the strike's window is closed (an untapped strike ends the combo here). */
export function windowCloseMs(impactMs: number, w: StrikeWindow = STRIKE_WINDOW): number {
  return impactMs + w.latencyMs + w.goodMs;
}

/** Consecutive Perfects: a Perfect adds one, anything else (Good, a miss, no tap) ends the run. */
export function nextCombo(combo: number, grade: StrikeGrade | null): number {
  return grade === 'perfect' ? combo + 1 : 0;
}

/**
 * The Perfect layer climbs a major scale with the combo (1 → root, 2 → +2, 3 → +4, 4 → +5, 5 → +7,
 * 6 → +9 semitones), as a playback rate in bp (10,000 = unchanged).
 */
export function comboPitchBp(combo: number): number {
  const steps = [0, 2, 4, 5, 7, 9];
  const st = steps[Math.max(0, Math.min(steps.length, combo) - 1)] ?? 0;
  return Math.round(10000 * Math.pow(2, st / 12));
}
