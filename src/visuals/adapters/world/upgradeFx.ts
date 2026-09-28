/**
 * Helpers for the base and turret upgrade moments (DESIGN A11 evolve sequence, A12 juice):
 * easing curves, a small view-owned particle list with gravity, drag, fade and "absorb" lines,
 * and texture slicing, so a base's frame can break into shards and a new frame can assemble
 * from bands. All of it is cosmetic: the simulation owns every timing.
 */
import { Container, Rectangle, Sprite, Texture } from 'pixi.js';

/** Motion options the render layer hands to a world view (duck-typed `setMotion`). */
export interface ViewMotion {
  /** Reduce motion: no shake, no flying shards, no squash bounces; fades instead. */
  reduce: boolean;
  /** Lite preset: fewer shards, bands and particles. */
  lite: boolean;
}

export const DEFAULT_MOTION: ViewMotion = { reduce: false, lite: false };

// ---------------------------------------------------------------------------------------------
// Easing

export const clamp01 = (u: number): number => (u < 0 ? 0 : u > 1 ? 1 : u);
export const easeOutCubic = (u: number): number => 1 - Math.pow(1 - clamp01(u), 3);
export const easeInQuad = (u: number): number => clamp01(u) * clamp01(u);
export const easeInOutSine = (u: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(u));
/** Overshoots past 1 and comes back (s = 1.7 is the classic back ease). */
export function easeOutBack(u: number, s = 1.7): number {
  const x = clamp01(u) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
}
/** A damped spring from 0 to 1: overshoot, a smaller undershoot, settle. */
export function springSettle(u: number, bounces = 2.2, damping = 5): number {
  const x = clamp01(u);
  if (x >= 1) return 1;
  return 1 - Math.exp(-damping * x) * Math.cos(bounces * Math.PI * x);
}
/** A bump 0 → 1 → 0 over [a, b] (sine). */
export function bump(u: number, a: number, b: number): number {
  if (u <= a || u >= b) return 0;
  return Math.sin(((u - a) / (b - a)) * Math.PI);
}

// ---------------------------------------------------------------------------------------------
// Particles

export interface Bit {
  s: Container;
  vx: number;
  vy: number;
  /** Gravity (lu/s²). */
  g: number;
  /** Linear drag per second (0 = none). */
  drag: number;
  spin: number;
  age: number;
  life: number;
  /** Waits this long before it moves and shows. */
  delay: number;
  s0: number;
  s1: number;
  a0: number;
  /** Fraction of life spent fading in. */
  fadeIn: number;
  /** Rotate to the velocity (sparks). */
  align: boolean;
  /** Dies when it falls through this y (coins landing in the Treasury). */
  killY: number | null;
  /** Called once when it dies at `killY`. */
  onKill: ((x: number, y: number) => void) | null;
  /** Bounces on y = 0 (debris). */
  ground: boolean;
  bounces: number;
  /** Scale curve: linear s0 → s1, or a pulse s0 → s1 → s0 (glints). */
  pulse: boolean;
  /** Coin flip: scale.x follows cos(age × flip) (rad per ms; 0 = off). */
  flip: number;
}

export type BitInit = Partial<Omit<Bit, 's' | 'age' | 'bounces'>>;

/** A tiny particle list for view-owned upgrade effects; capped, oldest dropped first. */
export class Bits {
  readonly items: Bit[] = [];

  constructor(
    readonly layer: Container,
    readonly cap = 90,
  ) {}

  add(s: Container, o: BitInit): Bit {
    while (this.items.length >= this.cap) this.items.shift()?.s.destroy({ children: true });
    this.layer.addChild(s);
    const b: Bit = {
      s,
      vx: o.vx ?? 0,
      vy: o.vy ?? 0,
      g: o.g ?? 0,
      drag: o.drag ?? 0,
      spin: o.spin ?? 0,
      age: 0,
      life: o.life ?? 500,
      delay: o.delay ?? 0,
      s0: o.s0 ?? 1,
      s1: o.s1 ?? o.s0 ?? 1,
      a0: o.a0 ?? 1,
      fadeIn: o.fadeIn ?? 0,
      align: o.align ?? false,
      killY: o.killY ?? null,
      onKill: o.onKill ?? null,
      ground: o.ground ?? false,
      bounces: 0,
      pulse: o.pulse ?? false,
      flip: o.flip ?? 0,
    };
    s.visible = b.delay <= 0;
    s.scale.set(b.s0);
    s.alpha = b.fadeIn > 0 ? 0 : b.a0;
    this.items.push(b);
    return b;
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      if (!p) continue;
      if (p.delay > 0) {
        p.delay -= dtMs;
        if (p.delay > 0) continue;
        p.s.visible = true;
      }
      p.age += dtMs;
      const t = Math.min(1, p.age / p.life);
      p.vy += p.g * dt;
      if (p.drag > 0) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      if (p.align) p.s.rotation = Math.atan2(p.vy, p.vx);
      else p.s.rotation += p.spin * dt;
      if (p.ground && p.s.y > 0 && p.vy > 0) {
        p.s.y = 0;
        if (p.bounces < 2) {
          p.vy *= -0.35;
          p.vx *= 0.6;
          p.spin *= 0.5;
          p.bounces++;
        } else {
          p.vy = 0;
          p.vx *= 0.8;
          p.spin = 0;
        }
      }
      p.s.scale.set(p.s0 + (p.s1 - p.s0) * (p.pulse ? Math.sin(Math.PI * t) : t));
      if (p.flip !== 0) p.s.scale.x *= 0.25 + 0.75 * Math.abs(Math.cos(p.age * p.flip));
      const fin = p.fadeIn > 0 ? Math.min(1, t / p.fadeIn) : 1;
      p.s.alpha = p.a0 * fin * (p.pulse ? 1 : 1 - t * t);
      const killed = p.killY !== null && p.vy > 0 && p.s.y >= p.killY;
      if (killed || p.age >= p.life) {
        if (killed) p.onKill?.(p.s.x, p.s.y);
        p.s.destroy({ children: true });
        this.items.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const p of this.items) p.s.destroy({ children: true });
    this.items.length = 0;
  }
}

