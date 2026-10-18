/**
 * A DOM flag that waves like the lane's cloth (queue item 37; `clothWave.ts`): the picture is cut into
 * vertical strips pinned at the hoist, each strip lifts, shears, is pulled toward the pole and droops as the
 * lane's waves travel to the free edge, with light and shade following the folds and the odd gust. The
 * motion is a set of Web Animations sampled once (transforms and opacity only), so the browser plays it on
 * its compositor with no work per frame on the page; it pauses off screen. Reduce motion (`still`) shows one
 * resting pose, gently rippled, with no motion.
 *
 * `src` is the flag picture (a base flag with its margin and swallowtail, a national flag's 4:3 picture);
 * `outline` draws the cloth's edge in its own dark (a national flag's picture has none). The box sizes the
 * cloth (the picture fills it); the ripple reaches a little beyond it, so nothing around it should clip.
 * Decorative (`aria-hidden`).
 */
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { clothSeedOf, CLOTH_LOOP_MS, poseTransform, stripCount, stripKeyframes, stripPose } from './clothWave';
import './clothFlag.css';

/** A still flag's pose: a moment of the loop where the cloth rests in a soft ripple. */
const STILL_T = 0.9;

function absolute(src: string): string {
  if (/^(data:|blob:|https?:)/.test(src) || typeof document === 'undefined') return src;
  try {
    return new URL(src, document.baseURI).href;
  } catch {
    return src;
  }
}

export function ClothFlag(p: {
  src: string | null;
  /** The cloth's height over its length (the picture's), for the shear; default the base flags' 44 / 64. */
  aspect?: number;
  /** About how wide the flag is drawn (px): sets the number of strips. */
  widthPx?: number;
  still?: boolean;
  outline?: boolean;
  /** The flag's own seed (its phase and start in the loop); default from its picture. */
  seed?: number;
  class?: string;
  testid?: string;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const n = stripCount(p.widthPx ?? 64);
  const aspect = p.aspect ?? 44 / 64;
  const src = useMemo(() => (p.src ? absolute(p.src) : null), [p.src]);
  const own = useMemo(() => hashOf(src ?? ''), [src]);
  const seed = p.seed ?? own;
  useEffect(() => {
    const el = root.current;
    if (!el || !src) return undefined;
    const { phase, offsetMs } = clothSeedOf(seed);
    const strips = Array.from(el.querySelectorAll<HTMLElement>('.ui-cloth__s'));
    const darks = Array.from(el.querySelectorAll<HTMLElement>('.ui-cloth__dark'));
    const lights = Array.from(el.querySelectorAll<HTMLElement>('.ui-cloth__light'));
    // Reduce motion, or a browser without Web Animations: one resting pose
    if (p.still || typeof el.animate !== 'function') {
      strips.forEach((s, i) => {
        const pose = stripPose(i, n, STILL_T, aspect, phase);
        s.style.transform = poseTransform(pose);
        const d = darks[i];
        const l = lights[i];
        if (d) d.style.opacity = String(pose.dark);
        if (l) l.style.opacity = String(pose.light);
      });
      return undefined;
    }
    const anims: Animation[] = [];
    const timing: KeyframeAnimationOptions = { duration: CLOTH_LOOP_MS, iterations: Infinity, delay: -offsetMs, easing: 'linear' };
    strips.forEach((s, i) => {
      s.style.transform = '';
      const k = stripKeyframes(i, n, aspect, phase);
      anims.push(s.animate(k.transform, timing));
      const d = darks[i];
      const l = lights[i];
      if (d) anims.push(d.animate(k.dark, timing));
      if (l) anims.push(l.animate(k.light, timing));
    });
    // off screen: paused (the browser skips hidden tabs by itself)
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver((es) => {
        const on = es.some((e) => e.isIntersecting);
        for (const a of anims) {
          if (on && a.playState === 'paused') a.play();
          else if (!on && a.playState === 'running') a.pause();
        }
      });
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      for (const a of anims) a.cancel();
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
      {Array.from({ length: n }, (_, i) => (
        <span key={i} class={`ui-cloth__strip${i === 0 ? ' is-hoist' : ''}${i === n - 1 ? ' is-fly' : ''}`} style={{ '--i': i }}>
          <span class="ui-cloth__s">
            <span class="ui-cloth__img" />
            <i class="ui-cloth__dark" />
            <i class="ui-cloth__light" />
          </span>
        </span>
      ))}
    </span>
  );
}

/** A stable small hash of a string (a flag's default seed from its picture). */
function hashOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
