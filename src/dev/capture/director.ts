/**
 * The capture camera (dev capture page): a scripted director for trailer renders. Pure math, no Pixi.
 *
 * The battle camera (`render/camera.ts`) frames the lane for a player: device-class scales, clamps to
 * a zoom of 0.8-1.25 and a HUD band. A trailer wants other framings (a close-up at twice the game's
 * scale, a square or tall canvas, the ground line low in the frame), so the capture page replaces the
 * view camera's transform with this director's.
 *
 * - **Framing.** A framing is a world centre `x` (lu), a visible width `w` (lu) and the ground line's
 *   height `ground` as a share of the canvas height. `framingTransform` turns it into the world
 *   container's transform (CSS px per lu and the screen position of world (0, 0)), never showing past
 *   the world's ends.
 * - **Shots.** `fight` follows the battle: the midpoint of both fronts, zoomed to fit the gap between
 *   them (within `wMin`..`wMax`); `range` frames [x0, x1]; `look` holds a centre and width; `track`
 *   follows one unit; `base` frames a side's base. A new shot either cuts, eases over `ms` (smoothstep,
 *   landing on the live target) or springs (critically damped, `halfLife`), and moving targets keep
 *   being followed by the spring afterwards. `drift` adds a slow push in (negative) or pull out
 *   (positive) in lu per second of output time.
 * - The director runs in output time (the frames of the video), so camera moves keep their pace when
 *   the battle plays in slow motion.
 *
 * World units are lu; screen units CSS px. World y is 0 on the ground line and negative upward.
 */

/** World x range the camera may show: from behind the left base to behind the right base. */
export interface WorldBounds {
  left: number;
  right: number;
}

export interface Framing {
  /** World x at the canvas centre (lu). */
  x: number;
  /** Visible world width (lu). */
  w: number;
  /** Ground line height as a share of the canvas height, from the top (0.78 = 78% down). */
  ground: number;
}

export interface CameraXform {
  /** CSS px per lu. */
  scale: number;
  /** Screen position of world (0, 0) in CSS px. */
  x: number;
  y: number;
}

/** What a shot can look at, sampled once per frame from the battle (world lu). */
export interface SceneSample {
  /** Side 0's frontmost unit x and side 1's frontmost unit x (null when a side has no units). */
  fronts: { left: number | null; right: number | null };
  /** Every live unit's x per side (for the army framing). */
  units: readonly { id: number; side: 0 | 1; x: number }[];
  /** The two bases' centre x. */
  bases: readonly [number, number];
}

export type Move =
  /** Jump to the target at once. */
  | { move: 'cut' }
  /** Smoothstep from the current framing to the (live) target over `ms`. */
  | { move: 'ease'; ms: number }
  /** Critically damped spring toward the target, its error halving every `halfLife` ms. */
  | { move: 'spring'; halfLife: number };

interface ShotBase {
  /** How to get there (default: a 600 ms ease). */
  how?: Move;
  /** Ground line share for this shot (default: keep the current one). */
  ground?: number;
  /** Slow push in (< 0) or pull out (> 0), lu of width per second of output time, once arrived. */
  drift?: number;
  /** Spring half-life (ms) used to keep following a moving target once the move has arrived (default 450). */
  follow?: number;
}

export type Shot =
  | (ShotBase & { kind: 'fight'; wMin?: number; wMax?: number; margin?: number })
  | (ShotBase & { kind: 'range'; x0: number; x1: number })
  | (ShotBase & { kind: 'look'; x: number; w: number })
  | (ShotBase & { kind: 'track'; id: number; w: number; lead?: number })
  | (ShotBase & { kind: 'base'; side: 0 | 1; w: number; inset?: number })
  | (ShotBase & { kind: 'army'; side: 0 | 1; wMin?: number; wMax?: number; margin?: number });

