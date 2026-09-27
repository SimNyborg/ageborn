/**
 * Seeded 1D value noise for backdrop ridgelines (DESIGN A11: "Backdrops have 3 parallax layers per
 * age from seeded noise"). Cosmetic only; deterministic per seed so screenshots are stable.
 */
import { mulberry32 } from '@/core/rng';

export interface Noise1D {
  (x: number): number;
}

/** Smooth value noise in [-1, 1] with the given feature size (lu). */
export function valueNoise(seed: number, feature: number): Noise1D {
  const rng = mulberry32(seed);
  const table: number[] = [];
  for (let i = 0; i < 512; i++) table.push(rng.next() * 2 - 1);
  return (x: number): number => {
    const f = x / feature;
    const i = Math.floor(f);
    const t = f - i;
    const a = table[((i % 512) + 512) % 512] ?? 0;
    const b = table[(((i + 1) % 512) + 512) % 512] ?? 0;
    const s = t * t * (3 - 2 * t);
    return a + (b - a) * s;
  };
}

/** Sum of octaves. */
export function fbm(seed: number, feature: number, octaves = 3): Noise1D {
  const layers = Array.from({ length: octaves }, (_, i) => valueNoise(seed + i * 101, feature / 2 ** i));
  return (x: number): number => {
    let v = 0;
    let amp = 1;
    let norm = 0;
    for (const n of layers) {
      v += n(x) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return v / norm;
  };
}

export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
