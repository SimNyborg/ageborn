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
 * - `transpose(semitones)` sets the total transposition (WP5 sends 2, 4, 5, 6 after each own evolve),
 *   applied from the next scheduled note. Drum tracks are not transposed.
 * - A throttled background tab skips the missed steps instead of playing them late.
 * - Composed file cues (`FilePlayer`) are recorded in their age's evolve key, so they ignore
 *   `transpose`; an evolve between two file loops of the same length continues at the same point of
 *   the loop. Their fallback score (while loading, or where the file cannot be decoded) follows the
 *   transposition like any score. The engine prefetches each cue's `prefetch` files and releases
 *   files that neither the playing cues nor the upcoming ones need.
 */
import type { MusicCueId, MusicLayer } from '@/contracts';
import { INSTRUMENTS, playNote } from './instruments';
import { holdParam } from './mixer';
import { continuesBattle, music as defaultMusic, type MusicDef, type MusicRole } from './music';
import { Sequencer, type Score, type SeqTrack, type TrackLayer } from './sequencer';

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
  fadeOut(ms: number): void;
  readonly fading: boolean;
  dispose(): void;
}

function fadeNode(ctx: BaseAudioContext, dest: AudioNode, gainDb: number, start: number, fadeMs: number): GainNode {
  const g = ctx.createGain();
  const target = 10 ** (gainDb / 20);
  if (fadeMs > 0) {
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(target, start + fadeMs / 1000);
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
      const midi = n.midi + (t.pitched === false ? 0 : this.state.transpose);
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

  fadeOut(ms: number): void {
    const now = this.ctx.currentTime;
    const end = now + Math.max(0, ms) / 1000;
    if (this.stopAt !== null && this.stopAt <= end) return;
    holdParam(this.fade.gain, now);
    this.fade.gain.linearRampToValueAtTime(0, Math.max(end, now + 0.005));
    this.stopAt = Math.max(end, now + 0.005);
  }

  dispose(): void {
    this.fade.disconnect();
    this.pumpGain?.disconnect();
    for (const e of this.layerNodes.values()) e.node.disconnect();
  }
}

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

/** Every file a cue needs: the main file first, then its layer stems. */
export function fileStems(def: MusicDef): StemSpec[] {
  if (def.kind !== 'file') return [];
  const main: StemSpec = { layer: null, src: def.src, loopStart: def.loopStart ?? 0, loopLength: def.loopLength ?? null };
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
 *   evolve continues the melody in the next age's arrangement.
 * - While the file loads (after `FALLBACK_AFTER_S`) or if it cannot be decoded, the `fallback` score
 *   plays; once the file is ready it fades in over `FILE_FADE_IN_S` and the score fades out.
 */
export class FilePlayer implements Player {
  private readonly fade: GainNode;
  private readonly fileGain: GainNode;
  private readonly sources: AudioBufferSourceNode[] = [];
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
  readonly loopLength: number | null;

  constructor(
    readonly ctx: BaseAudioContext,
    dest: AudioNode,
    readonly cue: MusicCueId,
    readonly role: MusicRole,
    private readonly def: FileDef,
    private readonly state: MusicState,
    load: (src: string) => Promise<AudioBuffer>,
    private readonly o: { fadeMs: number; lookahead: number; phaseAt?: (t: number) => number; fallbackGainDb?: number },
  ) {
    this.createdAt = ctx.currentTime;
    this.fade = fadeNode(ctx, dest, def.gainDb ?? 0, ctx.currentTime, o.fadeMs);
    this.fileGain = ctx.createGain();
    this.fileGain.connect(this.fade);
    const stems = fileStems(def);
    this.loopLength = def.loopLength ?? null;
    void Promise.all(stems.map((s) => load(s.src))).then(
      (buffers) => this.begin(stems, buffers),
      () => {
        this.loadFailed = true;
        if (!this.def.fallback) this.ended = true;
      },
    );
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
    const phase = this.loopLength !== null && this.o.phaseAt ? mod(this.o.phaseAt(at), this.loopLength) : 0;
    if (this.fallback) {
      const g = this.fileGain.gain;
      g.setValueAtTime(0, at);
      g.linearRampToValueAtTime(1, at + FILE_FADE_IN_S);
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
    if (!this.loaded && !this.fallback && this.def.fallback && (this.loadFailed || now - this.createdAt >= FALLBACK_AFTER_S)) this.startFallback(now);
    if (this.fallback) {
      const alive = this.fallback.update(now);
      if (!alive && !this.loaded) return false;
    }
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

  fadeOut(ms: number): void {
    const now = this.ctx.currentTime;
    holdParam(this.fade.gain, now);
    this.stopAt = now + Math.max(0.005, ms / 1000);
    this.fade.gain.linearRampToValueAtTime(0, this.stopAt);
    for (const s of this.sources) s.stop(this.stopAt + 0.05);
    this.fallback?.fadeOut(ms);
  }

  dispose(): void {
    this.disposed = true;
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
      s.disconnect();
    }
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
  /** Files loaded for current or upcoming cues (see `manageFiles`). */
  private readonly requested = new Set<string>();

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
    for (const p of this.players) if (!p.fading) p.fadeOut(fade);

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
      });
    }
    this.players.push(player);
    this.cue = cue;
    this.lastRole = def.role;
    this.manageFiles(def);
    this.update();
    return true;
  }

  /**
   * Starts loading the files the next cues will need (`prefetch`) and lets go of files no cue needs
   * any more, so only the current and the next arrangements stay decoded.
   */
  private manageFiles(def: MusicDef): void {
    const load = this.o.loadFile;
    if (!load) return;
    const keep = new Set<string>();
    for (const s of fileStems(def)) keep.add(s.src);
    for (const p of this.players) {
      const d = this.manifest[p.cue];
      if (d) for (const s of fileStems(d)) keep.add(s.src);
    }
    if (def.kind === 'file') {
      for (const next of def.prefetch ?? []) {
        const d = Object.hasOwn(this.manifest, next) ? this.manifest[next] : undefined;
        if (!d) continue;
        for (const s of fileStems(d)) {
          keep.add(s.src);
          if (!this.requested.has(s.src)) void load(s.src).catch(() => undefined);
        }
      }
    }
    for (const s of keep) this.requested.add(s);
    for (const src of [...this.requested]) {
      if (keep.has(src)) continue;
      this.requested.delete(src);
      this.o.releaseFile?.(src);
    }
  }

  setLayer(l: MusicLayer, v01: number): void {
    const v = Number.isFinite(v01) ? Math.min(1, Math.max(0, v01)) : 0;
    this.state.layers[l] = v;
    for (const p of this.players) p.setLayer(l, v);
  }

  /** Sets the total transposition in semitones (A13 key changes). */
  transpose(semitones: number): void {
    this.state.transpose = Number.isFinite(semitones) ? Math.round(semitones) : 0;
  }

  /** Fades everything out. It also ends the battle context: the next cue starts in the home key. */
  stop(fadeMs = 600): void {
    for (const p of this.players) if (!p.fading) p.fadeOut(fadeMs);
    this.cue = null;
    this.lastRole = null;
  }

  /** Schedules ahead for every player and drops finished ones. Call every ~25 ms. */
  update(): void {
    const now = this.ctx.currentTime;
    const keep: Player[] = [];
    for (const p of this.players) {
      if (p.update(now)) keep.push(p);
      else {
        p.dispose();
        if (p.cue === this.cue && !p.fading) this.cue = null;
      }
    }
    this.players = keep;
  }

  dispose(): void {
    for (const p of this.players) p.dispose();
    this.players = [];
    this.cue = null;
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
