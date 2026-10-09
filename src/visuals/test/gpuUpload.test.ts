/**
 * G7 (Safari memory): a loaded unit sheet is uploaded to the GPU one per frame and its decoded CPU copy
 * (the ImageBitmap) closed; Pixi's texture GC is turned off for it (a collected texture would re-upload
 * from the closed bitmap); a sheet that could not be uploaded keeps its copy; an unloaded sheet's bitmap
 * closes at once; after a restored GPU context the released sheets are decoded again and released again.
 * A sheet another renderer draws (the card showcase's own WebGL app) is kept: never released while kept,
 * decoded again first when it already was, and released again once nothing keeps it.
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
  it('a kept sheet is never released; once nothing keeps it, it is released after all', () => {
    const f = frames();
    const uploaded: unknown[] = [];
    const r = new SheetReleaser({ upload: (s) => (uploaded.push(s), true) }, { schedule: f.schedule, budgetMs: 0 });
    const a = sheet();
    r.add(a);
    const k1 = r.keep(a);
    const k2 = r.keep(a);
    f.step();
    expect(uploaded).toEqual([]);
    expect((a.resource as unknown as FakeBitmap).closed).toBe(false);
    // a load that lands while it is kept is not queued either
    r.add(a);
    expect(r.stats.queued).toBe(0);
    k1.release();
    k1.release(); // idempotent
    expect(r.isKept(a)).toBe(true);
    k2.release();
    expect(r.isKept(a)).toBe(false);
    f.step();
    expect(uploaded).toEqual([a]);
    expect((a.resource as unknown as FakeBitmap).closed).toBe(true);
  });

  it('keeping a released sheet decodes it again first: ready waits for the copy, two keeps share one decode', async () => {
    const f = frames();
    const decoded: string[] = [];
    let land: ((b: ImageBitmap | null) => void) | null = null;
    const r = new SheetReleaser(
      { upload: () => true },
      {
        schedule: f.schedule,
        budgetMs: 0,
        decode: (url) => {
          decoded.push(url);
          return new Promise((res) => (land = res));
        },
      },
    );
    const a = sheet();
    r.add(a);
    f.step();
    expect(r.isReleased(a)).toBe(true);
    const updates: number[] = [];
    a.on('update', () => updates.push(1));
    const k1 = r.keep(a);
    const k2 = r.keep(a);
    expect(decoded).toEqual(['http://x/art/units/stone/bonker.hd.png']);
    let ready = false;
    void k1.ready.then(() => (ready = true));
    await Promise.resolve();
    expect(ready).toBe(false);
    land!(new FakeBitmap(64, 32) as unknown as ImageBitmap);
    await k2.ready;
    await Promise.resolve();
    expect(ready).toBe(true);
    // the source has its copy again (Pixi re-uploads on update) and stays unreleased while kept
    expect((a.resource as unknown as FakeBitmap).width).toBe(64);
    expect(updates.length).toBeGreaterThan(0);
    expect(r.isReleased(a)).toBe(false);
    expect(r.stats.queued).toBe(0);
    k1.release();
    k2.release();
    f.step();
    expect(r.isReleased(a)).toBe(true);
    expect((a.resource as unknown as FakeBitmap).closed).toBe(true);
  });

  it('a failed decode leaves the sheet released (a later keep tries again); a copy that lands after an unload is closed', async () => {
    const f = frames();
    const results: (FakeBitmap | null)[] = [null, new FakeBitmap(64, 32)];
    const r = new SheetReleaser({ upload: () => true }, { schedule: f.schedule, budgetMs: 0, decode: async () => results.shift() as unknown as ImageBitmap | null });
    const a = sheet();
    r.add(a);
    f.step();
    const k = r.keep(a);
    await k.ready;
    expect(r.isReleased(a)).toBe(true);
    k.release();
    // the second try lands after the sheet was unloaded (forget): the new copy is closed, not kept
    let land: ((b: ImageBitmap | null) => void) | null = null;
    const r2 = new SheetReleaser({ upload: () => true }, { schedule: f.schedule, budgetMs: 0, decode: () => new Promise((res) => (land = res)) });
    const b = sheet('http://x/b.png');
    r2.add(b);
    f.step();
    const kb = r2.keep(b);
    r2.forget(b);
    const late = new FakeBitmap(64, 32);
    land!(late as unknown as ImageBitmap);
    await kb.ready;
    expect(late.closed).toBe(true);
    expect(b.resource).not.toBe(late);
    kb.release();
    expect(r2.stats).toEqual({ queued: 0, released: 0 });
  });
});
