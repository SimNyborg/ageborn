/**
 * Shared drag behaviour (docs/ui-plan.md 3.6 "Slots", MR-30 to MR-35; T5, T6, U3), used by Army now
 * and by forts and the power later.
 *
 * - **Start:** a drag begins only after the pointer moves 8 px (6 with a mouse). With `axis: 'x'`
 *   a touch drag starts only when the move is mostly horizontal (within 35 degrees of the x axis),
 *   so a vertical swipe on a scrolling grid scrolls and never picks a card up. Nothing starts within
 *   20 px of the screen edge (the iOS back swipe, 2.2).
 * - **Lift (MR-30):** a clone of the source follows the finger 1:1 at 1.08 with the e5 shadow and a
 *   tilt of up to 4 degrees toward the motion; the source stays as a 40% ghost.
 * - **Valid targets** (elements with `data-drop="<key>"` that `accepts(key)`) light up green on
 *   start; the one under the finger scales 1.04 and pulls the card toward its centre within 24 px
 *   (MR-31).
 * - **Drop:** over a valid target the clone settles into it and `onDrop(key)` runs; anywhere else it
 *   flies back along its path (220, `out`) and `onDrop(null)` runs (MR-33). Escape cancels.
 * - The click that follows a drag is swallowed, so a drag never also taps.
 *
 * Plain DOM and the Web Animations API (no library, 6.1); every motion uses the tokens and becomes
 * a fade under reduce motion (U14).
 */
import { MOTION_DUR, MOTION_TRANSFORM } from '@/core/motion';
import { animate, ease, reducedMotion, type MotionHandle } from './motion';

export interface DragOptions {
  /** 'x': touch drags must start mostly horizontally (a vertical move scrolls). Default 'free'. */
  axis?: 'x' | 'free';
  /** Whether the drop target with this `data-drop` key accepts the dragged thing. */
  accepts(key: string): boolean;
  /** The drag has started (the card lifted). */
  onStart?(): void;
  /** Called after the drop motion: the accepting target's key, or null when it returned. `invalid` is
   *  the key of a target that refused it (for the reason label), if the finger ended over one. */
  onDrop(key: string | null, invalid: string | null): void;
}

/** Degrees from the x axis within which a touch move counts as horizontal. */
export const DRAG_AXIS_DEG = 35;
/** Pixels of movement before a drag starts (touch / mouse). */
export const DRAG_SLOP = 8;
export const DRAG_SLOP_MOUSE = 6;
/** Magnetic snap distance around a valid target (MR-31). */
export const DRAG_SNAP = 24;
/** No drag starts this close to the screen's left or right edge (2.2, iOS edge swipe). */
export const DRAG_EDGE = 20;

/** Whether a move of (dx, dy) may start a drag on the given axis (pure, for tests). */
export function dragStarts(dx: number, dy: number, axis: 'x' | 'free', touch: boolean): 'drag' | 'scroll' | 'wait' {
  const slop = touch ? DRAG_SLOP : DRAG_SLOP_MOUSE;
  if (Math.hypot(dx, dy) < slop) return 'wait';
  if (axis === 'x' && touch) {
    const deg = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
    return deg <= DRAG_AXIS_DEG ? 'drag' : 'scroll';
  }
  return 'drag';
}

let active: { cancel(): void } | null = null;

/** Cancels a drag in progress (for example when the screen unmounts). */
export function cancelDrag(): void {
  active?.cancel();
}

/** The layer drag clones live in: the UI root (it contains fixed children), else the body. */
function layerOf(el: Element): HTMLElement {
  return (el.closest('.ui-root') as HTMLElement | null) ?? document.body;
}

/** What a flight starts from: a copy of an element's look and where it was (taken before a change). */
export interface FlightSource {
  node: HTMLElement;
  rect: DOMRect;
}

/** Remembers how an element looks and where it is now, for a flight after the DOM changes. */
export function snapshot(el: Element | null | undefined): FlightSource | null {
  if (!el || typeof (el as HTMLElement).cloneNode !== 'function' || typeof el.getBoundingClientRect !== 'function') return null;
  const rect = el.getBoundingClientRect();
  if (!rect.width) return null;
  return { node: (el as HTMLElement).cloneNode(true) as HTMLElement, rect };
}

