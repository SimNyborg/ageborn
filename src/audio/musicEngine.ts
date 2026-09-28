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

/** Plays a composed file cue with optional layer stems (the manifest's `{ kind: 'file' }`). */
class FilePlayer implements Player {
  private readonly fade: GainNode;
  private readonly sources: AudioBufferSourceNode[] = [];
  private readonly layerGains = new Map<MusicLayer, GainNode>();
  private stopAt: number | null = null;
  private ended = false;
  private disposed = false;

  constructor(
    readonly ctx: BaseAudioContext,
    dest: AudioNode,
    readonly cue: MusicCueId,
    readonly role: MusicRole,
    def: Extract<MusicDef, { kind: 'file' }>,
    state: MusicState,
    load: (src: string) => Promise<AudioBuffer>,
    o: { fadeMs: number },
  ) {
    this.fade = fadeNode(ctx, dest, def.gainDb ?? 0, ctx.currentTime, o.fadeMs);
    const stems = [{ layer: null as MusicLayer | null, src: def.src }, ...Object.entries(def.layers ?? {}).map(([layer, src]) => ({ layer: layer as MusicLayer, src: src as string }))];
    void Promise.all(stems.map((s) => load(s.src))).then(
      (buffers) => {
        if (this.disposed || this.stopAt !== null) return;
        const at = ctx.currentTime + 0.05;
        buffers.forEach((buffer, k) => {
          const stem = stems[k];
          if (!stem) return;
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.loop = role !== 'stinger';
          let out: AudioNode = this.fade;
          if (stem.layer) {
            const g = ctx.createGain();
            g.gain.value = state.layers[stem.layer];
            g.connect(this.fade);
            this.layerGains.set(stem.layer, g);
            out = g;
          }
          src.connect(out);
          if (k === 0) src.onended = () => (this.ended = true);
          src.start(at);
          this.sources.push(src);
        });
      },
      () => {
        this.ended = true;
      },
    );
  }

  get fading(): boolean {
    return this.stopAt !== null;
  }

  update(now: number): boolean {
    if (this.stopAt !== null && now >= this.stopAt) return false;
    return !this.ended;
  }

  setLayer(l: MusicLayer, v: number): void {
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
    this.fade.disconnect();
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
  get playing(): { cue: MusicCueId; fading: boolean; step?: number; nextTime?: number; bpm?: number }[] {
    return this.players.map((p) =>
      p instanceof SeqPlayer ? { cue: p.cue, fading: p.fading, step: p.seq.step, nextTime: p.seq.nextTime, bpm: p.bpm() } : { cue: p.cue, fading: p.fading },
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
      player = new FilePlayer(this.ctx, this.out, cue, def.role, def, this.state, load, { fadeMs: fade });
    }
    this.players.push(player);
    this.cue = cue;
    this.lastRole = def.role;
    this.update();
    return true;
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
