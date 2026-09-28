/**
 * Pre-rendered audio files (DESIGN B7 "any id can later point to a file"): the sound-effect sprite
 * sheets and the music files made by `tools/audio` (see `assets.gen.ts`).
 *
 * - Sound effects come in one Ogg Opus sprite sheet per sound group. `SfxFileBank` fetches and
 *   decodes a sheet once, and hands out clips (buffer, offset, duration) that play straight from the
 *   decoded sheet with `AudioBufferSourceNode.start(when, offset, duration)`, so nothing is copied.
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
    const clips = entry.variants.map(([offset, duration]) => {
      const start = Math.min(Math.max(0, offset), buffer.duration);
      return { buffer, offset: start, duration: Math.max(0.001, Math.min(duration, buffer.duration - start)) };
    });
    this.clipCache.set(id, clips);
    return clips;
  }

  /** Every sheet name, in manifest order. */
  sheets(): string[] {
    return Object.keys(this.files.sheets);
  }
}
