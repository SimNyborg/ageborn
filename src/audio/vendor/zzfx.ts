/*

  ZzFX - Zuper Zmall Zound Zynth v1.3.2 by Frank Force
  https://github.com/KilledByAPixel/ZzFX

  ZzFX MIT License

  Copyright (c) 2019 - Frank Force

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

*/
/**
 * Vendored ZzFX sample generator (DESIGN B1 "ZzFX (vendored MIT source)", B7, A13).
 *
 * Ageborn changes to the upstream `ZZFX.buildSamples` (v1.3.2, npm `zzfx`):
 * - Ported to TypeScript as a pure function. There is no module-level `AudioContext` and no playback
 *   code: the Ageborn mixer (`src/audio/mixer.ts`) owns the audio graph and the per-play variation.
 * - The sample rate, master volume and the random source of the `randomness` parameter are options.
 * - Output is a `Float32Array`, and the inner loop has fast paths that give the same samples
 *   (default shape curve, no modulation, no bit crush).
 * - Noise. Upstream noise is `sin(t**3)` (noise shape) and `sin(i**5)` (noise parameter). Once those
 *   arguments are huge, `Math.sin` needs a slow exact range reduction and its value is effectively a
 *   random phase, so above `NOISE_EXACT_LIMIT` a seeded generator supplies the random phase instead.
 *   The result is the same kind of noise at a fraction of the cost and is reproducible per parameter
 *   list; below the limit (the tonal start of a noise sound) the samples equal upstream.
 *   `src/audio/test/zzfx.test.ts` compares against a verbatim port of upstream.
 *
 * The parameter order is the upstream one, so arrays from the ZzFX designer
 * (https://killedbyapixel.github.io/ZzFX/) paste straight into `src/audio/sounds.ts`.
 */

/**
 * ZzFX parameters in upstream order; `undefined` (or a hole) means the default:
 * 0 volume (1), 1 randomness (.05), 2 frequency (220), 3 attack (0), 4 sustain (0), 5 release (.1),
 * 6 shape (0 sin, 1 triangle, 2 saw, 3 tan, 4 noise, 5 square), 7 shapeCurve (1), 8 slide (0),
 * 9 deltaSlide (0), 10 pitchJump (0), 11 pitchJumpTime (0), 12 repeatTime (0), 13 noise (0),
 * 14 modulation (0), 15 bitCrush (0), 16 delay (0), 17 sustainVolume (1), 18 decay (0),
 * 19 tremolo (0), 20 filter (0; positive = high-pass, negative = low-pass, cutoff about 2 × |filter| Hz).
 */
export type ZzfxParams = readonly (number | undefined)[];

/** Upstream master volume (`ZZFX.volume`), kept so designer arrays sound at designer loudness. */
export const ZZFX_VOLUME = 0.3;
/** Upstream default sample rate (`ZZFX.sampleRate`). */
export const ZZFX_SAMPLE_RATE = 44100;
/** Below this `|argument|`, noise uses the exact upstream `Math.sin`; above it, a seeded random phase. */
export const NOISE_EXACT_LIMIT = 1e6;
/** `|t|` below which `t ** 3` stays under `NOISE_EXACT_LIMIT` (noise shape). */
const NOISE_EXACT_T = 100;
/** Sample index below which `i ** 5` stays under `NOISE_EXACT_LIMIT` (noise parameter). */
const NOISE_EXACT_I = 15;

/** `sin(2π k / 4096)`: a random index gives `sin` of a uniformly random phase. */
const SIN_TABLE = /* @__PURE__ */ (() => {
  const table = new Float64Array(4096);
  for (let k = 0; k < table.length; k++) table[k] = Math.sin((2 * Math.PI * k) / table.length);
  return table;
})();

export interface ZzfxRenderOptions {
  sampleRate?: number;
  /** Master volume scale (upstream `ZZFX.volume`). */
  masterVolume?: number;
  /** Random source for the `randomness` parameter; only used when randomness is not 0. */
  random?: () => number;
}

