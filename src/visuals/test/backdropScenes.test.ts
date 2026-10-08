/**
 * Backdrop scenes (PLAN 2b): the layer format v1 and v2 loader, the art on disk within its budget and
 * the colour rule, the sprite runtime (deterministic from the render clock, still under Reduce motion,
 * within the per-half limits), the `celestial: 'own'` and `weather: 'space'` hints, night lights, the
 * arrival cross-fade from the code-painted stand-in, scenes through the seam and an evolve wipe, and the
 * GPU release after a wipe. Owned by Track A.
 */
import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { AgeId } from '@/contracts/ids';
import { ageRegions, ARRIVAL_FADE_MS, composePieces, FadeTracker, ProceduralBackdropView, type BackdropTextures, type PropFrame } from '../adapters/procedural/backdropView';
import { PartBaker } from '../bake';
import { BACK_FRAME, drawnScene, parseScene, SCENE_ART, sceneDir, sceneIdOf, sceneThumbPath, type SceneData } from '../backdrops/scenes';
import { limitSprites, lightAlpha, pathPoint, readSprites, spriteInstances, spritePhaseMs, SPRITE_LIMITS, type PathSprite, type SceneSprite } from '../backdrops/sceneSprites';
import { BACK_GRADE_SCALE, BACKDROP_THEMES, isNightSky, sceneGradeKey, spaceWeather, themeForScene, themeSky } from '../backdrops/themes';
import { WORLD } from '../style';

const LAYERS_JSON = import.meta.glob('/public/art/backdrops/**/layers.json', { import: 'default', eager: true }) as Record<string, unknown>;
const WEBP = import.meta.glob('/public/art/backdrops/**/*.webp', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;
const CHECKS = import.meta.glob('/art/blender/world/scenes/checks.json', { import: 'default', eager: true }) as Record<string, Record<string, { sizes: Record<string, number>; total: number; rule: Record<string, number> }>>;

/** Bytes of a file inlined as a base64 data URL. */
function bytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
}

const AGES = Object.keys(SCENE_ART) as AgeId[];
const ART = AGES.flatMap((age) => Object.entries(SCENE_ART[age] ?? {}).map(([scene, format]) => ({ age, scene, format })));
const BUDGET: Record<string, number> = { 'back.webp': 14 * 1024, 'far.webp': 38 * 1024, 'mid.webp': 48 * 1024, 'props.webp': 14 * 1024, 'thumb.webp': 8 * 1024 };

