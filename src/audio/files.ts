/**
 * Pre-rendered audio files (DESIGN B7 "any id can later point to a file"): the sound-effect sprite
 * sheets and the music files made by `tools/audio` (see `assets.gen.ts`).
 *
 * - Sound effects come in one Ogg Opus sprite sheet per sound group. `SfxFileBank` fetches and
 *   decodes a sheet once, and hands out clips (buffer, offset, duration) that play straight from the
 *   decoded sheet with `AudioBufferSourceNode.start(when, offset, duration)`, so nothing is copied.
 * - Every file also exists as AAC (`.m4a`, the manifest's `alt`). Browsers that cannot play Ogg Opus
 *   (older Safari and iOS) load the AAC copy first; everywhere else the AAC copy is the retry when the
 *   Ogg file fails to decode. Only when both fail does the service fall back to ZzFX.
 * - Each sheet starts with a sync burst at a known time (`sync`). After decoding, the bank finds the
 *   burst and shifts every clip by the difference, so a decoder that keeps the AAC encoder priming
 *   (about 21-46 ms) cannot cut off the attacks.
 * - Until a sheet is decoded, and on browsers that cannot decode it, the service plays the ZzFX
 *   definitions from `sounds.ts` instead (the fallback), so the game is never silent.
 */
import type { SoundId } from '@/contracts';
import { MUSIC_FILES, SFX_FILES, SFX_SHEETS, type MusicFile, type SfxFileEntry, type SfxSheetFile } from './assets.gen';

export { MUSIC_FILES, type MusicFile };

export interface SfxFiles {
  /** Sheet per sound group. */
  sheets: Readonly<Record<string, SfxSheetFile>>;
  /** Sheet and [offset, duration] per variant, per sound id. */
  entries: Readonly<Record<SoundId, SfxFileEntry>>;
}

/** The files `tools/audio/build.py` produced. */
export const sfxFiles: SfxFiles = { sheets: SFX_SHEETS, entries: SFX_FILES };

/** AAC copies by Ogg source path (from the manifest's `alt`). */
const ALT_SOURCES: ReadonlyMap<string, string> = new Map(
  [...Object.values(SFX_SHEETS), ...Object.values(MUSIC_FILES)].flatMap((f) => (f.alt ? [[f.src, f.alt] as const] : [])),
);

/** The AAC copy of a file, if the manifest has one. */
export function altSource(src: string): string | undefined {
  return ALT_SOURCES.get(src);
}

let opusSupport: boolean | undefined;

/** Whether this browser says it can play Ogg Opus (true where it cannot be asked, e.g. in tests). */
export function canPlayOpus(): boolean {
  if (opusSupport !== undefined) return opusSupport;
  try {
    const doc = (globalThis as { document?: { createElement?: (t: string) => { canPlayType?: (t: string) => string } } }).document;
    const el = doc?.createElement?.('audio');
    opusSupport = typeof el?.canPlayType === 'function' ? el.canPlayType('audio/ogg; codecs="opus"') !== '' : true;
  } catch {
    opusSupport = true;
  }
  return opusSupport;
}

/** The sources to try for a file, in order: the Ogg file and its AAC copy, AAC first without Opus. */
export function sourceOrder(src: string, opus: boolean = canPlayOpus()): string[] {
  const alt = altSource(src);
  if (!alt) return [src];
  return opus ? [src, alt] : [alt, src];
}

/**
 * Where the sync burst sits in a decoded sheet (seconds): the first sample above 10% of the peak of
 * the first 0.1 s, the same detection `tools/audio/build.py` stores as `sync`. Null when the buffer
 * cannot be read or is silent there.
 */
export function detectSync(buffer: AudioBuffer): number | null {
  if (typeof buffer.getChannelData !== 'function' || buffer.numberOfChannels < 1) return null;
  const data = buffer.getChannelData(0);
  const n = Math.min(data.length, Math.round(0.1 * buffer.sampleRate));
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i] ?? 0));
  if (peak <= 1e-4) return null;
  for (let i = 0; i < n; i++) if (Math.abs(data[i] ?? 0) > 0.1 * peak) return i / buffer.sampleRate;
  return null;
}

/** Largest start delay the sync correction accepts (seconds); anything else is ignored as noise. */
export const MAX_SYNC_SHIFT_S = 0.08;

/** A playable slice of a decoded buffer. */
export interface Clip {
  buffer: AudioBuffer;
  /** Start inside the buffer, seconds. */
  offset: number;
  /** Length, seconds. */
  duration: number;
}

