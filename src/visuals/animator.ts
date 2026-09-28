/**
 * Clip playback for procedural puppets (DESIGN A11 Clip contract, B5). Pure TypeScript, no Pixi.
 *
 * Three layers mix every frame:
 *  1. a base loop (idle, walk, stun, victory),
 *  2. a one-shot action (spawn, attack, ability, die, custom clips) that cross-fades over the bones it
 *     animates and returns to the base loop when done (die holds its last frame),
 *  3. an additive hit recoil.
 * Procedural helpers (walk cycles, bobs, spinning wheels) add on top, and small idle flourishes
 * (blink, weapon twirl) run from a cosmetic RNG.
 *
 * Timing: `play('attack', { impactAtMs })` time-warps the clip so its authored `impactAt` lands exactly
 * `impactAtMs` after the call (the sim's impact tick), and the recovery fills the rest of
 * `durationMs` (DESIGN B5 "The sim owns timing").
 */
import { mulberry32, type CosmeticRng } from '@/core/rng';
import { procDeltas, type ProcContext } from './clips/procedural';
import { CLIP_TIMING } from './style';
import type { BoneDelta, ClipDef, Ease, Key } from './types';

export interface PlayOptions {
  durationMs?: number;
  impactAtMs?: number;
  loop?: boolean;
}

/** Clip lookup for one visual: clip name → clip definition (already resolved from the manifest). */
export type ClipResolver = (name: string) => { clip: ClipDef; durationMs: number; loop: boolean } | undefined;

const BASE_CLIPS = new Set(['idle', 'walk', 'stun', 'victory']);
const FADE_MS = 70;

interface Playing {
  name: string;
  clip: ClipDef;
  t: number;
  durationMs: number;
  impactAtMs: number | null;
  loop: boolean;
  hold: boolean;
}

export function ease(e: Ease | undefined, t: number): number {
  switch (e) {
    case 'in':
      return t * t;
    case 'out':
      return 1 - (1 - t) * (1 - t);
    case 'inOut':
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    case 'outBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case 'step':
      return t < 1 ? 0 : 1;
    default:
      return t;
  }
}

function keyVal(k: Key | undefined, p: 'r' | 'x' | 'y' | 'sx' | 'sy'): number {
  const neutral = p === 'sx' || p === 'sy' ? 1 : 0;
  return k?.[p] ?? neutral;
}

/** Samples one bone track at normalised time u. */
export function sampleTrack(keys: readonly Key[], u: number): BoneDelta {
  if (keys.length === 0) return { r: 0, x: 0, y: 0, sx: 1, sy: 1 };
  let i = 0;
  while (i < keys.length && (keys[i]?.t ?? 0) <= u) i++;
  const k1 = keys[Math.min(i, keys.length - 1)];
  const k0 = i === 0 ? undefined : keys[i - 1];
  if (!k0) return { r: keyVal(k1, 'r'), x: keyVal(k1, 'x'), y: keyVal(k1, 'y'), sx: keyVal(k1, 'sx'), sy: keyVal(k1, 'sy') };
  if (i >= keys.length || !k1 || k1 === k0) {
    return { r: keyVal(k0, 'r'), x: keyVal(k0, 'x'), y: keyVal(k0, 'y'), sx: keyVal(k0, 'sx'), sy: keyVal(k0, 'sy') };
  }
  const span = k1.t - k0.t;
  const f = ease(k1.e, span <= 0 ? 1 : (u - k0.t) / span);
  const lerp = (p: 'r' | 'x' | 'y' | 'sx' | 'sy'): number => keyVal(k0, p) + (keyVal(k1, p) - keyVal(k0, p)) * f;
  return { r: lerp('r'), x: lerp('x'), y: lerp('y'), sx: lerp('sx'), sy: lerp('sy') };
}

/** Normalised clip time for a playback time, honouring the impact warp. */
export function clipU(p: { t: number; durationMs: number; impactAtMs: number | null; loop: boolean; clip: ClipDef }): number {
  const d = Math.max(1, p.durationMs);
  if (p.loop) return (((p.t % d) + d) % d) / d;
  const t = Math.min(p.t, d);
  const ia = p.clip.impactAt;
  if (p.impactAtMs !== null && ia !== undefined && ia > 0 && ia < 1) {
    const im = Math.max(1, Math.min(p.impactAtMs, d - 1));
    return t <= im ? (ia * t) / im : ia + ((1 - ia) * (t - im)) / Math.max(1, d - im);
  }
  return t / d;
}

export function composeDelta(a: BoneDelta, b: BoneDelta): BoneDelta {
  return { r: a.r + b.r, x: a.x + b.x, y: a.y + b.y, sx: a.sx * b.sx, sy: a.sy * b.sy };
}

