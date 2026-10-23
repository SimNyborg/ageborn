/**
 * Music playback (DESIGN A13 Music): plays the cue manifest with a look-ahead scheduler, crossfades
 * between cues, keeps the adaptive layers (intensity, Overdrive with its +8 BPM, Siege heartbeat) and
 * the evolve key changes.
 *
 * Rules:
 * - `setCue` to the cue already playing does nothing. Other cues crossfade over `fadeMs`. Two battle
 *   arrangements of the same length switch on the same step, so an evolve continues the melody in the
 *   new age's instruments without a restart.
 * - Layers and the transposition carry over from a battle cue into the next battle cue (an evolve) or
 *   a stinger (the stinger plays in the key the battle ended in); any other change, and `stop()`,
 *   resets them.
 * - `transpose(semitones)` sets the total transposition (WP5 sends 2, 4, 5, 6, 7, 8, 9 after each own
 *   evolve, A17.8), applied from the next scheduled note. Drum tracks are not transposed, and lead lines
 *   drop an octave once the total passes +6 (`transposedMidi`).
 * - A throttled background tab skips the missed steps instead of playing them late.
 * - Composed file cues (`FilePlayer`) are recorded in their age's evolve key, so they ignore
 *   `transpose`; an evolve between two file loops of the same length continues at the same point of
 *   the loop. Their fallback score (while loading, or where the file cannot be decoded) follows the
 *   transposition like any score.
 * - Decoded music is large (a 96.6 s stereo loop is 37 MB of float samples at 48 kHz) and iOS counts it
 *   against the tab (2026-10-18 memory round). So only the files of the cues playing are decoded: the
 *   engine fetches the compressed files of each cue's `prefetch` cues (about 0.6 MB a loop, `prefetchFile`),
 *   decodes the next cue when told it is coming (`prepare`, `prepareNext`: the evolve's Ascension), and
 *   releases a decoded file as soon as no playing cue needs it. A cue that replaces a playing file cue waits
 *   for its own file before the crossfade (`FilePlayer` `replaces`): the old file plays on meanwhile, so a
 *   late decode moves the switch by a moment instead of dropping to the synthesized fallback. Each new
 *   player keeps the player it replaced only until its file starts (the loop position; review 2026-10-18:
 *   the chain kept every age's decoded loop of a war alive, 224 MB by Industrial).
 */
import type { MusicCueId, MusicLayer } from '@/contracts';
import { INSTRUMENTS, playNote } from './instruments';
import { holdParam } from './mixer';
import { continuesBattle, music as defaultMusic, type MusicDef, type MusicRole } from './music';
import { Sequencer, transposedMidi, type Score, type SeqTrack, type TrackLayer } from './sequencer';

export const MUSIC_LAYERS: readonly MusicLayer[] = ['intensity', 'overdrive', 'siege'];
/** How far ahead notes are scheduled, in seconds. */
export const LOOKAHEAD_S = 0.2;
/** Layer level changes glide with this time constant (seconds); intensity arrives at 4 Hz. */
const LAYER_GLIDE_S = 0.12;
/** Levels at or below this count as off: their tracks are not scheduled. */
const SILENT = 0.001;

export interface MusicState {
  layers: Record<MusicLayer, number>;
  /** Total transposition in semitones. */
  transpose: number;
}

export interface MusicEngineOptions {
  manifest?: Readonly<Record<MusicCueId, MusicDef>>;
  lookahead?: number;
  /** Loads a file cue's audio (fetch + decode). */
  loadFile?: (src: string) => Promise<AudioBuffer>;
  /** Lets go of a loaded file nothing needs any more (the loader may drop its decoded copy). */
  releaseFile?: (src: string) => void;
  /**
   * Fetches a file an upcoming cue will need without decoding it (its compressed bytes are small; decoded,
   * a loop is 37 MB). Without it the engine decodes upcoming files ahead (`loadFile`).
   */
  prefetchFile?: (src: string) => Promise<unknown>;
  /** Lets go of a fetched file no upcoming cue needs any more (its compressed bytes). */
  forgetFile?: (src: string) => void;
  /** Level of each cue's fallback score, for file cues that fall back (dB, default 0). */
  fallbackGainDb?: Readonly<Record<MusicCueId, number>>;
  warn?: (msg: string) => void;
}

