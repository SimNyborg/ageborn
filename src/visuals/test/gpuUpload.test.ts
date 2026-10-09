/**
 * G7 (Safari memory): a loaded unit sheet is uploaded to the GPU one per frame and its decoded CPU copy
 * (the ImageBitmap) closed; Pixi's texture GC is turned off for it (a collected texture would re-upload
 * from the closed bitmap); a sheet that could not be uploaded keeps its copy; an unloaded sheet's bitmap
 * closes at once; after a restored GPU context the released sheets are decoded again and released again.
 */
import { ImageSource } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SheetReleaser, type GpuHooks } from '../gpuUpload';

/** A stand-in ImageBitmap (Node has none): `close()` detaches it, as in the browser (width and height 0). */
class FakeBitmap {
  closed = false;
  constructor(
    public width: number,
    public height: number,
  ) {}
  close(): void {
    this.closed = true;
    this.width = 0;
    this.height = 0;
  }
}

const g = globalThis as unknown as { ImageBitmap?: unknown };
const had = g.ImageBitmap;
beforeAll(() => {
  g.ImageBitmap = FakeBitmap;
});
afterAll(() => {
  g.ImageBitmap = had;
});

function sheet(label = 'http://x/art/units/stone/bonker.hd.png'): ImageSource {
  return new ImageSource({ resource: new FakeBitmap(64, 32) as unknown as ImageBitmap, label });
}

/** Frames run only when the test steps them. */
function frames(): { schedule: (cb: () => void) => void; step: () => void; pending: () => number } {
  const q: (() => void)[] = [];
  return {
    schedule: (cb) => q.push(cb),
    step: () => q.shift()?.(),
    pending: () => q.length,
  };
}

describe('SheetReleaser (G7)', () => {
  it('a burst fills a frame up to its upload budget', () => {
    const f = frames();
    const uploaded: unknown[] = [];
    const r = new SheetReleaser({ upload: (s) => (uploaded.push(s), true) }, { schedule: f.schedule });
    for (let i = 0; i < 5; i++) r.add(sheet(`http://x/${i}.png`));
    f.step();
    // instant uploads all fit in one frame's budget
    expect(uploaded).toHaveLength(5);
    expect(f.pending()).toBe(0);
  });

  it('uploads one sheet per frame, then closes its bitmap and keeps Pixi from collecting the texture', () => {
    const uploaded: ImageSource[] = [];
    const f = frames();
    const r = new SheetReleaser({ upload: (s) => (uploaded.push(s as ImageSource), true) }, { schedule: f.schedule, budgetMs: 0 });
    const a = sheet();
    const b = sheet('http://x/b.png');
    r.add(a);
    r.add(b);
    r.add(a); // queued once
    expect(r.stats).toEqual({ queued: 2, released: 0 });
    f.step();
    expect(uploaded).toEqual([a]);
    expect((a.resource as unknown as FakeBitmap).closed).toBe(true);
    expect(a.autoGarbageCollect).toBe(false);
    expect((b.resource as unknown as FakeBitmap).closed).toBe(false);
    f.step();
    expect(uploaded).toEqual([a, b]);
    expect(r.stats).toEqual({ queued: 0, released: 2 });
    expect(r.isReleased(a) && r.isReleased(b)).toBe(true);
    expect(f.pending()).toBe(0);
  });

  it('keeps the CPU copy when the upload cannot run (a lost context) or throws', () => {
    const f = frames();
    const lost = new SheetReleaser({ upload: () => false }, { schedule: f.schedule, budgetMs: 0 });
    const a = sheet();
    lost.add(a);
    f.step();
    expect((a.resource as unknown as FakeBitmap).closed).toBe(false);
    expect(a.autoGarbageCollect).toBe(true);
    const throws = new SheetReleaser(
      {
        upload: () => {
          throw new Error('no GL');
        },
      },
      { schedule: f.schedule, budgetMs: 0 },
    );
    const b = sheet();
    throws.add(b);
    f.step();
    expect((b.resource as unknown as FakeBitmap).closed).toBe(false);
  });

  it('never releases a source without a URL to decode it again', () => {
    const f = frames();
    const r = new SheetReleaser({ upload: () => true }, { schedule: f.schedule, budgetMs: 0 });
    const a = sheet('');
    r.add(a);
    f.step();
    expect((a.resource as unknown as FakeBitmap).closed).toBe(false);
  });

  it('forget drops a queued sheet and closes its bitmap at once (an unload)', () => {
    const f = frames();
    const uploaded: unknown[] = [];
    const r = new SheetReleaser({ upload: (s) => (uploaded.push(s), true) }, { schedule: f.schedule, budgetMs: 0 });
    const a = sheet();
    r.add(a);
    r.forget(a);
    expect((a.resource as unknown as FakeBitmap).closed).toBe(true);
    f.step();
    expect(uploaded).toEqual([]);
    expect(r.stats).toEqual({ queued: 0, released: 0 });
  });

  it('after a restored context decodes the released sheets again and releases them again', async () => {
    const f = frames();
    let restored: (() => void) | null = null;
    const hooks: GpuHooks = {
      upload: () => true,
      onRestored: (cb) => {
        restored = cb;
        return () => undefined;
      },
    };
    const decoded: string[] = [];
    const r = new SheetReleaser(hooks, {
      schedule: f.schedule,
      budgetMs: 0,
      decode: async (url) => {
        decoded.push(url);
        return new FakeBitmap(64, 32) as unknown as ImageBitmap;
      },
    });
    const a = sheet();
    const gone = sheet('http://x/gone.png');
    r.add(a);
    r.add(gone);
    f.step();
    f.step();
    gone.destroy();
    expect(restored).not.toBeNull();
    restored!();
    await Promise.resolve();
    await Promise.resolve();
    expect(decoded).toEqual(['http://x/art/units/stone/bonker.hd.png', 'http://x/gone.png']);
    // the live sheet has a fresh bitmap, queued for its upload and release; the destroyed one is skipped
    expect((a.resource as unknown as FakeBitmap).closed).toBe(false);
    expect(r.stats.queued).toBe(1);
    f.step();
    expect((a.resource as unknown as FakeBitmap).closed).toBe(true);
    expect(r.isReleased(a)).toBe(true);
  });
});
