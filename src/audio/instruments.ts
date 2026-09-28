/**
 * Synthesised instruments for the music sequencer (DESIGN A13 Music: "oscillators, noise, simple
 * envelopes and filters"). Each instrument is data; `playNote` builds a few Web Audio nodes per note.
 */

export type InstrumentId =
  // Stone
  | 'flute'
  | 'hideDrum'
  | 'tom'
  | 'shaker'
  | 'drone'
  // Medieval
  | 'lute'
  | 'horn'
  | 'tabor'
  // Gunpowder
  | 'fife'
  | 'snare'
  | 'bassDrum'
  | 'tuba'
  // Modern
  | 'brass'
  | 'brassStab'
  | 'synthBass'
  | 'kick'
  | 'hat'
  // Future
  | 'lead'
  | 'arp'
  | 'pad'
  | 'clap'
  // Bronze (A17.12)
  | 'lyre'
  | 'frameDrum'
  | 'reedPipe'
  // Industrial (A17.12)
  | 'cornet'
  | 'anvil'
  | 'piston'
  // Cosmic (A17.12)
  | 'choir'
  | 'subPulse'
  // Menu, capsule room, stingers and layers
  | 'softFlute'
  | 'bell'
  | 'sub'
  | 'timpani'
  | 'heartbeat';

export interface OscSpec {
  type: OscillatorType;
  /** Detune in cents. */
  detune?: number;
  /** Octave offset. */
  octave?: number;
  gain?: number;
  /** Frequency ratio instead of an octave (for inharmonic bell partials). */
  ratio?: number;
  /** This partial's own decay time in seconds (bells). */
  decay?: number;
}

export interface Instrument {
  /** Tone oscillators; empty for pure noise drums. */
  osc: OscSpec[];
  /** A noise layer (breath, snare wires, hats). */
  noise?: { gain: number; type: BiquadFilterType; freq: number; q?: number; decay?: number };
  /** Envelope in seconds; `s` is the sustain level (0..1). */
  env: { a: number; d: number; s: number; r: number };
  /** Filter on the tone; `env` Hz are added at the attack peak and decay away with `d`. */
  filter?: { type: BiquadFilterType; freq: number; q?: number; env?: number };
  vibrato?: { rate: number; cents: number; delay: number };
  /** Drums: pitch starts at `from` × the note and falls to it over `time` seconds. */
  drop?: { from: number; time: number };
  /** Drums: a fixed frequency instead of the note's. */
  fixedHz?: number;
  gain: number;
  /** Longest a note sounds in seconds (drums ignore the note length). */
  maxLen?: number;
}