interface Player {
  readonly cue: MusicCueId;
  readonly role: MusicRole;
  /** Schedules ahead; returns false once the player has finished and can be dropped. */
  update(now: number): boolean;
  setLayer(l: MusicLayer, v: number): void;
  /** Fades out over `ms` from `at` (context time; default now). */
  fadeOut(ms: number, at?: number): void;
  readonly fading: boolean;
  dispose(): void;
}

const CURVE_POINTS = 64;

/**
 * An equal-power gain ramp from `from` to `to` over [start, start + dur] (sine up, cosine down). Two
 * cues crossfading this way keep the summed power steady; a linear crossfade dips about 3 dB in the
 * middle. Falls back to a linear ramp where `setValueCurveAtTime` is missing.
 */
export function equalPowerRamp(p: AudioParam, from: number, to: number, start: number, dur: number): void {
  const withCurve = p as AudioParam & { setValueCurveAtTime?: (v: Float32Array, t: number, d: number) => AudioParam };
  if (dur <= 0 || typeof withCurve.setValueCurveAtTime !== 'function') {
    p.linearRampToValueAtTime(to, start + Math.max(0, dur));
    return;
  }
  const curve = new Float32Array(CURVE_POINTS);
  for (let k = 0; k < CURVE_POINTS; k++) {
    const x = (k / (CURVE_POINTS - 1)) * (Math.PI / 2);
    curve[k] = to >= from ? from + (to - from) * Math.sin(x) : to + (from - to) * Math.cos(x);
  }
  withCurve.setValueCurveAtTime(curve, start, dur);
}

/** Holds a gain where it is and fades it out (equal power) over `ms`; returns when it is silent. */
function fadeParamOut(p: AudioParam, now: number, ms: number): number {
  const from = p.value;
  holdParam(p, now);
  // Start the curve just after the hold point: a curve may not overlap another automation event.
  const start = now + 0.002;
  const dur = Math.max(0.003, ms / 1000);
  equalPowerRamp(p, from, 0, start, dur);
  return start + dur;
}

function fadeNode(ctx: BaseAudioContext, dest: AudioNode, gainDb: number, start: number, fadeMs: number): GainNode {
  const g = ctx.createGain();
  const target = 10 ** (gainDb / 20);
  if (fadeMs > 0) {
    g.gain.value = 0;
    equalPowerRamp(g.gain, 0, target, start, fadeMs / 1000);
  } else {
    g.gain.setValueAtTime(target, start);
  }
  g.connect(dest);
  return g;
}

/** Plays a sequenced score. */
export class SeqPlayer implements Player {
  readonly seq: Sequencer;
  private readonly fade: GainNode;
  private readonly pumpGain: GainNode | null;
  private readonly layerNodes = new Map<string, { layer: TrackLayer; node: GainNode }>();
  private readonly lookahead: number;
  private stopAt: number | null = null;
  private lastEnd = 0;

  constructor(
    readonly ctx: BaseAudioContext,
    dest: AudioNode,
    readonly cue: MusicCueId,
    readonly role: MusicRole,
    readonly score: Score,
    private readonly state: MusicState,
    o: { gainDb?: number; startTime: number; startStep?: number; fadeMs?: number; lookahead: number },
  ) {
    this.lookahead = o.lookahead;
    this.seq = new Sequencer(score, o.startTime, o.startStep ?? 0);
    this.fade = fadeNode(ctx, dest, o.gainDb ?? 0, o.startTime, o.fadeMs ?? 0);
    if (score.pump) {
      this.pumpGain = ctx.createGain();
      this.pumpGain.connect(this.fade);
    } else {
      this.pumpGain = null;
    }
  }

  get fading(): boolean {
    return this.stopAt !== null;
  }

  private level(layer: TrackLayer): number {
    return layer === 'base' ? 1 : this.state.layers[layer];
  }

