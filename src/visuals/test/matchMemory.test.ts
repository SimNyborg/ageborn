/**
 * Review 2 (Safari memory): a match lets go of what the menus left decoded. Customize browsing every age
 * left about 140 MB of scene strips and grounds and 40 MB of base and skin model sheets for the session,
 * and a battle right after went over the iPhone budget (926 MB of 600 at DPR 2).
 *
 * - The shared scene file cache forgets what a match does not open with; a load in flight resolves for its
 *   callers but is not kept; a classic scene's folder (an age's folder) never takes its other scenes along.
 * - The backdrop textures drop the strips, props atlases, grounds and painted stand-ins outside the keep,
 *   with the themed copies made from them and their decoded files; a scene loading when it is forgotten
 *   keeps nothing when it lands.
 * - The world sheet caches drop the base and skin model sheets the match does not open with.
 * - The provider's `beginMatch` keeps each half's opening scene, the arena ground and the opening age's
 *   skin models; the VS warm-up calls it too (every ground stays there).
 * - A battle's hold lets go of a sheet at once (a card showcase keeps its linger).
 */
import { BufferImageSource, Texture } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VisualDef } from '@/contracts/art';
import { AtlasAdapter, LEASE_LINGER_MS, type AtlasData } from '../adapters/atlas';
import { BackdropTextures, type PropFrame } from '../adapters/procedural/backdropView';
import { WorldAtlas, type WorldSheet } from '../adapters/worldAtlas';
import { forgetWorldSheets, loadWorldSheet } from '../adapters/worldPortrait';
import { forgetSceneImages, inSceneDir, sceneImage, sceneImageUrls } from '../backdrops/sceneFiles';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';
import { imageLedger } from '../textureMemory';

/** A stand-in `Image` (Node has none): it loads when the test says so. */
class FakeImage {
  static made: FakeImage[] = [];
  decoding = '';
  naturalWidth = 8;
  naturalHeight = 4;
  width = 8;
  height = 4;
  complete = true;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  constructor() {
    FakeImage.made.push(this);
  }
  decode(): Promise<void> {
    return Promise.resolve();
  }
}

/** Loads every fake image made so far whose URL matches (or all). */
function land(match: (url: string) => boolean = () => true): void {
  for (const im of FakeImage.made.splice(0)) {
    if (match(im.src)) im.onload?.();
    else FakeImage.made.push(im);
  }
}

async function settle(): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

function useFakeImages(): void {
  FakeImage.made = [];
  vi.stubGlobal('Image', FakeImage);
  forgetSceneImages(() => false);
}

