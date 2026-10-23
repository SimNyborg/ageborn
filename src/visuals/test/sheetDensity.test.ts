/**
 * The memory governor's two copies of a unit sheet on an HD screen (iPhone memory, 2026-10-18): a 1x lease
 * (`density: 'sd'`) loads the plain sheet next to the battle's HD set, units draw from it while no HD copy is
 * held, a view on the 1x copy switches to HD once that has loaded (same frames, the scale follows the
 * density), and the 1x copy then unloads. The provider plans every hold's sheets together: the lane and the
 * queue get HD first, the rest 1x within the budget, and a sheet moving between copies keeps the one it has
 * until the other can draw, so no unit is ever without its art. Review S1 (2026-10-18): units switch to an HD
 * copy only once it is on the GPU, and the next deck before the hand-over loads only where HD fits.
 */
import { ImageSource, Texture } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VisualDef } from '@/contracts/art';
import { AtlasAdapter, LEASE_LINGER_MS, type AtlasData, type SheetLease } from '../adapters/atlas';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';
import { DEMOTE_CONFIRM_MS, HD_HOLD_MS, LEAVING_LANE_BYTES, SHEET_RANK, unitSheetBytes } from '../sheetBudget';

afterEach(() => {
  vi.useRealTimers();
});

/** A sheet as loaded: HD copies (`.hd.json`) are twice as dense, so their texture units are half a lu. */
function data(hd: boolean): AtlasData {
  const tex = (n: number): Texture[] => Array.from({ length: n }, () => new Texture());
  return {
    luPerUnit: hd ? 0.5 : 1,
    heightLu: 68,
    animations: { idle: tex(4), idle_team: tex(4), walk: tex(4), attack: tex(5), hit: tex(2), die: tex(3) },
    clips: {
      idle: { durationsMs: [100, 100, 100, 100], loop: true },
      walk: { durationsMs: [100, 100, 100, 100], loop: true },
      attack: { durationsMs: [100, 100, 200, 100, 100], impactAt: 0.4 },
      hit: { durationsMs: [100, 100] },
      die: { durationsMs: [100, 100, 100] },
    },
  };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

function hdAdapter() {
  const def = MANIFEST['unit.bonker'] as VisualDef & { source: string };
  const loads: string[] = [];
  const unloads: string[] = [];
  const art = createArtProvider({ warn: () => {} });
  const a = new AtlasAdapter({
    entries: () => [{ ...def, clips: { idle: def.clips['idle']! } }],
    decor: art.procedural.baker,
    baseUrl: '/ageborn/',
    hd: true,
    lazyUnits: true,
    load: async (url) => {
      loads.push(url);
      return data(url.includes('.hd.'));
    },
    unload: (url) => {
      unloads.push(url);
    },
  });
  return { a, def, src: def.source, loads, unloads };
}

const view = (a: AtlasAdapter, def: VisualDef) => a.createUnit({ key: 'unit.bonker', def, side: 0, teamPreset: 'default', seed: 1 });
/** The scale of a view's body container (the sheet density, mirrored for its facing). */
const bodyScale = (v: ReturnType<typeof view>): number => Math.abs((v.root.children[1] as { scale: { y: number } }).scale.y);

describe('two copies of a unit sheet on an HD screen (memory governor)', () => {
  it('a 1x lease loads the plain sheet beside the HD set; units draw from it while no HD copy is held', async () => {
    vi.useFakeTimers();
    const { a, def, src, loads } = hdAdapter();
    const sd = a.lease(src, { linger: 0, density: 'sd' });
    await sd.core;
    expect(loads).toEqual(['/ageborn/art/units/stone/bonker.json']);
    expect(a.hasSdSheet(src)).toBe(true);
    expect(a.hasSheet(src)).toBe(false);
    expect(a.canDraw('unit', def)).toBe(true);
    expect(a.canDrawSource(src)).toBe(true);
    const v = view(a, def);
    expect(bodyScale(v)).toBeCloseTo(1);
    expect(a.sheetStats().sdViews).toBe(1);
    v.destroy();
    sd.release();
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(a.hasSdSheet(src)).toBe(false);
  });

  it('a view on the 1x copy switches to HD once that has loaded (the scale follows), and the 1x copy unloads', async () => {
    vi.useFakeTimers();
    const { a, def, src, unloads } = hdAdapter();
    const sd = a.lease(src, { linger: 0, density: 'sd' });
    await sd.core;
    const v = view(a, def);
    v.play('walk');
    v.update(150);
    const hd = a.lease(src, { linger: 0 });
    await hd.ready;
    expect(a.upgradeViews(src)).toBe(1);
    // HD texture units are half a lu: the body halves its scale and the unit keeps its size on screen
    expect(bodyScale(v)).toBeCloseTo(0.5);
    expect(a.sheetStats().sdViews).toBe(0);
    sd.release();
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(unloads).toEqual(['/ageborn/art/units/stone/bonker.json']);
    // the view still plays, now on the HD copy, and holds it
    v.update(100);
    hd.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(a.hasSheet(src)).toBe(true);
    // a view's own release lets go after the usual linger
    v.destroy();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(a.hasSheet(src)).toBe(false);
  });

  it('new views take the copy a lease holds: a demoted HD copy kept by its last views is not handed out', async () => {
    vi.useFakeTimers();
    const { a, def, src } = hdAdapter();
    const hd = a.lease(src, { linger: 0 });
    await hd.ready;
    const old = view(a, def);
    expect(bodyScale(old)).toBeCloseTo(0.5);
    // the governor lowers the sheet: the 1x copy loads, then the HD lease ends (its view keeps the copy)
    const sd = a.lease(src, { linger: 0, density: 'sd' });
    await sd.core;
    hd.release();
    expect(a.hasSheet(src)).toBe(true);
    expect(a.hdDrawn(src)).toBe(true);
    const fresh = view(a, def);
    expect(bodyScale(fresh)).toBeCloseTo(1);
    old.destroy();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(a.hasSheet(src)).toBe(false);
    expect(a.hasSdSheet(src)).toBe(true);
    fresh.destroy();
    sd.release();
  });

  it('views on the 1x copy switch to HD only once its extras sheet is in too, so none loses an attack variant (review N1)', async () => {
    const def0 = MANIFEST['unit.bonker'] as VisualDef & { source: string };
    const def = { ...def0, clips: { ...def0.clips, attack_b: { kind: 'atlas', ref: 'attack_b', durationMs: 600, loop: false } } } as VisualDef & { source: string };
    let landHdExtras: () => void = () => undefined;
    const hdExtras = new Promise<void>((r) => (landHdExtras = r));
    const art = createArtProvider({ warn: () => {} });
    const a = new AtlasAdapter({
      entries: () => [def],
      decor: art.procedural.baker,
      baseUrl: '/ageborn/',
      hd: true,
      lazyUnits: true,
      load: async (url) => {
        const hd = url.includes('.hd.');
        if (url.includes('.x.')) {
          if (hd) await hdExtras;
          return { luPerUnit: hd ? 0.5 : 1, animations: { attack_b: Array.from({ length: 6 }, () => new Texture()) }, clips: {} } as AtlasData;
        }
        return data(hd);
      },
      unload: () => undefined,
    });
    const src = def.source;
    const sd = a.lease(src, { linger: 0, density: 'sd' });
    await sd.ready;
    const walker = view(a, def);
    walker.play('walk');
    walker.update(50);
    const hd = a.lease(src, { linger: 0 });
    await hd.core;
    await settle();
    // the HD core is in, its extras are not: the views stay on the 1x copy, which has attack B
    expect(a.upgradeViews(src)).toBe(0);
    expect(a.sheetStats().sdViews).toBe(1);
    landHdExtras();
    await hd.ready;
    await settle();
    expect(a.upgradeViews(src)).toBe(1);
    expect(a.sheetStats().sdViews).toBe(0);
    walker.destroy();
    sd.release();
    hd.release();
  });

  it('S1: units stay on the 1x copy while the HD copy waits for its GPU upload, then switch (and the provider is told)', async () => {
    vi.useFakeTimers();
    const g = globalThis as unknown as { ImageBitmap?: unknown };
    const had = g.ImageBitmap;
    class FakeBitmap {
      constructor(
        public width: number,
        public height: number,
      ) {}
      close(): void {
        this.width = 0;
        this.height = 0;
      }
    }
    g.ImageBitmap = FakeBitmap;
    try {
      const def = MANIFEST['unit.bonker'] as VisualDef & { source: string };
      const art = createArtProvider({ warn: () => {} });
      const uploads: string[] = [];
      const a = new AtlasAdapter({
        entries: () => [{ ...def, clips: { idle: def.clips['idle']! } }],
        decor: art.procedural.baker,
        baseUrl: '/ageborn/',
        hd: true,
        lazyUnits: true,
        gpu: { upload: (s) => (uploads.push(String(s.label)), true) },
        // big sheets (over the releaser's BIG_UPLOAD_BYTES), so they wait out a quiet window
        load: async (url) => ({ ...data(url.includes('.hd.')), source: new ImageSource({ resource: new FakeBitmap(2048, 2048) as unknown as ImageBitmap, label: url }) }),
        unload: () => undefined,
      });
      const src = def.source;
      const told: string[] = [];
      a.onHdUploaded = (s) => told.push(s);
      const sd = a.lease(src, { linger: 0, density: 'sd' });
      await sd.core;
      await vi.advanceTimersByTimeAsync(20);
      expect(uploads).toEqual(['/ageborn/art/units/stone/bonker.json']);
      const v = view(a, def);
      // an evolve: big uploads wait; the HD copy loads meanwhile
      a.quietUploads(3000);
      const hd = a.lease(src, { linger: 0 });
      await hd.ready;
      await vi.advanceTimersByTimeAsync(1000);
      expect(a.hasSheet(src)).toBe(true);
      expect(a.hdOnGpu(src)).toBe(false);
      expect(a.upgradeViews(src)).toBe(0);
      // a unit fielded now draws the 1x copy too: no draw uploads the HD copy early
      const fresh = view(a, def);
      expect(bodyScale(fresh)).toBeCloseTo(1);
      expect(told).toEqual([]);
      await vi.advanceTimersByTimeAsync(2100);
      expect(uploads).toEqual(['/ageborn/art/units/stone/bonker.json', '/ageborn/art/units/stone/bonker.hd.json']);
      expect(a.hdOnGpu(src)).toBe(true);
      expect(told).toEqual([src]);
      expect(a.upgradeViews(src)).toBe(2);
      expect(bodyScale(v)).toBeCloseTo(0.5);
      v.destroy();
      fresh.destroy();
      sd.release();
      hd.release();
    } finally {
      g.ImageBitmap = had;
    }
  });

  it('a view that starts to draw an HD copy still waiting for its upload (no 1x copy) has it uploaded at once, its decoded copy closed', async () => {
    vi.useFakeTimers();
    const g = globalThis as unknown as { ImageBitmap?: unknown };
    const had = g.ImageBitmap;
    class FakeBitmap {
      constructor(
        public width: number,
        public height: number,
      ) {}
      close(): void {
        this.width = 0;
        this.height = 0;
      }
    }
    g.ImageBitmap = FakeBitmap;
    try {
      const def = MANIFEST['unit.bonker'] as VisualDef & { source: string };
      const art = createArtProvider({ warn: () => {} });
      const uploads: string[] = [];
      const bitmaps: FakeBitmap[] = [];
      const a = new AtlasAdapter({
        entries: () => [{ ...def, clips: { idle: def.clips['idle']! } }],
        decor: art.procedural.baker,
        baseUrl: '/ageborn/',
        hd: true,
        lazyUnits: true,
        gpu: { upload: (s) => (uploads.push(String(s.label)), true) },
        load: async (url) => {
          const bmp = new FakeBitmap(2048, 2048);
          bitmaps.push(bmp);
          return { ...data(url.includes('.hd.')), source: new ImageSource({ resource: bmp as unknown as ImageBitmap, label: url }) };
        },
        unload: () => undefined,
      });
      const src = def.source;
      a.quietUploads(5000);
      const hd = a.lease(src, { linger: 0 });
      await hd.ready;
      await vi.advanceTimersByTimeAsync(100);
      expect(uploads).toEqual([]);
      expect(a.hdOnGpu(src)).toBe(false);
      // no 1x copy to draw meanwhile: the view draws the HD copy, uploaded now through the releaser
      const v = view(a, def);
      expect(uploads).toEqual(['/ageborn/art/units/stone/bonker.hd.json']);
      expect(bitmaps[0]!.width).toBe(0);
      expect(a.hdOnGpu(src)).toBe(true);
      v.destroy();
      hd.release();
    } finally {
      g.ImageBitmap = had;
    }
  });

  it('on a 1x screen there is one copy: a 1x lease is the battle set', async () => {
    const def = MANIFEST['unit.bonker'] as VisualDef & { source: string };
    const loads: string[] = [];
    const art = createArtProvider({ warn: () => {} });
    const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker, baseUrl: '/ageborn/', hd: false, lazyUnits: true, load: async (u) => (loads.push(u), data(false)), unload: () => undefined });
    const l = a.lease(def.source, { density: 'sd' });
    await l.core;
    expect(a.hasSheet(def.source)).toBe(true);
    expect(a.hasSdSheet(def.source)).toBe(false);
    expect(a.hdScreen).toBe(false);
    l.release();
  });
});

