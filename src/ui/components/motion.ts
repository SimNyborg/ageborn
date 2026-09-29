/**
 * DOM motion helpers (docs/ui-plan.md 5.2, 5.5, 5.6), built on the Web Animations API and the motion
 * tokens of `src/core/motion.ts`. Small and in-house (no animation library, 6.1). Every helper is
 * reduce-motion aware: under the setting (`[data-reduce-motion='true']` on the UI root) or the OS
 * preference, movement becomes a 150 ms fade and counters jump to the value with a fade (U14).
 *
 * Only `transform` and `opacity` animate (5.7). `will-change` is set for the animation and removed
 * after it. Every helper returns a handle whose `finish()` jumps to the end state, so input during a
 * motion completes it instead of being swallowed (U12).
 */
import { countDuration, curveCss, MOTION_DUR, MOTION_EASE, MOTION_TRANSFORM, staggerDelay, type MotionEaseToken } from '@/core/motion';

export { MOTION_DUR, MOTION_EASE, MOTION_TRANSFORM };

export interface MotionHandle {
  /** Resolves when the motion ends (or is finished early). */
  readonly done: Promise<void>;
  /** Jumps to the end state now. */
  finish(): void;
  /** Stops without reaching the end state (for elements that are going away). */
  cancel(): void;
}

/** CSS easing text for a token. */
export function ease(token: MotionEaseToken): string {
  return curveCss(MOTION_EASE[token]);
}

/** A scale token (thousandths) as a number, for transforms. */
export function scaleOf(thousandths: number): number {
  return thousandths / 1000;
}

/** Whether motion is reduced for this element: the setting on its UI root or the OS preference. */
export function reducedMotion(el?: Element | null): boolean {
  const root = el && typeof el.closest === 'function' ? el.closest('[data-reduce-motion]') : null;
  if (root && root.getAttribute('data-reduce-motion') === 'true') return true;
  if (typeof matchMedia === 'function') {
    try {
      return matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }
  return false;
}

const DONE: MotionHandle = { done: Promise.resolve(), finish() {}, cancel() {} };

function canAnimate(el: Element | null | undefined): el is HTMLElement {
  return !!el && typeof (el as HTMLElement).animate === 'function';
}

/** Runs one Web Animation with will-change set for its life. */
export function animate(el: Element | null | undefined, keyframes: Keyframe[], o: KeyframeAnimationOptions): MotionHandle {
  if (!canAnimate(el)) return DONE;
  const props = new Set<string>();
  for (const k of keyframes) for (const key of Object.keys(k)) if (key === 'transform' || key === 'opacity') props.add(key);
  if (props.size) el.style.willChange = [...props].join(', ');
  const a = el.animate(keyframes, { fill: 'both', ...o });
  const clear = () => {
    el.style.willChange = '';
  };
  const done = a.finished.then(clear, clear);
  return {
    done,
    finish: () => {
      try {
        a.finish();
      } catch {
        /* already done */
      }
    },
    cancel: () => {
      a.cancel();
      clear();
    },
  };
}

/** The reduced variant of any entrance: a 150 ms fade in. */
export function fadeIn(el: Element | null | undefined, delay = 0): MotionHandle {
  return animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: MOTION_DUR.reduced, delay, easing: ease('out') });
}

/**
 * MR-17 / MR-52 stagger: items fade in with an 8 px rise, 40 ms apart, the whole stagger at most
 * 240 ms. Reduced: all fade at once.
 */
export function stagger(items: readonly Element[], o?: { step?: number; rise?: number }): MotionHandle {
  const list = items.filter(canAnimate);
  if (!list.length) return DONE;
  const reduced = reducedMotion(list[0]);
  const handles = list.map((el, i) =>
    reduced
      ? fadeIn(el)
      : animate(el, [{ opacity: 0, transform: `translateY(${o?.rise ?? 8}px)` }, { opacity: 1, transform: 'none' }], {
          duration: MOTION_DUR.small,
          delay: staggerDelay(i, o?.step),
          easing: ease('enter'),
        }),
  );
  return group(handles);
}

function group(handles: MotionHandle[]): MotionHandle {
  return {
    done: Promise.all(handles.map((h) => h.done)).then(() => undefined),
    finish: () => handles.forEach((h) => h.finish()),
    cancel: () => handles.forEach((h) => h.cancel()),
  };
}

