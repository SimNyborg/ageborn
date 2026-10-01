/**
 * `WebAudioService`, the real `AudioService` (DESIGN B7, A13, B15 `audio.ts`).
 *
 * - Sound effects play from pre-rendered files (`files.ts`, made by `tools/audio`): one Ogg Opus
 *   sprite sheet per sound group, fetched after unlock (UI and shared battle sounds first, the age
 *   and capsule sheets when the music says they are coming, or on first use).
 * - The ZzFX definitions (`sounds.ts`, `bank.ts`) are the fallback while a sheet loads and on
 *   browsers that cannot decode it: `prerender()` renders the boot groups before the first gesture
 *   (< 300 ms, B16); a sound that is not rendered yet renders on first use; `renderLazily()` renders
 *   the rest in idle time only when there are no files (or they failed).
 * - Music plays the composed files (`fileMusic`) with the sequenced scores as their fallback.
 * - The AudioContext is created and resumed by `unlock()` on the first user gesture (iOS). When that
 *   attempt does not start it (the event carried no user activation, such as a touch `pointerdown`),
 *   every following gesture retries until it runs (`unlock.ts`). Effects played before that are
 *   dropped (nobody could hear them); the music cue, layers, transposition and bus volumes are
 *   remembered and applied on unlock.
 * - `play` goes through the voice policy (`voices.ts`): 4 voices per id, an absolute 40 ms retrigger
 *   gap, a global cap, priority for the caps (higher wins; pass a higher `priority` for sounds the
 *   player caused), a random variant, pitch ±8% and volume ±3 dB. `pitchBp` scales the rate (10000 =
 *   as is), `volumeDb` adds gain and `pan` (-1..1) places the sound. Non-finite numbers fall back to
 *   the defaults instead of throwing inside the caller's frame.
 * - `music.duck(db, ms)` lowers the music bus by |db| for `ms` (A13: 6 dB during powers, evolves and
 *   walkouts); `music.transpose(semitones)` sets the total key change (see `musicEngine.ts`).
 */
import type { AudioService, Bus, MusicCueId, MusicLayer, SoundId } from '@/contracts';
import { SoundBank, type RenderStats } from './bank';
import { assetUrl, sfxFiles as defaultSfxFiles, SfxFileBank, sourceOrder, type Clip, type SfxFiles, type SheetState } from './files';
import { Mixer } from './mixer';
import { continuesBattle, fileMusic, music as seqMusic, type MusicDef } from './music';
import { MUSIC_LAYERS, MusicEngine } from './musicEngine';
import {
  BOOT_GROUPS,
  DEFAULT_GAP_MS,
  DEFAULT_MAX_VOICES,
  DEFAULT_PITCH_VAR_BP,
  DEFAULT_VOL_VAR_DB,
  SOUND_GROUPS,
  sounds as defaultSounds,
  type SoundDef,
  type SoundGroup,
} from './sounds';
import { createAudioContext, isRunning, keepAlive, unlockContext } from './unlock';
import { dbToGain, DEFAULT_MAX_TOTAL_VOICES, pickVariant, rollVariation, UI_PRIORITY_BONUS, VoicePolicy } from './voices';

export type PlayOptions = Parameters<AudioService['play']>[1];

export interface WebAudioServiceOptions {
  /** The ZzFX manifest (the fallback, and the mix settings of every id). */
  sounds?: Readonly<Record<SoundId, SoundDef>>;
  /** Pre-rendered effect sheets (default: the generated ones; null plays ZzFX only). */
  sfxFiles?: SfxFiles | null;
  /** Music manifest (default: the composed files with their scores as fallback). */
  music?: Readonly<Record<MusicCueId, MusicDef>>;
  /** Creates the AudioContext on unlock (default: the browser's AudioContext). */
  createContext?: () => AudioContext | null;
  /** Random source for variants and variation (default Math.random). */
  random?: () => number;
  /** 'interval' runs the music scheduler on a timer; 'manual' leaves `tick()` to the caller (tests). */
  scheduler?: 'interval' | 'manual';
  /** Global cap on simultaneous effect voices. */
  maxVoices?: number;
  /** Render rate for effects (default 32 kHz, see bank.ts). */
  sampleRate?: number;
  /** Adds a peak meter after the limiter (dev soundboard). */
  meter?: boolean;
  /** Where gestures are heard to resume after an interruption (default document). */
  gestureTarget?: EventTarget | null;
  /** Loads a file sound or cue (default fetch + decodeAudioData). */
  fetchFile?: (src: string) => Promise<ArrayBuffer>;
  warn?: (msg: string) => void;
}

