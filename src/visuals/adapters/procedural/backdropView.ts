/**
 * Split-age backdrop (DESIGN A11 "Split-age lane", the signature visual).
 *
 * - Parallax layers per age (sky, an optional back strip, far silhouettes, mid-ground) plus the arena
 *   ground and weather layer, all painted or loaded once per age, scene or arena and cached.
 * - Your half shows your age and the enemy half theirs, cross-faded over a 300 lu seam with a 30%
 *   grey haze. `setSeam(x)` sets the drift target; the seam moves toward it slowly and stays within
 *   its range (the "fixed-drift seam", so the blend is never glued behind every fight).
 * - `wipe(side, age, ms)` sweeps that side's half to the new age from its base outward.
 *
 * Scenes (PLAN 2b, `backdrops/scenes.ts`): each half shows a scene per age (`scenes.left[age]`, a
 * `scene.<id>` key; none = the age's classic scene). A piece of the lane carries `{ age, scene, skin }`,
 * so a seam or an evolve wipe between two scenes cross-fades exactly as between two ages, and on an
 * evolve the half's scene for the new age comes from the same map. A scene's art is pre-rendered by the
 * 3D pipeline (art/blender/world/backdrop.py) with the same toon light as the units: format 2 scenes
 * bring their own sky colours, a back strip, a props atlas for ambient motion (`sceneSprites.ts`) and
 * light points that night skies switch on; the first five ages' classic strips are format 1. Everything
 * streams in on first use; until it arrives (and in headless tests, or if a file fails) the code-painted
 * layers are drawn, and the arrival cross-fades over 300 ms, so the art is a pure upgrade of the frames.
 * An age a side has left releases its GPU textures once its wipe ends.
 *
 * Backdrop skins (A18.9.4 "Backdrops"; the "Sky" from save v14): each half can wear a theme
 * (`skins.left` / `skins.right`, `backdrop.<id>`). A themed layer is the layer texture re-graded once at
 * bake time (`backdrops/themes.ts`: palette, sky, props along the rims), so pieces carry an age, a scene
 * and a skin, and a seam between two looks cross-fades exactly like one between two ages. The theme's
 * weather is a separate particle layer over the mid-ground and under the lane (`backdropWeather.ts`).
 *
 * Cross-fades are built from thin vertical strips cut from each layer texture (dynamic texture
 * frames) with stepped alpha. Everything comes from a few textures, so the whole backdrop batches
 * into a handful of draw calls with no masks, filters or custom shaders (works on WebGL and WebGPU).
 *
 * Space: the root is world space, x = 0 at the left gate and y = 0 on the ground line.
 *
 * Parallax (DESIGN A17.7): the battle camera scrolls a 2,360 lu world, and `setView(left, width)`
 * tells the backdrop what it shows. The sky, back, far and mid layers then scroll at 0.05, 0.12, 0.25
 * and 0.55 of the camera movement (less when a layer is too narrow for its factor at this view width,
 * so no edge ever shows), and the ground at 1.0; the ground image is extended with a mirrored copy to
 * cover the longer lane. Each layer's age split is re-cut so its seam stays at the ground seam's screen
 * position: the ages meet in one place on screen while the silhouettes drift at their depth.
 */
