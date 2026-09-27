/** Easing and interpolation helpers for the capsule show (view-side floats are fine, B3). */

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Progress of `t` through the window [a, b], clamped to [0, 1]. */
export function span(t: number, a: number, b: number): number {
  return b <= a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a));
}

export const easeInQuad = (u: number): number => u * u;
export const easeOutQuad = (u: number): number => 1 - (1 - u) * (1 - u);
export const easeInOutQuad = (u: number): number => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
export const easeOutCubic = (u: number): number => 1 - Math.pow(1 - u, 3);
export const easeInCubic = (u: number): number => u * u * u;
export const easeInOutCubic = (u: number): number => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeOutQuint = (u: number): number => 1 - Math.pow(1 - u, 5);

/** Overshoot then settle (ease-out-back). */
export function easeOutBack(u: number, s = 1.70158): number {
  const c3 = s + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
}

/** Springy settle. */
export function easeOutElastic(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * c4) + 1;
}

/** A bounce for landings. */
export function easeOutBounce(u: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (u < 1 / d1) return n1 * u * u;
  if (u < 2 / d1) return n1 * (u -= 1.5 / d1) * u + 0.75;
  if (u < 2.5 / d1) return n1 * (u -= 2.25 / d1) * u + 0.9375;
  return n1 * (u -= 2.625 / d1) * u + 0.984375;
}

/** 0 → 1 → 0 hump over [0, 1]. */
export const hump = (u: number): number => Math.sin(clamp01(u) * Math.PI);