interface VoiceHandle {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

/** Sheets to load for a music cue: the age now playing and the next one (DESIGN B7 lazy loading). */
const SHEETS_FOR_CUE: Readonly<Record<MusicCueId, readonly string[]>> = {
  // The eight ages in match order (A17.8): each cue fetches its age and the next one.
  'music.stone': ['stone', 'bronze', 'match'],
  'music.bronze': ['bronze', 'medieval', 'match'],
  'music.medieval': ['medieval', 'gunpowder', 'match'],
  'music.gunpowder': ['gunpowder', 'industrial', 'match'],
  'music.industrial': ['industrial', 'modern', 'match'],
  'music.modern': ['modern', 'future', 'match'],
  'music.future': ['future', 'cosmic', 'match'],
  'music.cosmic': ['cosmic', 'match'],
  'music.capsule': ['capsule'],
};
/** Sheets loaded right after unlock, in order (every match opens in Stone and moves to Bronze). */
const BOOT_SHEETS: readonly string[] = ['ui', 'battle', 'stone', 'bronze', 'match'];

export interface ServiceStats {
  started: number;
  dropped: { gap: number; idCap: number; totalCap: number; locked: number; unknown: number; loading: number };
  stolen: number;
  voices: number;
}

const SCHEDULER_MS = 25;
/** Crossfade and fade-out time when the caller gives none. */
const DEFAULT_FADE_MS = 600;

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** `x` when it is a finite number, else `fallback`. */
function finite(x: number | undefined, fallback: number): number {
  return x !== undefined && Number.isFinite(x) ? x : fallback;
}

export class WebAudioService implements AudioService {
  readonly bank: SoundBank;
  /** The pre-rendered effect sheets (null when the service plays ZzFX only). */
  readonly files: SfxFileBank | null;
  ctx: AudioContext | null = null;
  mixer: Mixer | null = null;
  engine: MusicEngine | null = null;
  readonly stats: ServiceStats = { started: 0, dropped: { gap: 0, idCap: 0, totalCap: 0, locked: 0, unknown: 0, loading: 0 }, stolen: 0, voices: 0 };

  private readonly soundDefs: Readonly<Record<SoundId, SoundDef>>;
  private readonly musicDefs: Readonly<Record<MusicCueId, MusicDef>>;
  private readonly random: () => number;
  private readonly voices: VoicePolicy<VoiceHandle>;
  private readonly buffers = new Map<SoundId, AudioBuffer[]>();
  private readonly fileLoads = new Map<string, Promise<AudioBuffer>>();
  private readonly lastVariant = new Map<SoundId, number>();
  private readonly volumes: Record<Bus, number> = { master: 1, music: 1, sfx: 1, ui: 1 };
  private readonly warned = new Set<string>();
  /** Music requests made before the context exists. */
  private pendingCue: { cue: MusicCueId; fadeMs: number } | null = null;
  private readonly pendingLayers: Record<MusicLayer, number> = { intensity: 0, overdrive: 0, siege: 0 };
  private pendingTranspose = 0;
  private unlocking: Promise<void> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopKeepAlive: (() => void) | null = null;
  private lazyStarted = false;
  /** renderLazily() was asked for while files were expected; it runs if they fail. */
  private lazyWanted: ((task: () => void) => void) | null | undefined = undefined;

  constructor(private readonly o: WebAudioServiceOptions = {}) {
    this.soundDefs = o.sounds ?? defaultSounds;
    this.musicDefs = o.music ?? fileMusic;
    this.random = o.random ?? Math.random;
    this.voices = new VoicePolicy<VoiceHandle>(o.maxVoices ?? DEFAULT_MAX_TOTAL_VOICES);
    this.bank = new SoundBank(this.soundDefs, o.sampleRate !== undefined ? { sampleRate: o.sampleRate } : {});
    const files = o.sfxFiles === undefined ? defaultSfxFiles : o.sfxFiles;
    this.files = files
      ? new SfxFileBank(files, (src) => this.loadFile(src), (msg) => {
          this.warnOnce(msg);
          // Files are out: render the ZzFX fallback ahead of use after all.
          if (this.lazyWanted !== undefined) this.renderLazily(this.lazyWanted ?? undefined);
        })
      : null;
  }