afterEach(() => {
  forgetSceneImages(() => false);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const painted = (): { tex: Texture; ambient: [] } => ({ tex: new Texture({ source: new BufferImageSource({ resource: new Uint8Array(16), width: 2, height: 2 }) }), ambient: [] });

describe('the shared scene file cache', () => {
  it('forgets the images a match does not keep; a forgotten file loads again when asked', async () => {
    useFakeImages();
    const urls = ['/b/art/backdrops/stone/classic/far.webp', '/b/art/backdrops/stone/glacier_valley/far.webp', '/b/art/ground/tar_pits.webp'];
    const loads = urls.map((u) => sceneImage(u));
    land();
    await Promise.all(loads);
    expect(sceneImageUrls().sort()).toEqual([...urls].sort());
    expect(imageLedger('sceneImages').size).toBe(3);
    const gone = forgetSceneImages((u) => u.includes('/art/ground/'));
    expect([...gone].sort()).toEqual(urls.slice(0, 2).sort());
    expect(sceneImageUrls()).toEqual(['/b/art/ground/tar_pits.webp']);
    expect(imageLedger('sceneImages').size).toBe(1);
    // asked again: a new load (the browser's HTTP cache has the file)
    const again = sceneImage(urls[0]!);
    expect(FakeImage.made).toHaveLength(1);
    land();
    await again;
    expect(imageLedger('sceneImages').size).toBe(2);
  });

  it('a load in flight when it is forgotten resolves for its callers, uncounted and unkept', async () => {
    useFakeImages();
    const url = '/b/art/backdrops/bronze/classic/mid.webp';
    const p = sceneImage(url);
    forgetSceneImages(() => false);
    land();
    const im = await p;
    expect(im).toBeInstanceOf(FakeImage);
    expect(sceneImageUrls()).toEqual([]);
    expect(imageLedger('sceneImages').size).toBe(0);
    // the next ask starts its own load
    void sceneImage(url);
    expect(FakeImage.made).toHaveLength(1);
  });

  it("only the files directly in a scene's folder belong to it (not a nested folder's)", () => {
    expect(inSceneDir('/b/art/backdrops/stone/classic/far.webp', '/b/art/backdrops/stone/classic/')).toBe(true);
    expect(inSceneDir('/b/art/backdrops/stone/glacier_valley/far.webp', '/b/art/backdrops/stone/classic/')).toBe(false);
    expect(inSceneDir('/b/art/backdrops/stone/glacier_valley/far.webp', '/b/art/backdrops/stone/')).toBe(false);
    expect(inSceneDir('/b/art/backdrops/stone/glacier_valley/far.webp', '/b/art/backdrops/stone/glacier_valley/')).toBe(true);
  });
});

describe("the provider's backdrop textures", () => {
  type Priv = {
    images: Map<string, { tex: Texture; ambient: unknown[] }>;
    requested: Map<string, object>;
    cache: Map<string, { tex: Texture; ambient: unknown[] }>;
    props: Map<string, Map<string, PropFrame>>;
    scenes: Map<string, unknown>;
    canBake: boolean;
  };

  it('let go of the strips, props, grounds and painted stand-ins outside the keep, with their themed copies and files', async () => {
    useFakeImages();
    const files = ['/b/art/backdrops/bronze/classic/far.webp', '/b/art/backdrops/stone/glacier_valley/far.webp', '/b/art/backdrops/stone/classic/far.webp', '/b/art/ground/frostfang.webp', '/b/art/ground/tar_pits.webp'];
    const loads = files.map((u) => sceneImage(u));
    land();
    await Promise.all(loads);
    const t = new BackdropTextures('high', '/b/', true);
    const priv = t as unknown as Priv;
    const keepFar = painted();
    const dropFar = painted();
    const keepGround = painted();
    const dropGround = painted();
    const themed = painted();
    const atlas = painted();
    priv.images.set('far.stone.glacier_valley', keepFar);
    priv.images.set('far.bronze.classic', dropFar);
    priv.images.set('ground.tar_pits', keepGround);
    priv.images.set('ground.frostfang', dropGround);
    for (const k of ['stone.glacier_valley', 'bronze.classic', 'ground.tar_pits', 'ground.frostfang']) priv.requested.set(k, {});
    priv.cache.set(`far.bronze@starry_night~p#${dropFar.tex.source.uid}`, themed);
    for (const k of ['sky.stone', 'sky.stone.glacier_valley', 'sky.bronze', 'mid.bronze', 'ground.tar_pits', 'ground.frostfang']) priv.cache.set(k, painted());
    priv.props.set('bronze.classic', new Map([['gull', { tex: atlas.tex, ax: 0.5, ay: 1, ppl: 1 }]]));
    priv.props.set('stone.glacier_valley', new Map([['crow', { tex: painted().tex, ax: 0.5, ay: 1, ppl: 1 }]]));
    const unloaded: string[] = [];
    for (const [name, p] of Object.entries({ keepFar, dropFar, keepGround, dropGround, themed, atlas })) vi.spyOn(p.tex.source, 'unload').mockImplementation(() => void unloaded.push(name));
    const v0 = t.version;
    t.forget({ scenes: new Set(['stone.glacier_valley']), ages: new Set(['stone']), grounds: new Set(['tar_pits']) });
    expect([...priv.images.keys()].sort()).toEqual(['far.stone.glacier_valley', 'ground.tar_pits']);
    expect([...priv.requested.keys()].sort()).toEqual(['ground.tar_pits', 'stone.glacier_valley']);
    expect([...priv.cache.keys()].sort()).toEqual(['ground.tar_pits', 'sky.stone', 'sky.stone.glacier_valley']);
    expect([...priv.props.keys()]).toEqual(['stone.glacier_valley']);
    expect(unloaded.sort()).toEqual(['atlas', 'dropFar', 'dropGround', 'themed']);
    expect(t.version).toBeGreaterThan(v0);
    // the decoded files of what was dropped (Stone's classic was never asked for by the lane: the provider's
    // `beginMatch` forgets the stills' files itself)
    expect(sceneImageUrls().sort()).toEqual(['/b/art/backdrops/stone/classic/far.webp', '/b/art/backdrops/stone/glacier_valley/far.webp', '/b/art/ground/tar_pits.webp']);
    // after a wipe every ground stays
    priv.images.set('ground.frostfang', painted());
    t.release(new Set(['stone.glacier_valley']));
    expect(priv.images.has('ground.frostfang')).toBe(true);
  });

  it('a scene forgotten while its files are on the way keeps none of them when they land', async () => {
    useFakeImages();
    const json = import.meta.glob('/public/art/backdrops/stone/glacier_valley/layers.json', { import: 'default', eager: true })['/public/art/backdrops/stone/glacier_valley/layers.json'];
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => json }));
    const run = async (forgetMidway: boolean): Promise<Priv> => {
      const t = new BackdropTextures('high', '/x/', true);
      const priv = t as unknown as Priv;
      priv.canBake = true;
      t.prefetch([], [], [{ age: 'stone', scene: 'glacier_valley' }]);
      await settle();
      expect(priv.scenes.has('stone.glacier_valley')).toBe(true);
      if (forgetMidway) t.forget({ scenes: new Set(), ages: new Set(), grounds: null });
      land();
      await settle();
      return priv;
    };
    const kept = await run(false);
    expect(kept.images.size).toBeGreaterThan(0);
    forgetSceneImages(() => false);
    const dropped = await run(true);
    expect(dropped.images.size).toBe(0);
    expect(dropped.props.size).toBe(0);
    expect(dropped.requested.size).toBe(0);
  });
});