/**
 * A loader like Pixi's `Assets`: one asset per URL (every set that loads a file gets the same textures) until the
 * URL is unloaded, which destroys its texture source (its style goes; a sprite still drawing it throws in Pixi's
 * renderer, which stopped the battle's ticker: review 2 B). `fail` names the files that do not load; `hold` makes
 * an unload wait until the test lets it finish.
 */
function pixiLikeLoader(fail: (url: string) => boolean) {
  const cache = new Map<string, AtlasData>();
  const loads: string[] = [];
  const unloads: string[] = [];
  let hold: Promise<void> | null = null;
  // (like `loadWithAssets`, every load gets its own wrapper around the one asset's textures)
  const wrap = (d: AtlasData): AtlasData => ({ ...d, animations: { ...d.animations }, clips: { ...d.clips } });
  const load = async (url: string): Promise<AtlasData> => {
    if (fail(url)) throw new Error(`404 ${url}`);
    const hit = cache.get(url);
    if (hit) return wrap(hit);
    loads.push(url);
    const hd = url.includes('.hd.');
    const source = new ImageSource({ resource: { width: 64, height: 64 } as unknown as ImageBitmap, label: url });
    const tex = (n: number): Texture[] => Array.from({ length: n }, () => new Texture({ source }));
    const base = data(hd);
    const d: AtlasData = url.includes('.x.')
      ? { luPerUnit: hd ? 0.5 : 1, animations: { attack_b: tex(6) }, clips: {}, source }
      : { ...base, animations: Object.fromEntries(Object.entries(base.animations).map(([k, v]) => [k, tex(v.length)])), source };
    cache.set(url, d);
    return wrap(d);
  };
  const unload = async (url: string): Promise<void> => {
    unloads.push(url);
    if (hold) await hold;
    const d = cache.get(url);
    cache.delete(url);
    d?.source?.destroy();
  };
  return {
    load,
    unload,
    loads,
    unloads,
    /** The texture source the loader holds for a URL now. */
    source: (url: string) => cache.get(url)?.source ?? null,
    holdUnloads: () => {
      let let_ = (): void => undefined;
      hold = new Promise<void>((r) => (let_ = r));
      return () => {
        hold = null;
        let_();
      };
    },
  };
}

