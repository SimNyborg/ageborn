/**
 * Split-age backdrop (DESIGN A11 "Split-age lane", the signature visual).
 *
 * - Three parallax layers per age (sky, far silhouettes, mid-ground) plus the arena ground and
 *   weather layer, all painted once per age or arena and cached.
 * - Your half shows your age and the enemy half theirs, cross-faded over a 240 lu seam with a 30%
 *   grey haze. `setSeam(x)` sets the drift target; the seam moves toward it at <= 20 lu/s and stays
 *   within [450, 750] (the "fixed-drift seam", so the blend is never glued behind every fight).
 * - `wipe(side, age, ms)` sweeps that side's half to the new age from its base outward.
 *
 * - The far and mid layers and the arena ground are pre-rendered by the 3D pipeline
 *   (art/blender/world/backdrop.py: `art/backdrops/<age>/{far,mid}.webp` with `layers.json`, and
 *   `art/ground/<arena>.webp`) with the same toon light as the units. They stream in on first use;
 *   until they arrive (and in headless tests, or if a file fails) the code-painted layers are drawn,
 *   so the pre-rendered art is a pure upgrade of the same frames.
 *
 * Backdrop skins (A18.9.4 "Backdrops"): each half can wear a theme (`skins.left` / `skins.right`,
 * `backdrop.<id>`). A themed layer is the age's own layer texture re-graded once at bake time
 * (`backdrops/themes.ts`: palette, sky, props along the rims), so pieces carry an age and a skin, and a
 * seam between two looks cross-fades exactly like one between two ages. The theme's weather is a
 * separate particle layer over the mid-ground and under the lane (`backdropWeather.ts`).
 *
 * Cross-fades are built from thin vertical strips cut from each layer texture (dynamic texture
 * frames) with stepped alpha. Everything comes from a few textures, so the whole backdrop batches
 * into a handful of draw calls with no masks, filters or custom shaders (works on WebGL and WebGPU).
 *
 * Space: the root is world space, x = 0 at the left gate and y = 0 on the ground line.
 *
 * Parallax (DESIGN A17.7): the battle camera scrolls a 2,360 lu world, and `setView(left, width)`
 * tells the backdrop what it shows. The sky, far and mid layers then scroll at 0.05, 0.25 and 0.55 of
 * the camera movement (less when a layer is too narrow for its factor at this view width, so no edge
 * ever shows), and the ground at 1.0; the ground image is extended with a mirrored copy to cover the
 * longer lane. Each layer's age split is re-cut so its seam stays at the ground seam's screen position:
 * the ages meet in one place on screen while the silhouettes drift at their depth.
 */
