/**
 * The destroyed-base collapse as a small deterministic world (DESIGN A11, A12): the build-up, the
 * break, the toppling towers, the free pieces, the debris and every particle, advanced in fixed 4 ms
 * steps. Pure TypeScript (no Pixi): the view only mirrors its state into sprites and meshes.
 *
 * Determinism: everything random comes from streams seeded by the collapse seed (the battle view derives
 * it from the match seed, the losing side and the end tick), and time only moves in whole steps, so a
 * replay, a slower phone or a different frame rate shows exactly the same collapse.
 *
 * Coordinates: base-local lu, unmirrored (x toward the lane), y DOWN, the ground at y = 0.
 */
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { seedOf, type Fracture, type Rect, type Vec } from './fracture';
import type { CollapseProfile } from './profiles';

/** The fixed step (ms). 250 Hz: tumbling pieces never tunnel through the ground. */
export const STEP_MS = 4;
/** Gravity (lu/s²): snappier than real (about 370) so the fall reads in the short end sequence. */
export const GRAVITY = 1250;
/** The build-up before the base gives way (ms of game time). */
export const BREAK_MS = 520;
/** Reduce motion: a calmer, slightly longer build-up. */
export const BREAK_MS_REDUCED = 600;
/** Ground height map: x range and resolution (lu). */
const HF_X0 = -360;
const HF_X1 = 560;
const HF_STEP = 4;
/** Settled pieces pile at most this high (lu). */
const MAX_PILE = 56;
/** The invisible wall behind the base (the world's end is 180 lu behind the gate). */
const BACK_WALL = -176;

export type ParticleKind =
  | 'puff'
  | 'dust'
  | 'smoke'
  | 'smokeLobe'
  | 'fire'
  | 'flame'
  | 'ember'
  | 'spark'
  | 'sparkHot'
  | 'glow'
  | 'ring'
  | 'ringThin'
  | 'shard'
  | 'rock'
  | 'timber'
  | 'coin'
  | 'bolt'
  | 'kit'
  /** A torn team banner scrap (collapse kit) fluttering down. */
  | 'rag';

export interface Particle {
  id: number;
  kind: ParticleKind;
  /** Kit frame (kind 'kit') or rock variant. */
  frame: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  s0: number;
  s1: number;
  a0: number;
  /** Current values the view reads. */
  scale: number;
  alpha: number;
  life: number;
  age: number;
  delay: number;
  g: number;
  drag: number;
  bounce: number;
  bounces: number;
  settled: boolean;
  tint: number;
  add: boolean;
  /** 0..1 alpha flicker (embers, flames, energy). */
  flicker: number;
  /** Side-to-side flutter amplitude (lu) for embers and banner scraps. */
  sway: number;
  phase: number;
  fadeIn: number;
  align: boolean;
  /** Vertical squash of rings lying on the ground. */
  flatY: number;
  /** Draw in front of the chunks (dust, smoke) or behind. */
  front: boolean;
}

export interface Chunk {
  id: number;
  /** Local outline around the centre of mass (lu). */
  verts: Vec[];
  /** Rest centre (lu). */
  rx: number;
  ry: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  w: number;
  m: number;
  inertia: number;
  /** Topple group, -1 when free or once released. */
  group: number;
  released: boolean;
  releaseAngle: number;
  /** Starts moving at this world time (ms). */
  startMs: number;
  active: boolean;
  sleeping: boolean;
  rest: number;
  /** First ground impact time (ms), or -1. */
  landedMs: number;
  static: boolean;
  /** Reduce motion: the calm subsiding path. */
  sink: { from: number; to: number; start: number; dur: number; rot: number } | null;
  alpha: number;
  size: number;
}

export interface Group {
  hinge: Vec;
  hinge0: Vec;
  dir: 1 | -1;
  startMs: number;
  phi: number;
  dphi: number;
  push: number;
  a1: number;
  sinkLu: number;
  cells: number[];
  done: boolean;
}

export interface Impact {
  t: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  group: boolean;
}

export interface WorldOptions {
  fracture: Fracture;
  profile: CollapseProfile;
  seed: number;
  lite: boolean;
  reduce: boolean;
  /** Number of collapse-kit debris frames available (0: code-drawn rocks). */
  kitFrames: number;
  /** Treasury prop (lu) when the base has one. */
  treasuryAt: Vec | null;
  /** Light and smoke spots of the sheet (lu, y down). */
  lights: readonly Vec[];
  smokeSpots: readonly Vec[];
  /** No particles (the dry run that finds the landing beat). */
  dry?: boolean;
}

export interface BodyPose {
  ox: number;
  oy: number;
  rot: number;
  sx: number;
  sy: number;
}

export interface Beats {
  breakMs: number;
  /** The biggest toppling piece hits the ground (the final thud). */
  landMs: number;
  /** Most pieces lie still. */
  settleMs: number;
}

const clamp01 = (u: number): number => (u < 0 ? 0 : u > 1 ? 1 : u);
const easeIn = (u: number): number => clamp01(u) * clamp01(u);
const easeOut = (u: number): number => 1 - (1 - clamp01(u)) * (1 - clamp01(u));
const easeInOut = (u: number): number => {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
};

export class CollapseWorld {
  readonly breakMs: number;
  readonly chunks: Chunk[] = [];
  readonly groups: Group[] = [];
  readonly particles: Particle[] = [];
  readonly impacts: Impact[] = [];
  /** World time (ms) since the collapse started. */
  t = 0;
  broken = false;
  private acc = 0;
  private nextId = 1;
  private readonly cap: number;
  private readonly hf: Float64Array;
  private readonly rA: CosmeticRng;
  private readonly rB: CosmeticRng;
  private readonly rC: CosmeticRng;
  private readonly rD: CosmeticRng;
  /** Physics-only stream (topple release spread): the dry run consumes it exactly like the live run. */
  private readonly rP: CosmeticRng;
  private readonly byId = new Map<number, Chunk>();
  private readonly rect: Rect;
  private readonly pivot: Vec;
  private readonly center: Vec;
  private readonly mainDir: 1 | -1;
  private trickle = 0;
  private trail = 0;
  private smokeAcc = 0;
  private emberAcc = 0;
  private crackleAt = 0;
  private readonly stumpTops: Vec[] = [];
  private readonly flames: Particle[] = [];

