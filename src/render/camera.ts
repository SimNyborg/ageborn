/**
 * Battle camera (DESIGN A17.4; A12 camera moments).
 *
 * The camera shows a window of the world at the device class's world scale s (A17.7) times a zoom
 * z ∈ [0.8, 1.25] (pinch or Ctrl + wheel). Visible width V = screen width / (s × z).
 *
 * - **Clamps.** The centre stays in [left + V/2, right - V/2]; when the whole world fits (V ≥ 2,360)
 *   it is fixed on the lane's middle. A drag past an end rubber-bands up to 40 px and springs back in
 *   200 ms.
 * - **Manual input** pans the view: drag 1:1, swipe momentum (≤ 3,000 lu/s, decaying e^(-4t), stops
 *   below 20 lu/s), wheel, ← / → (1,000 lu/s, Shift 2,000, full speed after 150 ms), edge scroll, the
 *   base and front jumps (350 ms eases) and minimap taps (300 ms). Any of it switches to Manual.
 * - **Auto-follow** (default On) steers toward a target centre the view computes from the fronts
 *   (A17.4 "Focus x" and "Framing"): a ±8% of V dead zone, then a critically damped spring with a
 *   350 ms half-life, capped at 900 lu/s × game speed. Manual yields at once and follow resumes after
 *   5 s without camera input (never while a pointer is down, a popover is open or a power is dragged),
 *   easing back over 600 ms. With the "Auto camera" setting off it never resumes by itself.
 * - **Pushes** (A12 moments): push in on a world point, hold, ease out. A destroyed base locks the
 *   camera: a 500 ms pan to it, then the push. Pushes never show past the world's ends.
 * - **Moments** (MR-80, ui-plan 5.1 "never block"): your evolve frames your base from anywhere: a
 *   500 ms pan and the push, at most 3 s of focus, then the camera returns (follow picks the fight
 *   up again, or a Manual camera eases back to where it was). It is skipped while the player works
 *   the camera (a drag, or Manual input in the last 2 s). Any camera input ends it at once.
 * - **Reduce motion:** no momentum, no rubber band, 150 ms eases and a 200 ms spring half-life.
 *
 * Zoom keeps the ground line where it is, so units grow upward and stay in the lane band.
 */
import type { Pt } from '@/contracts';
import { WORLD_LEFT_LU, WORLD_RIGHT_LU, WORLD_WIDTH_LU, screenLayout, type HudInsets, type ScreenLayout } from './layout';

/** Camera numbers (A17.4). Times in ms, speeds in lu/s, distances in CSS px unless named lu. */
export const CAMERA = {
  zoomMin: 0.8,
  zoomMax: 1.25,
  /** A press becomes a drag after this much travel (below it and 350 ms it stays a tap). */
  dragStartPx: 10,
  /** Swipe velocity is the average over the last 100 ms. */
  flingWindowMs: 100,
  flingMaxLuPerSec: 3000,
  flingDecayPerSec: 4,
  flingStopLuPerSec: 20,
  keyLuPerSec: 1000,
  keyFastLuPerSec: 2000,
  keyAccelMs: 150,
  /** Desktop edge scroll: within 32 px of the window edge, 300 → 1,200 lu/s at the edge. */
  edgePx: 32,
  edgeMinLuPerSec: 300,
  edgeMaxLuPerSec: 1200,
  /** Power drag edge scroll: within 48 px of the band's edge, up to 1,200 lu/s (touch too). */
  dragEdgePx: 48,
  jumpMs: 350,
  minimapMs: 300,
  resumeAfterMs: 5000,
  resumeMs: 600,
  deadZone: 0.08,
  springHalfLifeMs: 350,
  followMaxLuPerSec: 900,
  rubberPx: 40,
  rubberBackMs: 200,
  /** A destroyed base: the pan to it before the push. */
  momentPanMs: 500,
  /** A moment is skipped when the player moved the camera this recently (MR-80). */
  momentQuietMs: 2000,
  /** A moment holds the camera at most this long (MR-80: "≤ 3 s of camera focus"). */
  momentMaxMs: 3000,
  reduceMotionEaseMs: 150,
  reduceMotionHalfLifeMs: 200,
} as const;

