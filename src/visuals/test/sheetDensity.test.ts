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
import { DEMOTE_CONFIRM_MS, HD_HOLD_MS, SHEET_RANK, unitSheetBytes } from '../sheetBudget';

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
