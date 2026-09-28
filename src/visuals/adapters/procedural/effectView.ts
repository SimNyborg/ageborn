/**
 * Procedural effects and projectiles (DESIGN A12 VFX list, A14.1). Plays an `FxRecipe` or a
 * `ProjectileRecipe` with baked sprites: keyframed sprites, particle bursts and streams, falling
 * objects with impact sub-effects, beams and lightning chains.
 *
 * Space: `playAt(at)` places the root at `at` and draws around it; `fly(from, to)` places the root at
 * `from` and moves the projectile to `to` (both in the parent's space). Effects are restartable, so a
 * pool in the battle view can reuse them.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import type { EffectView } from '@/contracts/art';
import type { Pt } from '@/contracts/ids';
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { ease, sampleScalar } from '../../animator';
import type { PartBaker } from '../../bake';
import { FX_ZONES } from '../../effects/sprites';
import { FX_RECIPE_BY_ID, type FxRecipe, type ParticleSpec, type ProjectileRecipe, type Range, type SizeKey, type SpriteKey, type SpriteSpec } from '../../effects/recipes';
import { getPart } from '../../parts/registry';

/** A sprite whose anchor is the part's origin (so position = the part's pivot). */
export function fxSprite(baker: PartBaker, partId: string): Sprite {
  const p = getPart(partId);
  if (!p) return new Sprite(Texture.EMPTY);
  const b = baker.get(p, FX_ZONES);
  baker.flush();
  const s = new Sprite(b.main);
  const w = b.main.width || 1;
  const h = b.main.height || 1;
  s.anchor.set(-b.origin.x / w, -b.origin.y / h);
  return s;
}

const SIZE_BASE: Record<SizeKey, number> = { radius: 10, zone: 100, width: 100, height: 100, length: 10, scale: 1 };

/** `small: 1` draws a whole effect at this size (A12: the enemy's evolve pillar is smaller). */
export const SMALL_EFFECT_SCALE = 0.6;

interface LiveSprite {
  spec: SpriteSpec;
  s: Sprite;
  delay: number;
  life: number;
  k: number;
  /** Per-play jitter (SpriteSpec.jitter): offset, scale and rotation (radians). */
  jx: number;
  jy: number;
  js: number;
  jr: number;
}

interface Particle {
  s: Sprite;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  life: number;
  age: number;
  spin: number;
  s0: number;
  s1: number;
  a0: number;
  a1: number;
  align: boolean;
  attract: number;
}

interface Emitter {
  spec: ParticleSpec;
  acc: number;
  burstAt: number;
  burstDone: boolean;
}

interface Falling {
  s: Sprite;
  fx: number;
  fy: number;
  tx: number;
  landed: boolean;
}

export interface EffectViewOptions {
  baker: PartBaker;
  teamColor: (side: number) => number;
  seed: number;
  recipe?: FxRecipe;
  projectile?: ProjectileRecipe;
  /** Options given at creation (merged with those passed to `playAt`). */
  o?: Record<string, number>;
  /** Creates sub-effects (impacts of falling objects). */
  sub?: (id: string, o: Record<string, number>) => ProceduralEffectView | null;
}

export class ProceduralEffectView implements EffectView {
  readonly root = new Container();
  private readonly rng: CosmeticRng;
  private readonly layer = new Container();
  private sprites: LiveSprite[] = [];
  private particles: Particle[] = [];
  private emitters: Emitter[] = [];
  private falling: Falling[] = [];
  private subs: ProceduralEffectView[] = [];
  private chainNodes: Sprite[] = [];
  private chainAcc = 0;
  private t = 0;
  private dur = 0;
  private started = false;
  private o: Record<string, number> = {};
  private dir: 1 | -1 = 1;
  // projectile flight
  private fly_: { from: Pt; to: Pt; ms: number; arc: boolean; h: number } | null = null;
  private proj: Sprite | null = null;
  private tail: Sprite | null = null;
  private puffAcc = 0;
  private destroyed = false;

  constructor(private readonly opt: EffectViewOptions) {
    this.rng = mulberry32(opt.seed);
    this.root.label = opt.recipe?.id ?? opt.projectile?.id ?? 'fx';
    this.root.addChild(this.layer);
    this.o = { ...(opt.o ?? {}) };
  }

