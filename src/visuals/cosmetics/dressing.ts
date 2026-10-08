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
 */
import { Container, Graphics, Mesh, MeshGeometry, Sprite, Texture } from 'pixi.js';
import type { BaseDressingView, BaseView } from '@/contracts/art';
import type { AgeId, Side, SideLook } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { baseSkinArt, drawDecoration, drawFlag, parseCosmeticKey, type FlagKind } from './art';
import type { BaseSkinArt } from './baseSkins';
import { DECO_GROUND, DECO_H, DECO_W, DECORATIONS, type DecorationArt } from './decorations';
import { FLAG_H, FLAG_W } from './flags';
import { INK } from './shapes';

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

/** A flag on a strip mesh that ripples from the hoist (x = 0) to the fly. */
class FlagCloth {
  readonly root = new Container();
  private readonly mesh: Mesh | null = null;
  private readonly geom: MeshGeometry | null = null;
  private readonly base: Float32Array | null = null;
  private readonly cols = 14;
  constructor(
    tex: Texture,
    private readonly w: number,
    private readonly h: number,
    private readonly phase: number,
  ) {
    if (tex === Texture.EMPTY) return;
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
      const s = Math.sin(t * 5.2 - u * 5.4 + this.phase);
      const s2 = Math.sin(t * 3.1 - u * 3.2 + this.phase * 1.7);
      const lift = amp * u * (s * 2.2 + s2 * 1.1);
      const pull = amp * u * u * (1.6 + s2 * 0.8);
      for (let r = 0; r < 2; r += 1) {
        const k = (i * 2 + r) * 2;
        p[k] = this.base[k]! - pull;
        // the lower edge droops a little more than the top edge
        p[k + 1] = this.base[k + 1]! + lift + (r === 1 ? amp * u * 0.9 : 0);
      }
    }
    this.geom.getBuffer('aPosition').update();
  }

  get size(): { w: number; h: number } {
    return { w: this.w, h: this.h };
  }
}

interface Prop {
  root: Container;
  art: DecorationArt;
  glow: Graphics | null;
  phase: number;
  x: number;
}

interface Mote {
  g: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export interface DressingOptions {
  age: AgeId;
  side: Side;
  look: SideLook;
  team: number;
  base?: BaseView;
  seed?: number;
  canvas?: CanvasFactory;
}

export class BaseDressing implements BaseDressingView {
  readonly root = new Container();
  private readonly facing: 1 | -1;
  private readonly pole = new Container();
  private readonly flags: FlagCloth[] = [];
  private readonly props: Prop[] = [];
  private readonly motes = new Container();
  private moteList: Mote[] = [];
  private readonly rng: CosmeticRng;
  private age: AgeId;
  private skin: BaseSkinArt | null = null;
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

  private flagTexture(kind: FlagKind, id: string): Texture {
    const w = (FLAG_W + 4) * TEX_PX;
    const h = (FLAG_H + 4) * TEX_PX;
    return bake(`${kind}.${id}|${this.o.team}`, w, h, (ctx) => drawFlag(ctx, kind, id, { team: this.o.team }, TEX_PX), this.make);
  }

