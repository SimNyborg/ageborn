/**
 * The victory moment's timeline (DESIGN A9 #7, A12; ui-plan MR-129): a tiny keyframe engine for a
 * cartoon scene on the Result screen. Pure and deterministic: a scene is data (nodes, keys, sound cues,
 * hit-stops), so the same match always plays the same frames, tests can sample any instant, and the
 * player turns it into Web Animations (only `transform` and `opacity`, ui-plan 5.1 rule 17).
 *
 * - **Nodes** are boxes in scene units (the stage is {@link STAGE_W} x {@link STAGE_H}), nested like
 *   the DOM they become: a child moves with its parent. Each has a transform origin and a base pose.
 * - **Keys** are per property (`x`, `y` offsets, `r` degrees, `sx`, `sy` scale, `o` opacity), so a hop
 *   (y) and a squash (sy) keep their own easing. A key's easing is how the value *arrives* at it; the
 *   easings are the motion tokens (`src/core/motion.ts`) plus `linear` and `hold` (a cut).
 * - **Hit-stops** freeze the whole scene for a few frames at an impact (A12). Keys are written in
 *   "action time"; a stop shifts everything after it, so authors never re-time a move to add one.
 * - **Cues** fire sounds, haptics and the screen confetti at action times (mapped through the stops).
 */
import { MOTION_EASE, type MotionEaseToken } from '@/core/motion';

/** The stage in scene units: the art is drawn for this box and scaled to fit the Result's left column. */
export const STAGE_W = 340;
export const STAGE_H = 165;

export type Ease = MotionEaseToken | 'linear' | 'hold';
export type Prop = 'x' | 'y' | 'r' | 'sx' | 'sy' | 'o';
export const PROPS: readonly Prop[] = ['x', 'y', 'r', 'sx', 'sy', 'o'];

export interface Pose {
  x: number;
  y: number;
  r: number;
  sx: number;
  sy: number;
  o: number;
}
/** A pose patch; `s` sets both scales. */
export type PoseIn = Partial<Pose> & { s?: number };

export const REST: Readonly<Pose> = { x: 0, y: 0, r: 0, sx: 1, sy: 1, o: 1 };

export interface Key {
  t: number;
  v: number;
  e: Ease;
}

export interface SceneNode {
  id: string;
  parent: string | null;
  /** SVG markup (ids carry the `§` placeholder) or '' for a pure group. */
  art: string;
  /** Box in the parent's units (top-left corner and size). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Transform origin inside the box. */
  ox: number;
  oy: number;
  /** Stacking order among siblings (higher is in front). */
  z: number;
  base: Pose;
  /** An extra class on the node (ambient CSS such as the sun's slow turn). */
  cls?: string;
  /** Extra inline style (CSS variables such as a General's blink offset). */
  css?: string;
}

export type HapticCue = 'tick' | 'thump' | 'heavy';

export interface Cue {
  /** Action time (ms). */
  t: number;
  sound?: string;
  pitchBp?: number;
  haptic?: HapticCue;
  /** Starts the Result's confetti (the celebration beat). */
  celebrate?: boolean;
}

export interface Stop {
  /** Action time of the impact (ms). */
  at: number;
  ms: number;
}

export interface Scene {
  w: number;
  h: number;
  /** Real length in ms (action length plus the hit-stops). */
  duration: number;
  nodes: readonly SceneNode[];
  keys: ReadonlyMap<string, Readonly<Partial<Record<Prop, readonly Key[]>>>>;
  /** Cues in real time, sorted. */
  cues: readonly Cue[];
  stops: readonly Stop[];
}

// ---------------------------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------------------------

/** A CSS cubic-bezier as a function of progress (Newton steps, bisection fallback). */
function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (u: number): number => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number): number => ((ay * u + by) * u + cy) * u;
  const dx = (u: number): number => (3 * ax * u + 2 * bx) * u + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const err = sx(u) - t;
      if (Math.abs(err) < 1e-6) return sy(u);
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0;
    let hi = 1;
    u = t;
    for (let i = 0; i < 40; i++) {
      const x = sx(u);
      if (Math.abs(x - t) < 1e-6) break;
      if (x < t) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return sy(u);
  };
}