/** A clone of `source` for flights and drags: no ids or test hooks, never interactive. */
export function cloneForFlight(source: HTMLElement | FlightSource, layer: HTMLElement): HTMLElement {
  const c = ('node' in source ? source.node : source).cloneNode(true) as HTMLElement;
  for (const el of [c, ...Array.from(c.querySelectorAll('*'))]) {
    for (const a of ['id', 'data-testid', 'data-primary', 'data-pulse', 'data-clip-check', 'data-drop', 'data-grid-item', 'data-land', 'tabindex'])
      el.removeAttribute(a);
  }
  c.setAttribute('aria-hidden', 'true');
  c.classList.add('ui-flight');
  c.classList.remove('is-drag-origin', 'is-selected');
  const r = 'rect' in source ? source.rect : source.getBoundingClientRect();
  const base = layer.getBoundingClientRect();
  c.style.position = 'absolute';
  c.style.left = `${r.left - base.left}px`;
  c.style.top = `${r.top - base.top}px`;
  c.style.width = `${r.width}px`;
  c.style.height = `${r.height}px`;
  c.style.margin = '0';
  c.style.pointerEvents = 'none';
  c.style.zIndex = '80';
  layer.appendChild(c);
  return c;
}

/**
 * Starts tracking a possible drag from a `pointerdown` on `source`. Returns immediately; the drag
 * begins only once the pointer has moved far enough in an allowed direction.
 */
