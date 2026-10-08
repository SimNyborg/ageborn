/**
 * Backdrop scenes (PLAN 2b, owner request 2026-10-08): the scenery of one age, equipped per age
 * (`cosmetics.equipped.scenes[age] = 'scene.<id>'`; an age without one shows its classic scene). A scene
 * is pre-rendered art (art/blender/world/backdrop.py, `scenes/<age>.py`) with the same toon light as the
 * units: its own daylight sky colours, an optional `back` strip, the `far` and `mid` strips, a props
 * atlas for ambient motion (`sceneSprites.ts`), light points that night skies switch on, and a thumbnail.
 *
 * Two layer formats load here:
 * - **format 2** (`art/backdrops/<age>/<scene>/layers.json`): everything above;
 * - **format 1** (`art/backdrops/<age>/layers.json`, the first five ages' classic strips until their
 *   round 3 re-render): a `far` and a `mid` strip with ambient specs, the code-painted sky.
 * Which scenes have art is a static table ({@link SCENE_ART}), so the game never requests a file that
 * does not exist; a scene without art draws its age's classic scene.
 *
 * Presentation only: the sim never sees a scene, and the hashes skip it (as backdrops).
 */
import type { AgeId } from '@/contracts/ids';
import { parseHex } from '../palette';
import type { AmbientSpec } from './silhouettes';
import { BACKDROP_WIDTH, BACKDROP_X0, type LayerFrame } from './sky';
import { readSprites, type SceneSprite } from './sceneSprites';

/** The strips a scene can have (the sky is painted in code from its colours). */
export type SceneLayer = 'back' | 'far' | 'mid';

/** The optional distant strip (PLAN 2b), between the sky and the far strip; Lite leaves it out. */
export const BACK_FRAME: LayerFrame = { x0: BACKDROP_X0, width: BACKDROP_WIDTH, yTop: -600, height: 420, pxPerLu: 0.7 };

/** The id of every age's free default scene (not an item). */
export const CLASSIC = 'classic';

/**
 * Pre-rendered scenes per age: scene id → layer format. Format 1 lives in `<age>/`, format 2 in
 * `<age>/<scene>/`. Bronze, Industrial and Cosmic got their first Blender layers in format 2 (round 1);
 * the other five classics keep format 1 until their re-render (round 3).
 */
export const SCENE_ART: Readonly<Record<AgeId, Readonly<Record<string, 1 | 2>>>> = {
  stone: { classic: 1 },
  bronze: { classic: 2 },
  medieval: { classic: 1 },
  gunpowder: { classic: 1 },
  industrial: { classic: 2 },
  modern: { classic: 1 },
  future: { classic: 1 },
  cosmic: { classic: 2 },
};

/** The scene id of a `scene.<id>` key; `classic` for none, `scene.classic` or another collection's key. */
export function sceneIdOf(key: string | null | undefined): string {
  if (!key || !key.startsWith('scene.')) return CLASSIC;
  return key.slice('scene.'.length) || CLASSIC;
}

/** The layer format of a scene's art, or null when it has none. */
export function sceneFormat(age: AgeId, id: string): 1 | 2 | null {
  return SCENE_ART[age]?.[id] ?? null;
}

/** The scene that draws for `id` in `age`: itself when it has art, else the age's classic scene. */
export function drawnScene(age: AgeId, id: string | null | undefined): string {
  const s = id ?? CLASSIC;
  return sceneFormat(age, s) ? s : CLASSIC;
}

/** The folder of a scene's files (relative to the app's base URL), or null without art. */
export function sceneDir(age: AgeId, id: string): string | null {
  const f = sceneFormat(age, id);
  if (f === 2) return `art/backdrops/${age}/${id}/`;
  if (f === 1) return `art/backdrops/${age}/`;
  return null;
}

/** A scene's tile thumbnail (320 x 180 WebP), or null without art. */
export function sceneThumbPath(age: AgeId, id: string): string | null {
  const d = sceneDir(age, id);
  return d ? `${d}thumb.webp` : null;
}

/** The scene's own daylight sky, painted by `paintSceneSky` (a sky theme re-grades it). */
export interface SceneSky {
  top: number;
  bottom: number;
  horizon: number;
  cloudTint: number;
  /** The scene's own sun or moon (`none` for space scenes, which show stars). */
  celestial: 'sun' | 'moon' | 'none';
  sunAt: { x: number; y: number; r: number } | null;
  /** Painted stars (space and night scenes). */
  stars: number;
  /** A band of haze over the horizon (smoke, smog), 0..1. */
  smog: number;
  /** Nebula glows in the upper sky (space scenes). */
  nebula: boolean;
  /** How visible the drifting clouds are, 0..1 (0 in space). */
  clouds: number;
}