/** The site base (Vite `base`, `/ageborn/` on Pages), so relative asset paths work on any host. */
export function assetBase(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

/** Resolves a manifest path (`audio/...`) against the site base; absolute URLs pass through. */
export function assetUrl(path: string): string {
  if (/^([a-z]+:|\/)/i.test(path)) return path;
  const base = assetBase();
  return `${base.endsWith('/') ? base : `${base}/`}${path}`;
}

export type SheetState = 'idle' | 'loading' | 'ready' | 'failed';

export class SfxFileBank {
  private readonly decoded = new Map<string, AudioBuffer>();
  private readonly loads = new Map<string, Promise<boolean>>();
  private readonly state = new Map<string, SheetState>();
  private readonly clipCache = new Map<SoundId, Clip[]>();
  /** Per sheet: seconds to add to every manifest offset (a decoder's start delay, see `detectSync`). */
  private readonly shift = new Map<string, number>();
  /** Set when a sheet could not be fetched or decoded (the format is not supported, or offline). */
  failed = false;

  constructor(
    readonly files: SfxFiles,
    private readonly load: (src: string) => Promise<AudioBuffer>,
    private readonly onError: (msg: string) => void = () => undefined,
  ) {}

  /** The sheet (sound group) a sound id lives in, if it has a file. */
  sheetOf(id: SoundId): string | undefined {
    return Object.hasOwn(this.files.entries, id) ? this.files.entries[id]?.sheet : undefined;
  }

  sheetState(sheet: string): SheetState {
    return this.state.get(sheet) ?? 'idle';
  }

  has(id: SoundId): boolean {
    return this.sheetOf(id) !== undefined;
  }

  /** Fetches and decodes a sheet (once). Resolves true when it is ready. */
  loadSheet(sheet: string): Promise<boolean> {
    const known = this.loads.get(sheet);
    if (known) return known;
    const file = Object.hasOwn(this.files.sheets, sheet) ? this.files.sheets[sheet] : undefined;
    if (!file) return Promise.resolve(false);
    this.state.set(sheet, 'loading');
    const p = this.load(file.src).then(
      (buffer) => {
        this.decoded.set(sheet, buffer);
        this.shift.set(sheet, syncShift(file, buffer));
        this.state.set(sheet, 'ready');
        return true;
      },
      (err: unknown) => {
        this.failed = true;
        this.state.set(sheet, 'failed');
        this.onError(`Could not load sound sheet "${file.src}" (${err instanceof Error ? err.message : String(err)}); using the synthesized fallback`);
        return false;
      },
    );
    this.loads.set(sheet, p);
    return p;
  }

  /** Loads the sheet of a sound id in the background (no-op when loaded, loading or failed). */
  request(id: SoundId): void {
    const sheet = this.sheetOf(id);
    if (sheet !== undefined && this.sheetState(sheet) === 'idle') void this.loadSheet(sheet);
  }

  /** The clips of a sound once its sheet is decoded; undefined before that. */
  clips(id: SoundId): Clip[] | undefined {
    const cached = this.clipCache.get(id);
    if (cached) return cached;
    const entry = Object.hasOwn(this.files.entries, id) ? this.files.entries[id] : undefined;
    if (!entry) return undefined;
    const buffer = this.decoded.get(entry.sheet);
    if (!buffer) return undefined;
    const shift = this.shift.get(entry.sheet) ?? 0;
    const clips = entry.variants.map(([offset, duration]) => {
      const start = Math.min(Math.max(0, offset + shift), buffer.duration);
      return { buffer, offset: start, duration: Math.max(0.001, Math.min(duration, buffer.duration - start)) };
    });
    this.clipCache.set(id, clips);
    return clips;
  }

  /** The start delay corrected on a decoded sheet (seconds; 0 when none was found). */
  sheetShift(sheet: string): number {
    return this.shift.get(sheet) ?? 0;
  }

  /** Every sheet name, in manifest order. */
  sheets(): string[] {
    return Object.keys(this.files.sheets);
  }
}

/** The offset correction for a decoded sheet: detected sync time minus the manifest's. */
function syncShift(file: SfxSheetFile, buffer: AudioBuffer): number {
  if (file.sync === undefined) return 0;
  const found = detectSync(buffer);
  if (found === null) return 0;
  const d = found - file.sync;
  return Math.abs(d) >= 0.002 && Math.abs(d) <= MAX_SYNC_SHIFT_S ? d : 0;
}