/** True while a texture source can still be drawn (not destroyed, its style there). */
const drawable = (s: ImageSource | null | undefined): boolean => !!s && !s.destroyed && s.style !== null;

describe('review 2 B: a sheet file two sets share stays loaded while either holds it', () => {
  const bonker = MANIFEST['unit.bonker'] as VisualDef & { source: string };
  const plain = '/ageborn/art/units/stone/bonker.json';
  const plainX = '/ageborn/art/units/stone/bonker.x.json';

  function adapter(o: { hd: boolean; fail: (url: string) => boolean; extras?: boolean }) {
    const def = (o.extras ? { ...bonker, clips: { ...bonker.clips, attack_b: { kind: 'atlas', ref: 'attack_b', durationMs: 600, loop: false } } } : { ...bonker, clips: { idle: bonker.clips['idle']! } }) as VisualDef & { source: string };
    const art = createArtProvider({ warn: () => {} });
    const f = pixiLikeLoader(o.fail);
    const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker, baseUrl: '/ageborn/', hd: o.hd, lazyUnits: true, load: f.load, unload: f.unload });
    return { a, def, src: def.source, f };
  }

  it('an HD file that fails: the battle copy is the 1x file the 1x copy loads too; letting either go keeps the other drawable, the last one unloads it', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { a, def, src, f } = adapter({ hd: true, fail: (u) => u.includes('.hd.') });
    // the governor raises the sheet: its HD file fails and the 1x file stands in as the battle copy
    const hd = a.lease(src, { linger: 0 });
    await hd.ready;
    expect(a.hasSheet(src)).toBe(true);
    expect(a.hdFellBack(src)).toBe(true);
    const onLane = view(a, def);
    // the governor steps it down: the 1x copy is the same file (Pixi's loader hands both sets one asset)
    const sd = a.lease(src, { linger: 0, density: 'sd' });
    await sd.ready;
    expect(a.hasSdSheet(src)).toBe(true);
    expect(f.loads).toEqual([plain]);
    const shared = f.source(plain);
    expect(drawable(shared)).toBe(true);
    // the HD lease ends and the battle copy's last view goes: the battle copy unloads, the 1x copy keeps the file
    hd.release();
    onLane.destroy();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(a.hasSheet(src)).toBe(false);
    expect(f.unloads).toEqual([]);
    expect(drawable(shared)).toBe(true);
    const walker = view(a, def);
    walker.play('walk');
    walker.update(100);
    // raised again, the views move to the battle copy (the same file), and the 1x copy goes: the battle copy keeps it
    const hd2 = a.lease(src, { linger: 0 });
    await hd2.ready;
    expect(a.upgradeViews(src)).toBe(1);
    sd.release();
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(a.hasSdSheet(src)).toBe(false);
    expect(f.unloads).toEqual([]);
    expect(drawable(shared)).toBe(true);
    walker.update(100);
    // the last holder lets go: now the file unloads
    walker.destroy();
    hd2.release();
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(f.unloads).toEqual([plain]);
    expect(drawable(shared)).toBe(false);
    warn.mockRestore();
  });

  it('an HD extras file that fails: the plain extras file both copies hold stays until the last one lets go', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { a, src, f } = adapter({ hd: true, extras: true, fail: (u) => u.includes('.x.hd.') });
    const hd = a.lease(src, { linger: 0 });
    await hd.ready;
    const sd = a.lease(src, { linger: 0, density: 'sd' });
    await sd.ready;
    expect(f.loads.sort()).toEqual(['/ageborn/art/units/stone/bonker.hd.json', plain, plainX].sort());
    const extras = f.source(plainX);
    // the 1x copy goes: its own core file unloads, the extras file the battle copy holds too stays
    sd.release();
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(f.unloads).toEqual([plain]);
    expect(drawable(extras)).toBe(true);
    hd.release();
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(f.unloads.sort()).toEqual([plain, '/ageborn/art/units/stone/bonker.hd.json', plainX].sort());
    expect(drawable(extras)).toBe(false);
    warn.mockRestore();
  });

  it('on a 1x screen, a showcase HD copy whose file fails is the battle\'s own file: closing the showcase keeps it', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { a, def, src, f } = adapter({ hd: false, fail: (u) => u.includes('.hd.') });
    const game = a.lease(src, { linger: 0 });
    await game.ready;
    const v = view(a, def);
    const show = a.lease(src, { hd: true, linger: 0 });
    await show.ready;
    expect(show.hd).toBe(true);
    expect(a.hasHdCopy(src)).toBe(true);
    expect(f.loads).toEqual([plain]);
    show.release();
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(a.hasHdCopy(src)).toBe(false);
    expect(f.unloads).toEqual([]);
    expect(drawable(f.source(plain))).toBe(true);
    v.update(100);
    v.destroy();
    game.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS + 10);
    await settle();
    expect(f.unloads).toEqual([plain]);
    warn.mockRestore();
  });

  it('a load of a file whose unload is in flight waits for it, and gets a fresh copy (never the one being destroyed)', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { a, src, f } = adapter({ hd: true, fail: (u) => u.includes('.hd.') });
    const sd = a.lease(src, { linger: 0, density: 'sd' });
    await sd.ready;
    const old = f.source(plain);
    const finish = f.holdUnloads();
    sd.release();
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(f.unloads).toEqual([plain]);
    // the battle wants the sheet back while that unload runs: its HD file fails, and its 1x file waits for the unload
    const hd = a.lease(src, { linger: 0 });
    await vi.advanceTimersByTimeAsync(10);
    await settle();
    expect(a.hasSheet(src)).toBe(false);
    expect(f.loads).toEqual([plain]);
    finish();
    await hd.ready;
    expect(a.hasSheet(src)).toBe(true);
    expect(f.loads).toEqual([plain, plain]);
    expect(drawable(old)).toBe(false);
    expect(f.source(plain)).not.toBe(old);
    expect(drawable(f.source(plain))).toBe(true);
    hd.release();
    warn.mockRestore();
  });
});

