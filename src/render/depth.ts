/**
 * Depth rows (DESIGN A2.1 Depth). The sim is 1D; the view spreads units over three depth rows by
 * their rank in their side's order, and depth-sorts by y. The sim spacing is unaffected.
 *
 * - A side's ground units are ordered like the sim's single file: p descending, then id ascending.
 * - The three front-rank units get y = -12, 0 and +12 lu (the three-wide front, SIM_VERSION 2).
 * - Every other unit gets y = -16, 0 or +16 lu by (rank index mod 3).
 * - In Siege a whole army may pile up at the enemy gate (the siege crowd, `economy.siege.gateCrowdLu`):
 *   units that close to the gate spread over seven depth rows, the later ones a little further back,
 *   so the pile reads as a crowd storming the base rather than figures drawn on top of each other.
 * - Air units fly at a fixed altitude above the lane (decision WP5 "air altitude").
 */
import type { Side } from '@/contracts';
import { LANE_LU } from './layout';

export const FRONT_ROWS_LU = [-12, 0, 12] as const;
/** Rows of the siege crowd at the enemy gate, in fill order (lu). */
export const CROWD_ROWS_LU = [-20, 8, -6, 20, -26, 14, 0] as const;
/** Units within this much of the enemy gate (own p ≥ L - 90) count as the crowd. */
export const CROWD_ZONE_LU = 90;
export const BACK_ROWS_LU = [-16, 0, 16] as const;
/** Height of air units' feet above the ground line (lu, negative = up). */
export const AIR_ALTITUDE_LU = -118;
/** z-order offset that keeps air units above every ground unit. */
export const AIR_Z = 10_000_000;

export interface DepthInput {
  id: number;
  side: Side;
  /** World x (lu). */
  x: number;
  air: boolean;
}

/** The y row (lu) of rank `r` (0-based) in a side's order. */
export function rowForRank(r: number): number {
  if (r < FRONT_ROWS_LU.length) return FRONT_ROWS_LU[r] ?? 0;
  return BACK_ROWS_LU[r % 3] ?? 0;
}

/** The y row (lu) of the k-th crowd unit (0-based, after the front rank) at the enemy gate. */
export function crowdRow(k: number): number {
  const n = CROWD_ROWS_LU.length;
  return Math.max(-34, (CROWD_ROWS_LU[k % n] ?? 0) - 4 * Math.floor(k / n));
}

/**
 * Target depth y (lu) per unit id. Ground units get their row; air units get the flight altitude with
 * a small alternating offset so stacked fliers stay readable.
 */
export function depthRows(units: readonly DepthInput[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const side of [0, 1] as const) {
    const dir = side === 0 ? 1 : -1;
    const ground = units.filter((u) => u.side === side && !u.air);
    // p descending: side 0 has p = x, side 1 has p = lane - x.
    ground.sort((a, b) => dir * (b.x - a.x) || a.id - b.id);
    let crowd = 0;
    ground.forEach((u, r) => {
      const p = side === 0 ? u.x : LANE_LU - u.x;
      if (r >= FRONT_ROWS_LU.length && p >= LANE_LU - CROWD_ZONE_LU) out.set(u.id, crowdRow(crowd++));
      else out.set(u.id, rowForRank(r));
    });
    const air = units.filter((u) => u.side === side && u.air).sort((a, b) => a.id - b.id);
    air.forEach((u, r) => out.set(u.id, AIR_ALTITUDE_LU + (r % 2 === 0 ? 0 : -14)));
  }
  return out;
}

/** Draw order for a unit at depth y: larger y (nearer the viewer) on top, air above ground. */
export function depthZ(y: number, air: boolean, id: number): number {
  if (air) return AIR_Z + (id % 1000);
  // Ground rows span about -34..20 lu; 1/16 lu steps, shifted positive, id breaks ties.
  return (Math.round(y * 16) + 4096) * 1000 + (id % 1000);
}

/** Moves `current` toward `target` by at most `maxStep` (row changes ease instead of jumping). */
export function easeToward(current: number, target: number, maxStep: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}
