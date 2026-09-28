/**
 * The mixer graph (DESIGN A13 Mixer, B7):
 *
 * ```
 * sfx bus ───────────────┐
 * ui bus ────────────────┼─> master ─> limiter ─> safety clipper ─> [meter] ─> destination
 * music bus ─> duck ─────┘
 * ```
 *
 * - Bus volumes come from Settings (0..1) on a square-law taper, times a fixed mix trim per bus.
 * - The limiter is a fast, hard-knee compressor; the safety clipper after it is a soft-knee wave shaper
 *   whose output can never reach full scale, so 40 simultaneous hits cannot clip (C2/WP6 DoD).
 * - Ducking lowers the music bus (A13: 6 dB during powers, evolves and walkouts), merging overlapping
 *   requests into the deepest and longest one.
 *
 * Works on any BaseAudioContext, so the dev soundboard can render it offline to measure peaks.
 */
import type { Bus } from '@/contracts';

/**
 * Fixed mix trim per bus (linear), applied on top of the player's volume setting. The master trim
 * sits before the limiter and offsets the limiter's automatic make-up gain, so a single sound plays at
 * about the level it was designed at.
 */
export const MIX_TRIM: Readonly<Record<Bus, number>> = { master: 0.7, music: 0.55, sfx: 1.0, ui: 0.8 };

/**
 * Master limiter: a hard-knee 20:1 compressor with zero attack (the browser's compressor looks ahead a
 * few ms). Measured in Chromium: 40 aligned worst-case hits come out at about 0.9 of full scale (the
 * clipper only rounds the top), while a single hit plays at its designed level.
 */
export const LIMITER = { threshold: -10, knee: 0, ratio: 20, attack: 0, release: 0.15 } as const;

/** Safety clipper: linear up to `knee`, then a tanh knee that approaches `ceiling` at 2× full scale. */
export const CLIPPER = { knee: 0.8, ceiling: 0.98, points: 4097 } as const;

/** Duck ramp times in seconds. */
export const DUCK_ATTACK_S = 0.05;
export const DUCK_RELEASE_S = 0.35;

/** Settings volume (0..1) to linear gain: a square-law taper, so the slider feels even. */
export function volumeGain(v01: number): number {
  const v = Number.isFinite(v01) ? Math.min(1, Math.max(0, v01)) : 1;
  return v * v;
}

/** The soft clip transfer function for a signal `y` (full scale = 1). |result| ≤ ceiling < 1 always. */
export function softClip(y: number): number {
  const a = Math.abs(y);
  if (a <= CLIPPER.knee) return y;
  const room = CLIPPER.ceiling - CLIPPER.knee;
  return Math.sign(y) * (CLIPPER.knee + room * Math.tanh((a - CLIPPER.knee) / room));
}

/**
 * The WaveShaper curve. The shaper's input is pre-scaled by 0.5, so the curve's domain [-1, 1] covers
 * signals up to ±2; beyond that the shaper holds the end value, still below the ceiling.
 */
export function softClipCurve(points: number = CLIPPER.points): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(points);
  for (let k = 0; k < points; k++) {
    const x = (k / (points - 1)) * 2 - 1;
    curve[k] = softClip(2 * x);
  }
  return curve;
}

/** A merged duck: music is `depthDb` down until `until` (seconds), then releases. */
export interface DuckState {
  depthDb: number;
  until: number;
}

/**
 * Merges a duck request of `db` (either sign means "down by |db|") for `ms` at `now` (seconds) into
 * the current state: while a duck is active, the result is the deeper depth and the later end.
 */
export function mergeDuck(state: DuckState | null, db: number, ms: number, now: number): DuckState {
  const depthDb = Math.abs(db);
  const until = now + Math.max(0, ms) / 1000;
  if (!state || state.until <= now) return { depthDb, until };
  return { depthDb: Math.max(state.depthDb, depthDb), until: Math.max(state.until, until) };
}

export interface MixerOptions {
  /** Where the master chain ends (default the context's destination). */
  destination?: AudioNode;
  /** Adds an AnalyserNode after the clipper for peak metering (dev pages). */
  meter?: boolean;
}