  get done(): boolean {
    if (!this.started) return false;
    const living = this.particles.length > 0 || this.subs.some((s) => !s.done) || this.falling.some((f) => !f.landed);
    if (this.fly_) return this.t >= this.fly_.ms + 120 && !living;
    return this.t >= this.dur && !living;
  }

  fly(from: Pt, to: Pt, travelMs: number, arc: boolean): void {
    this.reset();
    this.layer.scale.set(1);
    this.started = true;
    this.root.position.set(from.x, from.y);
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    this.fly_ = { from: { x: 0, y: 0 }, to: { x: to.x - from.x, y: to.y - from.y }, ms: Math.max(1, travelMs), arc, h: Math.min(170, Math.max(28, dist * 0.32)) };
    this.dir = to.x >= from.x ? 1 : -1;
    const p = this.opt.projectile;
    const sprite = p?.sprite ?? this.opt.recipe?.sprites?.[0]?.sprite ?? 'fx.p.glow';
    if (p?.tail) {
      this.tail = fxSprite(this.opt.baker, 'fx.p.beam');
      this.tail.anchor.set(0, 0.5);
      this.tail.tint = this.opt.teamColor(this.o['side'] ?? 0);
      this.tail.alpha = p.tail.alpha;
      this.layer.addChild(this.tail);
    }
    this.proj = fxSprite(this.opt.baker, sprite);
    this.proj.scale.set((p?.scale ?? 1) * PROJECTILE_SCALE);
    this.layer.addChild(this.proj);
    this.stepFly(0);
  }

  playAt(at: Pt, o?: Record<string, number>): void {
    this.reset();
    this.started = true;
    this.o = { ...(this.opt.o ?? {}), ...(o ?? {}) };
    this.dir = (this.o['dir'] ?? 1) < 0 ? -1 : 1;
    this.root.position.set(at.x, at.y);
    const r = this.opt.recipe;
    // `scale` sizes a whole world effect, `small: 1` shrinks it to SMALL_EFFECT_SCALE (screen overlays keep their fit)
    const whole = r?.screen ? 1 : (this.o['scale'] ?? 1) * ((this.o['small'] ?? 0) > 0 ? SMALL_EFFECT_SCALE : 1);
    this.layer.scale.set(whole);
    if (!r) {
      this.dur = 0;
      return;
    }
    if (r.maxInstances !== undefined && (this.o['i'] ?? 0) >= r.maxInstances) {
      // past the recipe's instance cap: this copy of a multi-count emit draws nothing and finishes
      this.dur = 0;
      return;
    }
    this.dur = r.loops && this.o['durationMs'] !== undefined ? this.o['durationMs'] : r.durationMs;
    for (const spec of r.sprites ?? []) this.addSprite(spec);
    for (const spec of r.particles ?? []) this.emitters.push({ spec, acc: 0, burstAt: spec.delay ? this.range(spec.delay) : 0, burstDone: !spec.count });
    if (r.fall) {
      const f = r.fall;
      for (let i = 0; i < f.count; i++) {
        const s = fxSprite(this.opt.baker, f.sprite);
        const tx = (this.rng.next() - 0.5) * 2 * f.spreadX;
        this.layer.addChild(s);
        this.falling.push({ s, fx: f.fromX * this.dir + tx, fy: f.fromY, tx, landed: false });
      }
    }
    this.update(0);
  }

  private reset(): void {
    for (const s of this.sprites) s.s.destroy();
    for (const p of this.particles) p.s.destroy();
    for (const f of this.falling) f.s.destroy();
    for (const c of this.chainNodes) c.destroy();
    for (const s of this.subs) s.destroy();
    this.proj?.destroy();
    this.tail?.destroy();
    this.sprites = [];
    this.particles = [];
    this.emitters = [];
    this.falling = [];
    this.subs = [];
    this.chainNodes = [];
    this.proj = null;
    this.tail = null;
    this.fly_ = null;
    this.t = 0;
    this.puffAcc = 0;
  }

  private size(key: SizeKey | undefined): number {
    if (!key) return 1;
    const v = this.o[key];
    return v === undefined ? 1 : v / SIZE_BASE[key];
  }

  private range(r: Range): number {
    return r[0] + (r[1] - r[0]) * this.rng.next();
  }