export function lerpDelta(a: BoneDelta, b: BoneDelta, w: number): BoneDelta {
  return {
    r: a.r + (b.r - a.r) * w,
    x: a.x + (b.x - a.x) * w,
    y: a.y + (b.y - a.y) * w,
    sx: a.sx + (b.sx - a.sx) * w,
    sy: a.sy + (b.sy - a.sy) * w,
  };
}

export class Animator {
  private base: Playing | null = null;
  private action: Playing | null = null;
  private hit: Playing | null = null;
  private frozenMs = 0;
  private walkPhase = 0;
  private movedSinceUpdate = 0;
  private distanceDriven = false;
  private idleMs = 0;
  private rng: CosmeticRng;
  private nextBlinkMs: number;
  private blinkT = -1;
  private nextTwirlMs: number;
  private twirlT = -1;
  private readonly out = new Map<string, BoneDelta>();
  /** Whole-puppet opacity from the current clips. */
  alpha = 1;
  /** Total elapsed playback time (for procedural bobs). */
  private clockMs = 0;

  constructor(
    private readonly resolve: ClipResolver,
    private readonly ctx: ProcContext,
    seed: number,
  ) {
    this.rng = mulberry32(seed);
    this.nextBlinkMs = this.between(CLIP_TIMING.blinkEveryMs);
    this.nextTwirlMs = this.between(CLIP_TIMING.twirlEveryMs);
    this.play('idle');
  }

  private between([a, b]: readonly [number, number]): number {
    return a + this.rng.next() * (b - a);
  }

  /** The current base loop and action names (for debugging and tests). */
  get state(): { base: string | null; action: string | null; frozen: boolean } {
    return { base: this.base?.name ?? null, action: this.action?.name ?? null, frozen: this.frozenMs > 0 };
  }

  /** True once a held clip (die) has finished. */
  get finished(): boolean {
    return this.action !== null && this.action.hold && this.action.t >= this.action.durationMs;
  }

  play(name: string, o: PlayOptions = {}): boolean {
    const r = this.resolve(name);
    if (!r) return false;
    const loop = o.loop ?? r.loop;
    let durationMs = o.durationMs ?? r.durationMs;
    const impactAtMs = o.impactAtMs ?? null;
    if (o.durationMs === undefined && impactAtMs !== null && r.clip.impactAt !== undefined) {
      // Keep the authored recovery length after the (possibly moved) impact.
      durationMs = impactAtMs + r.durationMs * (1 - r.clip.impactAt);
    }
    const p: Playing = { name, clip: r.clip, t: 0, durationMs: Math.max(1, durationMs), impactAtMs, loop, hold: name === 'die' };
    if (name === 'hit') {
      this.hit = p;
      return true;
    }
    if (this.action?.hold) return true; // dying: nothing else plays
    if (BASE_CLIPS.has(name) && o.loop !== false) {
      if (this.base?.name !== name) {
        this.base = p;
        if (name === 'walk' && o.durationMs === undefined) this.base.durationMs = this.ctx.strideLu / (this.ctx.speedLuPerSec / 1000);
      } else if (o.durationMs !== undefined) {
        this.base.durationMs = p.durationMs;
      }
      return true;
    }
    this.action = p;
    return true;
  }

  /** Local hitstop: animation time pauses (DESIGN A12). */
  freeze(ms: number): void {
    this.frozenMs = Math.max(this.frozenMs, ms);
  }

  get frozen(): boolean {
    return this.frozenMs > 0;
  }

  /** Reports ground distance travelled (lu) so the walk cycle matches speed (no foot sliding). */
  moved(distanceLu: number): void {
    const d = Math.abs(distanceLu);
    if (d > 0.001) {
      this.movedSinceUpdate += d;
      this.distanceDriven = true;
    }
  }