const curve = (k: MotionEaseToken): ((t: number) => number) => {
  const [a, b, c, d] = MOTION_EASE[k];
  return bezier(a / 1000, b / 1000, c / 1000, d / 1000);
};

export const EASE: Readonly<Record<Ease, (t: number) => number>> = {
  linear: (t) => t,
  hold: (t) => (t >= 1 ? 1 : 0),
  standard: curve('standard'),
  enter: curve('enter'),
  exit: curve('exit'),
  out: curve('out'),
  back: curve('back'),
  anticipate: curve('anticipate'),
};

// ---------------------------------------------------------------------------------------------
// Time: hit-stops
// ---------------------------------------------------------------------------------------------

/** The action time shown at real time `t` (frozen inside a hit-stop). */
export function actionTime(stops: readonly Stop[], t: number): number {
  let shift = 0;
  for (const s of stops) {
    const start = s.at + shift;
    if (t <= start) break;
    if (t < start + s.ms) return s.at;
    shift += s.ms;
  }
  return t - shift;
}

/** The real time of action time `a` (a cue at an impact fires on the impact frame). */
export function realTime(stops: readonly Stop[], a: number): number {
  let t = a;
  for (const s of stops) if (s.at < a) t += s.ms;
  return t;
}

// ---------------------------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------------------------

/** One property at action time `a`: the keys' value, or `base` without keys. */
export function sampleKeys(keys: readonly Key[] | undefined, base: number, a: number): number {
  if (!keys || keys.length === 0) return base;
  if (a <= keys[0]!.t) return keys[0]!.v;
  const last = keys[keys.length - 1]!;
  if (a >= last.t) return last.v;
  // The first key after `a` (keys are sorted; equal times make a cut).
  let lo = 0;
  let hi = keys.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid]!.t > a) hi = mid;
    else lo = mid + 1;
  }
  const k1 = keys[lo]!;
  const k0 = keys[lo - 1]!;
  const span = k1.t - k0.t;
  if (span <= 0) return k1.v;
  return k0.v + (k1.v - k0.v) * EASE[k1.e]((a - k0.t) / span);
}

function poseOf(base: Pose, tracks: Readonly<Partial<Record<Prop, readonly Key[]>>> | undefined, a: number): Pose {
  if (!tracks) return { ...base };
  return {
    x: sampleKeys(tracks.x, base.x, a),
    y: sampleKeys(tracks.y, base.y, a),
    r: sampleKeys(tracks.r, base.r, a),
    sx: sampleKeys(tracks.sx, base.sx, a),
    sy: sampleKeys(tracks.sy, base.sy, a),
    o: sampleKeys(tracks.o, base.o, a),
  };
}

/** A node's pose at real time `t`. */
export function poseAt(scene: Scene, id: string, t: number): Pose {
  const node = scene.nodes.find((n) => n.id === id);
  return poseOf(node?.base ?? REST, scene.keys.get(id), actionTime(scene.stops, t));
}

/** True when the node animates at all (static nodes get a fixed style, no animation). */
export function animates(scene: Scene, id: string): boolean {
  const tracks = scene.keys.get(id);
  if (!tracks) return false;
  return PROPS.some((p) => {
    const k = tracks[p];
    return !!k && k.length > 1 && k.some((x) => x.v !== k[0]!.v);
  });
}

const round = (n: number, d: number): number => {
  const f = 10 ** d;
  const v = Math.round(n * f) / f;
  return Object.is(v, -0) ? 0 : v;
};

