/**
 * Screen shake, trauma model (DESIGN A12 Screen shake):
 *
 * - shake = trauma²; trauma decays linearly at 1.2/s.
 * - 1D gradient (Perlin) noise at 18 Hz with separate seeds for x, y and rotation.
 * - Max offset 12 px, max rotation 2.5°, plus a small directional kick along the attack vector.
 *
 * View-side and cosmetic only (floats and the cosmetic RNG are fine here, B3).
 */
import { mulberry32 } from '@/core';

export interface ShakeConfig {
  decayPerSec: number;
  noiseHz: number;
  maxOffsetPx: number;
  maxRotDeg: number;
}

/** Seeded 1D gradient noise in [-1, 1] (Perlin style, period 256). */
export class Noise1D {
  private readonly grad: Float32Array;
  private readonly perm: Uint8Array;

  constructor(seed: number) {
    const rng = mulberry32(seed);
    this.grad = new Float32Array(256);
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      this.grad[i] = rng.next() * 2 - 1;
      p[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = rng.int(i + 1);
      const tmp = p[i] ?? 0;
      p[i] = p[j] ?? 0;
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255] ?? 0;
  }

  at(t: number): number {
    const i0 = Math.floor(t);
    const f = t - i0;
    const a = i0 & 255;
    const g0 = this.grad[this.perm[a] ?? 0] ?? 0;
    const g1 = this.grad[this.perm[a + 1] ?? 0] ?? 0;
    const v0 = g0 * f;
    const v1 = g1 * (f - 1);
    const u = f * f * f * (f * (f * 6 - 15) + 10);
    // Gradient noise peaks near ±0.5; scale to about ±1.
    return Math.max(-1, Math.min(1, (v0 + (v1 - v0) * u) * 2));
  }
}

export interface ShakeOffset {
  x: number;
  y: number;
  /** Radians. */
  rot: number;
}

export class Shake {
  trauma = 0;
  /** Player setting × reduce-motion factor (0 disables shake). */
  multiplier = 1;
  private timeSec = 0;
  private readonly nx: Noise1D;
  private readonly ny: Noise1D;
  private readonly nr: Noise1D;
  private kickX = 0;
  private kickY = 0;
  private kickLeft = 0;

  constructor(
    public config: ShakeConfig,
    seed = 1,
    public kickPx = 5,
    public kickDecayMs = 140,
  ) {
    this.nx = new Noise1D(seed * 3 + 1);
    this.ny = new Noise1D(seed * 3 + 2);
    this.nr = new Noise1D(seed * 3 + 3);
  }

  /** Adds trauma (clamped to 1) and an optional kick along the unit vector `dir`. */
  add(amount: number, dir?: { x: number; y: number }): void {
    if (!(amount > 0)) return;
    this.trauma = Math.min(1, this.trauma + amount);
    if (dir) {
      const len = Math.hypot(dir.x, dir.y) || 1;
      const k = this.kickPx * Math.min(1, amount / 0.25);
      this.kickX = (dir.x / len) * k;
      this.kickY = (dir.y / len) * k;
      this.kickLeft = this.kickDecayMs;
    }
  }

  update(dtMs: number): void {
    const dt = Math.max(0, dtMs);
    this.timeSec += dt / 1000;
    this.trauma = Math.max(0, this.trauma - (this.config.decayPerSec * dt) / 1000);
    this.kickLeft = Math.max(0, this.kickLeft - dt);
  }

  /** The current screen offset. Zero when trauma and kick are spent or the multiplier is 0. */
  offset(): ShakeOffset {
    const m = Math.max(0, this.multiplier);
    if (m === 0) return { x: 0, y: 0, rot: 0 };
    const s = this.trauma * this.trauma * m;
    const t = this.timeSec * this.config.noiseHz;
    const kick = this.kickDecayMs > 0 ? this.kickLeft / this.kickDecayMs : 0;
    return {
      x: this.config.maxOffsetPx * s * this.nx.at(t) + this.kickX * kick * m,
      y: this.config.maxOffsetPx * s * this.ny.at(t + 17.3) + this.kickY * kick * m,
      rot: ((this.config.maxRotDeg * Math.PI) / 180) * s * this.nr.at(t + 41.7),
    };
  }

  reset(): void {
    this.trauma = 0;
    this.kickLeft = 0;
  }
}