describe('scene art on disk (PLAN 2b)', () => {
  it('every scene with art has its files, in its format', () => {
    for (const { age, scene, format } of ART) {
      const dir = `/public/${sceneDir(age, scene)}`;
      const json = LAYERS_JSON[`${dir}layers.json`];
      expect(json, `${age}.${scene} layers.json`).toBeDefined();
      const data = parseScene(json, age, scene);
      expect(data?.version, `${age}.${scene}`).toBe(format);
      for (const l of Object.values(data?.layers ?? {})) expect(WEBP[`${dir}${l.image}`], `${dir}${l.image}`).toBeDefined();
      if (data?.props) expect(WEBP[`${dir}${data.props.image}`]).toBeDefined();
      // every scene has a tile thumbnail (format 1 classics got theirs from their strips)
      expect(WEBP[`/public/${sceneThumbPath(age, scene)}`], `${age}.${scene} thumb`).toBeDefined();
    }
    // every age has its classic scene (Bronze, Industrial and Cosmic got their first Blender layers)
    for (const age of AGES) expect(SCENE_ART[age]?.['classic'], age).toBeDefined();
    expect(SCENE_ART.bronze?.['classic']).toBe(2);
    expect(SCENE_ART.industrial?.['classic']).toBe(2);
    expect(SCENE_ART.cosmic?.['classic']).toBe(2);
  });

  it('keeps every format 2 scene within its budget: files, layers.json and 110 KB in all', () => {
    for (const { age, scene, format } of ART) {
      if (format !== 2) continue;
      const dir = `/public/${sceneDir(age, scene)}`;
      let total = JSON.stringify(LAYERS_JSON[`${dir}layers.json`]).length;
      expect(total, `${age}.${scene} layers.json`).toBeLessThanOrEqual(3 * 1024);
      for (const [name, budget] of Object.entries(BUDGET)) {
        const f = WEBP[`${dir}${name}`];
        if (!f) continue;
        expect(bytes(f), `${age}.${scene} ${name}`).toBeLessThanOrEqual(budget);
        total += bytes(f);
      }
      expect(total, `${age}.${scene} total`).toBeLessThanOrEqual(110 * 1024);
    }
  });

  it('passes the colour rule on far, mid and back (and the thumbnail), checked on the shipped files (scenes/sizes.py)', () => {
    const checks = Object.values(CHECKS)[0] ?? {};
    for (const { age, scene, format } of ART) {
      if (format !== 2) continue;
      const c = checks[`${age}.${scene}`];
      expect(c, `${age}.${scene}: run python3 art/blender/world/scenes/sizes.py --write`).toBeDefined();
      if (!c) continue;
      // the check ran on these very files (not a stale render)
      for (const [name, size] of Object.entries(c.sizes)) {
        if (name === 'layers.json') continue;
        const f = WEBP[`/public/${sceneDir(age, scene)}${name}`];
        expect(f && bytes(f), `${age}.${scene} ${name} changed since sizes.py --write`).toBe(size);
      }
      for (const [name, share] of Object.entries(c.rule)) expect(share, `${age}.${scene} ${name}`).toBeLessThanOrEqual(name === 'thumb.webp' ? 0.03 : 0.02);
      expect(Object.keys(c.rule)).toEqual(expect.arrayContaining(['far.webp', 'mid.webp', 'thumb.webp']));
    }
  });
});

describe('layer format loader (v1 and v2)', () => {
  it('reads a format 1 classic: two strips with their ambient, no sky, props or lights', () => {
    const d = parseScene(LAYERS_JSON['/public/art/backdrops/stone/layers.json'], 'stone', 'classic');
    expect(d?.version).toBe(1);
    expect(Object.keys(d?.layers ?? {}).sort()).toEqual(['far', 'mid']);
    expect(d?.sky).toBeNull();
    expect(d?.props).toBeNull();
    expect(d?.layers.far?.ambient.some((a) => a.kind === 'emit')).toBe(true);
    expect(d?.layers.far?.ambient.every((a) => a.layer === 'far')).toBe(true);
  });

  it('reads a format 2 scene: sky, back strip, props, lights, hints, thumbnail', () => {
    const d = parseScene(LAYERS_JSON['/public/art/backdrops/bronze/classic/layers.json'], 'bronze', 'classic') as SceneData;
    expect(d.version).toBe(2);
    expect(d.sky?.celestial).toBe('sun');
    expect(d.layers.back?.pxPerLu).toBe(BACK_FRAME.pxPerLu);
    expect(d.props?.sprites.length).toBeGreaterThan(0);
    expect(d.lights.length).toBeGreaterThan(0);
    expect(d.thumb).toBe('thumb.webp');
    for (const s of d.props?.sprites ?? []) {
      const names = s.kind === 'path' ? s.group.flatMap((m) => m.frames) : s.kind === 'emit' ? [] : s.frames;
      for (const n of names) expect(d.props?.frames[n], n).toBeDefined();
    }
  });

  it('leaves out a strip cut for another frame, merged emitters expand, both light shapes read', () => {
    const json = {
      version: 2,
      far: { image: 'far.webp', x0: -260, width: 1720, yTop: -560, height: 580, pxPerLu: 0.9, ambient: [{ kind: 'emit', part: 'fx.p.smoke', rate: 1, at: [[10, -20], [30, -40]] }] },
      mid: { image: 'mid.webp', x0: -260, width: 1720, yTop: -999, height: 320, pxPerLu: 1.2, ambient: [] },
      lights: { far: [[1, -2, 4]] },
    };
    const warn = console.warn;
    console.warn = () => undefined;
    const d = parseScene(json, 'cosmic', 'classic');
    console.warn = warn;
    expect(d?.layers.mid).toBeUndefined();
    expect(d?.layers.far?.ambient.map((a) => [a.x, a.y, a.layer])).toEqual([
      [10, -20, 'far'],
      [30, -40, 'far'],
    ]);
    expect(d?.lights).toEqual([{ layer: 'far', x: 1, y: -2, r: 4 }]);
    expect(parseScene({ version: 2, lights: [{ layer: 'mid', x: 3, y: -4, r: 5 }], far: json.far }, 'cosmic', 'classic')?.lights).toEqual([{ layer: 'mid', x: 3, y: -4, r: 5 }]);
    expect(parseScene({}, 'stone', 'classic')).toBeNull();
    expect(parseScene('nope', 'stone', 'classic')).toBeNull();
  });

  it('resolves scene keys: a scene without art draws its age classic, never a missing file', () => {
    expect(sceneIdOf('scene.glacier_valley')).toBe('glacier_valley');
    expect(sceneIdOf(null)).toBe('classic');
    expect(sceneIdOf('backdrop.winterfall')).toBe('classic');
    expect(drawnScene('stone', 'glacier_valley')).toBe('classic');
    expect(drawnScene('bronze', 'classic')).toBe('classic');
    expect(sceneDir('bronze', 'classic')).toBe('art/backdrops/bronze/classic/');
    expect(sceneDir('stone', 'classic')).toBe('art/backdrops/stone/');
    expect(sceneDir('stone', 'nope')).toBeNull();
  });
});