/** MR-25 / MR-21 bump on arrival: 1.15 then 1 (220, back). Reduced: a short glow-like fade. */
export function bump(el: Element | null | undefined, peak: number = MOTION_TRANSFORM.bump): MotionHandle {
  if (!canAnimate(el)) return DONE;
  if (reducedMotion(el)) return animate(el, [{ opacity: 0.55 }, { opacity: 1 }], { duration: MOTION_DUR.reduced, easing: ease('out'), fill: 'none' });
  return animate(el, [{ transform: `scale(${scaleOf(peak)})` }, { transform: 'scale(1)' }], {
    duration: MOTION_DUR.small,
    easing: ease('back'),
    fill: 'none',
  });
}

/** MR-01 style press dip for elements that are not Buttons (tiles, nodes). */
export function press(el: Element | null | undefined): MotionHandle {
  if (!canAnimate(el) || reducedMotion(el)) return DONE;
  return animate(el, [{ transform: 'scale(1)' }, { transform: `scale(${scaleOf(MOTION_TRANSFORM.pressScale)})` }, { transform: 'scale(1)' }], {
    duration: MOTION_DUR.press + MOTION_DUR.release,
    easing: ease('back'),
    fill: 'none',
  });
}

/**
 * MR-05, the one attention pulse, for elements that are not Buttons (a Button takes `pulse`):
 * scale 1 <-> 1.03 over 2 s. Sets `data-pulse` so the budget check counts it. Reduced: a static
 * outline glow. `cancel()` stops it as soon as the action is used.
 */
export function pulse(el: Element | null | undefined): MotionHandle {
  if (!el || typeof (el as HTMLElement).setAttribute !== 'function') return DONE;
  const h = el as HTMLElement;
  h.setAttribute('data-pulse', '');
  const stop = () => h.removeAttribute('data-pulse');
  if (!canAnimate(h) || reducedMotion(h)) {
    h.style.boxShadow = '0 0 0 3px rgba(255, 212, 102, 0.7)';
    return {
      done: Promise.resolve(),
      finish() {},
      cancel() {
        stop();
        h.style.boxShadow = '';
      },
    };
  }
  const a = h.animate([{ transform: 'scale(1)' }, { transform: `scale(${scaleOf(MOTION_TRANSFORM.breatheScale)})` }, { transform: 'scale(1)' }], {
    duration: MOTION_DUR.breathe,
    iterations: Infinity,
    easing: 'ease-in-out',
  });
  return {
    done: Promise.resolve(),
    finish() {},
    cancel() {
      a.cancel();
      stop();
    },
  };
}

/**
 * MR-20 count-up: rolls a number from `from` to `to` (`countS`..`countXL` by the size of the change,
 * `out` easing), then bumps it. `render` writes the text (tabular digits and formatting are the
 * caller's). Reduced: the final value fades in. Uses requestAnimationFrame; `finish()` jumps to the
 * final value.
 */
export function countUp(el: Element | null | undefined, from: number, to: number, render: (v: number) => string, o?: { onTick?: (v: number) => void }): MotionHandle {
  const write = (v: number) => {
    if (el) el.textContent = render(v);
  };
  if (!el || from === to || typeof requestAnimationFrame !== 'function' || reducedMotion(el)) {
    write(to);
    return from === to ? DONE : fadeIn(el);
  }
  const dur = countDuration(to - from);
  const [x1, y1, x2, y2] = MOTION_EASE.out.map((n) => n / 1000) as [number, number, number, number];
  const curve = bezier(x1, y1, x2, y2);
  let start = -1;
  let raf = 0;
  let resolve: () => void = () => {};
  const done = new Promise<void>((r) => (resolve = r));
  let last = from;
  const step = (now: number) => {
    if (start < 0) start = now;
    const k = Math.min(1, (now - start) / dur);
    const v = Math.round(from + (to - from) * curve(k));
    if (v !== last) {
      last = v;
      write(v);
      o?.onTick?.(v);
    }
    if (k < 1) raf = requestAnimationFrame(step);
    else {
      bump(el);
      resolve();
    }
  };
  write(from);
  raf = requestAnimationFrame(step);
  return {
    done,
    finish() {
      cancelAnimationFrame(raf);
      write(to);
      resolve();
    },
    cancel() {
      cancelAnimationFrame(raf);
      resolve();
    },
  };
}

