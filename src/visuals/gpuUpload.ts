/**
 * GPU upload and CPU release of the unit sheets (G7, Safari memory, 2026-10-08).
 *
 * Pixi's loader decodes a sheet into an ImageBitmap. Once its texture is on the GPU that bitmap is a
 * second full copy (up to 66 MB for a 4096 x 4032 HD sheet), and iOS ends a Safari tab at about 1-2 GB.
 * `SheetReleaser` uploads each queued sheet through the app's renderer (`GpuHooks.upload`, Pixi's
 * `renderer.texture.initSource`), one per frame so a burst of loads never stalls a frame for long, then
 * closes the bitmap and turns off Pixi's texture GC for that source: a collected texture would re-upload
 * from the closed bitmap. The atlas tier unloads its sheets itself when nothing draws or holds them.
 *
 * After a lost and restored WebGL context every texture is gone and Pixi re-uploads from the sources'
 * resources; the released ones are decoded again from their URLs (the HTTP cache has them) and released
 * again once uploaded. Until then those units are invisible, which only happens after a context loss.
 *
 * Another renderer can only upload from the CPU copy: the card showcase draws on its own WebGL app, so a
 * sheet it leases is kept (`keep`): never released while kept, and decoded again first when it already
 * was (2026-10-09: the forced upgrade's stage drew no Bonker after a battle at DPR 2).
 *
 * Presentation only: nothing here reaches the sim.
 */
import type { TextureSource } from 'pixi.js';

/** What the app's renderer offers the art tier (B2: the app owns Pixi's Application). */
export interface GpuHooks {
  /** Uploads a texture source to the GPU now; false when it cannot (the context is lost). */
  upload(source: TextureSource): boolean;
  /** Calls `cb` after a lost GPU context was restored (every texture was dropped); returns an unsubscribe. */
  onRestored?(cb: () => void): () => void;
}

function isBitmap(r: unknown): r is ImageBitmap {
  return typeof ImageBitmap !== 'undefined' && r instanceof ImageBitmap;
}

/** A bitmap that still holds its pixels (a closed one reads 0 x 0, and uploading it draws nothing). */
function isOpenBitmap(r: unknown): r is ImageBitmap {
  return isBitmap(r) && r.width > 0;
}

/** Upload time one frame may spend before the rest waits for the next frame (ms). */
const UPLOAD_BUDGET_MS = 6;

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);

function nextFrame(cb: () => void): void {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => cb());
  else setTimeout(cb, 16);
}