/** The lane's middle: where the camera sits when the whole world fits. */
export const WORLD_MID_LU = WORLD_LEFT_LU + WORLD_WIDTH_LU / 2;

export interface CameraTransform {
  /** px per lu (includes zoom). */
  scale: number;
  /** Screen position of world (0, 0). */
  x: number;
  y: number;
}

/** A camera "moment" (A12): push in on a world point, hold, ease back out. */
export interface CameraPush {
  /** World point to focus. */
  x: number;
  y: number;
  /** Extra zoom at full push (1.3 = 30% closer). */
  zoom: number;
  inMs: number;
  holdMs: number;
  /** 0 = stay pushed until `release()` (the end of a match). */
  outMs: number;
}

export type CameraMode = 'follow' | 'manual';

/** Why follow may not resume right now (A17.4): a pointer is down, a popover is open, a power is dragged. */
export type CameraHold = 'pointer' | 'popover' | 'powerDrag' | 'minimap' | 'tutorial';

const FRAME_MS_60 = 1000 / 60;

/** Frame-rate independent form of "lerp k per 60 fps frame": the fraction to move in `dtMs`. */
export function followFraction(k: number, dtMs: number): number {
  if (dtMs <= 0) return 0;
  return 1 - Math.pow(1 - k, dtMs / FRAME_MS_60);
}

/** Smoothstep easing for camera pushes. */
export function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Ease-out cubic for pans: quick start, soft landing. */
export function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - (1 - c) * (1 - c) * (1 - c);
}

/** 0..1 push amount `ms` into a push (in, hold, out). */
export function pushAmount(p: CameraPush, ms: number): number {
  if (ms <= 0) return 0;
  if (ms < p.inMs) return easeInOut(ms / Math.max(1, p.inMs));
  if (ms < p.inMs + p.holdMs || p.outMs <= 0) return 1;
  const out = (ms - p.inMs - p.holdMs) / Math.max(1, p.outMs);
  return out >= 1 ? 0 : 1 - easeInOut(out);
}

/** ω of a critically damped spring whose error halves in `halfLifeMs` (e^(-ωh)(1 + ωh) = 1/2). */
export function springOmega(halfLifeMs: number): number {
  return 1.6783469900166612 / Math.max(0.001, halfLifeMs / 1000);
}

/**
 * One exact step of a critically damped spring toward a fixed `target` (stable for any dt).
 * Returns the new position and velocity.
 */
export function springStep(x: number, v: number, target: number, omega: number, dtSec: number): { x: number; v: number } {
  const d = x - target;
  const e = Math.exp(-omega * dtSec);
  const k = v + omega * d;
  return { x: target + (d + k * dtSec) * e, v: (v - omega * k * dtSec) * e };
}

interface Ease {
  from: number;
  to: number;
  t: number;
  ms: number;
  /** The mode once the ease ends. */
  then: CameraMode;
  kind: 'jump' | 'rubber' | 'resume';
}

export class Camera {
  layout: ScreenLayout = screenLayout(1280, 720);
  /** Pinch / Ctrl + wheel zoom, [0.8, 1.25]; 1 = the device class's scale. */
  zoom = 1;
  /** World x at the screen centre. */
  centerX = WORLD_MID_LU;
  mode: CameraMode = 'follow';
  /** The "Auto camera" setting: with Off, follow never resumes by itself (A17.4). */
  autoCamera = true;
  reduceMotion = false;
  /** Which side's base is "home" (the opening view shows it at the screen edge). */
  private homeSide: 0 | 1 = 0;
  private push: CameraPush | null = null;
  private pushMs = 0;
  /** The follow target centre (world x), or null for the opening view. */
  private target: number | null = null;
  private engaged = false;
  private vel = 0;
  private fling = 0;
  private idleMs = 0;
  private ease: Ease | null = null;
  private readonly holds = new Set<CameraHold>();
  private keyDir: -1 | 0 | 1 = 0;
  private keyFast = false;
  private keySpeed = 0;
  private edgeSpeed = 0;
  private dragging = false;
  /** Unclamped drag position (the rubber band shows a soft version of it). */
  private rawX = 0;
  /** A destroyed base holds the camera (no input, no follow) until the view is rebuilt. */
  private locked = false;
  /** Bumped on every manual input (the HUD's minimap and badges read it). */
  manualSeq = 0;