  /** Per sheet: idle, loading, ready or failed (dev soundboard). */
  sheetStates(): Record<string, SheetState> {
    const out: Record<string, SheetState> = {};
    if (this.files) for (const s of this.files.sheets()) out[s] = this.files.sheetState(s);
    return out;
  }

  /** Loads effect sheets in order, one after the other (after unlock). */
  private loadSheets(sheets: readonly string[]): void {
    const files = this.files;
    if (!files || files.failed || !this.ctx) return;
    const next = (k: number): void => {
      const s = sheets[k];
      if (s === undefined || files.failed) return;
      void files.loadSheet(s).then(() => next(k + 1));
    };
    next(0);
  }

  /** 'locked' before the first gesture, then the context's state. */
  get state(): 'locked' | AudioContextState {
    return this.ctx ? this.ctx.state : 'locked';
  }

  // ------------------------------------------------------------------------------------------------
  // Pre-rendering

  /** True while the recorded sheets are in use (the ZzFX renders are only their fallback). */
  get usesFiles(): boolean {
    return this.files !== null && !this.files.failed;
  }

  /** Renders sound groups now (default: the boot groups, B7). Returns what it did and how long it took. */
  prerender(groups: readonly SoundGroup[] = BOOT_GROUPS): RenderStats {
    return this.bank.renderGroups(groups);
  }

  /**
   * Renders every remaining sound one at a time when the browser is idle (B7 "the rest render
   * lazily"). `idle` defaults to requestIdleCallback, or a 0 ms timeout.
   */
  renderLazily(idle?: (task: () => void) => void): void {
    if (this.files && !this.files.failed) {
      // The files replace the ZzFX renders; keep the request in case they fail.
      this.lazyWanted = idle ?? null;
      return;
    }
    if (this.lazyStarted) return;
    this.lazyStarted = true;
    const schedule = idle ?? defaultIdle;
    const queue = this.bank.pending(SOUND_GROUPS);
    const next = (): void => {
      const t0 = defaultNow();
      // A few sounds per slice, never much more than a frame's worth of work.
      while (queue.length > 0 && defaultNow() - t0 < 8) {
        const id = queue.shift() as SoundId;
        if (this.bank.isRendered(id) || this.buffers.has(id)) continue;
        this.bank.renderIds([id]);
        if (this.ctx) this.buffersFor(id);
      }
      if (queue.length > 0) schedule(next);
    };
    schedule(next);
  }

  // ------------------------------------------------------------------------------------------------
  // Unlock

  unlock(): Promise<void> {
    if (!this.ctx) {
      const ctx = (this.o.createContext ?? createAudioContext)();
      if (!ctx) return Promise.resolve();
      this.ctx = ctx;
      this.setUpGraph(ctx);
    }
    const ctx = this.ctx;
    if (isRunning(ctx)) return Promise.resolve();
    if (!this.unlocking) {
      this.unlocking = unlockContext(ctx).finally(() => {
        this.unlocking = null;
      });
    }
    return this.unlocking;
  }

  private setUpGraph(ctx: AudioContext): void {
    this.mixer = new Mixer(ctx, { meter: this.o.meter === true });
    for (const bus of Object.keys(this.volumes) as Bus[]) this.mixer.setVolume(bus, this.volumes[bus]);
    const fallbackGainDb: Record<MusicCueId, number> = {};
    for (const [cue, d] of Object.entries(seqMusic)) fallbackGainDb[cue] = d.gainDb ?? 0;
    this.engine = new MusicEngine(ctx, this.mixer.input('music'), {
      manifest: this.musicDefs,
      loadFile: (src) => this.loadFile(src),
      releaseFile: (src) => this.fileLoads.delete(src),
      fallbackGainDb,
      ...(this.o.warn ? { warn: this.o.warn } : {}),
    });
    for (const l of MUSIC_LAYERS) this.engine.setLayer(l, this.pendingLayers[l]);
    this.engine.transpose(this.pendingTranspose);
    if (this.pendingCue) {
      const { cue, fadeMs } = this.pendingCue;
      this.pendingCue = null;
      // The cue was asked for before audio could start: begin it now, with the layers it had.
      this.engine.setCue(cue, fadeMs);
      for (const l of MUSIC_LAYERS) this.engine.setLayer(l, this.pendingLayers[l]);
      this.engine.transpose(this.pendingTranspose);
    }
    this.loadSheets(BOOT_SHEETS);
    const cue = this.engine.cue;
    if (cue) this.loadSheets(SHEETS_FOR_CUE[cue] ?? []);
    const doc = typeof document !== 'undefined' ? document : null;
    this.stopKeepAlive = keepAlive(ctx, this.o.gestureTarget !== undefined ? this.o.gestureTarget : doc, doc);
    if (this.o.scheduler !== 'manual') this.timer = setInterval(() => this.tick(), SCHEDULER_MS);
  }