  constructor(readonly o: WorldOptions) {
    this.breakMs = o.reduce ? BREAK_MS_REDUCED : BREAK_MS;
    this.cap = o.dry ? 0 : o.lite ? 150 : 320;
    this.rA = mulberry32(seedOf('anticipation', o.seed));
    this.rB = mulberry32(seedOf('break', o.seed));
    this.rC = mulberry32(seedOf('impacts', o.seed));
    this.rD = mulberry32(seedOf('aftermath', o.seed));
    this.rP = mulberry32(seedOf('physics', o.seed));
    this.hf = new Float64Array(Math.ceil((HF_X1 - HF_X0) / HF_STEP) + 1);
    this.rect = o.fracture.rect;
    this.pivot = { x: this.rect.x + this.rect.w / 2, y: 0 };
    this.center = { x: this.rect.x + this.rect.w * 0.52, y: this.rect.y + this.rect.h * 0.55 };
    this.mainDir = o.fracture.groups[0]?.dir ?? 1;
    this.build();
  }

  // ------------------------------------------------------------------------------------------
  // Setup

  private build(): void {
    const fr = this.o.fracture;
    const rng = mulberry32(seedOf('chunks', this.o.seed));
    for (const c of fr.cells) {
      if (c.kind === 'empty') continue;
      const verts = c.poly.map((v) => ({ x: v.x - c.cx, y: v.y - c.cy }));
      let r2 = 0;
      for (const v of verts) r2 = Math.max(r2, v.x * v.x + v.y * v.y);
      const m = Math.max(4, c.area);
      this.chunks.push({
        id: c.id,
        verts,
        rx: c.cx,
        ry: c.cy,
        x: c.cx,
        y: c.cy,
        vx: 0,
        vy: 0,
        a: 0,
        w: 0,
        m,
        inertia: m * r2 * 0.32,
        group: c.group,
        released: c.group < 0,
        releaseAngle: 0,
        startMs: 0,
        active: false,
        sleeping: false,
        rest: 0,
        landedMs: -1,
        static: c.kind === 'stump',
        sink: null,
        alpha: 1,
        size: Math.sqrt(m),
      });
      this.byId.set(c.id, this.chunks[this.chunks.length - 1]!);
      if (c.kind === 'stump') {
        // the stump's top edge: where smoke, embers and flames rise from after the collapse
        let top = c.poly[0]!;
        for (const v of c.poly) if (v.y < top.y) top = v;
        this.stumpTops.push({ x: top.x, y: top.y });
      }
    }
    for (const g of fr.groups) {
      const L = Math.max(60, Math.hypot(g.cx - g.hinge.x, g.cy - g.hinge.y));
      this.groups.push({
        hinge: { ...g.hinge },
        hinge0: { ...g.hinge },
        dir: g.dir,
        startMs: this.breakMs + g.delayMs,
        phi: 0,
        dphi: 2.1,
        push: g.push,
        a1: GRAVITY / L,
        sinkLu: g.sinkLu,
        cells: g.cells,
        done: false,
      });
      let dMax = 1;
      for (const id of g.cells) {
        const ch = this.chunk(id);
        if (ch) dMax = Math.max(dMax, Math.hypot(ch.rx - g.hinge.x, ch.ry - g.hinge.y));
      }
      for (const id of g.cells) {
        const ch = this.chunk(id);
        if (!ch) continue;
        const d = Math.hypot(ch.rx - g.hinge.x, ch.ry - g.hinge.y) / dMax;
        // the far pieces break away a little before the tower hits the ground: it comes apart
        // from the top as it falls; the rest breaks up on the impact
        ch.releaseAngle = 1.3 - 0.22 * d + (rng.next() - 0.5) * 0.12;
      }
    }
  }

  private chunk(id: number): Chunk | undefined {
    return this.byId.get(id);
  }

  // ------------------------------------------------------------------------------------------
  // Time

  /** Advances the world by `dtMs` of game time in whole fixed steps. */
  update(dtMs: number): void {
    if (!(dtMs > 0)) return;
    // integer microseconds: equal totals always give the same number of steps
    this.acc += Math.round(dtMs * 1000);
    const stepUs = STEP_MS * 1000;
    while (this.acc >= stepUs) {
      this.acc -= stepUs;
      this.step();
    }
  }

  /** Runs whole steps until world time `ms` (tests, the dry run). */
  runTo(ms: number): void {
    while (this.t + STEP_MS <= ms + 1e-9) this.step();
  }

  private step(): void {
    const dt = STEP_MS / 1000;
    const t0 = this.t;
    this.t += STEP_MS;
    if (this.t < this.breakMs) {
      this.anticipation(t0);
    } else {
      if (!this.broken) {
        this.broken = true;
        this.doBreak();
      }
      this.stepGroups(dt);
      this.stepChunks(dt);
      this.ongoing();
    }
    this.stepParticles(dt);
  }

  // ------------------------------------------------------------------------------------------
  // Build-up

  /** The body's tremble, sink and lean before the break (pivot: the body's bottom centre). */
  bodyPose(t: number = this.t): BodyPose {
    const u = clamp01(t / this.breakMs);
    if (this.o.reduce) return { ox: 0, oy: 2 * easeInOut(u), rot: 0, sx: 1, sy: 1 };
    const s = t / 1000;
    const amp = 0.5 + 4 * u * u;
    const ox = amp * (0.7 * Math.sin(s * 2 * Math.PI * 27) + 0.3 * Math.sin(s * 2 * Math.PI * 41 + 1.3));
    const oy = amp * 0.4 * Math.sin(s * 2 * Math.PI * 33 + 0.7) + 3.5 * easeIn(u);
    const sq = easeIn((u - 0.78) / 0.22);
    return { ox, oy, rot: this.mainDir * 0.028 * easeIn(u), sx: 1 + 0.018 * sq, sy: 1 - 0.035 * sq };
  }