/** Defaults of the `fight` shot: a close battle at about the game's phone framing. */
export const FIGHT_DEFAULTS = { wMin: 420, wMax: 1100, margin: 150 } as const;
const DEFAULT_EASE_MS = 600;
const DEFAULT_FOLLOW_MS = 450;
/** Narrowest and widest framings the director allows (lu). */
export const MIN_W = 120;

export function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Smoother ease for camera moves: zero velocity and acceleration at both ends. */
export function smootherstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/** ω of a critically damped spring whose error halves in `halfLifeMs`. */
export function springOmega(halfLifeMs: number): number {
  return 1.6783469900166612 / Math.max(0.001, halfLifeMs / 1000);
}

/** One exact step of a critically damped spring toward a fixed `target` (stable for any dt). */
export function springStep(x: number, v: number, target: number, omega: number, dtSec: number): { x: number; v: number } {
  const d = x - target;
  const e = Math.exp(-omega * dtSec);
  const k = v + omega * d;
  return { x: target + (d + k * dtSec) * e, v: (v - omega * k * dtSec) * e };
}

/** Clamps a framing so the view never shows past the world's ends (the whole world when it is wider). */
export function clampFraming(f: Framing, bounds: WorldBounds): Framing {
  const span = bounds.right - bounds.left;
  const w = Math.max(MIN_W, Math.min(span, f.w));
  const lo = bounds.left + w / 2;
  const hi = bounds.right - w / 2;
  const x = lo >= hi ? (bounds.left + bounds.right) / 2 : Math.min(hi, Math.max(lo, f.x));
  return { x, w, ground: Math.max(0.05, Math.min(0.98, f.ground)) };
}

/** The world container's transform for a framing on a canvas of `width` x `height` CSS px. */
export function framingTransform(f: Framing, width: number, height: number): CameraXform {
  const scale = width / Math.max(1, f.w);
  return { scale, x: width / 2 - f.x * scale, y: height * f.ground };
}

/** The framing a shot wants right now (before clamping). `cur` is the current framing (kept values). */
export function shotTarget(shot: Shot, scene: SceneSample, cur: Framing): Framing {
  const ground = shot.ground ?? cur.ground;
  switch (shot.kind) {
    case 'look':
      return { x: shot.x, w: shot.w, ground };
    case 'range':
      return { x: (shot.x0 + shot.x1) / 2, w: Math.abs(shot.x1 - shot.x0), ground };
    case 'base': {
      // the base sits `inset` of the width from the frame's outer edge, looking into the lane
      const bx = scene.bases[shot.side];
      const inset = shot.inset ?? 0.5;
      const dir = shot.side === 0 ? 1 : -1;
      return { x: bx + dir * (0.5 - inset) * shot.w, w: shot.w, ground };
    }
    case 'track': {
      const u = scene.units.find((v) => v.id === shot.id);
      if (!u) return { ...cur, ground };
      const dir = u.side === 0 ? 1 : -1;
      return { x: u.x + dir * (shot.lead ?? 0.12) * shot.w, w: shot.w, ground };
    }
    case 'army': {
      const xs = scene.units.filter((u) => u.side === shot.side).map((u) => u.x);
      if (xs.length === 0) return { ...cur, ground };
      const margin = shot.margin ?? FIGHT_DEFAULTS.margin;
      const lo = Math.min(...xs) - margin;
      const hi = Math.max(...xs) + margin;
      const w = Math.max(shot.wMin ?? FIGHT_DEFAULTS.wMin, Math.min(shot.wMax ?? FIGHT_DEFAULTS.wMax, hi - lo));
      return { x: (lo + hi) / 2, w, ground };
    }
    case 'fight': {
      const wMin = shot.wMin ?? FIGHT_DEFAULTS.wMin;
      const wMax = shot.wMax ?? FIGHT_DEFAULTS.wMax;
      const margin = shot.margin ?? FIGHT_DEFAULTS.margin;
      const { left, right } = scene.fronts;
      if (left === null && right === null) return { ...cur, ground };
      if (left === null || right === null) {
        // one army alone: frame its front, looking toward the enemy
        const front = (left ?? right) as number;
        const dir = left !== null ? 1 : -1;
        return { x: front + dir * 0.15 * wMin, w: wMin, ground };
      }
      const gap = Math.abs(right - left);
      const w = Math.max(wMin, Math.min(wMax, gap + 2 * margin));
      return { x: (left + right) / 2, w, ground };
    }
  }
}

