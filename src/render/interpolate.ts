/**
 * Interpolation (DESIGN B6): `alpha = acc / DT`; a view position is lerp(prevX, x, alpha).
 * Positions come from the sim in milli-lu and leave here in lu.
 */
import { MILLI_LU } from './layout';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Interpolated world x in lu of a unit (`prevX`, `x` in milli-lu). */
export function viewX(u: { prevX: number; x: number }, alpha: number): number {
  return lerp(u.prevX, u.x, clamp01(alpha)) / MILLI_LU;
}

/** Milli-lu to lu. */
export function toLu(milli: number): number {
  return milli / MILLI_LU;
}

/** Smoothstep ease (0..1). */
export function smooth(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Ease-out cubic (0..1). */
export function easeOutCubic(t: number): number {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
}