  /** How far crack `i` has spread (0..1) at the current time. */
  crackReveal(t0: number, t1: number): number {
    if (this.broken) return 1;
    const u = clamp01(this.t / this.breakMs);
    return clamp01((u - t0) / Math.max(0.01, t1 - t0));
  }

  /** Energy ages: the failing shield's opacity (0 = off) during the build-up. */
  shieldAlpha(): number {
    if (!this.o.profile.shield || this.broken) return 0;
    const u = clamp01(this.t / this.breakMs);
    const k = Math.floor(this.t / 45);
    // a hash flicker: more and longer drop-outs toward the break
    const h = ((k * 2654435761) >>> 0) % 1000 / 1000;
    const on = h > 0.18 + 0.5 * u;
    return on ? 0.32 + 0.42 * (1 - u) * (0.7 + 0.3 * Math.sin(this.t / 23)) : 0.06;
  }

  /** Lights flicker: 0..1.6 multiplier (energy ages stutter, the rest flare). */
  lightFactor(): number {
    const u = clamp01(this.t / this.breakMs);
    if (this.o.profile.flicker) {
      const k = Math.floor(this.t / 60);
      const h = ((k * 40503 + 17) >>> 0) % 97 / 97;
      return h < 0.25 + 0.45 * u ? 0.1 : 1.2;
    }
    return 1 + 0.6 * u;
  }

  private anticipation(t: number): void {
    if (this.o.dry) return;
    const u = clamp01(t / this.breakMs);
    const lite = this.o.lite ? 0.5 : 1;
    // energy ages shed less dust (their hull sparks instead)
    const rate = (this.o.reduce ? 4 : 3 + 30 * u * u) * lite * (this.o.profile.flicker ? 0.6 : 1);
    this.trickle += rate * (STEP_MS / 1000);
    const r = this.rA;
    const fr = this.o.fracture;
    while (this.trickle >= 1) {
      this.trickle -= 1;
      // from a crack that has opened, else from the top edge
      const open = fr.cracks.filter((c) => u >= c.t0);
      let x: number;
      let y: number;
      if (open.length > 0 && r.next() < 0.75) {
        const c = open[Math.floor(r.next() * open.length)]!;
        const q = c.pts[Math.floor(r.next() * c.pts.length)]!;
        x = q.x;
        y = q.y;
      } else {
        x = this.rect.x + this.rect.w * (0.15 + 0.7 * r.next());
        y = this.rect.y + this.rect.h * (0.05 + 0.25 * r.next());
      }
      const dust = this.o.profile.colors.dust;
      this.emit('puff', x, y, { vx: (r.next() - 0.5) * 22, vy: 15 + r.next() * 40, g: 260, s0: 0.3, s1: 0.95, a0: 0.6, life: 700 + r.next() * 400, tint: dust, front: true });
      // reduce motion: the pebbles drop straight, without spinning
      if (r.next() < 0.4) this.debrisPiece(r, x, y, { vx: (r.next() - 0.5) * 50, vy: r.next() * 40, scale: 0.3 + 0.3 * r.next(), spin: (r.next() - 0.5) * (this.o.reduce ? 0 : 10) });
    }
  }

  // ------------------------------------------------------------------------------------------
  // The break

  private doBreak(): void {
    const p = this.o.profile;
    const pose = this.bodyPose(this.breakMs);
    const r = this.rB;
    const H = Math.max(80, -this.rect.y);
    const cos = Math.cos(pose.rot);
    const sin = Math.sin(pose.rot);
    for (const c of this.chunks) {
      // start where the trembling body stood
      const dx = c.rx - this.pivot.x;
      const dy = c.ry - this.pivot.y;
      c.x = this.pivot.x + dx * cos - dy * sin + pose.ox;
      c.y = this.pivot.y + dx * sin + dy * cos + pose.oy;
      c.a = pose.rot;
      if (c.static) continue;
      const h = clamp01(-c.ry / H);
      if (this.o.reduce) {
        // a calm subsiding: every piece settles down into the dust, the high ones last
        const drop = Math.max(10, -c.y - c.size * 0.25);
        c.sink = { from: c.y, to: c.y + drop, start: this.breakMs + (1 - h) * 160 + r.next() * 140, dur: 900 + r.next() * 500, rot: (r.next() - 0.5) * 0.16 };
        continue;
      }
      if (c.group >= 0) continue;
      c.active = true;
      c.startMs = this.breakMs;
      const ddx = c.x - this.center.x;
      const ddy = c.y - this.center.y;
      const d = Math.max(1, Math.hypot(ddx, ddy));
      const low = -c.ry < this.o.profile.stumpLu + 46;
      const sp = p.blast * (0.45 + 0.55 * r.next()) * (0.55 + 0.7 * h) * (low ? 0.3 : 1);
      c.vx = (ddx / d) * sp + 40 * this.mainDir * (0.5 + r.next());
      c.vy = (ddy / d) * sp * 0.55 - p.lift * p.blast * (0.3 + 0.7 * r.next()) * (0.45 + 0.85 * h) * (low ? 0.25 : 1);
      if (this.mainDir > 0) c.vx = Math.max(c.vx, -0.45 * p.blast);
      else c.vx = Math.min(c.vx, 0.45 * p.blast);
      c.w = (r.next() - 0.5) * 2 * (2.5 + 7 * clamp01(1 - c.size / 60));
    }
    if (this.o.dry) return;
    this.breakFx(r);
  }

