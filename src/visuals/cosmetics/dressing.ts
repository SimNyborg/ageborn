/**
 * A side's base cosmetics in the lane (DESIGN A18.9.4): the base flag and the national flag waving
 * on a pole in front of the gate, decorations in three fixed anchors, and the base skin's restyle
 * (a body tint through the base view's duck-typed `setSkinTint`, trim on the pole cap and an ambient
 * particle layer). Purely cosmetic: nothing here reads or changes the sim.
 *
 * Anchors (side 0, lu from the gate at ground level; mirrored for side 1): the pole at +44, just
 * in front of the gate, clear of the four mounts (x −6 to −56) and of the HP bar in the HUD; the
 * decorations at −150 and −104 in front of the base's back wall and at +20 beside the gate. The
 * flags fly with one wind (toward +x) for both sides, so a flag never shows mirrored.
 *
 * Motion: the flags ripple along their length (a strip mesh, fixed at the hoist) and flutter harder
 * after a hit; banners and plants sway; braziers flicker; on a collapse every prop topples and
 * fades. Reduce motion stills the ripple and the particles; Lite halves the particles.
 *
 * Decoration props (round 3, PLAN 2a "Decorations"): the 24 decorations are Blender props on the base
 * pipeline (`art/cosmetics/decorations/<id>.json`, `WORLD_DECORATIONS`). The dressing asks the provider's
 * prop loader (`props`) for the equipped ones only and draws each one's SVG bake until its prop arrives, then
 * cross-fades (never a pop); a prop already in (VS warmed it) shows at once. A prop stands on a soft contact
 * shadow, over its grey `_team` twin tinted in the side's colour, and mirrors for side 1 (banners keep the
 * lane's one wind). Its `loop` clip (a banner's cloth, a brazier's flame, the plasma swirl) plays by render
 * time from a seeded phase and holds its first frame under Reduce motion; the code adds what the sheet's meta
 * asks for: plants sway, fire and lamps flicker their light (and fire sends up a few embers, half on Lite),
 * the plasma brazier pulses, crystals and the star glint.
 *
 * Base skin models (PLAN 2c): while the base view shows a skin's model (its duck-typed `skinModel()`;
 * the equipped skin's, or Crystal Spire's, the troop-system skin that wins over it), the old restyle is off (the view takes no tint on a model, and the field of particles over the whole
 * base stops); the model's own ambient particles start from its spots instead (`ambientSpots()`,
 * exported from Blender: petals from the rose vines, fireflies by the mushrooms ...). While the model
 * streams in, the standard base keeps the old tint and particles. A national flag uses its lane cloth
 * from `nationalFlagTexture` (Track D) when there is one, swapped in when its baked texture is ready.
 */
import { Container, Graphics, Mesh, MeshGeometry, Sprite, Texture } from 'pixi.js';
import type { BaseDressingView, BaseView } from '@/contracts/art';
import type { AgeId, Side, SideLook } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { clipDurations, setFrame, type WorldMeta, type WorldSheet } from '../adapters/worldAtlas';
import { baseFlagDesign, baseSkinArt, drawDecoration, drawFlag, parseCosmeticKey, type FlagKind } from './art';
import type { BaseSkinArt, SkinParticles } from './baseSkins';
import { nationalFlagTexture } from './nationalFlags';
import { DECO_GROUND, DECO_H, DECO_W, DECORATIONS, type DecorationArt } from './decorations';
import { BANNER_OUTLINE, FLAG_H, FLAG_W, flagCloth, flagTrim } from './flags';
import { celRamp, drawShapes, hex, INK, type Ctx2D } from './shapes';

/** Pixels per view-box unit of the baked textures (crisp up to about 4 px per lu on screen). */
const TEX_PX = 5;
/** lu per flag view-box unit: base flag 54 x 36 lu, national flag 45 x 30 lu. */
const BASE_FLAG_LU = 0.9;
const NATION_FLAG_LU = 0.75;
/** lu per decoration view-box unit (about 55 lu tall, a little shorter than a soldier's shoulders). */
const DECO_LU = 0.95;

export const DRESSING_ANCHORS = { pole: 44, poleTop: 176, decorations: [-150, -104, 20] } as const;

type CanvasFactory = (w: number, h: number) => HTMLCanvasElement | OffscreenCanvas | null;

const defaultCanvas: CanvasFactory = (w, h) => {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return null;
};

const texCache = new Map<string, Texture>();

function bake(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) => boolean, make: CanvasFactory): Texture {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = make(Math.ceil(w), Math.ceil(h));
  const ctx = c?.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined;
  if (!c || !ctx || !draw(ctx)) return Texture.EMPTY;
  const tex = Texture.from(c as HTMLCanvasElement);
  tex.source.scaleMode = 'linear';
  texCache.set(key, tex);
  return tex;
}

/** The step of a looping clip at time t (ms), its total known (`frameIndex` without re-summing every frame). */
function loopStep(durations: readonly number[], total: number, t: number): number {
  let at = ((t % total) + total) % total;
  for (let i = 0; i < durations.length; i++) {
    at -= durations[i] ?? 0;
    if (at < 0) return i;
  }
  return durations.length - 1;
}

/**
 * The Legendary base flag's glint (custom-c-lane-flag-glint; PLAN 2a: Legendary flags glint): the band of
 * Customize's `FLAG_GLINT` (a slant 8 view-box units wide, 12 units further back at the foot than at the
 * top) sweeps from x = -8 to 86 over the first 30% of a 5 s loop and rests for the remaining 70%.
 */
export const GLINT_LOOP_MS = 5000;
const GLINT_SWEEP = 0.3;
const GLINT_FROM = -8;
const GLINT_TO = 86;
/** Three nested bands (half widths in view-box units) at one alpha each make a soft white centre (about 0.4). */
const GLINT_BANDS = [4, 2.5, 1.25] as const;
const GLINT_ALPHA = 0.16;

/** The glint's offset (view-box units) at `ms` into its loop, or null while it rests. */
export function glintOffset(ms: number): number | null {
  const k = (((ms % GLINT_LOOP_MS) + GLINT_LOOP_MS) % GLINT_LOOP_MS) / GLINT_LOOP_MS;
  return k < GLINT_SWEEP ? GLINT_FROM + ((GLINT_TO - GLINT_FROM) * k) / GLINT_SWEEP : null;
}