  private nodeFor(t: SeqTrack): GainNode {
    const pump = t.pump === true && this.pumpGain !== null;
    const key = `${t.layer}|${pump ? 1 : 0}`;
    let entry = this.layerNodes.get(key);
    if (!entry) {
      const node = this.ctx.createGain();
      node.gain.value = this.level(t.layer);
      node.connect(pump ? (this.pumpGain as GainNode) : this.fade);
      entry = { layer: t.layer, node };
      this.layerNodes.set(key, entry);
    }
    return entry.node;
  }

  bpm(): number {
    return this.score.bpm + (this.score.overdriveBpm ?? 0) * this.state.layers.overdrive;
  }

  update(now: number): boolean {
    if (this.stopAt !== null && now >= this.stopAt) return false;
    if (this.seq.done) return now < this.lastEnd;
    const bpm = this.bpm();
    if (this.seq.nextTime < now - 0.05) this.seq.catchUp(now, bpm);
    let until = now + this.lookahead;
    if (this.stopAt !== null) until = Math.min(until, this.stopAt);
    const tracks = this.score.tracks;
    const block = this.seq.advance(until, bpm, (k) => {
      const t = tracks[k];
      return t !== undefined && this.level(t.layer) > SILENT;
    });
    for (const n of block.notes) {
      const t = tracks[n.track] as SeqTrack;
      const midi = transposedMidi(t, n.midi, this.state.transpose);
      const end = playNote(this.ctx, this.nodeFor(t), INSTRUMENTS[t.instrument], n.time, midi, n.dur, n.vel * (t.gain ?? 1));
      this.lastEnd = Math.max(this.lastEnd, end);
    }
    if (this.pumpGain && this.score.pump) {
      const g = this.pumpGain.gain;
      for (const b of block.beats) {
        g.setValueAtTime(1 - this.score.pump.depth, b.time);
        g.setTargetAtTime(1, b.time + 0.01, b.beat * 0.22);
      }
    }
    return true;
  }

  setLayer(l: MusicLayer, v: number): void {
    const now = this.ctx.currentTime;
    for (const e of this.layerNodes.values()) {
      if (e.layer !== l) continue;
      holdParam(e.node.gain, now);
      e.node.gain.setTargetAtTime(v, now, LAYER_GLIDE_S);
    }
  }

  fadeOut(ms: number, at?: number): void {
    const now = Math.max(this.ctx.currentTime, at ?? 0);
    const end = now + Math.max(0, ms) / 1000;
    if (this.stopAt !== null && this.stopAt <= end) return;
    this.stopAt = Math.max(fadeParamOut(this.fade.gain, now, Math.max(0, ms)), now + 0.005);
  }

  dispose(): void {
    this.fade.disconnect();
    this.pumpGain?.disconnect();
    for (const e of this.layerNodes.values()) e.node.disconnect();
  }
}

/**
 * The longest a cue waits for its file before it takes over from the file cue it replaces anyway (seconds):
 * the replaced cue then fades out and the new one's fallback score plays until its file is in.
 */
export const HANDOFF_MAX_S = 2;

/** How long a file cue may take to load before its synthesized fallback starts, in seconds. */
export const FALLBACK_AFTER_S = 0.35;
/** Cross-fade from the fallback score to the file once the file has loaded, in seconds. */
export const FILE_FADE_IN_S = 1.2;

type FileDef = Extract<MusicDef, { kind: 'file' }>;

interface StemSpec {
  layer: MusicLayer | null;
  src: string;
  loopStart: number;
  loopLength: number | null;
}

/** The main file of a cue at a transposition: a stinger recorded in that key if there is one. */
export function mainSrc(def: FileDef, transpose = 0): string {
  const keyed = def.keys && Object.hasOwn(def.keys, transpose) ? def.keys[transpose] : undefined;
  return keyed ?? def.src;
}