  private breakFx(r: CosmeticRng): void {
    const p = this.o.profile;
    const C = p.colors;
    const lite = this.o.lite;
    const reduce = this.o.reduce;
    const R = this.rect;
    const cx = this.center.x;
    const W = R.w;
    const H = -R.y;
    if (!reduce) {
      this.emit('glow', cx, this.center.y, { s0: 3, s1: 11, a0: 0.8, life: 340, tint: 0xfff6e8, add: true, front: true });
      this.emit('ring', cx, -2, { s0: 1.6, s1: (W / 10) * 1.6, a0: 0.75, life: 520, tint: 0xfff4e2, flatY: 0.3, front: true });
    }
    // the dust ring rolls out along the ground
    const nDust = reduce ? 8 : lite ? 7 : 14;
    for (let i = 0; i < nDust; i++) {
      const f = (i + 0.5) / nDust;
      const x = R.x + 16 + (W - 26) * f;
      const side = x < cx ? -1 : 1;
      const out = reduce ? 30 + r.next() * 40 : 110 + r.next() * 160;
      this.emit('dust', x, -8 - r.next() * 34, {
        vx: side * out + (reduce ? 0 : 40 * this.mainDir),
        vy: reduce ? -8 - r.next() * 14 : -10 - r.next() * 46,
        drag: reduce ? 0.8 : 1.6,
        g: -26,
        s0: reduce ? 1.4 : 1.2,
        s1: 2.7 + r.next() * 0.9,
        a0: 0.66,
        life: 1800 + r.next() * 700,
        tint: i % 2 ? C.dust2 : C.dust,
        fadeIn: reduce ? 0.2 : 0.04,
        front: true,
        spin: (r.next() - 0.5) * 0.6,
      });
    }
    // a column of dust over the falling body
    const nCol = reduce ? 4 : lite ? 3 : 6;
    for (let i = 0; i < nCol; i++) {
      this.emit('dust', R.x + W * (0.2 + 0.6 * r.next()), -40 - r.next() * H * 0.45, { vx: (r.next() - 0.5) * 40, vy: -30 - r.next() * 40, drag: 0.8, g: -10, s0: 1.5, s1: 3.2, a0: 0.5, life: 1900 + r.next() * 600, tint: i % 2 ? C.dust : C.dust2, fadeIn: 0.15, delay: reduce ? 120 * i : 40 * i, front: true, spin: (r.next() - 0.5) * 0.4 });
    }
    if (reduce) return;
    // debris pieces from the crack lines
    const cracks = this.o.fracture.cracks;
    const nDebris = Math.round(p.debris * (lite ? 0.5 : 1));
    for (let i = 0; i < nDebris; i++) {
      const c = cracks[Math.floor(r.next() * cracks.length)];
      const q = c ? c.pts[Math.floor(r.next() * c.pts.length)]! : { x: cx, y: this.center.y };
      const dx = q.x - cx;
      const dy = q.y - this.center.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const sp = p.blast * (0.7 + 0.7 * r.next());
      this.debrisPiece(r, q.x, q.y, {
        vx: (dx / d) * sp + 60 * this.mainDir,
        vy: (dy / d) * sp * 0.5 - p.lift * p.blast * (0.5 + 0.8 * r.next()),
        scale: 0.55 + 0.6 * r.next(),
        spin: (r.next() - 0.5) * 24,
      });
    }
    // splinters (timber ages)
    const nSplinter = Math.round(18 * p.splinters * (lite ? 0.5 : 1));
    for (let i = 0; i < nSplinter; i++) {
      const x = R.x + W * (0.1 + 0.8 * r.next());
      const y = -20 - r.next() * H * 0.6;
      this.emit('timber', x, y, { vx: (r.next() - 0.3) * 2 * p.blast * this.mainDir, vy: -p.blast * (0.6 + 0.8 * r.next()), g: GRAVITY, bounce: 0.25, spin: (r.next() - 0.5) * 30, s0: 0.35 + 0.3 * r.next(), s1: 0.35 + 0.3 * r.next(), a0: 1, life: 2600 + r.next() * 1200, tint: r.next() < 0.5 ? 0x7a5e44 : 0x5e4836 });
    }
    // sparks (metal, concrete, energy)
    const nSpark = Math.round(30 * p.sparks * (lite ? 0.5 : 1));
    for (let i = 0; i < nSpark; i++) {
      const c = cracks[Math.floor(r.next() * cracks.length)];
      const q = c ? c.pts[Math.floor(r.next() * c.pts.length)]! : { x: cx, y: this.center.y };
      const ang = -Math.PI / 2 + (r.next() - 0.5) * Math.PI * 1.5;
      const sp = 260 + r.next() * 380;
      this.emit(i % 3 === 0 ? 'sparkHot' : 'spark', q.x, q.y, { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 700, drag: 2.4, align: true, s0: 1.6, s1: 0.4, a0: 1, life: 300 + r.next() * 380, tint: C.spark, add: true, front: true });
    }
    // the powder magazine / boiler goes up (fire ages)
    if (p.fire >= 0.6) {
      const nFire = Math.round(9 * p.fire * (lite ? 0.6 : 1));
      for (let i = 0; i < nFire; i++) {
        const x = cx + (r.next() - 0.5) * W * 0.5;
        const y = this.center.y + (r.next() - 0.5) * 60;
        this.emit('fire', x, y, { vx: (r.next() - 0.5) * 120, vy: -60 - r.next() * 110, drag: 2.5, g: -60, s0: 0.8, s1: 2.6 + r.next(), a0: 0.95, life: 420 + r.next() * 320, spin: (r.next() - 0.5) * 2, front: true });
        this.emit('smokeLobe', x, y - 10, { vx: (r.next() - 0.5) * 60, vy: -40 - r.next() * 60, drag: 1.4, g: -40, s0: 1.2, s1: 3.8, a0: 0.7, life: 1500 + r.next() * 600, delay: 220 + r.next() * 160, spin: (r.next() - 0.5) * 1.2, tint: C.smoke, front: true });
      }
    }
    // embers burst up
    const nEmber = Math.round(30 * Math.max(0.35, p.fire) * (lite ? 0.5 : 1));
    for (let i = 0; i < nEmber; i++) {
      this.emit('ember', cx + (r.next() - 0.5) * W * 0.8, this.center.y + (r.next() - 0.3) * H * 0.4, { vx: (r.next() - 0.5) * 240, vy: -80 - r.next() * 200, g: -40, drag: 1.2, s0: 0.36, s1: 0.2, a0: 1, life: 1300 + r.next() * 1300, tint: C.ember, add: true, flicker: 0.6, sway: 6 + r.next() * 8, phase: r.next() * 6.28, front: true });
    }
    // energy: the shield shatters, a ring of light, arcs
    if (p.shield) {
      const nShard = lite ? 14 : 30;
      const rx = W * 0.62;
      const ry = H * 0.58;
      const ccy = -H * 0.5;
      for (let i = 0; i < nShard; i++) {
        const ang = Math.PI * (1.05 + 0.9 * (i / nShard)) + (r.next() - 0.5) * 0.25;
        const x = cx + Math.cos(ang) * rx;
        const y = ccy + Math.sin(ang) * ry;
        const sp = 220 + r.next() * 240;
        this.emit('shard', x, y, { vx: Math.cos(ang) * sp + 40 * this.mainDir, vy: Math.sin(ang) * sp - 80, g: 620, drag: 0.8, spin: (r.next() - 0.5) * 20, s0: 1.3 + r.next(), s1: 0.8, a0: 0.95, life: 650 + r.next() * 500, tint: C.energy, add: true, front: true });
      }
      this.emit('ringThin', cx, ccy, { s0: 2, s1: (W / 10) * 1.9, a0: 0.72, life: 420, tint: C.energy, add: true, front: true });
      for (let i = 0; i < (lite ? 3 : 6); i++) {
        const c = cracks[Math.floor(r.next() * cracks.length)];
        const q = c ? c.pts[0]! : { x: cx, y: ccy };
        this.emit('bolt', q.x, q.y, { s0: 1.4 + r.next(), s1: 1.2, a0: 1, life: 200 + r.next() * 180, rot: r.next() * Math.PI * 2, tint: C.energy, add: true, flicker: 0.9, delay: r.next() * 160, front: true });
      }
    }
    // torn banner scraps flutter down (the kit's team-coloured rag)
    if (this.o.kitFrames > 0) {
      for (let i = 0; i < (lite ? 1 : 2); i++) {
        // a short hop off the banner, then a slow flutter down beside the pile (they stay in frame)
        this.emit('rag', R.x + W * (0.25 + 0.5 * r.next()), R.y + H * (0.15 + 0.2 * r.next()), { vx: (r.next() - 0.5) * 90 + 40 * this.mainDir, vy: -60 - r.next() * 50, g: 120, drag: 1.8, bounce: 0.01, sway: 16 + r.next() * 10, phase: r.next() * 6.28, spin: (r.next() - 0.5) * 5, s0: 1, s1: 1, a0: 1, life: 4200 + r.next() * 800 });
      }
    }
    // coins burst out of the Treasury
    const tr = this.o.treasuryAt;
    if (tr) {
      for (let i = 0; i < (lite ? 5 : 9); i++) {
        this.emit('coin', tr.x + (r.next() - 0.5) * 10, tr.y, { vx: (r.next() - 0.3) * 260 * this.mainDir, vy: -200 - r.next() * 160, g: GRAVITY, bounce: 0.42, spin: (r.next() - 0.5) * 6, s0: 1.8, s1: 1.8, a0: 1, life: 2600 + r.next() * 800, delay: i * 18 });
      }
    }
  }

