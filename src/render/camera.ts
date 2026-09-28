/**
 * Battle camera (DESIGN A2.1 Camera).
 *
 * - By default the whole world (1,560 lu) fits the lane band with one scale; there is no scrolling.
 * - On screens narrower than 900 CSS px a pinch zooms up to 1.6x. While zoomed, the camera follows the
 *   midpoint of the two front lines with lerp k = 0.08 per frame at 60 fps, scaled by dt.
 * - A double tap resets it.
 *
 * Zoom keeps the ground line where it is, so units grow upward and stay in the lane band.
 */
import type { Pt } from '@/contracts';
import { NARROW_SCREEN_PX, WORLD_LEFT_LU, WORLD_RIGHT_LU, WORLD_WIDTH_LU, screenLayout, type ScreenLayout } from './layout';

const FRAME_MS_60 = 1000 / 60;
const WORLD_MID_LU = WORLD_LEFT_LU + WORLD_WIDTH_LU / 2;

/** Frame-rate independent form of "lerp k per 60 fps frame": the fraction to move in `dtMs`. */
export function followFraction(k: number, dtMs: number): number {
  if (dtMs <= 0) return 0;
  return 1 - Math.pow(1 - k, dtMs / FRAME_MS_60);
}

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

/** Smoothstep easing for camera pushes. */
export function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** 0..1 push amount `ms` into a push (in, hold, out). */
export function pushAmount(p: CameraPush, ms: number): number {
  if (ms <= 0) return 0;
  if (ms < p.inMs) return easeInOut(ms / Math.max(1, p.inMs));
  if (ms < p.inMs + p.holdMs || p.outMs <= 0) return 1;
  const out = (ms - p.inMs - p.holdMs) / Math.max(1, p.outMs);
  return out >= 1 ? 0 : 1 - easeInOut(out);
}

export class Camera {
  layout: ScreenLayout = screenLayout(1280, 720);
  private push: CameraPush | null = null;
  private pushMs = 0;
  /** 1 = fit; up to `maxZoom` on narrow screens. */
  zoom = 1;
  /** World x at the screen centre. */
  centerX = WORLD_MID_LU;
  private targetX = WORLD_MID_LU;

  constructor(
    private maxZoom = 1.6,
    private followK = 0.08,
  ) {}

  setTuning(maxZoom: number, followK: number): void {
    this.maxZoom = maxZoom;
    this.followK = followK;
    this.setZoom(this.zoom);
  }

  resize(width: number, height: number): void {
    this.layout = screenLayout(width, height);
    if (!this.canZoom) this.reset();
    this.clamp();
  }

  /** Pinch zoom is available only on narrow screens (A2.1). */
  get canZoom(): boolean {
    return this.layout.width < NARROW_SCREEN_PX;
  }

  get scale(): number {
    return this.layout.scale * this.zoom;
  }

  setZoom(z: number): void {
    const max = this.canZoom ? this.maxZoom : 1;
    this.zoom = Math.min(max, Math.max(1, z));
    this.clamp();
  }

  /** Double tap: back to the full fit. */
  reset(): void {
    this.zoom = 1;
    this.centerX = WORLD_MID_LU;
    this.targetX = WORLD_MID_LU;
  }

  /** Sets the follow target (world x of the front-line midpoint). */
  follow(x: number): void {
    this.targetX = x;
  }

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

  update(dtMs: number): void {
    if (this.push) {
      this.pushMs += Math.max(0, dtMs);
      const p = this.push;
      if (p.outMs > 0 && this.pushMs >= p.inMs + p.holdMs + p.outMs) this.push = null;
    }
    if (this.zoom <= 1) {
      this.centerX = WORLD_MID_LU;
      return;
    }
    this.centerX += (this.targetX - this.centerX) * followFraction(this.followK, dtMs);
    this.clamp();
  }

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
    return { scale, x: qx - p.x * scale, y: qy - p.y * scale };
  }

  private baseTransform(): CameraTransform {
    const s = this.scale;
    const L = this.layout;
    if (this.zoom <= 1) {
      return { scale: s, x: L.offsetX - WORLD_LEFT_LU * s, y: L.groundY };
    }
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

  /** Keeps the view inside the world while zoomed. */
  private clamp(): void {
    if (this.zoom <= 1) return;
    const halfW = this.layout.width / 2 / this.scale;
    const lo = WORLD_LEFT_LU + halfW;
    const hi = WORLD_RIGHT_LU - halfW;
    if (lo > hi) this.centerX = WORLD_MID_LU;
    else this.centerX = Math.min(hi, Math.max(lo, this.centerX));
  }
}