  /** Runs the music scheduler once (the interval does this every 25 ms). */
  tick(): void {
    if (this.engine && this.ctx && isRunning(this.ctx)) this.engine.update();
  }

  // ------------------------------------------------------------------------------------------------
  // Effects

  play(id: SoundId, o?: PlayOptions): void {
    const def = Object.hasOwn(this.soundDefs, id) ? this.soundDefs[id] : undefined;
    if (!def) {
      this.stats.dropped.unknown++;
      this.warnOnce(`Unknown sound id "${id}"`);
      return;
    }
    const ctx = this.ctx;
    const mixer = this.mixer;
    if (!ctx || !mixer || !isRunning(ctx)) {
      this.stats.dropped.locked++;
      return;
    }
    const found = this.clipsFor(id);
    if (!found || found.clips.length === 0) {
      this.stats.dropped.loading++;
      return;
    }
    const clips = found.clips;
    const now = ctx.currentTime;
    const priority = (o?.priority ?? 0) + (def.bus === 'ui' ? UI_PRIORITY_BONUS : 0);
    const verdict = this.voices.admit(id, priority, now, { maxVoices: def.maxVoices ?? DEFAULT_MAX_VOICES, gapMs: def.gapMs ?? DEFAULT_GAP_MS });
    if (!verdict.ok) {
      this.stats.dropped[verdict.reason]++;
      return;
    }
    for (const v of verdict.steal) {
      this.stopVoice(v.handle, now);
      this.voices.ended(v.handle);
      this.stats.stolen++;
    }

    const k = pickVariant(this.random, clips.length, this.lastVariant.get(id));
    this.lastVariant.set(id, k);
    const clip = clips[k] as Clip;
    const vary = rollVariation(this.random, def.pitchVarBp ?? DEFAULT_PITCH_VAR_BP, def.volVarDb ?? DEFAULT_VOL_VAR_DB);
    // A non-finite option would make the AudioParam setters throw inside the caller's frame.
    const rate = Math.max(0.25, Math.min(4, vary.rate * (finite(o?.pitchBp, 10000) / 10000)));
    // Files are mastered to their level; the manifest trim belongs to the ZzFX designs.
    const gainDb = (found.file ? 0 : (def.gainDb ?? 0)) + vary.gainDb + finite(o?.volumeDb, 0);

    const src = ctx.createBufferSource();
    src.buffer = clip.buffer;
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = dbToGain(gainDb);
    src.connect(gain);
    let last: AudioNode = gain;
    const pan = finite(o?.pan, 0);
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(p);
      last = p;
    }
    last.connect(mixer.input(def.bus));
    const handle: VoiceHandle = { src, gain };
    src.onended = () => {
      this.voices.ended(handle);
      last.disconnect();
      gain.disconnect();
    };
    startClip(src, now, clip);
    this.voices.started({ id, priority, start: now, end: now + clip.duration / rate, handle });
    this.stats.started++;
    this.stats.voices = this.voices.count(now);
  }

  /**
   * Dev and soundboard: plays one exact variant with no variation and no voice limits. Returns false
   * while audio is locked or the sound is not available.
   */
  preview(id: SoundId, variant: number, o?: { source?: 'file' | 'zzfx' }): boolean {
    const def = Object.hasOwn(this.soundDefs, id) ? this.soundDefs[id] : undefined;
    const ctx = this.ctx;
    const mixer = this.mixer;
    if (!def || !ctx || !mixer || !isRunning(ctx)) return false;
    const found = this.clipsFor(id, o?.source);
    const clip = found?.clips[Math.max(0, Math.min(found.clips.length - 1, variant))];
    if (!found || !clip) return false;
    const src = ctx.createBufferSource();
    src.buffer = clip.buffer;
    const gain = ctx.createGain();
    gain.gain.value = dbToGain(found.file ? 0 : (def.gainDb ?? 0));
    src.connect(gain);
    gain.connect(mixer.input(def.bus));
    src.onended = () => gain.disconnect();
    startClip(src, ctx.currentTime, clip);
    return true;
  }