  /** One debris piece: a collapse-kit sprite when the kit has loaded, else a code-drawn rock. */
  private debrisPiece(r: CosmeticRng, x: number, y: number, o: { vx: number; vy: number; scale: number; spin: number }): void {
    const kit = this.o.kitFrames;
    const rub = this.o.profile.colors.rubble;
    const useKit = kit > 0;
    this.emit(useKit ? 'kit' : 'rock', x, y, {
      frame: useKit ? Math.floor(r.next() * kit) : Math.floor(r.next() * 3),
      vx: o.vx,
      vy: o.vy,
      g: GRAVITY,
      bounce: this.o.profile.restitution + 0.08,
      spin: o.spin,
      s0: o.scale * (useKit ? 1 : 1.7),
      s1: o.scale * (useKit ? 1 : 1.7),
      a0: 1,
      life: 7000 + r.next() * 4000,
      tint: useKit ? 0xffffff : (rub[Math.floor(r.next() * rub.length)] ?? 0x9a9288),
    });
  }

  // ------------------------------------------------------------------------------------------
  // Topples and pieces

  private stepGroups(dt: number): void {
    for (const g of this.groups) {
      if (g.done || this.t < g.startMs || this.o.reduce) continue;
      const local = this.t - g.startMs;
      g.dphi += g.push * (8 + g.a1 * Math.sin(Math.max(0, g.phi))) * dt;
      g.phi += g.dphi * dt;
      const sink = g.sinkLu * easeOut(local / 380);
      const prevHy = g.hinge.y;
      g.hinge.y = g.hinge0.y + sink;
      const hvy = (g.hinge.y - prevHy) / dt;
      const ang = g.dir * g.phi;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      let touch = false;
      let any = false;
      for (const id of g.cells) {
        const c = this.chunk(id);
        if (!c || c.released) continue;
        any = true;
        const dx = c.rx - g.hinge0.x;
        const dy = c.ry - g.hinge0.y;
        c.x = g.hinge.x + dx * cos - dy * sin;
        c.y = g.hinge.y + dx * sin + dy * cos;
        c.a = ang;
        if (!touch && this.lowestPenetration(c) > 0) touch = true;
      }
      for (const id of g.cells) {
        const c = this.chunk(id);
        if (!c || c.released) continue;
        if (!touch && g.phi < c.releaseAngle) continue;
        // free it with part of the velocity it has on the turning tower (the impact or the break
        // eats the rest), plus a little spread
        const w = g.dir * g.dphi;
        const rx = c.x - g.hinge.x;
        const ry = c.y - g.hinge.y;
        const keep = touch ? 0.3 : 0.5;
        c.released = true;
        c.active = true;
        c.startMs = this.t;
        let vx = -w * ry * keep + (this.rP.next() - 0.5) * 50;
        let vy = (w * rx + hvy) * keep - this.rP.next() * 50;
        const sp = Math.hypot(vx, vy);
        if (sp > 260) {
          vx *= 260 / sp;
          vy *= 260 / sp;
        }
        c.vx = vx;
        c.vy = vy;
        c.w = w * keep * (0.6 + 0.6 * this.rP.next());
      }
      if (!any) g.done = true;
      // dust streams off the falling tower
      if (!this.o.dry && any && g.dphi > 1.4) {
        this.trail += dt * 1000;
        while (this.trail >= 45) {
          this.trail -= 45;
          const id = g.cells[Math.floor(this.rC.next() * g.cells.length)];
          const c = id === undefined ? undefined : this.chunk(id);
          if (!c) continue;
          const v = c.verts[Math.floor(this.rC.next() * c.verts.length)]!;
          const wx = c.x + v.x * Math.cos(c.a) - v.y * Math.sin(c.a);
          const wy = c.y + v.x * Math.sin(c.a) + v.y * Math.cos(c.a);
          this.emit('puff', wx, wy, { vx: (this.rC.next() - 0.5) * 30, vy: 10 + this.rC.next() * 30, g: 120, s0: 0.6, s1: 1.8, a0: 0.7, life: 800 + this.rC.next() * 400, tint: this.o.profile.colors.dust, front: true });
        }
      }
    }
  }

