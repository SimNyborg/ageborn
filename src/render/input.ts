/**
 * Canvas pointer input for the battle view (DESIGN A2.1 Camera, A2.8 mounts, B6 HUD):
 *
 * - a tap is offered to the view (turret mounts); an unused double tap resets the camera,
 * - two pointers pinch-zoom (narrow screens only; the camera enforces that),
 * - positions are CSS px relative to the element, the same space as the view layout.
 */
import type { Pt } from '@/contracts';
import type { Camera } from './camera';

export const TAP_MAX_MOVE_PX = 10;
export const TAP_MAX_MS = 350;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 40;

export interface InputHost {
  readonly camera: Camera;
  /** Returns true when the tap was used (for example on a mount). */
  tap(screen: Pt, shift: boolean): boolean;
}

interface Down {
  x: number;
  y: number;
  t: number;
  moved: number;
  /** Current position. */
  cx?: number;
  cy?: number;
}

/** Pure tap / double-tap classifier (tested without a DOM). */
export class TapTracker {
  private last: { x: number; y: number; t: number } | null = null;

  /** Classifies a completed press. Returns 'tap', 'double' or null (a drag or a long press). */
  release(down: Down, upT: number): 'tap' | 'double' | null {
    if (down.moved > TAP_MAX_MOVE_PX || upT - down.t > TAP_MAX_MS) return null;
    const prev = this.last;
    if (prev && upT - prev.t <= DOUBLE_TAP_MS && Math.hypot(prev.x - down.x, prev.y - down.y) <= DOUBLE_TAP_PX) {
      this.last = null;
      return 'double';
    }
    this.last = { x: down.x, y: down.y, t: upT };
    return 'tap';
  }

  /** Forget the last tap (it was consumed, so it cannot start a double tap). */
  forget(): void {
    this.last = null;
  }
}

export class BattleInput {
  private readonly downs = new Map<number, Down>();
  private readonly taps = new TapTracker();
  private pinch: { dist: number; zoom: number } | null = null;
  private readonly off: (() => void)[] = [];

  constructor(
    private readonly el: HTMLElement,
    private readonly host: InputHost,
  ) {
    el.style.touchAction = 'none';
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void): void => {
      el.addEventListener(type, fn as EventListener);
      this.off.push(() => el.removeEventListener(type, fn as EventListener));
    };
    on('pointerdown', (e) => this.down(e));
    on('pointermove', (e) => this.move(e));
    on('pointerup', (e) => this.up(e, false));
    on('pointercancel', (e) => this.up(e, true));
    on('pointerleave', (e) => {
      if (e.pointerType === 'mouse') this.up(e, true);
    });
  }

  destroy(): void {
    for (const f of this.off) f();
    this.off.length = 0;
    this.downs.clear();
  }

  private local(e: PointerEvent): Pt {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const p = this.local(e);
    this.downs.set(e.pointerId, { x: p.x, y: p.y, t: e.timeStamp, moved: 0 });
    if (this.downs.size === 2) {
      const [a, b] = [...this.downs.values()].map((v) => ({ x: v.cx ?? v.x, y: v.cy ?? v.y }));
      if (a && b) this.pinch = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: this.host.camera.zoom };
      // Fingers that took part in a pinch never count as taps.
      for (const v of this.downs.values()) v.moved = Number.POSITIVE_INFINITY;
    }
  }

  private move(e: PointerEvent): void {
    const d = this.downs.get(e.pointerId);
    if (!d) return;
    const p = this.local(e);
    d.moved = Math.max(d.moved, Math.hypot(p.x - d.x, p.y - d.y));
    d.cx = p.x;
    d.cy = p.y;
    if (this.pinch && this.downs.size >= 2) {
      const [a, b] = [...this.downs.values()].map((v) => ({ x: v.cx ?? v.x, y: v.cy ?? v.y }));
      if (a && b) this.host.camera.setZoom(this.pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / this.pinch.dist));
    }
  }

  private up(e: PointerEvent, cancelled: boolean): void {
    const d = this.downs.get(e.pointerId);
    if (!d) return;
    this.downs.delete(e.pointerId);
    const wasPinch = this.pinch !== null;
    if (this.downs.size < 2) this.pinch = null;
    if (cancelled || wasPinch) return;
    const kind = this.taps.release(d, e.timeStamp);
    if (kind === 'tap') {
      if (this.host.tap({ x: d.x, y: d.y }, e.shiftKey)) this.taps.forget();
    } else if (kind === 'double') {
      if (!this.host.tap({ x: d.x, y: d.y }, e.shiftKey)) this.host.camera.reset();
    }
  }
}
