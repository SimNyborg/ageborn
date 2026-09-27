/**
 * Effects toolkit for the capsule stage: pooled particles, the trauma shake (A12), a screen flash,
 * lightning bolts and text labels. View-only; the cosmetic RNG keeps every opening reproducible
 * on the bench.
 */
import { Container, Graphics, Sprite, Text, type TextStyleOptions, type Texture } from 'pixi.js';
import { mulberry32, type CosmeticRng } from '@/core';
import { clamp01 } from './ease';

export interface ParticleSpec {
  tex: Texture;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Lifetime in ms. */
  life: number;
  gravity?: number;
  /** Velocity kept per second (0.2 = strong drag, 1 = none). */
  drag?: number;
  scale?: [number, number];
  alpha?: [number, number];
  rot?: number;
  vr?: number;
  tint?: number;
  add?: boolean;
  /** Rotate the sprite along its velocity (streaks). */
  align?: boolean;
  /** Squash the sprite's height (confetti flutter). */
  flutter?: boolean;
  delay?: number;
}

interface Live extends Required<Omit<ParticleSpec, 'tex' | 'tint' | 'add' | 'align' | 'flutter' | 'delay'>> {
  s: Sprite;
  age: number;
  delay: number;
  align: boolean;
  flutter: boolean;
  phase: number;
}

/** Pooled sprite particles. `cap` bounds the live count (A12: pooled with caps). */
export class Particles {
  readonly root = new Container();
  private readonly live: Live[] = [];
  private readonly pool: Sprite[] = [];

  constructor(private readonly cap = 700) {}

  get count(): number {
    return this.live.length;
  }

  spawn(p: ParticleSpec): void {
    if (this.live.length >= this.cap) return;
    const s = this.pool.pop() ?? new Sprite();
    s.texture = p.tex;
    s.anchor.set(0.5);
    s.tint = p.tint ?? 0xffffff;
    s.blendMode = p.add ? 'add' : 'normal';
    s.visible = !(p.delay && p.delay > 0);
    s.position.set(p.x, p.y);
    this.root.addChild(s);
    this.live.push({
      s,
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      life: p.life,
      gravity: p.gravity ?? 0,
      drag: p.drag ?? 1,
      scale: p.scale ?? [1, 1],
      alpha: p.alpha ?? [1, 0],
      rot: p.rot ?? 0,
      vr: p.vr ?? 0,
      age: 0,
      delay: p.delay ?? 0,
      align: p.align ?? false,
      flutter: p.flutter ?? false,
      phase: (p.x * 13.7 + p.y * 7.1) % 6.28,
    });
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      if (!p) continue;
      if (p.delay > 0) {
        p.delay -= dtMs;
        if (p.delay > 0) continue;
        p.s.visible = true;
      }
      p.age += dtMs;
      if (p.age >= p.life) {
        this.root.removeChild(p.s);
        this.pool.push(p.s);
        this.live.splice(i, 1);
        continue;
      }
      const k = Math.pow(p.drag, dt);
      p.vx *= k;
      p.vy = p.vy * k + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const u = p.age / p.life;
      const sc = p.scale[0] + (p.scale[1] - p.scale[0]) * u;
      p.s.position.set(p.x, p.y);
      p.s.alpha = p.alpha[0] + (p.alpha[1] - p.alpha[0]) * u;
      if (p.align) {
        p.s.rotation = Math.atan2(p.vy, p.vx);
        const speed = Math.min(2.2, Math.hypot(p.vx, p.vy) / 500);
        p.s.scale.set(sc * (0.6 + speed), sc);
      } else {
        p.s.rotation = p.rot;
        p.s.scale.set(sc, p.flutter ? sc * Math.abs(Math.cos(p.age / 90 + p.phase)) : sc);
      }
    }
  }

  clear(): void {
    for (const p of this.live) {
      this.root.removeChild(p.s);
      this.pool.push(p.s);
    }
    this.live.length = 0;
  }

  destroy(): void {
    this.clear();
    for (const s of this.pool) s.destroy();
    this.pool.length = 0;
    this.root.destroy({ children: true });
  }
}

/**
 * Trauma shake (A12): shake = trauma², trauma decays linearly at 1.2/s, noise around 18 Hz with
 * separate phases for x, y and rotation. Max 12 px and 2.5°.
 */
export class Trauma {
  trauma = 0;
  private t = 0;
  private readonly ph: number[];
  constructor(
    seed: number,
    private readonly scale = 1,
  ) {
    const r = mulberry32(seed);
    this.ph = Array.from({ length: 6 }, () => r.next() * Math.PI * 2);
  }
  add(v: number): void {
    this.trauma = clamp01(this.trauma + v);
  }
  update(dtMs: number): { x: number; y: number; rot: number } {
    this.t += dtMs / 1000;
    this.trauma = Math.max(0, this.trauma - 1.2 * (dtMs / 1000));
    const s = this.trauma * this.trauma * this.scale;
    if (s <= 0) return { x: 0, y: 0, rot: 0 };
    const w = this.t * Math.PI * 2;
    const n = (a: number, b: number) =>
      Math.sin(w * 18 + (this.ph[a] ?? 0)) * 0.65 + Math.sin(w * 11.3 + (this.ph[b] ?? 0)) * 0.35;
    return { x: n(0, 1) * 12 * s, y: n(2, 3) * 12 * s, rot: n(4, 5) * ((2.5 * Math.PI) / 180) * s };
  }
}

/** Jagged lightning between two points, redrawn each call. */
export function drawBolt(g: Graphics, rng: CosmeticRng, x0: number, y0: number, x1: number, y1: number, color: number, width = 4, jag = 18): void {
  const pts: [number, number][] = [[x0, y0]];
  const n = 7;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const len = Math.hypot(nx, ny) || 1;
    const off = (rng.next() * 2 - 1) * jag;
    pts.push([x0 + (x1 - x0) * u + (nx / len) * off, y0 + (y1 - y0) * u + (ny / len) * off]);
  }
  pts.push([x1, y1]);
  const path = (w: number, c: number, a: number) => {
    g.moveTo(pts[0]?.[0] ?? x0, pts[0]?.[1] ?? y0);
    for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
    g.stroke({ width: w, color: c, alpha: a, join: 'round', cap: 'round' });
  };
  path(width * 3, color, 0.25);
  path(width, color, 0.9);
  path(Math.max(1, width * 0.35), 0xffffff, 1);
}

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/** A bold outlined label, crisp at the stage's design scale. */
export function label(text: string, size: number, color: number, o: Partial<TextStyleOptions> & { outline?: number; outlineColor?: number } = {}): Text {
  const { outline = Math.max(2, Math.round(size / 9)), outlineColor = 0x1b1a2e, ...rest } = o;
  const t = new Text({
    text,
    resolution: 2,
    style: {
      fontFamily: FONT,
      fontSize: size,
      fontWeight: '900',
      fill: color,
      stroke: { color: outlineColor, width: outline, join: 'round' },
      dropShadow: { color: 0x000000, alpha: 0.45, blur: 2, distance: Math.max(1, size / 14), angle: Math.PI / 2 },
      align: 'center',
      ...rest,
    },
  });
  t.anchor.set(0.5);
  return t;
}

/** A glow sprite helper: centred, additive, tinted. */
export function glowSprite(tex: Texture, tint: number, size: number, alpha = 1): Sprite {
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  s.tint = tint;
  s.blendMode = 'add';
  s.alpha = alpha;
  s.width = size;
  s.height = size;
  return s;
}