  private groundAt(x: number): number {
    const i = Math.round((x - HF_X0) / HF_STEP);
    if (i < 0 || i >= this.hf.length) return 0;
    return this.hf[i]!;
  }

  /** Deepest penetration of a chunk below the ground or the pile (lu; <= 0 = clear). */
  private lowestPenetration(c: Chunk): number {
    const cos = Math.cos(c.a);
    const sin = Math.sin(c.a);
    let best = -Infinity;
    for (const v of c.verts) {
      const wx = c.x + v.x * cos - v.y * sin;
      const wy = c.y + v.x * sin + v.y * cos;
      best = Math.max(best, wy - this.groundAt(wx));
    }
    return best;
  }

  private stepChunks(dt: number): void {
    const p = this.o.profile;
    for (const c of this.chunks) {
      if (c.static) continue;
      if (c.sink) {
        const k = easeInOut((this.t - c.sink.start) / c.sink.dur);
        c.y = c.sink.from + (c.sink.to - c.sink.from) * k;
        c.a = c.sink.rot * k;
        c.alpha = 1 - easeIn((k - 0.55) / 0.45);
        if (k > 0 && c.landedMs < 0 && k > 0.6) c.landedMs = this.t;
        continue;
      }
      if (!c.active || c.sleeping || this.t < c.startMs) continue;
      c.vy += GRAVITY * dt;
      c.vx *= 1 - 0.08 * dt;
      c.w *= 1 - 0.15 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.a += c.w * dt;
      // the back wall: the world ends behind the base, so pieces bounce off it and stay in view
      if (c.x < BACK_WALL && c.vx < 0) {
        c.x = BACK_WALL;
        c.vx = -c.vx * 0.3;
      }
      // contact with the ground or the pile: one impulse at the deepest vertex
      const cos = Math.cos(c.a);
      const sin = Math.sin(c.a);
      let pen = 0;
      let cx = 0;
      let cy = 0;
      for (const v of c.verts) {
        const rx = v.x * cos - v.y * sin;
        const ry = v.x * sin + v.y * cos;
        const d = c.y + ry - this.groundAt(c.x + rx);
        if (d > pen) {
          pen = d;
          cx = rx;
          cy = ry;
        }
      }
      if (pen <= 0) {
        c.rest = 0;
        continue;
      }
      c.y -= pen;
      const vn = c.vy + c.w * cx;
      if (vn > 0) {
        const speed = Math.hypot(c.vx, c.vy);
        if (c.landedMs < 0) {
          c.landedMs = this.t;
          if (speed > 120) this.impacts.push({ t: this.t, x: c.x + cx, y: c.y + cy, speed, size: c.size, group: c.group >= 0 });
          if (!this.o.dry && speed > 120) this.impactFx(c.x + cx, c.y + cy, speed, c.size);
        }
        const e = speed < 90 ? 0 : p.restitution;
        const j = (-(1 + e) * vn) / (1 / c.m + (cx * cx) / c.inertia);
        c.vy += j / c.m;
        c.w += (cx * j) / c.inertia;
        // friction along the ground
        const vt = c.vx - c.w * cy;
        let jt = -vt / (1 / c.m + (cy * cy) / c.inertia);
        const lim = p.friction * Math.abs(j);
        jt = Math.max(-lim, Math.min(lim, jt));
        c.vx += jt / c.m;
        c.w += (-cy * jt) / c.inertia;
      }
      // rubble does not roll far: its corners dig in, so ground contact bleeds speed and spin
      c.vx *= 1 - 2.8 * dt;
      c.vx -= Math.sign(c.vx) * Math.min(Math.abs(c.vx), 460 * dt);
      c.w *= 1 - 11 * dt;
      const late = this.t - c.landedMs > 260;
      const vLim = late ? 34 : 14;
      const wLim = late ? 1.6 : 0.6;
      if (Math.abs(c.vx) < vLim && Math.abs(c.vy) < vLim && Math.abs(c.w) < wLim) {
        c.rest += dt;
        if (c.rest > (late ? 0.08 : 0.14)) this.sleep(c);
      } else {
        c.rest = 0;
      }
    }
  }