export interface SceneLayerFile {
  image: string;
  pxPerLu: number;
  ambient: AmbientSpec[];
}

/** A props atlas frame: px in the atlas, the anchor as a fraction of the frame, its px per lu. */
export interface SceneFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  ppl: number;
}

/** A window or lantern that night skies light up (layer lu, y down). */
export interface SceneLight {
  layer: SceneLayer;
  x: number;
  y: number;
  r: number;
}

export interface SceneHints {
  /** `own`: the scene has its own big sky object, so a sky theme skips its sun or moon. */
  celestial: 'keep' | 'own';
  /**
   * `space`: a sky theme's snow, rain and petals become ice motes, meteor streaks and sparkles, and the
   * scene keeps its own sky (a day sky over space reads wrong; review 1).
   */
  weather: 'ground' | 'space';
  /**
   * How strongly a light sky theme may grade this scene, 0..1 (default 1). Pale, hazed scenes (Bronze's
   * sandstone hills) and dark space scenes take less, or Winterfall washes them almost white (review 1):
   * the grade, sky and glow of a theme scale toward this by the theme's lightness (`themeForScene`).
   */
  skyGrade: number;
}

/** A loaded scene, either format (format 1 has no sky, props, lights or thumbnail). */
export interface SceneData {
  version: 1 | 2;
  age: AgeId;
  scene: string;
  sky: SceneSky | null;
  layers: Partial<Record<SceneLayer, SceneLayerFile>>;
  props: { image: string; frames: Record<string, SceneFrame>; sprites: SceneSprite[] } | null;
  lights: SceneLight[];
  hints: SceneHints;
  thumb: string | null;
}

/** The frame every strip of a layer must match (the runtime cuts strips by these). */
export const SCENE_FRAMES: Record<SceneLayer, { yTop: number; height: number }> = {
  back: { yTop: BACK_FRAME.yTop, height: BACK_FRAME.height },
  far: { yTop: -560, height: 580 },
  mid: { yTop: -300, height: 320 },
};

const DEFAULT_HINTS: SceneHints = { celestial: 'keep', weather: 'ground', skyGrade: 1 };

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const color = (v: unknown, d: number): number => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? parseHex(v) : typeof v === 'number' ? v : d);

function readSky(v: unknown): SceneSky | null {
  if (!isObj(v)) return null;
  const sun = Array.isArray(v['sunAt']) && v['sunAt'].length === 3 ? (v['sunAt'] as unknown[]).map((n) => num(n, 0)) : null;
  const cel = v['celestial'];
  return {
    top: color(v['top'], 0x8db3cf),
    bottom: color(v['bottom'], 0xf0e2c4),
    horizon: color(v['horizon'], 0xf4e8d0),
    cloudTint: color(v['cloudTint'], 0xf6efe2),
    celestial: cel === 'moon' || cel === 'none' ? cel : 'sun',
    sunAt: sun ? { x: sun[0]!, y: sun[1]!, r: sun[2]! } : null,
    stars: Math.max(0, Math.min(400, num(v['stars'], 0))),
    smog: Math.max(0, Math.min(1, num(v['smog'], 0))),
    nebula: v['nebula'] === true,
    clouds: Math.max(0, Math.min(1, num(v['clouds'], 1))),
  };
}

function readLayer(v: unknown, layer: SceneLayer, where: string): SceneLayerFile | null {
  if (!isObj(v) || typeof v['image'] !== 'string') return null;
  const f = SCENE_FRAMES[layer];
  // a strip cut for another frame would sit in the wrong place: leave it out (the painted layer shows)
  if (num(v['x0'], BACKDROP_X0) !== BACKDROP_X0 || num(v['width'], BACKDROP_WIDTH) !== BACKDROP_WIDTH || num(v['yTop'], f.yTop) !== f.yTop || num(v['height'], f.height) !== f.height) {
    console.warn(`[visuals] ${where}: the ${layer} strip does not match its frame; it is left out`);
    return null;
  }
  const ambient: AmbientSpec[] = [];
  if (Array.isArray(v['ambient'])) {
    for (const a of v['ambient'] as unknown[]) {
      if (!isObj(a) || typeof a['part'] !== 'string') continue;
      const spec = { ...(a as unknown as AmbientSpec), layer: (a['layer'] as AmbientSpec['layer'] | undefined) ?? layer };
      // `at: [[x, y], ...]`: one spec repeated at several points (compact files)
      const at = a['at'];
      if (Array.isArray(at)) {
        const { at: _drop, ...one } = spec as AmbientSpec & { at?: unknown };
        void _drop;
        for (const p of at as unknown[]) if (Array.isArray(p)) ambient.push({ ...one, x: num(p[0], 0), y: num(p[1], 0) });
      } else ambient.push({ ...spec, x: num(a['x'], 0), y: num(a['y'], 0) });
    }
  }
  return { image: v['image'], pxPerLu: Math.max(0.05, num(v['pxPerLu'], 1)), ambient };
}

