/**
 * Small helpers for writing the ZzFX sound manifest (`sounds.ts`) readably.
 *
 * `zz({...})` turns named parameters into the positional ZzFX array (the format the ZzFX designer
 * uses), `variants(n, v => ...)` builds 3-5 variants from one design with a deterministic spread, and
 * `mixVariants` does the same for layered sounds (jingles, fanfares, impacts with a tail).
 */
import type { ZzfxParams } from './vendor/zzfx';

/** ZzFX wave shapes by name (upstream numbers). */
export const SHAPE = { sin: 0, tri: 1, saw: 2, tan: 3, noise: 4, square: 5 } as const;
export type ShapeName = keyof typeof SHAPE;

/** Named ZzFX parameters (seconds, Hz, as in the ZzFX designer). */
export interface Zz {
  vol?: number;
  freq?: number;
  attack?: number;
  sustain?: number;
  release?: number;
  shape?: ShapeName;
  /** Shape curve; for `square` it is twice the duty cycle (1 = 50%). */
  curve?: number;
  /** Pitch slide, about 500 Hz per second per unit. */
  slide?: number;
  deltaSlide?: number;
  /** Pitch jump in Hz after `jumpTime` seconds. */
  jump?: number;
  jumpTime?: number;
  /** Repeat period in seconds (restarts the pitch; also the tremolo period). */
  repeat?: number;
  noise?: number;
  /** Frequency modulation rate in Hz. */
  mod?: number;
  crush?: number;
  /** Echo delay in seconds. */
  delay?: number;
  sustainVol?: number;
  decay?: number;
  tremolo?: number;
  /** Low-pass cutoff in Hz (ZzFX `filter` = -cutoff / 2, since ZzFX doubles it). */
  lowpass?: number;
  /** High-pass cutoff in Hz (ZzFX `filter` = cutoff / 2). */
  highpass?: number;
}

/** Highest filter cutoff: ZzFX's biquad is unstable at or above Nyquist, so stay well below the 32 kHz render rate's 16 kHz. */
export const MAX_CUTOFF_HZ = 10000;

/**
 * Named parameters to the positional ZzFX array. Randomness is always 0: the mixer varies pitch per
 * play (A13), so pre-rendered variants stay reproducible.
 */
export function zz(p: Zz): number[] {
  const round = (x: number | undefined, d: number): number => {
    const v = x ?? d;
    return Math.round(v * 10000) / 10000;
  };
  if (p.lowpass !== undefined && p.highpass !== undefined) throw new Error('zz: use lowpass or highpass, not both');
  const cutoff = p.lowpass ?? p.highpass;
  if (cutoff !== undefined && (cutoff <= 0 || cutoff > MAX_CUTOFF_HZ)) throw new Error(`zz: cutoff ${cutoff} out of range`);
  const filter = p.lowpass !== undefined ? -p.lowpass / 2 : p.highpass !== undefined ? p.highpass / 2 : 0;
  return [
    round(p.vol, 1),
    0,
    round(p.freq, 220),
    round(p.attack, 0),
    round(p.sustain, 0),
    round(p.release, 0.1),
    SHAPE[p.shape ?? 'sin'],
    round(p.curve, 1),
    round(p.slide, 0),
    round(p.deltaSlide, 0),
    round(p.jump, 0),
    round(p.jumpTime, 0),
    round(p.repeat, 0),
    round(p.noise, 0),
    round(p.mod, 0),
    round(p.crush, 0),
    round(p.delay, 0),
    round(p.sustainVol, 1),
    round(p.decay, 0),
    round(p.tremolo, 0),
    round(filter, 0),
  ];
}

/**
 * Deterministic spread per variant index, in [-1, 1]: variant 0 is the design itself, the next ones
 * sit below and above it. A design multiplies its spread amounts by `v`.
 */
export const VARIANT_SPREAD: readonly number[] = [0, -1, 1, -0.5, 0.5];

/** `n` variants (3-5) of one design; `make(v, k)` gets the spread `v` in [-1, 1] and the index `k`. */
export function variants(n: number, make: (v: number, k: number) => Zz): number[][] {
  if (n < 1 || n > VARIANT_SPREAD.length) throw new Error(`variants: n must be 1-${VARIANT_SPREAD.length}`);
  return VARIANT_SPREAD.slice(0, n).map((v, k) => zz(make(v, k)));
}

/** One voice of a layered sound: a ZzFX call started `atMs` after the sound starts. */
export interface ZzfxNote {
  atMs: number;
  params: ZzfxParams;
}

/** A layered voice from named parameters. */
export function at(atMs: number, p: Zz): ZzfxNote {
  return { atMs, params: zz(p) };
}

/** A layered voice pitched to a note name (`C5`, `F#4`), optionally shifted by semitones. */
export function note(atMs: number, name: string, p: Zz, semitones = 0): ZzfxNote {
  return { atMs, params: zz({ ...p, freq: hz(name, semitones) }) };
}

/** `n` variants of a layered design. */
export function mixVariants(n: number, make: (v: number, k: number) => ZzfxNote[]): ZzfxNote[][] {
  if (n < 1 || n > VARIANT_SPREAD.length) throw new Error(`mixVariants: n must be 1-${VARIANT_SPREAD.length}`);
  return VARIANT_SPREAD.slice(0, n).map((v, k) => make(v, k));
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI note number of a note name such as `C4` (60), `F#5` or `Bb3`. */
export function midi(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note name "${name}"`);
  const base = NOTE_INDEX[m[1] as string] as number;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + base + acc;
}

/** Frequency in Hz of a MIDI note (A4 = 69 = 440 Hz). */
export function midiHz(m: number): number {
  return 440 * 2 ** ((m - 69) / 12);
}

/** Frequency in Hz of a note name, optionally shifted by semitones. */
export function hz(name: string, semitones = 0): number {
  return midiHz(midi(name) + semitones);
}
