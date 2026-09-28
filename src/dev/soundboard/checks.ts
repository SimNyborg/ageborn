/**
 * Offline checks for the soundboard (C2/WP6 DoD): every sound id and music cue is rendered through the
 * real mixer chain in an OfflineAudioContext and measured, and the limiter is tested with 40
 * simultaneous hits. Offline rendering needs no user gesture, so these also run headless.
 */
import { Mixer, MIX_TRIM, MusicEngine, SoundBank, sounds, type SoundDef } from '@/audio';
import { music } from '@/audio';
import type { MusicCueId, SoundId } from '@/contracts';

export interface Level {
  peak: number;
  rms: number;
}

export interface SoundCheck extends Level {
  id: SoundId;
  variants: number;
  seconds: number;
  ok: boolean;
}

export interface CueCheck extends Level {
  cue: MusicCueId;
  seconds: number;
  ok: boolean;
}

export interface LimiterCheck {
  hits: number;
  /** Peak of the same 40 voices summed with no limiter (what would reach the DAC). */
  rawPeak: number;
  /** Peak after the master limiter and safety clipper. */
  limitedPeak: number;
  ok: boolean;
}

const RATE = 44100;
/** Below this RMS a render counts as silent. */
const SILENT_RMS = 0.002;

function measure(data: Float32Array, from = 0, to = data.length): Level {
  let peak = 0;
  let sum = 0;
  for (let k = from; k < to; k++) {
    const x = data[k]!;
    const a = Math.abs(x);
    if (a > peak) peak = a;
    sum += x * x;
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, to - from)) };
}

function mixDown(buffer: AudioBuffer): Float32Array {
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let k = 0; k < d.length; k++) out[k] = Math.abs(d[k]!) > Math.abs(out[k]!) ? d[k]! : out[k]!;
  }
  return out;
}

function toBuffer(ctx: BaseAudioContext, samples: Float32Array, rate: number): AudioBuffer {
  const b = ctx.createBuffer(1, Math.max(1, samples.length), rate);
  b.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
  return b;
}

/**
 * Plays every variant of every sound, one after another, through the mixer chain and measures each
 * sound's slot. A sound passes when it is audible and never reaches full scale.
 */
export async function checkSounds(bank: SoundBank = new SoundBank()): Promise<SoundCheck[]> {
  const ids = Object.keys(sounds);
  const slots: { id: SoundId; start: number; end: number; variants: number; seconds: number }[] = [];
  const rendered = ids.map((id) => ({ id, def: sounds[id] as SoundDef, r: bank.get(id) }));
  let t = 0.05;
  for (const { id, r } of rendered) {
    if (!r) continue;
    const start = t;
    let longest = 0;
    for (const v of r.variants) {
      const len = v.length / r.sampleRate;
      longest = Math.max(longest, len);
      t += len + 0.05;
    }
    slots.push({ id, start, end: t, variants: r.variants.length, seconds: longest });
    t += 0.1;
  }
  const ctx = new OfflineAudioContext(2, Math.ceil((t + 0.5) * RATE), RATE);
  const mixer = new Mixer(ctx);
  for (const { id, def, r } of rendered) {
    const slot = slots.find((s) => s.id === id);
    if (!r || !slot) continue;
    let at = slot.start;
    for (const v of r.variants) {
      const src = ctx.createBufferSource();
      src.buffer = toBuffer(ctx, v, r.sampleRate);
      src.connect(mixer.input(def.bus));
      src.start(at);
      at += v.length / r.sampleRate + 0.05;
    }
  }
  const data = mixDown(await ctx.startRendering());
  return slots.map((s) => {
    const level = measure(data, Math.floor(s.start * RATE), Math.min(data.length, Math.ceil(s.end * RATE)));
    return { id: s.id, variants: s.variants, seconds: s.seconds, ...level, ok: level.rms > SILENT_RMS / 4 && level.peak < 1 };
  });
}

/**
 * Renders a few seconds of every music cue through the music engine and mixer, with every adaptive
 * layer up, and measures it. A cue passes when it is audible and never reaches full scale.
 */
export async function checkCues(seconds = 4): Promise<CueCheck[]> {
  const out: CueCheck[] = [];
  for (const cue of Object.keys(music)) {
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
    const mixer = new Mixer(ctx);
    // Schedule the whole window at once: offline time does not move before rendering.
    const engine = new MusicEngine(ctx, mixer.input('music'), { lookahead: seconds });
    engine.setCue(cue, 0);
    engine.setLayer('intensity', 1);
    engine.setLayer('overdrive', 1);
    engine.setLayer('siege', 1);
    engine.update();
    const level = measure(mixDown(await ctx.startRendering()));
    out.push({ cue, seconds, ...level, ok: level.rms > SILENT_RMS && level.peak < 1 });
    engine.dispose();
  }
  return out;
}

const HIT_IDS = ['hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser', 'hit_heavy', 'hit_effective', 'explosion_s'];

/**
 * The DoD stress case, worst case: 40 hits start on the same sample with no voice limits, each at its
 * loudest variant and +3 dB (the top of the random volume spread). Rendered once straight into the
 * output (raw) and once through the master chain.
 */
export async function checkLimiter(hits = 40, bank: SoundBank = new SoundBank()): Promise<LimiterCheck> {
  const voices = HIT_IDS.map((id) => {
    const r = bank.get(id);
    if (!r) throw new Error(`missing ${id}`);
    const loudest = r.variants.reduce((a, b) => (measure(b).peak > measure(a).peak ? b : a));
    return { samples: loudest, rate: r.sampleRate };
  });
  const render = async (limited: boolean): Promise<number> => {
    const ctx = new OfflineAudioContext(2, RATE * 2, RATE);
    let input: AudioNode;
    if (limited) {
      input = new Mixer(ctx).input('sfx');
    } else {
      const g = ctx.createGain();
      g.gain.value = MIX_TRIM.sfx * MIX_TRIM.master;
      g.connect(ctx.destination);
      input = g;
    }
    for (let k = 0; k < hits; k++) {
      const v = voices[k % voices.length]!;
      const src = ctx.createBufferSource();
      src.buffer = toBuffer(ctx, v.samples, v.rate);
      const gain = ctx.createGain();
      gain.gain.value = 10 ** (3 / 20);
      src.connect(gain);
      gain.connect(input);
      src.start(0.1);
    }
    return measure(mixDown(await ctx.startRendering())).peak;
  };
  const rawPeak = await render(false);
  const limitedPeak = await render(true);
  return { hits, rawPeak, limitedPeak, ok: limitedPeak < 1 };
}

/** Linear level to dBFS for display. */
export function dbfs(v: number): string {
  return v <= 0 ? '-inf' : `${(20 * Math.log10(v)).toFixed(1)} dBFS`;
}
