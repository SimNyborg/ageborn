/**
 * Integer and fixed-point helpers for the deterministic layers (DESIGN B3).
 *
 * Units used by the sim:
 * - positions: world x in milli-lu; the lane is 2,000,000 milli-lu long (DESIGN A17.2)
 * - HP, shields, heals, damage: centi-units (x100)
 * - gold, XP: milli-units (x1000)
 * - power charge: parts per million
 * - multipliers: basis points (bp, 10,000 = x1), applied one at a time with truncation
 * - time: ticks of 50 ms
 *
 * Every function here returns an integer for integer input. Division always truncates toward zero
 * unless the name says otherwise.
 */

/** 1x in basis points. */
export const BP = 10000;
/** Centi-units per unit (HP, damage). */
export const CENTI = 100;
/** Milli-units per unit (gold, XP, lu). */
export const MILLI = 1000;
/** Parts per million (power charge). */
export const PPM = 1000000;
/** Milliseconds per sim tick (20 Hz). */
export const TICK_MS = 50;
/** Ticks per second. */
export const TICKS_PER_SECOND = 20;
/** Lane length in milli-lu (DESIGN B3, A17.2: 2,000 lu). `content.battle.laneLength` must match. */
export const LANE_MLU = 2000000;

/** Integer division truncating toward zero. `b` must not be 0. */
export function idiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** Integer division rounding toward negative infinity. */
export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

/** Integer division rounding half away from zero. */
export function roundDiv(a: number, b: number): number {
  const q = Math.trunc(a / b);
  const r = a - q * b;
  const twice = Math.abs(r) * 2;
  if (twice >= Math.abs(b)) return q + (a < 0 !== b < 0 ? -1 : 1);
  return q;
}

/** Truncated `a * b / c`. Exact while `a * b` stays below 2^53. */
export function mulDiv(a: number, b: number, c: number): number {
  return Math.trunc((a * b) / c);
}

/** Applies a bp multiplier with truncation: `v = trunc(v * bp / 10000)` (DESIGN B3). */
export function applyBp(value: number, bp: number): number {
  return Math.trunc((value * bp) / BP);
}

/** Applies several bp multipliers one at a time, in the given order (DESIGN A2.7 order). */
export function applyBpChain(value: number, bps: readonly number[]): number {
  let v = value;
  for (const bp of bps) v = applyBp(v, bp);
  return v;
}

/** Converts a whole percentage (for example 25) to bp (2500). */
export function pctToBp(pct: number): number {
  return pct * 100;
}

/** `num / den` as bp, truncated. */
export function ratioBp(num: number, den: number): number {
  return Math.trunc((num * BP) / den);
}

/** Milliseconds to ticks: `max(1, round(ms / 50))` (DESIGN B3), half rounds up. */
export function msToTicks(ms: number): number {
  return Math.max(1, Math.floor((ms + TICK_MS / 2) / TICK_MS));
}

/** Ticks to milliseconds. */
export function ticksToMs(ticks: number): number {
  return ticks * TICK_MS;
}

/** Clamps `v` into [lo, hi]. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Integer absolute value. */
export function iabs(v: number): number {
  return v < 0 ? -v : v;
}

/** Sign: -1, 0 or 1. */
export function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/** Integer square root: the largest r with r * r <= n. `n` must be a non-negative safe integer. */
export function isqrt(n: number): number {
  if (n < 0) throw new RangeError('isqrt of a negative number');
  if (n < 2) return n;
  // Newton iteration on integers, starting above the root.
  let x = n;
  let y = Math.floor((x + 1) / 2);
  while (y < x) {
    x = y;
    y = Math.floor((x + Math.floor(n / x)) / 2);
  }
  return x;
}

/** Linear interpolation between integers with a bp weight (0 = a, 10000 = b), truncated. */
export function lerpBp(a: number, b: number, tBp: number): number {
  return a + Math.trunc(((b - a) * tBp) / BP);
}

/**
 * Per-side lane position: side 0 advances along +x from 0, side 1 along -x from LANE_MLU.
 * The mapping is its own inverse.
 */
export function toSideP(x: number, side: 0 | 1): number {
  return side === 0 ? x : LANE_MLU - x;
}

/** Inverse of {@link toSideP}. */
export function fromSideP(p: number, side: 0 | 1): number {
  return side === 0 ? p : LANE_MLU - p;
}

/** Direction of travel along x for a side: +1 for side 0, -1 for side 1. */
export function sideDir(side: 0 | 1): 1 | -1 {
  return side === 0 ? 1 : -1;
}

// sin(d) * 10000 rounded, for d = 0..90 degrees.
const SIN_Q: readonly number[] = [
  0, 175, 349, 523, 698, 872, 1045, 1219, 1392, 1564, 1736, 1908, 2079, 2250, 2419, 2588, 2756, 2924,
  3090, 3256, 3420, 3584, 3746, 3907, 4067, 4226, 4384, 4540, 4695, 4848, 5000, 5150, 5299, 5446,
  5592, 5736, 5878, 6018, 6157, 6293, 6428, 6561, 6691, 6820, 6947, 7071, 7193, 7314, 7431, 7547,
  7660, 7771, 7880, 7986, 8090, 8192, 8290, 8387, 8480, 8572, 8660, 8746, 8829, 8910, 8988, 9063,
  9135, 9205, 9272, 9336, 9397, 9455, 9511, 9563, 9613, 9659, 9703, 9744, 9781, 9816, 9848, 9877,
  9903, 9925, 9945, 9962, 9976, 9986, 9994, 9998, 10000,
];

/** sin of an integer angle in degrees, as bp (-10000..10000). Lookup table, no floats. */
export function sinDegBp(deg: number): number {
  let d = ((Math.trunc(deg) % 360) + 360) % 360;
  let s = 1;
  if (d >= 180) {
    d -= 180;
    s = -1;
  }
  if (d > 90) d = 180 - d;
  return s * (SIN_Q[d] ?? 0);
}

/** cos of an integer angle in degrees, as bp (-10000..10000). */
export function cosDegBp(deg: number): number {
  return sinDegBp(Math.trunc(deg) + 90);
}
