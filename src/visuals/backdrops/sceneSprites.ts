/**
 * Scene ambient motion (PLAN 2b "Layer format v2": props and sprites). A scene's `props.webp` holds
 * small Blender-rendered frames (windmill sails, a crane jib, a train, a herd, a landing shuttle) and its
 * `sprites` say how they move:
 *
 * - `loop`: a cycle in place (sails, a radar dish, a flame);
 * - `path`: keyframed travel across a layer, as a group (a loco and its wagons, a herd and its herder),
 *   hidden outside its keys, so "a train every 25 s" is a path with a 25 s period;
 * - `bob`: a gentle offset (moored boats, hovering craft);
 * - `emit`: the existing particle ambient (smoke, sparks) at a point.
 *
 * Motion runs on render time only, from a seeded phase per sprite, so it is deterministic per match and
 * independent of the sim (presentation only). Limits per half (B16): at most 6 moving sprites and 40
 * particles on High; Lite halves both. Reduce motion holds every sprite still at a good pose.
 *
 * Pure functions here (unit-tested); the backdrop view draws the instances.
 */
import type { AmbientSpec } from './silhouettes';

export type SpriteLayer = 'back' | 'far' | 'mid';

/** One member of a moving group: its frames, an offset from the group's point and a frame phase. */
export interface SpriteMember {
  frames: string[];
  dx: number;
  dy: number;
  phase: number;
}

export interface LoopSprite {
  kind: 'loop';
  layer: SpriteLayer;
  frames: string[];
  fps: number;
  at: [number, number];
  pingpong: boolean;
}

export interface BobSprite {
  kind: 'bob';
  layer: SpriteLayer;
  frames: string[];
  fps: number;
  at: [number, number];
  /** Offset amplitude (lu) in x and y, and the period. */
  amp: [number, number];
  periodS: number;
  /** A gentle roll (degrees). */
  tilt: number;
}

/**
 * A path key: time in the period (s), position (layer lu, y down), alpha, and how the segment from this
 * key eases (1 in-out, 0 linear; absent: the sprite's `ease`).
 */
export type PathKey = [number, number, number, number, (0 | 1)?];

export interface PathSprite {
  kind: 'path';
  layer: SpriteLayer;
  fps: number;
  periodS: number;
  keys: PathKey[];
  ease: 'linear' | 'inout';
  group: SpriteMember[];
  /** `motion`: mirror the group when it travels left (frames are drawn facing right). */
  face: 'motion' | 'fixed';
  /** Particles from the first member (a loco's smoke), as an emitter that travels with it. */
  trail: Omit<AmbientSpec, 'kind' | 'x' | 'y' | 'layer'> & { dx: number; dy: number } | null;
}

export interface EmitSprite {
  kind: 'emit';
  layer: SpriteLayer;
  spec: AmbientSpec;
}

export type SceneSprite = LoopSprite | BobSprite | PathSprite | EmitSprite;

/** Where one member of a sprite is at a moment (layer lu, y down). */
export interface SpriteInstance {
  frame: string;
  x: number;
  y: number;
  flip: boolean;
  alpha: number;
  /** Radians. */
  rot: number;
}

/** Per-half limits (B16; PLAN 2b "Motion limits"). */
export const SPRITE_LIMITS = { high: { sprites: 6, particles: 40 }, lite: { sprites: 3, particles: 20 } } as const;

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const pt = (v: unknown): [number, number] | null => (Array.isArray(v) && v.length >= 2 ? [num(v[0], 0), num(v[1], 0)] : null);
const layerOf = (v: unknown): SpriteLayer | null => (v === 'back' || v === 'far' || v === 'mid' ? v : null);

