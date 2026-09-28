/**
 * Canvas pointer, wheel and key input for the battle view (DESIGN A17.4 manual controls, A2.8 mounts):
 *
 * - a press that travels less than 10 px within 350 ms is a tap, offered to the view (turret mounts);
 *   an unused double tap resets the zoom and turns auto-follow on,
 * - a longer press is a drag that pans the camera 1:1; releasing while moving flings it (momentum from
 *   the pointer's velocity over the last 100 ms),
 * - two pointers pinch-zoom (z ∈ [0.8, 1.25]); Ctrl + wheel zooms; the wheel and trackpads pan,
 * - a fine mouse pointer inside the lane band within 32 px of the left or right edge edge-scrolls,
 * - ← / → pan (Shift: faster), H / Home jump to your base, J / End to the front.
 *
 * Positions are CSS px relative to the element, the same space as the view layout.
 */
import type { Pt } from '@/contracts';
import { CAMERA, type Camera } from './camera';

export const TAP_MAX_MOVE_PX = CAMERA.dragStartPx;
export const TAP_MAX_MS = 350;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 40;
/** Line-mode wheel deltas are this many px per line (A17.4). */
export const WHEEL_LINE_PX = 40;
/** A release counts as a swipe only when the pointer moved within this long before it. */
const FLING_FRESH_MS = 60;

export interface InputHost {
  readonly camera: Camera;
  /** Returns true when the tap was used (for example on a mount). */
  tap(screen: Pt, shift: boolean): boolean;
  /** H / Home and J / End (A17.4). */
  jump?(where: 'base' | 'front'): void;
  /** False while the camera must not move (the title backdrop, the end of a match). */
  cameraEnabled?(): boolean;
  /** The "Edge scroll" setting and no popover open (A17.4). */
  edgeScrollEnabled?(): boolean;
}

interface Down {
  x: number;
  y: number;
  t: number;
  moved: number;
  /** Current position. */
  cx?: number;
  cy?: number;
  /** Recent positions for the swipe velocity. */
  samples: { x: number; t: number }[];
  dragging: boolean;
}

/** Pure tap / double-tap classifier (tested without a DOM). */
export class TapTracker {
  private last: { x: number; y: number; t: number } | null = null;

  /** Classifies a completed press. Returns 'tap', 'double' or null (a drag or a long press). */
  release(down: { x: number; y: number; t: number; moved: number }, upT: number): 'tap' | 'double' | null {
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

/** Release velocity (px/s) from recent samples: the average over the last 100 ms (A17.4). */
export function releaseVelocity(samples: readonly { x: number; t: number }[], upT: number): number {
  const last = samples[samples.length - 1];
  if (!last || upT - last.t > FLING_FRESH_MS) return 0;
  const from = samples.find((s) => last.t - s.t <= CAMERA.flingWindowMs) ?? last;
  const dt = last.t - from.t;
  if (dt < 8) return 0;
  return ((last.x - from.x) * 1000) / dt;
}

/**
 * Edge-scroll speed (lu/s, signed) for a pointer at `x` in a `width` px window: 300 lu/s at `edgePx`
 * from the edge rising to `maxLuPerSec` at the edge; 0 elsewhere.
 */
export function edgeSpeed(x: number, width: number, edgePx: number = CAMERA.edgePx, minLuPerSec: number = CAMERA.edgeMinLuPerSec, maxLuPerSec: number = CAMERA.edgeMaxLuPerSec): number {
  if (width <= edgePx * 3) return 0;
  const k = (d: number): number => minLuPerSec + (maxLuPerSec - minLuPerSec) * Math.max(0, Math.min(1, 1 - d / edgePx));
  if (x <= edgePx) return -k(Math.max(0, x));
  if (x >= width - edgePx) return k(Math.max(0, width - x));
  return 0;
}

function isTyping(t: EventTarget | null): boolean {
  if (!t || typeof HTMLElement === 'undefined' || !(t instanceof HTMLElement)) return false;
  return t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
}

export class BattleInput {
  private readonly downs = new Map<number, Down>();
  private readonly taps = new TapTracker();
  private pinch: { dist: number; zoom: number } | null = null;
  private readonly off: (() => void)[] = [];
  private readonly finePointer: boolean;
  private hover: Pt | null = null;
  private keysDown = new Set<string>();

  constructor(
    private readonly el: HTMLElement,
    private readonly host: InputHost,
  ) {
    el.style.touchAction = 'none';
    this.finePointer = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions): void => {
      el.addEventListener(type, fn as EventListener, opts);
      this.off.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    on('pointerdown', (e) => this.down(e));
    on('pointermove', (e) => this.move(e));
    on('pointerup', (e) => this.up(e, false));
    on('pointercancel', (e) => this.up(e, true));
    on('pointerleave', (e) => {
      if (e.pointerType === 'mouse') {
        this.hover = null;
        this.host.camera.setEdge(0);
        if (!this.downs.get(e.pointerId)?.dragging) this.up(e, true);
      }
    });
    on('wheel', (e) => this.wheel(e), { passive: false });
    if (typeof window !== 'undefined') {
      const kd = (e: KeyboardEvent): void => this.key(e, true);
      const ku = (e: KeyboardEvent): void => this.key(e, false);
      const blur = (): void => {
        this.keysDown.clear();
        this.host.camera.setKeys(0, false);
        this.host.camera.setEdge(0);
      };
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);
      window.addEventListener('blur', blur);
      this.off.push(() => {
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
        window.removeEventListener('blur', blur);
      });
    }
  }

  destroy(): void {
    for (const f of this.off) f();
    this.off.length = 0;
    this.downs.clear();
    this.host.camera.setKeys(0, false);
    this.host.camera.setEdge(0);
    this.host.camera.hold('pointer', false);
  }

  /** Re-evaluates edge scroll (the view calls it each frame: settings and popovers change). */
  tick(): void {
    const cam = this.host.camera;
    if (!this.hover || !this.finePointer || this.downs.size > 0 || !this.canPan() || this.host.edgeScrollEnabled?.() === false) {
      cam.setEdge(0);
      return;
    }
    const inBand = cam.inLaneBand(this.hover.y);
    cam.setEdge(inBand ? edgeSpeed(this.hover.x, cam.layout.width) : 0);
  }

  private canPan(): boolean {
    return this.host.cameraEnabled?.() !== false;
  }

  private local(e: { clientX: number; clientY: number }): Pt {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const p = this.local(e);
    this.host.camera.setEdge(0);
    this.downs.set(e.pointerId, { x: p.x, y: p.y, t: e.timeStamp, moved: 0, samples: [{ x: p.x, t: e.timeStamp }], dragging: false });
    if (this.downs.size === 2) {
      const [a, b] = [...this.downs.values()].map((v) => ({ x: v.cx ?? v.x, y: v.cy ?? v.y }));
      if (a && b) this.pinch = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: this.host.camera.zoom };
      // Fingers that took part in a pinch never count as taps or drags.
      for (const v of this.downs.values()) {
        if (v.dragging) this.host.camera.dragEnd(0);
        v.dragging = false;
        v.moved = Number.POSITIVE_INFINITY;
      }
    }
  }

