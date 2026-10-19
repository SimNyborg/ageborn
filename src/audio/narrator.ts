/**
 * The narrator (queue item 39, owner request 2026-10-18): plays the pre-rendered voice lines (`voice.gen.ts`,
 * made offline by `tools/audio/voice` with the Kokoro voice the owner chose) on the mixer's voice bus. The app
 * loads this module lazily, only when a line is about to be needed, so neither the code nor a file is part of
 * the first load.
 *
 * - One line at a time: a new line cuts the one playing (a short fade), and `stop` ends it. The narrator never
 *   takes input; the app stops a line when its step is done, skipped or left, so a tap is never held up.
 * - While a line plays the music ducks through the existing duck (`AudioService.music.duck`, A13's 6 dB),
 *   renewed in short slices, so a line cut short lets the music back up within half a second.
 * - Files load only when asked: `prefetch` fetches and decodes the next line or two; `say` loads a line that is
 *   not in yet and plays it if it arrives in time (`maxDelayMs`), else gives up quietly.
 * - Each line is a mono Ogg Opus file with an AAC copy (AAC first where Ogg Opus is not supported, else the
 *   retry). A line whose files are missing or do not decode is skipped: its subtitle shows as always.
 * - A line starts only while the context runs (after the first gesture's unlock, with the page visible); the
 *   master volume and mute apply through the master bus, and the voice bus has its own volume (Settings).
 */
import type { VoiceFile } from './voice.gen';

export type { VoiceFile };

/** Where lines play: the context and the voice bus (`WebAudioService.voiceOut`), null while audio is locked. */
export interface VoiceOut {
  ctx: AudioContext;
  input: AudioNode;
}

export interface NarratorHost {
  voiceOut(): VoiceOut | null;
  /** The music duck (`AudioService.music.duck`). */
  duck(db: number, ms: number): void;
}