  /** How many variants a sound has in the file sheets (or its ZzFX definition). */
  variantCount(id: SoundId): number {
    const e = this.files?.files.entries[id];
    if (e) return e.variants.length;
    const d = this.soundDefs[id];
    return d && d.kind !== 'file' ? d.variants.length : 1;
  }

  /**
   * The clips to play for a sound: the file sheet's when it is decoded (asking for it otherwise),
   * else the ZzFX fallback. `source` forces one of the two (soundboard comparisons).
   */
  private clipsFor(id: SoundId, source?: 'file' | 'zzfx'): { clips: Clip[]; file: boolean } | undefined {
    const files = this.files;
    if (files && !files.failed && files.has(id) && source !== 'zzfx') {
      const clips = files.clips(id);
      if (clips) {
        // The fallback is not needed any more.
        this.buffers.delete(id);
        return { clips, file: true };
      }
      files.request(id);
    }
    if (source === 'file') return undefined;
    const buffers = this.buffersFor(id);
    return buffers ? { clips: buffers.map((buffer) => ({ buffer, offset: 0, duration: buffer.duration })), file: false } : undefined;
  }

  /** Fades a voice out over a few ms (no click) and stops it. */
  private stopVoice(h: VoiceHandle, now: number): void {
    try {
      h.gain.gain.setTargetAtTime(0, now, 0.005);
      h.src.stop(now + 0.03);
    } catch {
      // already stopped
    }
  }

  /** The AudioBuffers of a sound, creating them (and rendering if needed) on first use. */
  private buffersFor(id: SoundId): AudioBuffer[] | undefined {
    const ready = this.buffers.get(id);
    if (ready) return ready;
    const ctx = this.ctx;
    const def = this.soundDefs[id];
    if (!ctx || !def) return undefined;
    if (def.kind === 'file') {
      void this.loadFile(def.src).then(
        (b) => this.buffers.set(id, [b]),
        () => this.warnOnce(`Could not load sound file "${def.src}" for "${id}"`),
      );
      return undefined;
    }
    const rendered = this.bank.get(id);
    if (!rendered) return undefined;
    const list = rendered.variants.map((samples) => {
      const b = ctx.createBuffer(1, Math.max(1, samples.length), rendered.sampleRate);
      b.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
      return b;
    });
    this.buffers.set(id, list);
    // The AudioBuffers hold the samples now; keep only one copy.
    this.bank.forget(id);
    return list;
  }

  private loadFile(src: string): Promise<AudioBuffer> {
    const ctx = this.ctx;
    if (!ctx) return Promise.reject(new Error('audio is locked'));
    let p = this.fileLoads.get(src);
    if (!p) {
      const fetchFile = this.o.fetchFile ?? defaultFetch;
      // The Ogg Opus file, then its AAC copy (AAC first where Opus is not supported).
      const order = sourceOrder(src);
      const attempt = (k: number): Promise<AudioBuffer> => {
        const s = order[k] as string;
        const next = fetchFile(s).then((data) => ctx.decodeAudioData(data));
        return k + 1 < order.length ? next.catch(() => attempt(k + 1)) : next;
      };
      p = attempt(0);
      this.fileLoads.set(src, p);
      // A failed load may succeed later (a flaky network): do not cache the failure.
      p.catch(() => {
        if (this.fileLoads.get(src) === p) this.fileLoads.delete(src);
      });
    }
    return p;
  }

  // ------------------------------------------------------------------------------------------------
  // Buses and music

  setBusVolume(bus: Bus, v01: number): void {
    this.volumes[bus] = Number.isFinite(v01) ? Math.min(1, Math.max(0, v01)) : 1;
    this.mixer?.setVolume(bus, this.volumes[bus]);
  }

  getBusVolume(bus: Bus): number {
    return this.volumes[bus];
  }

