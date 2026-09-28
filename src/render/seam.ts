/**
 * Split-age backdrop control (DESIGN A11 Split-age lane, A17.3).
 *
 * The seam between your age's half and the enemy's half starts at the lane's middle (x = 1,000 on the
 * 2,000 lu lane) and drifts toward the midpoint of the two front lines at no more than 30 lu/s, clamped
 * to x in [700, 1,300] (L/2 ± 300), so it is not a moving blend directly behind every fight. On evolve,
 * that side's half wipes to the new age from the base outward over 2.0 s (`BackdropView.wipe`).
 */
import type { Side } from '@/contracts';
import { LANE_LU } from './layout';

export const SEAM_START_LU = LANE_LU / 2;
export const SEAM_MIN_LU = SEAM_START_LU - 300;
export const SEAM_MAX_LU = SEAM_START_LU + 300;
export const SEAM_MAX_LU_PER_SEC = 30;
export const BACKDROP_WIPE_MS = 2000;

export interface FrontInput {
  side: Side;
  /** World x in lu. */
  x: number;
  air: boolean;
}

/** The front lines: side 0's rightmost and side 1's leftmost ground unit (null when a side has none). */
export function frontLines(units: readonly FrontInput[]): { left: number | null; right: number | null } {
  let left: number | null = null;
  let right: number | null = null;
  for (const u of units) {
    if (u.air) continue;
    if (u.side === 0) left = left === null ? u.x : Math.max(left, u.x);
    else right = right === null ? u.x : Math.min(right, u.x);
  }
  return { left, right };
}

/**
 * The fronts for the camera (A17.4 "Fronts"): each side's frontmost ground unit, or its frontmost
 * air unit when it has only air units; null when a side has no units.
 */
export function cameraFronts(units: readonly FrontInput[]): { left: number | null; right: number | null } {
  const ground = frontLines(units);
  let airL: number | null = null;
  let airR: number | null = null;
  for (const u of units) {
    if (!u.air) continue;
    if (u.side === 0) airL = airL === null ? u.x : Math.max(airL, u.x);
    else airR = airR === null ? u.x : Math.min(airR, u.x);
  }
  return { left: ground.left ?? airL, right: ground.right ?? airR };
}

/**
 * Midpoint of the two front lines. A side without ground units counts its gate as its front, so an
 * empty lane gives mid-lane and a lone push pulls the midpoint toward the defender.
 */
export function frontMidpoint(units: readonly FrontInput[]): number {
  const f = frontLines(units);
  const left = f.left ?? 0;
  const right = f.right ?? LANE_LU;
  return (left + right) / 2;
}

/**
 * The auto-follow focus x (A17.4 "Focus x") for the player on `mySide`, with the visible width `viewLu`:
 *
 * - both sides have units: own front + min(gap / 2, 0.3 V) toward the enemy (the midpoint in contact),
 * - only enemy units: the enemy front once it has crossed into your half; while it is still on
 *   their half, null (the opening view), so a fresh enemy spawn does not fly the camera across the
 *   lane at the start (decision A17 step 1 "camera"),
 * - only own units: own front + 0.3 V,
 * - no units: null (the opening view).
 */
export function followFocus(fronts: { left: number | null; right: number | null }, mySide: Side, viewLu: number, lane: number = LANE_LU): number | null {
  const dir = mySide === 0 ? 1 : -1;
  const own = mySide === 0 ? fronts.left : fronts.right;
  const foe = mySide === 0 ? fronts.right : fronts.left;
  if (own !== null && foe !== null) {
    const gap = Math.max(0, (foe - own) * dir);
    return own + dir * Math.min(gap / 2, 0.3 * viewLu);
  }
  if (foe !== null) return (foe - lane / 2) * dir < 0 ? foe : null;
  if (own !== null) return own + dir * 0.3 * viewLu;
  return null;
}

/**
 * The spectator follow focus (A17.4 "Pause and replays"): the midpoint of both ground fronts with no
 * bias toward either side; one side's front alone when only it has units; null with no units.
 */
export function spectatorFocus(fronts: { left: number | null; right: number | null }): number | null {
  if (fronts.left !== null && fronts.right !== null) return (fronts.left + fronts.right) / 2;
  return fronts.left ?? fronts.right;
}

/** The follow target centre (A17.4 "Framing"): the focus sits at 55% of the view from your side. */
export function framingCenter(focus: number, mySide: Side, viewLu: number): number {
  return focus - (mySide === 0 ? 1 : -1) * 0.05 * viewLu;
}

/** Advances the seam toward `target` at most `maxLuPerSec`, clamped to [700, 1,300]. */
export function stepSeam(seam: number, target: number, dtMs: number, maxLuPerSec = SEAM_MAX_LU_PER_SEC): number {
  const goal = Math.min(SEAM_MAX_LU, Math.max(SEAM_MIN_LU, target));
  const maxStep = (maxLuPerSec * Math.max(0, dtMs)) / 1000;
  const d = goal - seam;
  const next = Math.abs(d) <= maxStep ? goal : seam + Math.sign(d) * maxStep;
  return Math.min(SEAM_MAX_LU, Math.max(SEAM_MIN_LU, next));
}
