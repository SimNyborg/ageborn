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
 * Big uploads are spaced out (review S1, 2026-10-18): uploading a 17-66 MB sheet takes tens of ms of main
 * thread (37-68 ms on a software-rendered desktop, plausibly as much on an iPhone, where WebKit copies the
 * bitmap to its GPU process), and a big collection's evolve queued five or more of them in a row. A sheet over
 * `BIG_UPLOAD_BYTES` goes at most every `BIG_UPLOAD_GAP_MS` (750 ms), and none while the battle asks for quiet
 * (`quietFor`: an evolve, from its Ascension until a while after its age-up); small ones keep going every frame.
 * A sheet a view starts to draw before its turn goes at once (`flush`): Pixi would upload it on that frame
 * anyway, and so its decoded copy does not stay next to the GPU copy. Waiting never leaves a unit without its
 * picture.
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

/** A sheet whose decoded copy is larger than this (bytes; a 2,048 x 1,024 sheet) is a big upload. */
export const BIG_UPLOAD_BYTES = 8_400_000;

/**
 * At most one big upload this often (ms). Review 2 N-c (2026-10-19): at 250 ms a side's hand-over still sent four
 * big sheets (116 MB) up within 3 s, mid-fight; the hand-over leaves 5-20 s before the evolve, enough for its
 * sheets at this pace. The cost: a big sheet behind others waits up to this long per sheet ahead of it, keeping
 * its decoded copy meanwhile, and its units draw the 1x copy (or, with none, have it uploaded at once).
 */
export const BIG_UPLOAD_GAP_MS = 750;

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);

/** Decoded bytes of a texture source (RGBA). */
function sourceBytes(s: TextureSource): number {
  return Math.max(0, (s.pixelWidth || 0) * (s.pixelHeight || 0) * 4);
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
  /** Sources another renderer draws (`keep`), with their keep count: never released while kept. */
  private readonly kept = new Map<TextureSource, number>();
  /** Released sources being decoded again (`keep`, a context restore), shared by every caller. */
  private readonly reviving = new Map<TextureSource, Promise<void>>();
  private pumping = false;
  /** No big upload before this time (the gap after the last one), nor before `quietUntil` (`quietFor`). */
  private nextBigAt = -Infinity;
  private quietUntil = -Infinity;

  private readonly schedule: (cb: () => void) => void;
  private readonly decode: (url: string) => Promise<ImageBitmap | null>;
  private readonly budgetMs: number;
  private readonly clock: () => number;
  private readonly bigBytes: number;
  private readonly bigGapMs: number;
  /** Told when a source leaves the queue (uploaded, kept, forgotten or skipped): the atlas then lets units draw it. */
  onDequeued: ((source: TextureSource) => void) | null = null;

  /**
   * `schedule` runs a callback on a coming frame (default `requestAnimationFrame`), `decode` decodes an
   * image URL after a context restore, `budgetMs` is the upload time one frame may spend (tests pass 0:
   * one sheet per frame), `clock` the time in ms (default `performance.now`), `bigBytes` and `bigGapMs` what
   * counts as a big upload and how far apart big uploads go.
   */
  constructor(
    private readonly hooks: GpuHooks,
    o: { schedule?: (cb: () => void) => void; decode?: (url: string) => Promise<ImageBitmap | null>; budgetMs?: number; clock?: () => number; bigBytes?: number; bigGapMs?: number } = {},
  ) {
    this.schedule = o.schedule ?? nextFrame;
    this.decode = o.decode ?? decodeBitmap;
    this.budgetMs = o.budgetMs ?? UPLOAD_BUDGET_MS;
    this.clock = o.clock ?? now;
    this.bigBytes = o.bigBytes ?? BIG_UPLOAD_BYTES;
    this.bigGapMs = o.bigGapMs ?? BIG_UPLOAD_GAP_MS;
    hooks.onRestored?.(() => this.restore());
  }

  /**
   * Holds big uploads for the next `ms` (the battle's evolve moment: the camera push and the new base, where a
   * long frame shows most); small ones go on. A sheet a view draws meanwhile is uploaded by Pixi itself.
   */
  quietFor(ms: number): void {
    if (!(ms > 0)) return;
    this.quietUntil = Math.max(this.quietUntil, this.clock() + ms);
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

  /** True while a source waits for its upload (big sheets wait their turn and any quiet window). */
  isQueued(source: TextureSource): boolean {
    return this.queue.includes(source);
  }

  /**
   * Uploads a queued source now, out of turn (past the gap and any quiet window): a view draws it from this frame
   * on, and Pixi would upload it on that draw anyway. Through here its decoded copy is closed at once instead of
   * staying next to the GPU copy until its turn (2026-10-18: in a fast-forwarded war that held both copies of
   * the sheets drawn in a quiet window). Nothing when it is not queued.
   */
  flush(source: TextureSource): void {
    const i = this.queue.indexOf(source);
    if (i < 0) return;
    this.queue.splice(i, 1);
    if (!source.destroyed && isOpenBitmap(source.resource)) {
      // the next big upload keeps its distance from this one
      if (sourceBytes(source) > this.bigBytes) this.nextBigAt = Math.max(this.nextBigAt, this.clock() + this.bigGapMs);
      this.release(source);
    }
    this.onDequeued?.(source);
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
    if (i >= 0) {
      this.queue.splice(i, 1);
      this.onDequeued?.(source);
    }
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

  /**
   * One frame's uploads, in queue order, while the frame's budget lasts (at least one): a big sheet only when
   * the gap since the last big one has passed and no quiet window holds it, and then no other big one this
   * frame; small sheets go past a big one that waits.
   */
  private pump(): void {
    const t0 = this.clock();
    for (let i = 0; i < this.queue.length; ) {
      const s = this.queue[i] as TextureSource;
      if (s.destroyed || !isOpenBitmap(s.resource)) {
        this.queue.splice(i, 1);
        this.onDequeued?.(s);
        continue;
      }
      const big = sourceBytes(s) > this.bigBytes;
      if (big) {
        const at = this.clock();
        if (at < this.nextBigAt || at < this.quietUntil) {
          i++;
          continue;
        }
        this.nextBigAt = at + this.bigGapMs;
      }
      this.queue.splice(i, 1);
      this.release(s);
      this.onDequeued?.(s);
      if (this.clock() - t0 >= this.budgetMs) break;
    }
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