/**
 * MR-21 fly-to-counter: clones `token` (or uses a small dot) at the source rect and flies it on an
 * arc (control point 30% above the line) to the target, then bumps the target. `count` tokens leave
 * 40 ms apart. Reduced: no tokens; the target glows. The layer is the UI root (or document.body).
 */
export function fly(
  source: Element | DOMRect,
  target: Element,
  o?: { count?: number; token?: () => HTMLElement; layer?: HTMLElement | null; onArrive?: (i: number) => void },
): MotionHandle {
  const t = target as HTMLElement;
  if (reducedMotion(t) || typeof document === 'undefined') {
    const h = bump(t);
    o?.onArrive?.(0);
    return h;
  }
  const layer = o?.layer ?? (t.closest?.('.ui-root') as HTMLElement | null) ?? document.body;
  const from = 'getBoundingClientRect' in source ? source.getBoundingClientRect() : source;
  const to = t.getBoundingClientRect();
  const base = layer.getBoundingClientRect();
  const n = Math.max(1, Math.min(12, o?.count ?? 1));
  const handles: MotionHandle[] = [];
  for (let i = 0; i < n; i++) {
    const tok = o?.token ? o.token() : dot();
    tok.style.position = 'absolute';
    tok.style.left = '0';
    tok.style.top = '0';
    tok.style.pointerEvents = 'none';
    tok.style.zIndex = '90';
    layer.appendChild(tok);
    const sx = from.left + from.width / 2 - base.left;
    const sy = from.top + from.height / 2 - base.top;
    const ex = to.left + to.width / 2 - base.left;
    const ey = to.top + to.height / 2 - base.top;
    const lift = Math.abs(ex - sx) * 0.3 + 40;
    const mx = (sx + ex) / 2;
    const my = Math.min(sy, ey) - lift;
    const frames: Keyframe[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      const x = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * ex;
      const y = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ey;
      const s = u < 0.15 ? 0.6 + u * 3 : 1.05 - u * 0.45;
      frames.push({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`, opacity: u > 0.92 ? 0 : 1, offset: u });
    }
    const h = animate(tok, frames, { duration: MOTION_DUR.fly + ((i * 37) % (MOTION_DUR.flyJitter * 2)) - MOTION_DUR.flyJitter, delay: i * MOTION_DUR.stagger, easing: ease('standard') });
    handles.push({
      done: h.done.then(() => {
        tok.remove();
        o?.onArrive?.(i);
        bump(t, 1080);
      }),
      finish: () => h.finish(),
      cancel: () => {
        h.cancel();
        tok.remove();
      },
    });
  }
  return group(handles);
}

function dot(): HTMLElement {
  const d = document.createElement('i');
  d.style.width = '14px';
  d.style.height = '14px';
  d.style.borderRadius = '50%';
  d.style.background = 'radial-gradient(circle at 35% 30%, #fff3c4, #f2b52c 60%, #b7801a)';
  d.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
  return d;
}

/**
 * FLIP for reorders (5.7, MR-38): call `first()` before the DOM change and `play()` after it; each
 * element moves from its old place to the new one (220, standard). Reduced: a cross-fade.
 */
export function flip(elements: () => readonly Element[]): { first(): void; play(): MotionHandle } {
  let rects = new Map<Element, DOMRect>();
  return {
    first() {
      rects = new Map(elements().map((e) => [e, e.getBoundingClientRect()]));
    },
    play() {
      const handles: MotionHandle[] = [];
      for (const el of elements()) {
        const before = rects.get(el);
        if (!before) {
          handles.push(fadeIn(el));
          continue;
        }
        const after = el.getBoundingClientRect();
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (!dx && !dy) continue;
        if (reducedMotion(el)) {
          handles.push(fadeIn(el));
          continue;
        }
        handles.push(animate(el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: MOTION_DUR.small, easing: ease('standard'), fill: 'none' }));
      }
      return group(handles);
    },
  };
}

/** A cubic Bezier easing function (x1, y1, x2, y2) for JS-driven tweens such as count-ups. */
export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      const d = dx(t);
      if (Math.abs(err) < 1e-5 || d === 0) break;
      t -= err / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
