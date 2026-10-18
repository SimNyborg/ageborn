/**
 * The lane's cloth wave for DOM flags (queue item 37: "the flags flap very stiffly ... and not like inside
 * the game"). The lane flies its flags on a strip mesh fixed at the hoist (`visuals/cosmetics/dressing.ts`,
 * `FlagCloth.point`): two waves travel from the hoist to the fly with their height growing toward the free
 * edge, the cloth is pulled a little toward the pole as it ripples and its lower edge droops. A DOM flag here
 * is cut into vertical strips; each strip follows that motion at its edge (a lift, a shear matching the
 * cloth's slope across it, the pull and the droop), and a band turning away from the light darkens.
 *
 * The motion is sampled over one loop into shared CSS keyframes (`clothKeyframesCss`, one set per strip count
 * and cloth shape, about 10 samples a second) the browser plays on its compositor: no work per frame on the
 * main thread and almost none per flag (review M S8). The two waves close a 12 s loop (10 and 6 cycles, the
 * lane's 5.2 and 3.1 rad/s within 1.3%), and once a loop the odd gust swells the ripple for about two seconds.
 * Each flag starts at its own point of the loop, so flags never wave in step.
 *
 * Pure and deterministic (presentation only); the UI may not import the visuals (B2), so the lane's numbers
 * are restated here and the test checks the shape of the motion.
 */

/** One loop of the cloth, ms (both waves and the gust close it). */
export const CLOTH_LOOP_MS = 12_000;
/** Keyframes per second of the loop (the browser interpolates between them at the screen's rate; the faster wave's cycle is 1.2 s). */
const SAMPLES_PER_S = 10;

/** The two travelling waves: angular speed (rad/s), wave number along the cloth (rad per cloth length) and height (share of the cloth's height). */
const W1 = (2 * Math.PI * 10) / (CLOTH_LOOP_MS / 1000);
const W2 = (2 * Math.PI * 6) / (CLOTH_LOOP_MS / 1000);
const K1 = 5.4;
const K2 = 3.2;
/** The lane's lift (2.2 and 1.1 lu) over its base flag's cloth height (39.6 lu). */
const A1 = 2.2 / 39.6;
const A2 = 1.1 / 39.6;
/** The pull toward the hoist (1.6 lu ± 0.8) over the cloth's length (57.6 lu), and the droop of the lower edge (0.9 lu). */
const PULL = 1.6 / 57.6;
const PULL_VAR = 0.8 / 57.6;
const DROOP = 0.9 / 39.6;
/** The gust: where in the loop it starts (share), how long it lasts (ms) and how much it swells the ripple. */
const GUST_AT = 0.56;
const GUST_MS = 2200;
const GUST = 0.85;
/**
 * Shade: the slope (cloth heights per cloth length) where a band starts to turn away from the light and
 * where it is fully turned, and how dark it gets then (soft, so white flags show no hard bands, review M N6).
 */
const SHADE_FROM = 0.05;
const SHADE_FULL = 0.24;
const DARK_MAX = 0.14;

/** The ripple's strength at `t` seconds into the loop: 1, swelling to 1 + `GUST` once a loop. */
export function gustAt(t: number): number {
  const loop = CLOTH_LOOP_MS / 1000;
  const s = (((t % loop) + loop) % loop) - GUST_AT * loop;
  const d = GUST_MS / 1000;
  if (s < 0 || s > d) return 1;
  const k = Math.sin((Math.PI * s) / d);
  return 1 + GUST * k * k;
}

/** How high the cloth's top edge is lifted at `u` (0 the hoist, 1 the fly) at `t` seconds, as a share of its height (negative is up). */
export function clothLift(u: number, t: number, phase: number, amp = gustAt(t)): number {
  const s1 = Math.sin(W1 * t - K1 * u + phase);
  const s2 = Math.sin(W2 * t - K2 * u + phase * 1.7);
  return amp * u * (A1 * s1 + A2 * s2);
}

/** How far the cloth at `u` is pulled toward the hoist at `t` seconds, as a share of its length. */
export function clothPull(u: number, t: number, phase: number, amp = gustAt(t)): number {
  const s2 = Math.sin(W2 * t - K2 * u + phase * 1.7);
  return amp * u * u * (PULL + PULL_VAR * s2);
}

/** One strip's pose: lift (% of its height), shear (degrees), pull (% of its width), droop (scale) and its shade. */
export interface ClothPose {
  ty: number;
  sk: number;
  tx: number;
  sy: number;
  dark: number;
}