describe('the world sheet caches', () => {
  it('the menus\' loader forgets the sheets not kept; a load in flight is not counted', async () => {
    useFakeImages();
    vi.stubGlobal('location', { href: 'http://localhost/' });
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ frames: {}, animations: {}, meta: { image: 'x.png' } }) }));
    const a = loadWorldSheet('/b/art/bases/skins/mossy_den.json');
    const b = loadWorldSheet('/b/art/bases/stone.json');
    await settle();
    land();
    await Promise.all([a, b]);
    expect(imageLedger('worldSheets').size).toBe(2);
    expect(forgetWorldSheets((u) => u.endsWith('mossy_den.json'))).toBe(1);
    expect(imageLedger('worldSheets').size).toBe(1);
    // in flight when forgotten: resolves, uncounted; the next ask loads again
    const c = loadWorldSheet('/b/art/bases/bronze.json');
    forgetWorldSheets(() => false);
    await settle();
    land();
    expect(await c).not.toBeNull();
    expect(imageLedger('worldSheets').size).toBe(0);
  });

  it('the world atlas drops the skin models not kept (their GPU copies too) and keeps the age sheets', async () => {
    const sheet = (): WorldSheet => ({ animations: { body: [painted().tex] }, luPerUnit: 1, meta: { heightLu: 100, pxPerLu: 1, clips: {} } });
    const atlas = new WorldAtlas((s) => s, async () => sheet());
    const skins = ['art/bases/skins/mossy_den.json', 'art/bases/skins/frost_cave.json'];
    for (const s of [...skins, 'art/bases/stone.json']) await atlas.ensure(s);
    const unload = vi.spyOn(atlas.get(skins[1]!)!.animations['body']![0]!.source, 'unload');
    // one still on the way when the match starts
    const late = atlas.ensure('art/bases/skins/snowy_keep.json');
    expect(atlas.forgetSkins((s) => s === skins[0])).toBe(1);
    await late;
    expect(atlas.get(skins[0]!)).toBeDefined();
    expect(atlas.get(skins[1]!)).toBeUndefined();
    expect(atlas.get('art/bases/skins/snowy_keep.json')).toBeUndefined();
    expect(atlas.get('art/bases/stone.json')).toBeDefined();
    expect(unload).toHaveBeenCalled();
  });
});

