/**
 * Walk and idle from the measured sim velocity (ANIM_SPEC R1). Visual only: the battle view reads
 * each unit's position from sim state and never writes back.
 *
 * The sim moves a ground unit at card speed x `economy.marchSpeedBp` (x1.25, and more in Siege) and
 * walks it back for the Hold flag and Fall back, so the walk clip is driven by the real velocity,
 * smoothed, instead of the card speed. A walk/idle hysteresis replaces the per-tick "moved this
 * tick" flag, so the clip does not restart on every stutter.
 */

/** Sim tick rate (DESIGN B3: 20 Hz). */
export const SIM_TICKS_PER_SEC = 20;

export const GAIT_TUNING = {
  /** Time constant of the velocity smoothing (ms). */
  tauMs: 100,
  /** Walk once |v| >= this share of the reference speed for `walkOnMs`. */
  walkOnShare: 0.3,
  walkOnMs: 120,
  /** Idle once |v| < this share of the reference speed for `idleOnMs`. */
  idleShare: 0.2,
  idleOnMs: 150,
} as const;

export interface GaitState {
  /** Smoothed velocity toward the enemy (lu/s); negative walks back. */
  v: number;
  walking: boolean;
  /** How long the opposite condition has held (ms). */
  heldMs: number;
}

export function newGait(): GaitState {
  return { v: 0, walking: false, heldMs: 0 };
}

/**
 * The raw velocity of one tick toward the enemy (lu/s) from a unit's positions (milli-lu) and its
 * facing (+1 for side 0, which marches toward larger x).
 */
export function tickVelocity(x: number, prevX: number, facing: 1 | -1, milliLu: number): number {
  return (((x - prevX) / milliLu) * SIM_TICKS_PER_SEC) * facing;
}

/**
 * Advances the gait by `dtMs` of game time with the latest raw velocity. `refSpeed` is the unit's
 * ground speed (lu/s), which scales the walk and idle thresholds. Mutates and returns `s`.
 */
export function stepGait(s: GaitState, rawV: number, refSpeed: number, dtMs: number): GaitState {
  if (dtMs <= 0) return s;
  s.v += (rawV - s.v) * (1 - Math.exp(-dtMs / GAIT_TUNING.tauMs));
  const ref = Math.max(1, refSpeed);
  const a = Math.abs(s.v);
  const flip = s.walking ? a < GAIT_TUNING.idleShare * ref : a >= GAIT_TUNING.walkOnShare * ref;
  if (!flip) {
    s.heldMs = 0;
    return s;
  }
  s.heldMs += dtMs;
  if (s.heldMs >= (s.walking ? GAIT_TUNING.idleOnMs : GAIT_TUNING.walkOnMs)) {
    s.walking = !s.walking;
    s.heldMs = 0;
  }
  return s;
}

/**
 * Walk clip length for views without `setGait` (the procedural tier): the procedural convention of a
 * 500 ms cycle at 80 lu/s (A11), at the measured speed.
 */
export function walkDurationForSpeed(speedLuPerS: number, cycleMs = 500, refSpeedLuPerS = 80): number {
  return Math.round((cycleMs * refSpeedLuPerS) / Math.max(20, Math.abs(speedLuPerS)));
}