  private tint(t: number | 'team' | undefined): number {
    if (t === undefined) return 0xffffff;
    if (t === 'team') return this.opt.teamColor(this.o['side'] ?? 0);
    return t;
  }

  private addSprite(spec: SpriteSpec): void {
    const s = fxSprite(this.opt.baker, spec.sprite);
    s.tint = this.tint(spec.tint);
    if (spec.blendAdd) s.blendMode = 'add';
    s.visible = false;
    this.layer.addChild(s);
    const j = spec.jitter;
    this.sprites.push({
      spec,
      s,
      delay: spec.delay ?? 0,
      life: spec.life > 0 ? spec.life : this.dur,
      k: this.size(spec.sizeWith),
      jx: j?.x ? (this.rng.next() * 2 - 1) * j.x : 0,
      jy: j?.y ? (this.rng.next() * 2 - 1) * j.y : 0,
      js: j?.s ? this.range(j.s) : 1,
      jr: j?.r ? (((this.rng.next() * 2 - 1) * j.r) * Math.PI) / 180 : 0,
    });
  }

  update(dtMs: number): void {
    if (this.destroyed || !this.started) return;
    this.t += dtMs;
    if (this.fly_) this.stepFly(dtMs);
    for (const ls of this.sprites) this.stepSprite(ls);
    this.stepEmitters(dtMs);
    this.stepParticles(dtMs);
    this.stepFalling();
    this.stepChain(dtMs);
    for (const s of this.subs) s.update(dtMs);
  }

  private stepSprite(ls: LiveSprite): void {
    const local = this.t - ls.delay;
    const spec = ls.spec;
    if (local < 0 || local > ls.life) {
      ls.s.visible = false;
      return;
    }
    ls.s.visible = true;
    const u = spec.loop ? (local % spec.loop) / spec.loop : ls.life > 0 ? local / ls.life : 1;
    const key = sampleKeys(spec.keys, u);
    let sx = key.sx * ls.k;
    let sy = key.sy * (spec.sizeWith === 'zone' ? 1 : ls.k);
    let x = key.x * (spec.sizeWith === 'zone' ? ls.k : 1);
    let y = key.y;
    let r = (key.r * Math.PI) / 180;
    if (spec.screenFit) {
      sx = (this.o['width'] ?? 100) / 100;
      sy = (this.o['height'] ?? 100) / 100;
    }
    if (spec.moveBy === 'distance') {
      const dist = this.o['distance'] ?? 500;
      x += dist * (local / ls.life);
    } else if (spec.moveBy === 'zone') {
      x = key.x * ((this.o['zone'] ?? 100) / 100);
    }
    if (spec.toTarget) {
      const tx = (this.o['toX'] ?? this.root.x + 100) - this.root.x;
      const ty = (this.o['toY'] ?? this.root.y) - this.root.y;
      const len = Math.hypot(tx, ty);
      r = Math.atan2(ty, tx);
      sx = (len / 10) * key.sx;
      x = 0;
      y = 0;
      ls.s.anchor.set(0, 0.5);
      ls.s.scale.set(sx, key.sy);
      ls.s.rotation = r;
      ls.s.position.set(x, y);
      ls.s.alpha = key.a;
      return;
    }
    ls.s.position.set((x + ls.jx) * this.dir, y + ls.jy);
    ls.s.scale.set(sx * ls.js * this.dir, sy * ls.js);
    ls.s.rotation = (r + ls.jr) * this.dir;
    ls.s.alpha = key.a;
  }

  private stepEmitters(dtMs: number): void {
    const running = this.t <= this.dur;
    for (const e of this.emitters) {
      const spec = e.spec;
      if (!e.burstDone && this.t >= e.burstAt) {
        for (let i = 0; i < (spec.count ?? 0); i++) this.spawn(spec);
        e.burstDone = true;
      }
      if (spec.rate && running) {
        e.acc += (spec.rate * dtMs) / 1000;
        while (e.acc >= 1) {
          e.acc -= 1;
          this.spawn(spec);
        }
      }
    }
  }