  constructor(private maxZoom: number = CAMERA.zoomMax) {}

  /** Live tuning (dev feel page): the zoom cap. */
  setTuning(maxZoom: number): void {
    this.maxZoom = Math.max(1, Math.min(CAMERA.zoomMax, maxZoom));
    this.setZoom(this.zoom);
  }

  /** The HUD's insets (ui-plan 3.1 world framing), or null before the HUD has measured itself. */
  private insets: HudInsets | null = null;

  resize(width: number, height: number): void {
    this.layout = screenLayout(width, height, this.insets);
    this.setZoom(this.zoom);
  }

  /** The HUD chrome's insets: the lane band becomes the space between them (see `screenLayout`). */
  setInsets(insets: HudInsets | null): void {
    const a = this.insets;
    if (a === insets || (a && insets && a.top === insets.top && a.bottom === insets.bottom)) return;
    this.insets = insets;
    const x = this.centerX;
    this.resize(this.layout.width, this.layout.height);
    this.centerX = this.clampX(x);
  }

  /** Every device can pinch or Ctrl + wheel zoom within [0.8, 1.25] (A17.4). */
  get canZoom(): boolean {
    return true;
  }

  get scale(): number {
    return this.layout.scale * this.zoom;
  }

  /** Visible world width V (lu). */
  get viewLu(): number {
    return this.layout.width / this.scale;
  }

  /** The lowest and highest allowed centre (equal when the whole world fits). */
  bounds(): { lo: number; hi: number } {
    const half = this.viewLu / 2;
    const lo = WORLD_LEFT_LU + half;
    const hi = WORLD_RIGHT_LU - half;
    if (lo >= hi) return { lo: WORLD_MID_LU, hi: WORLD_MID_LU };
    return { lo, hi };
  }

  /** Clamps a centre x to the allowed range. */
  clampX(x: number): number {
    const b = this.bounds();
    return Math.min(b.hi, Math.max(b.lo, x));
  }

  /** The visible world range [left, right] (lu), without any push. */
  viewRange(): { left: number; right: number } {
    const half = this.viewLu / 2;
    return { left: this.centerX - half, right: this.centerX + half };
  }

  /** True when world x lies inside the view (plus `marginLu` on each side). */
  inView(x: number, marginLu = 0): boolean {
    const r = this.viewRange();
    return x >= r.left - marginLu && x <= r.right + marginLu;
  }

  /** The opening view: the home base at its screen edge (A17.4). */
  homeX(): number {
    const b = this.bounds();
    return this.homeSide === 0 ? b.lo : b.hi;
  }

  /** Sets the player's side and jumps to the opening view with follow on. */
  setHome(side: 0 | 1): void {
    this.homeSide = side;
    this.centerX = this.homeX();
    this.mode = 'follow';
    this.ease = null;
    this.engaged = false;
    this.vel = 0;
  }

  setZoom(z: number): void {
    const max = Math.max(1, Math.min(CAMERA.zoomMax, this.maxZoom));
    this.zoom = Math.min(max, Math.max(CAMERA.zoomMin, z));
    this.centerX = this.clampX(this.centerX);
  }

  /** Double tap: zoom back to 1 and follow at once (A17.4). */
  reset(): void {
    this.setZoom(1);
    this.resumeFollow(true);
  }

