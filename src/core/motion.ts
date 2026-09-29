/**
 * Motion tokens (docs/ui-plan.md 5.2): the one source of every UI duration, easing curve and standard
 * transform. Integers only, so core's float rule holds (DESIGN B3): durations in ms, curve control
 * points and scales in thousandths, offsets in px.
 *
 * `src/ui/theme.css` defines the same values as CSS variables (`--ui-dur-*`, `--ui-ease-*`,
 * `--ui-press-scale` and so on); `tests/integrity/motion.test.ts` proves they are equal. DOM helpers
 * (`src/ui/components/motion.ts`) and the Pixi tweens of the capsule stage and the HUD read these
 * values, so a button, a card flip and a capsule land feel like one game.
 */

/** Durations in ms (ui-plan 5.2 "Durations"). */
export const MOTION_DUR = {
  /** Pointer-down squash; must start in the same frame. */
  press: 70,
  /** Release with overshoot. */
  release: 140,
  /** Hover, toggles, chips, tab indicator, reduced-motion fades. */
  micro: 150,
  /** Tooltips, popovers, toasts in, list items in, small reveals. */
  small: 220,
  /** Sheets, modals, screen transitions on phones, container transforms. */
  medium: 300,
  /** Screen transitions on desktop, camera pans on the map; the upper limit for navigation. */
  large: 400,
  /** Exits, about 0.7 x the entrance. */
  smallOut: 160,
  mediumOut: 200,
  largeOut: 280,
  /** Per item in a staggered list; the whole stagger stays at or under `staggerMax`. */
  stagger: 40,
  staggerMax: 240,
  /** Count-ups for a change of at most 10 / 100 / 1,000 / more. */
  countS: 400,
  countM: 600,
  countL: 800,
  countXL: 900,
  /** Tokens flying to a counter (plus or minus `flyJitter`, from a UI-only seed). */
  fly: 500,
  flyJitter: 50,
  /** The impact pause: UI impact and medium moments. */
  hold: 60,
  holdMedium: 120,
  /** One celebration beat (medium and large classes only). */
  beatMin: 600,
  beatMax: 1500,
  /** The one attention pulse; the sheen sweeps every `sheen`. */
  breathe: 2000,
  sheen: 3500,
  /** Long-press to info and hover to tip (built values). */
  longPress: 450,
  tipHover: 350,
  /** A toast's stay, and a toast with Undo. */
  toast: 2600,
  toastUndo: 4000,
  /** The reduced-motion cross-fade that replaces movement (ui-plan 5.6). */
  reduced: 150,
} as const;

export type MotionDurToken = keyof typeof MOTION_DUR;

/** A cubic Bezier curve as [x1, y1, x2, y2] in thousandths. */
export type Curve = readonly [number, number, number, number];

/** The easing curves (ui-plan 5.2 "Easing curves"), exactly these plus `linear`. */
export const MOTION_EASE = {
  /** Moves on screen, shared-axis slides, map pans. */
  standard: [200, 0, 0, 1000],
  /** Things arriving (sheets, screens, toasts). */
  enter: [50, 700, 100, 1000],
  /** Things leaving. */
  exit: [300, 0, 800, 150],
  /** General decelerate, fills, count-ups. */
  out: [220, 1000, 360, 1000],
  /** Pops, lands, bumps, release overshoot (small elements only). */
  back: [340, 1560, 640, 1000],
  /** Wind-ups before a fling (pull back, dip). */
  anticipate: [360, 0, 660, -560],
} as const satisfies Record<string, Curve>;

export type MotionEaseToken = keyof typeof MOTION_EASE;

/** Standard transforms (ui-plan 5.2): scales in thousandths, offsets in px. */
export const MOTION_TRANSFORM = {
  /** Button press. */
  pressScale: 960,
  /** Release overshoot peak. */
  releaseScale: 1020,
  /** Lift on select and on drag. */
  lift: 1060,
  liftDrag: 1080,
  /** Bump on arrival (1.15 then 1). */
  bump: 1150,
  /** Pop-in peak (0, then 1.15, then 1). */
  pop: 1150,
  /** Shared-axis offsets: screens and in-screen tabs. */
  axisOffset: 24,
  axisOffsetTabs: 16,
  /** Screen Z: in from 0.96, out to 1.04. */
  screenIn: 960,
  screenOut: 1040,
  /** Attention pulse scale peak. */
  breatheScale: 1030,
  /** Drag tilt in degrees. */
  dragTilt: 4,
} as const;

export type MotionTransformToken = keyof typeof MOTION_TRANSFORM;

/** CSS text for a curve, for example `cubic-bezier(0.2, 0, 0, 1)`. */
export function curveCss(c: Curve): string {
  return `cubic-bezier(${c.map((n) => thousandths(n)).join(', ')})`;
}

/** 200 -> "0.2", -560 -> "-0.56", 1000 -> "1" (exact decimal text, no float math). */
export function thousandths(n: number): string {
  const neg = n < 0;
  const a = neg ? -n : n;
  const whole = (a - (a % 1000)) / 1000;
  const frac = a % 1000;
  let s = String(whole);
  if (frac !== 0) s += '.' + String(frac).padStart(3, '0').replace(/0+$/, '');
  return neg ? '-' + s : s;
}

/** The count-up duration for a change of `delta` (ui-plan 5.2 countS..countXL). */
export function countDuration(delta: number): number {
  const d = delta < 0 ? -delta : delta;
  if (d <= 10) return MOTION_DUR.countS;
  if (d <= 100) return MOTION_DUR.countM;
  if (d <= 1000) return MOTION_DUR.countL;
  return MOTION_DUR.countXL;
}

/** Delay of item `i` in a stagger, capped so the whole stagger stays within `staggerMax`. */
export function staggerDelay(i: number, step: number = MOTION_DUR.stagger): number {
  const d = i * step;
  return d > MOTION_DUR.staggerMax ? MOTION_DUR.staggerMax : d;
}