/** Cancels automation from `when` on and holds the current value (with a fallback for old engines). */
export function holdParam(p: AudioParam, when: number): void {
  const withHold = p as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
  if (typeof withHold.cancelAndHoldAtTime === 'function') {
    withHold.cancelAndHoldAtTime(when);
  } else {
    const v = p.value;
    p.cancelScheduledValues(when);
    p.setValueAtTime(v, when);
  }
}

export class Mixer {
  readonly bus: Readonly<Record<Bus, GainNode>>;
  readonly duckGain: GainNode;
  readonly limiter: DynamicsCompressorNode;
  readonly preClip: GainNode;
  readonly clipper: WaveShaperNode;
  readonly meter: AnalyserNode | null;
  private readonly volume: Record<Bus, number> = { master: 1, music: 1, sfx: 1, ui: 1 };
  private duck: DuckState | null = null;

  constructor(
    readonly ctx: BaseAudioContext,
    o: MixerOptions = {},
  ) {
    const gain = (v: number): GainNode => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    this.bus = {
      master: gain(MIX_TRIM.master),
      music: gain(MIX_TRIM.music),
      sfx: gain(MIX_TRIM.sfx),
      ui: gain(MIX_TRIM.ui),
    };
    this.duckGain = gain(1);
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = LIMITER.threshold;
    this.limiter.knee.value = LIMITER.knee;
    this.limiter.ratio.value = LIMITER.ratio;
    this.limiter.attack.value = LIMITER.attack;
    this.limiter.release.value = LIMITER.release;
    this.preClip = gain(0.5);
    this.clipper = ctx.createWaveShaper();
    this.clipper.curve = softClipCurve();
    this.clipper.oversample = '2x';

    this.bus.music.connect(this.duckGain);
    this.duckGain.connect(this.bus.master);
    this.bus.sfx.connect(this.bus.master);
    this.bus.ui.connect(this.bus.master);
    this.bus.master.connect(this.limiter);
    this.limiter.connect(this.preClip);
    this.preClip.connect(this.clipper);
    const destination = o.destination ?? ctx.destination;
    if (o.meter) {
      this.meter = ctx.createAnalyser();
      this.meter.fftSize = 2048;
      this.clipper.connect(this.meter);
      this.meter.connect(destination);
    } else {
      this.meter = null;
      this.clipper.connect(destination);
    }
  }

  /** The node effects and music connect to for a bus. */
  input(bus: Bus): GainNode {
    return this.bus[bus];
  }

  /** Sets a bus volume from Settings (0..1) with a short ramp. */
  setVolume(bus: Bus, v01: number): void {
    this.volume[bus] = v01;
    const target = MIX_TRIM[bus] * volumeGain(v01);
    const p = this.bus[bus].gain;
    const now = this.ctx.currentTime;
    holdParam(p, now);
    p.setTargetAtTime(target, now, 0.02);
  }

  getVolume(bus: Bus): number {
    return this.volume[bus];
  }

  /** Ducks the music bus by |db| for `ms` (A13), merging with an active duck. */
  duckMusic(db: number, ms: number): DuckState {
    const now = this.ctx.currentTime;
    const next = mergeDuck(this.duck, db, ms, now);
    this.duck = next;
    const p = this.duckGain.gain;
    const target = 10 ** (-next.depthDb / 20);
    holdParam(p, now);
    p.linearRampToValueAtTime(target, now + DUCK_ATTACK_S);
    const holdFrom = Math.max(now + DUCK_ATTACK_S, next.until);
    p.setValueAtTime(target, holdFrom);
    p.linearRampToValueAtTime(1, holdFrom + DUCK_RELEASE_S);
    return next;
  }

  /** Peak absolute sample of the last meter window (0 without a meter). */
  peak(): number {
    if (!this.meter) return 0;
    const data = new Float32Array(this.meter.fftSize);
    this.meter.getFloatTimeDomainData(data);
    let m = 0;
    for (let k = 0; k < data.length; k++) m = Math.max(m, Math.abs(data[k]!));
    return m;
  }

  dispose(): void {
    for (const n of [...Object.values(this.bus), this.duckGain, this.limiter, this.preClip, this.clipper, this.meter]) n?.disconnect();
  }
}