describe("the provider's match start", () => {
  it('beginMatch keeps each half\'s opening scene, the arena ground and the opening skin models', () => {
    const art = createArtProvider({ warn: () => {} });
    const forget = vi.spyOn(art.procedural.backdrops, 'forget');
    const skins = vi.spyOn(art.atlas.world, 'forgetSkins');
    art.beginMatch({ arena: 'frostfang', sides: [{ age: 'stone', scene: 'scene.glacier_valley', skin: 'mossy_den' }, { age: 'stone', scene: null, skin: null }] });
    const keep = forget.mock.calls[0]![0];
    expect([...keep.scenes].sort()).toEqual(['stone.classic', 'stone.glacier_valley']);
    expect([...keep.ages]).toEqual(['stone']);
    expect([...(keep.grounds ?? [])]).toEqual(['frostfang']);
    const keepSkin = skins.mock.calls[0]![0];
    expect(keepSkin(MANIFEST['base.stone@mossy_den']!.source)).toBe(true);
    expect(keepSkin('art/bases/skins/frost_cave.json')).toBe(false);
  });

  it('the VS warm-up lets go of the menus\' leftovers first and keeps every ground', async () => {
    const art = createArtProvider({ warn: () => {} });
    const calls: unknown[] = [];
    art.beginMatch = (o) => void calls.push(o);
    await art.prefetchMatch({ age: 'bronze', sides: [{ scenes: { bronze: 'scene.aegean_harbour' } }, {}] });
    expect(calls).toEqual([{ arena: null, sides: [{ age: 'bronze', scene: 'scene.aegean_harbour', skin: null }, { age: 'bronze', scene: null, skin: null }] }]);
  });

  it("a battle's hold lets go of a sheet at once; a card showcase's lease keeps the linger", async () => {
    vi.useFakeTimers();
    const def = MANIFEST['unit.bonker'] as VisualDef & { source: string };
    const unloads: string[] = [];
    const data = (): AtlasData => ({ luPerUnit: 1, animations: { idle: [new Texture()] }, clips: { idle: { durationsMs: [100], loop: true } } });
    const art = createArtProvider({ warn: () => {}, unitSheets: 'match' });
    const a = new AtlasAdapter({
      entries: () => [{ ...def, clips: { idle: def.clips['idle']! } }],
      decor: art.procedural.baker,
      baseUrl: '/b/',
      lazyUnits: true,
      load: async () => data(),
      unload: (url) => void unloads.push(url),
    });
    (art as unknown as { atlas: AtlasAdapter }).atlas = a;
    const hold = art.holdArt();
    await hold.set([{ visualId: 'unit.bonker' }]);
    expect(a.hasSheet(def.source)).toBe(true);
    await hold.set([]);
    await vi.advanceTimersByTimeAsync(1);
    await settle();
    expect(unloads).toEqual(['/b/art/units/stone/bonker.json']);
    // a showcase's lease still lingers
    const show = a.lease(def.source, { cpu: false });
    await show.core;
    show.release();
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS / 2);
    await settle();
    expect(unloads).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(LEASE_LINGER_MS);
    await settle();
    expect(unloads).toHaveLength(2);
  });
});