export const INSTRUMENTS: Readonly<Record<InstrumentId, Instrument>> = {
  // Breathy square flute: a soft square with a band of noise for the breath and a late vibrato.
  flute: {
    osc: [{ type: 'square', gain: 0.6 }, { type: 'sine', gain: 0.5 }],
    noise: { gain: 0.12, type: 'bandpass', freq: 2200, q: 1.2 },
    env: { a: 0.04, d: 0.2, s: 0.75, r: 0.12 },
    filter: { type: 'lowpass', freq: 1700, q: 0.7, env: 600 },
    vibrato: { rate: 5.2, cents: 14, delay: 0.18 },
    gain: 0.2,
  },
  hideDrum: { osc: [{ type: 'sine' }], env: { a: 0.002, d: 0.28, s: 0, r: 0.05 }, drop: { from: 2.2, time: 0.09 }, fixedHz: 62, gain: 0.55, maxLen: 0.35 },
  tom: { osc: [{ type: 'sine' }, { type: 'triangle', gain: 0.3 }], env: { a: 0.002, d: 0.2, s: 0, r: 0.05 }, drop: { from: 1.6, time: 0.08 }, fixedHz: 120, gain: 0.35, maxLen: 0.3 },
  shaker: { osc: [], noise: { gain: 1, type: 'highpass', freq: 6000, q: 0.7 }, env: { a: 0.01, d: 0.05, s: 0, r: 0.02 }, gain: 0.12, maxLen: 0.08 },
  drone: { osc: [{ type: 'triangle' }, { type: 'sine', octave: -1, gain: 0.6 }], env: { a: 0.4, d: 0.5, s: 0.8, r: 0.6 }, filter: { type: 'lowpass', freq: 500 }, gain: 0.16 },

  // Plucked lute: a bright saw through a closing filter, no sustain.
  lute: {
    osc: [{ type: 'sawtooth', gain: 0.6 }, { type: 'triangle', gain: 0.6, detune: 4 }],
    env: { a: 0.003, d: 0.45, s: 0, r: 0.1 },
    filter: { type: 'lowpass', freq: 900, q: 1.5, env: 2600 },
    gain: 0.16,
    maxLen: 0.6,
  },
  horn: {
    osc: [{ type: 'sawtooth', gain: 0.7 }, { type: 'sawtooth', detune: -6, gain: 0.5 }],
    env: { a: 0.06, d: 0.25, s: 0.7, r: 0.15 },
    filter: { type: 'lowpass', freq: 1100, q: 0.8, env: 700 },
    vibrato: { rate: 4.5, cents: 8, delay: 0.25 },
    gain: 0.16,
  },
  tabor: {
    osc: [{ type: 'sine' }],
    noise: { gain: 0.5, type: 'bandpass', freq: 900, q: 0.8, decay: 0.08 },
    env: { a: 0.002, d: 0.14, s: 0, r: 0.04 },
    drop: { from: 1.4, time: 0.04 },
    fixedHz: 180,
    gain: 0.3,
    maxLen: 0.2,
  },

  fife: {
    osc: [{ type: 'triangle', gain: 0.7 }, { type: 'square', gain: 0.25 }],
    noise: { gain: 0.06, type: 'bandpass', freq: 4000, q: 1 },
    env: { a: 0.02, d: 0.15, s: 0.7, r: 0.08 },
    filter: { type: 'lowpass', freq: 4200, q: 0.7 },
    vibrato: { rate: 6, cents: 12, delay: 0.12 },
    gain: 0.15,
  },
  snare: {
    osc: [{ type: 'triangle' }],
    noise: { gain: 1, type: 'bandpass', freq: 2200, q: 0.7, decay: 0.16 },
    env: { a: 0.001, d: 0.1, s: 0, r: 0.05 },
    drop: { from: 1.5, time: 0.03 },
    fixedHz: 190,
    gain: 0.26,
    maxLen: 0.22,
  },
  bassDrum: { osc: [{ type: 'sine' }], env: { a: 0.002, d: 0.3, s: 0, r: 0.05 }, drop: { from: 2, time: 0.07 }, fixedHz: 55, gain: 0.55, maxLen: 0.4 },
  tuba: {
    osc: [{ type: 'sawtooth', gain: 0.6 }, { type: 'sine', gain: 0.8 }],
    env: { a: 0.03, d: 0.2, s: 0.6, r: 0.08 },
    filter: { type: 'lowpass', freq: 600, q: 0.9, env: 300 },
    gain: 0.22,
  },

  brass: {
    osc: [{ type: 'sawtooth', detune: -7, gain: 0.6 }, { type: 'sawtooth', detune: 7, gain: 0.6 }],
    env: { a: 0.03, d: 0.2, s: 0.75, r: 0.12 },
    filter: { type: 'lowpass', freq: 1400, q: 1, env: 1600 },
    vibrato: { rate: 5, cents: 6, delay: 0.3 },
    gain: 0.15,
  },
  brassStab: {
    osc: [{ type: 'sawtooth', detune: -9, gain: 0.6 }, { type: 'sawtooth', detune: 9, gain: 0.6 }],
    env: { a: 0.01, d: 0.16, s: 0.2, r: 0.08 },
    filter: { type: 'lowpass', freq: 900, q: 1.2, env: 2800 },
    gain: 0.1,
    maxLen: 0.3,
  },
  synthBass: {
    osc: [{ type: 'sawtooth', gain: 0.6 }, { type: 'square', octave: -1, gain: 0.4 }],
    env: { a: 0.005, d: 0.18, s: 0.5, r: 0.06 },
    filter: { type: 'lowpass', freq: 420, q: 4, env: 900 },
    gain: 0.22,
  },
  kick: { osc: [{ type: 'sine' }], env: { a: 0.001, d: 0.22, s: 0, r: 0.04 }, drop: { from: 3, time: 0.05 }, fixedHz: 50, gain: 0.6, maxLen: 0.3 },
  hat: { osc: [], noise: { gain: 1, type: 'highpass', freq: 7500, q: 0.8 }, env: { a: 0.001, d: 0.035, s: 0, r: 0.02 }, gain: 0.1, maxLen: 0.06 },

  lead: {
    osc: [{ type: 'sawtooth', detune: -8, gain: 0.5 }, { type: 'square', detune: 8, gain: 0.35 }],
    env: { a: 0.01, d: 0.2, s: 0.7, r: 0.12 },
    filter: { type: 'lowpass', freq: 2400, q: 2, env: 1800 },
    vibrato: { rate: 5.5, cents: 10, delay: 0.2 },
    gain: 0.13,
  },
  arp: {
    osc: [{ type: 'square', gain: 0.5 }, { type: 'sawtooth', detune: 5, gain: 0.3 }],
    env: { a: 0.003, d: 0.1, s: 0.1, r: 0.05 },
    filter: { type: 'lowpass', freq: 1800, q: 3, env: 2200 },
    gain: 0.08,
    maxLen: 0.2,
  },
  pad: {
    osc: [{ type: 'sawtooth', detune: -10, gain: 0.5 }, { type: 'sawtooth', detune: 10, gain: 0.5 }, { type: 'triangle', octave: -1, gain: 0.4 }],
    env: { a: 0.35, d: 0.6, s: 0.7, r: 0.7 },
    filter: { type: 'lowpass', freq: 1100, q: 0.7 },
    gain: 0.06,
  },
  clap: { osc: [], noise: { gain: 1, type: 'bandpass', freq: 1500, q: 0.9, decay: 0.12 }, env: { a: 0.002, d: 0.12, s: 0, r: 0.04 }, gain: 0.22, maxLen: 0.18 },

  // Bronze (A17.12): plucked lyre, frame drum, reed pipe (square with vibrato).
  // Plucked lyre: a triangle and a soft square through a closing filter, a gut-string ring.
  lyre: {
    osc: [{ type: 'triangle', gain: 0.8 }, { type: 'square', gain: 0.18, detune: 3 }, { type: 'sine', octave: 1, gain: 0.12, decay: 0.2 }],
    env: { a: 0.002, d: 0.7, s: 0, r: 0.15 },
    filter: { type: 'lowpass', freq: 1400, q: 1.2, env: 2400 },
    gain: 0.2,
    maxLen: 0.9,
  },
  // Frame drum: a low skin thump with a slap of noise.
  frameDrum: {
    osc: [{ type: 'sine' }, { type: 'triangle', gain: 0.25 }],
    noise: { gain: 0.45, type: 'bandpass', freq: 700, q: 0.8, decay: 0.07 },
    env: { a: 0.002, d: 0.24, s: 0, r: 0.05 },
    drop: { from: 1.7, time: 0.06 },
    fixedHz: 88,
    gain: 0.45,
    maxLen: 0.32,
  },
  // Reed pipe: a narrow square with a nasal band-pass and a wide, early vibrato.
  reedPipe: {
    osc: [{ type: 'square', gain: 0.55 }, { type: 'sawtooth', gain: 0.2, detune: -4 }],
    noise: { gain: 0.05, type: 'bandpass', freq: 2600, q: 1.4 },
    env: { a: 0.03, d: 0.2, s: 0.75, r: 0.1 },
    filter: { type: 'bandpass', freq: 1300, q: 0.9, env: 500 },
    vibrato: { rate: 5.8, cents: 18, delay: 0.1 },
    gain: 0.19,
  },

  // Industrial (A17.12): brass band (tuba bass, cornet lead), anvil and piston percussion.
  cornet: {
    osc: [{ type: 'sawtooth', gain: 0.6 }, { type: 'square', detune: 5, gain: 0.3 }],
    env: { a: 0.025, d: 0.18, s: 0.75, r: 0.1 },
    filter: { type: 'lowpass', freq: 1700, q: 1.1, env: 1500 },
    vibrato: { rate: 5.4, cents: 9, delay: 0.25 },
    gain: 0.14,
  },
  // Anvil: a struck bar with inharmonic partials.
  anvil: {
    osc: [{ type: 'triangle', gain: 0.6 }, { type: 'sine', ratio: 2.4, gain: 0.35, decay: 0.2 }, { type: 'sine', ratio: 3.9, gain: 0.2, decay: 0.1 }],
    noise: { gain: 0.3, type: 'highpass', freq: 3000, decay: 0.03 },
    env: { a: 0.001, d: 0.35, s: 0, r: 0.1 },
    fixedHz: 1180,
    gain: 0.09,
    maxLen: 0.45,
  },
  // Piston: a short steam chuff.
  piston: { osc: [], noise: { gain: 1, type: 'bandpass', freq: 1100, q: 0.6, decay: 0.07 }, env: { a: 0.004, d: 0.08, s: 0, r: 0.03 }, gain: 0.16, maxLen: 0.12 },

  // Cosmic (A17.12): choir pad (formant-filtered saw), deep sub pulse, bell arpeggios.
  choir: {
    osc: [{ type: 'sawtooth', detune: -8, gain: 0.5 }, { type: 'sawtooth', detune: 8, gain: 0.5 }, { type: 'triangle', gain: 0.4 }],
    env: { a: 0.25, d: 0.5, s: 0.8, r: 0.6 },
    filter: { type: 'bandpass', freq: 850, q: 1.6 },
    vibrato: { rate: 4.8, cents: 12, delay: 0.3 },
    gain: 0.13,
  },
  subPulse: {
    osc: [{ type: 'sine' }, { type: 'triangle', octave: 1, gain: 0.15 }],
    env: { a: 0.01, d: 0.25, s: 0.35, r: 0.1 },
    filter: { type: 'lowpass', freq: 240 },
    gain: 0.3,
  },

  softFlute: {
    osc: [{ type: 'triangle', gain: 0.8 }, { type: 'sine', octave: 1, gain: 0.15 }],
    noise: { gain: 0.05, type: 'bandpass', freq: 2000, q: 1 },
    env: { a: 0.08, d: 0.3, s: 0.7, r: 0.3 },
    filter: { type: 'lowpass', freq: 2200 },
    vibrato: { rate: 4.6, cents: 10, delay: 0.3 },
    gain: 0.16,
  },
  // Music-box bell: a sine with inharmonic partials that die faster.
  bell: {
    osc: [{ type: 'sine', gain: 0.7 }, { type: 'sine', ratio: 2.76, gain: 0.25, decay: 0.35 }, { type: 'sine', ratio: 5.4, gain: 0.1, decay: 0.15 }],
    env: { a: 0.002, d: 1.1, s: 0, r: 0.3 },
    gain: 0.12,
    maxLen: 1.4,
  },
  sub: { osc: [{ type: 'sine' }], env: { a: 0.02, d: 0.3, s: 0.8, r: 0.15 }, gain: 0.26 },
  timpani: {
    osc: [{ type: 'sine' }, { type: 'triangle', gain: 0.3 }],
    noise: { gain: 0.25, type: 'lowpass', freq: 400, decay: 0.1 },
    env: { a: 0.003, d: 0.6, s: 0, r: 0.2 },
    drop: { from: 1.15, time: 0.05 },
    gain: 0.4,
    maxLen: 0.9,
  },
  // Siege heartbeat: a low, muffled thump.
  heartbeat: { osc: [{ type: 'sine' }], env: { a: 0.004, d: 0.22, s: 0, r: 0.05 }, drop: { from: 1.8, time: 0.06 }, filter: { type: 'lowpass', freq: 180 }, gain: 0.6, maxLen: 0.3 },
};