/** The CSS transform of a pose (translation in px at scale `k`). */
export function transformOf(p: Pose, k: number): string {
  return `translate(${round(p.x * k, 2)}px, ${round(p.y * k, 2)}px) rotate(${round(p.r, 2)}deg) scale(${round(p.sx, 4)}, ${round(p.sy, 4)})`;
}

/** Tolerances under which a sample is dropped as a straight-line in-between. */
const TOL: Readonly<Record<Prop, number>> = { x: 0.06, y: 0.06, r: 0.06, sx: 0.0015, sy: 0.0015, o: 0.004 };

/**
 * A node's Web Animation keyframes: the scene sampled every `stepMs` (hit-stops and every easing baked
 * in), then thinned to the samples a straight line cannot replace. Null for a static node.
 */
export function keyframesOf(scene: Scene, id: string, k: number, stepMs = 1000 / 60): Keyframe[] | null {
  if (!animates(scene, id) || scene.duration <= 0) return null;
  const base = scene.nodes.find((n) => n.id === id)?.base ?? REST;
  const tracks = scene.keys.get(id);
  const times: number[] = [];
  for (let t = 0; t < scene.duration; t += stepMs) times.push(t);
  times.push(scene.duration);
  const poses = times.map((t) => poseOf(base, tracks, actionTime(scene.stops, t)));
  const keep = [0];
  let anchor = 0;
  const fits = (a: number, b: number): boolean => {
    const ta = times[a]!;
    const tb = times[b]!;
    for (let i = a + 1; i < b; i++) {
      const u = (times[i]! - ta) / (tb - ta);
      for (const p of PROPS) {
        const want = poses[a]![p] + (poses[b]![p] - poses[a]![p]) * u;
        if (Math.abs(want - poses[i]![p]) > TOL[p]) return false;
      }
    }
    return true;
  };
  for (let j = 2; j < times.length; j++) {
    if (!fits(anchor, j)) {
      keep.push(j - 1);
      anchor = j - 1;
    }
  }
  keep.push(times.length - 1);
  return keep.map((i) => ({
    offset: round(Math.min(1, times[i]! / scene.duration), 5),
    transform: transformOf(poses[i]!, k),
    opacity: round(Math.max(0, Math.min(1, poses[i]!.o)), 3),
  }));
}

// ---------------------------------------------------------------------------------------------
// Building scenes
// ---------------------------------------------------------------------------------------------

export interface NodeIn {
  id: string;
  parent?: string;
  art?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Transform origin; defaults to the box centre. */
  ox?: number;
  oy?: number;
  z?: number;
  base?: PoseIn;
  cls?: string;
  css?: string;
}

function expand(v: PoseIn): Partial<Pose> {
  const { s, ...rest } = v;
  return s === undefined ? rest : { sx: s, sy: s, ...rest };
}

/**
 * Writes a scene. Keys of one property must come in time order (a dev error otherwise, so a mistimed
 * beat fails a test instead of jumping on screen).
 */
export class SceneBuilder {
  private readonly list: SceneNode[] = [];
  private readonly byId = new Map<string, SceneNode>();
  private readonly tracks = new Map<string, Partial<Record<Prop, Key[]>>>();
  private readonly cueList: Cue[] = [];
  private readonly stopList: Stop[] = [];
  private endAt = 0;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {}

