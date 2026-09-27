/**
 * Screen flash (DESIGN A12 Flash column): power lands (1 frame at 30% white), your evolve (white
 * 120 ms), Last Stand fires (red 100 ms), base destroyed (200 ms). Unit flashes go through
 * `UnitView.flash`. A flash of one frame or less shows for exactly one rendered frame.
 * Reduce motion softens flashes.
 */
import { Graphics } from 'pixi.js';

/** Flashes this short or shorter last exactly one rendered frame. */
export const ONE_FRAME_MS = 17;

export class ScreenFlash {
  readonly root = new Graphics();
  /** Alpha multiplier (reduce motion softens flashes). */
  softness = 1;
  private color = 0xffffff;
  private peak = 0;
  private duration = 0;
  private remaining = 0;
  private oneFrame = false;
  private w = 0;
  private h = 0;

  constructor() {
    this.root.label = 'screenFlash';
    this.root.eventMode = 'none';
    this.root.visible = false;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  trigger(ms: number, color = 0xffffff, alpha = 0.8): void {
    if (!(ms > 0) || !(alpha > 0)) return;
    const a = Math.min(1, alpha);
    // A stronger flash replaces a weaker one; a weaker one never cuts a stronger one short.
    if (this.remaining > 0 && a * (ms / Math.max(1, this.duration)) < this.currentAlpha()) return;
    this.color = color;
    this.peak = a;
    this.duration = ms;
    this.remaining = ms;
    this.oneFrame = ms <= ONE_FRAME_MS;
  }

  /** Current alpha before softness. */
  currentAlpha(): number {
    if (this.remaining <= 0) return 0;
    if (this.oneFrame) return this.peak;
    const t = this.remaining / this.duration;
    return this.peak * t * t;
  }

  /** Draws the current frame, then advances time. */
  update(realDtMs: number): void {
    const a = this.currentAlpha() * this.softness;
    if (a > 0.001) {
      this.root.visible = true;
      this.root.clear().rect(0, 0, this.w, this.h).fill({ color: this.color, alpha: a });
    } else if (this.root.visible) {
      this.root.visible = false;
      this.root.clear();
    }
    if (this.oneFrame) this.remaining = 0;
    else this.remaining = Math.max(0, this.remaining - Math.max(0, realDtMs));
  }

  get active(): boolean {
    return this.remaining > 0;
  }

  destroy(): void {
    this.root.destroy();
  }
}
