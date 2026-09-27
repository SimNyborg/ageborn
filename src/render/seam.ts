/**
 * Split-age backdrop control (DESIGN A11 Split-age lane).
 *
 * The seam between your age's half and the enemy's half starts at x = 600 and drifts toward the
 * midpoint of the two front lines at no more than 20 lu/s, clamped to x in [450, 750], so it is not a
 * moving blend directly behind every fight. On evolve, that side's half wipes to the new age from the
 * base outward over 1.5 s (`BackdropView.wipe`).
 */
import type { Side } from '@/contracts';
import { LANE_LU } from './layout';

export const SEAM_START_LU = 600;
export const SEAM_MIN_LU = 450;
export const SEAM_MAX_LU = 750;
export const BACKDROP_WIPE_MS = 1500;

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
 * Midpoint of the two front lines. A side without ground units counts its gate as its front, so an
 * empty lane gives mid-lane and a lone push pulls the midpoint toward the defender.
 */
export function frontMidpoint(units: readonly FrontInput[]): number {
  const f = frontLines(units);
  const left = f.left ?? 0;
  const right = f.right ?? LANE_LU;
  return (left + right) / 2;
}

/** Advances the seam toward `target` at most `maxLuPerSec`, clamped to [450, 750]. */
export function stepSeam(seam: number, target: number, dtMs: number, maxLuPerSec = 20): number {
  const goal = Math.min(SEAM_MAX_LU, Math.max(SEAM_MIN_LU, target));
  const maxStep = (maxLuPerSec * Math.max(0, dtMs)) / 1000;
  const d = goal - seam;
  const next = Math.abs(d) <= maxStep ? goal : seam + Math.sign(d) * maxStep;
  return Math.min(SEAM_MAX_LU, Math.max(SEAM_MIN_LU, next));
}
