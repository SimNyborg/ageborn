/**
 * Queue item 44: pure helpers for the atlas unit view's aim (the shooter leaning toward its target, and where its
 * shot leaves as drawn). Presentation only: the sim owns all timing, and nothing here reads or changes sim state.
 *
 * The lean is a damped spring that heads for the lean the battle view asks for and holds it while the unit aims at
 * one target: through every wind-up, release and recovery and the gaps between shots, so a unit firing again and
 * again never rocks. An attack that starts from upright opens with a small counter-lean (anticipation); when the aim
 * ends the body stands up, where the spring's slight overshoot gives the follow-through. Angles are degrees above the
 * facing direction (aim up is positive).
 */

/** The anticipation: this share of the lean, the other way, for this share of the wind-up (at most `ANTICIPATION_MS`). */
export const ANTICIPATION_LEAN_SHARE = 0.2;
export const ANTICIPATION_WINDUP_SHARE = 0.2;
export const ANTICIPATION_MS = 90;
/** The spring: natural frequency (Hz) and damping (below 1 overshoots a little: the follow-through). */
export const LEAN_SPRING_HZ = 4.2;
export const LEAN_SPRING_DAMPING = 0.72;
/** Reduce motion: critically damped, no anticipation, half the lean. */
export const LEAN_REDUCED_DAMPING = 1;
export const LEAN_REDUCED_SHARE = 0.5;
/** Integration step of the spring (ms). */
const SPRING_STEP_MS = 8;

/** Where an attack is in its timeline (ms into the track), from the atlas view's attack track. */
export interface LeanTiming {
  t: number;
  /** When the impact (the release) lands, ms into the track. */
  impactAtMs: number;
}

/**
 * The lean (deg) the body heads for when the battle view wants `desiredDeg` (0: the aim ended, stand up). It holds
 * `desiredDeg`, except at the start of an attack that began from upright (`fromUpright`), which first leans the other
 * way a little (never under Reduce motion). `tm` is the attack playing now, or null between attacks.
 */
export function aimLeanGoal(desiredDeg: number, fromUpright: boolean, tm: LeanTiming | null, reduce: boolean): number {
  if (desiredDeg === 0) return 0;
  if (!reduce && fromUpright && tm && tm.t >= 0) {
    const antic = Math.min(ANTICIPATION_MS, Math.max(0, tm.impactAtMs) * ANTICIPATION_WINDUP_SHARE);
    if (tm.t < antic) return -ANTICIPATION_LEAN_SHARE * desiredDeg;
  }
  return desiredDeg;
}

export interface SpringState {
  x: number;
  v: number;
}

/** Advances the lean spring toward `goal` over `dtMs` (semi-implicit Euler in small steps; stable for any frame time). */
export function stepLeanSpring(s: SpringState, goal: number, dtMs: number, reduce: boolean): void {
  // at rest upright (almost every unit almost every frame): nothing to do
  if (dtMs <= 0 || (goal === 0 && s.x === 0 && s.v === 0)) return;
  const w = 2 * Math.PI * LEAN_SPRING_HZ;
  const z = reduce ? LEAN_REDUCED_DAMPING : LEAN_SPRING_DAMPING;
  let left = dtMs;
  while (left > 0) {
    const h = Math.min(SPRING_STEP_MS, left) / 1000;
    s.v += (w * w * (goal - s.x) - 2 * z * w * s.v) * h;
    s.x += s.v * h;
    left -= SPRING_STEP_MS;
  }
  // settled: snap, so an idle unit draws exactly upright
  if (goal === 0 && Math.abs(s.x) < 0.02 && Math.abs(s.v) < 0.5) {
    s.x = 0;
    s.v = 0;
  }
}

/** The lean a unit may take toward a target: clamped by its policy's maximum, halved under Reduce motion. */
export function clampLean(desiredDeg: number, maxDeg: number, reduce: boolean): number {
  const m = maxDeg * (reduce ? LEAN_REDUCED_SHARE : 1);
  if (!(m > 0) || !Number.isFinite(desiredDeg)) return 0;
  return Math.max(-m, Math.min(m, desiredDeg));
}

/** The body's transform as the view placed it: offset (lu, root space), rotation (radians, Pixi), scale per lu (sx carries the facing). */
export interface BodyXform {
  x: number;
  y: number;
  rotation: number;
  sx: number;
  sy: number;
}

/** A point given in the body's lu (x forward, y down, from the feet) where it is drawn in the root's space, written to `out`. */
export function throughBody<T extends { x: number; y: number }>(b: BodyXform, p: { x: number; y: number }, out: T): T {
  const lx = p.x * b.sx;
  const ly = p.y * b.sy;
  const c = Math.cos(b.rotation);
  const s = Math.sin(b.rotation);
  out.x = b.x + lx * c - ly * s;
  out.y = b.y + lx * s + ly * c;
  return out;
}

/** A weapon drawn `deg` above the facing direction: the angle it points on screen after the body transform, still relative to `facing`. */
export function angleThroughBody(b: BodyXform, deg: number, facing: 1 | -1): number {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a) * b.sx;
  const dy = -Math.sin(a) * b.sy;
  const c = Math.cos(b.rotation);
  const s = Math.sin(b.rotation);
  const wx = dx * c - dy * s;
  const wy = dx * s + dy * c;
  return (Math.atan2(-wy, wx * facing) * 180) / Math.PI;
}
