/**
 * Seeded random number generators (DESIGN B3).
 *
 * - `sfc32` drives the sim and meta streams. Its state is a plain 4 x uint32 tuple so it can live in
 *   `SimState.rng` and in the save (`rng.capsule`) and round-trip through JSON.
 * - `xmur3` turns a string seed into 32-bit seed words: `seedSfc32(seed)` hashes `"${seed}"`.
 * - `mulberry32` is the cosmetic RNG for views. It must never feed the sim.
 *
 * All draws are integer based; no floats enter stat math.
 */
import { assert } from './assert';

/** sfc32 state: four unsigned 32-bit integers. Mutated in place by the draw functions. */
export type Sfc32State = [number, number, number, number];

/** 2^32 as an exact integer. */
const TWO_32 = 0x100000000;

/** xmur3 string hash. Each call of the returned function yields the next uint32 seed word. */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** A fresh sfc32 state seeded via xmur3 of `"${seed}"` (DESIGN B3). */
export function seedSfc32(seed: string | number): Sfc32State {
  const next = xmur3(`${seed}`);
  return [next(), next(), next(), next()];
}

/** Advances `state` in place and returns the next uint32 (0 .. 2^32-1). */
export function sfc32Next(state: Sfc32State): number {
  let [a, b, c, d] = state;
  a |= 0;
  b |= 0;
  c |= 0;
  d |= 0;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  state[0] = a >>> 0;
  state[1] = b >>> 0;
  state[2] = c >>> 0;
  state[3] = d >>> 0;
  return t >>> 0;
}

/** A copy of an sfc32 state (for forking a stream or snapshotting). */
export function cloneSfc32(state: Readonly<Sfc32State>): Sfc32State {
  return [state[0], state[1], state[2], state[3]];
}

/** Uniform integer in [0, n) without modulo bias. `n` must be an integer in 1 .. 2^32. */
export function randInt(state: Sfc32State, n: number): number {
  assert(Number.isInteger(n) && n >= 1 && n <= TWO_32, 'randInt: n must be an integer in 1..2^32');
  const limit = TWO_32 - (TWO_32 % n);
  for (;;) {
    const u = sfc32Next(state);
    if (u < limit) return u % n;
  }
}

/** Uniform integer in [min, max] (inclusive). */
export function randRange(state: Sfc32State, min: number, max: number): number {
  assert(max >= min, 'randRange: max < min');
  return min + randInt(state, max - min + 1);
}

/** True with probability `bp` / 10,000. */
export function chanceBp(state: Sfc32State, bp: number): boolean {
  if (bp <= 0) return false;
  if (bp >= 10000) return true;
  return randInt(state, 10000) < bp;
}

/** Picks one element uniformly. Throws on an empty array. */
export function pick<T>(state: Sfc32State, items: readonly T[]): T {
  assert(items.length > 0, 'pick: empty array');
  return items[randInt(state, items.length)] as T;
}

/**
 * Picks an index with probability proportional to integer `weights`.
 * Returns -1 when every weight is 0. Weights must be non-negative integers.
 */
export function pickWeighted(state: Sfc32State, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) {
    assert(Number.isInteger(w) && w >= 0, 'pickWeighted: weights must be non-negative integers');
    total += w;
  }
  if (total === 0) return -1;
  let r = randInt(state, total);
  for (let i = 0; i < weights.length; i += 1) {
    const w = weights[i] ?? 0;
    if (r < w) return i;
    r -= w;
  }
  return weights.length - 1;
}

/** Fisher-Yates shuffle in place. Returns the same array. */
export function shuffle<T>(state: Sfc32State, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randInt(state, i + 1);
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
  return items;
}

/** Cosmetic RNG for views (DESIGN B3). Never use it for anything that affects the sim or meta. */
export interface CosmeticRng {
  /** Next uint32. */
  nextU32(): number;
  /** Next value in [0, 1). Floats are fine here: this stream is cosmetic only. */
  next(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
}

/** mulberry32 cosmetic RNG. */
export function mulberry32(seed: number): CosmeticRng {
  let a = seed | 0;
  const nextU32 = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  return {
    nextU32,
    next: () => nextU32() / TWO_32,
    int: (n: number) => Math.floor((nextU32() / TWO_32) * n),
  };
}