  private move(e: PointerEvent): void {
    const p = this.local(e);
    if (e.pointerType === 'mouse') this.hover = p;
    const d = this.downs.get(e.pointerId);
    if (!d) return;
    const px = d.cx ?? d.x;
    d.moved = Math.max(d.moved, Math.hypot(p.x - d.x, p.y - d.y));
    d.cx = p.x;
    d.cy = p.y;
    d.samples.push({ x: p.x, t: e.timeStamp });
    while (d.samples.length > 2 && e.timeStamp - (d.samples[0]?.t ?? 0) > CAMERA.flingWindowMs * 2) d.samples.shift();
    if (this.pinch && this.downs.size >= 2) {
      const [a, b] = [...this.downs.values()].map((v) => ({ x: v.cx ?? v.x, y: v.cy ?? v.y }));
      if (a && b) this.host.camera.setZoom(this.pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / this.pinch.dist));
      return;
    }
    if (this.downs.size !== 1 || !this.canPan()) return;
    if (!d.dragging && d.moved > TAP_MAX_MOVE_PX) {
      d.dragging = true;
      this.host.camera.dragStart();
      try {
        this.el.setPointerCapture?.(e.pointerId);
      } catch {
        // Not every element or pointer can be captured (synthetic events in tests).
      }
      // The first drag frame covers the travel since the press, so the world stays under the pointer.
      this.host.camera.dragBy(p.x - d.x);
      return;
    }
    if (d.dragging) this.host.camera.dragBy(p.x - px);
  }

  private up(e: PointerEvent, cancelled: boolean): void {
    const d = this.downs.get(e.pointerId);
    if (!d) return;
    this.downs.delete(e.pointerId);
    const wasPinch = this.pinch !== null;
    if (this.downs.size < 2) this.pinch = null;
    if (d.dragging) {
      this.host.camera.dragEnd(cancelled ? 0 : releaseVelocity(d.samples, e.timeStamp));
      return;
    }
    if (cancelled || wasPinch) return;
    const kind = this.taps.release(d, e.timeStamp);
    if (kind === 'tap') {
      if (this.host.tap({ x: d.x, y: d.y }, e.shiftKey)) this.taps.forget();
    } else if (kind === 'double') {
      if (!this.host.tap({ x: d.x, y: d.y }, e.shiftKey) && this.canPan()) this.host.camera.reset();
    }
  }

  private wheel(e: WheelEvent): void {
    if (!this.canPan()) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? this.host.camera.layout.width : 1;
    if (e.ctrlKey) {
      this.host.camera.setZoom(this.host.camera.zoom * Math.exp(-e.deltaY * unit * 0.002));
      return;
    }
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.host.camera.wheel(d * unit);
  }

  private key(e: KeyboardEvent, down: boolean): void {
    const cam = this.host.camera;
    const arrow = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (arrow !== 0) {
      if (down && (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || !this.canPan())) return;
      if (down) {
        e.preventDefault();
        this.keysDown.add(e.key);
      } else {
        this.keysDown.delete(e.key);
      }
      const dir = this.keysDown.has('ArrowRight') ? 1 : this.keysDown.has('ArrowLeft') ? -1 : 0;
      cam.setKeys(dir, e.shiftKey);
      return;
    }
    if (!down || e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || !this.canPan()) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'h' || k === 'Home') {
      e.preventDefault();
      this.host.jump?.('base');
    } else if (k === 'j' || k === 'End') {
      e.preventDefault();
      this.host.jump?.('front');
    }
  }
}
