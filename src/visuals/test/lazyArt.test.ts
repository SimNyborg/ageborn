/**
 * What the game keeps decoded besides the unit sheets (iPhone memory, 2026-10-18):
 * - skins drawn by the procedural tier bake when a match or a stage holds them, not with their age;
 * - an age's preload for a battle loads the turret sheets its decks can build, not every turret of the age
 *   (`preloadMatch`), and no fort sheet (a battle's hold loads its decks' forts); `preload` stays whole;
 * - only bakes asked for as bulk go to the big atlas pages: a part another view bakes meanwhile takes a
 *   small page (a 173 px sail had a 2,048 px page to itself);
 * - the portrait stills cache keeps the most recently used few;
 * - the memory hook sorts decoded images by kind;
 * - a battle lets go of the turret and fort sheets of ages no side shows any more, never one a view draws;
 * - the page going away closes the decoded copies that would otherwise wait for the garbage collector.
 */
import { ImageSource, Texture, type CanvasSource } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { AtlasAdapter } from '../adapters/atlas';
import { LruLoads, PORTRAIT_STILLS_KEPT } from '../adapters/atlasPortrait';
import { WorldAtlas, type WorldSheet } from '../adapters/worldAtlas';
import { PartBaker } from '../bake';
import { MANIFEST } from '../manifest';
import { getPart } from '../parts/registry';
import { createArtProvider } from '../provider';
import { SKIN_PUPPETS } from '../skins';
import { memoryKind } from '../textureMemory';

const skinId = 'unit.bonker@pumpkin_head';

describe('skins bake when held (the game)', () => {
  it("an age's preload bakes no skin in the game; the gallery's provider still does", () => {
    expect(SKIN_PUPPETS.some((p) => p.id === skinId)).toBe(true);
    const game = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const listed = (art: ReturnType<typeof createArtProvider>): string[] => [...new Set(art.procedural.bakeListFor(['stone']).map((e) => e.puppet.id))];
    expect(listed(game)).not.toContain(skinId);
    const gallery = createArtProvider({ warn: () => {} });
    expect(listed(gallery)).toContain(skinId);
  });

  it('a hold and a stage bake the procedural skins they draw, once', async () => {
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const baked = vi.spyOn(art.procedural, 'prebake');
    expect(MANIFEST[skinId]?.kind).toBe('procedural');
    await art.holdArt().set([{ visualId: 'unit.bonker', skin: 'pumpkin_head' }, { visualId: 'unit.pebbler' }]);
    expect(baked).toHaveBeenCalledWith([MANIFEST[skinId]!.source]);
    const lease = art.showcaseLease({ visuals: [{ visualId: 'unit.bonker', skin: 'pumpkin_head' }] });
    await lease.ready;
    lease.release();
    expect(baked).toHaveBeenCalledTimes(2);
    // the parts are baked once: a second prebake of the same puppet adds nothing
    const before = art.procedural.baker.stats.parts;
    await art.procedural.prebake([MANIFEST[skinId]!.source]);
    expect(art.procedural.baker.stats.parts).toBe(before);
  });
});