/** Number of samples a parameter list renders to (attack + decay + sustain + release + delay). */
export function zzfxLength(params: ZzfxParams, sampleRate: number = ZZFX_SAMPLE_RATE): number {
  const attack = (params[3] ?? 0) * sampleRate || 9;
  const decay = (params[18] ?? 0) * sampleRate;
  const sustain = (params[4] ?? 0) * sampleRate;
  const release = (params[5] ?? 0.1) * sampleRate;
  const delay = (params[16] ?? 0) * sampleRate;
  return (attack + decay + sustain + release + delay) | 0;
}

/** A small seeded generator (mulberry32); returns a uint32. */
function noiseBits(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return (r ^ (r >>> 14)) >>> 0;
  };
}

/** FNV-1a over the parameter values, so every parameter list gets its own noise. */
function seedOf(params: ZzfxParams): number {
  let h = 0x811c9dc5;
  const text = params.map((p) => (p === undefined ? '' : String(p))).join(',');
  for (let k = 0; k < text.length; k++) {
    h ^= text.charCodeAt(k);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Builds the samples of one ZzFX sound (upstream `ZZFX.buildSamples`). */
export function buildSamples(params: ZzfxParams, o: ZzfxRenderOptions = {}): Float32Array {
  const sampleRate = o.sampleRate ?? ZZFX_SAMPLE_RATE;
  const random = o.random ?? Math.random;
  let volume = params[0] ?? 1;
  const randomness = params[1] ?? 0.05;
  let frequency = params[2] ?? 220;
  let attack = params[3] ?? 0;
  let sustain = params[4] ?? 0;
  let release = params[5] ?? 0.1;
  const shape = params[6] ?? 0;
  const shapeCurve = params[7] ?? 1;
  let slide = params[8] ?? 0;
  let deltaSlide = params[9] ?? 0;
  let pitchJump = params[10] ?? 0;
  let pitchJumpTime = params[11] ?? 0;
  let repeatTime = params[12] ?? 0;
  const noise = params[13] ?? 0;
  let modulation = params[14] ?? 0;
  const bitCrush = params[15] ?? 0;
  let delay = params[16] ?? 0;
  const sustainVolume = params[17] ?? 1;
  let decay = params[18] ?? 0;
  const tremolo = params[19] ?? 0;
  const filter = params[20] ?? 0;
  // Upstream picks the wave by range (`shape ? shape > 1 ? ...`), so fractional and negative values
  // select a wave too (0.5 and -1 are triangles, 1.5 a saw, anything above 4 a square).
  const wave = !shape ? 0 : shape <= 1 ? 1 : shape <= 2 ? 2 : shape <= 3 ? 3 : shape <= 4 ? 4 : 5;

  const PI2 = Math.PI * 2;
  const abs = Math.abs;
  const sign = (v: number): number => (v < 0 ? -1 : 1);
  const startSlide = (slide *= (500 * PI2) / sampleRate / sampleRate);
  let startFrequency = (frequency *=
    randomness === 0 ? PI2 / sampleRate : ((1 + randomness * 2 * random() - randomness) * PI2) / sampleRate);
  let modOffset = 0;
  let repeat = 0;
  let crush = 0;
  let jump = 1;
  let t = 0;
  let i = 0;
  let s = 0;
  let f: number;

  // biquad LP/HP filter
  const quality = 2;
  const w = (PI2 * abs(filter) * 2) / sampleRate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / 2 / quality;
  const a0 = 1 + alpha;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const b0 = (1 + sign(filter) * cos) / 2 / a0;
  const b1 = -(sign(filter) + cos) / a0;
  const b2 = b0;
  let x2 = 0;
  let x1 = 0;
  let y2 = 0;
  let y1 = 0;

  // scale by sample rate
  const minAttack = 9; // prevent pop if attack is 0
  attack = attack * sampleRate || minAttack;
  decay *= sampleRate;
  sustain *= sampleRate;
  release *= sampleRate;
  delay *= sampleRate;
  deltaSlide *= (500 * PI2) / sampleRate ** 3;
  modulation *= PI2 / sampleRate;
  pitchJump *= PI2 / sampleRate;
  pitchJumpTime *= sampleRate;
  repeatTime = (repeatTime * sampleRate) | 0;
  volume *= o.masterVolume ?? ZZFX_VOLUME;

  const length = (attack + decay + sustain + release + delay) | 0;
  const b = new Float32Array(Math.max(0, length));
  // The delay line reads unscaled samples back; keep them in full precision as upstream does.
  const raw = delay ? new Float64Array(Math.max(0, length)) : null;
  const crushEvery = (bitCrush * 100) | 0;
  const decayEnd = attack + decay;
  const sustainEnd = attack + decay + sustain;
  const releaseEnd = length - delay;
  const bits = wave === 4 || noise ? noiseBits(seedOf(params)) : () => 0;

  for (; i < length; ) {
    // bit crush: upstream `!(++crush % (bitCrush*100|0))`, always true when the period is 0
    ++crush;
    if (crushEvery === 0 || crush % crushEvery === 0) {
      // wave shape
      switch (wave) {
        case 0:
          s = Math.sin(t); // 0 sin
          break;
        case 1:
          s = 1 - 4 * abs(Math.round(t / PI2) - t / PI2); // 1 triangle
          break;
        case 2:
          s = 1 - (((((2 * t) / PI2) % 2) + 2) % 2); // 2 saw
          break;
        case 3:
          s = Math.max(Math.min(Math.tan(t), 1), -1); // 3 tan
          break;
        case 4:
          s = t < NOISE_EXACT_T && t > -NOISE_EXACT_T ? Math.sin(t ** 3) : SIN_TABLE[bits() & 4095]!; // 4 noise
          break;
        default:
          s = ((t / PI2) % 1 < shapeCurve / 2 ? 1 : 0) * 2 - 1; // 5 square duty
      }

      // shape curve, not for the square (the default curve 1 leaves the value as it is)
      if (wave !== 5 && shapeCurve !== 1) s = sign(s) * abs(s) ** shapeCurve;

      // tremolo
      if (repeatTime) s *= 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeatTime);

      // envelope
      s *=
        i < attack
          ? i / attack // attack
          : i < decayEnd
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume) // decay falloff
            : i < sustainEnd
              ? sustainVolume // sustain volume
              : i < releaseEnd
                ? ((length - i - delay) / release) * sustainVolume // release falloff
                : 0; // post release

      if (raw) {
        // sample delay
        s = s / 2 + (delay > i ? 0 : ((i < releaseEnd ? 1 : (length - i) / delay) * raw[(i - delay) | 0]!) / 2 / volume);
      }

      if (filter) {
        // apply filter
        const y = b2 * x2 + b1 * x1 + b0 * s - a2 * y2 - a1 * y1;
        x2 = x1;
        x1 = s;
        y2 = y1;
        y1 = y;
        s = y;
      }
    }

    // frequency and modulation (cos(0) = 1 when there is no modulation)
    frequency += slide += deltaSlide;
    f = modulation ? frequency * Math.cos(modulation * modOffset++) : frequency;
    // noise
    if (noise) t += f + f * noise * (i < NOISE_EXACT_I ? Math.sin(i ** 5) : SIN_TABLE[bits() & 4095]!);
    else t += f;

    if (jump && ++jump > pitchJumpTime) {
      // pitch jump
      frequency += pitchJump; // apply pitch jump
      startFrequency += pitchJump; // also apply to start
      jump = 0; // stop pitch jump time
    }

    if (repeatTime && !(++repeat % repeatTime)) {
      // repeat
      frequency = startFrequency; // reset frequency
      slide = startSlide; // reset slide
      jump ||= 1; // reset pitch jump time
    }

    const out = s * volume;
    if (raw) raw[i] = out;
    b[i++] = out;
  }

  return b;
}

/** Frequency of a note `semitoneOffset` semitones from `rootNoteFrequency` (upstream `ZZFX.getNote`). */
export function getNote(semitoneOffset = 0, rootNoteFrequency = 440): number {
  return rootNoteFrequency * 2 ** (semitoneOffset / 12);
}
