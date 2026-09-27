/**
 * Lane geometry (DESIGN A2.1, A2.7). World x runs from side 0's gate (0) to side 1's gate (LANE);
 * each side measures progress p from its own gate. All distances are milli-lu.
 *
 * Distance conventions (docs/decisions.md, WP2):
 * - unit to unit: edge distance |xA − xB| − (wA + wB)/2, minimum 0 (A2.7, "all ranges are edge distances");
 * - unit to a point (cleave, pierce, follow-behind reach from the primary's centre; beams): |x − xU| − wU/2;
 * - splash and power impacts: centre distance |x − xU| ("whose centre lies within the radius", A2.7).
 */
import type { Side } from '@/contracts';
import { LANE_MLU } from '@/core';

/** Direction of travel along x: +1 for side 0, −1 for side 1. */
export function dirOf(side: Side): 1 | -1 {
  return side === 0 ? 1 : -1;
}

/** World x to the side's progress p (and back: the mapping is its own inverse). */
export function pOf(x: number, side: Side): number {
  return side === 0 ? x : LANE_MLU - x;
}

export function xOf(p: number, side: Side): number {
  return side === 0 ? p : LANE_MLU - p;
}

/** Edge distance between two bodies, minimum 0. */
export function edgeDist(xa: number, halfA: number, xb: number, halfB: number): number {
  const d = (xa > xb ? xa - xb : xb - xa) - halfA - halfB;
  return d > 0 ? d : 0;
}

/** Distance from a point to a body's nearest edge, minimum 0. */
export function pointDist(x: number, xb: number, halfB: number): number {
  const d = (x > xb ? x - xb : xb - x) - halfB;
  return d > 0 ? d : 0;
}

/** Centre distance. */
export function centreDist(xa: number, xb: number): number {
  return xa > xb ? xa - xb : xb - xa;
}

/** True when `x` lies ahead of (or level with) `from` in the side's direction of travel. */
export function isAheadOrLevel(side: Side, from: number, x: number): boolean {
  return side === 0 ? x >= from : x <= from;
}

/** Edge distance from a body of `side` to the enemy gate line (A2.7: range to a base). */
export function distToEnemyGate(side: Side, x: number, half: number): number {
  const d = LANE_MLU - pOf(x, side) - half;
  return d > 0 ? d : 0;
}

/** Edge distance from `side`'s own gate line to a body (turret range, Last Stand, gate zones, A2.8). */
export function distFromGate(side: Side, x: number, half: number): number {
  const d = pOf(x, side) - half;
  return d > 0 ? d : 0;
}

/** Clamps a body centre to the lane: p ≥ 0 at the own gate, edge at the enemy gate (A2.7). */
export function clampToLane(side: Side, x: number, half: number): number {
  const p = pOf(x, side);
  const max = LANE_MLU - half;
  if (p < 0) return xOf(0, side);
  if (p > max) return xOf(max, side);
  return x;
}