/**
 * The director: holds the current framing and moves it toward the active shot each frame.
 */
export class CameraDirector {
  private cur: Framing;
  private vel = { x: 0, lw: 0, g: 0 };
  private shot: Shot;
  /** The move in progress: where it started and how far along it is (ms). */
  private from: Framing;
  private t = 0;
  private arrived = true;
  private driftW = 0;

  constructor(
    start: Framing,
    private readonly bounds: WorldBounds,
  ) {
    this.cur = clampFraming(start, bounds);
    this.from = this.cur;
    this.shot = { kind: 'look', x: this.cur.x, w: this.cur.w, how: { move: 'cut' } };
  }

  get framing(): Framing {
    return this.cur;
  }

  get activeShot(): Shot {
    return this.shot;
  }

  /** Starts a shot. `cut` jumps on the next update; `ease` and `spring` move from where the camera is. */
  setShot(shot: Shot): void {
    this.shot = shot;
    this.from = this.cur;
    this.t = 0;
    this.arrived = false;
    this.driftW = 0;
    if ((shot.how?.move ?? 'ease') !== 'spring') this.vel = { x: 0, lw: 0, g: 0 };
  }

  /** Advances `dtMs` of output time and returns the clamped framing. */
  update(dtMs: number, scene: SceneSample): Framing {
    const dt = Math.max(0, dtMs);
    const how: Move = this.shot.how ?? { move: 'ease', ms: DEFAULT_EASE_MS };
    let target = clampFraming(shotTarget(this.shot, scene, this.cur), this.bounds);
    if (this.arrived && this.shot.drift) {
      this.driftW += (this.shot.drift * dt) / 1000;
      target = clampFraming({ ...target, w: target.w + this.driftW }, this.bounds);
    }
    if (!this.arrived && how.move === 'cut') {
      this.cur = target;
      this.arrived = true;
    } else if (!this.arrived && how.move === 'ease') {
      this.t += dt;
      const k = smootherstep(this.t / Math.max(1, how.ms));
      // width blends in log space, so a zoom feels even from start to end
      const lw = Math.log(this.from.w) + (Math.log(target.w) - Math.log(this.from.w)) * k;
      this.cur = clampFraming(
        { x: this.from.x + (target.x - this.from.x) * k, w: Math.exp(lw), ground: this.from.ground + (target.ground - this.from.ground) * k },
        this.bounds,
      );
      if (this.t >= how.ms) {
        this.cur = target;
        this.arrived = true;
      }
    } else {
      // a spring move, or following a moving target after arriving
      const half = !this.arrived && how.move === 'spring' ? how.halfLife : (this.shot.follow ?? DEFAULT_FOLLOW_MS);
      const om = springOmega(half);
      const s = dt / 1000;
      const x = springStep(this.cur.x, this.vel.x, target.x, om, s);
      const lw = springStep(Math.log(this.cur.w), this.vel.lw, Math.log(target.w), om, s);
      const g = springStep(this.cur.ground, this.vel.g, target.ground, om, s);
      this.vel = { x: x.v, lw: lw.v, g: g.v };
      this.cur = clampFraming({ x: x.x, w: Math.exp(lw.x), ground: g.x }, this.bounds);
      if (!this.arrived && Math.abs(target.x - this.cur.x) < 1 && Math.abs(target.w - this.cur.w) < 1) this.arrived = true;
    }
    return this.cur;
  }
}
