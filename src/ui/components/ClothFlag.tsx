/**
 * A DOM flag that waves like the lane's cloth (queue item 37; `clothWave.ts`): the picture is cut into
 * vertical strips pinned at the hoist, each strip lifts, shears, is pulled toward the pole and droops as the
 * lane's waves travel to the free edge, and a band turning away from the light darkens, with the odd gust.
 *
 * Cheap (review M S8): the motion is a set of CSS keyframes written once per page for each strip count and
 * cloth shape and shared by every flag (transforms and opacity only, played on the compositor); a flag adds
 * only two animated layers per strip (about one strip per 10 px) and no keyframes of its own, inside a
 * contained box (`ui-cloth__box`) that bounds them, so other main-thread animations on the screen do not pay
 * for the cloth in every frame. It holds its resting pose through the screen's entrance and starts once the
 * page is idle, from that same pose; it pauses off screen. Reduce motion (`still`) keeps the resting pose,
 * gently rippled, with no motion.
 *
 * `src` is the flag picture (a base flag with its margin and swallowtail, a national flag's 4:3 picture);
 * `outline` draws the cloth's edge in its own dark (a national flag's picture has none). The box sizes the
 * cloth (the picture fills it); the ripple reaches a little beyond it, so nothing around it should clip.
 * Decorative (`aria-hidden`).
 */
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { clothKeyframeNames, clothKeyframesCss, clothSeedOf, CLOTH_LOOP_MS, poseTransform, stripCount, stripPose } from './clothWave';
import './clothFlag.css';

/** How long the cloth holds still after it mounts (the screen's entrance plays first), ms; then when idle. */
const START_AFTER_MS = 700;
const IDLE_WAIT_MS = 900;

function absolute(src: string): string {
  if (/^(data:|blob:|https?:)/.test(src) || typeof document === 'undefined') return src;
  try {
    return new URL(src, document.baseURI).href;
  } catch {
    return src;
  }
}

/** The page's shared cloth keyframes: one `<style>` element, a cut written the first time a flag needs it. */
const written = new Set<string>();
function ensureKeyframes(n: number, aspect: number): boolean {
  if (typeof document === 'undefined' || !document.head) return false;
  const key = `${n}|${Math.round(aspect * 100)}`;
  if (written.has(key)) return true;
  let el = document.getElementById('ui-cloth-keyframes');
  if (!el) {
    el = document.createElement('style');
    el.id = 'ui-cloth-keyframes';
    document.head.appendChild(el);
  }
  el.appendChild(document.createTextNode(clothKeyframesCss(n, Math.round(aspect * 100) / 100)));
  written.add(key);
  return true;
}

type IdleHandle = { cancel(): void };
function afterEntrance(cb: () => void): IdleHandle {
  let idle: number | null = null;
  const w = typeof window !== 'undefined' ? (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void }) : null;
  const timer = setTimeout(() => {
    if (w?.requestIdleCallback) idle = w.requestIdleCallback(cb, { timeout: IDLE_WAIT_MS });
    else cb();
  }, START_AFTER_MS);
  return {
    cancel: () => {
      clearTimeout(timer);
      if (idle !== null) w?.cancelIdleCallback?.(idle);
    },
  };
}

export function ClothFlag(p: {
  src: string | null;
  /** The cloth's height over its length (the picture's), for the shear; default the base flags' 44 / 64. */
  aspect?: number;
  /** About how wide the flag is drawn (px): sets the number of strips. */
  widthPx?: number;
  still?: boolean;
  outline?: boolean;
  /** The flag's own seed (where in the loop it starts); default from its picture. */
  seed?: number;
  class?: string;
  testid?: string;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const n = stripCount(p.widthPx ?? 64);
  const aspect = Math.round((p.aspect ?? 44 / 64) * 100) / 100;
  const src = useMemo(() => (p.src ? absolute(p.src) : null), [p.src]);
  const own = useMemo(() => hashOf(src ?? ''), [src]);
  const seed = p.seed ?? own;
  useEffect(() => {
    const el = root.current;
    if (!el || !src) return undefined;
    const { offsetMs } = clothSeedOf(seed);
    const strips = Array.from(el.querySelectorAll<HTMLElement>('.ui-cloth__s'));
    const shades = Array.from(el.querySelectorAll<HTMLElement>('.ui-cloth__dark'));
    // the resting pose: where in the loop this flag starts (Reduce motion keeps it; the motion starts from it)
    const rest = (): void => {
      strips.forEach((s, i) => {
        const pose = stripPose(i, n, offsetMs / 1000, aspect);
        s.style.animation = '';
        s.style.transform = poseTransform(pose);
        const d = shades[i];
        if (d) {
          d.style.animation = '';
          d.style.opacity = String(Math.round(pose.dark * 1000) / 1000);
        }
      });
    };
    rest();
    if (p.still) return undefined;
    let io: IntersectionObserver | null = null;
    const start = (): void => {
      if (!ensureKeyframes(n, aspect)) return;
      const timing = `${CLOTH_LOOP_MS}ms linear -${offsetMs}ms infinite`;
      strips.forEach((s, i) => {
        const names = clothKeyframeNames(i, n, aspect);
        s.style.transform = '';
        s.style.animation = `${names.motion} ${timing}`;
        const d = shades[i];
        if (d) {
          d.style.opacity = '';
          d.style.animation = `${names.shade} ${timing}`;
        }
      });
      // off screen: paused (the browser skips hidden tabs by itself)
      if (typeof IntersectionObserver === 'function') {
        io = new IntersectionObserver((es) => el.classList.toggle('is-paused', !es.some((e) => e.isIntersecting)));
        io.observe(el);
      }
    };
    const wait = afterEntrance(start);
    return () => {
      wait.cancel();
      io?.disconnect();
      el.classList.remove('is-paused');
    };
  }, [src, p.still, n, aspect, seed]);
  return (
    <span
      ref={root}
      class={`ui-cloth${p.outline ? ' ui-cloth--outline' : ''}${p.class ? ` ${p.class}` : ''}`}
      style={{ '--cloth-img': src ? `url("${src}")` : 'none', '--cloth-n': n }}
      aria-hidden="true"
      data-testid={p.testid}
      data-strips={n}
    >
      <span class="ui-cloth__box">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} class={`ui-cloth__strip${i === 0 ? ' is-hoist' : ''}${i === n - 1 ? ' is-fly' : ''}`} style={{ '--i': i }}>
            <span class="ui-cloth__s">
              <span class="ui-cloth__img" />
              <i class="ui-cloth__dark" />
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

/** A stable small hash of a string (a flag's default seed from its picture). */
function hashOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