describe('world sheets per match', () => {
  it('a battle preloads the turrets its decks can build; `preload` still loads every turret of the age', async () => {
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const ensured: string[] = [];
    vi.spyOn(art.atlas.world, 'ensure').mockImplementation((s) => (ensured.push(s), Promise.resolve(null)));
    const forts = vi.spyOn(art.forts, 'ensure').mockImplementation(() => Promise.resolve(null));
    const stoneTurrets = [...new Set(Object.values(MANIFEST).filter((d) => d.kind === 'atlas' && /art\/turrets\/stone\//.test(d.source)).map((d) => d.source))];
    expect(stoneTurrets.length).toBeGreaterThan(2);
    await art.preloadMatch({ ages: ['stone'], turrets: [{ visualId: 'turret.sapling_sling' }] });
    expect(ensured.filter((s) => s.includes('art/turrets/'))).toEqual([MANIFEST['turret.sapling_sling']!.source]);
    expect(ensured).toContain('art/bases/stone.json');
    // the battle's hold loads its decks' forts: no fort sheet with the age
    expect(forts).not.toHaveBeenCalled();
    ensured.length = 0;
    await art.preload(['stone']);
    expect(ensured.filter((s) => s.includes('art/turrets/')).sort()).toEqual(stoneTurrets.sort());
    expect(forts).not.toHaveBeenCalled();
  });

  it('outside the game every fort sheet of the age loads with it (dev pages, the gallery)', async () => {
    const art = createArtProvider({ warn: () => {} });
    const forts = vi.spyOn(art.forts, 'ensure').mockImplementation(() => Promise.resolve(null));
    vi.spyOn(art.atlas.world, 'ensure').mockImplementation(() => Promise.resolve(null));
    await art.preload(['stone']);
    expect(forts.mock.calls.length).toBeGreaterThan(2);
  });
});

/** A canvas stand-in for Node: any 2D call is a no-op. */
function fakeCanvas(w: number, h: number): HTMLCanvasElement {
  const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
  return { width: w, height: h, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

describe('bulk bakes', () => {
  it('after the seal only a bake asked for as bulk takes a big page; another bake meanwhile takes a small one', () => {
    vi.stubGlobal('Path2D', class {
      addPath(): void {}
    });
    const baker = new PartBaker({ pxPerLu: 1, canvasFactory: fakeCanvas });
    baker.seal();
    const a = getPart('fx.p.dust')!;
    const b = getPart('fx.p.spark')!;
    expect(a && b).toBeTruthy();
    const big = baker.get(a, {}, 0, { bulk: true });
    const small = baker.get(b, {});
    const size = (t: { source: unknown }): number => (t.source as CanvasSource).pixelWidth;
    expect(size(big.main)).toBe(2048);
    expect(size(small.main)).toBe(512);
    vi.unstubAllGlobals();
  });
});

describe('portrait stills', () => {
  it('keeps the most recently used stills; an evicted one loads again; a failed load is tried again', async () => {
    const loads: string[] = [];
    const ledger = new Set<string>();
    const lru = new LruLoads<string>(
      2,
      async (url) => {
        loads.push(url);
        if (url === 'bad') throw new Error('no');
        return url;
      },
      { kept: (u) => ledger.add(u), dropped: (u) => ledger.delete(u) },
    );
    await lru.get('a');
    await lru.get('b');
    await lru.get('a');
    await lru.get('c');
    // b was the least recently used
    expect(lru.has('b')).toBe(false);
    expect([...ledger].sort()).toEqual(['a', 'c']);
    await lru.get('b');
    expect(loads).toEqual(['a', 'b', 'c', 'b']);
    await expect(lru.get('bad')).rejects.toThrow();
    await Promise.resolve();
    expect(lru.has('bad')).toBe(false);
    expect(PORTRAIT_STILLS_KEPT).toBeGreaterThanOrEqual(16);
  });
});

describe('memory kinds (the dev memory hook)', () => {
  it('sorts decoded images by what they are', () => {
    expect(memoryKind('/ageborn/art/units/stone/bonker.hd.png')).toBe('unitHd');
    expect(memoryKind('/ageborn/art/units/stone/bonker.x.hd.png')).toBe('unitHd');
    expect(memoryKind('/ageborn/art/units/stone/bonker.png')).toBe('unitSd');
    expect(memoryKind('bake page 2048')).toBe('bake');
    expect(memoryKind('/ageborn/art/turrets/stone/rock_tosser.png')).toBe('world');
    expect(memoryKind('/ageborn/art/forts/stone/palisade.hd.png')).toBe('world');
    expect(memoryKind('/ageborn/art/backdrops/stone/far.webp')).toBe('backdrop');
    expect(memoryKind('backdrop painted ground.tar_pits')).toBe('backdrop');
    expect(memoryKind('/ageborn/art/portraits/bonker.png')).toBe('other');
  });
});

/** A stand-in ImageBitmap (Node has none): `close()` detaches it (0 x 0), as in the browser. */
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

/** A world sheet whose frames draw from one texture source with a fake bitmap. */
function worldSheet(): { sheet: WorldSheet; bitmap: FakeBitmap } {
  const bitmap = new FakeBitmap(64, 64);
  const source = new ImageSource({ resource: bitmap as unknown as ImageBitmap });
  return { sheet: { animations: { idle: [new Texture({ source })] }, luPerUnit: 1, meta: { heightLu: 50, pxPerLu: 1, clips: {} } }, bitmap };
}

describe("a battle's passed ages", () => {
  it('lets go of the turret and fort sheets of ages outside the kept ones, never one a view draws', async () => {
    const loads: string[] = [];
    const w = new WorldAtlas((s) => s, async (url) => (loads.push(url), worldSheet().sheet));
    for (const s of ['art/turrets/stone/a.json', 'art/turrets/stone/b.json', 'art/turrets/bronze/c.json']) await w.ensure(s);
    const view = w.retain('art/turrets/stone/b.json');
    expect(w.release((s) => s.includes('/stone/'))).toBe(1);
    expect(w.get('art/turrets/stone/a.json')).toBeUndefined();
    expect(w.get('art/turrets/stone/b.json')).toBeDefined();
    expect(w.get('art/turrets/bronze/c.json')).toBeDefined();
    view();
    view(); // idempotent
    expect(w.viewCount('art/turrets/stone/b.json')).toBe(0);
    expect(w.release((s) => s.includes('/stone/'))).toBe(1);
    // asked for again, it loads again
    await w.ensure('art/turrets/stone/a.json');
    expect(loads.filter((u) => u === 'art/turrets/stone/a.json')).toHaveLength(2);
  });

  it('a sheet asked for again while it is being unloaded loads again only once that is done (review N2)', async () => {
    const loads: string[] = [];
    let unloaded: () => void = () => undefined;
    const w = new WorldAtlas(
      (s) => s,
      async (url) => (loads.push(url), worldSheet().sheet),
      () => new Promise<void>((r) => (unloaded = r)),
    );
    await w.ensure('art/turrets/stone/a.json');
    expect(w.release((s) => s.includes('/stone/'))).toBe(1);
    const again = w.ensure('art/turrets/stone/a.json');
    await Promise.resolve();
    await Promise.resolve();
    // the second load waits for the unload of the first copy
    expect(loads).toEqual(['art/turrets/stone/a.json']);
    unloaded();
    expect(await again).not.toBeNull();
    expect(loads).toEqual(['art/turrets/stone/a.json', 'art/turrets/stone/a.json']);
  });

  it("the provider's releaseAges keeps the given ages and the game's mode only", () => {
    const game = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const turrets = vi.spyOn(game.atlas.world, 'release');
    const forts = vi.spyOn(game.forts, 'release');
    game.releaseAges(['bronze', 'medieval']);
    const keepT = turrets.mock.calls[0]![0];
    expect(keepT('art/turrets/stone/rock_tosser.json')).toBe(true);
    expect(keepT('art/turrets/bronze/archer_tower.json')).toBe(false);
    expect(keepT('art/bases/stone.json')).toBe(false);
    const keepF = forts.mock.calls[0]![0];
    expect(keepF('art/forts/stone/palisade.hd.json')).toBe(true);
    expect(keepF('art/forts/medieval/levy_camp.hd.json')).toBe(false);
    const gallery = createArtProvider({ warn: () => {} });
    expect(gallery.releaseAges(['stone'])).toBe(0);
  });
});

describe('the opening bases and the stand-in counters (review S2, N7)', () => {
  it('counts the turrets and bases drawn by their stand-ins, and those still alive (the e2e budget asserts them)', () => {
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const turret = Object.keys(MANIFEST).find((k) => k.startsWith('turret.') && MANIFEST[k]!.kind === 'atlas')!;
    // no sheet loads in Node: both draw their procedural stand-ins
    const t = art.createTurret({ visualId: turret, side: 0, teamPreset: 'default' });
    const b = art.createBase({ age: 'gunpowder', side: 0, teamPreset: 'default' });
    expect(art.fallbacks).toMatchObject({ units: 0, turrets: 1, bases: 1, forts: 0, turretsNow: 1, basesNow: 1 });
    // a stand-in the battle replaced by its sheet's view (review 2 S-c) no longer counts while it fades out, nor
    // when it goes; only the made count stays
    art.replacedStandIn(t);
    expect(art.fallbacks).toMatchObject({ turrets: 1, bases: 1, turretsNow: 0, basesNow: 1 });
    t.destroy();
    t.destroy();
    b.destroy();
    art.replacedStandIn(b);
    expect(art.fallbacks).toMatchObject({ turrets: 1, bases: 1, turretsNow: 0, basesNow: 0 });
    // a turret whose sheet is in draws from it, and counts nowhere
    const def = MANIFEST[turret]!;
    art.atlas.world.register(def.source, worldSheet().sheet);
    expect(art.atlas.canDraw('turret', def)).toBe(true);
    art.createTurret({ visualId: turret, side: 0, teamPreset: 'default' }).destroy();
    expect(art.fallbacks).toMatchObject({ turrets: 1, turretsNow: 0 });
  });

  it('turretSheetReady is null once the turret\'s sheet is in, else it loads it (review 2 S-c)', async () => {
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const turret = Object.keys(MANIFEST).find((k) => k.startsWith('turret.') && MANIFEST[k]!.kind === 'atlas')!;
    const src = MANIFEST[turret]!.source;
    let land: (s: WorldSheet | null) => void = () => undefined;
    const loading = new Promise<WorldSheet | null>((r) => (land = r));
    const ensured: string[] = [];
    vi.spyOn(art.atlas.world, 'ensure').mockImplementation((s) => (ensured.push(s), s === src ? loading : Promise.resolve(null)));
    const ready = art.turretSheetReady({ visualId: turret });
    expect(ready).not.toBeNull();
    expect(ensured).toEqual([src]);
    land(worldSheet().sheet);
    await ready;
    art.atlas.world.register(src, worldSheet().sheet);
    expect(art.turretSheetReady({ visualId: turret })).toBeNull();
    // a forced tier draws its own turrets, and a unit or unknown visual has no turret sheet to wait for
    expect(createArtProvider({ warn: () => {}, unitSheets: 'match', force: 'procedural' }).turretSheetReady({ visualId: turret })).toBeNull();
    expect(art.turretSheetReady({ visualId: 'unit.bonker' })).toBeNull();
  });

  it('baseSheetReady is null once the age\'s plain base sheet is in, else it loads it; VS waits for it', async () => {
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const src = MANIFEST['base.gunpowder']!.source;
    expect(src).toBe('art/bases/gunpowder.json');
    let land: (s: WorldSheet | null) => void = () => undefined;
    // one load in flight, shared by every caller (as WorldAtlas.ensure does)
    const loading = new Promise<WorldSheet | null>((r) => (land = r));
    const ensured: string[] = [];
    vi.spyOn(art.atlas.world, 'ensure').mockImplementation((s) => {
      ensured.push(s);
      return s === src ? loading : Promise.resolve(null);
    });
    const ready = art.baseSheetReady('gunpowder');
    expect(ready).not.toBeNull();
    expect(ensured).toEqual([src]);
    // VS's warm-up of a match opening in Gunpowder waits for the same sheet
    let warmed = false;
    void art.prefetchMatch({ age: 'gunpowder', sides: [{}, {}] }).then(() => (warmed = true));
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(warmed).toBe(false);
    land(worldSheet().sheet);
    await ready;
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(warmed).toBe(true);
    art.atlas.world.register(src, worldSheet().sheet);
    expect(art.baseSheetReady('gunpowder')).toBeNull();
    // a forced tier other than the sheets draws its own bases: nothing to wait for
    expect(createArtProvider({ warn: () => {}, unitSheets: 'match', force: 'procedural' }).baseSheetReady('gunpowder')).toBeNull();
  });
});

describe('the page going away', () => {
  it('closes the decoded copies the sheets still hold and empties the atlas pages', async () => {
    vi.stubGlobal('ImageBitmap', FakeBitmap);
    vi.stubGlobal('Path2D', class {
      addPath(): void {}
    });
    try {
      // a unit sheet whose copy still waits for its upload (no renderer here)
      const bitmap = new FakeBitmap(32, 32);
      const def = MANIFEST['unit.bonker']!;
      const art = createArtProvider({ warn: () => {} });
      const a = new AtlasAdapter({ entries: () => [def], decor: art.procedural.baker, baseUrl: '/', lazyUnits: true, load: async () => ({ luPerUnit: 1, animations: { idle: [new Texture()] }, clips: {}, source: new ImageSource({ resource: bitmap as unknown as ImageBitmap }) }) });
      await a.lease(def.source).core;
      expect(bitmap.width).toBe(32);
      a.releaseDecoded();
      expect(bitmap.width).toBe(0);
      // a world sheet's bitmap
      const w = new WorldAtlas((s) => s, async () => sheet);
      const { sheet, bitmap: wb } = worldSheet();
      await w.ensure('art/bases/stone.json');
      w.releaseDecoded();
      expect(wb.width).toBe(0);
      // the atlas pages' canvases
      const baker = new PartBaker({ pxPerLu: 1, canvasFactory: fakeCanvas });
      baker.get(getPart('fx.p.dust')!, {}, 0, { bulk: true });
      baker.releaseCanvases();
      for (const c of baker.pageCanvases()) expect(c.width).toBe(0);
      // the provider's releaseAll does all of it
      const game = createArtProvider({ warn: () => {}, unitSheets: 'match' });
      const calls = [vi.spyOn(game.atlas, 'releaseDecoded'), vi.spyOn(game.atlas.world, 'releaseDecoded'), vi.spyOn(game.forts, 'releaseDecoded'), vi.spyOn(game.procedural.baker, 'releaseCanvases')];
      game.releaseAll();
      for (const c of calls) expect(c).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