/** Every file a cue needs: the main file first (in the key of `transpose`), then its layer stems. */
export function fileStems(def: MusicDef, transpose = 0): StemSpec[] {
  if (def.kind !== 'file') return [];
  const main: StemSpec = { layer: null, src: mainSrc(def, transpose), loopStart: def.loopStart ?? 0, loopLength: def.loopLength ?? null };
  const stems = Object.entries(def.layers ?? {}).map(([layer, s]): StemSpec => {
    const spec = typeof s === 'string' ? { src: s } : (s as { src: string; loopStart?: number; loopLength?: number });
    return { layer: layer as MusicLayer, src: spec.src, loopStart: spec.loopStart ?? 0, loopLength: spec.loopLength ?? null };
  });
  return [main, ...stems];
}

function mod(x: number, m: number): number {
  return ((x % m) + m) % m;
}

/**
 * Plays a composed file cue with optional layer stems (the manifest's `{ kind: 'file' }`).
 *
 * - Loops play their loop window (`loopStart`, `loopLength`); stems loop their own window, aligned
 *   to the main loop's position, so the layers stay on the beat.
 * - `phaseAt` (from the cue being replaced) starts the file at the same point in the loop, so an
 *   evolve continues the melody in the next age's arrangement. It is let go of once the file starts, so
 *   a player never keeps the one before it (and its decoded loop) alive.
 * - `replaces` (a file cue playing its file): this cue stays silent and the old one plays on until this
 *   file is in; then the old one fades out over `fadeMs` as this one fades in, on the same moment. Past
 *   `HANDOFF_MAX_S`, or when this file cannot be decoded, the old one fades out anyway and the fallback
 *   takes over.
 * - While the file loads (after `FALLBACK_AFTER_S`) or if it cannot be decoded, the `fallback` score
 *   plays; once the file is ready it fades in over `FILE_FADE_IN_S` and the score fades out.
 */
export class FilePlayer implements Player {
  private readonly fade: GainNode;
  private readonly fileGain: GainNode;
  private sources: AudioBufferSourceNode[] = [];
  private readonly layerGains = new Map<MusicLayer, GainNode>();
  private stopAt: number | null = null;
  private ended = false;
  private disposed = false;
  private fallback: SeqPlayer | null = null;
  private readonly createdAt: number;
  private loaded = false;
  private loadFailed = false;
  private startedAt: number | null = null;
  private startPos = 0;
  /** The loop position to start from (the replaced cue's), until the file starts. */
  private phaseFrom: ((t: number) => number) | null;
  /** The playing file cue this one takes over from once its file is in (null: none, or done). */
  private replaces: Player | null;
  readonly loopLength: number | null;
  /** The transposition the cue started in (picks the stinger's key). */
  readonly transpose: number;
  /** The options the player uses later (never the replaced cue or its phase: `phaseFrom` and `replaces` let go of those). */
  private readonly o: { fadeMs: number; lookahead: number; fallbackGainDb?: number };

  constructor(
    readonly ctx: BaseAudioContext,
    dest: AudioNode,
    readonly cue: MusicCueId,
    readonly role: MusicRole,
    private readonly def: FileDef,
    private readonly state: MusicState,
    load: (src: string) => Promise<AudioBuffer>,
    o: { fadeMs: number; lookahead: number; phaseAt?: (t: number) => number; fallbackGainDb?: number; replaces?: Player | null },
  ) {
    // review 2 N-a: kept whole as a field, the options still held the replaced player (and through its `phaseAt`
    // closure the one before it), a chain of disposed players for the session
    const { phaseAt, replaces, ...keep } = o;
    this.o = keep;
    this.createdAt = ctx.currentTime;
    this.transpose = state.transpose;
    this.phaseFrom = phaseAt ?? null;
    this.replaces = replaces ?? null;
    // a cue that takes over from a playing file fades in when its own file is in (`takeOver`)
    this.fade = this.replaces ? fadeNode(ctx, dest, -Infinity, ctx.currentTime, 0) : fadeNode(ctx, dest, def.gainDb ?? 0, ctx.currentTime, o.fadeMs);
    this.fileGain = ctx.createGain();
    this.fileGain.connect(this.fade);
    const stems = fileStems(def, state.transpose);
    this.loopLength = def.loopLength ?? null;
    void Promise.all(stems.map((s) => load(s.src))).then(
      (buffers) => this.begin(stems, buffers),
      () => {
        this.loadFailed = true;
        if (!this.def.fallback) this.ended = true;
      },
    );
  }