/**
 * A provider on an HD screen whose atlas leases are recorded (and resolve when the test says), with a clock the
 * test moves (`tick`, which also runs the governor's re-plans; fake timers).
 */
function governed(budgetBytes: number) {
  vi.useFakeTimers();
  const art = createArtProvider({ warn: () => {}, unitSheets: 'match', dpr: 2, hdDpr: 2, worldPxPerLu: 1 });
  art.sheetBudget = budgetBytes;
  let now = 1_000;
  art.clock = () => now;
  expect(art.atlas.hdScreen).toBe(true);
  const live = new Map<string, { density: 'hd' | 'sd'; lease: SheetLease; done: () => void; released: boolean }>();
  const log: string[] = [];
  vi.spyOn(art.atlas, 'lease').mockImplementation((src, o) => {
    const density = o?.density === 'sd' ? 'sd' : 'hd';
    let done = (): void => undefined;
    const ready = new Promise<void>((r) => (done = r));
    // a released copy unloads (no view draws in these tests)
    const entry = { density, done, released: false, lease: { ready, core: ready, hd: false, release: () => ((entry.released = true), loaded.delete(`${density} ${src}`), log.push(`release ${density} ${src}`)) } };
    live.set(`${density} ${src}`, entry as never);
    log.push(`lease ${density} ${src}`);
    return entry.lease;
  });
  // the atlas reports what has "loaded" by the leases the test completed
  const loaded = new Set<string>();
  vi.spyOn(art.atlas, 'hasSheet').mockImplementation((src) => loaded.has(`hd ${src}`));
  vi.spyOn(art.atlas, 'hasSdSheet').mockImplementation((src) => loaded.has(`sd ${src}`));
  vi.spyOn(art.atlas, 'canDrawSource').mockImplementation((src) => loaded.has(`hd ${src}`) || loaded.has(`sd ${src}`));
  vi.spyOn(art.atlas, 'hdLoading').mockImplementation((src) => {
    const e = live.get(`hd ${src}`);
    return !!e && !e.released && !loaded.has(`hd ${src}`);
  });
  const upgraded: string[] = [];
  vi.spyOn(art.atlas, 'upgradeViews').mockImplementation((src) => (upgraded.push(src), 0));
  const finish = async (key: string): Promise<void> => {
    loaded.add(key);
    live.get(key)?.done();
    await settle();
  };
  /** Moves the clock (and the timers: the governor's re-plans) by `ms`. */
  const tick = async (ms: number): Promise<void> => {
    now += ms;
    await vi.advanceTimersByTimeAsync(ms);
    await settle();
  };
  return { art, log, live, finish, upgraded, tick };
}