export function beginDrag(e: PointerEvent, source: HTMLElement, o: DragOptions): void {
  if (typeof document === 'undefined' || (e.button !== undefined && e.button !== 0)) return;
  if (e.clientX < DRAG_EDGE || e.clientX > window.innerWidth - DRAG_EDGE) return;
  active?.cancel();
  const touch = e.pointerType !== 'mouse';
  const axis = o.axis ?? 'free';
  const id = e.pointerId;
  const x0 = e.clientX;
  const y0 = e.clientY;
  let started = false;
  let ghost: HTMLElement | null = null;
  let layerBox: DOMRect | null = null;
  let origin: DOMRect | null = null;
  let grab = { x: 0, y: 0 };
  let lastX = x0;
  let tilt = 0;
  let over: { key: string; el: HTMLElement; ok: boolean } | null = null;
  let targets: HTMLElement[] = [];
  let settle: MotionHandle | null = null;

  const off = () => {
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', cancel, true);
    window.removeEventListener('keydown', key, true);
    if (active === handle) active = null;
  };
  const clearTargets = () => {
    for (const t of targets) t.classList.remove('is-drop-valid', 'is-drop-over', 'is-drop-bad');
    targets = [];
    document.documentElement.removeAttribute('data-dragging');
    source.classList.remove('is-drag-origin');
  };
  const place = (cx: number, cy: number) => {
    if (!ghost || !layerBox || !origin) return;
    const x = cx - grab.x - layerBox.left;
    const y = cy - grab.y - layerBox.top;
    ghost.style.transform = `translate(${x - (origin.left - layerBox.left)}px, ${y - (origin.top - layerBox.top)}px) rotate(${tilt}deg) scale(1.08)`;
  };
  const start = () => {
    started = true;
    const layer = layerOf(source);
    layerBox = layer.getBoundingClientRect();
    origin = source.getBoundingClientRect();
    grab = { x: x0 - origin.left, y: y0 - origin.top };
    ghost = cloneForFlight(source, layer);
    ghost.classList.add('ui-drag-ghost');
    ghost.style.zIndex = '120';
    ghost.style.transition = `transform ${MOTION_DUR.micro}ms ${ease('back')}`;
    source.classList.add('is-drag-origin');
    document.documentElement.setAttribute('data-dragging', '');
    targets = Array.from(layer.querySelectorAll<HTMLElement>('[data-drop]'));
    for (const t of targets) if (o.accepts(t.dataset.drop ?? '')) t.classList.add('is-drop-valid');
    try {
      source.setPointerCapture?.(id);
    } catch {
      /* the pointer may already be gone */
    }
    o.onStart?.();
    requestAnimationFrame(() => {
      if (ghost) ghost.style.transition = 'none';
    });
  };
  const hit = (cx: number, cy: number): { key: string; el: HTMLElement; ok: boolean } | null => {
    let best: { key: string; el: HTMLElement; ok: boolean; d: number } | null = null;
    for (const t of targets) {
      const r = t.getBoundingClientRect();
      const ok = t.classList.contains('is-drop-valid');
      const pad = ok ? DRAG_SNAP : 0;
      if (cx < r.left - pad || cx > r.right + pad || cy < r.top - pad || cy > r.bottom + pad) continue;
      const d = Math.hypot(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2));
      if (!best || d < best.d) best = { key: t.dataset.drop ?? '', el: t, ok, d };
    }
    return best;
  };
  function move(ev: PointerEvent) {
    if (ev.pointerId !== id) return;
    if (!started) {
      const s = dragStarts(ev.clientX - x0, ev.clientY - y0, axis, touch);
      if (s === 'wait') return;
      if (s === 'scroll') {
        off();
        return;
      }
      start();
    }
    ev.preventDefault();
    const vx = ev.clientX - lastX;
    lastX = ev.clientX;
    const lim = MOTION_TRANSFORM.dragTilt;
    tilt = Math.max(-lim, Math.min(lim, tilt * 0.7 + vx * 0.6));
    const h = hit(ev.clientX, ev.clientY);
    if (over?.el !== h?.el) {
      over?.el.classList.remove('is-drop-over', 'is-drop-bad');
      if (h) h.el.classList.add(h.ok ? 'is-drop-over' : 'is-drop-bad');
    }
    over = h;
    if (h?.ok && origin) {
      // MR-31: within the snap distance the card eases toward the slot's centre.
      const r = h.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const px = ev.clientX - grab.x + origin.width / 2;
      const py = ev.clientY - grab.y + origin.height / 2;
      const k = 0.45;
      place(ev.clientX + (cx - px) * k, ev.clientY + (cy - py) * k);
    } else place(ev.clientX, ev.clientY);
  }
  function finish(dropKey: string | null, invalid: string | null) {
    off();
    const g = ghost;
    const t = over?.el ?? null;
    clearTargets();
    if (!g || !layerBox || !origin) {
      o.onDrop(dropKey, invalid);
      return;
    }
    // Swallow the click the release would produce, so a drag never also taps.
    const swallow = (ce: Event) => {
      ce.stopPropagation();
      ce.preventDefault();
    };
    window.addEventListener('click', swallow, true);
    setTimeout(() => window.removeEventListener('click', swallow, true), 0);
    const reduced = reducedMotion(source);
    const from = g.style.transform;
    let to: string;
    let dur: number;
    if (dropKey && t) {
      const r = t.getBoundingClientRect();
      const sx = r.width / origin.width;
      to = `translate(${r.left - origin.left + (r.width - origin.width) / 2}px, ${r.top - origin.top + (r.height - origin.height) / 2}px) scale(${Math.min(1.1, sx)})`;
      dur = MOTION_DUR.micro;
    } else {
      to = 'translate(0px, 0px) scale(1)';
      dur = MOTION_DUR.small;
    }
    settle = reduced
      ? animate(g, [{ opacity: 1 }, { opacity: 0 }], {
          duration: MOTION_DUR.reduced,
        })
      : animate(g, [{ transform: from }, { transform: to }], {
          duration: dur,
          easing: ease(dropKey ? 'standard' : 'out'),
        });
    settle.done.then(() => {
      g.remove();
      o.onDrop(dropKey, invalid);
    });
  }
  function up(ev: PointerEvent) {
    if (ev.pointerId !== id) return;
    if (!started) {
      off();
      return;
    }
    const h = hit(ev.clientX, ev.clientY);
    finish(h?.ok ? h.key : null, h && !h.ok ? h.key : null);
  }
  function cancel(ev: Event) {
    if ((ev as PointerEvent).pointerId !== undefined && (ev as PointerEvent).pointerId !== id) return;
    if (!started) {
      off();
      return;
    }
    over = null;
    finish(null, null);
  }
  function key(ev: KeyboardEvent) {
    if (ev.key !== 'Escape' || !started) return;
    ev.preventDefault();
    ev.stopPropagation();
    over = null;
    finish(null, null);
  }
  const handle = {
    cancel() {
      settle?.finish();
      if (started) {
        over = null;
        finish(null, null);
      } else off();
    },
  };
  active = handle;
  window.addEventListener('pointermove', move, { capture: true, passive: false });
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', cancel, true);
  window.addEventListener('keydown', key, true);
}