  /** True while this cue waits for its file to take over from the one it replaces. */
  get handingOff(): boolean {
    return this.replaces !== null;
  }

  /**
   * Takes over from the replaced cue at `at`: it fades out over `fadeMs` while this one fades in over the
   * same time (equal power, as every crossfade here).
   */
  private takeOver(at: number): void {
    const old = this.replaces;
    if (!old) return;
    this.replaces = null;
    const g = this.fade.gain;
    const target = 10 ** ((this.def.gainDb ?? 0) / 20);
    const ms = Math.max(0, this.o.fadeMs);
    holdParam(g, at);
    if (ms > 0) equalPowerRamp(g, 0, target, at + 0.002, ms / 1000);
    else g.setValueAtTime(target, at);
    if (!old.fading) old.fadeOut(ms, at);
  }

  get fading(): boolean {
    return this.stopAt !== null;
  }

  /** What is playing: the file, the fallback score, or nothing yet. */
  get source(): 'file' | 'fallback' | 'loading' {
    return this.startedAt !== null ? 'file' : this.fallback ? 'fallback' : 'loading';
  }

  /** Position inside the loop at time `t` (seconds), once the file plays; null otherwise. */
  phaseAt(t: number): number | null {
    if (this.startedAt === null || this.loopLength === null) return null;
    return mod(this.startPos + (t - this.startedAt), this.loopLength);
  }

  private begin(stems: StemSpec[], buffers: AudioBuffer[]): void {
    if (this.disposed || this.stopAt !== null) return;
    this.loaded = true;
    const ctx = this.ctx;
    const at = ctx.currentTime + 0.03;
    const phase = this.loopLength !== null && this.phaseFrom ? mod(this.phaseFrom(at), this.loopLength) : 0;
    // the replaced cue (and with it its decoded loop) is not needed any more
    this.phaseFrom = null;
    this.takeOver(at);
    if (this.fallback) {
      const g = this.fileGain.gain;
      g.value = 0;
      equalPowerRamp(g, 0, 1, at, FILE_FADE_IN_S);
      this.fallback.fadeOut(FILE_FADE_IN_S * 1000);
    }
    buffers.forEach((buffer, k) => {
      const stem = stems[k];
      if (!stem) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      let offset = 0;
      if (this.role !== 'stinger') {
        src.loop = true;
        if (stem.loopLength !== null) {
          src.loopStart = stem.loopStart;
          src.loopEnd = stem.loopStart + stem.loopLength;
          offset = stem.loopStart + mod(phase, stem.loopLength);
        }
      }
      let out: AudioNode = this.fileGain;
      if (stem.layer) {
        const g = ctx.createGain();
        g.gain.value = this.state.layers[stem.layer];
        g.connect(this.fileGain);
        this.layerGains.set(stem.layer, g);
        out = g;
      }
      src.connect(out);
      if (k === 0) src.onended = () => (this.ended = true);
      src.start(at, offset);
      this.sources.push(src);
    });
    this.startedAt = at;
    this.startPos = phase;
  }

  private startFallback(now: number): void {
    const score = this.def.fallback;
    if (!score || this.fallback || this.stopAt !== null) return;
    const trim = (this.o.fallbackGainDb ?? 0) - (this.def.gainDb ?? 0);
    this.fallback = new SeqPlayer(this.ctx, this.fade, this.cue, this.role, score, this.state, { startTime: now + 0.05, fadeMs: 250, lookahead: this.o.lookahead, gainDb: trim });
  }

  update(now: number): boolean {
    if (this.stopAt !== null && now >= this.stopAt) return false;
    // the file is late (or failed): the replaced cue fades out now and the fallback takes over
    if (this.replaces && !this.loaded && (this.loadFailed || now - this.createdAt >= HANDOFF_MAX_S)) this.takeOver(now + 0.01);
    if (!this.replaces && !this.loaded && !this.fallback && this.def.fallback && (this.loadFailed || now - this.createdAt >= FALLBACK_AFTER_S)) this.startFallback(now);
    if (this.fallback) {
      const alive = this.fallback.update(now);
      if (!alive && !this.loaded) return false;
    }
    if (this.ended && this.replaces) this.takeOver(now + 0.01);
    return !this.ended;
  }