describe('the provider plans every hold\'s sheets together (memory governor)', () => {
  const bonker = MANIFEST['unit.bonker']!.source;
  const mammoth = MANIFEST['unit.mammoth_matriarch']!.source;
  const bytes = (s: string): { hd: number; sd: number } => unitSheetBytes(s)!;

  it('the lane and the queue get HD first; the rest 1x within the budget', async () => {
    // room for the Bonker's HD copy and the Mammoth's 1x copy, not both in HD
    const { art, log } = governed(bytes(bonker).hd + bytes(mammoth).sd + 1);
    const hold = art.holdArt();
    void hold.set([
      { visualId: 'unit.bonker', priority: SHEET_RANK.field },
      { visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck },
    ]);
    expect(log).toEqual([`lease hd ${bonker}`, `lease sd ${mammoth}`]);
    expect(art.sheetPlan()).toMatchObject({ hd: 1, sd: 1, sdSources: [mammoth], hdScreen: true, loads: { hd: 1, sd: 1 } });
    hold.release();
    expect(log.slice(2).sort()).toEqual([`release hd ${bonker}`, `release sd ${mammoth}`].sort());
  });

  it('a sheet raised to HD keeps its 1x copy until the HD copy can draw, then its 1x views switch over', async () => {
    const { art, log, finish, upgraded, tick } = governed(bytes(mammoth).hd + bytes(bonker).hd);
    const hold = art.holdArt();
    // the Mammoth waits in the next age, the Bonker is on the lane: only one fits in HD
    art.sheetBudget = bytes(bonker).hd + bytes(mammoth).sd + 1;
    void hold.set([{ visualId: 'unit.bonker', priority: SHEET_RANK.field }, { visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next }]);
    await finish(`sd ${mammoth}`);
    await finish(`hd ${bonker}`);
    // the Bonker left the lane long ago and the Mammoth is queued: room for it now (its 1x copy counts until the
    // HD copy has loaded), once the Bonker's step down to 1x is confirmed a plan later
    await tick(HD_HOLD_MS);
    art.sheetBudget = bytes(mammoth).hd + bytes(mammoth).sd + bytes(bonker).sd + 1;
    void hold.set([{ visualId: 'unit.bonker', priority: SHEET_RANK.deck }, { visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.soon }]);
    expect(log).not.toContain(`lease hd ${mammoth}`);
    await tick(DEMOTE_CONFIRM_MS + 10);
    expect(log).toContain(`lease sd ${bonker}`);
    // the Bonker's HD copy stays until its 1x copy can draw: the Mammoth's HD load waits for that memory
    expect(log).not.toContain(`lease hd ${mammoth}`);
    await finish(`sd ${bonker}`);
    await tick(10);
    expect(log).toContain(`lease hd ${mammoth}`);
    // the 1x copy stays while the HD copy loads
    expect(log).not.toContain(`release sd ${mammoth}`);
    await finish(`hd ${mammoth}`);
    expect(upgraded).toContain(mammoth);
    expect(log).toContain(`release sd ${mammoth}`);
    hold.release();
  });

  it('a sheet lowered to 1x keeps its HD copy until the 1x copy can draw', async () => {
    const { art, log, finish, tick } = governed(1e12);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }]);
    await finish(`hd ${mammoth}`);
    art.sheetBudget = bytes(mammoth).sd + 1;
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next }]);
    // the step down waits for a second plan (the next age's rank keeps no hysteresis)
    expect(log).toEqual([`lease hd ${mammoth}`]);
    await tick(DEMOTE_CONFIRM_MS + 10);
    expect(log).toEqual([`lease hd ${mammoth}`, `lease sd ${mammoth}`]);
    await finish(`sd ${mammoth}`);
    expect(log).toEqual([`lease hd ${mammoth}`, `lease sd ${mammoth}`, `release hd ${mammoth}`]);
    expect(art.sheetPlan().moves).toBe(1);
    hold.release();
  });

  it('two holds share one plan, each sheet at its best rank (VS\'s warm-up and the battle)', async () => {
    const { art, log, finish, tick } = governed(bytes(mammoth).hd + bytes(bonker).sd + 1);
    const vs = art.holdArt();
    const battle = art.holdArt();
    void vs.set([{ visualId: 'unit.bonker' }, { visualId: 'unit.mammoth_matriarch' }]);
    // the warm-up's HD Bonker lands; the battle puts the Mammoth on the lane
    await finish(`hd ${bonker}`);
    await tick(HD_HOLD_MS);
    void battle.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.field }]);
    await tick(DEMOTE_CONFIRM_MS + 10);
    // the Mammoth on the lane takes the HD room once the Bonker (VS only, the deck rank) is on its 1x copy
    await finish(`sd ${bonker}`);
    await tick(10);
    expect(art.sheetPlan()).toMatchObject({ hd: 1, sd: 1, sdSources: [bonker] });
    expect(log.filter((l) => l.startsWith('lease'))).toContain(`lease hd ${mammoth}`);
    vs.release();
    battle.release();
  });

  it('S1: a step down to 1x waits for a plan a second later; a plan that wants HD again meanwhile cancels it', async () => {
    const { art, log, finish, tick } = governed(1e12);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next }]);
    await finish(`hd ${mammoth}`);
    await tick(HD_HOLD_MS);
    art.sheetBudget = bytes(mammoth).sd + 1;
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next }, { visualId: 'unit.bonker', priority: SHEET_RANK.next }]);
    // the Mammoth keeps HD (pinned) while the Bonker comes in at 1x
    expect(art.sheetPlan().sdSources).toEqual([bonker]);
    await tick(DEMOTE_CONFIRM_MS / 2);
    art.sheetBudget = 1e12;
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next }]);
    await tick(DEMOTE_CONFIRM_MS * 2);
    expect(log.filter((l) => l.includes(mammoth))).toEqual([`lease hd ${mammoth}`]);
    expect(art.sheetPlan().moves).toBe(0);
    hold.release();
  });

  it('S1: an HD load in flight is never dropped: it finishes, and as a fresh HD copy it keeps HD while the budget allows', async () => {
    const { art, log, finish, tick } = governed(bytes(mammoth).hd + bytes(bonker).sd + 1);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.soon }]);
    expect(log).toEqual([`lease hd ${mammoth}`]);
    // half a second later a better-ranked Bonker wants the room: the Mammoth's load goes on
    await tick(500);
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }, { visualId: 'unit.bonker', priority: SHEET_RANK.soon }]);
    await tick(DEMOTE_CONFIRM_MS * 3);
    expect(log).not.toContain(`release hd ${mammoth}`);
    expect(log).not.toContain(`lease sd ${mammoth}`);
    await finish(`hd ${mammoth}`);
    // landed: recent, so it keeps HD before the Bonker gets any (both fit only at 1x for the Bonker)
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }, { visualId: 'unit.bonker', priority: SHEET_RANK.soon }]);
    await tick(DEMOTE_CONFIRM_MS * 3);
    expect(art.sheetPlan().sdSources).toEqual([bonker]);
    expect(log).not.toContain(`release hd ${mammoth}`);
    hold.release();
  });

  it('S1: a recent HD copy keeps HD for HD_HOLD_MS while the budget allows, then gives way (a re-plan runs by itself)', async () => {
    const { art, log, finish, tick } = governed(bytes(mammoth).hd + bytes(bonker).sd + 1);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.soon }, { visualId: 'unit.bonker', priority: SHEET_RANK.deck }]);
    expect(art.sheetPlan().sdSources).toEqual([bonker]);
    await finish(`hd ${mammoth}`);
    await finish(`sd ${bonker}`);
    // the Bonker is queued: the Mammoth (deck, recent) still keeps HD and the Bonker stays 1x
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }, { visualId: 'unit.bonker', priority: SHEET_RANK.soon }]);
    await tick(HD_HOLD_MS / 2);
    expect(art.sheetPlan().sdSources).toEqual([bonker]);
    expect(log.filter((l) => l.startsWith('lease hd'))).toEqual([`lease hd ${mammoth}`]);
    // the hysteresis runs out with no new hold: the governor plans again, steps the Mammoth down a plan later,
    // and raises the Bonker once the Mammoth's HD copy has gone
    await tick(HD_HOLD_MS / 2 + 10);
    await tick(DEMOTE_CONFIRM_MS + 10);
    expect(log).toContain(`lease sd ${mammoth}`);
    expect(log).not.toContain(`lease hd ${bonker}`);
    await finish(`sd ${mammoth}`);
    await tick(10);
    expect(log).toContain(`lease hd ${bonker}`);
    // and never over the budget: the plan counts the copies it keeps
    expect(art.sheetPlan().plannedBytes).toBeLessThanOrEqual(art.sheetBudget);
    hold.release();
  });

  it('S1: the next deck before the hand-over (optional) loads only where its HD copy fits, never a 1x copy first', async () => {
    const { art, log } = governed(bytes(bonker).hd + bytes(mammoth).sd);
    const hold = art.holdArt();
    void hold.set([
      { visualId: 'unit.bonker', priority: SHEET_RANK.next, optional: true },
      { visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next, optional: true },
    ]);
    expect(log).toEqual([`lease hd ${bonker}`]);
    expect(art.sheetPlan()).toMatchObject({ hd: 1, sd: 0, none: 1 });
    // the hand-over: the deck rank, no longer optional; the Mammoth comes in at 1x, the Bonker's HD load goes on
    void hold.set([
      { visualId: 'unit.bonker', priority: SHEET_RANK.deck },
      { visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck },
    ]);
    expect(log).toEqual([`lease hd ${bonker}`, `lease sd ${mammoth}`]);
    expect(art.sheetPlan()).toMatchObject({ hd: 1, sd: 1, none: 0 });
    hold.release();
  });

  it('S1: a sheet whose side is leaving its age (noRaise) stays on its 1x copy although HD would fit', async () => {
    const { art, log, finish } = governed(bytes(mammoth).sd + 1);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }]);
    await finish(`sd ${mammoth}`);
    art.sheetBudget = 1e12;
    // queued once more just before the evolve: no HD load for it
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.soon, noRaise: true }]);
    expect(log).toEqual([`lease sd ${mammoth}`]);
    expect(art.sheetPlan().sdSources).toEqual([mammoth]);
    // another hold that does not say so (VS's warm-up, the other side's card) raises it
    const other = art.holdArt();
    void other.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }]);
    expect(log).toContain(`lease hd ${mammoth}`);
    other.release();
    hold.release();
  });

  it('S1: the next deck waits without a copy while the current deck steps down, then loads straight in HD (no 1x first)', async () => {
    // room for one of the two HD copies (and a 1x copy)
    const { art, log, finish, tick } = governed(bytes(mammoth).hd + bytes(mammoth).sd + 1);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }]);
    await finish(`hd ${mammoth}`);
    await tick(HD_HOLD_MS);
    // the hand-over: the Mammoth (current deck) ranks last; the next age's sheet (here the Bonker) can wait
    void hold.set([
      { visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next },
      { visualId: 'unit.bonker', priority: SHEET_RANK.deck, canWait: true },
    ]);
    // the step down waits for its confirmation, and the Bonker gets no copy meanwhile
    expect(log.filter((l) => l.includes(bonker))).toEqual([]);
    await tick(DEMOTE_CONFIRM_MS + 10);
    expect(log).toContain(`lease sd ${mammoth}`);
    // the Mammoth's HD copy is still in until its 1x copy can draw: still nothing for the Bonker
    expect(log.filter((l) => l.includes(bonker))).toEqual([]);
    await finish(`sd ${mammoth}`);
    expect(log).toContain(`release hd ${mammoth}`);
    await tick(10);
    // its HD load starts, never a 1x copy first
    expect(log.filter((l) => l.includes(bonker))).toEqual([`lease hd ${bonker}`]);
    hold.release();
  });

  it('review 2 S-b: a unit of an age its side is leaving that walks out on its 1x copy gets HD at once in the room above the budget, and no other copy steps down, also once units draw it', async () => {
    expect(createArtProvider({ warn: () => {}, unitSheets: 'match' }).leavingAllowance).toBe(LEAVING_LANE_BYTES);
    const bonkerX = bytes(bonker);
    expect(bonkerX.hd).toBeLessThanOrEqual(LEAVING_LANE_BYTES);
    // the budget holds the Mammoth's HD copy and the Bonker's 1x copy, no more
    const { art, log, finish, tick } = governed(bytes(mammoth).hd + bonkerX.sd + 1);
    const hold = art.holdArt();
    // a hand-over: the next deck's Mammoth gets its HD copy; the current deck's Bonker (stepped down) its 1x copy
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }, { visualId: 'unit.bonker', priority: SHEET_RANK.next, noRaise: true, leaving: true }]);
    expect(log).toEqual([`lease hd ${mammoth}`, `lease sd ${bonker}`]);
    await finish(`hd ${mammoth}`);
    await finish(`sd ${bonker}`);
    // the Bonker is trained once more and walks out on its 1x copy: its HD copy loads at once, in the leaving room
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }, { visualId: 'unit.bonker', priority: SHEET_RANK.field, leaving: true }]);
    expect(log).toContain(`lease hd ${bonker}`);
    await tick(DEMOTE_CONFIRM_MS * 3);
    // the next deck's fresh copy keeps HD: nothing steps down for the lane
    expect(log).not.toContain(`lease sd ${mammoth}`);
    expect(log).not.toContain(`release hd ${mammoth}`);
    // its HD copy lands and units draw it; after the Mammoth's hysteresis too, nothing steps down
    vi.spyOn(art.atlas, 'hdDrawn').mockImplementation((src) => src === bonker);
    await finish(`hd ${bonker}`);
    await tick(HD_HOLD_MS + DEMOTE_CONFIRM_MS * 3);
    expect(log).not.toContain(`lease sd ${mammoth}`);
    expect(log).not.toContain(`release hd ${mammoth}`);
    expect(art.sheetPlan().plannedBytes).toBeLessThanOrEqual(art.sheetBudget + LEAVING_LANE_BYTES);
    hold.release();
  });

  it('review 2 S-b: a unit not of a leaving age gets no room above the budget: the lane comes first, once the lowest copy has stepped down', async () => {
    const { art, log, finish, tick } = governed(bytes(mammoth).hd + bytes(bonker).sd + 1);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.soon }, { visualId: 'unit.bonker', priority: SHEET_RANK.deck }]);
    expect(log).toEqual([`lease hd ${mammoth}`, `lease sd ${bonker}`]);
    await finish(`hd ${mammoth}`);
    await finish(`sd ${bonker}`);
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }, { visualId: 'unit.bonker', priority: SHEET_RANK.field }]);
    // the Mammoth's step down waits for its confirmation, and the Bonker's HD load for the memory it frees
    expect(log).not.toContain(`lease hd ${bonker}`);
    await tick(DEMOTE_CONFIRM_MS + 10);
    expect(log).toContain(`lease sd ${mammoth}`);
    expect(log).not.toContain(`lease hd ${bonker}`);
    await finish(`sd ${mammoth}`);
    await tick(10);
    expect(log).toContain(`lease hd ${bonker}`);
    expect(art.sheetPlan().plannedBytes).toBeLessThanOrEqual(art.sheetBudget);
    hold.release();
  });

  it('review 2 B: a sheet whose HD file failed is planned at its 1x cost (it is the 1x file): no step down, no second copy', async () => {
    const { art, log, finish, tick } = governed(1e12);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }]);
    await finish(`hd ${mammoth}`);
    // its HD file failed: the battle copy is the 1x file
    vi.spyOn(art.atlas, 'hdFellBack').mockImplementation((src) => src === mammoth);
    await tick(HD_HOLD_MS);
    // room for the two 1x copies only: the Mammoth's "HD" copy fits at its 1x cost, so it keeps it
    art.sheetBudget = bytes(mammoth).sd + bytes(bonker).sd + 1;
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }, { visualId: 'unit.bonker', priority: SHEET_RANK.deck }]);
    await tick(DEMOTE_CONFIRM_MS + 10);
    expect(log).not.toContain(`lease sd ${mammoth}`);
    expect(log).toContain(`lease sd ${bonker}`);
    expect(art.sheetPlan().sdSources).toEqual([bonker]);
    hold.release();
  });

  it('S1: units leave the 1x copy for HD only once the HD copy is on the GPU; the 1x copy stays until then', async () => {
    const { art, log, finish, upgraded } = governed(bytes(mammoth).sd + 1);
    const onGpu = new Set<string>();
    vi.spyOn(art.atlas, 'hdOnGpu').mockImplementation((src) => onGpu.has(src));
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }]);
    await finish(`sd ${mammoth}`);
    // room for HD now: the HD copy loads beside the 1x copy
    art.sheetBudget = bytes(mammoth).hd + bytes(mammoth).sd + 1;
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.soon }]);
    expect(log).toContain(`lease hd ${mammoth}`);
    await finish(`hd ${mammoth}`);
    // loaded, but its upload waits (spaced out, or an evolve's quiet window): the units stay on the 1x copy
    expect(upgraded).not.toContain(mammoth);
    expect(log).not.toContain(`release sd ${mammoth}`);
    onGpu.add(mammoth);
    art.atlas.onHdUploaded?.(mammoth);
    expect(upgraded).toContain(mammoth);
    expect(log).toContain(`release sd ${mammoth}`);
    hold.release();
  });
});