  private spawn(spec: ParticleSpec): void {
    const s = fxSprite(this.opt.baker, spec.sprite);
    s.tint = this.tint(spec.tint);
    if (spec.blendAdd) s.blendMode = 'add';
    const k = this.size(spec.sizeWith);
    let x = 0;
    let y = 0;
    if (spec.box) {
      const kx = spec.sizeWith ? k : 1;
      const ky = spec.sizeWith === 'radius' ? k : 1;
      x = (this.rng.next() * 2 - 1) * spec.box[0] * kx;
      y = (this.rng.next() * 2 - 1) * spec.box[1] * ky;
    }
    if (this.opt.recipe?.screen) x += (this.o['width'] ?? 100) / 2;
    if (spec.spread) {
      const a = this.rng.next() * Math.PI * 2;
      const d = this.rng.next() * spec.spread;
      x += Math.cos(a) * d;
      y += Math.sin(a) * d;
    }
    if (spec.followMove) {
      const mover = this.sprites.find((ls) => ls.spec.moveBy);
      if (mover) {
        x += mover.s.x;
        y += mover.s.y;
      }
    }
    const angle = ((spec.angle ? this.range(spec.angle) : -90) * Math.PI) / 180;
    const speed = spec.speed ? this.range(spec.speed) : 0;
    const vx = Math.cos(angle) * speed * this.dir;
    const vy = Math.sin(angle) * speed;
    s.position.set(x * this.dir, y);
    const sc = spec.scale ?? [1, 1];
    const al = spec.alpha ?? [1, 0];
    s.scale.set(sc[0]);
    s.alpha = al[0];
    if (spec.align) s.rotation = Math.atan2(vy, vx);
    this.layer.addChild(s);
    this.particles.push({
      s,
      vx,
      vy,
      g: spec.gravity ?? 0,
      drag: spec.drag ?? 0,
      life: this.range(spec.life),
      age: 0,
      spin: spec.spin ? (this.range(spec.spin) * Math.PI) / 180 : 0,
      s0: sc[0],
      s1: sc[1],
      a0: al[0],
      a1: al[1],
      align: spec.align ?? false,
      attract: spec.attract ?? 0,
    });
  }