  setLayer(l: MusicLayer, v: number): void {
    this.fallback?.setLayer(l, v);
    const g = this.layerGains.get(l);
    if (!g) return;
    const now = this.ctx.currentTime;
    holdParam(g.gain, now);
    g.gain.setTargetAtTime(v, now, LAYER_GLIDE_S);
  }

  fadeOut(ms: number, at?: number): void {
    const now = Math.max(this.ctx.currentTime, at ?? 0);
    // faded before it took over: it never played, and the cue it was to replace is faded by the engine
    this.replaces = null;
    this.phaseFrom = null;
    this.stopAt = fadeParamOut(this.fade.gain, now, Math.max(5, ms));
    for (const s of this.sources) s.stop(this.stopAt + 0.05);
    this.fallback?.fadeOut(ms, at);
  }

  dispose(): void {
    this.disposed = true;
    this.replaces = null;
    this.phaseFrom = null;
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
      s.disconnect();
    }
    // the decoded buffers go with the sources (nothing may keep a disposed player's loop alive)
    this.sources = [];
    this.fallback?.dispose();
    this.fade.disconnect();
    this.fileGain.disconnect();
    for (const g of this.layerGains.values()) g.disconnect();
  }
}

export class MusicEngine {
  /** The cue currently playing (null when stopped or after a stinger ends). */
  cue: MusicCueId | null = null;
  readonly state: MusicState = { layers: { intensity: 0, overdrive: 0, siege: 0 }, transpose: 0 };
  private lastRole: MusicRole | null = null;
  private players: Player[] = [];
  private readonly manifest: Readonly<Record<MusicCueId, MusicDef>>;
  private readonly lookahead: number;
  private readonly warned = new Set<string>();
  /** Files decoded for the cues playing or prepared (see `manageFiles`). */
  private readonly requested = new Set<string>();
  /** Files fetched (not decoded) for the upcoming cues (see `manageFiles`). */
  private readonly fetched = new Set<string>();
  /** A cue decoded ahead because it is about to play (`prepare`), with the key it was decoded in. */
  private prepared: { cue: MusicCueId; transpose: number } | null = null;
  /** The manifest entry of the cue last set (to refresh the prefetch when the key changes). */
  private lastDef: MusicDef | null = null;

  constructor(
    readonly ctx: BaseAudioContext,
    readonly out: AudioNode,
    private readonly o: MusicEngineOptions = {},
  ) {
    this.manifest = o.manifest ?? defaultMusic;
    this.lookahead = o.lookahead ?? LOOKAHEAD_S;
  }

  /** True while something is playing or fading (the scheduler can idle otherwise). */
  get active(): boolean {
    return this.players.length > 0;
  }

  /** What is playing, for tests and the soundboard: cue, fading, and for scores the step and tempo. */
  get playing(): { cue: MusicCueId; fading: boolean; step?: number; nextTime?: number; bpm?: number; source?: 'file' | 'fallback' | 'loading'; phase?: number | null }[] {
    return this.players.map((p) =>
      p instanceof SeqPlayer
        ? { cue: p.cue, fading: p.fading, step: p.seq.step, nextTime: p.seq.nextTime, bpm: p.bpm() }
        : p instanceof FilePlayer
          ? { cue: p.cue, fading: p.fading, source: p.source, phase: p.phaseAt(this.ctx.currentTime) }
          : { cue: p.cue, fading: p.fading },
    );
  }

  /** The player of the current cue, if any. */
  private current(): Player | undefined {
    const p = this.players[this.players.length - 1];
    return p && !p.fading && p.cue === this.cue ? p : undefined;
  }