/** Reads the `sprites` list of a `layers.json`; sprites naming frames the atlas lacks are dropped. */
export function readSprites(v: unknown, frames: Readonly<Record<string, unknown>>): SceneSprite[] {
  if (!Array.isArray(v)) return [];
  const known = (list: unknown): string[] | null => {
    if (!Array.isArray(list) || list.length === 0) return null;
    const out = list.filter((f): f is string => typeof f === 'string');
    return out.length === list.length && out.every((f) => f in frames) ? out : null;
  };
  const out: SceneSprite[] = [];
  for (const s of v as unknown[]) {
    if (!isObj(s)) continue;
    const layer = layerOf(s['layer']);
    if (!layer) continue;
    switch (s['kind']) {
      case 'loop': {
        const fr = known(s['frames']);
        const at = pt(s['at']);
        if (fr && at) out.push({ kind: 'loop', layer, frames: fr, fps: Math.max(0.1, num(s['fps'], 6)), at, pingpong: s['pingpong'] === true });
        break;
      }
      case 'bob': {
        const fr = known(s['frames']);
        const at = pt(s['at']);
        const amp = pt(s['amp']) ?? [0, 3];
        if (fr && at) out.push({ kind: 'bob', layer, frames: fr, fps: Math.max(0.1, num(s['fps'], 4)), at, amp, periodS: Math.max(0.5, num(s['periodS'], 4)), tilt: num(s['tilt'], 0) });
        break;
      }
      case 'path': {
        const keys: PathKey[] = Array.isArray(s['keys'])
          ? (s['keys'] as unknown[])
              .filter((k): k is unknown[] => Array.isArray(k) && k.length >= 3)
              .map((k): PathKey => (k[4] === 0 || k[4] === 1 ? [num(k[0], 0), num(k[1], 0), num(k[2], 0), num(k[3], 1), k[4]] : [num(k[0], 0), num(k[1], 0), num(k[2], 0), num(k[3], 1)]))
          : [];
        keys.sort((a, b) => a[0] - b[0]);
        const group: SpriteMember[] = [];
        if (Array.isArray(s['group'])) {
          for (const m of s['group'] as unknown[]) {
            if (!isObj(m)) continue;
            const fr = known(m['frames']);
            if (fr) group.push({ frames: fr, dx: num(m['dx'], 0), dy: num(m['dy'], 0), phase: num(m['phase'], 0) });
          }
        } else {
          const fr = known(s['frames']);
          if (fr) group.push({ frames: fr, dx: 0, dy: 0, phase: 0 });
        }
        const tr = s['trail'];
        const trail =
          isObj(tr) && typeof tr['part'] === 'string'
            ? { ...(tr as Omit<AmbientSpec, 'kind' | 'x' | 'y' | 'layer'>), part: tr['part'], dx: num(tr['dx'], 0), dy: num(tr['dy'], 0) }
            : null;
        if (keys.length >= 2 && group.length > 0)
          out.push({ kind: 'path', layer, fps: Math.max(0.1, num(s['fps'], 6)), periodS: Math.max(1, num(s['periodS'], keys[keys.length - 1]![0])), keys, ease: s['ease'] === 'inout' ? 'inout' : 'linear', group, face: s['face'] === 'fixed' ? 'fixed' : 'motion', trail });
        break;
      }
      case 'emit': {
        const at = pt(s['at']);
        if (at && typeof s['part'] === 'string') out.push({ kind: 'emit', layer, spec: { ...(s as unknown as AmbientSpec), kind: 'emit', x: at[0], y: at[1], layer } });
        break;
      }
    }
  }
  return out;
}

/** A sprite's seeded phase (ms) in [0, period): the same per match seed and sprite index, never per frame. */
export function spritePhaseMs(seed: number, index: number, periodMs: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return periodMs > 0 ? h % Math.max(1, Math.round(periodMs)) : 0;
}

/** The longest cycle of a sprite (ms): its phase is drawn from it. */
export function spritePeriodMs(s: SceneSprite): number {
  switch (s.kind) {
    case 'loop':
      return (s.frames.length * (s.pingpong ? 2 : 1) * 1000) / s.fps;
    case 'bob':
      return s.periodS * 1000;
    case 'path':
      return s.periodS * 1000;
    case 'emit':
      return 0;
  }
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

function frameAt(frames: readonly string[], tS: number, fps: number, phase: number, pingpong = false): string {
  const n = frames.length;
  if (n <= 1) return frames[0] ?? '';
  const i = Math.floor(tS * fps + phase);
  if (!pingpong) return frames[((i % n) + n) % n]!;
  const m = 2 * n - 2;
  const k = ((i % m) + m) % m;
  return frames[k < n ? k : m - k]!;
}

/** The group point of a path at time `t` (s, within the period): position, alpha and travel direction. */
export function pathPoint(s: PathSprite, t: number): { x: number; y: number; alpha: number; dir: number } | null {
  const k = s.keys;
  const first = k[0]!;
  const last = k[k.length - 1]!;
  if (t < first[0] || t > last[0]) return null;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]!;
    const b = k[i + 1]!;
    if (t >= a[0] && t <= b[0]) {
      const span = b[0] - a[0];
      const u0 = span > 0 ? (t - a[0]) / span : 1;
      const eased = a[4] !== undefined ? a[4] === 1 : s.ease === 'inout';
      const u = eased ? smooth(u0) : u0;
      return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, alpha: a[3] + (b[3] - a[3]) * u, dir: Math.sign(b[1] - a[1]) };
    }
  }
  return null;
}