  private stepParticles(dtMs: number): void {
    const dt = dtMs / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) continue;
      p.age += dtMs;
      if (p.age >= p.life) {
        p.s.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      const u = p.age / p.life;
      if (p.drag) {
        const f = Math.max(0, 1 - p.drag * dt);
        p.vx *= f;
        p.vy *= f;
      }
      if (p.attract) {
        p.vx -= p.s.x * p.attract * dt;
        p.vy -= p.s.y * p.attract * dt;
      }
      p.vy += p.g * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      if (p.align) p.s.rotation = Math.atan2(p.vy, p.vx);
      else p.s.rotation += p.spin * dt;
      const sc = p.s0 + (p.s1 - p.s0) * u;
      p.s.scale.set(sc);
      p.s.alpha = p.a0 + (p.a1 - p.a0) * ease('in', u);
    }
  }

  private stepFalling(): void {
    const f = this.opt.recipe?.fall;
    if (!f) return;
    const fallMs = this.o['fallMs'] ?? f.fallMs;
    for (const obj of this.falling) {
      if (obj.landed) continue;
      const u = Math.min(1, this.t / fallMs);
      const e = u * u;
      const x = obj.fx + (obj.tx - obj.fx) * e;
      const y = obj.fy * (1 - e);
      obj.s.position.set(x, y);
      obj.s.rotation = Math.atan2(-obj.fy, obj.tx - obj.fx);
      if (u >= 1) {
        obj.landed = true;
        obj.s.visible = false;
        if (f.impact && this.opt.sub) {
          const sub = this.opt.sub(f.impact, this.o);
          if (sub) {
            this.layer.addChild(sub.root);
            sub.playAt({ x: obj.tx, y: 0 }, { ...this.o, dir: this.dir });
            // sub root is placed relative to this effect's root
            sub.root.position.set(obj.tx, 0);
            this.subs.push(sub);
          }
        }
      }
    }
  }

  private stepChain(dtMs: number): void {
    const c = this.opt.recipe?.chain;
    if (!c) return;
    this.chainAcc -= dtMs;
    const visible = this.t <= this.dur;
    if (!visible) {
      for (const n of this.chainNodes) n.visible = false;
      return;
    }
    if (this.chainAcc > 0 && this.chainNodes.length) return;
    this.chainAcc = c.refreshMs;
    const tx = (this.o['toX'] ?? this.root.x + 100) - this.root.x;
    const ty = (this.o['toY'] ?? this.root.y) - this.root.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const pts: Pt[] = [{ x: 0, y: 0 }];
    for (let i = 1; i < c.segments; i++) {
      const u = i / c.segments;
      const j = (this.rng.next() * 2 - 1) * c.jitter;
      pts.push({ x: tx * u + nx * j, y: ty * u + ny * j });
    }
    pts.push({ x: tx, y: ty });
    while (this.chainNodes.length < pts.length - 1) {
      const s = fxSprite(this.opt.baker, 'fx.p.beam');
      s.anchor.set(0, 0.5);
      s.tint = c.tint;
      this.layer.addChild(s);
      this.chainNodes.push(s);
    }
    const fade = 1 - this.t / Math.max(1, this.dur);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const n = this.chainNodes[i];
      if (!a || !b || !n) continue;
      n.visible = true;
      n.position.set(a.x, a.y);
      n.rotation = Math.atan2(b.y - a.y, b.x - a.x);
      n.scale.set(Math.hypot(b.x - a.x, b.y - a.y) / 10, c.width / 4);
      n.alpha = 0.6 + 0.4 * fade;
    }
  }

  private stepFly(dtMs: number): void {
    const f = this.fly_;
    const s = this.proj;
    if (!f || !s) return;
    const p = this.opt.projectile;
    const u = Math.min(1, this.t / f.ms);
    const x = f.to.x * u;
    let y = f.to.y * u;
    let dy = f.to.y;
    if (f.arc && !p?.rolls) {
      y -= 4 * f.h * u * (1 - u);
      dy -= 4 * f.h * (1 - 2 * u);
    }
    if (p?.wobble) y += Math.sin(this.t / 22) * p.wobble;
    s.position.set(x, y);
    const heading = Math.atan2(dy, f.to.x || 1e-6);
    if (p?.spin) s.rotation += ((p.spin * Math.PI) / 180) * (dtMs / 1000) * this.dir;
    else s.rotation = heading;
    if (p?.rolls) s.scale.x = Math.abs(s.scale.x);
    s.visible = u < 1;
    if (this.tail && p?.tail) {
      this.tail.position.set(x, y);
      this.tail.rotation = heading + Math.PI;
      const grow = Math.min(1, this.t / 80);
      this.tail.scale.set(((p.tail.length * PROJECTILE_SCALE) / 10) * grow, (p.tail.width * PROJECTILE_SCALE) / 4);
      const after = this.t - f.ms;
      this.tail.alpha = after > 0 ? Math.max(0, p.tail.alpha * (1 - after / 120)) : p.tail.alpha;
    }
    if (p?.puff && u < 1) {
      this.puffAcc += dtMs;
      while (this.puffAcc >= p.puff.every) {
        this.puffAcc -= p.puff.every;
        const spec: ParticleSpec = { sprite: p.puff.sprite, count: 1, life: [260, 420], speed: [0, 12], gravity: -20, scale: [0.35, 0.8], alpha: [0.6, 0], tint: p.puff.tint };
        this.spawn(spec);
        const last = this.particles[this.particles.length - 1];
        if (last) last.s.position.set(x, y);
      }
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.reset();
    this.destroyed = true;
    this.root.destroy({ children: true });
  }
}

function sampleKeys(keys: readonly SpriteKey[], u: number): Required<Omit<SpriteKey, 't'>> {
  const pick = (p: keyof Omit<SpriteKey, 't'>, def: number): number => {
    const ks = keys.filter((k) => k[p] !== undefined).map((k) => ({ t: k.t, v: k[p] as number }));
    return ks.length ? sampleScalar(ks, u) : def;
  };
  return { sx: pick('sx', 1), sy: pick('sy', pick('sx', 1)), a: pick('a', 1), r: pick('r', 0), x: pick('x', 0), y: pick('y', 0) };
}

/**
 * Projectiles and their tails are drawn this much larger than authored, so shots read next to the
 * 3D-rendered units (art director review fix 11). Visual only: flight time and hits are the sim's.
 */
export const PROJECTILE_SCALE = 1.5;

export function recipeFor(id: string): FxRecipe | undefined {
  return FX_RECIPE_BY_ID.get(id);
}
