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

export class Camera {
  layout: ScreenLayout = screenLayout(1280, 720);
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

  update(dtMs: number): void {
    if (this.zoom <= 1) {
      this.centerX = WORLD_MID_LU;
      return;
    }
    this.centerX += (this.targetX - this.centerX) * followFraction(this.followK, dtMs);
    this.clamp();
  }

  /** The transform for the world container. */
  transform(): CameraTransform {
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
