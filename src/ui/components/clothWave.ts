/**
 * The lane's cloth wave for DOM flags (queue item 37: "the flags flap very stiffly ... and not like inside
 * the game"). The lane flies its flags on a strip mesh fixed at the hoist (`visuals/cosmetics/dressing.ts`,
 * `FlagCloth.point`): two waves travel from the hoist to the fly with their height growing toward the free
 * edge, the cloth is pulled a little toward the pole as it ripples and its lower edge droops. A DOM flag here
 * is cut into vertical strips; each strip follows that motion at its edge (a lift, a shear matching the
 * cloth's slope across it, the pull and the droop), and its light and shade follow the slope: a band
 * turning away from the light darkens, one facing it brightens.
 *
 * The motion is sampled over one loop into keyframes the browser plays on its compositor (Web Animations):
 * no work per frame on the main thread. The two waves are fitted to close a 12 s loop (10 and 6 cycles, the
 * lane's 5.2 and 3.1 rad/s within 1.3%), and once a loop the odd gust swells the ripple for about two
 * seconds. Each flag starts at its own point of the loop with its own phase, so flags never wave in step.
 *
 * Pure and deterministic (presentation only); the UI may not import the visuals (B2), so the lane's numbers
 * are restated here and the test checks the shape of the motion.
 */

/** One loop of the cloth, ms (both waves and the gust close it). */
export const CLOTH_LOOP_MS = 12_000;
/** Keyframes per second of the loop (the browser interpolates between them at the screen's rate). */
const SAMPLES_PER_S = 30;

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
/** Light and shade: the slope (cloth heights per cloth length) where a band starts to turn and where it is fully turned. */
const SHADE_FROM = 0.05;
const SHADE_FULL = 0.22;
const DARK_MAX = 0.2;
const LIGHT_MAX = 0.13;

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
  light: number;
}

/**
 * Strip `i` of `n` at `t` seconds. `aspect` is the cloth's height over its length (the shear turns the
 * slope across the strip into screen degrees), `phase` the flag's own phase.
 */
export function stripPose(i: number, n: number, t: number, aspect: number, phase: number): ClothPose {
  const amp = gustAt(t);
  const ul = i / n;
  const ur = (i + 1) / n;
  const yl = clothLift(ul, t, phase, amp);
  const yr = clothLift(ur, t, phase, amp);
  // the slope across the strip in cloth heights per cloth length: positive turns down, away from the light
  const slope = (yr - yl) * n;
  const turn = (x: number): number => Math.min(1, Math.max(0, (x - SHADE_FROM) / (SHADE_FULL - SHADE_FROM)));
  return {
    ty: yl * 100,
    sk: (Math.atan(slope * aspect) * 180) / Math.PI,
    tx: -clothPull(ul, t, phase, amp) * n * 100,
    sy: 1 + amp * ((ul + ur) / 2) * DROOP,
    dark: turn(slope) * DARK_MAX,
    light: turn(-slope) * LIGHT_MAX,
  };
}

const r3 = (x: number): number => Math.round(x * 1000) / 1000;

/** A pose as a CSS transform (the strip's transform origin is its top-left corner, at the cloth's top edge). */
export function poseTransform(p: ClothPose): string {
  return `translate(${r3(p.tx)}%, ${r3(p.ty)}%) skewY(${r3(p.sk)}deg) scaleY(${r3(p.sy)})`;
}

/** The keyframes of strip `i` of `n` over one loop (the last equals the first, so the loop has no seam). */
export function stripKeyframes(i: number, n: number, aspect: number, phase: number): { transform: Keyframe[]; dark: Keyframe[]; light: Keyframe[] } {
  const steps = Math.round((CLOTH_LOOP_MS / 1000) * SAMPLES_PER_S);
  const transform: Keyframe[] = [];
  const dark: Keyframe[] = [];
  const light: Keyframe[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = ((k % steps) / steps) * (CLOTH_LOOP_MS / 1000);
    const p = stripPose(i, n, t, aspect, phase);
    transform.push({ transform: poseTransform(p) });
    dark.push({ opacity: r3(p.dark) });
    light.push({ opacity: r3(p.light) });
  }
  return { transform, dark, light };
}

/** How many strips a flag `widthPx` wide is cut into: about 6-9 px each (finer shows no difference). */
export function stripCount(widthPx: number): number {
  return Math.max(5, Math.min(12, Math.round(widthPx / 8)));
}

/** A flag's own phase and start point in the loop from a seed (flags never wave in step). */
export function clothSeedOf(seed: number): { phase: number; offsetMs: number } {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return { phase: ((x % 6283) / 1000) * 1, offsetMs: (Math.floor(x / 6283) % CLOTH_LOOP_MS) };
}