  /** A piece comes to rest: it stops and raises the pile under it. */
  private sleep(c: Chunk): void {
    c.sleeping = true;
    c.vx = 0;
    c.vy = 0;
    c.w = 0;
    const cos = Math.cos(c.a);
    const sin = Math.sin(c.a);
    const world = c.verts.map((v) => ({ x: c.x + v.x * cos - v.y * sin, y: c.y + v.x * sin + v.y * cos }));
    let minX = Infinity;
    let maxX = -Infinity;
    for (const q of world) {
      minX = Math.min(minX, q.x);
      maxX = Math.max(maxX, q.x);
    }
    for (let x = Math.ceil(minX / HF_STEP) * HF_STEP; x <= maxX; x += HF_STEP) {
      // the top of the piece at x: the highest crossing of its outline
      let top = Infinity;
      for (let k = 0; k < world.length; k++) {
        const a = world[k]!;
        const b = world[(k + 1) % world.length]!;
        if ((a.x <= x && b.x >= x) || (b.x <= x && a.x >= x)) {
          const f = Math.abs(b.x - a.x) < 1e-6 ? 0 : (x - a.x) / (b.x - a.x);
          top = Math.min(top, a.y + (b.y - a.y) * f);
        }
      }
      if (top === Infinity) continue;
      const i = Math.round((x - HF_X0) / HF_STEP);
      if (i < 0 || i >= this.hf.length) continue;
      // pieces settle into the pile a little (they sink into dust and each other)
      const h = Math.max(-MAX_PILE, top * 0.72);
      if (h < this.hf[i]!) this.hf[i] = h;
    }
  }

  private impactFx(x: number, y: number, speed: number, size: number): void {
    const r = this.rC;
    const p = this.o.profile;
    const k = Math.min(1.6, 0.5 + size / 55) * Math.min(1.3, speed / 380 + 0.4);
    // dust is most of the collapse's fill on a phone: one or two puffs a landing is enough
    const n = this.o.lite ? 1 : k > 1 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      this.emit('dust', x + (r.next() - 0.5) * size * 0.6, y - 4, { vx: (r.next() - 0.5) * 120, vy: -12 - r.next() * 30, drag: 2.2, g: -14, s0: 0.7 * k, s1: 2.1 * k, a0: 0.75, life: 1100 + r.next() * 500, tint: i % 2 ? p.colors.dust2 : p.colors.dust, front: true, spin: (r.next() - 0.5) * 0.8 });
    }
    if (p.sparks >= 0.4) {
      for (let i = 0; i < (this.o.lite ? 2 : 4); i++) {
        const ang = -Math.PI / 2 + (r.next() - 0.5) * 2.2;
        const sp = 160 + r.next() * 220;
        this.emit('spark', x, y - 2, { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 700, drag: 2.4, align: true, s0: 1.2, s1: 0.3, a0: 1, life: 240 + r.next() * 220, tint: p.colors.spark, add: true, front: true });
      }
    }
    if (r.next() < 0.6) this.debrisPiece(r, x, y - 4, { vx: (r.next() - 0.5) * 160, vy: -120 - r.next() * 140, scale: 0.35 + 0.3 * r.next(), spin: (r.next() - 0.5) * 18 });
  }

  // ------------------------------------------------------------------------------------------
  // After the collapse: smoke, embers, flames, crackle

  private ongoing(): void {
    if (this.o.dry) return;
    const since = this.t - this.breakMs;
    const p = this.o.profile;
    const r = this.rD;
    const lite = this.o.lite ? 0.5 : 1;
    const tops = this.stumpTops.length > 0 ? this.stumpTops : [{ x: this.center.x, y: -this.o.profile.stumpLu }];
    if (since > 450) {
      // smoke columns from the ruin: thick at first, then a lingering trickle
      const decay = Math.max(0, 1 - (since - 450) / 9000);
      const rate = (0.5 + 1.7 * decay) * lite * (this.o.reduce ? 0.6 : 1) * (0.7 + 0.6 * Math.max(p.fire, 0.3));
      this.smokeAcc += rate * (STEP_MS / 1000);
      while (this.smokeAcc >= 1) {
        this.smokeAcc -= 1;
        const s = tops[Math.floor(r.next() * tops.length)]!;
        this.emit('smoke', s.x + (r.next() - 0.5) * 16, s.y - 4, { vx: 6 + r.next() * 10, vy: -24 - r.next() * 18, drag: 0.2, g: -6, s0: 0.9, s1: 3.4, a0: 0.42, life: 3000 + r.next() * 1000, tint: p.colors.smoke, fadeIn: 0.12, spin: (r.next() - 0.5) * 0.3, front: true });
      }
    }
    if (since > 300 && !this.o.reduce) {
      const decay = Math.max(0, 1 - (since - 300) / 8000);
      const rate = (0.8 + 4.5 * decay) * lite * (0.6 + Math.max(p.fire, 0.3));
      this.emberAcc += rate * (STEP_MS / 1000);
      while (this.emberAcc >= 1) {
        this.emberAcc -= 1;
        const s = tops[Math.floor(r.next() * tops.length)]!;
        this.emit('ember', s.x + (r.next() - 0.5) * 50, s.y - r.next() * 10, { vx: (r.next() - 0.5) * 30, vy: -40 - r.next() * 50, g: -10, drag: 0.6, s0: 0.3, s1: 0.18, a0: 1, life: 1500 + r.next() * 1000, tint: p.colors.ember, add: true, flicker: 0.7, sway: 5 + r.next() * 6, phase: r.next() * 6.28, front: true });
      }
    }
    // small flames on the ruin (fire ages), lit once
    if (since >= 380 && this.flames.length === 0 && p.fire >= 0.3 && !this.o.reduce) {
      const n = Math.min(tops.length, this.o.lite ? 2 : 4);
      for (let i = 0; i < n; i++) {
        const s = tops[(i * 3 + 1) % tops.length]!;
        const f = this.emit('flame', s.x + (r.next() - 0.5) * 10, s.y + 2, { s0: 0.45 + 0.35 * r.next(), s1: 0.45 + 0.35 * r.next(), a0: 0.95, life: Infinity, flicker: 0.5, phase: r.next() * 6.28, tint: p.flicker ? p.colors.energy : 0xffffff, add: p.flicker, fadeIn: 0 });
        if (f) this.flames.push(f);
      }
    }
    // dying energy crackles over the ruin
    if (p.flicker && since > 500 && this.t >= this.crackleAt && !this.o.reduce) {
      this.crackleAt = this.t + 700 + r.next() * 1100;
      const s = tops[Math.floor(r.next() * tops.length)]!;
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI / 2 + (r.next() - 0.5) * 2.4;
        const sp = 90 + r.next() * 140;
        this.emit('spark', s.x, s.y - 4, { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 500, drag: 2, align: true, s0: 1, s1: 0.3, a0: 1, life: 260 + r.next() * 200, tint: p.colors.energy, add: true, front: true });
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Particles

  private emit(kind: ParticleKind, x: number, y: number, o: Partial<Particle>): Particle | null {
    if (this.o.dry) return null;
    if (this.particles.length >= this.cap) {
      // drop the oldest short-lived particle first; settled debris and flames stay
      const i = this.particles.findIndex((q) => q.life !== Infinity && !q.settled && q.kind !== 'flame');
      if (i < 0) return null;
      this.particles.splice(i, 1);
    }
    const q: Particle = {
      id: this.nextId++,
      kind,
      frame: o.frame ?? 0,
      x,
      y,
      vx: o.vx ?? 0,
      vy: o.vy ?? 0,
      rot: o.rot ?? 0,
      spin: o.spin ?? 0,
      s0: o.s0 ?? 1,
      s1: o.s1 ?? o.s0 ?? 1,
      a0: o.a0 ?? 1,
      scale: o.s0 ?? 1,
      alpha: 0,
      life: o.life ?? 600,
      age: 0,
      delay: o.delay ?? 0,
      g: o.g ?? 0,
      drag: o.drag ?? 0,
      bounce: o.bounce ?? 0,
      bounces: 0,
      settled: false,
      tint: o.tint ?? 0xffffff,
      add: o.add ?? false,
      flicker: o.flicker ?? 0,
      sway: o.sway ?? 0,
      phase: o.phase ?? 0,
      fadeIn: o.fadeIn ?? 0,
      align: o.align ?? false,
      flatY: o.flatY ?? 1,
      front: o.front ?? false,
    };
    this.particles.push(q);
    return q;
  }

  private stepParticles(dt: number): void {
    const ms = dt * 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i]!;
      if (q.delay > 0) {
        q.delay -= ms;
        q.alpha = 0;
        continue;
      }
      q.age += ms;
      if (q.age >= q.life) {
        this.particles.splice(i, 1);
        continue;
      }
      if (!q.settled) {
        q.vy += q.g * dt;
        if (q.drag > 0) {
          const k = Math.max(0, 1 - q.drag * dt);
          q.vx *= k;
          q.vy *= k;
        }
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (q.align) q.rot = Math.atan2(q.vy, q.vx);
        else q.rot += q.spin * dt;
        if (q.bounce > 0) {
          if (q.x < BACK_WALL && q.vx < 0) q.vx = -q.vx * 0.3;
          const gy = this.groundAt(q.x);
          if (q.y > gy && q.vy > 0) {
            q.y = gy;
            if (q.bounces < 2 && q.vy > 60) {
              q.vy = -q.vy * q.bounce;
              q.vx *= 0.6;
              q.spin *= 0.5;
              q.bounces++;
            } else {
              q.vy = 0;
              q.vx = 0;
              q.spin = 0;
              q.settled = true;
            }
          }
        }
      }
      const u = q.life === Infinity ? 0 : q.age / q.life;
      q.scale = q.s0 + (q.s1 - q.s0) * easeOut(u);
      const fin = q.fadeIn > 0 ? clamp01(u / q.fadeIn) : 1;
      // debris and coins stay solid until their last 15%; puffs fade over their life
      const solid = q.kind === 'kit' || q.kind === 'rock' || q.kind === 'coin' || q.kind === 'timber' || q.kind === 'rag';
      const fade = solid ? 1 - easeIn((u - 0.85) / 0.15) : 1 - u * u;
      let a = q.a0 * fin * fade;
      if (q.flicker > 0) {
        const f = 0.5 + 0.5 * Math.sin(q.age / 37 + q.phase) * Math.sin(q.age / 91 + q.phase * 1.7);
        a *= 1 - q.flicker + q.flicker * f;
      }
      q.alpha = a;
    }
  }

  /** Side-to-side flutter offset of a particle (lu). */
  static swayOf(q: Particle): number {
    return q.sway > 0 ? Math.sin(q.age / 260 + q.phase) * q.sway : 0;
  }

  /** True when every moving piece has come to rest (or faded). */
  get settled(): boolean {
    return this.broken && this.chunks.every((c) => c.static || c.sleeping || (c.sink !== null && this.t >= c.sink.start + c.sink.dur));
  }
}