function readFrames(v: unknown): Record<string, SceneFrame> {
  const out: Record<string, SceneFrame> = {};
  if (!isObj(v)) return out;
  for (const [name, f] of Object.entries(v)) {
    if (Array.isArray(f) && f.length >= 7) {
      const [x, y, w, h, ax, ay, ppl] = (f as unknown[]).map((n) => num(n, 0));
      if (w! > 0 && h! > 0 && ppl! > 0) out[name] = { x: x!, y: y!, w: w!, h: h!, ax: ax!, ay: ay!, ppl: ppl! };
    } else if (isObj(f)) {
      const w = num(f['w'], 0);
      const h = num(f['h'], 0);
      const ppl = num(f['ppl'], 1);
      if (w > 0 && h > 0) out[name] = { x: num(f['x'], 0), y: num(f['y'], 0), w, h, ax: num(f['ax'], 0.5), ay: num(f['ay'], 1), ppl };
    }
  }
  return out;
}

const LAYER_NAMES: readonly SceneLayer[] = ['back', 'far', 'mid'];

/** Light points: `{ far: [[x, y, r], ...], mid: [...] }` (compact) or `[{ layer, x, y, r }, ...]`. */
function readLights(v: unknown): SceneLight[] {
  const out: SceneLight[] = [];
  const push = (layer: unknown, x: unknown, y: unknown, r: unknown) => {
    if (layer === 'back' || layer === 'far' || layer === 'mid') out.push({ layer, x: num(x, 0), y: num(y, 0), r: Math.max(1, num(r, 5)) });
  };
  if (Array.isArray(v)) {
    for (const l of v as unknown[]) if (isObj(l)) push(l['layer'], l['x'], l['y'], l['r']);
  } else if (isObj(v)) {
    for (const [layer, list] of Object.entries(v)) {
      if (!Array.isArray(list)) continue;
      for (const p of list as unknown[]) if (Array.isArray(p)) push(layer, p[0], p[1], p[2]);
    }
  }
  return out;
}

/**
 * Reads a `layers.json` of either format into a {@link SceneData} (unknown or broken parts are left
 * out, never thrown), or null when it has no usable strip.
 */
export function parseScene(json: unknown, age: AgeId, scene: string): SceneData | null {
  if (!isObj(json)) return null;
  const where = `scene ${age}.${scene}`;
  const version = json['version'] === 2 ? 2 : 1;
  const layers: Partial<Record<SceneLayer, SceneLayerFile>> = {};
  for (const l of LAYER_NAMES) {
    if (version === 1 && l === 'back') continue;
    const f = readLayer(json[l], l, where);
    if (f) layers[l] = f;
  }
  if (!layers.far && !layers.mid) return null;
  let props: SceneData['props'] = null;
  const p = json['props'];
  if (version === 2 && isObj(p) && typeof p['image'] === 'string') {
    const frames = readFrames(p['frames']);
    props = { image: p['image'], frames, sprites: readSprites(p['sprites'], frames) };
  }
  const lights = version === 2 ? readLights(json['lights']) : [];
  const h = json['hints'];
  const hints: SceneHints = isObj(h)
    ? {
        celestial: h['celestial'] === 'own' ? 'own' : 'keep',
        weather: h['weather'] === 'space' ? 'space' : 'ground',
        skyGrade: Math.max(0, Math.min(1, num(h['skyGrade'], 1))),
      }
    : DEFAULT_HINTS;
  return {
    version,
    age,
    scene,
    sky: version === 2 ? readSky(json['sky']) : null,
    layers,
    props,
    lights: lights.slice(0, 48),
    hints,
    thumb: version === 2 && typeof json['thumb'] === 'string' ? json['thumb'] : null,
  };
}