const FRAMES = { a: 1, b: 1, c: 1, loco: 1, wagon: 1 };
const path = readSprites(
  [
    {
      kind: 'path',
      layer: 'far',
      fps: 8,
      periodS: 20,
      keys: [
        [0, -300, -150, 1],
        [10, 1500, -150, 1],
      ],
      group: [{ frames: ['loco'] }, { frames: ['wagon'], dx: -30 }],
    },
  ],
  FRAMES,
)[0] as PathSprite;

describe('scene sprites (render clock, seeded, limits)', () => {
  it('reads the sprite kinds and drops sprites naming frames the atlas lacks', () => {
    const s = readSprites(
      [
        { kind: 'loop', layer: 'mid', frames: ['a', 'b'], fps: 6, at: [10, -50] },
        { kind: 'loop', layer: 'mid', frames: ['zz'], fps: 6, at: [10, -50] },
        { kind: 'bob', layer: 'mid', frames: ['c'], at: [0, -40], amp: [0, 2], periodS: 4 },
        { kind: 'emit', layer: 'far', part: 'fx.p.smoke', at: [5, -100], rate: 1 },
        { kind: 'nope', layer: 'mid' },
        { kind: 'loop', layer: 'sky', frames: ['a'], fps: 1, at: [0, 0] },
      ],
      FRAMES,
    );
    expect(s.map((x) => x.kind)).toEqual(['loop', 'bob', 'emit']);
  });

  it('reads the short path form of the PLAN 2b example (`from`, `to`, `count`, `spacing`)', () => {
    const herd = readSprites(
      [{ kind: 'path', frames: ['a', 'b'], fps: 4, layer: 'far', from: [-200, -180], to: [1400, -180], periodS: 90, count: 3, spacing: 70 }],
      FRAMES,
    )[0] as PathSprite;
    expect(herd.keys).toEqual([
      [0, -200, -180, 1],
      [90, 1400, -180, 1],
    ]);
    expect(herd.group.map((m) => [m.dx, m.phase])).toEqual([
      [0, 0],
      [-70, 1],
      [-140, 2],
    ]);
    expect(spriteInstances(herd, 45000, 0).map((i) => i.x)).toEqual([600, 530, 460]);
  });

  it('moves by render time only: the same moment gives the same pose at any frame rate', () => {
    const phase = spritePhaseMs(1234, 0, 20000);
    const at = (steps: number, dt: number) => {
      let t = 0;
      for (let i = 0; i < steps; i++) t += dt;
      return spriteInstances(path, t, phase);
    };
    expect(at(300, 16)).toEqual(at(160, 30));
    expect(spritePhaseMs(1234, 0, 20000)).toBe(phase);
    expect(spritePhaseMs(1235, 0, 20000)).not.toBe(phase);
  });

  it('a path travels between its keys, hides outside them and mirrors when it runs left', () => {
    expect(pathPoint(path, 5)?.x).toBeCloseTo(600);
    expect(pathPoint(path, 15)).toBeNull();
    expect(spriteInstances(path, 15000, 0)).toEqual([]);
    const inst = spriteInstances(path, 5000, 0);
    expect(inst.map((i) => i.x)).toEqual([600, 570]);
    const back = { ...path, keys: [[0, 1500, -150, 1], [10, -300, -150, 1]] } as PathSprite;
    const l = spriteInstances(back, 5000, 0);
    expect(l[0]?.flip).toBe(true);
    expect(l[1]!.x).toBeGreaterThan(l[0]!.x);
  });

  it('holds still under Reduce motion: the path stands mid-span, loops show their first frame', () => {
    const a = spriteInstances(path, 1000, 0, true);
    const b = spriteInstances(path, 9000, 777, true);
    expect(a).toEqual(b);
    expect(a[0]?.x).toBeCloseTo(600);
    const loop = readSprites([{ kind: 'loop', layer: 'mid', frames: ['a', 'b'], fps: 6, at: [0, 0] }], FRAMES)[0]!;
    expect(spriteInstances(loop, 4321, 0, true)[0]?.frame).toBe('a');
    expect(lightAlpha(1000, 0, true)).toBe(lightAlpha(5000, 300, true));
  });

  it('keeps 6 moving sprites and 40 particles per half (Lite: 3 and 20)', () => {
    const many: SceneSprite[] = Array.from({ length: 9 }, () => path);
    expect(limitSprites(many, [], 'high').sprites).toHaveLength(SPRITE_LIMITS.high.sprites);
    expect(limitSprites(many, [], 'lite').sprites).toHaveLength(SPRITE_LIMITS.lite.sprites);
    const smoke = Array.from({ length: 10 }, () => ({ rate: 2, life: 4000 }));
    expect(limitSprites([], smoke, 'high').rateScale).toBeCloseTo(40 / 80);
    expect(limitSprites([], smoke, 'lite').rateScale).toBeCloseTo(20 / 40);
    expect(limitSprites([], [{ rate: 1, life: 2000 }], 'high').rateScale).toBe(1);
  });
});