  add(n: NodeIn): this {
    if (this.byId.has(n.id)) throw new Error(`scene: duplicate node ${n.id}`);
    if (n.parent !== undefined && !this.byId.has(n.parent)) throw new Error(`scene: unknown parent ${n.parent} of ${n.id}`);
    const node: SceneNode = {
      id: n.id,
      parent: n.parent ?? null,
      art: n.art ?? '',
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      ox: n.ox ?? n.w / 2,
      oy: n.oy ?? n.h / 2,
      z: n.z ?? 0,
      base: { ...REST, ...expand(n.base ?? {}) },
      ...(n.cls ? { cls: n.cls } : {}),
      ...(n.css ? { css: n.css } : {}),
    };
    this.list.push(node);
    this.byId.set(n.id, node);
    return this;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  private node(id: string): SceneNode {
    const n = this.byId.get(id);
    if (!n) throw new Error(`scene: unknown node ${id}`);
    return n;
  }

  /** The value a property has at action time `t` with the keys written so far. */
  value(id: string, p: Prop, t: number): number {
    return sampleKeys(this.tracks.get(id)?.[p], this.node(id).base[p], t);
  }

  private push(id: string, p: Prop, key: Key): void {
    const node = this.node(id);
    const tr = this.tracks.get(id) ?? {};
    this.tracks.set(id, tr);
    const keys = (tr[p] ??= [{ t: 0, v: node.base[p], e: 'hold' }]);
    const last = keys[keys.length - 1]!;
    if (key.t < last.t) throw new Error(`scene: ${id}.${p} key at ${key.t} after ${last.t}`);
    keys.push(key);
    this.endAt = Math.max(this.endAt, key.t);
  }

  /** Cuts to these values at `t` (no in-between). */
  set(id: string, t: number, v: PoseIn): this {
    for (const [p, val] of Object.entries(expand(v)) as [Prop, number][]) this.push(id, p, { t, v: val, e: 'hold' });
    return this;
  }

  /**
   * Animates to these values, arriving at `t` with easing `e`. With `from`, each property first holds
   * its current value until `from` (the move starts there instead of at its previous key).
   */
  to(id: string, t: number, v: PoseIn, e: Ease = 'standard', from?: number): this {
    const vals = Object.entries(expand(v)) as [Prop, number][];
    if (from !== undefined) for (const [p] of vals) this.push(id, p, { t: from, v: this.value(id, p, from), e: 'hold' });
    for (const [p, val] of vals) this.push(id, p, { t, v: val, e });
    return this;
  }

  /**
   * A wave on one property from `t0` to `t1`: `amp` around its current value with a period, fading in
   * over the first period and out by `t1` (sways, wobbles, dizzy rocking). Written as dense linear keys.
   */
  wave(id: string, p: Prop, t0: number, t1: number, amp: number, period: number, o: { decay?: boolean; phase?: number } = {}): this {
    const base = this.value(id, p, t0);
    this.push(id, p, { t: t0, v: base, e: 'hold' });
    const step = period / 8;
    for (let t = t0 + step; t < t1; t += step) {
      const u = (t - t0) / (t1 - t0);
      const env = Math.min(1, (t - t0) / period) * (o.decay ? 1 - u : 1) * Math.min(1, (t1 - t) / (period / 2));
      this.push(id, p, { t, v: base + amp * env * Math.sin(((t - t0) / period) * Math.PI * 2 + (o.phase ?? 0)), e: 'linear' });
    }
    this.push(id, p, { t: t1, v: base, e: 'linear' });
    return this;
  }

  cue(t: number, c: Omit<Cue, 't'>): this {
    this.cueList.push({ t, ...c });
    this.endAt = Math.max(this.endAt, t);
    return this;
  }

  /** Freezes the whole scene for `ms` at action time `t` (A12 hit-stop). */
  hitstop(t: number, ms: number): this {
    if (ms > 0) this.stopList.push({ at: t, ms });
    return this;
  }

  /** The latest action time written so far. */
  get end(): number {
    return this.endAt;
  }

  /** The scene lasts at least until action time `t`. */
  until(t: number): this {
    this.endAt = Math.max(this.endAt, t);
    return this;
  }

  build(): Scene {
    const stops = [...this.stopList].sort((a, b) => a.at - b.at);
    const cues = this.cueList.map((c) => ({ ...c, t: realTime(stops, c.t) })).sort((a, b) => a.t - b.t);
    return {
      w: this.w,
      h: this.h,
      duration: realTime(stops, this.endAt),
      nodes: [...this.list],
      keys: new Map([...this.tracks].map(([id, tr]) => [id, tr])),
      cues,
      stops,
    };
  }
}