  setCue(cue: MusicCueId, fadeMs = 600): boolean {
    const def = Object.hasOwn(this.manifest, cue) ? this.manifest[cue] : undefined;
    if (!def) {
      this.warnOnce(`Unknown music cue "${cue}"`);
      return false;
    }
    const old = this.current();
    if (old && old.cue === cue) return true;

    if (!continuesBattle(this.lastRole, def.role)) this.resetBattleState();
    const now = this.ctx.currentTime;
    const fade = Math.max(0, fadeMs);
    let startTime = now + 0.05;
    let startStep = 0;
    if (def.kind === 'seq' && def.role === 'battle' && old instanceof SeqPlayer && old.role === 'battle' && old.score.lengthSteps === def.score.lengthSteps) {
      startTime = old.seq.nextTime;
      startStep = old.seq.step;
    }
    // a file cue replacing a file cue that plays its file takes over once its own file is in (the old one
    // plays on meanwhile; `FilePlayer` `replaces`); everything else fades out now
    const handoff = def.kind === 'file' && old instanceof FilePlayer && old.source === 'file' && !old.handingOff ? old : null;
    for (const p of this.players) if (!p.fading && p !== handoff) p.fadeOut(fade);

    let phaseAt: ((t: number) => number) | undefined;
    if (def.kind === 'file' && def.role === 'battle' && old instanceof FilePlayer && old.role === 'battle' && old.loopLength !== null && def.loopLength !== undefined && Math.abs(old.loopLength - def.loopLength) < 1e-3) {
      // An evolve: carry on at the same point of the loop in the new arrangement.
      phaseAt = (t) => old.phaseAt(t) ?? 0;
    }
    let player: Player;
    if (def.kind === 'seq') {
      player = new SeqPlayer(this.ctx, this.out, cue, def.role, def.score, this.state, {
        startTime,
        startStep,
        fadeMs: fade,
        lookahead: this.lookahead,
        ...(def.gainDb !== undefined ? { gainDb: def.gainDb } : {}),
      });
    } else {
      const load = this.o.loadFile;
      if (!load) {
        this.warnOnce(`No file loader for music cue "${cue}"`);
        return false;
      }
      const fallbackGainDb = this.o.fallbackGainDb?.[cue];
      player = new FilePlayer(this.ctx, this.out, cue, def.role, def, this.state, load, {
        fadeMs: fade,
        lookahead: this.lookahead,
        ...(phaseAt ? { phaseAt } : {}),
        ...(fallbackGainDb !== undefined ? { fallbackGainDb } : {}),
        ...(handoff ? { replaces: handoff } : {}),
      });
    }
    this.players.push(player);
    this.cue = cue;
    this.lastRole = def.role;
    this.lastDef = def;
    // what was prepared is playing now (or not wanted any more)
    this.prepared = null;
    this.manageFiles(def);
    this.update();
    return true;
  }

  /**
   * Decodes a cue's files ahead, in the key now (a cue about to play: the next age's loop when an evolve's
   * Ascension starts), so it starts on time with its file. They stay decoded until a cue is set.
   */
  prepare(cue: MusicCueId): void {
    const def = Object.hasOwn(this.manifest, cue) ? this.manifest[cue] : undefined;
    const load = this.o.loadFile;
    if (!def || def.kind !== 'file' || !load) return;
    this.prepared = { cue, transpose: this.state.transpose };
    for (const s of fileStems(def, this.state.transpose)) {
      if (this.requested.has(s.src)) continue;
      this.requested.add(s.src);
      void load(s.src).catch(() => undefined);
    }
  }

  /** Decodes the next battle cue of the one playing (its first `prefetch` battle cue: the next age). */
  prepareNext(): void {
    const def = this.cue !== null ? this.manifest[this.cue] : undefined;
    if (!def || def.kind !== 'file' || def.role !== 'battle') return;
    const next = (def.prefetch ?? []).find((c) => this.manifest[c]?.role === 'battle');
    if (next) this.prepare(next);
  }