/**
 * MR-32 / MR-34 flight on the tap paths: a clone of `from` pulls back 5 px (60, `anticipate`), then
 * flies on an arc to `to` (280, `standard`) and fades as it lands; the caller plays the landing on
 * the target. Reduced: nothing flies (the target cross-fades on its own) and it returns null, as it
 * does when either end is missing.
 */
export function flyCard(from: HTMLElement | FlightSource | null, to: HTMLElement | null, o?: { pull?: boolean; duration?: number }): MotionHandle | null {
  const none = null;
  if (!from || !to || typeof document === 'undefined' || reducedMotion(to)) return none;
  const layer = layerOf(to);
  const a = 'rect' in from ? from.rect : from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  if (!a.width || !b.width) return none;
  const c = cloneForFlight(from, layer);
  c.classList.add('ui-flight--card');
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const s = b.width / a.width;
  const lift = Math.min(90, Math.abs(dx) * 0.25 + 24);
  const pull = o?.pull === false ? 0 : 5;
  const back =
    Math.hypot(dx, dy) > 0
      ? {
          x: (-dx / Math.hypot(dx, dy)) * pull,
          y: (-dy / Math.hypot(dx, dy)) * pull,
        }
      : { x: 0, y: 0 };
  const frames: Keyframe[] = [{ transform: 'translate(0px, 0px) scale(1)', offset: 0 }];
  const total = (o?.duration ?? MOTION_DUR.medium) + (pull ? MOTION_DUR.hold : 0);
  const pullShare = pull ? MOTION_DUR.hold / total : 0;
  if (pull)
    frames.push({
      transform: `translate(${back.x}px, ${back.y}px) scale(1.04)`,
      offset: pullShare,
    });
  for (let k = 1; k <= 8; k++) {
    const u = k / 8;
    const x = dx * u;
    const y = dy * u - Math.sin(Math.PI * u) * lift;
    const sc = 1.06 + (s - 1.06) * u;
    frames.push({
      transform: `translate(${x}px, ${y}px) scale(${sc}) rotate(${(1 - u) * (dx > 0 ? 3 : -3)}deg)`,
      opacity: u >= 1 ? 0.9 : 1,
      offset: pullShare + (1 - pullShare) * u,
    });
  }
  const h = animate(c, frames, { duration: total, easing: ease('standard') });
  return {
    done: h.done.then(() => c.remove()),
    finish: () => h.finish(),
    cancel: () => {
      h.cancel();
      c.remove();
    },
  };
}

/** MR-32 residue: 6 small sparks burst from the centre of `el` in `color` (<= 12 DOM nodes, 5.7). */
export function sparks(el: HTMLElement | null, color: string, n = 6): void {
  if (!el || typeof document === 'undefined' || reducedMotion(el)) return;
  const layer = layerOf(el);
  const r = el.getBoundingClientRect();
  if (!r.width) return;
  const base = layer.getBoundingClientRect();
  const cx = r.left + r.width / 2 - base.left;
  const cy = r.top + r.height / 2 - base.top;
  for (let i = 0; i < Math.min(12, n); i++) {
    const s = document.createElement('i');
    s.className = 'ui-spark';
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    s.style.background = color;
    layer.appendChild(s);
    const ang = (i / n) * Math.PI * 2 + 0.4;
    const dist = r.width * 0.55 + (i % 2) * 10;
    animate(
      s,
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0.3)`,
          opacity: 0,
        },
      ],
      {
        duration: MOTION_DUR.medium,
        easing: ease('out'),
      },
    ).done.then(() => s.remove());
  }
}