  /** Sets the follow target: a centre x, or null for the opening view. */
  follow(x: number | null): void {
    this.target = x;
  }

  /** The follow target centre, clamped (where follow is heading). */
  followTarget(): number {
    return this.clampX(this.target ?? this.homeX());
  }

  get following(): boolean {
    return this.mode === 'follow' && !this.locked;
  }

  hold(key: CameraHold, on: boolean): void {
    // A power drag, a minimap press or a lane press ends a moment at once (MR-80).
    if (on && key !== 'popover' && key !== 'tutorial') this.endMoment();
    if (on) this.holds.add(key);
    else this.holds.delete(key);
  }

  isHeld(key: CameraHold): boolean {
    return this.holds.has(key);
  }

  // ------------------------------------------------------------------------------------------
  // Manual input
  // ------------------------------------------------------------------------------------------

  private manual(): void {
    this.endMoment();
    this.mode = 'manual';
    this.idleMs = 0;
    this.engaged = false;
    this.vel = 0;
    this.manualSeq++;
    if (this.ease && this.ease.kind !== 'jump') this.ease = null;
  }

  // ------------------------------------------------------------------------------------------
  // Moments (MR-80)
  // ------------------------------------------------------------------------------------------

  /** A moment in progress: the framed centre, its time, and where a Manual camera returns to. */
  private moment: { x: number; t: number; ms: number; back: number | null } | null = null;

  /** True while a moment frames something (tests, the view). */
  get inMoment(): boolean {
    return this.moment !== null;
  }

  /**
   * Frames world x for a moment (your evolve, MR-80): pans there (500 ms) and pushes in, for at most
   * 3 s, then returns. Returns false (nothing happens) when the player is working the camera: a drag,
   * or Manual input in the last 2 s; the caller shows the minimap flash instead.
   */
  frameMoment(x: number, push: CameraPush): boolean {
    if (this.locked || this.dragging) return false;
    if (this.mode === 'manual' && this.idleMs < CAMERA.momentQuietMs) return false;
    const cx = this.clampX(x);
    const ms = Math.min(CAMERA.momentMaxMs, push.inMs + push.holdMs);
    this.moment = { x: cx, t: 0, ms, back: this.mode === 'manual' ? this.centerX : null };
    this.fling = 0;
    this.vel = 0;
    if (Math.abs(cx - this.centerX) > 1) this.startEase(cx, CAMERA.momentPanMs, this.mode, 'jump');
    this.pushTo({ ...push, holdMs: Math.max(0, ms - push.inMs) });
    return true;
  }

  /** Ends a moment now (any camera input): the push is dropped and the camera is the player's. */
  private endMoment(): void {
    if (!this.moment) return;
    this.moment = null;
    this.push = null;
    if (this.ease?.kind === 'jump' && !this.locked) this.ease = null;
  }

  /** A drag starts (after the 10 px threshold). */
  dragStart(): void {
    if (this.locked) return;
    this.manual();
    this.ease = null;
    this.fling = 0;
    this.dragging = true;
    this.rawX = this.centerX;
    this.hold('pointer', true);
  }

  /** The pointer moved `dxPx` CSS px while dragging: the world follows the pointer 1:1. */
  dragBy(dxPx: number): void {
    if (this.locked || !this.dragging) return;
    this.manual();
    this.rawX -= dxPx / this.scale;
    this.centerX = this.rubber(this.rawX);
  }

