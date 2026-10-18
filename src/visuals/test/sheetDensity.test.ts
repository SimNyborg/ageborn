/**
 * The memory governor's two copies of a unit sheet on an HD screen (iPhone memory, 2026-10-18): a 1x lease
 * (`density: 'sd'`) loads the plain sheet next to the battle's HD set, units draw from it while no HD copy is
 * held, a view on the 1x copy switches to HD once that has loaded (same frames, the scale follows the
 * density), and the 1x copy then unloads. The provider plans every hold's sheets together: the lane and the
 * queue get HD first, the rest 1x within the budget, and a sheet moving between copies keeps the one it has
 * until the other can draw, so no unit is ever without its art.
 */
import { Texture } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VisualDef } from '@/contracts/art';
import { AtlasAdapter, LEASE_LINGER_MS, type AtlasData, type SheetLease } from '../adapters/atlas';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';
import { SHEET_RANK, unitSheetBytes } from '../sheetBudget';

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

/** A provider on an HD screen whose atlas leases are recorded (and resolve when the test says). */
function governed(budgetBytes: number) {
  const art = createArtProvider({ warn: () => {}, unitSheets: 'match', dpr: 2, hdDpr: 2, worldPxPerLu: 1 });
  art.sheetBudget = budgetBytes;
  expect(art.atlas.hdScreen).toBe(true);
  const live = new Map<string, { density: 'hd' | 'sd'; lease: SheetLease; done: () => void; released: boolean }>();
  const log: string[] = [];
  vi.spyOn(art.atlas, 'lease').mockImplementation((src, o) => {
    const density = o?.density === 'sd' ? 'sd' : 'hd';
    let done = (): void => undefined;
    const ready = new Promise<void>((r) => (done = r));
    const entry = { density, done, released: false, lease: { ready, core: ready, hd: false, release: () => ((entry.released = true), log.push(`release ${density} ${src}`)) } };
    live.set(`${density} ${src}`, entry as never);
    log.push(`lease ${density} ${src}`);
    return entry.lease;
  });
  // the atlas reports what has "loaded" by the leases the test completed
  const loaded = new Set<string>();
  vi.spyOn(art.atlas, 'hasSheet').mockImplementation((src) => loaded.has(`hd ${src}`));
  vi.spyOn(art.atlas, 'hasSdSheet').mockImplementation((src) => loaded.has(`sd ${src}`));
  vi.spyOn(art.atlas, 'canDrawSource').mockImplementation((src) => loaded.has(`hd ${src}`) || loaded.has(`sd ${src}`));
  const upgraded: string[] = [];
  vi.spyOn(art.atlas, 'upgradeViews').mockImplementation((src) => (upgraded.push(src), 0));
  const finish = async (key: string): Promise<void> => {
    loaded.add(key);
    live.get(key)?.done();
    await settle();
  };
  return { art, log, live, finish, upgraded };
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
    expect(art.sheetPlan()).toMatchObject({ hd: 1, sd: 1, sdSources: [mammoth], hdScreen: true });
    hold.release();
    expect(log.slice(2).sort()).toEqual([`release hd ${bonker}`, `release sd ${mammoth}`].sort());
  });

  it('a sheet raised to HD keeps its 1x copy until the HD copy can draw, then its 1x views switch over', async () => {
    const { art, log, finish, upgraded } = governed(bytes(mammoth).hd + bytes(bonker).hd);
    const hold = art.holdArt();
    // the Mammoth waits in the next age, the Bonker is on the lane: only one fits in HD
    art.sheetBudget = bytes(bonker).hd + bytes(mammoth).sd + 1;
    void hold.set([{ visualId: 'unit.bonker', priority: SHEET_RANK.field }, { visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next }]);
    await finish(`sd ${mammoth}`);
    await finish(`hd ${bonker}`);
    // the Bonker leaves the lane and the Mammoth is queued: room for it now (its 1x copy counts until the
    // HD copy has loaded)
    art.sheetBudget = bytes(mammoth).hd + bytes(mammoth).sd + bytes(bonker).sd + 1;
    void hold.set([{ visualId: 'unit.bonker', priority: SHEET_RANK.deck }, { visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.soon }]);
    expect(log).toContain(`lease hd ${mammoth}`);
    // the 1x copy stays while the HD copy loads
    expect(log).not.toContain(`release sd ${mammoth}`);
    await finish(`hd ${mammoth}`);
    expect(upgraded).toContain(mammoth);
    expect(log).toContain(`release sd ${mammoth}`);
    hold.release();
  });

  it('a sheet lowered to 1x keeps its HD copy until the 1x copy can draw', async () => {
    const { art, log, finish } = governed(1e12);
    const hold = art.holdArt();
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.deck }]);
    await finish(`hd ${mammoth}`);
    art.sheetBudget = bytes(mammoth).sd + 1;
    void hold.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.next }]);
    expect(log).toEqual([`lease hd ${mammoth}`, `lease sd ${mammoth}`]);
    await finish(`sd ${mammoth}`);
    expect(log).toEqual([`lease hd ${mammoth}`, `lease sd ${mammoth}`, `release hd ${mammoth}`]);
    expect(art.sheetPlan().moves).toBe(1);
    hold.release();
  });

  it('two holds share one plan, each sheet at its best rank (VS\'s warm-up and the battle)', async () => {
    const { art, log } = governed(bytes(mammoth).hd + bytes(bonker).sd + 1);
    const vs = art.holdArt();
    const battle = art.holdArt();
    void vs.set([{ visualId: 'unit.bonker' }, { visualId: 'unit.mammoth_matriarch' }]);
    void battle.set([{ visualId: 'unit.mammoth_matriarch', priority: SHEET_RANK.field }]);
    // the Mammoth on the lane takes the HD room; the Bonker (VS only, the deck rank) stays 1x
    expect(art.sheetPlan()).toMatchObject({ hd: 1, sd: 1, sdSources: [bonker] });
    expect(log.filter((l) => l.startsWith('lease'))).toContain(`lease hd ${mammoth}`);
    vs.release();
    battle.release();
  });
});