  readonly music: AudioService['music'] = {
    setCue: (cue, o) => {
      const fadeMs = Math.max(0, finite(o?.fadeMs, DEFAULT_FADE_MS));
      const def = Object.hasOwn(this.musicDefs, cue) ? this.musicDefs[cue] : undefined;
      if (!def) {
        this.warnOnce(`Unknown music cue "${cue}"`);
        return;
      }
      if (this.engine) {
        this.engine.setCue(cue, fadeMs);
        this.startScheduler();
        this.loadSheets(SHEETS_FOR_CUE[cue] ?? []);
      } else {
        // The same carry-over rule the engine applies (see music.ts `continuesBattle`).
        const prevRole = this.pendingCue ? (this.musicDefs[this.pendingCue.cue]?.role ?? null) : null;
        if (!continuesBattle(prevRole, def.role)) {
          this.pendingTranspose = 0;
          for (const l of MUSIC_LAYERS) this.pendingLayers[l] = 0;
        }
        this.pendingCue = { cue, fadeMs };
      }
    },
    setLayer: (l, v01) => {
      const v = Math.min(1, Math.max(0, finite(v01, 0)));
      this.pendingLayers[l] = v;
      this.engine?.setLayer(l, v);
    },
    transpose: (semitones) => {
      this.pendingTranspose = Math.round(finite(semitones, 0));
      this.engine?.transpose(this.pendingTranspose);
    },
    duck: (db, ms) => {
      if (!Number.isFinite(db) || !Number.isFinite(ms)) return;
      this.mixer?.duckMusic(db, ms);
    },
    stop: (fadeMs) => {
      this.pendingCue = null;
      this.engine?.stop(Math.max(0, finite(fadeMs, DEFAULT_FADE_MS)));
    },
  };

  /** The cue playing now (or waiting for unlock). */
  get cue(): MusicCueId | null {
    return this.engine ? this.engine.cue : (this.pendingCue?.cue ?? null);
  }

  private startScheduler(): void {
    if (this.o.scheduler === 'manual' || this.timer !== null) return;
    this.timer = setInterval(() => this.tick(), SCHEDULER_MS);
  }

  private warnOnce(msg: string): void {
    if (this.warned.has(msg)) return;
    this.warned.add(msg);
    (this.o.warn ?? ((m: string) => console.warn(`[audio] ${m}`)))(msg);
  }

  /** Stops everything and closes the context. */
  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.stopKeepAlive?.();
    this.engine?.dispose();
    this.mixer?.dispose();
    this.voices.clear();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.mixer = null;
    this.engine = null;
  }
}

/** Fetches a file relative to the site base; HTTP errors reject. */
function defaultFetch(src: string): Promise<ArrayBuffer> {
  return fetch(assetUrl(src)).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.arrayBuffer();
  });
}

/** Starts a source on a clip: the whole buffer, or a slice of a sprite sheet. */
function startClip(src: AudioBufferSourceNode, when: number, clip: Clip): void {
  if (clip.offset === 0 && clip.duration >= (src.buffer?.duration ?? 0)) src.start(when);
  else src.start(when, clip.offset, clip.duration);
}

function defaultIdle(task: () => void): void {
  const g = globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (typeof g.requestIdleCallback === 'function') g.requestIdleCallback(task, { timeout: 500 });
  else setTimeout(task, 0);
}

export interface CreateAudioOptions extends WebAudioServiceOptions {
  /** Render the boot groups now (default true). */
  prerender?: boolean;
  /** Render the rest in idle time (default true). */
  lazy?: boolean;
  idle?: (task: () => void) => void;
}

/**
 * Builds the service the app uses: renders the boot sounds (B7, < 300 ms) and queues the rest for idle
 * time. The context itself starts on `unlock()` at the first gesture.
 */
export function createWebAudioService(o: CreateAudioOptions = {}): { service: WebAudioService; boot: RenderStats | null } {
  const service = new WebAudioService(o);
  // With the recorded sheets the boot render is wasted work (perf audit 2026-10-01: 0.6 s of main
  // thread on a mid-range phone, the longest boot task). A sound played before its sheet decodes
  // renders its ZzFX fallback on first use; if the files fail, `renderLazily` renders the rest.
  const boot = o.prerender === false || (o.prerender === undefined && service.usesFiles) ? null : service.prerender();
  if (o.lazy !== false) service.renderLazily(o.idle);
  return { service, boot };
}