import { CanvasSource, Container, ImageSource, Rectangle, Sprite, Texture } from 'pixi.js';
import type { BackdropView } from '@/contracts/art';
import type { AgeId, Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import type { PartBaker } from '../../bake';
import { arenaId, GROUND_FRAME, groundAmbient, MID_FRAME, paintGround, paintMid, type ArenaId } from '../../backdrops/ground';
import { FAR_FRAME, paintFar, type AmbientSpec } from '../../backdrops/silhouettes';
import { extraAmbient, finishLayer } from '../../backdrops/lighting';
import { BACK_FRAME, drawnScene, parseScene, SCENE_ART, sceneDir, sceneIdOf, type SceneData, type SceneFrame, type SceneLight } from '../../backdrops/scenes';
import { sceneImage, sceneJson } from '../../backdrops/sceneFiles';
import { lightAlpha, limitSprites, spriteInstances, spritePeriodMs, spritePhaseMs, type SceneSprite } from '../../backdrops/sceneSprites';
import { CLOUD_TINT, paintSceneSky, paintSky, SKY_FRAME, type LayerFrame } from '../../backdrops/sky';
import { backdropId, BACKDROP_THEMES, isNightSky, sceneGradeKey, spaceWeather, themeForScene, themeGround, themeLayer, themeSky } from '../../backdrops/themes';
import { BACKDROP_PALETTES, desaturate, mix } from '../../palette';
import { WORLD } from '../../style';
import { BackdropWeatherLayer } from './backdropWeather';
import { fxSprite } from './effectView';

type LayerKind = 'sky' | 'back' | 'far' | 'mid';
const LAYERS: readonly LayerKind[] = ['sky', 'back', 'far', 'mid'];
const FRAMES: Record<LayerKind, LayerFrame> = { sky: SKY_FRAME, back: BACK_FRAME, far: FAR_FRAME, mid: MID_FRAME };
const MID_LAYER_TINT = 0xdcdad6;
/** Parallax factors of the camera movement (A17.7). */
export const PARALLAX: Record<'sky' | 'far' | 'mid' | 'ground', number> = { sky: 0.05, far: 0.25, mid: 0.55, ground: 1 };
/** The back strip of a scene (PLAN 2b): between the sky and the far silhouettes. */
export const BACK_PARALLAX = 0.12;
const FACTOR: Record<LayerKind, number> = { sky: PARALLAX.sky, back: BACK_PARALLAX, far: PARALLAX.far, mid: PARALLAX.mid };
/** How long a pre-rendered layer takes to cross-fade in over its code-painted stand-in (PLAN 2b). */
export const ARRIVAL_FADE_MS = 300;

/**
 * How tall (lu above the ground line) the silhouettes of the back, far and mid layers reach. When the
 * camera shows less height than that (phones show about 275 lu), the layer shrinks toward the ground
 * line so its peaks stay in view; a smaller silhouette also reads as further away.
 */
export const LAYER_CONTENT_LU: Record<LayerKind, number> = { sky: 0, back: 400, far: 330, mid: 250 };

/** Where a parallax layer sits for a view: world x = `offset` + local x × `stretch`, world y = local y × `scaleY`. */
export interface LayerPlacement {
  offset: number;
  stretch: number;
  scaleY: number;
  /** The factor actually used (lower than the layer's when its art is too narrow). */
  factor: number;
}

export const IDENTITY_PLACEMENT: LayerPlacement = { offset: 0, stretch: 1, scaleY: 1, factor: 1 };

/**
 * Places a layer whose art spans [x0, x0 + width] (local lu) so that, for a camera showing
 * [left, left + view] of the world, it moves at `factor` of the camera movement and always covers the
 * view (A17.7). A layer narrower than the view is stretched.
 */
export function placeLayer(frame: { x0: number; width: number }, factor: number, left: number, view: number, fit = 1): LayerPlacement {
  const worldW = WORLD.worldWidthLu;
  const k = Math.max(0.3, Math.min(1, fit));
  const stretch = k * Math.max(1, (view + 24) / (frame.width * k));
  const w = frame.width * stretch;
  const travel = Math.max(0, worldW - view);
  const f = travel > 0 ? Math.max(0, Math.min(factor, (w - view) / travel)) : 0;
  const slack = w - view - f * travel;
  const camLeft = Math.max(WORLD.worldLeftLu, Math.min(WORLD.worldRightLu - view, left));
  const offset = WORLD.worldLeftLu - slack / 2 - frame.x0 * stretch + (1 - f) * (camLeft - WORLD.worldLeftLu);
  return { offset, stretch, scaleY: k, factor: f };
}
const STRIP_LU = 6;
const WIPE_EDGE_LU = 70;

interface Painted {
  tex: Texture;
  ambient: AmbientSpec[];
}

const NONE: Painted = { tex: Texture.EMPTY, ambient: [] };

/** A props atlas frame as a texture (its source in px) with its anchor and px per lu. */
export interface PropFrame {
  tex: Texture;
  ax: number;
  ay: number;
  ppl: number;
}

function appBaseUrl(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

/** Ages whose classic scene is pre-rendered (`backdrops/scenes.ts` SCENE_ART; every age since round 1). */
export const PRERENDERED_BACKDROP_AGES: readonly AgeId[] = (Object.keys(SCENE_ART) as AgeId[]).filter((a) => SCENE_ART[a]?.['classic']);

/** A pre-rendered layer file of a scene (art/blender/world/backdrop.py), relative to the base URL. */
export function backdropLayerUrl(age: AgeId, file: string, scene = 'classic'): string {
  return `${sceneDir(age, scene) ?? `art/backdrops/${age}/`}${file}`;
}
export function groundImageUrl(arena: ArenaId): string {
  return `art/ground/${arena}.webp`;
}

/** A (age, drawn scene) pair as a key. */
export function sceneKey(age: AgeId, scene: string): string {
  return `${age}.${scene}`;
}

/**
 * Paints and caches layer textures per age and arena (shared by every backdrop of a provider), and
 * streams in the pre-rendered scenes (sky colours, back, far and mid strips, props) and grounds, which
 * replace the painted ones once loaded (`version` counts arrivals so views can relayout).
 */
export class BackdropTextures {
  private readonly cache = new Map<string, Painted>();
  private readonly images = new Map<string, Painted>();
  private readonly scenes = new Map<string, SceneData>();
  private readonly props = new Map<string, Map<string, PropFrame>>();
  private readonly requested = new Set<string>();
  private readonly canBake = typeof document !== 'undefined';
  bakeMs = 0;
  /** Bumped every time a pre-rendered image or scene arrives. */
  version = 0;

  constructor(
    private readonly quality: 'high' | 'lite',
    private readonly baseUrl: string = appBaseUrl(),
    /** Set false to draw only the code-painted layers (tests, comparisons). */
    private readonly prerendered = true,
  ) {}

  /**
   * Starts loading the scenes of these ages (each age's classic scene, or the scene `scenes` names for
   * it) and these arenas' grounds (idempotent). Only what a match shows is ever requested.
   */
  prefetch(ages: readonly AgeId[], arenas: readonly ArenaId[] = [], scenes: readonly { age: AgeId; scene: string }[] = []): void {
    for (const a of ages) if (!scenes.some((s) => s.age === a)) this.loadScene(a, 'classic');
    for (const s of scenes) this.loadScene(s.age, s.scene);
    for (const a of arenas) this.loadGround(a);
  }

  /** The loaded data of a scene (null until it arrives, or without art). Starts the load. */
  scene(age: AgeId, scene: string): SceneData | null {
    const id = drawnScene(age, scene);
    const d = this.scenes.get(sceneKey(age, id));
    if (!d) this.loadScene(age, id);
    return d ?? null;
  }

  /** A scene's props atlas frames, once loaded (null before, or without props). */
  sceneProps(age: AgeId, scene: string): ReadonlyMap<string, PropFrame> | null {
    return this.props.get(sceneKey(age, drawnScene(age, scene))) ?? null;
  }

  private loadScene(age: AgeId, scene: string): void {
    const id = drawnScene(age, scene);
    const key = sceneKey(age, id);
    const dir = sceneDir(age, id);
    if (!this.canBake || !this.prerendered || !dir || this.requested.has(key)) return;
    this.requested.add(key);
    void (async () => {
      try {
        // (one download per file, shared with the Customize and VS stills: `sceneFiles.ts`)
        const json: unknown = await sceneJson(this.baseUrl + dir + 'layers.json');
        const data = parseScene(json, age, id);
        if (!data) throw new Error('no usable strip');
        this.scenes.set(key, data);
        this.version++;
        // the strips and the props atlas download side by side (review 1: one after another they took
        // about four round trips), and each one swaps in (with its cross-fade) as soon as it lands. Lite
        // keeps the back strip too (one sprite: the Bronze volcano, the Cosmic planet); it only leaves
        // out the strip's moving props, lights and emitters.
        const jobs: Promise<void>[] = [];
        for (const kind of ['back', 'far', 'mid'] as const) {
          const m = data.layers[kind];
          if (!m) continue;
          jobs.push(
            this.loadImage(dir + m.image, m.pxPerLu).then((tex) => {
              this.images.set(`${kind}.${key}`, { tex, ambient: m.ambient });
              this.version++;
            }),
          );
        }
        const props = data.props;
        if (props && Object.keys(props.frames).length > 0) {
          jobs.push(
            this.loadImage(dir + props.image, 1).then((atlas) => {
              const frames = new Map<string, PropFrame>();
              for (const [name, f] of Object.entries(props.frames)) frames.set(name, propFrame(atlas, f));
              this.props.set(key, frames);
              this.version++;
            }),
          );
        }
        for (const r of await Promise.allSettled(jobs)) {
          if (r.status === 'rejected') console.warn(`[visuals] a file of backdrop scene "${key}" failed to load; its painted layer is used`, r.reason);
        }
      } catch (e) {
        console.warn(`[visuals] backdrop scene "${key}" failed to load; the painted layers are used`, e);
      }
    })();
  }

  private loadGround(arena: ArenaId): void {
    const key = `ground.${arena}`;
    if (!this.canBake || !this.prerendered || this.requested.has(key)) return;
    this.requested.add(key);
    void this.loadImage(groundImageUrl(arena), GROUND_IMAGE_PX_PER_LU)
      .then((tex) => {
        this.images.set(key, { tex, ambient: groundAmbient(arena) });
        this.version++;
      })
      .catch((e: unknown) => console.warn(`[visuals] ground "${arena}" failed to load; the painted ground is used`, e));
  }

  /**
   * Loads an image as a texture measured in lu (its source resolution is its px per lu). The image comes
   * from the shared scene file cache (one download with the stills); the GPU source is this provider's.
   */
  private async loadImage(path: string, pxPerLu: number): Promise<Texture> {
    const image = await sceneImage(this.baseUrl + path);
    // the same settings as Pixi's own image loader (premultiplied on upload), at the strip's px per lu
    const source = new ImageSource({ resource: image, alphaMode: 'premultiply-alpha-on-upload', resolution: pxPerLu, scaleMode: 'linear', label: path });
    return new Texture({ source });
  }

  /** The layer texture of an age's scene, re-graded by a backdrop skin when one is given (A18.9.4). */
  layer(kind: LayerKind, age: AgeId, skin?: string | null, scene?: string): Painted {
    const base = this.baseLayer(kind, age, scene ?? 'classic');
    const id = backdropId(skin);
    return id ? this.themed(kind, age, id, base, scene ?? 'classic') : base;
  }

  /**
   * A themed copy of a layer texture, cached per layer, age, theme and base texture (a pre-rendered
   * image that arrives later gets its own themed copy). The sky is re-painted at twice its base
   * resolution so stars, moons and aurora stay crisp; a scene with its own sky object (hint
   * `celestial: 'own'`) keeps it, without the theme's sun or moon.
   */
  private themed(kind: LayerKind, age: AgeId, id: string, base: Painted, scene: string): Painted {
    const theme = BACKDROP_THEMES[id];
    if (!theme || !this.canBake || base.tex === Texture.EMPTY) return base;
    // how the scene takes the theme (review 1): a space scene keeps its own sky, a pale or dark scene a
    // gentler grade of a light theme, the back strip half the grade
    const hints = this.scenes.get(sceneKey(age, drawnScene(age, scene)))?.hints;
    const th = themeForScene(theme, hints, kind);
    if (!th) return base;
    const src = base.tex.source;
    // (the source uid stays last: `release` drops a released image's themed copies by it)
    const key = `${kind}.${age}@${id}~${sceneGradeKey(hints)}#${src.uid}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const t0 = performance.now();
    const up = kind === 'sky' ? 2 : 1;
    const res = src.resolution * up;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(src.pixelWidth * up));
    canvas.height = Math.max(1, Math.round(src.pixelHeight * up));
    const ctx = canvas.getContext('2d');
    if (!ctx) return base;
    const resource = src.resource as CanvasImageSource | undefined;
    if (resource) ctx.drawImage(resource, 0, 0, canvas.width, canvas.height);
    const f = { ...FRAMES[kind], pxPerLu: res };
    if (kind === 'sky') themeSky(ctx, id, age, th, f, { celestial: hints?.celestial !== 'own' });
    else themeLayer(canvas, ctx, id, kind === 'back' ? 'far' : kind, age, th, f);
    const source = new CanvasSource({ resource: canvas, resolution: 1 });
    source.resolution = res;
    const p = { tex: new Texture({ source }), ambient: base.ambient };
    this.cache.set(key, p);
    this.bakeMs += performance.now() - t0;
    return p;
  }

  private baseLayer(kind: LayerKind, age: AgeId, scene: string): Painted {
    const id = drawnScene(age, scene);
    const key = sceneKey(age, id);
    if (kind === 'sky') {
      const sky = this.scenes.get(key)?.sky;
      if (!sky) this.loadScene(age, id);
      else {
        return this.get(`sky.${key}`, SKY_FRAME, (ctx, f) => {
          paintSceneSky(ctx, sky, f, key.length * 7919 + 13);
          return [];
        });
      }
    } else {
      const img = this.images.get(`${kind}.${key}`);
      if (img) return img;
      this.loadScene(age, id);
      // the back strip has no code-painted stand-in
      if (kind === 'back') return NONE;
    }
    return this.get(`${kind}.${age}`, FRAMES[kind], (ctx, f, canvas) => {
      if (kind === 'sky') {
        paintSky(ctx, age, f);
        return [];
      }
      const ambient = kind === 'far' ? paintFar(ctx, age, f) : paintMid(ctx, age, f);
      // light the silhouettes like the 3D art and add atmospheric depth (backdrops/lighting.ts)
      finishLayer(canvas, ctx, kind === 'far' ? 'far' : 'mid', age, f);
      return ambient;
    });
  }

  ground(arena: ArenaId): Painted {
    const img = this.images.get(`ground.${arena}`);
    if (img) return img;
    this.loadGround(arena);
    return this.get(`ground.${arena}`, GROUND_FRAME, (ctx, f) => paintGround(ctx, arena, f));
  }

  /**
   * The arena ground re-graded for a backdrop skin (review 11), cached per arena, theme and base
   * texture like the themed layers. Null when there is nothing to bake (no DOM, unknown theme).
   */
  groundThemed(arena: ArenaId, skin: string): Painted | null {
    const id = backdropId(skin);
    const th = id ? BACKDROP_THEMES[id] : undefined;
    const base = this.ground(arena);
    if (!id || !th || !this.canBake || base.tex === Texture.EMPTY) return null;
    const src = base.tex.source;
    const key = `ground.${arena}@${id}#${src.uid}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const t0 = performance.now();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(src.pixelWidth));
    canvas.height = Math.max(1, Math.round(src.pixelHeight));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const resource = src.resource as CanvasImageSource | undefined;
    if (resource) ctx.drawImage(resource, 0, 0, canvas.width, canvas.height);
    themeGround(canvas, ctx, id, th, { ...GROUND_FRAME, pxPerLu: src.resolution });
    const source = new CanvasSource({ resource: canvas, resolution: 1 });
    source.resolution = src.resolution;
    const p = { tex: new Texture({ source }), ambient: [] };
    this.cache.set(key, p);
    this.bakeMs += performance.now() - t0;
    return p;
  }

  /**
   * Frees the GPU memory of every pre-rendered scene not in `keep` (scene keys `<age>.<scene>`) and drops
   * the themed copies made from them (PLAN 2b "Memory": an age a side has left, once its wipe ends). The
   * images stay in the browser's cache and upload again if a scene comes back.
   */
  release(keep: ReadonlySet<string>): number {
    let n = 0;
    for (const [k, p] of this.images) {
      if (k.startsWith('ground.')) continue;
      const scene = k.slice(k.indexOf('.') + 1);
      if (keep.has(scene)) continue;
      const uid = p.tex.source.uid;
      for (const [ck, cp] of this.cache) {
        if (ck.endsWith(`#${uid}`)) {
          cp.tex.destroy(true);
          this.cache.delete(ck);
          n++;
        }
      }
      p.tex.source.unload();
      n++;
    }
    return n;
  }

  private get(key: string, frame: LayerFrame, paint: (ctx: CanvasRenderingContext2D, f: LayerFrame, canvas: HTMLCanvasElement) => AmbientSpec[]): Painted {
    const hit = this.cache.get(key);
    if (hit) return hit;
    if (!this.canBake) {
      const p = { tex: Texture.EMPTY, ambient: [] };
      this.cache.set(key, p);
      return p;
    }
    const t0 = performance.now();
    const res = frame.pxPerLu * (this.quality === 'lite' ? 0.75 : 1);
    const f = { ...frame, pxPerLu: res };
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(frame.width * res);
    canvas.height = Math.ceil(frame.height * res);
    const ctx = canvas.getContext('2d');
    let ambient: AmbientSpec[] = [];
    if (ctx) ambient = paint(ctx, f, canvas);
    const source = new CanvasSource({ resource: canvas, resolution: 1 });
    source.resolution = res;
    const p = { tex: new Texture({ source }), ambient };
    this.cache.set(key, p);
    this.bakeMs += performance.now() - t0;
    return p;
  }

  destroy(): void {
    for (const p of this.cache.values()) if (p.tex !== Texture.EMPTY) p.tex.destroy(true);
    this.cache.clear();
    // the image sources are this provider's (the decoded images stay in the shared file cache)
    for (const p of this.images.values()) p.tex.destroy(true);
    this.images.clear();
    for (const frames of this.props.values()) {
      const sources = new Set<Texture['source']>();
      for (const f of frames.values()) {
        sources.add(f.tex.source);
        f.tex.destroy(false);
      }
      for (const src of sources) src.destroy();
    }
    this.props.clear();
  }
}

function propFrame(atlas: Texture, f: SceneFrame): PropFrame {
  const src = atlas.source;
  const x = Math.max(0, Math.min(src.pixelWidth - 1, f.x));
  const y = Math.max(0, Math.min(src.pixelHeight - 1, f.y));
  const w = Math.max(1, Math.min(src.pixelWidth - x, f.w));
  const h = Math.max(1, Math.min(src.pixelHeight - y, f.h));
  // the atlas source stays at 1 px per px; the sprite scales by 1 / ppl into lu
  const frame = new Rectangle(x / src.resolution, y / src.resolution, w / src.resolution, h / src.resolution);
  return { tex: new Texture({ source: src, frame }), ax: f.ax, ay: f.ay, ppl: f.ppl / src.resolution };
}

/** Px per lu of the pre-rendered ground images (backdrop.py FRAMES.ground). */
export const GROUND_IMAGE_PX_PER_LU = 1.3;

/**
 * How far (lu) a themed sky moves down for a camera that shows `above` lu over the ground line
 * (review 4). A theme's sun, moon, eclipse and aurora are painted about 250 lu up, which a desktop
 * view shows well under the HUD; a phone shows only about 290 lu, and its top bars cover the upper
 * third of that, so there the sky slides down until those features sit at about 58% of the visible
 * height (80-150 px from the top of a 390 px screen). The sky texture reaches 780 lu up, far above any
 * view, so the slide never shows its edge; the classic skies do not move.
 */
export function themedSkyLift(above: number): number {
  return Math.max(0, Math.min(120, 250 - above * 0.58));
}

/** A horizontal slice [x0, x1] of a layer texture with a constant alpha. */
export interface Piece {
  age: AgeId;
  /** The backdrop skin of this piece's half (`backdrop.<id>`); absent is the age's classic look. */
  skin?: string;
  /** The scene this piece shows (a scene id with art); absent is the age's classic scene. */
  scene?: string;
  x0: number;
  x1: number;
  alpha: number;
  /**
   * The lower half of a cross-fade pair (drawn first). An opaque layer (the sky) draws it at full
   * alpha, so `under + over × s` is an exact cross-fade and nothing behind the backdrop shows through.
   */
  under?: boolean;
}

interface Region {
  age: AgeId;
  skin?: string;
  scene?: string;
  x0: number;
  x1: number;
}

/** Each half's scene per age: `scene.<id>` keys (the save's and the match look's shape). */
export type SideScenes = { left?: Partial<Record<AgeId, string>>; right?: Partial<Record<AgeId, string>> };

/** The scene a half shows in an age (an id with art, `undefined` for the classic scene). */
function sceneFor(map: Partial<Record<AgeId, string>> | undefined, age: AgeId): { scene?: string } {
  const id = drawnScene(age, sceneIdOf(map?.[age]));
  return id === 'classic' ? {} : { scene: id };
}

/**
 * Splits the lane into age regions: [left, seam], [seam, right], plus an optional wipe front. A side's
 * backdrop skin (`skins`) goes with every region of its half, through a wipe too (the theme stays
 * when the age changes); its scene (`scenes`) is the one it equipped for each region's age.
 */
export function ageRegions(o: {
  left: AgeId;
  right: AgeId;
  seam: number;
  wipe: { side: Side; age: AgeId; front: number } | null;
  skins?: { left?: string | null; right?: string | null };
  scenes?: SideScenes;
}): Region[] {
  const L = WORLD.worldLeftLu - 100;
  const R = WORLD.worldRightLu + 100;
  const sl = o.skins?.left ? { skin: o.skins.left } : {};
  const sr = o.skins?.right ? { skin: o.skins.right } : {};
  const left = (age: AgeId) => ({ age, ...sl, ...sceneFor(o.scenes?.left, age) });
  const right = (age: AgeId) => ({ age, ...sr, ...sceneFor(o.scenes?.right, age) });
  const regions: Region[] = [
    { ...left(o.left), x0: L, x1: o.seam },
    { ...right(o.right), x0: o.seam, x1: R },
  ];
  const w = o.wipe;
  if (w) {
    if (w.side === 0) {
      const fx = Math.min(o.seam, L + w.front);
      regions.splice(0, 1, { ...left(w.age), x0: L, x1: fx }, { ...left(o.left), x0: fx, x1: o.seam });
    } else {
      const fx = Math.max(o.seam, R - w.front);
      regions.splice(1, 1, { ...right(o.right), x0: o.seam, x1: fx }, { ...right(w.age), x0: fx, x1: R });
    }
  }
  return regions.filter((r) => r.x1 - r.x0 > 0.5);
}

/** Turns regions into solid pieces and stepped cross-fade strips. */
export function composePieces(regions: readonly Region[], seam: number): Piece[] {
  const pieces: Piece[] = [];
  const widths: number[] = [];
  const look = (r: Region) => ({ ...(r.skin ? { skin: r.skin } : {}), ...(r.scene ? { scene: r.scene } : {}) });
  for (let i = 0; i < regions.length - 1; i++) {
    const a = regions[i];
    const b = regions[i + 1];
    if (!a || !b) continue;
    const want = Math.abs(a.x1 - seam) < 0.5 ? WORLD.seamBlendLu : WIPE_EDGE_LU;
    widths.push(Math.min(want, (a.x1 - a.x0) * 2, (b.x1 - b.x0) * 2));
  }
  regions.forEach((r, i) => {
    const wl = i > 0 ? (widths[i - 1] ?? 0) / 2 : 0;
    const wr = i < widths.length ? (widths[i] ?? 0) / 2 : 0;
    if (r.x1 - wr > r.x0 + wl) pieces.push({ age: r.age, ...look(r), x0: r.x0 + wl, x1: r.x1 - wr, alpha: 1 });
  });
  for (let i = 0; i < widths.length; i++) {
    const a = regions[i];
    const b = regions[i + 1];
    const w = widths[i] ?? 0;
    if (!a || !b || w <= 0) continue;
    const c = a.x1;
    if (a.age === b.age && a.skin === b.skin && a.scene === b.scene) {
      // the same look on both sides of the cut: nothing to cross-fade, one solid piece
      pieces.push({ age: a.age, ...look(a), x0: c - w / 2, x1: c + w / 2, alpha: 1 });
      continue;
    }
    const n = Math.max(1, Math.ceil(w / STRIP_LU));
    for (let k = 0; k < n; k++) {
      const x0 = c - w / 2 + (k * w) / n;
      const x1 = c - w / 2 + ((k + 1) * w) / n;
      const t = (k + 0.5) / n;
      const s = t * t * (3 - 2 * t);
      pieces.push({ age: a.age, ...look(a), x0, x1, alpha: 1 - s, under: true });
      pieces.push({ age: b.age, ...look(b), x0, x1, alpha: s });
    }
  }
  return mergeSolid(pieces);
}

/**
 * Joins touching solid pieces of the same look into one (review 1, frame time): with both halves in
 * the same age, scene and sky, each layer is a single sprite instead of the two halves and 50 seam
 * strips, which the battle re-cut on every camera move. The image is the same (one texture, alpha 1).
 * Solid pieces stay first, the cross-fade pairs keep their order after them.
 */
function mergeSolid(pieces: Piece[]): Piece[] {
  const solid = pieces.filter((p) => p.alpha === 1 && !p.under).sort((a, b) => a.x0 - b.x0);
  const out: Piece[] = [];
  for (const p of solid) {
    const last = out[out.length - 1];
    if (last && last.age === p.age && last.skin === p.skin && last.scene === p.scene && Math.abs(last.x1 - p.x0) < 1e-6) last.x1 = p.x1;
    else out.push({ ...p });
  }
  for (const p of pieces) if (!(p.alpha === 1 && !p.under)) out.push(p);
  return out;
}

interface Amb {
  spec: AmbientSpec;
  age: AgeId | null;
  /** The scene the spec belongs to (absent: any scene of the age, e.g. the bird flocks). */
  scene?: string;
  node: Sprite;
  t: number;
  acc: number;
  /** Flap and glide frames (birds): textures with their anchors. */
  frames?: { tex: Texture; ax: number; ay: number }[];
}

/** A scene's moving prop (PLAN 2b sprites), one Pixi sprite per group member. */
interface PropNode {
  sprite: SceneSprite;
  age: AgeId;
  scene: string;
  phase: number;
  nodes: Sprite[];
  frames: ReadonlyMap<string, PropFrame>;
  weight: number;
  /** A path's trail emitter (the loco's smoke) and its accumulator. */
  trail: { spec: AmbientSpec; acc: number } | null;
}

/** A night light of a scene (a warm glow while the half wears a night sky). */
interface LightNode {
  light: SceneLight;
  age: AgeId;
  scene: string;
  node: Sprite;
  phase: number;
  weight: number;
}

interface Mote {
  s: Sprite;
  /** `layer|part`: a mote that runs out waits under this key for the next puff of its kind. */
  key: string;
  vx: number;
  vy: number;
  life: number;
  age: number;
  a0: number;
}

/**
 * The texture shown per piece look on a layer and the one it is fading from: a pre-rendered image that
 * arrives (or a sky theme re-painted on it) cross-fades over {@link ARRIVAL_FADE_MS} instead of popping.
 */
export class FadeTracker {
  private readonly shown = new Map<string, { tex: Texture; from: Texture | null; t0: number; seen: number }>();
  private frame = 0;

  /** Starts a layout pass. */
  begin(): void {
    this.frame++;
  }

  /** The texture a look shows now and the one it fades from with the new one's weight `u` (0..1). */
  track(key: string, tex: Texture, now: number): { from: Texture | null; u: number } {
    let s = this.shown.get(key);
    if (!s || s.tex !== tex) {
      const from = s && s.tex !== Texture.EMPTY && !s.tex.destroyed ? s.tex : null;
      s = { tex, from, t0: now, seen: this.frame };
      this.shown.set(key, s);
    }
    s.seen = this.frame;
    if (!s.from) return { from: null, u: 1 };
    const u = Math.min(1, Math.max(0, (now - s.t0) / ARRIVAL_FADE_MS));
    if (u >= 1 || s.from.destroyed) {
      s.from = null;
      return { from: null, u: 1 };
    }
    return { from: s.from, u };
  }

  /** Ends a pass: forgets looks no piece showed (and reports whether a fade is still running). */
  end(): boolean {
    let fading = false;
    for (const [k, s] of this.shown) {
      if (s.seen !== this.frame) this.shown.delete(k);
      else if (s.from) fading = true;
    }
    return fading;
  }
}

class StripLayer {
  readonly container = new Container();
  private readonly pool: { s: Sprite; t: Texture }[] = [];
  private readonly fades = new FadeTracker();

  constructor(
    readonly kind: LayerKind,
    private readonly textures: BackdropTextures,
  ) {}

  /**
   * Lays the pieces (world x) out on this layer, placed at `at` (see `placeLayer`). `skinLift` moves a
   * themed piece down by that many lu (the sky: see `themedSkyLift`). Returns true while an arrival
   * cross-fade runs (the view lays out again next frame).
   */
  layout(pieces: readonly Piece[], at: LayerPlacement = IDENTITY_PLACEMENT, skinLift = 0, now = 0): boolean {
    const f = FRAMES[this.kind];
    this.container.x = at.offset;
    this.container.scale.set(at.stretch, at.scaleY);
    let used = 0;
    this.fades.begin();
    for (const p of pieces) {
      const src = this.textures.layer(this.kind, p.age, p.skin, p.scene).tex;
      const fade = this.fades.track(`${p.age}|${p.scene ?? ''}|${p.skin ?? ''}`, src, now);
      if (src === Texture.EMPTY && !fade.from) continue;
      const x0 = Math.max(f.x0, (p.x0 - at.offset) / at.stretch);
      const x1 = Math.min(f.x0 + f.width, (p.x1 - at.offset) / at.stretch);
      if (x1 <= x0) continue;
      // The sky is opaque: its lower cross-fade piece stays solid (see `Piece.under`). Silhouette
      // layers are mostly transparent, so both halves fade.
      const alpha = this.kind === 'sky' && p.under ? 1 : p.alpha;
      if (fade.from) this.place(used++, fade.from, p, x0, x1, this.kind === 'sky' ? alpha : alpha * (1 - fade.u), skinLift);
      if (src !== Texture.EMPTY) this.place(used++, src, p, x0, x1, alpha * fade.u, skinLift);
    }
    for (let i = used; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (s) s.s.visible = false;
    }
    return this.fades.end();
  }

  private place(i: number, src: Texture, p: Piece, x0: number, x1: number, alpha: number, skinLift: number): void {
    const f = FRAMES[this.kind];
    const slot = this.slot(i);
    if (slot.t.source !== src.source) slot.t.source = src.source;
    // Frames are in logical units (lu): the source's resolution is its px per lu.
    const fx = x0 - f.x0;
    slot.t.frame.x = fx;
    slot.t.frame.y = 0;
    slot.t.frame.width = Math.max(0.01, Math.min(x1 - x0, src.source.width - fx));
    slot.t.frame.height = src.source.height;
    slot.t.update();
    slot.s.texture = slot.t;
    slot.s.visible = alpha > 0.002;
    slot.s.alpha = alpha;
    slot.s.position.set(x0, f.yTop + (p.skin ? skinLift : 0));
    slot.s.width = x1 - x0;
    slot.s.height = f.height;
  }

  /**
   * Destroys the slot textures (not their sources: the layer canvases are cached across battles).
   * A slot texture listens to its source's `resize`, and Pixi's `Sprite.destroy` leaves the sprite
   * on a dynamic texture's `update`, so without this every battle leaks its strips into the cache.
   */
  destroy(): void {
    for (const p of this.pool) p.t.destroy(false);
    this.pool.length = 0;
  }

  private slot(i: number): { s: Sprite; t: Texture } {
    let s = this.pool[i];
    if (!s) {
      const t = new Texture({ source: Texture.WHITE.source, frame: new Rectangle(0, 0, 1, 1), dynamic: true });
      s = { s: new Sprite(t), t };
      this.container.addChild(s.s);
      this.pool.push(s);
    }
    return s;
  }
}

/**
 * A themed half's ground (review 11): the arena ground re-graded for the half's backdrop skin, laid
 * over the classic ground on that half only and faded across the seam in thin strips, like the sky.
 * The ground art spans [x0, x0 + W] and a mirrored copy [x0 + W, x0 + 2W] (A17.3); a strip reads the
 * texture at the same place the classic sprite shows there.
 */
class GroundSkinLayer {
  readonly container = new Container();
  private readonly pool: { s: Sprite; t: Texture }[] = [];

  layout(seam: number, tex: { left: Texture | null; right: Texture | null }): void {
    const L = WORLD.worldLeftLu - 100;
    const R = WORLD.worldRightLu + 100;
    const b = WORLD.seamBlendLu;
    const n = Math.max(1, Math.ceil(b / STRIP_LU));
    const spans: { x0: number; x1: number; alpha: number; tex: Texture }[] = [];
    const half = (t: Texture | null, side: 0 | 1) => {
      if (!t) return;
      if (side === 0) spans.push({ x0: L, x1: seam - b / 2, alpha: 1, tex: t });
      else spans.push({ x0: seam + b / 2, x1: R, alpha: 1, tex: t });
      for (let k = 0; k < n; k++) {
        const x0 = seam - b / 2 + (k * b) / n;
        const x1 = seam - b / 2 + ((k + 1) * b) / n;
        const u = (k + 0.5) / n;
        const sm = u * u * (3 - 2 * u);
        spans.push({ x0, x1, alpha: side === 0 ? 1 - sm : sm, tex: t });
      }
    };
    half(tex.left, 0);
    half(tex.right, 1);
    const f = GROUND_FRAME;
    const mid = f.x0 + f.width;
    let used = 0;
    for (const sp of spans) {
      // split at the mirror line
      const parts: [number, number][] = sp.x1 <= mid || sp.x0 >= mid ? [[sp.x0, sp.x1]] : [
        [sp.x0, mid],
        [mid, sp.x1],
      ];
      for (const [a0, a1] of parts) {
        const x0 = Math.max(a0, f.x0);
        const x1 = Math.min(a1, f.x0 + 2 * f.width);
        if (x1 - x0 < 0.01) continue;
        const mirrored = x0 >= mid;
        const tx0 = mirrored ? 2 * mid - x1 : x0;
        const slot = this.slot(used++);
        if (slot.t.source !== sp.tex.source) slot.t.source = sp.tex.source;
        const fx = Math.max(0, tx0 - f.x0);
        slot.t.frame.x = fx;
        slot.t.frame.y = 0;
        slot.t.frame.width = Math.max(0.01, Math.min(x1 - x0, sp.tex.source.width - fx));
        slot.t.frame.height = sp.tex.source.height;
        slot.t.update();
        slot.s.texture = slot.t;
        slot.s.visible = true;
        slot.s.alpha = sp.alpha;
        slot.s.scale.set(1);
        slot.s.width = x1 - x0;
        slot.s.height = f.height;
        if (mirrored) {
          slot.s.scale.x = -Math.abs(slot.s.scale.x);
          slot.s.position.set(x1, f.yTop);
        } else slot.s.position.set(x0, f.yTop);
      }
    }
    for (let i = used; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (s) s.s.visible = false;
    }
  }

  destroy(): void {
    for (const p of this.pool) p.t.destroy(false);
    this.pool.length = 0;
  }

  private slot(i: number): { s: Sprite; t: Texture } {
    let s = this.pool[i];
    if (!s) {
      const t = new Texture({ source: Texture.WHITE.source, frame: new Rectangle(0, 0, 1, 1), dynamic: true });
      s = { s: new Sprite(t), t };
      this.container.addChild(s.s);
      this.pool.push(s);
    }
    return s;
  }
}

/**
 * Seam haze alpha at `t` ∈ [0, 1] across the seam: 0 at both edges, `WORLD.seamDesaturate` in the
 * middle, smooth in between (a hard-edged veil reads as a pillar of fog).
 */
export function hazeAlpha(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  return WORLD.seamDesaturate * Math.sin(Math.PI * t);
}

/**
 * The seam's 30% desaturation (A11): thin vertical strips of a neutral grey (the luma of the two ages'
 * sky and silhouette colours) whose alpha rises from 0 at the seam edges to 30% at the seam. Drawn
 * over the sky, far and mid layers and under the ground.
 */
class HazeLayer {
  readonly container = new Container();
  private readonly strips: Sprite[] = [];

  constructor() {
    const n = Math.ceil(WORLD.seamBlendLu / STRIP_LU);
    for (let i = 0; i < n; i++) {
      const s = new Sprite(Texture.WHITE);
      this.strips.push(s);
      this.container.addChild(s);
    }
  }

  layout(seam: number, left: AgeId, right: AgeId): void {
    const L = BACKDROP_PALETTES[left];
    const R = BACKDROP_PALETTES[right];
    const grey = desaturate(mix(mix(L.skyBottom, L.far, 0.5), mix(R.skyBottom, R.far, 0.5), 0.5), 1);
    const n = this.strips.length;
    const w = WORLD.seamBlendLu / n;
    const top = SKY_FRAME.yTop;
    this.strips.forEach((s, i) => {
      s.position.set(seam - WORLD.seamBlendLu / 2 + i * w, top);
      s.width = w;
      s.height = -top;
      s.tint = grey;
      s.alpha = hazeAlpha((i + 0.5) / n);
    });
  }
}

export interface BackdropViewOptions {
  left: AgeId;
  right: AgeId;
  arena: string;
  textures: BackdropTextures;
  baker: PartBaker;
  quality: 'high' | 'lite';
  seed: number;
  /** Each half's backdrop skin (`backdrop.<id>`, A18.9.4; the "Sky" from save v14); left = side 0. */
  skins?: { left?: string | null; right?: string | null };
  /** Each half's scene per age (`scene.<id>`, save v14, PLAN 2b); an age without one shows its classic scene. */
  scenes?: SideScenes;
}

type AmbLayer = 'sky' | 'back' | 'far' | 'mid' | 'ground';

export class ProceduralBackdropView implements BackdropView {
  /**
   * A render group (Pixi v8): the battle's scene graph changes almost every frame (units, effects,
   * numbers); as its own group the backdrop keeps its instruction set, rebuilt only when the backdrop
   * itself changes (which reused motes, `spareMotes`, keep rare), and the camera moves it as one
   * transform. With one piece per layer for one look (`mergeSolid`) the scenes pass review 1's gate: a
   * 60 s Standard War from Bronze at 844 x 390, CPU 4x, High, with the Blender scene on both halves
   * costs +0.55 ms (median) and +0.37 ms (mean) a frame over the painted layers (+1 ms allowed), with
   * the same draw calls and the same image.
   */
  readonly root = new Container({ isRenderGroup: true });
  private readonly layers: StripLayer[];
  private readonly clouds = new Container();
  private readonly haze = new HazeLayer();
  private readonly groundLayer = new Container();
  private readonly groundSprite: Sprite;
  /** A mirrored copy that extends the ground over the 2,000 lu lane (A17.3). */
  private readonly groundMirror: Sprite;
  private texVersion = -1;
  private readonly ambientLayers: Record<AmbLayer, Container>;
  /** Night lights over each strip (additive glows, one batch per layer). */
  private readonly lightLayers: Record<'back' | 'far' | 'mid', Container>;
  private readonly rng: CosmeticRng;
  private left: AgeId;
  private right: AgeId;
  private readonly arena: ArenaId;
  private seam: number = WORLD.seamHomeLu;
  private seamTarget: number = WORLD.seamHomeLu;
  private wipeState: { side: Side; age: AgeId; t: number; ms: number } | null = null;
  private dirty = true;
  private fading = false;
  private ambient: Amb[] = [];
  private propNodes: PropNode[] = [];
  private lightNodes: LightNode[] = [];
  private motes: Mote[] = [];
  /**
   * Motes that ran out, kept in their layer at alpha 0 for the next puff of the same part (review 1,
   * frame time). Adding or removing a child makes the backdrop's render group rebuild its instruction
   * set, and chimneys, embers and snow did that on about two frames in three; reused, the backdrop's
   * structure stays the same from frame to frame. At most the peak count of live motes per kind.
   */
  private spareMotes = new Map<string, Sprite[]>();
  private destroyed = false;
  /** Render time since the view was made (ms): drives the scene sprites and the arrival fades. */
  private clock = 0;
  /** The camera's visible range (world lu); null = no camera yet (the whole world, layers unshifted). */
  private viewLeft: number | null = null;
  private viewWidth: number = WORLD.worldWidthLu;
  /** World height (lu) the camera shows above the ground line. */
  private viewAbove = 1000;
  private placements: Partial<Record<LayerKind, LayerPlacement>> = {};
  private regions: Region[] = [];
  /** Each half's backdrop skin key, when it has a known theme. */
  private readonly skins: { left?: string; right?: string };
  /** Each half's scene per age. */
  private readonly scenes: SideScenes;
  private readonly weather: BackdropWeatherLayer;
  /** The weather each side runs (its sky theme, and whether its scene turns it into space weather). */
  private readonly weatherKeys: [string, string] = ['', ''];
  private readonly groundSkin = new GroundSkinLayer();
  /** The drifting clouds' own alpha (before a scene's `clouds` factor). */
  private readonly cloudAlpha: number[] = [];

  constructor(private readonly o: BackdropViewOptions) {
    this.left = o.left;
    this.right = o.right;
    const l = backdropId(o.skins?.left);
    const r = backdropId(o.skins?.right);
    this.skins = { ...(l ? { left: `backdrop.${l}` } : {}), ...(r ? { right: `backdrop.${r}` } : {}) };
    this.scenes = { left: { ...(o.scenes?.left ?? {}) }, right: { ...(o.scenes?.right ?? {}) } };
    this.arena = arenaId(o.arena);
    this.rng = mulberry32(o.seed);
    this.root.label = `backdrop.${o.left}${l ? `@${l}` : ''}|${o.right}${r ? `@${r}` : ''}|ground.${this.arena}`;
    // Lite keeps the mid layer since A17: with a scrolling camera it is the layer that shows the
    // parallax depth (A17.7). It keeps a scene's back strip too (review 1: one sprite, and without it
    // Bronze lost its volcano and Cosmic its planet), but not the strip's moving props, lights or
    // emitters, and it halves the rest of the ambient life.
    this.layers = LAYERS.map((k) => new StripLayer(k, o.textures));
    this.ambientLayers = { sky: new Container(), back: new Container(), far: new Container(), mid: new Container(), ground: new Container() };
    this.lightLayers = { back: new Container(), far: new Container(), mid: new Container() };
    const byKind = (k: LayerKind): StripLayer | undefined => this.layers.find((x) => x.kind === k);
    const sky = byKind('sky');
    if (sky) this.root.addChild(sky.container);
    this.root.addChild(this.clouds, this.ambientLayers.sky);
    const back = byKind('back');
    if (back) this.root.addChild(back.container, this.ambientLayers.back, this.lightLayers.back);
    const far = byKind('far');
    if (far) this.root.addChild(far.container);
    this.root.addChild(this.ambientLayers.far, this.lightLayers.far);
    const mid = byKind('mid');
    if (mid) {
      // the mid-ground sits about 13% darker than painted, so grey and white units (knights, mechs)
      // do not sink into trees and fog at the same brightness (art director review)
      mid.container.tint = MID_LAYER_TINT;
      this.root.addChild(mid.container);
    }
    this.root.addChild(this.ambientLayers.mid, this.lightLayers.mid);
    this.root.addChild(this.haze.container);
    // backdrop skin weather: over the mid-ground and the seam haze, under the ground and the lane
    this.weather = new BackdropWeatherLayer(o.baker, o.quality, this.rng);
    this.syncWeather();
    this.root.addChild(this.weather.root);
    this.groundSprite = new Sprite(Texture.EMPTY);
    this.groundSprite.position.set(GROUND_FRAME.x0, GROUND_FRAME.yTop);
    this.groundMirror = new Sprite(Texture.EMPTY);
    this.groundMirror.position.set(GROUND_FRAME.x0 + 2 * GROUND_FRAME.width, GROUND_FRAME.yTop);
    this.groundLayer.addChild(this.groundSprite, this.groundMirror);
    o.textures.prefetch([o.left, o.right], [this.arena], [this.sceneRef(0, o.left), this.sceneRef(1, o.right)]);
    this.syncGround();
    this.root.addChild(this.groundLayer, this.groundSkin.container, this.ambientLayers.ground);
    this.spawnClouds();
    this.rebuildAmbient();
    this.texVersion = o.textures.version;
    this.layout();
  }

  /** The drawn scene of a side in an age (`classic` when it has none or no art). */
  private sceneOf(side: Side, age: AgeId): string {
    return drawnScene(age, sceneIdOf((side === 0 ? this.scenes.left : this.scenes.right)?.[age]));
  }

  private sceneRef(side: Side, age: AgeId): { age: AgeId; scene: string } {
    return { age, scene: this.sceneOf(side, age) };
  }

  private syncGround(): void {
    const ground = this.o.textures.ground(this.arena);
    for (const [i, s] of [this.groundSprite, this.groundMirror].entries()) {
      s.texture = ground.tex;
      s.visible = ground.tex !== Texture.EMPTY;
      if (!s.visible) continue;
      s.scale.set(1);
      s.width = GROUND_FRAME.width;
      s.height = GROUND_FRAME.height;
      // The copy is mirrored, so it meets the original seamlessly at the frame's right edge.
      if (i === 1) s.scale.x = -Math.abs(s.scale.x);
    }
  }

  /**
   * Each side's weather: its sky theme, turned into space weather while that half shows a scene with
   * the `weather: 'space'` hint (PLAN 2b). Only a change restarts the weather.
   */
  private syncWeather(): void {
    for (const side of [0, 1] as const) {
      const key = side === 0 ? this.skins.left : this.skins.right;
      const id = key ? key.slice('backdrop.'.length) : '';
      const base = id ? (BACKDROP_THEMES[id] ?? null) : null;
      const age = side === 0 ? this.left : this.right;
      const space = base !== null && this.sceneData(age, this.sceneOf(side, age))?.hints.weather === 'space';
      const k = `${id}|${space ? 'space' : 'ground'}`;
      if (k === this.weatherKeys[side]) continue;
      this.weatherKeys[side] = k;
      this.weather.setTheme(side, base && space ? spaceWeather(base) : base);
    }
  }

  /** Scene data from the textures (tolerates a minimal textures stand-in in tests). */
  private sceneData(age: AgeId, scene: string): SceneData | null {
    const t = this.o.textures as Partial<BackdropTextures>;
    return typeof t.scene === 'function' ? t.scene.call(this.o.textures, age, scene) : null;
  }

  setSeam(x: number): void {
    this.seamTarget = Math.max(WORLD.seamMinLu, Math.min(WORLD.seamMaxLu, x));
  }

  /**
   * Starts loading a side's scene for an age it is about to reach (duck-typed; the battle view calls it
   * once that side's evolve is near and again on its Ascension, so the files are in before the wipe
   * starts; review 1). Idempotent, and an age no side nears is never requested.
   */
  prefetchAge(side: Side, age: AgeId): void {
    this.o.textures.prefetch([age], [], [this.sceneRef(side, age)]);
  }

  wipe(side: Side, age: AgeId, ms: number = WORLD.evolveWipeMs): void {
    // finish a running wipe first
    if (this.wipeState) this.finishWipe();
    this.wipeState = { side, age, t: 0, ms: Math.max(1, ms) };
    // (normally prefetched already, see `prefetchAge`; a wipe without a warning still loads it now)
    this.o.textures.prefetch([age], [], [this.sceneRef(side, age)]);
    this.rebuildAmbient();
    this.dirty = true;
  }

  /**
   * The battle camera's visible world range (A17.7). The layers scroll at their parallax factors; the
   * view calls this every frame (cheap when nothing moved).
   */
  setView(left: number, width: number, above = 1000): void {
    if (this.viewLeft !== null && Math.abs(left - this.viewLeft) < 0.05 && Math.abs(width - this.viewWidth) < 0.05 && Math.abs(above - this.viewAbove) < 0.5) return;
    this.viewLeft = left;
    this.viewWidth = Math.max(1, width);
    this.viewAbove = Math.max(1, above);
    this.dirty = true;
  }

  /** Where each layer sits for the current view (identity until the camera reports one). */
  private placement(kind: LayerKind): LayerPlacement {
    if (this.viewLeft === null) return IDENTITY_PLACEMENT;
    const content = LAYER_CONTENT_LU[kind];
    const fit = content > 0 ? (this.viewAbove * 0.92) / content : 1;
    return placeLayer(FRAMES[kind], FACTOR[kind], this.viewLeft, this.viewWidth, fit);
  }

  /** Current seam position (lu) and ages, for tests and the gallery. */
  get state(): {
    seam: number;
    target: number;
    left: AgeId;
    right: AgeId;
    wiping: boolean;
    skins: { left?: string; right?: string };
    scenes: { left: string; right: string };
    weather: number;
    sprites: number;
    lights: number;
  } {
    return {
      seam: this.seam,
      target: this.seamTarget,
      left: this.left,
      right: this.right,
      wiping: this.wipeState !== null,
      skins: { ...this.skins },
      scenes: { left: this.sceneOf(0, this.left), right: this.sceneOf(1, this.right) },
      weather: this.weather.count,
      sprites: this.propNodes.reduce((a, p) => a + p.nodes.filter((n) => n.visible).length, 0),
      lights: this.lightNodes.filter((l) => l.node.visible).length,
    };
  }

  /** Lightning strikes since the last call (Thunderstorm skin), for the battle view's thunder. */
  drainStrikes(): { side: Side; x: number }[] {
    return this.weather.drainStrikes();
  }

  /** Reduce motion and Lite (duck-typed like the base views): quieter weather, no lightning, still props. */
  setMotion(o: { reduce: boolean; lite: boolean }): void {
    this.weather.setMotion(o);
    this.reduceMotion = o.reduce;
  }

  /** Reduce motion: birds glide (no flapping) and drift at half speed (UI art audit §4); scene props hold still. */
  private reduceMotion = false;

  update(dtMs: number): void {
    if (this.destroyed) return;
    this.clock += dtMs;
    const maxStep = (WORLD.seamDriftLuPerSec * dtMs) / 1000;
    const d = this.seamTarget - this.seam;
    if (Math.abs(d) > 0.01) {
      this.seam += Math.max(-maxStep, Math.min(maxStep, d));
      this.dirty = true;
    }
    if (this.wipeState) {
      this.wipeState.t += dtMs;
      this.dirty = true;
      if (this.wipeState.t >= this.wipeState.ms) this.finishWipe();
    }
    if (this.o.textures.version !== this.texVersion) {
      // a pre-rendered layer or scene arrived: swap it in (and its ambient life)
      this.texVersion = this.o.textures.version;
      this.syncGround();
      this.rebuildAmbient();
      this.syncWeather();
      this.dirty = true;
    }
    if (this.dirty || this.fading) this.layout();
    this.stepAmbient(dtMs);
    const vl = this.viewLeft ?? WORLD.worldLeftLu;
    const vw = this.viewLeft === null ? WORLD.worldWidthLu : this.viewWidth;
    this.weather.update(dtMs, { left: vl, width: vw, above: this.viewLeft === null ? 520 : this.viewAbove, seam: this.seam });
  }

  private finishWipe(): void {
    const w = this.wipeState;
    if (!w) return;
    if (w.side === 0) this.left = w.age;
    else this.right = w.age;
    this.wipeState = null;
    // the age a side has left releases its GPU textures (PLAN 2b "Memory")
    const keep = new Set([sceneKey(this.left, this.sceneOf(0, this.left)), sceneKey(this.right, this.sceneOf(1, this.right))]);
    const t = this.o.textures as Partial<BackdropTextures>;
    if (typeof t.release === 'function') t.release.call(this.o.textures, keep);
    this.rebuildAmbient();
    this.syncWeather();
    this.dirty = true;
  }

  private layout(): void {
    this.dirty = false;
    const w = this.wipeState;
    const half = w ? (w.side === 0 ? this.seam - (WORLD.worldLeftLu - 100) : WORLD.worldRightLu + 100 - this.seam) : 0;
    const eased = w ? 1 - Math.pow(1 - Math.min(1, w.t / w.ms), 2) : 0;
    const regions = ageRegions({ left: this.left, right: this.right, seam: this.seam, wipe: w ? { side: w.side, age: w.age, front: half * eased } : null, skins: this.skins, scenes: this.scenes });
    this.regions = regions;
    const pieces = composePieces(regions, this.seam);
    for (const kind of LAYERS) this.placements[kind] = this.placement(kind);
    const lift = this.viewLeft === null ? 0 : themedSkyLift(this.viewAbove);
    let fading = false;
    for (const l of this.layers) fading = l.layout(pieces, this.placements[l.kind], l.kind === 'sky' ? lift : 0, this.clock) || fading;
    this.fading = fading;
    for (const kind of LAYERS) {
      const at = this.placements[kind] ?? IDENTITY_PLACEMENT;
      const c = this.ambientLayers[kind];
      c.x = at.offset;
      c.scale.set(at.stretch, at.scaleY);
      if (kind === 'sky') {
        this.clouds.x = at.offset;
        this.clouds.scale.set(at.stretch, at.scaleY);
      } else {
        const lc = this.lightLayers[kind];
        lc.x = at.offset;
        lc.scale.set(at.stretch, at.scaleY);
      }
    }
    // seam haze: a soft grey veil (A11: 30% desaturation)
    this.haze.layout(this.seam, this.left, this.right);
    // a themed half's ground, faded across the seam (review 11)
    const gl = this.skins.left ? this.o.textures.groundThemed(this.arena, this.skins.left) : null;
    const gr = this.skins.right ? this.o.textures.groundThemed(this.arena, this.skins.right) : null;
    this.groundSkin.layout(this.seam, { left: gl?.tex ?? null, right: gr?.tex ?? null });
    const worldX = (layer: AmbLayer, x: number): number => {
      const at = layer === 'ground' ? undefined : this.placements[layer];
      return at ? at.offset + x * at.stretch : x;
    };
    for (const a of this.ambient) {
      if (!a.age) continue;
      const age = a.age;
      const scene = a.scene;
      const weight = regionWeight(regions, (r) => r.age === age && (scene === undefined || (r.scene ?? 'classic') === scene), worldX(a.spec.layer, a.spec.x));
      a.node.visible = weight > 0.02;
      a.node.alpha = (a.spec.alpha ?? 1) * weight;
    }
    for (const p of this.propNodes) {
      const x = p.sprite.kind === 'loop' || p.sprite.kind === 'bob' ? p.sprite.at[0] : null;
      // a moving group is weighted where it is in `stepAmbient`; a fixed prop here
      p.weight = x === null ? 1 : regionWeight(regions, (r) => r.age === p.age && (r.scene ?? 'classic') === p.scene, worldX(p.sprite.layer, x));
    }
    for (const l of this.lightNodes) {
      l.weight = regionWeight(regions, (r) => r.age === l.age && (r.scene ?? 'classic') === l.scene && isNightSky(r.skin), worldX(l.light.layer, l.light.x));
    }
  }

  /** Cloud drift speeds (lu/s): nearer (bigger, lower) clouds move faster, a parallax cue. */
  private cloudSpeed: number[] = [];

  private spawnClouds(): void {
    const n = this.o.quality === 'lite' ? 6 : 10;
    for (let i = 0; i < n; i++) {
      const depth = i / (n - 1); // 0 far .. 1 near
      const s = fxSprite(this.o.baker, i % 3 === 0 ? 'bd.cloud.c' : i % 2 ? 'bd.cloud.a' : 'bd.cloud.b');
      s.position.set(SKY_FRAME.x0 + this.rng.next() * SKY_FRAME.width, -470 - depth * 200 - this.rng.next() * 50);
      s.scale.set(0.6 + depth * 1.1 + this.rng.next() * 0.3);
      s.alpha = 0.35 + depth * 0.5;
      this.cloudAlpha.push(s.alpha);
      this.cloudSpeed.push(2 + depth * 9);
      this.clouds.addChild(s);
    }
  }

  private rebuildAmbient(): void {
    for (const a of this.ambient) a.node.destroy();
    this.ambient = [];
    for (const p of this.propNodes) for (const n of p.nodes) n.destroy();
    this.propNodes = [];
    for (const l of this.lightNodes) l.node.destroy();
    this.lightNodes = [];
    const looks = new Map<string, { age: AgeId; scene: string }>();
    const ages = new Set<AgeId>([this.left, this.right]);
    const add = (side: Side, age: AgeId) => {
      const scene = this.sceneOf(side, age);
      looks.set(sceneKey(age, scene), { age, scene });
    };
    add(0, this.left);
    add(1, this.right);
    if (this.wipeState) {
      ages.add(this.wipeState.age);
      add(this.wipeState.side, this.wipeState.age);
    }
    const lite = this.o.quality === 'lite';
    for (const { age, scene } of looks.values()) {
      const emitters: AmbientSpec[] = [];
      for (const kind of ['back', 'far', 'mid'] as const) {
        if (kind === 'mid' && lite) continue;
        if (kind === 'back' && lite) continue;
        for (const spec of this.o.textures.layer(kind, age, null, scene).ambient) {
          if (spec.kind === 'emit') emitters.push(spec);
          this.addAmbient(spec, age, scene);
        }
      }
      this.addSceneProps(age, scene, emitters);
    }
    for (const age of ages) for (const spec of extraAmbient(age)) if (this.o.quality === 'high' || spec.layer !== 'mid') this.addAmbient(spec, age);
    for (const spec of this.o.textures.ground(this.arena).ambient) {
      this.addAmbient(spec, null);
      // The mirrored ground copy gets its own ambient life (A17.3 longer lane).
      const mx = 2 * (GROUND_FRAME.x0 + GROUND_FRAME.width) - spec.x;
      if (mx <= WORLD.worldRightLu + 120) this.addAmbient({ ...spec, x: mx }, null);
    }
    // cloud tint follows the side ages (and a side's backdrop skin or scene sky); space scenes hide them
    const lt = this.skins.left ? BACKDROP_THEMES[this.skins.left.slice(9)] : undefined;
    const rt = this.skins.right ? BACKDROP_THEMES[this.skins.right.slice(9)] : undefined;
    const ld = this.sceneData(this.left, this.sceneOf(0, this.left));
    const rd = this.sceneData(this.right, this.sceneOf(1, this.right));
    this.clouds.children.forEach((c, i) => {
      if (!(c instanceof Sprite)) return;
      const leftSide = c.x < this.seam;
      const theme = leftSide ? lt : rt;
      const data = leftSide ? ld : rd;
      const sky = data?.sky ?? null;
      // a space scene keeps its own sky under a theme (review 1), so no theme clouds drift over it
      const own = !theme || data?.hints.weather === 'space';
      c.tint = theme && !own ? theme.cloudTint : (sky?.cloudTint ?? CLOUD_TINT[leftSide ? this.left : this.right] ?? CLOUD_TINT[i % 2 ? this.left : this.right]);
      c.alpha = (this.cloudAlpha[i] ?? 0.6) * (own ? (sky?.clouds ?? 1) : 1);
    });
  }

  /** A scene's moving props and night lights (PLAN 2b), within the per-half limits. */
  private addSceneProps(age: AgeId, scene: string, emitters: AmbientSpec[]): void {
    const data = this.sceneData(age, scene);
    if (!data) return;
    const t = this.o.textures as Partial<BackdropTextures>;
    const frames = typeof t.sceneProps === 'function' ? t.sceneProps.call(this.o.textures, age, scene) : null;
    const lite = this.o.quality === 'lite';
    const { sprites, rateScale } = limitSprites(data.props?.sprites ?? [], emitters, this.o.quality);
    const seed = (this.o.seed * 31 + sceneKey(age, scene).length * 7) >>> 0;
    sprites.forEach((sp, i) => {
      if (sp.kind === 'emit') {
        if (sp.layer === 'back' && lite) return;
        this.addAmbient({ ...sp.spec, rate: (sp.spec.rate ?? 1) * rateScale }, age, scene);
        return;
      }
      if (!frames || (sp.layer === 'back' && lite)) return;
      const count = sp.kind === 'path' ? sp.group.length : 1;
      const nodes: Sprite[] = [];
      for (let k = 0; k < count; k++) {
        const s = new Sprite(Texture.EMPTY);
        s.visible = false;
        // props on the mid strip take its darker multiply, so they sit in the layer (MID_LAYER_TINT)
        if (sp.layer === 'mid') s.tint = MID_LAYER_TINT;
        this.ambientLayers[sp.layer].addChild(s);
        nodes.push(s);
      }
      const trail = sp.kind === 'path' && sp.trail ? { spec: { ...sp.trail, kind: 'emit' as const, x: 0, y: 0, layer: sp.layer, rate: (sp.trail.rate ?? 1) * rateScale }, acc: 0 } : null;
      this.propNodes.push({ sprite: sp, age, scene, phase: spritePhaseMs(seed, i, spritePeriodMs(sp)), nodes, frames, weight: 1, trail });
    });
    // the strips' emitters keep their rates, scaled down to the particle cap with the props'
    if (rateScale < 1) this.emitScale.set(sceneKey(age, scene), rateScale);
    else this.emitScale.delete(sceneKey(age, scene));
    data.lights.forEach((light, i) => {
      if (light.layer === 'back' && lite) return;
      const node = fxSprite(this.o.baker, 'fx.p.glow');
      node.tint = 0xffc98a;
      node.blendMode = 'add';
      node.scale.set((light.r * 2.4) / 10);
      node.position.set(light.x, light.y);
      node.visible = false;
      this.lightLayers[light.layer].addChild(node);
      this.lightNodes.push({ light, age, scene, node, phase: spritePhaseMs(seed + 977, i, 9000), weight: 0 });
    });
  }

  /** Emitter rate scales per scene (the particle cap, PLAN 2b). */
  private readonly emitScale = new Map<string, number>();

  private addAmbient(spec: AmbientSpec, age: AgeId | null, scene?: string): void {
    const sc = scene !== undefined ? { scene } : {};
    if (spec.kind === 'emit') {
      const holder = new Sprite(Texture.EMPTY);
      this.ambientLayers[spec.layer].addChild(holder);
      this.ambient.push({ spec, age, ...sc, node: holder, t: 0, acc: 0 });
      return;
    }
    if (spec.liteSkip && this.o.quality === 'lite') return;
    const s = fxSprite(this.o.baker, spec.part);
    s.position.set(spec.x, spec.y);
    s.scale.set(spec.scale ?? 1);
    s.tint = spec.tint ?? 0xffffff;
    s.alpha = spec.alpha ?? 1;
    this.ambientLayers[spec.layer].addChild(s);
    const frames = spec.frames?.map((id) => {
      const f = fxSprite(this.o.baker, id);
      const fr = { tex: f.texture, ax: f.anchor.x, ay: f.anchor.y };
      f.destroy();
      return fr;
    });
    this.ambient.push({ spec, age, ...sc, node: s, t: this.rng.next() * 5000, acc: 0, ...(frames ? { frames } : {}) });
  }

  private stepAmbient(dtMs: number): void {
    const dt = dtMs / 1000;
    const lite = this.o.quality === 'lite';
    for (let i = 0; i < this.clouds.children.length; i++) {
      const c = this.clouds.children[i];
      if (!c) continue;
      c.x += dt * (this.cloudSpeed[i] ?? 6);
      if (c.x > SKY_FRAME.x0 + SKY_FRAME.width + 160) c.x = SKY_FRAME.x0 - 160;
    }
    for (const a of this.ambient) {
      a.t += dtMs;
      const s = a.spec;
      switch (s.kind) {
        case 'rotate':
          if (!this.reduceMotion) a.node.rotation += (((s.speed ?? 30) * Math.PI) / 180) * dt;
          break;
        case 'blink':
          a.node.alpha = (a.node.visible ? 1 : 0) * (0.25 + 0.75 * (Math.sin((a.t / (s.period ?? 1000)) * Math.PI * 2) > 0.6 ? 1 : 0));
          break;
        case 'drift': {
          a.node.x += (s.speed ?? 20) * dt * (a.frames && this.reduceMotion ? 0.5 : 1);
          a.node.y = s.y + Math.sin(a.t / 700) * 4;
          if (a.frames && a.frames.length >= 6) {
            // UI art audit #5: five flap frames at `period` ms each, a glide pose for 1-2 s every few seconds
            const glide = this.reduceMotion || Math.sin(a.t / 2300 + a.spec.x * 0.01) > 0.62;
            const f = a.frames[glide ? 5 : Math.floor(a.t / (s.period ?? 90)) % 5]!;
            if (a.node.texture !== f.tex) {
              a.node.texture = f.tex;
              a.node.anchor.set(f.ax, f.ay);
            }
            a.node.scale.set((s.scale ?? 1) * Math.sign(s.speed ?? 1), s.scale ?? 1);
            a.node.rotation = glide ? 0.04 * Math.sin(a.t / 900) : 0;
          } else if (s.period) {
            // flapping wings: squash the bird vertically, glide now and then
            const flap = Math.sin((a.t / s.period) * Math.PI * 2);
            const glide = Math.sin(a.t / 2300) > 0.55;
            a.node.scale.y = (s.scale ?? 1) * (glide ? 0.8 : 0.35 + 0.65 * Math.abs(flap));
            a.node.scale.x = (s.scale ?? 1) * Math.sign(s.speed ?? 1);
          }
          if (a.node.x > WORLD.worldRightLu + 200) a.node.x = WORLD.worldLeftLu - 200;
          if (a.node.x < WORLD.worldLeftLu - 200) a.node.x = WORLD.worldRightLu + 200;
          break;
        }
        case 'emit': {
          if (a.age && !a.node.visible) break;
          const k = a.age && a.scene !== undefined ? (this.emitScale.get(sceneKey(a.age, a.scene)) ?? 1) : 1;
          a.acc += (s.rate ?? 1) * k * dt * (lite ? 0.5 : 1);
          while (a.acc >= 1) {
            a.acc -= 1;
            this.emit(s, a.node.alpha);
          }
          break;
        }
      }
    }
    this.stepProps(dt, lite);
    for (const l of this.lightNodes) {
      const on = l.weight > 0.02;
      l.node.visible = on;
      if (on) l.node.alpha = l.weight * lightAlpha(this.clock, l.phase, this.reduceMotion);
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      if (!m) continue;
      m.age += dtMs;
      if (m.age >= m.life) {
        // kept for the next puff (see `spareMotes`), invisible meanwhile
        m.s.alpha = 0;
        const spare = this.spareMotes.get(m.key);
        if (spare) spare.push(m.s);
        else this.spareMotes.set(m.key, [m.s]);
        this.motes.splice(i, 1);
        continue;
      }
      m.s.x += m.vx * dt;
      m.s.y += m.vy * dt;
      const u = m.age / m.life;
      m.s.alpha = m.a0 * Math.min(1, u * 6) * (1 - u * u);
      if (m.vy < 0) m.s.scale.set(m.s.scale.x + dt * 0.4);
    }
  }

  /** Moves the scene props on the render clock (still under Reduce motion), fading them across the seam. */
  private stepProps(dt: number, lite: boolean): void {
    const regions = this.regions;
    for (const p of this.propNodes) {
      const at = this.placements[p.sprite.layer];
      const inst = spriteInstances(p.sprite, this.clock, p.phase, this.reduceMotion);
      const moving = p.sprite.kind === 'path';
      p.nodes.forEach((n, k) => {
        const it = inst[k];
        const f = it ? p.frames.get(it.frame) : undefined;
        if (!it || !f) {
          n.visible = false;
          return;
        }
        const wx = at ? at.offset + it.x * at.stretch : it.x;
        const w = moving ? regionWeight(regions, (r) => r.age === p.age && (r.scene ?? 'classic') === p.scene, wx) : p.weight;
        n.visible = w > 0.02;
        if (!n.visible) return;
        if (n.texture !== f.tex) n.texture = f.tex;
        n.anchor.set(f.ax, f.ay);
        n.position.set(it.x, it.y);
        n.scale.set((it.flip ? -1 : 1) / f.ppl, 1 / f.ppl);
        n.rotation = it.rot;
        n.alpha = it.alpha * w;
      });
      // a path's trail (the loco's smoke) follows its first member
      const tr = p.trail;
      const lead = p.nodes[0];
      if (tr && lead?.visible && !this.reduceMotion) {
        tr.acc += (tr.spec.rate ?? 1) * dt * (lite ? 0.5 : 1);
        const flip = lead.scale.x < 0;
        const dx = (tr.spec as AmbientSpec & { dx?: number }).dx ?? 0;
        const dy = (tr.spec as AmbientSpec & { dy?: number }).dy ?? 0;
        while (tr.acc >= 1) {
          tr.acc -= 1;
          this.emit({ ...tr.spec, x: lead.x + (flip ? -dx : dx), y: lead.y + dy }, lead.alpha);
        }
      }
    }
  }

  private emit(s: AmbientSpec, weight: number): void {
    const key = `${s.layer}|${s.part}`;
    // a spare of the same kind is already in its layer (`spareMotes`); only a new one joins it
    let sp = this.spareMotes.get(key)?.pop();
    if (!sp) {
      sp = fxSprite(this.o.baker, s.part);
      this.ambientLayers[s.layer].addChild(sp);
    }
    const x = s.x + (s.spreadX ? (this.rng.next() * 2 - 1) * s.spreadX : (this.rng.next() - 0.5) * 8);
    sp.position.set(x, s.y);
    sp.scale.set(s.scale ?? 1);
    sp.tint = s.tint ?? 0xffffff;
    sp.alpha = 0;
    const speed = (s.speed ?? 15) * (this.reduceMotion ? 0.6 : 1);
    const vx = s.fall ? (this.rng.next() - 0.3) * speed * 0.3 : (this.rng.next() - 0.5) * speed * 0.4 + 4;
    const vy = s.fall ? speed * (0.8 + this.rng.next() * 0.4) : -speed * (0.7 + this.rng.next() * 0.6);
    sp.rotation = s.part === 'fx.p.beam' ? Math.PI / 2 + 0.15 : 0;
    this.motes.push({ s: sp, key, vx, vy, life: s.life ?? 2600, age: 0, a0: (s.alpha ?? 1) * (weight || 1) });
  }

  /** Live and spare motes (tests): the spares stay in their layers, so the backdrop's structure holds. */
  get moteCount(): { live: number; spare: number } {
    let spare = 0;
    for (const list of this.spareMotes.values()) spare += list.length;
    return { live: this.motes.length, spare };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const m of this.motes) m.s.destroy();
    this.motes = [];
    for (const list of this.spareMotes.values()) for (const s of list) s.destroy();
    this.spareMotes.clear();
    this.weather.destroy();
    for (const l of this.layers) l.destroy();
    this.groundSkin.destroy();
    this.root.destroy({ children: true });
  }
}

/**
 * How much of a look shows at x: 1 inside a matching region, 0 elsewhere, linear across the seam.
 * `match` picks the regions (an age, a scene of it, a night sky).
 */
function regionWeight(regions: readonly Region[], match: (r: Region) => boolean, x: number): number {
  let w = 0;
  for (const r of regions) {
    if (!match(r)) continue;
    const d = Math.min(x - r.x0, r.x1 - x);
    w = Math.max(w, Math.max(0, Math.min(1, 0.5 + d / WORLD.seamBlendLu)));
  }
  return w;
}