  /** The drag ended; `vPxPerSec` is the pointer's release velocity (0 for no swipe). */
  dragEnd(vPxPerSec: number): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.hold('pointer', false);
    this.idleMs = 0;
    const v = -vPxPerSec / this.scale;
    this.fling = this.reduceMotion ? 0 : Math.max(-CAMERA.flingMaxLuPerSec, Math.min(CAMERA.flingMaxLuPerSec, v));
    if (Math.abs(this.fling) < CAMERA.flingStopLuPerSec) this.fling = 0;
    this.springBack();
  }

  /** Mouse wheel or trackpad: pans by `dxPx` CSS px of screen distance. */
  wheel(dxPx: number): void {
    if (this.locked || dxPx === 0) return;
    this.manual();
    this.ease = null;
    this.fling = 0;
    this.centerX = this.clampX(this.centerX + dxPx / this.scale);
  }

  /** ← / → held (dir) or released (0); Shift pans twice as fast. */
  setKeys(dir: -1 | 0 | 1, fast: boolean): void {
    if (this.locked) return;
    this.keyFast = fast;
    if (dir !== 0 && this.keyDir !== dir) this.keySpeed = 0;
    this.keyDir = dir;
    if (dir !== 0) {
      this.manual();
      this.ease = null;
      this.fling = 0;
    }
  }

  /** Edge scroll speed (lu/s, signed), 0 when the pointer is not at an edge. */
  setEdge(luPerSec: number): void {
    if (this.locked) return;
    this.edgeSpeed = luPerSec;
    if (luPerSec !== 0) {
      if (this.mode !== 'manual') this.manual();
      this.ease = null;
      this.fling = 0;
    }
  }

  /** Eases to centre x (clamped) and stays Manual (base button, minimap tap, badge tap). */
  jumpTo(x: number, ms: number = CAMERA.jumpMs): void {
    if (this.locked) return;
    this.manual();
    this.fling = 0;
    this.startEase(this.clampX(x), ms, 'manual', 'jump');
  }

  /** Moves the centre to x at once (minimap scrub). */
  scrubTo(x: number): void {
    if (this.locked) return;
    this.manual();
    this.ease = null;
    this.fling = 0;
    this.centerX = this.clampX(x);
  }

  /** Base button, H or Home: the opening view, Manual (A17.4). */
  jumpHome(): void {
    this.jumpTo(this.homeX());
  }

  /**
   * Front button, J or End (A17.4): eases to the follow target and turns follow on; with the Auto
   * camera setting off it jumps once and stays Manual.
   */
  jumpFront(): void {
    if (this.locked) return;
    this.fling = 0;
    this.keyDir = 0;
    this.edgeSpeed = 0;
    if (this.autoCamera) {
      this.resumeFollow(true);
      return;
    }
    this.manual();
    this.startEase(this.followTarget(), CAMERA.jumpMs, 'manual', 'jump');
  }

  /** Turns follow back on, easing into it (A17.4: 600 ms, or the 350 ms jump for a button). */
  resumeFollow(fromButton = false): void {
    if (this.locked) return;
    if (fromButton) this.endMoment();
    this.fling = 0;
    this.engaged = false;
    this.vel = 0;
    this.idleMs = 0;
    const ms = fromButton ? CAMERA.jumpMs : CAMERA.resumeMs;
    this.mode = 'follow';
    this.ease = { from: this.centerX, to: this.followTarget(), t: 0, ms: this.easeMs(ms), then: 'follow', kind: 'resume' };
  }

  /** A destroyed base (A12): pan to x over 500 ms and hold there; no input or follow afterwards. */
  lockOn(x: number): void {
    this.fling = 0;
    this.keyDir = 0;
    this.edgeSpeed = 0;
    this.dragging = false;
    this.startEase(this.clampX(x), CAMERA.momentPanMs, 'manual', 'jump');
    this.locked = true;
  }

  get isLocked(): boolean {
    return this.locked;
  }

  private easeMs(ms: number): number {
    return this.reduceMotion ? Math.min(ms, CAMERA.reduceMotionEaseMs) : ms;
  }

  private startEase(to: number, ms: number, then: CameraMode, kind: Ease['kind']): void {
    this.ease = { from: this.centerX, to, t: 0, ms: this.easeMs(ms), then, kind };
  }

  /** The rubber band: past an end, the view moves at most 40 px further, with resistance. */
  private rubber(x: number): number {
    const b = this.bounds();
    if (this.reduceMotion) return Math.min(b.hi, Math.max(b.lo, x));
    const r = CAMERA.rubberPx / this.scale;
    if (x < b.lo) return b.lo - r * (1 - Math.exp(-(b.lo - x) / r));
    if (x > b.hi) return b.hi + r * (1 - Math.exp(-(x - b.hi) / r));
    return x;
  }

  private springBack(): void {
    const c = this.clampX(this.centerX);
    if (Math.abs(c - this.centerX) > 0.01) {
      this.fling = 0;
      this.startEase(c, CAMERA.rubberBackMs, this.mode, 'rubber');
    }
  }

  // ------------------------------------------------------------------------------------------
  // Pushes (A12 moments)
  // ------------------------------------------------------------------------------------------

  /** Starts a camera moment (evolve push-in, base destroyed). A new push replaces the current one. */
  pushTo(p: CameraPush): void {
    this.push = p;
    this.pushMs = 0;
  }

  /** Ends a held push (eases out over `outMs`, or 500 ms). */
  release(outMs = 500): void {
    if (!this.push) return;
    const a = pushAmount(this.push, this.pushMs);
    // Restart as an out-only push from the current amount.
    this.push = { ...this.push, inMs: 0, holdMs: 0, outMs };
    this.pushMs = (1 - a) * outMs;
    if (a <= 0) this.push = null;
  }

  /** The current push amount, 0..1 (tests, dev pages). */
  get pushed(): number {
    return this.push ? pushAmount(this.push, this.pushMs) : 0;
  }

  // ------------------------------------------------------------------------------------------
  // Frame update
  // ------------------------------------------------------------------------------------------

  /** `dtMs` is real time (the camera moves while paused); `gameSpeed` scales the follow cap. */
  update(dtMs: number, gameSpeed = 1): void {
    const dtRaw = Math.max(0, dtMs);
    const dt = dtRaw / 1000;
    if (this.push) {
      this.pushMs += dtRaw;
      const p = this.push;
      if (p.outMs > 0 && this.pushMs >= p.inMs + p.holdMs + p.outMs) this.push = null;
    }
    if (this.moment) {
      const mo = this.moment;
      mo.t += dtRaw;
      if (mo.t >= mo.ms) {
        // The moment is over: follow picks the fight up again (its spring), a Manual camera eases back.
        this.moment = null;
        if (mo.back !== null && !this.locked) this.startEase(this.clampX(mo.back), CAMERA.momentPanMs, 'manual', 'jump');
      }
    }
    if (this.ease) {
      const e = this.ease;
      e.t += dtRaw;
      // A resume eases toward the live target, so it lands exactly where follow continues.
      if (e.kind === 'resume') e.to = this.followTarget();
      const k = e.t / Math.max(1, e.ms);
      this.centerX = e.from + (e.to - e.from) * (e.kind === 'resume' ? easeInOut(k) : easeOutCubic(k));
      if (k >= 1) {
        this.centerX = e.to;
        this.ease = null;
        this.mode = e.then;
        this.idleMs = 0;
      }
      if (e.kind !== 'rubber') return;
    }
    if (this.locked) return;
    if (this.mode === 'manual') this.updateManual(dtRaw, dt);
    else this.updateFollow(dt, gameSpeed);
  }

  private updateManual(dtMs: number, dt: number): void {
    let active = this.dragging;
    if (this.keyDir !== 0) {
      const top = this.keyFast ? CAMERA.keyFastLuPerSec : CAMERA.keyLuPerSec;
      this.keySpeed = Math.min(top, this.keySpeed + (top * dtMs) / CAMERA.keyAccelMs);
      this.centerX = this.clampX(this.centerX + this.keyDir * this.keySpeed * dt);
      active = true;
    } else {
      this.keySpeed = 0;
    }
    if (this.edgeSpeed !== 0) {
      this.centerX = this.clampX(this.centerX + this.edgeSpeed * dt);
      active = true;
    }
    if (this.fling !== 0 && !this.dragging) {
      const next = this.centerX + this.fling * dt;
      const c = this.clampX(next);
      this.centerX = c;
      this.fling = c !== next ? 0 : this.fling * Math.exp(-CAMERA.flingDecayPerSec * dt);
      if (Math.abs(this.fling) < CAMERA.flingStopLuPerSec) this.fling = 0;
      active = true;
    }
    if (!this.dragging && !this.ease) this.centerX = this.clampX(this.centerX);
    if (active || this.holds.size > 0 || this.ease) {
      this.idleMs = 0;
      return;
    }
    this.idleMs += dtMs;
    if (this.autoCamera && this.idleMs >= CAMERA.resumeAfterMs) this.resumeFollow(false);
  }

  private updateFollow(dt: number, gameSpeed: number): void {
    // A moment holds the framing on its point; follow resumes when it ends.
    const target = this.moment ? this.moment.x : this.followTarget();
    const V = this.viewLu;
    const err = target - this.centerX;
    if (!this.engaged && Math.abs(err) > CAMERA.deadZone * V) this.engaged = true;
    if (!this.engaged) {
      this.centerX = this.clampX(this.centerX);
      return;
    }
    const omega = springOmega(this.reduceMotion ? CAMERA.reduceMotionHalfLifeMs : CAMERA.springHalfLifeMs);
    const s = springStep(this.centerX, this.vel, target, omega, dt);
    const cap = CAMERA.followMaxLuPerSec * Math.max(1, gameSpeed);
    const step = Math.max(-cap * dt, Math.min(cap * dt, s.x - this.centerX));
    this.centerX = this.clampX(this.centerX + step);
    this.vel = Math.max(-cap, Math.min(cap, s.v));
    // Settled: stop until the target leaves the dead zone again.
    if (Math.abs(target - this.centerX) < 0.5 && Math.abs(this.vel) < 5) {
      this.centerX = this.clampX(target);
      this.engaged = false;
      this.vel = 0;
    }
  }

  // ------------------------------------------------------------------------------------------
  // Transforms
  // ------------------------------------------------------------------------------------------

  /** The transform for the world container (with any camera push applied). */
  transform(): CameraTransform {
    const base = this.baseTransform();
    const a = this.push ? pushAmount(this.push, this.pushMs) : 0;
    if (!this.push || a <= 0) return base;
    const p = this.push;
    const L = this.layout;
    // The focus point moves toward the middle of the lane band while the world scales around it.
    const sx = base.x + p.x * base.scale;
    const sy = base.y + p.y * base.scale;
    const qx = sx + (L.width / 2 - sx) * a * 0.6;
    const qy = sy + (L.bandY + L.bandH * 0.52 - sy) * a * 0.5;
    const scale = base.scale * (1 + (p.zoom - 1) * a);
    // Never show past the world's ends (the push must not reveal the canvas background).
    let x = qx - p.x * scale;
    const lo = L.width - WORLD_RIGHT_LU * scale;
    const hi = -WORLD_LEFT_LU * scale;
    if (lo <= hi) x = Math.min(hi, Math.max(lo, x));
    // The push never lowers the ground line under the tray (unit feet stay above HUD chrome, 3.1).
    return { scale, x, y: Math.min(qy - p.y * scale, L.groundY) };
  }

  private baseTransform(): CameraTransform {
    const s = this.scale;
    const L = this.layout;
    return { scale: s, x: L.width / 2 - this.centerX * s, y: L.groundY };
  }

  worldToScreen(x: number, y: number): Pt {
    const t = this.transform();
    return { x: t.x + x * t.scale, y: t.y + y * t.scale };
  }

  screenToWorld(sx: number, sy: number): Pt {
    const t = this.transform();
    return { x: (sx - t.x) / t.scale, y: (sy - t.y) / t.scale };
  }

  /** True when a screen point is inside the lane band. */
  inLaneBand(sy: number): boolean {
    return sy >= this.layout.bandY && sy <= this.layout.bandY + this.layout.bandH;
  }
}