import { Assets, CanvasSource, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { BackdropView } from '@/contracts/art';
import type { AgeId, Side } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import type { PartBaker } from '../../bake';
import { arenaId, GROUND_FRAME, groundAmbient, MID_FRAME, paintGround, paintMid, type ArenaId } from '../../backdrops/ground';
import { FAR_FRAME, paintFar, type AmbientSpec } from '../../backdrops/silhouettes';
import { extraAmbient, finishLayer } from '../../backdrops/lighting';
import { CLOUD_TINT, paintSky, SKY_FRAME, type LayerFrame } from '../../backdrops/sky';
import { backdropId, BACKDROP_THEMES, themeLayer, themeSky } from '../../backdrops/themes';
import { BACKDROP_PALETTES, desaturate, mix } from '../../palette';
import { WORLD } from '../../style';
import { BackdropWeatherLayer } from './backdropWeather';
import { fxSprite } from './effectView';

type LayerKind = 'sky' | 'far' | 'mid';
const LAYERS: readonly LayerKind[] = ['sky', 'far', 'mid'];
const FRAMES: Record<LayerKind, LayerFrame> = { sky: SKY_FRAME, far: FAR_FRAME, mid: MID_FRAME };
const MID_LAYER_TINT = 0xdcdad6;
/** Parallax factors of the camera movement (A17.7). */
export const PARALLAX: Record<LayerKind | 'ground', number> = { sky: 0.05, far: 0.25, mid: 0.55, ground: 1 };

/**
 * How tall (lu above the ground line) the silhouettes of the far and mid layers reach. When the camera
 * shows less height than that (phones show about 275 lu), the layer shrinks toward the ground line so
 * its peaks stay in view; a smaller silhouette also reads as further away.
 */
export const LAYER_CONTENT_LU: Record<LayerKind, number> = { sky: 0, far: 330, mid: 250 };

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

interface LayerFile {
  image: string;
  pxPerLu: number;
  ambient: AmbientSpec[];
}

function appBaseUrl(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

/**
 * Ages with pre-rendered far and mid layers (art/blender/world/backdrop.py `AGES`). The A17 ages
 * (Bronze, Industrial, Cosmic) draw their code-painted layers until the pipeline renders them, so the
 * game never requests files that do not exist.
 */
export const PRERENDERED_BACKDROP_AGES: readonly AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];

/** Pre-rendered layer files (art/blender/world/backdrop.py). */
export function backdropLayerUrl(age: AgeId, file: string): string {
  return `art/backdrops/${age}/${file}`;
}
export function groundImageUrl(arena: ArenaId): string {
  return `art/ground/${arena}.webp`;
}

/**
 * Paints and caches layer textures per age and arena (shared by every backdrop of a provider), and
 * streams in the pre-rendered far, mid and ground images, which replace the painted ones once loaded
 * (`version` counts arrivals so views can relayout).
 */
export class BackdropTextures {
  private readonly cache = new Map<string, Painted>();
  private readonly images = new Map<string, Painted>();
  private readonly requested = new Set<string>();
  private readonly canBake = typeof document !== 'undefined';
  bakeMs = 0;
  /** Bumped every time a pre-rendered image arrives. */
  version = 0;

  constructor(
    private readonly quality: 'high' | 'lite',
    private readonly baseUrl: string = appBaseUrl(),
    /** Set false to draw only the code-painted layers (tests, comparisons). */
    private readonly prerendered = true,
  ) {}

  /** Starts loading the pre-rendered layers of these ages and arenas (idempotent). */
  prefetch(ages: readonly AgeId[], arenas: readonly ArenaId[] = []): void {
    for (const a of ages) this.loadAge(a);
    for (const a of arenas) this.loadGround(a);
  }

  private loadAge(age: AgeId): void {
    const key = `age.${age}`;
    if (!this.canBake || !this.prerendered || this.requested.has(key) || !PRERENDERED_BACKDROP_AGES.includes(age)) return;
    this.requested.add(key);
    void (async () => {
      try {
        const meta = (await Assets.load(this.baseUrl + backdropLayerUrl(age, 'layers.json'))) as Partial<Record<'far' | 'mid', LayerFile>>;
        for (const kind of ['far', 'mid'] as const) {
          const m = meta[kind];
          if (!m) continue;
          const tex = await this.loadImage(backdropLayerUrl(age, m.image), m.pxPerLu);
          this.images.set(`${kind}.${age}`, { tex, ambient: m.ambient ?? [] });
          this.version++;
        }
      } catch (e) {
        console.warn(`[visuals] backdrop layers for "${age}" failed to load; the painted layers are used`, e);
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

  /** Loads an image as a texture measured in lu (its source resolution is its px per lu). */
  private async loadImage(path: string, pxPerLu: number): Promise<Texture> {
    const t = (await Assets.load(this.baseUrl + path)) as Texture;
    const source = t.source;
    source.resolution = pxPerLu;
    source.scaleMode = 'linear';
    return new Texture({ source });
  }

  /** The layer texture of an age, re-graded by a backdrop skin when one is given (A18.9.4). */
  layer(kind: LayerKind, age: AgeId, skin?: string | null): Painted {
    const base = this.baseLayer(kind, age);
    const id = backdropId(skin);
    return id ? this.themed(kind, age, id, base) : base;
  }

  /**
   * A themed copy of a layer texture, cached per layer, age, theme and base texture (a pre-rendered
   * image that arrives later gets its own themed copy). The sky is re-painted at twice its base
   * resolution so stars, moons and aurora stay crisp.
   */
  private themed(kind: LayerKind, age: AgeId, id: string, base: Painted): Painted {
    const th = BACKDROP_THEMES[id];
    if (!th || !this.canBake || base.tex === Texture.EMPTY) return base;
    const src = base.tex.source;
    const key = `${kind}.${age}@${id}#${src.uid}`;
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
    if (kind === 'sky') themeSky(ctx, id, age, th, f);
    else themeLayer(canvas, ctx, id, kind, age, th, f);
    const source = new CanvasSource({ resource: canvas, resolution: 1 });
    source.resolution = res;
    const p = { tex: new Texture({ source }), ambient: base.ambient };
    this.cache.set(key, p);
    this.bakeMs += performance.now() - t0;
    return p;
  }

  private baseLayer(kind: LayerKind, age: AgeId): Painted {
    if (kind !== 'sky') {
      const img = this.images.get(`${kind}.${age}`);
      if (img) return img;
      this.loadAge(age);
    }
    return this.get(`${kind}.${age}`, FRAMES[kind], (ctx, f, canvas) => {
      if (kind === 'sky') {
        paintSky(ctx, age, f);
        return [];
      }
      const ambient = kind === 'far' ? paintFar(ctx, age, f) : paintMid(ctx, age, f);
      // light the silhouettes like the 3D art and add atmospheric depth (backdrops/lighting.ts)
      finishLayer(canvas, ctx, kind, age, f);
      return ambient;
    });
  }

  ground(arena: ArenaId): Painted {
    const img = this.images.get(`ground.${arena}`);
    if (img) return img;
    this.loadGround(arena);
    return this.get(`ground.${arena}`, GROUND_FRAME, (ctx, f) => paintGround(ctx, arena, f));
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
    // image sources belong to the Assets cache; drop only our lu-sized texture views
    for (const p of this.images.values()) p.tex.destroy(false);
    this.images.clear();
  }
}

/** Px per lu of the pre-rendered ground images (backdrop.py FRAMES.ground). */
export const GROUND_IMAGE_PX_PER_LU = 1.3;

/** A horizontal slice [x0, x1] of a layer texture with a constant alpha. */
export interface Piece {
  age: AgeId;
  /** The backdrop skin of this piece's half (`backdrop.<id>`); absent is the age's classic look. */
  skin?: string;
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
  x0: number;
  x1: number;
}

/**
 * Splits the lane into age regions: [left, seam], [seam, right], plus an optional wipe front. A side's
 * backdrop skin (`skins`) goes with every region of its half, through a wipe too (the theme stays
 * when the age changes).
 */
export function ageRegions(o: {
  left: AgeId;
  right: AgeId;
  seam: number;
  wipe: { side: Side; age: AgeId; front: number } | null;
  skins?: { left?: string | null; right?: string | null };
}): Region[] {
  const L = WORLD.worldLeftLu - 100;
  const R = WORLD.worldRightLu + 100;
  const sl = o.skins?.left ? { skin: o.skins.left } : {};
  const sr = o.skins?.right ? { skin: o.skins.right } : {};
  const regions: Region[] = [
    { age: o.left, ...sl, x0: L, x1: o.seam },
    { age: o.right, ...sr, x0: o.seam, x1: R },
  ];
  const w = o.wipe;
  if (w) {
    if (w.side === 0) {
      const fx = Math.min(o.seam, L + w.front);
      regions.splice(0, 1, { age: w.age, ...sl, x0: L, x1: fx }, { age: o.left, ...sl, x0: fx, x1: o.seam });
    } else {
      const fx = Math.max(o.seam, R - w.front);
      regions.splice(1, 1, { age: o.right, ...sr, x0: o.seam, x1: fx }, { age: w.age, ...sr, x0: fx, x1: R });
    }
  }
  return regions.filter((r) => r.x1 - r.x0 > 0.5);
}

/** Turns regions into solid pieces and stepped cross-fade strips. */
export function composePieces(regions: readonly Region[], seam: number): Piece[] {
  const pieces: Piece[] = [];
  const widths: number[] = [];
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
    if (r.x1 - wr > r.x0 + wl) pieces.push({ age: r.age, ...(r.skin ? { skin: r.skin } : {}), x0: r.x0 + wl, x1: r.x1 - wr, alpha: 1 });
  });
  for (let i = 0; i < widths.length; i++) {
    const a = regions[i];
    const b = regions[i + 1];
    const w = widths[i] ?? 0;
    if (!a || !b || w <= 0) continue;
    const c = a.x1;
    const n = Math.max(1, Math.ceil(w / STRIP_LU));
    for (let k = 0; k < n; k++) {
      const x0 = c - w / 2 + (k * w) / n;
      const x1 = c - w / 2 + ((k + 1) * w) / n;
      const t = (k + 0.5) / n;
      const s = t * t * (3 - 2 * t);
      const sa = a.skin ? { skin: a.skin } : {};
      const sb = b.skin ? { skin: b.skin } : {};
      if (a.age === b.age && a.skin === b.skin) {
        pieces.push({ age: a.age, ...sa, x0, x1, alpha: 1 });
      } else {
        pieces.push({ age: a.age, ...sa, x0, x1, alpha: 1 - s, under: true });
        pieces.push({ age: b.age, ...sb, x0, x1, alpha: s });
      }
    }
  }
  return pieces;
}

interface Amb {
  spec: AmbientSpec;
  age: AgeId | null;
  node: Sprite;
  t: number;
  acc: number;
}

interface Mote {
  s: Sprite;
  vx: number;
  vy: number;
  life: number;
  age: number;
  a0: number;
}

class StripLayer {
  readonly container = new Container();
  private readonly pool: { s: Sprite; t: Texture }[] = [];

  constructor(
    readonly kind: LayerKind,
    private readonly textures: BackdropTextures,
  ) {}

  /** Lays the pieces (world x) out on this layer, placed at `at` (see `placeLayer`). */
  layout(pieces: readonly Piece[], at: LayerPlacement = IDENTITY_PLACEMENT): void {
    const f = FRAMES[this.kind];
    this.container.x = at.offset;
    this.container.scale.set(at.stretch, at.scaleY);
    let used = 0;
    for (const p of pieces) {
      const src = this.textures.layer(this.kind, p.age, p.skin).tex;
      if (src === Texture.EMPTY) continue;
      const slot = this.slot(used++);
      const x0 = Math.max(f.x0, (p.x0 - at.offset) / at.stretch);
      const x1 = Math.min(f.x0 + f.width, (p.x1 - at.offset) / at.stretch);
      if (x1 <= x0) {
        slot.s.visible = false;
        continue;
      }
      if (slot.t.source !== src.source) slot.t.source = src.source;
      // Frames are in logical units (lu): the canvas source's resolution is its px per lu.
      const fx = x0 - f.x0;
      slot.t.frame.x = fx;
      slot.t.frame.y = 0;
      slot.t.frame.width = Math.max(0.01, Math.min(x1 - x0, src.source.width - fx));
      slot.t.frame.height = src.source.height;
      slot.t.update();
      slot.s.texture = slot.t;
      slot.s.visible = true;
      // The sky is opaque: its lower cross-fade piece stays solid (see `Piece.under`). Silhouette
      // layers are mostly transparent, so both halves fade.
      slot.s.alpha = this.kind === 'sky' && p.under ? 1 : p.alpha;
      slot.s.position.set(x0, f.yTop);
      slot.s.width = x1 - x0;
      slot.s.height = f.height;
    }
    for (let i = used; i < this.pool.length; i++) {
      const s = this.pool[i];
      if (s) s.s.visible = false;
    }
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
 * Seam haze alpha at `t` ∈ [0, 1] across the 240 lu seam: 0 at both edges, `WORLD.seamDesaturate` in
 * the middle, smooth in between (a hard-edged veil reads as a pillar of fog).
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
  /** Each half's backdrop skin (`backdrop.<id>`, A18.9.4); left = side 0. */
  skins?: { left?: string | null; right?: string | null };
}

export class ProceduralBackdropView implements BackdropView {
  readonly root = new Container();
  private readonly layers: StripLayer[];
  private readonly clouds = new Container();
  private readonly haze = new HazeLayer();
  private readonly groundLayer = new Container();
  private readonly groundSprite: Sprite;
  /** A mirrored copy that extends the ground over the 2,000 lu lane (A17.3). */
  private readonly groundMirror: Sprite;
  private texVersion = -1;
  private readonly ambientLayers: Record<'sky' | 'far' | 'mid' | 'ground', Container>;
  private readonly rng: CosmeticRng;
  private left: AgeId;
  private right: AgeId;
  private readonly arena: ArenaId;
  private seam: number = WORLD.seamHomeLu;
  private seamTarget: number = WORLD.seamHomeLu;
  private wipeState: { side: Side; age: AgeId; t: number; ms: number } | null = null;
  private dirty = true;
  private ambient: Amb[] = [];
  private motes: Mote[] = [];
  private destroyed = false;
  /** The camera's visible range (world lu); null = no camera yet (the whole world, layers unshifted). */
  private viewLeft: number | null = null;
  private viewWidth: number = WORLD.worldWidthLu;
  /** World height (lu) the camera shows above the ground line. */
  private viewAbove = 1000;
  private placements: Partial<Record<LayerKind, LayerPlacement>> = {};
  /** Each half's backdrop skin key, when it has a known theme. */
  private readonly skins: { left?: string; right?: string };
  private readonly weather: BackdropWeatherLayer;

  constructor(private readonly o: BackdropViewOptions) {
    this.left = o.left;
    this.right = o.right;
    const l = backdropId(o.skins?.left);
    const r = backdropId(o.skins?.right);
    this.skins = { ...(l ? { left: `backdrop.${l}` } : {}), ...(r ? { right: `backdrop.${r}` } : {}) };
    this.arena = arenaId(o.arena);
    this.rng = mulberry32(o.seed);
    this.root.label = `backdrop.${o.left}${l ? `@${l}` : ''}|${o.right}${r ? `@${r}` : ''}|ground.${this.arena}`;
    // Lite keeps the mid layer since A17: with a scrolling camera it is the layer that shows the
    // parallax depth (A17.7); only its ambient life is dropped.
    this.layers = LAYERS.map((k) => new StripLayer(k, o.textures));
    this.ambientLayers = { sky: new Container(), far: new Container(), mid: new Container(), ground: new Container() };
    const byKind = (k: LayerKind): StripLayer | undefined => this.layers.find((l) => l.kind === k);
    const sky = byKind('sky');
    if (sky) this.root.addChild(sky.container);
    this.root.addChild(this.clouds, this.ambientLayers.sky);
    const far = byKind('far');
    if (far) this.root.addChild(far.container);
    this.root.addChild(this.ambientLayers.far);
    const mid = byKind('mid');
    if (mid) {
      // the mid-ground sits about 13% darker than painted, so grey and white units (knights, mechs)
      // do not sink into trees and fog at the same brightness (art director review)
      mid.container.tint = MID_LAYER_TINT;
      this.root.addChild(mid.container);
    }
    this.root.addChild(this.ambientLayers.mid);
    this.root.addChild(this.haze.container);
    // backdrop skin weather: over the mid-ground and the seam haze, under the ground and the lane
    this.weather = new BackdropWeatherLayer(o.baker, o.quality, this.rng);
    this.weather.setTheme(0, l ? (BACKDROP_THEMES[l] ?? null) : null);
    this.weather.setTheme(1, r ? (BACKDROP_THEMES[r] ?? null) : null);
    this.root.addChild(this.weather.root);
    this.groundSprite = new Sprite(Texture.EMPTY);
    this.groundSprite.position.set(GROUND_FRAME.x0, GROUND_FRAME.yTop);
    this.groundMirror = new Sprite(Texture.EMPTY);
    this.groundMirror.position.set(GROUND_FRAME.x0 + 2 * GROUND_FRAME.width, GROUND_FRAME.yTop);
    this.groundLayer.addChild(this.groundSprite, this.groundMirror);
    o.textures.prefetch([o.left, o.right], [this.arena]);
    this.syncGround();
    this.root.addChild(this.groundLayer, this.ambientLayers.ground);
    this.spawnClouds();
    this.rebuildAmbient();
    this.texVersion = o.textures.version;
    this.layout();
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

  setSeam(x: number): void {
    this.seamTarget = Math.max(WORLD.seamMinLu, Math.min(WORLD.seamMaxLu, x));
  }

  wipe(side: Side, age: AgeId, ms: number = WORLD.evolveWipeMs): void {
    // finish a running wipe first
    if (this.wipeState) this.finishWipe();
    this.wipeState = { side, age, t: 0, ms: Math.max(1, ms) };
    this.o.textures.prefetch([age]);
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
    return placeLayer(FRAMES[kind], PARALLAX[kind], this.viewLeft, this.viewWidth, fit);
  }

  /** Current seam position (lu) and ages, for tests and the gallery. */
  get state(): { seam: number; target: number; left: AgeId; right: AgeId; wiping: boolean; skins: { left?: string; right?: string }; weather: number } {
    return { seam: this.seam, target: this.seamTarget, left: this.left, right: this.right, wiping: this.wipeState !== null, skins: { ...this.skins }, weather: this.weather.count };
  }

  /** Reduce motion and Lite (duck-typed like the base views): quieter weather, no lightning. */
  setMotion(o: { reduce: boolean; lite: boolean }): void {
    this.weather.setMotion(o);
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
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
      // a pre-rendered layer arrived: swap it in (and its ambient life)
      this.texVersion = this.o.textures.version;
      this.syncGround();
      this.rebuildAmbient();
      this.dirty = true;
    }
    if (this.dirty) this.layout();
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
    this.rebuildAmbient();
    this.dirty = true;
  }

  private layout(): void {
    this.dirty = false;
    const w = this.wipeState;
    const half = w ? (w.side === 0 ? this.seam - (WORLD.worldLeftLu - 100) : WORLD.worldRightLu + 100 - this.seam) : 0;
    const eased = w ? 1 - Math.pow(1 - Math.min(1, w.t / w.ms), 2) : 0;
    const regions = ageRegions({ left: this.left, right: this.right, seam: this.seam, wipe: w ? { side: w.side, age: w.age, front: half * eased } : null, skins: this.skins });
    const pieces = composePieces(regions, this.seam);
    for (const kind of LAYERS) this.placements[kind] = this.placement(kind);
    for (const l of this.layers) l.layout(pieces, this.placements[l.kind]);
    for (const kind of LAYERS) {
      const at = this.placements[kind] ?? IDENTITY_PLACEMENT;
      const c = this.ambientLayers[kind];
      c.x = at.offset;
      c.scale.set(at.stretch, at.scaleY);
      if (kind === 'sky') {
        this.clouds.x = at.offset;
        this.clouds.scale.set(at.stretch, at.scaleY);
      }
    }
    // seam haze: a soft grey veil, 240 lu wide (A11: 30% desaturation)
    this.haze.layout(this.seam, this.left, this.right);
    for (const a of this.ambient) {
      if (!a.age) continue;
      const at = a.spec.layer === 'ground' ? undefined : this.placements[a.spec.layer];
      const weight = regionWeight(regions, a.age, at ? at.offset + a.spec.x * at.stretch : a.spec.x);
      a.node.visible = weight > 0.02;
      a.node.alpha = (a.spec.alpha ?? 1) * weight;
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
      this.cloudSpeed.push(2 + depth * 9);
      this.clouds.addChild(s);
    }
  }

  private rebuildAmbient(): void {
    for (const a of this.ambient) a.node.destroy();
    this.ambient = [];
    const ages = new Set<AgeId>([this.left, this.right]);
    if (this.wipeState) ages.add(this.wipeState.age);
    for (const age of ages) {
      for (const kind of ['far', 'mid'] as const) {
        if (kind === 'mid' && this.o.quality === 'lite') continue;
        for (const spec of this.o.textures.layer(kind, age).ambient) this.addAmbient(spec, age);
      }
      for (const spec of extraAmbient(age)) if (this.o.quality === 'high' || spec.layer !== 'mid') this.addAmbient(spec, age);
    }
    for (const spec of this.o.textures.ground(this.arena).ambient) {
      this.addAmbient(spec, null);
      // The mirrored ground copy gets its own ambient life (A17.3 longer lane).
      const mx = 2 * (GROUND_FRAME.x0 + GROUND_FRAME.width) - spec.x;
      if (mx <= WORLD.worldRightLu + 120) this.addAmbient({ ...spec, x: mx }, null);
    }
    // cloud tint follows the side ages (and a side's backdrop skin)
    const lt = this.skins.left ? BACKDROP_THEMES[this.skins.left.slice(9)] : undefined;
    const rt = this.skins.right ? BACKDROP_THEMES[this.skins.right.slice(9)] : undefined;
    this.clouds.children.forEach((c, i) => {
      if (!(c instanceof Sprite)) return;
      const leftSide = c.x < this.seam;
      const theme = leftSide ? lt : rt;
      c.tint = theme ? theme.cloudTint : (CLOUD_TINT[leftSide ? this.left : this.right] ?? CLOUD_TINT[i % 2 ? this.left : this.right]);
    });
  }

  private addAmbient(spec: AmbientSpec, age: AgeId | null): void {
    if (spec.kind === 'emit') {
      const holder = new Sprite(Texture.EMPTY);
      this.ambientLayers[spec.layer].addChild(holder);
      this.ambient.push({ spec, age, node: holder, t: 0, acc: 0 });
      return;
    }
    const s = fxSprite(this.o.baker, spec.part);
    s.position.set(spec.x, spec.y);
    s.scale.set(spec.scale ?? 1);
    s.tint = spec.tint ?? 0xffffff;
    s.alpha = spec.alpha ?? 1;
    this.ambientLayers[spec.layer].addChild(s);
    this.ambient.push({ spec, age, node: s, t: this.rng.next() * 5000, acc: 0 });
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
          a.node.rotation += (((s.speed ?? 30) * Math.PI) / 180) * dt;
          break;
        case 'blink':
          a.node.alpha = (a.node.visible ? 1 : 0) * (0.25 + 0.75 * (Math.sin((a.t / (s.period ?? 1000)) * Math.PI * 2) > 0.6 ? 1 : 0));
          break;
        case 'drift': {
          a.node.x += (s.speed ?? 20) * dt;
          a.node.y = s.y + Math.sin(a.t / 700) * 4;
          if (s.period) {
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
          a.acc += (s.rate ?? 1) * dt * (lite ? 0.5 : 1);
          while (a.acc >= 1) {
            a.acc -= 1;
            this.emit(s, a.node.alpha);
          }
          break;
        }
      }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      if (!m) continue;
      m.age += dtMs;
      if (m.age >= m.life) {
        m.s.destroy();
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

  private emit(s: AmbientSpec, weight: number): void {
    const sp = fxSprite(this.o.baker, s.part);
    const x = s.x + (s.spreadX ? (this.rng.next() * 2 - 1) * s.spreadX : (this.rng.next() - 0.5) * 8);
    sp.position.set(x, s.y);
    sp.scale.set(s.scale ?? 1);
    sp.tint = s.tint ?? 0xffffff;
    const speed = s.speed ?? 15;
    const vx = s.fall ? (this.rng.next() - 0.3) * speed * 0.3 : (this.rng.next() - 0.5) * speed * 0.4 + 4;
    const vy = s.fall ? speed * (0.8 + this.rng.next() * 0.4) : -speed * (0.7 + this.rng.next() * 0.6);
    if (s.part === 'fx.p.beam') sp.rotation = Math.PI / 2 + 0.15;
    this.ambientLayers[s.layer].addChild(sp);
    this.motes.push({ s: sp, vx, vy, life: s.life ?? 2600, age: 0, a0: (s.alpha ?? 1) * (weight || 1) });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const m of this.motes) m.s.destroy();
    this.motes = [];
    this.weather.destroy();
    for (const l of this.layers) l.destroy();
    this.root.destroy({ children: true });
  }
}

/** How much of `age` shows at x (1 inside its region, 0 elsewhere; linear across a 240 lu seam). */
function regionWeight(regions: readonly Region[], age: AgeId, x: number): number {
  let w = 0;
  for (const r of regions) {
    if (r.age !== age) continue;
    const d = Math.min(x - r.x0, r.x1 - x);
    w = Math.max(w, Math.max(0, Math.min(1, 0.5 + d / WORLD.seamBlendLu)));
  }
  return w;
}