/** A flag on a strip mesh that ripples from the hoist (x = 0) to the fly. */
class FlagCloth {
  readonly root = new Container();
  private mesh: Mesh | null = null;
  private geom: MeshGeometry | null = null;
  private base: Float32Array | null = null;
  private readonly cols = 14;
  /** The Legendary glint: a few quads over the cloth, textured with the flag's white silhouette. */
  private glint: { mesh: Mesh; geom: MeshGeometry } | null = null;
  constructor(
    tex: Texture,
    private readonly w: number,
    private readonly h: number,
    private readonly phase: number,
  ) {
    if (tex !== Texture.EMPTY) this.make(tex);
  }

  /** Shows another cloth texture (a national flag's baked lane cloth arriving). */
  setTexture(tex: Texture): void {
    if (tex === Texture.EMPTY || this.root.destroyed) return;
    if (this.mesh) this.mesh.texture = tex;
    else this.make(tex);
  }

  private make(tex: Texture): void {
    const w = this.w;
    const h = this.h;
    const n = this.cols;
    const pos = new Float32Array(n * 2 * 2);
    const uv = new Float32Array(n * 2 * 2);
    const idx: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const u = i / (n - 1);
      for (let r = 0; r < 2; r += 1) {
        const k = (i * 2 + r) * 2;
        pos[k] = u * w;
        pos[k + 1] = r * h;
        uv[k] = u;
        uv[k + 1] = r;
      }
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    this.base = pos.slice();
    this.geom = new MeshGeometry({ positions: pos, uvs: uv, indices: new Uint32Array(idx) });
    this.mesh = new Mesh({ geometry: this.geom, texture: tex });
    this.root.addChild(this.mesh);
  }

  /** `t` seconds; `amp` 0 = still. */
  wave(t: number, amp: number): void {
    if (!this.geom || !this.base) return;
    const p = this.geom.positions;
    const n = this.cols;
    for (let i = 0; i < n; i += 1) {
      const u = i / (n - 1);
      for (let r = 0; r < 2; r += 1) {
        const k = (i * 2 + r) * 2;
        const [x, y] = this.point(u, r, t, amp);
        p[k] = x;
        p[k + 1] = y;
      }
    }
    this.geom.getBuffer('aPosition').update();
  }

  /** Where the cloth's point at (u, row r) is at `t` (the ripple: lifted, pulled toward the hoist). */
  private point(u: number, r: number, t: number, amp: number): [number, number] {
    const s = Math.sin(t * 5.2 - u * 5.4 + this.phase);
    const s2 = Math.sin(t * 3.1 - u * 3.2 + this.phase * 1.7);
    const lift = amp * u * (s * 2.2 + s2 * 1.1);
    const pull = amp * u * u * (1.6 + s2 * 0.8);
    // the lower edge droops a little more than the top edge
    return [u * this.w - pull, r * this.h + lift + (r === 1 ? amp * u * 0.9 : 0)];
  }

  /**
   * Adds the Legendary glint (`mask`: the flag's silhouette in white, laid out like its cloth texture).
   * The band's quads take the cloth's own ripple at their corners and sample the silhouette there, so the
   * glint stays exactly on the cloth (never on the swallowtail's notch or past the edge) with no mask or
   * filter: one small mesh, drawn only while it sweeps.
   */
  addGlint(mask: Texture): void {
    if (mask === Texture.EMPTY || this.glint) return;
    const quads = GLINT_BANDS.length;
    const idx: number[] = [];
    for (let q = 0; q < quads; q += 1) idx.push(q * 4, q * 4 + 1, q * 4 + 2, q * 4 + 1, q * 4 + 3, q * 4 + 2);
    const geom = new MeshGeometry({ positions: new Float32Array(quads * 8), uvs: new Float32Array(quads * 8), indices: new Uint32Array(idx) });
    const mesh = new Mesh({ geometry: geom, texture: mask });
    mesh.alpha = GLINT_ALPHA;
    mesh.visible = false;
    this.root.addChild(mesh);
    this.glint = { mesh, geom };
  }

  /** Moves the glint to `dx` view-box units along its sweep (null hides it), on the cloth as it is at `t`. */
  sweep(dx: number | null, t: number, amp: number): void {
    const g = this.glint;
    if (!g) return;
    g.mesh.visible = dx !== null;
    if (dx === null) return;
    const span = FLAG_W + 4;
    const toU = (x: number) => (x + 2) / span;
    const pos = g.geom.positions;
    const uv = g.geom.uvs;
    GLINT_BANDS.forEach((hw, q) => {
      // the band's centre line: x = -2 + dx at the top edge (y = -2), 12 units further back at the foot
      const corners: [number, number][] = [
        [toU(-2 + dx - hw), 0],
        [toU(-2 + dx + hw), 0],
        [toU(-14 + dx - hw), 1],
        [toU(-14 + dx + hw), 1],
      ];
      corners.forEach(([u, r], c) => {
        const k = (q * 4 + c) * 2;
        const [x, y] = this.point(u, r, t, amp);
        pos[k] = x;
        pos[k + 1] = y;
        uv[k] = u;
        uv[k + 1] = r;
      });
    });
    g.geom.getBuffer('aPosition').update();
    g.geom.getBuffer('aUV').update();
  }

  get size(): { w: number; h: number } {
    return { w: this.w, h: this.h };
  }
}

/**
 * The decoration prop sheets (round 3), duck-typed by the provider: `get` a prop already loaded, `ensure` loads
 * it (resolves null when it failed or props are off for this provider). Absent: the SVG bakes stay.
 */
export interface DecorationProps {
  has(id: string): boolean;
  get(id: string): WorldSheet | undefined;
  ensure(id: string): Promise<WorldSheet | null>;
}

/** How long the SVG bake cross-fades into its arriving prop (ms). */
export const PROP_FADE_MS = 280;

/** A decoration's Blender prop, built from its sheet (see the module note). */
interface PropModel {
  root: Container;
  meta: WorldMeta;
  loop: { team: Sprite | null; body: Sprite; frames: readonly Texture[]; teamFrames: readonly Texture[] | null; durations: number[]; total: number } | null;
  /** Glint sparks (the crystal flower, the star): their resting scale and when each flashes next (ms of the dressing's clock). */
  glints: { g: Sprite; k: number; next: number; t: number }[];
  /** The light point embers rise from (fire), in the prop's own lu, y up, and its pooled embers (never added or removed while it shows). */
  ember: { x: number; y: number } | null;
  embers: Ember[];
  /** Embers in flight now (the pool is skipped while none flies and none is due). */
  live: number;
  emberAt: number;
}