  update(dtMs: number): void {
    if (this.frozenMs > 0) {
      const used = Math.min(this.frozenMs, dtMs);
      this.frozenMs -= used;
      dtMs -= used;
      this.movedSinceUpdate = 0;
      if (dtMs <= 0) return;
    }
    this.clockMs += dtMs;
    if (this.base) {
      this.base.t += dtMs;
      if (this.base.name === 'walk') {
        const step = this.distanceDriven ? this.movedSinceUpdate / this.ctx.strideLu : dtMs / this.base.durationMs;
        this.walkPhase = (this.walkPhase + step) % 1;
      }
    }
    this.movedSinceUpdate = 0;
    if (this.action) {
      this.action.t += dtMs;
      if (!this.action.loop && !this.action.hold && this.action.t >= this.action.durationMs) this.action = null;
    }
    if (this.hit) {
      this.hit.t += dtMs;
      if (this.hit.t >= this.hit.durationMs) this.hit = null;
    }
    // idle flourishes
    const idle = this.base?.name === 'idle' && !this.action;
    this.idleMs = idle ? this.idleMs + dtMs : 0;
    if (this.blinkT >= 0) {
      this.blinkT += dtMs;
      if (this.blinkT > 140) this.blinkT = -1;
    } else if (this.clockMs >= this.nextBlinkMs) {
      this.blinkT = 0;
      this.nextBlinkMs = this.clockMs + this.between(CLIP_TIMING.blinkEveryMs);
    }
    if (this.twirlT >= 0) {
      this.twirlT += dtMs;
      if (this.twirlT > 520 || !idle) this.twirlT = -1;
    } else if (idle && this.idleMs >= this.nextTwirlMs) {
      this.twirlT = 0;
      this.idleMs = 0;
      this.nextTwirlMs = this.between(CLIP_TIMING.twirlEveryMs);
    }
  }

  /** Current pose deltas per bone (reused map; read before the next call). */
  sample(): ReadonlyMap<string, BoneDelta> {
    const out = this.out;
    out.clear();
    this.alpha = 1;
    const base = this.base;
    if (base) {
      const u = base.name === 'walk' ? this.walkPhase : clipU(base);
      for (const [bone, keys] of Object.entries(base.clip.tracks)) out.set(bone, sampleTrack(keys, u));
      for (const [bone, d] of procDeltas(base.clip.proc ?? [], this.ctx, base.name === 'walk' ? this.walkPhase : u, this.clockMs)) {
        const prev = out.get(bone);
        out.set(bone, prev ? composeDelta(prev, d) : d);
      }
    }
    const act = this.action;
    if (act) {
      const u = clipU(act);
      const blendIn = act.clip.blendInMs ?? FADE_MS;
      const wIn = blendIn > 0 ? Math.min(1, act.t / blendIn) : 1;
      const w = act.hold ? wIn : Math.min(wIn, (act.durationMs - act.t) / FADE_MS);
      for (const [bone, keys] of Object.entries(act.clip.tracks)) {
        const d = sampleTrack(keys, u);
        const prev = out.get(bone) ?? { r: 0, x: 0, y: 0, sx: 1, sy: 1 };
        out.set(bone, lerpDelta(prev, d, Math.max(0, w)));
      }
      for (const [bone, d] of procDeltas(act.clip.proc ?? [], this.ctx, u, this.clockMs)) {
        const prev = out.get(bone);
        out.set(bone, prev ? composeDelta(prev, d) : d);
      }
      if (act.clip.alpha) this.alpha = sampleScalar(act.clip.alpha, u);
    }
    const hit = this.hit;
    if (hit) {
      const u = clipU(hit);
      for (const [bone, keys] of Object.entries(hit.clip.tracks)) {
        const d = sampleTrack(keys, u);
        const prev = out.get(bone);
        out.set(bone, prev ? composeDelta(prev, d) : d);
      }
    }
    if (this.blinkT >= 0 && this.ctx.bones.has('eyes')) {
      const k = 1 - Math.sin((Math.min(this.blinkT, 140) / 140) * Math.PI) * 0.9;
      const prev = out.get('eyes') ?? { r: 0, x: 0, y: 0, sx: 1, sy: 1 };
      out.set('eyes', { ...prev, sy: prev.sy * k });
    }
    if (this.twirlT >= 0 && this.ctx.twirlBone && this.ctx.bones.has(this.ctx.twirlBone)) {
      const f = ease('inOut', Math.min(1, this.twirlT / 520));
      const prev = out.get(this.ctx.twirlBone) ?? { r: 0, x: 0, y: 0, sx: 1, sy: 1 };
      out.set(this.ctx.twirlBone, { ...prev, r: prev.r - f * 360 });
    }
    return out;
  }
}

export function sampleScalar(keys: readonly { t: number; v: number }[], u: number): number {
  if (keys.length === 0) return 1;
  let i = 0;
  while (i < keys.length && (keys[i]?.t ?? 0) <= u) i++;
  const k1 = keys[Math.min(i, keys.length - 1)];
  const k0 = i === 0 ? undefined : keys[i - 1];
  if (!k0) return k1?.v ?? 1;
  if (!k1 || i >= keys.length) return k0.v;
  const span = k1.t - k0.t;
  return k0.v + (k1.v - k0.v) * (span <= 0 ? 1 : (u - k0.t) / span);
}