describe('scene hints and night lights', () => {
  it('`weather: space` turns snow, rain and petals into ice motes, meteor streaks and sparkles', () => {
    const t = BACKDROP_THEMES;
    expect(spaceWeather(t['winterfall']!).weather).toBe('motes');
    expect(spaceWeather(t['thunderstorm']!)).toMatchObject({ weather: 'rain', lightning: false });
    expect(spaceWeather(t['blossom']!).weather).toBe('sparkles');
    expect(spaceWeather(t['starry_night']!)).toBe(t['starry_night']);
  });

  it('`celestial: own` keeps the scene its own sky object: the theme paints no sun or moon', () => {
    const arcs = (celestial: boolean) => {
      let n = 0;
      const grad = { addColorStop: () => undefined };
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (_t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => grad : k === 'arc' ? () => n++ : () => undefined),
        set: () => true,
      }) as unknown as CanvasRenderingContext2D;
      const th = { ...BACKDROP_THEMES['golden_dusk']!, stars: 0 };
      themeSky(ctx, 'golden_dusk', 'cosmic', th, { x0: -260, width: 1720, yTop: -780, height: 800, pxPerLu: 0.5 }, { celestial });
      return n;
    };
    expect(arcs(true)).toBeGreaterThan(0);
    expect(arcs(false)).toBe(0);
  });

  it('reads `skyGrade` (clamped to 0..1; absent is 1)', () => {
    const strip = { image: 'far.webp', x0: -260, width: 1720, yTop: -560, height: 580, pxPerLu: 0.9 };
    const hints = (h: unknown) => parseScene({ version: 2, far: strip, hints: h }, 'bronze', 'classic')?.hints;
    expect(hints({ celestial: 'keep', weather: 'ground', skyGrade: 0.6 })?.skyGrade).toBe(0.6);
    expect(hints({ skyGrade: 3 })?.skyGrade).toBe(1);
    expect(hints({ skyGrade: -1 })?.skyGrade).toBe(0);
    expect(hints({ celestial: 'own' })?.skyGrade).toBe(1);
    expect(hints(undefined)?.skyGrade).toBe(1);
  });

  it('a scene takes a sky theme by its hints: space keeps its sky, pale scenes take light themes gently (review 1)', () => {
    const wf = BACKDROP_THEMES['winterfall']!;
    const night = BACKDROP_THEMES['starry_night']!;
    // a day sky never goes over space; the strips still take a (gentler) grade
    expect(themeForScene(wf, { weather: 'space', skyGrade: 0.35 }, 'sky')).toBeNull();
    expect(themeForScene(wf, { weather: 'space', skyGrade: 0.35 }, 'far')!.gradeMix).toBeLessThan(wf.gradeMix * 0.5);
    // Winterfall's near-white grade on Bronze (0.6): about two thirds; a night grade keeps almost all of it
    const pale = themeForScene(wf, { skyGrade: 0.6 }, 'far')!;
    expect(pale.gradeMix).toBeLessThan(wf.gradeMix * 0.7);
    expect(pale.gradeMix).toBeGreaterThan(wf.gradeMix * 0.55);
    expect(pale.rimAlpha).toBeLessThan(1);
    expect(themeForScene(night, { skyGrade: 0.6 }, 'far')!.gradeMix).toBeGreaterThan(night.gradeMix * 0.9);
    expect(themeForScene(wf, { skyGrade: 0.6 }, 'sky')!.skyMix).toBeLessThan(wf.skyMix * 0.8);
    expect(themeForScene(night, { skyGrade: 0.6 }, 'sky')!.skyMix).toBeGreaterThan(night.skyMix * 0.9);
    // the back strip takes half the grade; a scene without hints takes the theme as it is
    expect(themeForScene(wf, undefined, 'back')!.gradeMix).toBeCloseTo(wf.gradeMix * BACK_GRADE_SCALE);
    expect(themeForScene(wf, undefined, 'far')).toBe(wf);
    expect(themeForScene(wf, { skyGrade: 1, weather: 'ground' }, 'sky')).toBe(wf);
    expect(sceneGradeKey({ skyGrade: 0.35, weather: 'space' })).toBe('0.35s');
    expect(sceneGradeKey(undefined)).toBe('1');
  });

  it('the shipped Bronze and Cosmic classics take a light sky gently, and Cosmic keeps its space sky', () => {
    const hints = (age: AgeId) => parseScene(LAYERS_JSON[`/public/${sceneDir(age, 'classic')}layers.json`], age, 'classic')?.hints;
    expect(hints('bronze')).toMatchObject({ weather: 'ground', skyGrade: 0.45 });
    expect(hints('cosmic')).toMatchObject({ weather: 'space', celestial: 'own', skyGrade: 0.35 });
    expect(hints('industrial')?.skyGrade).toBe(1);
  });

  it('night skies are the four dark themes', () => {
    expect(['starry_night', 'lantern_festival', 'eclipse', 'northern_lights'].every((id) => isNightSky(`backdrop.${id}`))).toBe(true);
    expect(isNightSky('backdrop.winterfall')).toBe(false);
    expect(isNightSky(null)).toBe(false);
  });
});