/**
 * The beats of a collapse (break, the biggest landing, settled), found by a dry run of the same world:
 * the pieces fall exactly the same way live, so the thud lands on the frame the tower hits the ground.
 */
export function collapseBeats(o: WorldOptions): Beats {
  const w = new CollapseWorld({ ...o, dry: true });
  // only first landings count, so the run can stop once every piece has come down (or at the
  // horizon of the beat); the live world replays the same steps, so nothing here drifts from it
  const end = w.breakMs + 1500;
  w.runTo(w.breakMs);
  while (w.t < end && !w.chunks.every((c) => c.static || c.landedMs > 0)) w.runTo(w.t + STEP_MS);
  let land = -1;
  let best = 0;
  for (const im of w.impacts) {
    if (im.t > w.breakMs + 1500) continue;
    const e = im.speed * im.size * (im.group ? 1.6 : 1);
    if (e > best) {
      best = e;
      land = im.t;
    }
  }
  if (land < 0) land = w.breakMs + (o.reduce ? 700 : 620);
  let settle = w.breakMs + 1400;
  for (const c of w.chunks) if (c.landedMs > 0) settle = Math.max(settle, Math.min(w.breakMs + 2200, c.landedMs + 300));
  return { breakMs: w.breakMs, landMs: Math.round(land), settleMs: Math.round(settle) };
}