interface Prop {
  root: Container;
  id: string;
  art: DecorationArt;
  /** The SVG bake: shown until the prop arrives, then cross-faded out and dropped. */
  svg: Container | null;
  model: PropModel | null;
  /** ms into the cross-fade from the SVG to the prop; -1 when none runs. */
  fade: number;
  glow: Sprite | null;
  /** The glow's resting scale (the plasma brazier's pulse scales it). */
  glowScale: number;
  phase: number;
  x: number;
}

interface Ember {
  g: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** ms lived; -1 while the slot waits for its next spark. */
  life: number;
  max: number;
}

/** Embers a fire keeps in its pool (High; Lite uses half). */
const EMBERS = 6;
/**
 * The props' light, embers and glints are plain sprites over three small textures baked once (a soft radial
 * glow, a soft dot, a four-point spark), tinted and scaled per prop: they batch with the props' frames and cost
 * no per-object geometry (frame time: three props a side match the SVG bakes; WebKit note in the module doc).
 */
const GLOW_PX = 64;
const EMBER_PX = 16;
const SPARK_PX = 32;

interface Mote {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: SkinParticles;
}

/**
 * A skin model's ambient emitter (`meta.ageborn.ambientLu`, PLAN 2c): base-local lu, y up; `color` (a hex
 * string) tints its motes when the model's materials want their own (Crystal Spire's lilac glints).
 */
interface AmbientSpot {
  kind: string;
  x: number;
  y: number;
  r: number;
  rate: number;
  color?: string;
}

const AMBIENT_KINDS: readonly SkinParticles[] = ['snow', 'fireflies', 'glints', 'petals', 'embers', 'dust', 'stars', 'mist', 'rain', 'smoke', 'steam', 'birds', 'rings'];
/** Mote colours of an ambient kind a skin's own particles do not cover (A11: pale, desaturated). */
const AMBIENT_COLORS: Partial<Record<SkinParticles, number>> = {
  snow: 0xffffff,
  fireflies: 0xdcff7a,
  glints: 0xfff2b0,
  petals: 0xff9ab8,
  embers: 0xffb060,
  dust: 0xe8d4a4,
  stars: 0xffffff,
  // round 2: frost breathing from a cave, rain drips off neon glass, chimney smoke, a foundry's steam
  mist: 0xe6f0f4,
  rain: 0xc4d0dc,
  smoke: 0xdcd8d2,
  steam: 0xf4f6f6,
  // round 3: a small dark bird (gulls pass their own white), a pale smoke ring
  birds: 0x3e4044,
  rings: 0xe4e2dc,
};
/** Kinds whose soft puffs grow as they live (mist, smoke, steam and smoke rings) and the alpha they peak at. */
const PUFF_ALPHA: Partial<Record<SkinParticles, number>> = { mist: 0.42, smoke: 0.5, steam: 0.46, rings: 0.8 };

function hexColor(s: string | undefined): number | null {
  return s && /^#[0-9a-f]{6}$/i.test(s) ? parseInt(s.slice(1), 16) : null;
}

export interface DressingOptions {
  age: AgeId;
  side: Side;
  look: SideLook;
  team: number;
  base?: BaseView;
  seed?: number;
  canvas?: CanvasFactory;
  /**
   * A look with neither flag flies a plain banner on the pole instead of no pole (Home's island: the
   * opponent's banner, grey while no opponent has been found; duck-typed through `createBaseDressing`).
   * `color` replaces the team colour (null keeps it).
   */
  banner?: { color?: number | null } | null;
  /** The decoration prop sheets (round 3); absent or null: the SVG bakes stay. */
  props?: DecorationProps | null;
}

/**
 * A plain banner: the base flags' swallowtail cloth (field, fold bands, weave, hem and sleeve) in one colour
 * with no emblem, outlined in the cloth's own dark, laid out like a base flag's texture (a 2-unit margin).
 */
export function drawPlainBanner(ctx: Ctx2D, color: number, px: number): boolean {
  if (typeof Path2D !== 'function') return false;
  const p = { team: color };
  ctx.save();
  ctx.scale(px, px);
  ctx.translate(2, 2);
  const outline = new Path2D(BANNER_OUTLINE);
  ctx.save();
  ctx.clip(outline);
  drawShapes(ctx, flagCloth('common'), p);
  drawShapes(ctx, flagTrim('common'), p);
  ctx.restore();
  ctx.strokeStyle = celRamp(hex(color), 'cloth').line;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke(outline);
  ctx.restore();
  return true;
}

export class BaseDressing implements BaseDressingView {
  readonly root = new Container();
  private readonly facing: 1 | -1;
  private readonly pole = new Container();
  private readonly flags: FlagCloth[] = [];
  /** The Legendary base flag's cloth, whose glint sweeps every 5 s (custom-c-lane-flag-glint). */
  private glintCloth: FlagCloth | null = null;
  /** The pole flies a national flag: on the collapse it is lowered intact, never snapped over (PLAN 2d). */
  private fliesNation = false;
  private readonly props: Prop[] = [];
  private readonly motes = new Container();
  private moteList: Mote[] = [];
  private readonly rng: CosmeticRng;
  private age: AgeId;
  private skin: BaseSkinArt | null = null;
  /** True while the base view shows that skin's model: the model's own ambient spots, no field of motes. */
  private modelShown = false;
  private poleCap: Graphics | null = null;
  private clock = 0;
  private flutter = 0;
  private collapseT = -1;
  private collapseDelay = 0;
  private reduce = false;
  private lite = false;
  private tintAt = -1;
  private destroyed = false;
  private readonly make: CanvasFactory;

  constructor(private readonly o: DressingOptions) {
    this.facing = o.side === 0 ? 1 : -1;
    this.age = o.age;
    this.rng = mulberry32(o.seed ?? 7 + o.side);
    this.make = o.canvas ?? defaultCanvas;
    this.root.label = `dressing.${o.side}`;
    this.buildDecorations();
    this.buildPole();
    this.root.addChild(this.motes);
    this.applySkin(o.age);
    if (o.base) o.base.root.addChild(this.root);
  }

  // -------------------------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------------------------

  private flagTexture(kind: FlagKind | 'banner', id: string, onReady?: (t: Texture) => void): Texture {
    if (kind === 'banner') {
      const color = this.o.banner?.color ?? this.o.team;
      return bake(`banner.plain|${color}`, (FLAG_W + 4) * TEX_PX, (FLAG_H + 4) * TEX_PX, (ctx) => drawPlainBanner(ctx, color, TEX_PX), this.make);
    }
    if (kind === 'nationalFlag') {
      // Track D's lane cloth (baked from the accurate SVG): shown now, swapped when its bake is in
      const lane = nationalFlagTexture(id);
      if (lane) {
        lane.ready.then(
          () => {
            if (!this.destroyed) onReady?.(nationalFlagTexture(id)?.texture ?? lane.texture);
          },
          () => {},
        );
        return lane.texture;
      }
    }
    const w = (FLAG_W + 4) * TEX_PX;
    const h = (FLAG_H + 4) * TEX_PX;
    return bake(`${kind}.${id}|${this.o.team}`, w, h, (ctx) => drawFlag(ctx, kind, id, { team: this.o.team }, TEX_PX), this.make);
  }