  private buildPole(): void {
    const look = this.o.look;
    const flags: { kind: FlagKind; id: string; lu: number }[] = [];
    for (const [kind, key, lu] of [
      ['baseFlag', look.baseFlag, BASE_FLAG_LU],
      ['nationalFlag', look.nationalFlag, NATION_FLAG_LU],
    ] as const) {
      const k = key ? parseCosmeticKey(key) : null;
      if (k && k.collection === kind) flags.push({ kind, id: k.id, lu });
    }
    if (flags.length === 0) return;
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
      const tex = this.flagTexture(f.kind, f.id);
      const w = (FLAG_W + 4) * f.lu;
      const h = (FLAG_H + 4) * f.lu;
      const cloth = new FlagCloth(tex, w, h, i * 1.3 + this.o.side * 0.7);
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
      const tex = bake(`decoration.${k.id}|${this.o.team}`, DECO_W * TEX_PX, DECO_H * TEX_PX, (ctx) => drawDecoration(ctx, k.id, { team: this.o.team }, TEX_PX), this.make);
      const root = new Container();
      const x = ax * this.facing;
      root.position.set(x, 0);
      let glow: Graphics | null = null;
      if (art.glow) {
        glow = new Graphics();
        for (const [r, a] of [
          [1, 0.18],
          [0.62, 0.22],
          [0.32, 0.3],
        ] as const) {
          glow.circle(0, 0, art.glow.r * DECO_LU * r).fill({ color: art.glow.color, alpha: a });
        }
        glow.blendMode = 'add';
        glow.position.set((art.glow.x - DECO_W / 2) * DECO_LU, (art.glow.y - DECO_GROUND) * DECO_LU);
      }
      const sprite = new Sprite(tex);
      sprite.scale.set(DECO_LU / TEX_PX);
      sprite.position.set((-DECO_W / 2) * DECO_LU, -DECO_GROUND * DECO_LU);
      root.addChild(sprite);
      if (glow) root.addChild(glow);
      this.root.addChild(root);
      this.props.push({ root, art, glow, phase: this.rng.next() * 6.28, x });
    });
  }

  private applySkin(age: AgeId): void {
    const key = this.o.look.baseSkins?.[age];
    this.skin = baseSkinArt(key);
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
   * flags flutter down while the decorations topple.
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
    for (const p of this.props) {
      if (p.art.sway && !this.reduce) p.root.skew.x = Math.sin(t * 1.7 + p.phase) * 0.045;
      if (p.glow) p.glow.alpha = this.reduce ? 0.85 : 0.75 + 0.18 * Math.sin(t * 9 + p.phase) + 0.08 * Math.sin(t * 23 + p.phase * 2);
    }
    this.updateMotes(dt);
    if (this.collapseT >= 0) this.updateCollapse(dt);
  }

  private updateMotes(dt: number): void {
    const s = this.skin;
    const want = !s || this.reduce ? 0 : this.lite ? 7 : 14;
    while (this.moteList.length < want && s) this.moteList.push(this.spawnMote(s, true));
    const keep: Mote[] = [];
    for (const m of this.moteList) {
      m.life += dt;
      m.x += (m.vx * dt) / 1000;
      m.y += (m.vy * dt) / 1000;
      if (s && s.particles === 'petals') m.x += Math.sin((m.life / 1000) * 3 + m.max) * 0.3;
      const k = m.life / m.max;
      const fade = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      m.g.position.set(m.x * this.facing, -m.y);
      m.g.alpha = Math.max(0, fade) * (s?.particles === 'fireflies' || s?.particles === 'glints' || s?.particles === 'stars' ? 0.55 + 0.45 * Math.sin(m.life / 140) : 0.9);
      if (m.life >= m.max || want === 0) m.g.destroy();
      else keep.push(m);
    }
    this.moteList = keep;
  }

  private spawnMote(s: BaseSkinArt, anywhere: boolean): Mote {
    const r = () => this.rng.next();
    const g = new Graphics();
    const size = s.particles === 'dust' ? 1.6 : s.particles === 'stars' || s.particles === 'glints' ? 2 : 1.8;
    if (s.particles === 'glints' || s.particles === 'stars') {
      g.poly([0, -size * 2, size * 0.5, -size * 0.5, size * 2, 0, size * 0.5, size * 0.5, 0, size * 2, -size * 0.5, size * 0.5, -size * 2, 0, -size * 0.5, -size * 0.5]).fill(s.particleColor);
    } else if (s.particles === 'petals') {
      g.ellipse(0, 0, size * 1.4, size * 0.8).fill(s.particleColor);
    } else {
      g.circle(0, 0, size).fill(s.particleColor);
    }
    if (s.particles === 'fireflies' || s.particles === 'embers' || s.particles === 'glints' || s.particles === 'stars') g.blendMode = 'add';
    this.motes.addChild(g);
    const x = -190 + r() * 200;
    const falling = s.particles === 'snow' || s.particles === 'petals';
    const rising = s.particles === 'embers' || s.particles === 'stars';
    const y = anywhere ? 10 + r() * 200 : falling ? 220 : 6;
    const vy = falling ? -(14 + r() * 12) : rising ? 12 + r() * 14 : (r() - 0.5) * 8;
    const vx = s.particles === 'dust' ? 10 + r() * 10 : (r() - 0.5) * 10;
    return { g, x, y, vx, vy, life: 0, max: 2600 + r() * 2600 };
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
    // the break: the pole snaps over (accelerating), drops and fades; the decorations topple
    const k = Math.min(1, t / 900);
    const snap = Math.min(1, t / 420);
    this.pole.x = x0 + (this.reduce ? 0 : 18 * k * k * this.facing);
    this.pole.y = this.reduce ? 0 : 26 * k * k;
    this.pole.rotation = (this.reduce ? 0.35 * snap : 1.45 * snap * snap) * this.facing;
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