/** Decodes an image URL into a new bitmap (a context restore); null when it fails. */
async function decodeBitmap(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

export class SheetReleaser {
  private readonly queue: TextureSource[] = [];
  /** Sources whose CPU copy was released, with the image URL to decode again after a context restore. */
  private readonly released = new Map<TextureSource, string>();
  /** Sources another renderer draws (`keep`), with their keep count: never released while kept. */
  private readonly kept = new Map<TextureSource, number>();
  /** Released sources being decoded again (`keep`, a context restore), shared by every caller. */
  private readonly reviving = new Map<TextureSource, Promise<void>>();
  private pumping = false;

  private readonly schedule: (cb: () => void) => void;
  private readonly decode: (url: string) => Promise<ImageBitmap | null>;
  private readonly budgetMs: number;

  /**
   * `schedule` runs a callback on a coming frame (default `requestAnimationFrame`), `decode` decodes an
   * image URL after a context restore, `budgetMs` is the upload time one frame may spend (tests pass 0:
   * one sheet per frame).
   */
  constructor(
    private readonly hooks: GpuHooks,
    o: { schedule?: (cb: () => void) => void; decode?: (url: string) => Promise<ImageBitmap | null>; budgetMs?: number } = {},
  ) {
    this.schedule = o.schedule ?? nextFrame;
    this.decode = o.decode ?? decodeBitmap;
    this.budgetMs = o.budgetMs ?? UPLOAD_BUDGET_MS;
    hooks.onRestored?.(() => this.restore());
  }

  /** Queues a freshly loaded sheet's source: uploaded on a coming frame, then its bitmap is closed. */
  add(source: TextureSource): void {
    if (source.destroyed || this.kept.has(source) || !isOpenBitmap(source.resource) || this.queue.includes(source)) return;
    this.queue.push(source);
    if (!this.pumping) {
      this.pumping = true;
      this.schedule(() => this.pump());
    }
  }

  /** Forgets a source (it is being unloaded): drops it from the queue and closes its bitmap now. */
  forget(source: TextureSource): void {
    const i = this.queue.indexOf(source);
    if (i >= 0) this.queue.splice(i, 1);
    this.released.delete(source);
    this.kept.delete(source);
    // a decode in flight for it closes its bitmap when it lands
    this.reviving.delete(source);
    const r = source.resource;
    if (isBitmap(r)) r.close();
  }

  /**
   * Keeps a source's decoded copy on the CPU side until the returned release runs (counted): another
   * renderer (the card showcase's own WebGL app) uploads from it, and a closed bitmap draws nothing. A
   * source already released is decoded again from its URL first: `ready` settles once its copy is back
   * (or the decode failed). Once nothing keeps it, it is queued for release again.
   */
  keep(source: TextureSource): { ready: Promise<void>; release(): void } {
    this.kept.set(source, (this.kept.get(source) ?? 0) + 1);
    const i = this.queue.indexOf(source);
    if (i >= 0) this.queue.splice(i, 1);
    const ready = this.released.has(source) ? this.revive(source) : (this.reviving.get(source) ?? Promise.resolve());
    let done = false;
    return {
      ready,
      release: () => {
        if (done) return;
        done = true;
        const n = (this.kept.get(source) ?? 1) - 1;
        if (n > 0) {
          this.kept.set(source, n);
          return;
        }
        this.kept.delete(source);
        // a copy still decoding queues itself once it is back
        if (!this.reviving.has(source)) this.add(source);
      },
    };
  }

  /** True while something keeps the source's CPU copy (tests). */
  isKept(source: TextureSource): boolean {
    return this.kept.has(source);
  }

  /** Sources waiting for their upload, and sources whose CPU copy is released (tests, the memory hook). */
  get stats(): { queued: number; released: number } {
    return { queued: this.queue.length, released: this.released.size };
  }

  /** True when the source's CPU copy was released (tests). */
  isReleased(source: TextureSource): boolean {
    return this.released.has(source);
  }

  /** One frame's uploads: at least one sheet, more while the frame's budget lasts (slow frames, a burst). */
  private pump(): void {
    const t0 = now();
    do {
      const s = this.queue.shift();
      if (s && !s.destroyed && isOpenBitmap(s.resource)) this.release(s);
    } while (this.queue.length > 0 && now() - t0 < this.budgetMs);
    if (this.queue.length > 0) this.schedule(() => this.pump());
    else this.pumping = false;
  }

  private release(s: TextureSource): void {
    // the label is the image URL Pixi's loader set; without it a context restore could not decode it again
    if (!s.label || this.kept.has(s)) return;
    let ok: boolean;
    try {
      ok = this.hooks.upload(s);
    } catch {
      ok = false;
    }
    // without a live context the texture stays a CPU copy; Pixi uploads it when it first draws
    if (!ok) return;
    const r = s.resource;
    if (!isBitmap(r)) return;
    s.autoGarbageCollect = false;
    this.released.set(s, s.label);
    r.close();
  }

  /** The GPU context came back: decodes the released sheets again and queues them for release. */
  private restore(): void {
    for (const s of [...this.released.keys()]) void this.revive(s);
  }

  /**
   * Decodes a released source again from its URL and gives it the new bitmap (Pixi re-uploads it on
   * `update`), then queues it for release unless something keeps it. One decode per source at a time.
   */
  private revive(s: TextureSource): Promise<void> {
    const pending = this.reviving.get(s);
    if (pending) return pending;
    const url = this.released.get(s);
    if (url === undefined) return Promise.resolve();
    this.released.delete(s);
    const p: Promise<void> = this.decode(url).then((bmp) => {
      // forgotten meanwhile (the sheet is being unloaded): the new copy is not wanted
      const current = this.reviving.get(s) === p;
      if (current) this.reviving.delete(s);
      if (!bmp) {
        // still released: a later keep or context restore tries again
        if (current && !s.destroyed) this.released.set(s, url);
        return;
      }
      if (!current || s.destroyed) {
        bmp.close();
        return;
      }
      s.resource = bmp;
      s.update();
      if (!this.kept.has(s)) this.add(s);
    });
    this.reviving.set(s, p);
    return p;
  }
}