  /** A base flag's white silhouette inside its swallowtail (the glint's texture), laid out like its cloth. */
  private glintMask(id: string): Texture {
    const w = (FLAG_W + 4) * TEX_PX;
    const h = (FLAG_H + 4) * TEX_PX;
    return bake(`glint.${id}|${this.o.team}`, w, h, (ctx) => {
      if (!drawFlag(ctx, 'baseFlag', id, { team: this.o.team }, TEX_PX)) return false;
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      // only the cloth inside the outline (the fringe below it stays out of the glint, as in Customize)
      if (typeof Path2D === 'function') {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.setTransform(TEX_PX, 0, 0, TEX_PX, 2 * TEX_PX, 2 * TEX_PX);
        ctx.fill(new Path2D(BANNER_OUTLINE));
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      return true;
    }, this.make);
  }

  private buildPole(): void {
    const look = this.o.look;
    const flags: { kind: FlagKind | 'banner'; id: string; lu: number }[] = [];
    for (const [kind, key, lu] of [
      ['baseFlag', look.baseFlag, BASE_FLAG_LU],
      ['nationalFlag', look.nationalFlag, NATION_FLAG_LU],
    ] as const) {
      const k = key ? parseCosmeticKey(key) : null;
      if (k && k.collection === kind) flags.push({ kind, id: k.id, lu });
    }
    // no flag of its own: a plain banner where one is asked for (Home's island), else no pole at all
    if (flags.length === 0 && this.o.banner) flags.push({ kind: 'banner', id: 'plain', lu: BASE_FLAG_LU });
    if (flags.length === 0) return;
    this.fliesNation = flags.some((f) => f.kind === 'nationalFlag');
    const x = DRESSING_ANCHORS.pole * this.facing;
    const top = DRESSING_ANCHORS.poleTop;
    this.pole.position.set(x, 0);
    const g = new Graphics();
    // footing, pole (with a highlight) and cap
    g.roundRect(-7, -6, 14, 7, 2).fill(0x6e6258).stroke({ width: 1.6, color: INK });
    g.rect(-2, -top, 4, top - 5).fill(0x8a6a45).stroke({ width: 1.4, color: INK });
    g.rect(-1.2, -top + 3, 1, top - 10).fill({ color: 0xffffff, alpha: 0.35 });
    this.pole.addChild(g);
    this.poleCap = new Graphics();
    this.pole.addChild(this.poleCap);
    let y = -top + 4;
    flags.forEach((f, i) => {
      let cloth: FlagCloth | null = null;
      const tex = this.flagTexture(f.kind, f.id, (t) => cloth?.setTexture(t));
      const w = (FLAG_W + 4) * f.lu;
      const h = (FLAG_H + 4) * f.lu;
      cloth = new FlagCloth(tex, w, h, i * 1.3 + this.o.side * 0.7);
      // a Legendary base flag (Wyvern, Phoenix, World Compass) glints as in Customize (PLAN 2a)
      if (f.kind === 'baseFlag' && baseFlagDesign(f.id)?.tier === 'legendary') {
        cloth.addGlint(this.glintMask(f.id));
        this.glintCloth = cloth;
      }
      // the texture has a 2-unit margin: the hoist edge sits on the pole
      cloth.root.position.set(2 - 2 * f.lu, y - 2 * f.lu);
      this.pole.addChild(cloth.root);
      this.flags.push(cloth);
      y += FLAG_H * f.lu + 6;
    });
    this.root.addChild(this.pole);
  }

  private buildDecorations(): void {
    const keys = this.o.look.decorations ?? [];
    DRESSING_ANCHORS.decorations.forEach((ax, i) => {
      const k = keys[i] ? parseCosmeticKey(keys[i]!) : null;
      if (!k || k.collection !== 'decoration') return;
      const art = DECORATIONS[k.id];
      if (!art) return;
      const root = new Container();
      root.label = `decoration.${k.id}`;
      const x = ax * this.facing;
      root.position.set(x, 0);
      this.root.addChild(root);
      const prop: Prop = { root, id: k.id, art, svg: null, model: null, fade: -1, glow: null, glowScale: 1, phase: this.rng.next() * 6.28, x };
      this.props.push(prop);
      const props = this.o.props;
      const sheet = props?.has(k.id) ? props.get(k.id) : undefined;
      if (sheet) {
        // the prop is in already (VS warmed it): no SVG at all
        this.showModel(prop, sheet, false);
        return;
      }
      this.showSvg(prop);
      if (props?.has(k.id)) {
        props.ensure(k.id).then(
          (s) => {
            if (s && !this.destroyed && !root.destroyed && this.props.includes(prop)) this.showModel(prop, s, true);
          },
          () => {},
        );
      }
    });
  }

  /** The decoration's SVG bake (its glow from the SVG art): the stand-in until its prop arrives. */
  private showSvg(p: Prop): void {
    const tex = bake(`decoration.${p.id}|${this.o.team}`, DECO_W * TEX_PX, DECO_H * TEX_PX, (ctx) => drawDecoration(ctx, p.id, { team: this.o.team }, TEX_PX), this.make);
    const svg = new Container();
    const sprite = new Sprite(tex);
    sprite.scale.set(DECO_LU / TEX_PX);
    sprite.position.set((-DECO_W / 2) * DECO_LU, -DECO_GROUND * DECO_LU);
    svg.addChild(sprite);
    p.root.addChild(svg);
    p.svg = svg;
    if (p.art.glow) this.setGlow(p, (p.art.glow.x - DECO_W / 2) * DECO_LU, (DECO_GROUND - p.art.glow.y) * DECO_LU, p.art.glow.r * DECO_LU, p.art.glow.color);
  }

  /** A soft glow (an additive radial sprite) at x, y (lu, y up from the foot) with radius r, replacing any earlier one. */
  private setGlow(p: Prop, x: number, y: number, r: number, color: number): void {
    p.glow?.destroy();
    const glow = new Sprite(this.fxTexture('glow'));
    glow.anchor.set(0.5);
    glow.tint = color;
    glow.blendMode = 'add';
    glow.position.set(x, -y);
    p.glowScale = (2 * r) / GLOW_PX;
    glow.scale.set(p.glowScale);
    p.root.addChild(glow);
    p.glow = glow;
  }

  /**
   * The props' three shared light textures, baked once: `glow` a soft white radial light (its centre about as
   * bright as the round-2 glow's three stacked discs), `ember` a soft dot, `spark` a white four-point star.
   */
  private fxTexture(kind: 'glow' | 'ember' | 'spark'): Texture {
    if (kind === 'glow') {
      return bake('decoration.fx.glow', GLOW_PX, GLOW_PX, (ctx) => {
        const h = GLOW_PX / 2;
        const g = ctx.createRadialGradient(h, h, 0, h, h, h);
        g.addColorStop(0, 'rgba(255,255,255,0.7)');
        g.addColorStop(0.32, 'rgba(255,255,255,0.6)');
        g.addColorStop(0.62, 'rgba(255,255,255,0.34)');
        g.addColorStop(0.85, 'rgba(255,255,255,0.12)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, GLOW_PX, GLOW_PX);
        return true;
      }, this.make);
    }
    if (kind === 'ember') {
      return bake('decoration.fx.ember', EMBER_PX, EMBER_PX, (ctx) => {
        const h = EMBER_PX / 2;
        const g = ctx.createRadialGradient(h, h, 0, h, h, h);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.45, 'rgba(255,255,255,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, EMBER_PX, EMBER_PX);
        return true;
      }, this.make);
    }
    return bake('decoration.fx.spark', SPARK_PX, SPARK_PX, (ctx) => {
      const h = SPARK_PX / 2;
      const r = h - 1;
      const q = r * 0.2;
      ctx.beginPath();
      ctx.moveTo(h, h - r);
      ctx.lineTo(h + q, h - q);
      ctx.lineTo(h + r, h);
      ctx.lineTo(h + q, h + q);
      ctx.lineTo(h, h + r);
      ctx.lineTo(h - q, h + q);
      ctx.lineTo(h - r, h);
      ctx.lineTo(h - q, h - q);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      return true;
    }, this.make);
  }

  /**
   * Builds the decoration's Blender prop from its sheet: a contact shadow, the body over its tinted team twin,
   * the loop's first frame over its twin, its light and glints from the meta. `fade`: cross-fade from the SVG
   * (the prop arrived while the SVG showed); otherwise it shows at once.
   */
  private showModel(p: Prop, sheet: WorldSheet, fade: boolean): void {
    if (p.model) return;
    const meta = sheet.meta;
    const k = sheet.luPerUnit;
    const mirror = meta.mirror === false ? 1 : this.facing;
    const root = new Container();
    root.label = `decoration.${p.id}.prop`;
    // the contact shadow grounds it (a soft ellipse, wider than deep)
    const half = meta.shadowLu ?? 16;
    const sh = new Sprite(this.shadowTexture());
    sh.anchor.set(0.5);
    sh.scale.set((half * 2) / 64, (half * 0.5) / 16);
    sh.position.set(0, 0.6);
    root.addChild(sh);
    const art = new Container();
    art.scale.set(mirror, 1);
    root.addChild(art);
    const sprite = (tex: Texture | undefined, team: boolean): Sprite => {
      const s = new Sprite();
      setFrame(s, tex);
      s.scale.set(k);
      if (team) s.tint = this.o.team;
      art.addChild(s);
      return s;
    };
    const bodyTeam = sheet.animations['body_team']?.[0];
    if (bodyTeam && bodyTeam.width > 1) sprite(bodyTeam, true);
    sprite(sheet.animations['body']?.[0], false);
    let loop: PropModel['loop'] = null;
    const frames = sheet.animations['loop'];
    if (frames && frames.length > 0) {
      const teamFrames = sheet.animations['loop_team'] ?? null;
      const hasTeam = !!teamFrames && teamFrames.some((t) => t.width > 1);
      const team = hasTeam ? sprite(teamFrames![0], true) : null;
      const body = sprite(frames[0], false);
      const durations = clipDurations(sheet, 'loop', 120);
      loop = { team, body, frames, teamFrames: hasTeam ? teamFrames : null, durations, total: durations.reduce((a, b) => a + b, 0) };
    }
    const glints: PropModel['glints'] = [];
    for (const g of meta.glintsLu ?? []) {
      // a four-point spark spanning 4 r (as the round-2 polygon did)
      const s = new Sprite(this.fxTexture('spark'));
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.visible = false;
      s.position.set(g.x * mirror, -g.y);
      glints.push({ g: s, k: (4 * Math.max(1.5, g.r)) / SPARK_PX, next: this.clock + 600 + this.rng.next() * 2400, t: -1 });
    }
    const gl = meta.glowLu;
    const color = gl ? (/^#[0-9a-f]{6}$/i.test(gl.color) ? parseInt(gl.color.slice(1), 16) : 0xffa040) : 0;
    p.root.addChildAt(root, 0);
    if (gl) this.setGlow(p, gl.x * mirror, gl.y, gl.r, color);
    else {
      p.glow?.destroy();
      p.glow = null;
    }
    for (const s of glints) p.root.addChild(s.g);
    const ember = meta.motion === 'flicker' && loop && gl ? { x: gl.x * mirror, y: gl.y } : null;
    const embers: Ember[] = [];
    if (ember) {
      const tex = this.fxTexture('ember');
      for (let i = 0; i < EMBERS; i++) {
        const g = new Sprite(tex);
        g.anchor.set(0.5);
        // a soft dot whose bright core is about 0.9-1.5 lu across
        g.scale.set(((0.9 + this.rng.next() * 0.6) * 2.4) / EMBER_PX);
        g.tint = i % 2 ? 0xffc47a : 0xff9a4d;
        g.blendMode = 'add';
        g.visible = false;
        p.root.addChild(g);
        embers.push({ g, x: 0, y: 0, vx: 0, vy: 0, life: -1, max: 1 });
      }
    }
    p.model = { root, meta, loop, glints, ember, embers, live: 0, emberAt: this.clock + this.rng.next() * 600 };
    if (fade && p.svg) {
      p.fade = 0;
      root.alpha = 0;
    } else {
      p.svg?.destroy({ children: true });
      p.svg = null;
      p.fade = -1;
    }
  }

  private shadowTex: Texture | null = null;

  /** A soft dark ellipse (64 x 16 px), shared by the props' contact shadows. */
  private shadowTexture(): Texture {
    this.shadowTex ??= bake('decoration.shadow', 64, 16, (ctx) => {
      // a circle drawn in a space squashed to a quarter of its height: the ellipse fills the 64 x 16 px
      ctx.save();
      ctx.scale(1, 0.25);
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(28,20,14,0.42)');
      g.addColorStop(0.55, 'rgba(28,20,14,0.24)');
      g.addColorStop(1, 'rgba(28,20,14,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      ctx.restore();
      return true;
    }, this.make);
    return this.shadowTex;
  }

  private applySkin(age: AgeId): void {
    const key = this.o.look.baseSkins?.[age];
    this.skin = baseSkinArt(key);
    this.modelShown = this.showsModel();
    const cap = this.poleCap;
    if (cap) {
      cap.clear();
      const top = DRESSING_ANCHORS.poleTop;
      cap.circle(0, -top, 4.2).fill(this.skin?.trim ?? 0xffcf3a).stroke({ width: 1.4, color: INK });
      cap.circle(-1.2, -top - 1.2, 1.2).fill({ color: 0xffffff, alpha: 0.7 });
    }
    (this.o.base as { setSkinTint?: (tint: number | null) => void } | undefined)?.setSkinTint?.(this.skin?.tint ?? null);
    for (const m of this.moteList) m.g.destroy();
    this.moteList = [];
  }

  // -------------------------------------------------------------------------------------------
  // BaseDressingView
  // -------------------------------------------------------------------------------------------

  setAge(age: AgeId, ms: number): void {
    this.age = age;
    // the new skin shows as the new body assembles (about half-way through the morph)
    this.tintAt = this.clock + Math.max(0, ms) * 0.45;
  }

  hit(): void {
    this.flutter = Math.min(1.6, this.flutter + 0.8);
  }

  collapse(): void {
    this.collapseAt(0);
  }

  /**
   * The base's destroyed collapse (duck-typed by the battle view): the props tremble with the base
   * through its build-up, and on the break (`breakMs` of game time from now) the pole snaps and the
   * flags flutter down while the decorations topple. A pole with a national flag is lowered intact
   * instead (it leans a little and sinks as it fades; PLAN 2d's respect note: a nation's flag is
   * never shown snapped or torn).
   */
  collapseAt(breakMs: number): void {
    if (this.collapseT >= 0) return;
    this.collapseT = 0;
    this.collapseDelay = Math.max(0, breakMs);
  }

  setMotion(o: { reduce: boolean; lite: boolean }): void {
    this.reduce = o.reduce;
    this.lite = o.lite;
  }

  /**
   * Where the pole stands in the dressing's own lu (x from its root, the top above the ground), or null
   * without one (duck-typed: Home's island sizes and places the pole on its own picture).
   */
  poleAnchor(): { x: number; top: number } | null {
    return this.pole.parent ? { x: this.pole.x, top: DRESSING_ANCHORS.poleTop } : null;
  }

  update(dtMs: number): void {
    if (this.destroyed) return;
    const dt = Math.max(0, Math.min(dtMs, 100));
    this.clock += dt;
    if (this.tintAt >= 0 && this.clock >= this.tintAt) {
      this.tintAt = -1;
      this.applySkin(this.age);
    }
    const t = this.clock / 1000;
    this.flutter = Math.max(0, this.flutter - dt / 900);
    const amp = this.reduce ? 0 : 1 + this.flutter;
    for (const f of this.flags) f.wave(t, amp);
    // the Legendary glint: side 1 half a loop later, so two Legendary flags never flash together; none
    // under Reduce motion, on Lite or once the base falls
    if (this.glintCloth) {
      const on = !this.reduce && !this.lite && this.collapseT < 0;
      this.glintCloth.sweep(on ? glintOffset(this.clock + this.o.side * (GLINT_LOOP_MS / 2)) : null, t, amp);
    }
    for (const p of this.props) this.updateProp(p, dt, t);
    this.updateMotes(dt);
    if (this.collapseT >= 0) this.updateCollapse(dt);
  }

  /** One decoration: its cross-fade, the loop frame, its light, sway, glints and embers (see the module note). */
  private updateProp(p: Prop, dt: number, t: number): void {
    const m = p.model;
    if (p.fade >= 0 && m) {
      p.fade += dt;
      const u = Math.min(1, p.fade / PROP_FADE_MS);
      const e = u * u * (3 - 2 * u);
      m.root.alpha = e;
      if (p.svg) p.svg.alpha = 1 - e;
      if (u >= 1) {
        p.svg?.destroy({ children: true });
        p.svg = null;
        p.fade = -1;
      }
    }
    const motion = m ? (m.meta.motion ?? null) : p.art.sway ? 'sway' : p.art.glow ? 'flicker' : null;
    // plants sway from their foot (a banner's prop sways in its cloth loop instead)
    if (motion === 'sway') p.root.skew.x = this.reduce ? 0 : Math.sin(t * 1.7 + p.phase) * 0.045;
    const l = m?.loop;
    if (l) {
      const i = this.reduce || l.total <= 0 ? 0 : loopStep(l.durations, l.total, this.clock + p.phase * 997);
      setFrame(l.body, l.frames[i]);
      if (l.team && l.teamFrames) setFrame(l.team, l.teamFrames[i]);
    }
    if (p.glow) {
      if (motion === 'pulse') {
        // the plasma brazier: a slow swell of light (a still glow under Reduce motion)
        const s = this.reduce ? 0 : Math.sin(t * 3.6 + p.phase);
        p.glow.alpha = this.reduce ? 0.8 : 0.7 + 0.22 * s;
        p.glow.scale.set(p.glowScale * (1 + 0.12 * s));
      } else if (motion === 'flicker' || !m) {
        p.glow.alpha = this.reduce ? 0.85 : 0.75 + 0.18 * Math.sin(t * 9 + p.phase) + 0.08 * Math.sin(t * 23 + p.phase * 2);
      } else {
        // a steady light (glass eyes, the star): a slow breath
        p.glow.alpha = this.reduce ? 0.8 : 0.74 + 0.1 * Math.sin(t * 1.7 + p.phase);
      }
    }
    if (!m) return;
    for (let i = 0; i < m.glints.length; i++) this.stepGlint(m.glints[i]!, dt);
    // fire sends up a few embers from its pool (half on Lite; none under Reduce motion or once the base falls)
    if (m.ember) this.stepEmbers(m, dt);
  }

  private stepEmbers(m: PropModel, dt: number): void {
    const at = m.ember!;
    const cap = this.lite ? EMBERS / 2 : EMBERS;
    const spawn = !this.reduce && this.collapseT < 0 && this.clock >= m.emberAt;
    if (m.live === 0 && !spawn) return;
    let spawned = false;
    let live = 0;
    const rng = this.rng;
    for (let i = 0; i < m.embers.length; i++) {
      const e = m.embers[i]!;
      if (e.life < 0) {
        if (!spawn || spawned || i >= cap) continue;
        e.x = at.x + (rng.next() - 0.5) * 6;
        e.y = at.y + rng.next() * 4;
        e.vx = (rng.next() - 0.5) * 8;
        e.vy = 16 + rng.next() * 12;
        e.max = 800 + rng.next() * 700;
        e.life = 0;
        spawned = true;
      }
      e.life += dt;
      if (e.life >= e.max || this.reduce) {
        e.life = -1;
        e.g.visible = false;
        continue;
      }
      live++;
      e.x += (e.vx * dt) / 1000 + Math.sin(e.life / 160 + e.max) * 0.08;
      e.y += (e.vy * dt) / 1000;
      const k = e.life / e.max;
      e.g.visible = true;
      e.g.position.set(e.x, -e.y);
      e.g.alpha = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.9;
    }
    m.live = live;
    if (spawned) m.emberAt = this.clock + (this.lite ? 760 : 380) * (0.7 + this.rng.next() * 0.6);
  }

  /** A glint: a white four-point spark that flashes for 420 ms every few seconds (never under Reduce motion). */
  private stepGlint(g: PropModel['glints'][number], dt: number): void {
    if (this.reduce || this.collapseT >= 0) {
      g.g.visible = false;
      g.t = -1;
      return;
    }
    if (g.t < 0) {
      if (this.clock < g.next) {
        g.g.visible = false;
        return;
      }
      g.t = 0;
    }
    g.t += dt;
    const u = g.t / 420;
    if (u >= 1) {
      g.t = -1;
      g.next = this.clock + 1800 + this.rng.next() * 2800;
      g.g.visible = false;
      return;
    }
    const s = Math.sin(u * Math.PI);
    g.g.visible = true;
    g.g.alpha = s;
    g.g.scale.set(g.k * (0.35 + 0.85 * s));
    g.g.rotation = u * 0.9;
  }


  /**
   * True when the base view shows a skin model (PLAN 2c), so the old restyle is off: the equipped skin's
   * model, or the troop-system skin that wins over it (Crystal Spire, which has no cosmetic key).
   */
  private showsModel(): boolean {
    const v = this.o.base as { skinModel?: () => string | null } | undefined;
    return (v?.skinModel?.() ?? null) !== null;
  }

  /** The skin model's ambient spots (base-local lu, y up), when the model shows. */
  private spots(): readonly AmbientSpot[] {
    if (!this.modelShown) return [];
    const v = this.o.base as { ambientSpots?: () => readonly AmbientSpot[] } | undefined;
    return v?.ambientSpots?.() ?? [];
  }

  private updateMotes(dt: number): void {
    const s = this.skin;
    // the model arrived (or left with an evolve): switch between its own spots and the field of motes
    const model = this.showsModel();
    if (model !== this.modelShown) {
      this.modelShown = model;
      for (const m of this.moteList) m.g.destroy();
      this.moteList = [];
    }
    const spots = this.spots();
    const field = !this.modelShown && s !== null;
    const want = this.reduce ? 0 : spots.length > 0 ? (this.lite ? 5 : 10) : field ? (this.lite ? 7 : 14) : 0;
    while (this.moteList.length < want) {
      const m = spots.length > 0 ? this.spawnAt(spots, s) : s ? this.spawnMote(s.particles, s.particleColor, true) : null;
      if (!m) break;
      this.moteList.push(m);
    }
    const keep: Mote[] = [];
    for (const m of this.moteList) {
      m.life += dt;
      m.x += (m.vx * dt) / 1000;
      m.y += (m.vy * dt) / 1000;
      if (m.kind === 'petals') m.x += Math.sin((m.life / 1000) * 3 + m.max) * 0.3;
      if (m.kind === 'petals' || m.kind === 'snow') m.g.rotation = Math.sin((m.life / 1000) * 2.2 + m.max) * 0.9;
      if (m.kind === 'birds') {
        // a glide with a gentle bob; the wings beat (the V flattens and lifts) in short bursts
        m.y += Math.sin(m.life / 420 + m.max) * 0.04;
        const beat = Math.sin(m.life / 1000 * 1.3 + m.max) > 0.2 ? Math.abs(Math.sin(m.life / 95 + m.max)) : 0.35;
        m.g.scale.y = 0.45 + 0.8 * beat;
      }
      const k = m.life / m.max;
      const fade = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      // settled on the ground: melt away
      const ground = m.y < 1.5 && m.vy < 0 ? 0.0 : 1;
      m.g.position.set(m.x * this.facing, -Math.max(0.5, m.y));
      const puff = PUFF_ALPHA[m.kind];
      if (puff !== undefined) {
        // mist and smoke swell and thin out as they drift
        m.g.scale.set(1 + k * 1.6);
        m.g.alpha = Math.max(0, fade) * ground * puff * (1 - k * 0.5);
      } else {
        const twinkle = m.kind === 'fireflies' || m.kind === 'glints' || m.kind === 'stars';
        m.g.alpha = Math.max(0, fade) * ground * (twinkle ? 0.55 + 0.45 * Math.sin(m.life / 140) : m.kind === 'birds' ? 0.85 : 0.9);
      }
      if (m.life >= m.max || want === 0 || ground === 0) m.g.destroy();
      else keep.push(m);
    }
    this.moteList = keep;
  }

  /** A mote of the skin model's ambient: from one of its spots (weighted by rate), within its radius. */
  private spawnAt(spots: readonly AmbientSpot[], s: BaseSkinArt | null): Mote | null {
    let total = 0;
    for (const p of spots) total += Math.max(0, p.rate);
    if (total <= 0) return null;
    let pick = this.rng.next() * total;
    let spot = spots[0]!;
    for (const p of spots) {
      pick -= Math.max(0, p.rate);
      if (pick <= 0) {
        spot = p;
        break;
      }
    }
    const kind = (AMBIENT_KINDS.includes(spot.kind as SkinParticles) ? spot.kind : 'glints') as SkinParticles;
    const color = hexColor(spot.color) ?? (s && s.particles === kind ? s.particleColor : (AMBIENT_COLORS[kind] ?? 0xffffff));
    const m = this.spawnMote(kind, color, false);
    const a = this.rng.next() * Math.PI * 2;
    const d = Math.sqrt(this.rng.next()) * spot.r;
    m.x = spot.x + Math.cos(a) * d;
    m.y = Math.max(2, spot.y + Math.sin(a) * d * 0.6);
    // the model's ambient is gentler and shorter than the field of motes it replaces (rain stays quick; a bird
    // takes its time to glide past)
    if (kind !== 'rain') m.vy *= 0.75;
    m.max = kind === 'rain' ? 700 + this.rng.next() * 500 : kind === 'birds' ? 3600 + this.rng.next() * 2000 : 1800 + this.rng.next() * 1800;
    return m;
  }

  private spawnMote(kind: SkinParticles, color: number, anywhere: boolean): Mote {
    const r = () => this.rng.next();
    const g = new Graphics();
    const size = kind === 'dust' ? 1.6 : kind === 'stars' || kind === 'glints' ? 2 : 1.8;
    if (kind === 'glints' || kind === 'stars') {
      g.poly([0, -size * 2, size * 0.5, -size * 0.5, size * 2, 0, size * 0.5, size * 0.5, 0, size * 2, -size * 0.5, size * 0.5, -size * 2, 0, -size * 0.5, -size * 0.5]).fill(color);
    } else if (kind === 'petals') {
      g.ellipse(0, 0, size * 1.4, size * 0.8).fill(color);
      g.ellipse(-size * 0.3, -size * 0.2, size * 0.6, size * 0.3).fill({ color: 0xffffff, alpha: 0.35 });
    } else if (kind === 'rain') {
      // a thin slanted drip streak
      g.poly([-0.35, -3.2, 0.35, -3.2, 1.0, 3.2, 0.3, 3.2]).fill(color);
    } else if (kind === 'birds') {
      // a small gliding bird: two arched wings (a soft "m" stroke)
      g.moveTo(-3.4, 0.6).quadraticCurveTo(-1.7, -1.9, 0, 0).quadraticCurveTo(1.7, -1.9, 3.4, 0.6).stroke({ width: 1.1, color, cap: 'round', join: 'round' });
    } else if (kind === 'rings') {
      // a smoke ring: a soft ellipse outline (a thicker pale band under a thin bright one), seen a little from above
      g.ellipse(0, 0, 3.0, 1.5).stroke({ width: 1.6, color, alpha: 0.55 });
      g.ellipse(0, -0.3, 3.0, 1.3).stroke({ width: 0.7, color: 0xffffff, alpha: 0.6 });
    } else if (kind === 'mist' || kind === 'smoke' || kind === 'steam') {
      // a soft puff: a few overlapping discs, lighter in the middle
      g.circle(0, 0, size * 2.4).fill({ color, alpha: 0.55 });
      g.circle(-size * 1.4, size * 0.4, size * 1.6).fill({ color, alpha: 0.55 });
      g.circle(size * 1.3, size * 0.6, size * 1.5).fill({ color, alpha: 0.55 });
      g.circle(0, -size * 0.4, size * 1.2).fill({ color: 0xffffff, alpha: 0.35 });
    } else {
      g.circle(0, 0, size).fill(color);
    }
    if (kind === 'fireflies' || kind === 'embers' || kind === 'glints' || kind === 'stars') g.blendMode = 'add';
    this.motes.addChild(g);
    const x = -190 + r() * 200;
    const falling = kind === 'snow' || kind === 'petals' || kind === 'rain';
    const rising = kind === 'embers' || kind === 'stars' || kind === 'smoke' || kind === 'steam' || kind === 'rings';
    const y = anywhere ? 10 + r() * 200 : falling ? 220 : 6;
    const vy = kind === 'rain' ? -(110 + r() * 40) : kind === 'mist' ? 2 + r() * 4 : kind === 'smoke' || kind === 'steam' ? 10 + r() * 8 : kind === 'rings' ? 6 + r() * 3 : kind === 'birds' ? (r() - 0.5) * 3 : falling ? -(14 + r() * 12) : rising ? 12 + r() * 14 : (r() - 0.5) * 8;
    const vx = kind === 'dust' || kind === 'mist' ? 10 + r() * 10 : kind === 'rain' ? -6 - r() * 4 : kind === 'smoke' || kind === 'steam' ? 4 + r() * 6 : kind === 'rings' ? 3 + r() * 3 : kind === 'birds' ? (r() < 0.5 ? -1 : 1) * (16 + r() * 10) : (r() - 0.5) * 10;
    return { g, x, y, vx, vy, life: 0, max: 2600 + r() * 2600, kind };
  }

  private updateCollapse(dt: number): void {
    this.collapseT += dt;
    const t = this.collapseT - this.collapseDelay;
    const x0 = DRESSING_ANCHORS.pole * this.facing;
    if (t < 0) {
      // the build-up: the props shiver with the base and the flags whip
      const u = 1 - -t / Math.max(1, this.collapseDelay);
      const amp = this.reduce ? 0 : 0.6 + 1.8 * u * u;
      this.pole.x = x0 + Math.sin(this.collapseT / 13) * amp;
      this.flutter = Math.max(this.flutter, 1.2 + 0.6 * u);
      return;
    }
    // the break: the pole snaps over (accelerating), drops and fades; the decorations topple. A pole
    // flying a national flag is lowered: it leans gently and sinks while it fades
    const k = Math.min(1, t / 900);
    const snap = Math.min(1, t / 420);
    if (this.fliesNation) {
      const e = 1 - (1 - k) * (1 - k);
      this.pole.x = x0 + (this.reduce ? 0 : 4 * e * this.facing);
      this.pole.y = this.reduce ? 0 : 30 * e;
      this.pole.rotation = (this.reduce ? 0.12 : 0.24) * e * this.facing;
    } else {
      this.pole.x = x0 + (this.reduce ? 0 : 18 * k * k * this.facing);
      this.pole.y = this.reduce ? 0 : 26 * k * k;
      this.pole.rotation = (this.reduce ? 0.35 * snap : 1.45 * snap * snap) * this.facing;
    }
    this.pole.alpha = 1 - Math.max(0, (k - 0.55) / 0.45);
    this.flutter = Math.max(this.flutter, 1.6 * (1 - k));
    for (const p of this.props) {
      const kk = Math.min(1, t / 700);
      p.root.rotation = (this.reduce ? 0.2 : 0.9) * kk * kk * (p.x > 0 ? 1 : -1);
      p.root.alpha = 1 - kk;
    }
    this.motes.alpha = 1 - k;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (!this.root.destroyed) this.root.destroy({ children: true });
  }
}
