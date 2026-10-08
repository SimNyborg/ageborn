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
  private pumping = false;

  constructor(
    private readonly hooks: GpuHooks,
    private readonly schedule: (cb: () => void) => void = nextFrame,
    private readonly decode: (url: string) => Promise<ImageBitmap | null> = decodeBitmap,
  ) {
    hooks.onRestored?.(() => this.restore());
  }

  /** Queues a freshly loaded sheet's source: uploaded on a coming frame, then its bitmap is closed. */
  add(source: TextureSource): void {
    if (source.destroyed || !isBitmap(source.resource) || this.queue.includes(source)) return;
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
    const r = source.resource;
    if (isBitmap(r)) r.close();
  }

  /** Sources waiting for their upload, and sources whose CPU copy is released (tests, the memory hook). */
  get stats(): { queued: number; released: number } {
    return { queued: this.queue.length, released: this.released.size };
  }

  /** True when the source's CPU copy was released (tests). */
  isReleased(source: TextureSource): boolean {
    return this.released.has(source);
  }

  private pump(): void {
    const s = this.queue.shift();
    if (s && !s.destroyed && isBitmap(s.resource)) this.release(s);
    if (this.queue.length > 0) this.schedule(() => this.pump());
    else this.pumping = false;
  }

  private release(s: TextureSource): void {
    // the label is the image URL Pixi's loader set; without it a context restore could not decode it again
    if (!s.label) return;
    let ok = false;
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
    for (const [s, url] of [...this.released]) {
      this.released.delete(s);
      void this.decode(url).then((bmp) => {
        if (!bmp) return;
        if (s.destroyed) {
          bmp.close();
          return;
        }
        s.resource = bmp;
        s.update();
        this.add(s);
      });
    }
  }
}