/** Frequency in Hz of a MIDI note. */
export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** One second of white noise per context, shared by every noise layer. */
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, b);
  }
  return b;
}

/**
 * Schedules one note. `when` and `len` are in seconds; `vel` is 0..1. Returns the time the note's
 * nodes stop.
 */
export function playNote(ctx: BaseAudioContext, out: AudioNode, inst: Instrument, when: number, midi: number, len: number, vel: number): number {
  const noteLen = Math.max(0.01, Math.min(len, inst.maxLen ?? len));
  const { a, d, s, r } = inst.env;
  const peak = inst.gain * Math.max(0, Math.min(1, vel));
  const end = when + noteLen;
  const stopAt = end + r + 0.05;
  const hz = inst.fixedHz ?? midiToHz(midi);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, when);
  amp.gain.linearRampToValueAtTime(peak, when + a);
  if (d > 0) amp.gain.setTargetAtTime(peak * s, when + a, d / 3);
  amp.gain.setTargetAtTime(0, Math.max(end, when + a), Math.max(0.005, r / 3));
  amp.connect(out);

  let toneIn: AudioNode = amp;
  if (inst.filter) {
    const f = ctx.createBiquadFilter();
    f.type = inst.filter.type;
    f.Q.value = inst.filter.q ?? 0.7;
    const base = inst.filter.freq;
    f.frequency.setValueAtTime(base + (inst.filter.env ?? 0), when);
    if (inst.filter.env) f.frequency.setTargetAtTime(base, when + a, Math.max(0.01, d / 2));
    f.connect(amp);
    toneIn = f;
  }

  let vibrato: GainNode | null = null;
  if (inst.vibrato && noteLen > inst.vibrato.delay) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = inst.vibrato.rate;
    vibrato = ctx.createGain();
    vibrato.gain.setValueAtTime(0, when);
    vibrato.gain.setValueAtTime(0, when + inst.vibrato.delay);
    vibrato.gain.linearRampToValueAtTime(inst.vibrato.cents, when + inst.vibrato.delay + 0.2);
    lfo.connect(vibrato);
    lfo.start(when);
    lfo.stop(stopAt);
  }

  let lastSource: AudioScheduledSourceNode | null = null;
  for (const o of inst.osc) {
    const osc = ctx.createOscillator();
    lastSource = osc;
    osc.type = o.type;
    const f0 = hz * (o.ratio ?? 2 ** (o.octave ?? 0));
    if (inst.drop) {
      osc.frequency.setValueAtTime(f0 * inst.drop.from, when);
      osc.frequency.exponentialRampToValueAtTime(f0, when + inst.drop.time);
    } else {
      osc.frequency.setValueAtTime(f0, when);
    }
    if (o.detune) osc.detune.value = o.detune;
    if (vibrato) vibrato.connect(osc.detune);
    const g = ctx.createGain();
    const level = o.gain ?? 1;
    g.gain.setValueAtTime(level, when);
    if (o.decay) g.gain.setTargetAtTime(0, when, o.decay / 3);
    osc.connect(g);
    g.connect(toneIn);
    osc.start(when);
    osc.stop(stopAt);
  }

  if (inst.noise) {
    const n = inst.noise;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = n.type;
    f.frequency.value = n.freq;
    f.Q.value = n.q ?? 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(n.gain, when);
    if (n.decay) g.gain.setTargetAtTime(0, when, n.decay / 3);
    src.connect(f);
    f.connect(g);
    // The noise layer skips the tone filter, so breath and snare wires keep their own colour.
    g.connect(amp);
    src.start(when, Math.random() * 0.9);
    src.stop(stopAt);
    lastSource = src;
  }

  // Release the note's graph once its sources have stopped.
  if (lastSource) lastSource.onended = () => amp.disconnect();
  return stopAt;
}