describe('scenes in the lane: seam, wipe, arrival fade, lights, release', () => {
  it('each half shows its scene per age, through an evolve wipe; an age without one is classic', () => {
    const scenes = { left: { bronze: 'scene.classic', industrial: 'scene.viaduct_gorge' }, right: {} };
    const r = ageRegions({ left: 'stone', right: 'medieval', seam: 1000, wipe: { side: 0, age: 'bronze', front: 300 }, scenes });
    expect(r.map((x) => [x.age, x.scene])).toEqual([
      ['bronze', undefined],
      ['stone', undefined],
      ['medieval', undefined],
    ]);
  });

  it('cross-fades at the seam between two scenes of the same age (a scene with art vs the classic)', () => {
    const art = SCENE_ART as Record<string, Record<string, number>>;
    const before = art['stone']!['glacier_valley'];
    art['stone']!['glacier_valley'] = 2;
    try {
      const pieces = composePieces(ageRegions({ left: 'stone', right: 'stone', seam: 1000, wipe: null, scenes: { left: { stone: 'scene.glacier_valley' } } }), 1000);
      const unders = pieces.filter((p) => p.under);
      expect(unders.length).toBeGreaterThan(0);
      for (const u of unders) expect(u.scene).toBe('glacier_valley');
      expect(pieces.filter((p) => !p.under && p.alpha < 1).every((p) => p.scene === undefined)).toBe(true);
    } finally {
      if (before === undefined) delete art['stone']!['glacier_valley'];
      else art['stone']!['glacier_valley'] = before;
    }
  });

  it('a pre-rendered layer cross-fades in over its painted stand-in, in the view time', () => {
    const f = new FadeTracker();
    const painted = new Texture();
    const image = new Texture();
    f.begin();
    expect(f.track('bronze||', painted, 0)).toEqual({ from: null, u: 1 });
    f.end();
    f.begin();
    const mid = f.track('bronze||', image, 100);
    expect(mid.from).toBe(painted);
    f.end();
    f.begin();
    const half = f.track('bronze||', image, 100 + ARRIVAL_FADE_MS / 2);
    expect(half.u).toBeCloseTo(0.5);
    expect(f.end()).toBe(true);
    f.begin();
    expect(f.track('bronze||', image, 100 + ARRIVAL_FADE_MS)).toEqual({ from: null, u: 1 });
    expect(f.end()).toBe(false);
  });

  /** A textures stand-in with one scene (lights, one moving prop) for both ages. */
  function fakeTextures(): { t: BackdropTextures; released: Set<string>[] } {
    const released: Set<string>[] = [];
    const data: SceneData = {
      version: 2,
      age: 'bronze',
      scene: 'classic',
      sky: null,
      layers: {},
      props: { image: 'props.webp', frames: { a: { x: 0, y: 0, w: 4, h: 4, ax: 0.5, ay: 1, ppl: 1 } }, sprites: [{ kind: 'loop', layer: 'mid', frames: ['a'], fps: 1, at: [100, -60], pingpong: false }] },
      lights: [{ layer: 'mid', x: 100, y: -60, r: 5 }],
      hints: { celestial: 'keep', weather: 'space' },
      thumb: null,
    };
    const frames = new Map<string, PropFrame>([['a', { tex: Texture.WHITE, ax: 0.5, ay: 1, ppl: 1 }]]);
    const painted = { tex: Texture.EMPTY, ambient: [] };
    const t = {
      version: 0,
      layer: () => painted,
      ground: () => painted,
      groundThemed: () => null,
      prefetch: () => undefined,
      scene: (age: AgeId) => ({ ...data, age }),
      sceneProps: () => frames,
      release: (keep: Set<string>) => {
        released.push(keep);
        return 0;
      },
    } as unknown as BackdropTextures;
    return { t, released };
  }

  function view(skin: string | null, t: BackdropTextures): ProceduralBackdropView {
    return new ProceduralBackdropView({ left: 'bronze', right: 'industrial', arena: 'tar_pits', textures: t, baker: new PartBaker({ pxPerLu: 1, canvasFactory: () => null }), quality: 'high', seed: 7, skins: { left: skin, right: null } });
  }

  it('lights come on only on a half that wears a night sky; props move on the scene', () => {
    const { t } = fakeTextures();
    const day = view(null, t);
    day.update(16);
    expect(day.state.lights).toBe(0);
    expect(day.state.sprites).toBeGreaterThan(0);
    day.destroy();
    const night = view('backdrop.starry_night', t);
    night.update(16);
    expect(night.state.lights).toBeGreaterThan(0);
    night.destroy();
  });

  it('Lite keeps the back strip (one sprite), never its props or lights (review 1)', () => {
    const { t } = fakeTextures();
    const v = new ProceduralBackdropView({ left: 'bronze', right: 'industrial', arena: 'tar_pits', textures: t, baker: new PartBaker({ pxPerLu: 1, canvasFactory: () => null }), quality: 'lite', seed: 7 });
    const kinds = (v as unknown as { layers: { kind: string }[] }).layers.map((l) => l.kind);
    expect(kinds).toEqual(['sky', 'back', 'far', 'mid']);
    v.destroy();
  });

  it('prefetches the scene of a side for an age before its wipe (review 1)', () => {
    const { t } = fakeTextures();
    const calls: unknown[][] = [];
    (t as unknown as { prefetch: (...a: unknown[]) => void }).prefetch = (...a: unknown[]) => calls.push(a);
    const v = view(null, t);
    calls.length = 0;
    v.prefetchAge(1, 'modern');
    expect(calls).toEqual([[['modern'], [], [{ age: 'modern', scene: 'classic' }]]]);
    v.destroy();
  });

  it('a space scene keeps its clouds hidden under a theme (its own sky stays)', () => {
    const { t } = fakeTextures();
    const sceneOf = (t as unknown as { scene: (age: AgeId) => SceneData }).scene;
    (t as unknown as { scene: (age: AgeId) => SceneData }).scene = (age: AgeId) => ({
      ...sceneOf(age),
      sky: { top: 0x241c3c, bottom: 0x5c4884, horizon: 0x6c5894, cloudTint: 0x6a5a8a, celestial: 'none', sunAt: null, stars: 100, smog: 0, nebula: true, clouds: 0 },
    });
    const v = view('backdrop.winterfall', t);
    v.update(16);
    const clouds = (v as unknown as { clouds: { children: { alpha: number }[] } }).clouds.children;
    expect(clouds.length).toBeGreaterThan(0);
    expect(clouds.every((c) => c.alpha === 0)).toBe(true);
    v.destroy();
  });

  it('a mote that runs out waits in its layer for the next puff, so the render group keeps its structure (review 1)', () => {
    const { t } = fakeTextures();
    // a smoking ground (as the arenas' embers and snow): 8 puffs a second, each 1 s long
    const smoke = { tex: Texture.EMPTY, ambient: [{ kind: 'emit', part: 'fx.p.smoke', x: 600, y: -100, layer: 'ground', rate: 8, speed: 12, life: 1000 }] };
    (t as unknown as { ground: () => unknown }).ground = () => smoke;
    const v = view(null, t);
    expect(v.root.isRenderGroup).toBe(true);
    for (let i = 0; i < 60; i++) v.update(50);
    const warm = v.moteCount;
    expect(warm.live).toBeGreaterThan(0);
    // (the puffs that ran out came back as new ones: far fewer sprites than puffs so far)
    expect(warm.live + warm.spare).toBeLessThan(24);
    // steady puffing reuses the spares: no child joins or leaves, so the group's instructions hold
    const rg = v.root.renderGroup!;
    rg.structureDidChange = false;
    for (let i = 0; i < 60; i++) v.update(50);
    expect(rg.structureDidChange).toBe(false);
    const later = v.moteCount;
    expect(later.live + later.spare).toBe(warm.live + warm.spare);
    v.destroy();
  });

  it('releases the GPU textures of the age a side left once its wipe ends', () => {
    const { t, released } = fakeTextures();
    const v = view(null, t);
    v.wipe(0, 'industrial', 200);
    v.update(100);
    expect(released).toHaveLength(0);
    v.update(150);
    expect(v.state.left).toBe('industrial');
    expect(released).toHaveLength(1);
    expect([...released[0]!]).toEqual(['industrial.classic']);
    v.destroy();
    expect(WORLD.seamBlendLu).toBe(300);
  });
});
