import { describe, expect, it } from 'vitest';
import { buildSamples, getNote, NOISE_EXACT_LIMIT, zzfxLength, type ZzfxParams } from '../vendor/zzfx';

/**
 * Verbatim port of upstream ZzFX 1.3.2 `ZZFX.buildSamples` (MIT, Frank Force), kept only as the test
 * oracle. Only `this.sampleRate`, `this.volume` and `Math.random` became parameters.
 */
/* eslint-disable */
function upstream(params: ZzfxParams, sampleRateIn = 44100, masterVolume = 0.3, rand: () => number = () => 0.5): number[] {
  let [
    volume = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0, release = .1, shape = 0, shapeCurve = 1,
    slide = 0, deltaSlide = 0, pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0, bitCrush = 0,
    delay = 0, sustainVolume = 1, decay = 0, tremolo = 0, filter = 0,
  ] = params as number[];
  let sampleRate = sampleRateIn,
    PI2 = Math.PI * 2,
    abs = Math.abs,
    sign = (v: number) => (v < 0 ? -1 : 1),
    startSlide = (slide *= 500 * PI2 / sampleRate / sampleRate),
    startFrequency = (frequency *= (1 + randomness * 2 * rand() - randomness) * PI2 / sampleRate),
    modOffset = 0, repeat = 0, crush = 0, jump = 1, length: number, b: number[] = [], t = 0, i = 0, s = 0, f: number,
    quality = 2, w = PI2 * abs(filter) * 2 / sampleRate,
    cos = Math.cos(w), alpha = Math.sin(w) / 2 / quality,
    a0 = 1 + alpha, a1 = -2 * cos / a0, a2 = (1 - alpha) / a0,
    b0 = (1 + sign(filter) * cos) / 2 / a0,
    b1 = -(sign(filter) + cos) / a0, b2 = b0,
    x2 = 0, x1 = 0, y2 = 0, y1 = 0;
  const minAttack = 9;
  attack = attack * sampleRate || minAttack;
  decay *= sampleRate;
  sustain *= sampleRate;
  release *= sampleRate;
  delay *= sampleRate;
  deltaSlide *= 500 * PI2 / sampleRate ** 3;
  modulation *= PI2 / sampleRate;
  pitchJump *= PI2 / sampleRate;
  pitchJumpTime *= sampleRate;
  repeatTime = repeatTime * sampleRate | 0;
  volume *= masterVolume;
  for (length = attack + decay + sustain + release + delay | 0; i < length; b[i++] = s * volume) {
    if (!(++crush % (bitCrush * 100 | 0))) {
      s = shape ? shape > 1 ? shape > 2 ? shape > 3 ? shape > 4 ?
        ((t / PI2 % 1 < shapeCurve / 2) as unknown as number) * 2 - 1 :
        Math.sin(t ** 3) :
        Math.max(Math.min(Math.tan(t), 1), -1) :
        1 - (2 * t / PI2 % 2 + 2) % 2 :
        1 - 4 * abs(Math.round(t / PI2) - t / PI2) :
        Math.sin(t);
      s = (repeatTime ? 1 - tremolo + tremolo * Math.sin(PI2 * i / repeatTime) : 1) *
        (shape > 4 ? s : sign(s) * abs(s) ** shapeCurve) *
        (i < attack ? i / attack :
          i < attack + decay ? 1 - ((i - attack) / decay) * (1 - sustainVolume) :
            i < attack + decay + sustain ? sustainVolume :
              i < length - delay ? (length - i - delay) / release * sustainVolume :
                0);
      s = delay ? s / 2 + (delay > i ? 0 : (i < length - delay ? 1 : (length - i) / delay) * b[i - delay | 0]! / 2 / volume) : s;
      if (filter) s = y1 = b2 * x2 + b1 * (x2 = x1) + b0 * (x1 = s) - a2 * y2 - a1 * (y2 = y1);
    }
    f = (frequency += slide += deltaSlide) * Math.cos(modulation * modOffset++);
    t += f + f * noise * Math.sin(i ** 5);
    if (jump && ++jump > pitchJumpTime) {
      frequency += pitchJump;
      startFrequency += pitchJump;
      jump = 0;
    }
    if (repeatTime && !(++repeat % repeatTime)) {
      frequency = startFrequency;
      slide = startSlide;
      jump ||= 1;
    }
  }
  return b;
}
/* eslint-enable */

function maxDiff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  expect(a.length).toBe(b.length);
  let m = 0;
  for (let k = 0; k < a.length; k++) m = Math.max(m, Math.abs(a[k]! - b[k]!));
  return m;
}

function rms(a: ArrayLike<number>, from = 0, to = a.length): number {
  let s = 0;
  for (let k = from; k < to; k++) s += a[k]! * a[k]!;
  return Math.sqrt(s / Math.max(1, to - from));
}