// ---------------------------------------------------------------------------------------------
// Texture slicing

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A frame's opaque rect in its sprite's local space (texture units) when drawn at its default anchor. */
export function texRect(t: Texture | undefined): Rect | null {
  if (!t || t === Texture.EMPTY || t.frame.width <= 1 || t.frame.height <= 1) return null;
  const a = t.defaultAnchor ?? { x: 0, y: 0 };
  const ow = t.orig.width;
  const oh = t.orig.height;
  return { x: (t.trim?.x ?? 0) - a.x * ow, y: (t.trim?.y ?? 0) - a.y * oh, w: t.frame.width, h: t.frame.height };
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** The part of `t` inside `r` (sprite-local texture units) as its own texture, with its top-left. */
export function subTexture(t: Texture | undefined, r: Rect): { tex: Texture; x: number; y: number } | null {
  const tr = texRect(t);
  if (!t || !tr) return null;
  const x0 = Math.max(tr.x, r.x);
  const y0 = Math.max(tr.y, r.y);
  const x1 = Math.min(tr.x + tr.w, r.x + r.w);
  const y1 = Math.min(tr.y + tr.h, r.y + r.h);
  if (x1 - x0 < 1 || y1 - y0 < 1) return null;
  const frame = new Rectangle(t.frame.x + (x0 - tr.x), t.frame.y + (y0 - tr.y), x1 - x0, y1 - y0);
  return { tex: new Texture({ source: t.source, frame }), x: x0, y: y0 };
}

/**
 * One piece of a sliced frame: a container in lu whose pivot is the piece's centre, holding the
 * tinted team underlay, the frame itself and an additive white copy for the landing flash.
 */
export interface Piece {
  c: Container;
  flash: Sprite | null;
  /** Rest position (lu) of the pivot. */
  x: number;
  y: number;
  /** Size in lu. */
  w: number;
  h: number;
  textures: Texture[];
}

/**
 * Cuts rect `r` (texture units) out of the team underlay and the frame. `k` is lu per texture
 * unit. Returns null when the frame has nothing inside `r`.
 */
export function makePiece(team: Texture | undefined, main: Texture | undefined, r: Rect, k: number, teamTint: number, withFlash: boolean): Piece | null {
  const m = subTexture(main, r);
  if (!m) return null;
  const tm = subTexture(team, r);
  const c = new Container();
  const inner = new Container();
  inner.scale.set(k);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const textures: Texture[] = [m.tex];
  if (tm) {
    const s = new Sprite(tm.tex);
    s.tint = teamTint;
    s.position.set(tm.x - cx, tm.y - cy);
    inner.addChild(s);
    textures.push(tm.tex);
  }
  const ms = new Sprite(m.tex);
  ms.position.set(m.x - cx, m.y - cy);
  inner.addChild(ms);
  let flash: Sprite | null = null;
  if (withFlash) {
    flash = new Sprite(m.tex);
    flash.position.set(m.x - cx, m.y - cy);
    flash.blendMode = 'add';
    flash.tint = 0xfff4e0;
    flash.alpha = 0;
    inner.addChild(flash);
  }
  c.addChild(inner);
  c.position.set(cx * k, cy * k);
  return { c, flash, x: cx * k, y: cy * k, w: r.w * k, h: r.h * k, textures };
}

export function destroyPiece(p: Piece): void {
  p.c.destroy({ children: true });
  // the sliced textures share the sheet's source: free only the Texture objects
  for (const t of p.textures) t.destroy(false);
}