/**
 * Strip `i` of `n` at `t` seconds. `aspect` is the cloth's height over its length (the shear turns the
 * slope across the strip into screen degrees), `phase` the waves' phase (0 for the DOM flags, which differ by
 * where in the loop they start).
 */
export function stripPose(i: number, n: number, t: number, aspect: number, phase = 0): ClothPose {
  const amp = gustAt(t);
  const ul = i / n;
  const ur = (i + 1) / n;
  const yl = clothLift(ul, t, phase, amp);
  const yr = clothLift(ur, t, phase, amp);
  // the slope across the strip in cloth heights per cloth length: positive turns down, away from the light
  const slope = (yr - yl) * n;
  const turn = Math.min(1, Math.max(0, (slope - SHADE_FROM) / (SHADE_FULL - SHADE_FROM)));
  return {
    ty: yl * 100,
    sk: (Math.atan(slope * aspect) * 180) / Math.PI,
    tx: -clothPull(ul, t, phase, amp) * n * 100,
    sy: 1 + amp * ((ul + ur) / 2) * DROOP,
    // eased, so a band darkens softly as it turns
    dark: turn * turn * (3 - 2 * turn) * DARK_MAX,
  };
}

const r2 = (x: number): number => Math.round(x * 100) / 100;
const r3 = (x: number): number => Math.round(x * 1000) / 1000;

/** A pose as a CSS transform (the strip's transform origin is its top-left corner, at the cloth's top edge). */
export function poseTransform(p: ClothPose): string {
  return `translate(${r2(p.tx)}%,${r2(p.ty)}%) skewY(${r2(p.sk)}deg) scaleY(${r3(p.sy)})`;
}

/** The keyframes of strip `i` of `n` over one loop (the last equals the first, so the loop has no seam). */
export function stripKeyframes(i: number, n: number, aspect: number, phase = 0): { transform: string[]; dark: number[] } {
  const steps = Math.round((CLOTH_LOOP_MS / 1000) * SAMPLES_PER_S);
  const transform: string[] = [];
  const dark: number[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = ((k % steps) / steps) * (CLOTH_LOOP_MS / 1000);
    const p = stripPose(i, n, t, aspect, phase);
    transform.push(poseTransform(p));
    dark.push(r3(p.dark));
  }
  return { transform, dark };
}

/** The shared keyframe names for strip `i` of `n` on a cloth of `aspect`: its motion and its shade. */
export function clothKeyframeNames(i: number, n: number, aspect: number): { motion: string; shade: string } {
  const base = `ui-cloth-${n}-${Math.round(aspect * 100)}-${i}`;
  return { motion: base, shade: `${base}-s` };
}

/**
 * The CSS `@keyframes` rules for every strip of an `n`-strip cloth of `aspect` (`clothKeyframeNames`):
 * written once per page and shared by every flag of that cut, so a screen full of flags parses no keyframes
 * of its own (review M S8). A shade that stays clear for a run of samples keeps only the run's ends.
 */
export function clothKeyframesCss(n: number, aspect: number): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const k = stripKeyframes(i, n, aspect);
    const names = clothKeyframeNames(i, n, aspect);
    const last = k.transform.length - 1;
    const at = (j: number): string => `${r2((j / last) * 100)}%`;
    out.push(`@keyframes ${names.motion}{${k.transform.map((tr, j) => `${at(j)}{transform:${tr}}`).join('')}}`);
    const shade: string[] = [];
    for (let j = 0; j <= last; j++) {
      const v = k.dark[j]!;
      // inside a clear run (this, the one before and the one after all 0) nothing changes: skip it
      if (v === 0 && j > 0 && j < last && k.dark[j - 1] === 0 && k.dark[j + 1] === 0) continue;
      shade.push(`${at(j)}{opacity:${v}}`);
    }
    out.push(`@keyframes ${names.shade}{${shade.join('')}}`);
  }
  return out.join('\n');
}

/** How many strips a flag `widthPx` wide is cut into: about 10-11 px each (finer costs layers and shows no difference). */
export function stripCount(widthPx: number): number {
  return Math.max(5, Math.min(10, Math.round(widthPx / 10.5)));
}

/** A flag's own start point in the loop from a seed (flags never wave in step). */
export function clothSeedOf(seed: number): { offsetMs: number } {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return { offsetMs: x % CLOTH_LOOP_MS };
}