  /**
   * Keeps decoded the files of the cues playing (fading ones too) and of a prepared cue, fetches (or, without
   * `prefetchFile`, decodes) the files of the cues the current one names as coming (`prefetch`), and lets go
   * of everything else: a decoded loop goes as soon as no playing cue needs it.
   */
  private manageFiles(def: MusicDef | null): void {
    const load = this.o.loadFile;
    if (!load) return;
    const decoded = new Set<string>();
    const key = this.state.transpose;
    if (def && this.cue !== null) for (const s of fileStems(def, key)) decoded.add(s.src);
    for (const p of this.players) {
      const d = this.manifest[p.cue];
      if (d) for (const s of fileStems(d, p instanceof FilePlayer ? p.transpose : key)) decoded.add(s.src);
    }
    if (this.prepared) {
      const d = this.manifest[this.prepared.cue];
      if (d) for (const s of fileStems(d, this.prepared.transpose)) decoded.add(s.src);
    }
    const upcoming = new Set<string>();
    if (def && def.kind === 'file' && this.cue !== null) {
      for (const next of def.prefetch ?? []) {
        const d = Object.hasOwn(this.manifest, next) ? this.manifest[next] : undefined;
        if (d) for (const s of fileStems(d, key)) if (!decoded.has(s.src)) upcoming.add(s.src);
      }
    }
    const fetch = this.o.prefetchFile;
    for (const src of upcoming) {
      if (fetch) {
        if (!this.fetched.has(src)) void fetch(src).catch(() => undefined);
        this.fetched.add(src);
      } else {
        // no separate fetch: the upcoming files are decoded ahead
        if (!this.requested.has(src)) void load(src).catch(() => undefined);
        decoded.add(src);
      }
    }
    for (const s of decoded) this.requested.add(s);
    for (const src of [...this.requested]) {
      if (decoded.has(src)) continue;
      this.requested.delete(src);
      this.o.releaseFile?.(src);
    }
    for (const src of [...this.fetched]) {
      if (upcoming.has(src)) continue;
      this.fetched.delete(src);
      // a file decoded meanwhile keeps its bytes with its decoded copy until that goes
      if (!this.requested.has(src)) this.o.forgetFile?.(src);
    }
  }

  setLayer(l: MusicLayer, v01: number): void {
    const v = Number.isFinite(v01) ? Math.min(1, Math.max(0, v01)) : 0;
    this.state.layers[l] = v;
    for (const p of this.players) p.setLayer(l, v);
  }

  /**
   * Sets the total transposition in semitones (A13 key changes). Scores follow it from the next note;
   * file cues are recorded per key, so this also prefetches the stingers in the new key.
   */
  transpose(semitones: number): void {
    const t = Number.isFinite(semitones) ? Math.round(semitones) : 0;
    if (t === this.state.transpose) return;
    this.state.transpose = t;
    if (this.lastDef && this.cue !== null) this.manageFiles(this.lastDef);
  }

  /** Fades everything out. It also ends the battle context: the next cue starts in the home key. */
  stop(fadeMs = 600): void {
    for (const p of this.players) if (!p.fading) p.fadeOut(fadeMs);
    this.cue = null;
    this.lastRole = null;
    this.prepared = null;
  }

  /** Schedules ahead for every player and drops finished ones (and their decoded files). Call every ~25 ms. */
  update(): void {
    const now = this.ctx.currentTime;
    const keep: Player[] = [];
    let dropped = false;
    for (const p of this.players) {
      if (p.update(now)) keep.push(p);
      else {
        p.dispose();
        dropped = true;
        if (p.cue === this.cue && !p.fading) this.cue = null;
      }
    }
    this.players = keep;
    // a cue that faded out lets go of its decoded files now, not at the next cue
    if (dropped) this.manageFiles(this.cue !== null ? this.lastDef : null);
  }

  dispose(): void {
    for (const p of this.players) p.dispose();
    this.players = [];
    this.cue = null;
    this.prepared = null;
    this.manageFiles(null);
  }

  private resetBattleState(): void {
    this.state.transpose = 0;
    for (const l of MUSIC_LAYERS) this.setLayer(l, 0);
  }

  private warnOnce(msg: string): void {
    if (this.warned.has(msg)) return;
    this.warned.add(msg);
    (this.o.warn ?? ((m: string) => console.warn(`[audio] ${m}`)))(msg);
  }
}