export interface NarratorTimers {
  every(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface NarratorOptions {
  host: NarratorHost;
  /** One language's lines, by line id. */
  files: Readonly<Record<string, VoiceFile>>;
  /** Fetches a file (default `fetch` relative to the site base). */
  fetchFile?: (src: string) => Promise<ArrayBuffer>;
  /** Whether Ogg Opus decodes here (default: the browser's answer). */
  opus?: () => boolean;
  /** Milliseconds (default `performance.now`). */
  now?: () => number;
  timers?: NarratorTimers;
  warn?: (msg: string) => void;
}

export type NarratorEvent =
  | { kind: 'start'; id: string; seconds: number }
  | { kind: 'end'; id: string; cut: boolean }
  | { kind: 'skip'; id: string; reason: 'off' | 'missing' | 'failed' | 'late' | 'locked' | 'replaced' };

/** How far the music ducks while the narrator speaks (dB; A13's duck depth). */
export const NARRATOR_DUCK_DB = 6;
/** Each duck slice (ms), renewed every `DUCK_EVERY_MS` while a line plays. */
export const DUCK_SLICE_MS = 600;
export const DUCK_EVERY_MS = 250;
/** A line that is not ready this long after `say` is dropped (its moment has passed). */
export const DEFAULT_MAX_DELAY_MS = 2500;
/** Decoded lines kept (a 2 s line is about 0.4 MB decoded). */
export const DECODED_KEEP = 8;
/** A line whose files failed is not tried again for this long (ms). */
export const RETRY_AFTER_MS = 20_000;
/** Fade in and the fade a cut line gets (seconds). */
const FADE_IN_S = 0.012;
const CUT_TAU_S = 0.035;
const CUT_STOP_S = 0.2;

interface Playing {
  id: string;
  ctx: AudioContext;
  src: AudioBufferSourceNode;
  gain: GainNode;
  duckTimer: unknown;
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

const defaultTimers: NarratorTimers = {
  every: (fn, ms) => setInterval(fn, ms),
  clear: (h) => clearInterval(h as ReturnType<typeof setInterval>),
};

/*
 * The site base and the Ogg Opus check, as `files.ts` has them. Kept here so this lazy module imports nothing
 * the audio service's chunk holds (importing `files.ts` would split that boot chunk to share it).
 */
function siteUrl(path: string): string {
  if (/^([a-z]+:|\/)/i.test(path)) return path;
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${base.endsWith('/') ? base : `${base}/`}${path}`;
}

let opusSupport: boolean | undefined;
function opusPlays(): boolean {
  if (opusSupport !== undefined) return opusSupport;
  try {
    const el = typeof document !== 'undefined' ? document.createElement('audio') : null;
    opusSupport = el && typeof el.canPlayType === 'function' ? el.canPlayType('audio/ogg; codecs="opus"') !== '' : true;
  } catch {
    opusSupport = true;
  }
  return opusSupport;
}

function defaultFetch(src: string): Promise<ArrayBuffer> {
  return fetch(siteUrl(src)).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.arrayBuffer();
  });
}

export class Narrator {
  /** Settings › Narrator; off stops the line playing and every later `say` is skipped. */
  private on = true;
  private playing: Playing | null = null;
  /** The latest `say` still waiting for its file (a newer `say` or `stop` replaces it). */
  private wanted: { id: string; token: number } | null = null;
  private token = 0;
  private readonly decoded = new Map<string, AudioBuffer>();
  private readonly loading = new Map<string, Promise<AudioBuffer | null>>();
  /** Fetched, not yet decoded (prefetched before the context existed). */
  private readonly fetched = new Map<string, Promise<ArrayBuffer>>();
  private readonly failedAt = new Map<string, number>();
  private readonly listeners = new Set<(e: NarratorEvent) => void>();
  private readonly fetchFile: (src: string) => Promise<ArrayBuffer>;
  private readonly now: () => number;
  private readonly timers: NarratorTimers;
  private readonly warned = new Set<string>();
  /** Every file request made (tests, the dev log): line id and source. */
  readonly requests: { id: string; src: string }[] = [];

  constructor(private readonly o: NarratorOptions) {
    this.fetchFile = o.fetchFile ?? defaultFetch;
    this.now = o.now ?? defaultNow;
    this.timers = o.timers ?? defaultTimers;
  }

  get enabled(): boolean {
    return this.on;
  }

  set enabled(v: boolean) {
    this.on = v;
    if (!v) this.stop();
  }

  /** The line playing now, or null. */
  get current(): string | null {
    return this.playing?.id ?? null;
  }

  has(id: string): boolean {
    return Object.hasOwn(this.o.files, id);
  }

  subscribe(cb: (e: NarratorEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Fetches and decodes lines about to be needed (nothing for lines in, loading or unknown). */
  prefetch(ids: readonly string[]): void {
    if (!this.on) return;
    for (const id of ids) if (this.has(id) && !this.decoded.has(id) && !this.loading.has(id) && !this.recentlyFailed(id)) void this.load(id);
  }

  /**
   * Plays a line, cutting the one playing. Resolves true once it starts; false when it is skipped (off, unknown,
   * failed, late, audio locked, or replaced by a newer `say` or a `stop` while it loaded).
   */
  async say(id: string, o: { maxDelayMs?: number } = {}): Promise<boolean> {
    const token = ++this.token;
    if (this.playing) this.cut();
    if (!this.on) return this.skip(id, 'off');
    if (!this.has(id)) return this.skip(id, 'missing');
    if (this.recentlyFailed(id)) return this.skip(id, 'failed');
    this.wanted = { id, token };
    const asked = this.now();
    const buffer = this.decoded.get(id) ?? (await this.load(id));
    if (this.wanted?.token !== token) return this.skip(id, 'replaced');
    this.wanted = null;
    if (!buffer) return this.skip(id, 'failed');
    if (this.now() - asked > (o.maxDelayMs ?? DEFAULT_MAX_DELAY_MS)) return this.skip(id, 'late');
    if (!this.on) return this.skip(id, 'off');
    const out = this.o.host.voiceOut();
    if (!out || out.ctx.state !== 'running') return this.skip(id, 'locked');
    return this.start(id, buffer, out) || this.skip(id, 'locked');
  }

  /** Ends the line playing (only if it is `id`, when given) and drops a `say` still loading. */
  stop(id?: string): void {
    if (id !== undefined && this.playing?.id !== id && this.wanted?.id !== id) return;
    this.wanted = null;
    if (this.playing && (id === undefined || this.playing.id === id)) this.cut();
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.decoded.clear();
    this.fetched.clear();
  }

  /** Starts a line on the voice bus; false when the context refuses (it closed meanwhile). */
  private start(id: string, buffer: AudioBuffer, out: VoiceOut): boolean {
    const { ctx, input } = out;
    let src: AudioBufferSourceNode;
    let gain: GainNode;
    const t = ctx.currentTime;
    try {
      src = ctx.createBufferSource();
      src.buffer = buffer;
      gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + FADE_IN_S);
      src.connect(gain);
      gain.connect(input);
      src.start(t);
    } catch {
      return false;
    }
    const duck = (): void => this.o.host.duck(NARRATOR_DUCK_DB, DUCK_SLICE_MS);
    duck();
    const p: Playing = { id, ctx, src, gain, duckTimer: this.timers.every(duck, DUCK_EVERY_MS) };
    this.playing = p;
    src.onended = () => {
      gain.disconnect();
      if (this.playing !== p) return;
      this.timers.clear(p.duckTimer);
      this.playing = null;
      this.emit({ kind: 'end', id, cut: false });
    };
    this.emit({ kind: 'start', id, seconds: buffer.duration });
    return true;
  }

  /** Fades the line playing out (no click) and forgets it; its duck slices stop, so the music comes back up. */
  private cut(): void {
    const p = this.playing;
    if (!p) return;
    this.playing = null;
    this.timers.clear(p.duckTimer);
    try {
      const t = p.ctx.currentTime;
      // hold the level it has now (a cut during the fade-in must not jump), then fade it out
      const g = p.gain.gain as AudioParam & { cancelAndHoldAtTime?: (when: number) => AudioParam };
      if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(t);
      else {
        const v = g.value;
        g.cancelScheduledValues(t);
        g.setValueAtTime(v, t);
      }
      g.setTargetAtTime(0, t, CUT_TAU_S);
      p.src.stop(t + CUT_STOP_S);
    } catch {
      // already stopped
    }
    this.emit({ kind: 'end', id: p.id, cut: true });
  }

  private recentlyFailed(id: string): boolean {
    const at = this.failedAt.get(id);
    return at !== undefined && this.now() - at < RETRY_AFTER_MS;
  }

  /** The decoded line (fetching it first if needed), or null when both files fail. Never rejects. */
  private load(id: string): Promise<AudioBuffer | null> {
    const ready = this.decoded.get(id);
    if (ready) return Promise.resolve(ready);
    const known = this.loading.get(id);
    if (known) return known;
    const file = this.o.files[id];
    if (!file) return Promise.resolve(null);
    const opus = this.o.opus ?? opusPlays;
    const order = opus() ? [file.src, file.alt] : [file.alt, file.src];
    const attempt = async (k: number): Promise<AudioBuffer> => {
      const src = order[k] as string;
      // the first source's bytes may be in already (prefetched before the context existed)
      const early = k === 0 ? this.fetched.get(id) : undefined;
      this.fetched.delete(id);
      if (!early) this.requests.push({ id, src });
      const bytes = await (early ?? this.fetchFile(src));
      const out = this.o.host.voiceOut();
      if (!out) {
        // no context to decode with yet: keep the bytes for the `say` that needs them
        this.fetched.set(id, Promise.resolve(bytes));
        throw new Error('audio is locked');
      }
      return out.ctx.decodeAudioData(bytes);
    };
    const p = attempt(0)
      .catch((e: unknown) => {
        if (e instanceof Error && e.message === 'audio is locked') throw e;
        return attempt(1);
      })
      .then(
        (buffer) => {
          this.keep(id, buffer);
          return buffer;
        },
        (e: unknown) => {
          if (!(e instanceof Error && e.message === 'audio is locked')) {
            this.failedAt.set(id, this.now());
            this.warnOnce(`Narrator line "${id}" could not be loaded (${e instanceof Error ? e.message : String(e)}); its subtitle shows without it`);
          }
          return null;
        },
      )
      .finally(() => {
        if (this.loading.get(id) === p) this.loading.delete(id);
      });
    this.loading.set(id, p);
    return p;
  }

  private keep(id: string, buffer: AudioBuffer): void {
    this.decoded.delete(id);
    this.decoded.set(id, buffer);
    while (this.decoded.size > DECODED_KEEP) {
      const oldest = this.decoded.keys().next().value as string;
      if (oldest === this.playing?.id) break;
      this.decoded.delete(oldest);
    }
  }

  private skip(id: string, reason: Extract<NarratorEvent, { kind: 'skip' }>['reason']): false {
    this.emit({ kind: 'skip', id, reason });
    return false;
  }

  private emit(e: NarratorEvent): void {
    for (const l of this.listeners) l(e);
  }

  private warnOnce(msg: string): void {
    if (this.warned.has(msg)) return;
    this.warned.add(msg);
    (this.o.warn ?? ((m: string) => console.warn(`[narrator] ${m}`)))(msg);
  }
}