/** The time a still path sprite shows under Reduce motion: the middle of its longest visible span. */
export function stillPathTime(s: PathSprite): number {
  let best = 0;
  let at = (s.keys[0]![0] + s.keys[s.keys.length - 1]![0]) / 2;
  for (let i = 0; i < s.keys.length - 1; i++) {
    const a = s.keys[i]!;
    const b = s.keys[i + 1]!;
    const span = b[0] - a[0];
    if (span > best && Math.min(a[3], b[3]) > 0.5) {
      best = span;
      at = (a[0] + b[0]) / 2;
    }
  }
  return at;
}

/**
 * Every member of a sprite at render time `tMs` with its phase (ms). Reduce motion holds it still: a
 * loop on its first frame, a bob at rest, a path in the middle of its visible span.
 */
export function spriteInstances(s: SceneSprite, tMs: number, phaseMs: number, reduce = false): SpriteInstance[] {
  const t = (tMs + phaseMs) / 1000;
  switch (s.kind) {
    case 'loop':
      return [{ frame: reduce ? s.frames[0]! : frameAt(s.frames, t, s.fps, 0, s.pingpong), x: s.at[0], y: s.at[1], flip: false, alpha: 1, rot: 0 }];
    case 'bob': {
      const a = reduce ? 0 : (2 * Math.PI * t) / s.periodS;
      return [
        {
          frame: reduce ? s.frames[0]! : frameAt(s.frames, t, s.fps, 0),
          x: s.at[0] + s.amp[0] * Math.sin(a),
          y: s.at[1] + s.amp[1] * Math.sin(a + 0.6),
          flip: false,
          alpha: 1,
          rot: ((s.tilt * Math.PI) / 180) * Math.sin(a + 1.2),
        },
      ];
    }
    case 'path': {
      const tp = reduce ? stillPathTime(s) : ((t % s.periodS) + s.periodS) % s.periodS;
      const p = pathPoint(s, tp);
      if (!p || p.alpha <= 0.01) return [];
      const flip = s.face === 'motion' && p.dir < 0;
      return s.group.map((m) => ({
        frame: reduce ? m.frames[0]! : frameAt(m.frames, t, s.fps, m.phase),
        x: p.x + (flip ? -m.dx : m.dx),
        y: p.y + m.dy,
        flip,
        alpha: Math.min(1, p.alpha),
        rot: 0,
      }));
    }
    case 'emit':
      return [];
  }
}

/** Steady particles an emitter keeps alive (rate x life). */
export function emitterLoad(spec: Pick<AmbientSpec, 'rate' | 'life'>): number {
  return Math.max(0, spec.rate ?? 1) * ((spec.life ?? 2600) / 1000);
}

/**
 * Applies the per-half limits: the first moving sprites up to the cap (Lite: half), and a rate scale
 * that keeps the scene's particles (its emitters and the trails) within the cap (Lite halves rates on
 * top, in the view).
 */
export function limitSprites(list: readonly SceneSprite[], emitters: readonly Pick<AmbientSpec, 'rate' | 'life'>[], quality: 'high' | 'lite'): { sprites: SceneSprite[]; rateScale: number } {
  const lim = SPRITE_LIMITS[quality];
  const moving = list.filter((s) => s.kind !== 'emit').slice(0, lim.sprites);
  const emits = list.filter((s): s is EmitSprite => s.kind === 'emit');
  const trails = moving.filter((s): s is PathSprite => s.kind === 'path' && s.trail !== null).map((s) => s.trail!);
  const load = [...emitters, ...emits.map((e) => e.spec), ...trails].reduce((a, e) => a + emitterLoad(e), 0) * (quality === 'lite' ? 0.5 : 1);
  const rateScale = load > lim.particles ? lim.particles / load : 1;
  return { sprites: [...moving, ...emits], rateScale };
}

/** A night light's alpha at render time: a warm steady glow with a gentle flicker (steady under Reduce motion). */
export function lightAlpha(tMs: number, phaseMs: number, reduce = false): number {
  if (reduce) return 0.85;
  const t = (tMs + phaseMs) / 1000;
  return 0.78 + 0.1 * Math.sin(t * 2.3) + 0.06 * Math.sin(t * 7.1 + 1.3);
}