// Designer-style parameter lists covering every shape and feature without noise.
const EXACT_CASES: Record<string, ZzfxParams> = {
  sine: [1, 0, 440, 0, 0.05, 0.1],
  triangle: [1, 0, 660, 0.01, 0.02, 0.1, 1, 1.8],
  saw: [0.8, 0, 220, 0.01, 0.05, 0.1, 2, 0.8, -2],
  tan: [1, 0, 300, 0, 0.03, 0.08, 3],
  square: [1, 0, 330, 0, 0.05, 0.05, 5, 0.6],
  coin: [undefined, 0, 1675, undefined, 0.06, 0.24, 1, 1.82, undefined, undefined, 837, 0.06],
  slides: [1, 0, 500, 0.02, 0.1, 0.2, 0, 1, 3, 0.5, -200, 0.05, 0.08],
  repeatTremolo: [1, 0, 400, 0, 0.2, 0.1, 1, 1, 0, 0, 0, 0, 0.05, 0, 0, 0, 0, 0.8, 0.02, 0.5],
  modulation: [1, 0, 600, 0, 0.1, 0.1, 0, 1, 0, 0, 0, 0, 0, 0, 25],
  bitCrush: [1, 0, 300, 0, 0.1, 0.1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0.2],
  delay: [1, 0, 500, 0, 0.05, 0.05, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0.1],
  lowpass: [1, 0, 200, 0, 0.1, 0.1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -800],
  highpass: [1, 0, 200, 0, 0.1, 0.1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1200],
  decaySustain: [1, 0, 440, 0.01, 0.1, 0.1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.05],
  // Upstream picks the wave by range, so designer arrays with odd shape values still match.
  shapeHalf: [1, 0, 440, 0, 0.03, 0.03, 0.5, 1.5],
  shapeNegative: [1, 0, 440, 0, 0.03, 0.03, -1, 1.5],
  shapeFractionalSaw: [1, 0, 440, 0, 0.03, 0.03, 1.5, 0.7],
  shapeFractionalTan: [1, 0, 440, 0, 0.03, 0.03, 2.5],
  shapeAboveSquare: [1, 0, 440, 0, 0.03, 0.03, 7, 0.4],
};

describe('vendored ZzFX', () => {
  it.each(Object.entries(EXACT_CASES))('matches upstream exactly without noise: %s', (_name, params) => {
    for (const sr of [44100, 32000]) {
      const ours = buildSamples(params, { sampleRate: sr });
      const theirs = upstream(params, sr);
      // Float32 storage is the only difference.
      expect(maxDiff(ours, Float32Array.from(theirs))).toBe(0);
    }
  });

  it('applies the randomness parameter through the injected random source', () => {
    const p: ZzfxParams = [1, 0.2, 440, 0, 0.05, 0.05];
    for (const r of [0, 0.25, 0.9]) {
      expect(maxDiff(buildSamples(p, { random: () => r }), Float32Array.from(upstream(p, 44100, 0.3, () => r)))).toBe(0);
    }
  });

  it('keeps the tonal start of noise exact and the rest the same kind of noise', () => {
    const p: ZzfxParams = [1, 0, 200, 0, 0.3, 0.2, 4];
    const ours = buildSamples(p);
    const theirs = upstream(p);
    // Exact while t**3 stays below the limit (t grows by 2π·200/44100 per sample).
    const exactUntil = Math.floor(Math.cbrt(NOISE_EXACT_LIMIT) / ((2 * Math.PI * 200) / 44100)) - 1;
    expect(maxDiff(ours.subarray(0, exactUntil), Float32Array.from(theirs.slice(0, exactUntil)))).toBe(0);
    // Same loudness over the noisy part (within 10%) and same envelope length.
    const a = rms(ours, exactUntil);
    const b = rms(theirs, exactUntil);
    expect(Math.abs(a - b) / b).toBeLessThan(0.1);
  });

  it('keeps the noise parameter statistically the same', () => {
    const p: ZzfxParams = [1, 0, 300, 0, 0.3, 0.1, 0, 1, 0, 0, 0, 0, 0, 3];
    const ours = buildSamples(p);
    const theirs = upstream(p);
    expect(Math.abs(rms(ours) - rms(theirs)) / rms(theirs)).toBeLessThan(0.1);
  });

  it('is reproducible: the same parameters give the same samples', () => {
    const p: ZzfxParams = [1, 0, 900, 0.01, 0.2, 0.3, 4, 1, 2, 0, 0, 0, 0.05, 1.5, 0, 0, 0, 1, 0, 0.4, -3000];
    expect(maxDiff(buildSamples(p), buildSamples(p))).toBe(0);
    // A different list gets different noise.
    const q = [...p];
    q[2] = 901;
    expect(maxDiff(buildSamples(p), buildSamples(q))).toBeGreaterThan(0);
  });

  it('computes the length from the envelope', () => {
    const p: ZzfxParams = [1, 0, 440, 0.01, 0.1, 0.2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0.05, 1, 0.03];
    expect(buildSamples(p).length).toBe(zzfxLength(p));
    expect(zzfxLength(p, 44100)).toBe(((0.01 + 0.03 + 0.1 + 0.2 + 0.05) * 44100) | 0);
    // A zero attack still gets 9 samples of fade-in.
    expect(zzfxLength([1, 0, 440, 0, 0, 0])).toBe(9);
  });

  it('getNote follows equal temperament', () => {
    expect(getNote(0)).toBe(440);
    expect(getNote(12)).toBeCloseTo(880, 9);
    expect(getNote(-12, 220)).toBeCloseTo(110, 9);
  });
});
