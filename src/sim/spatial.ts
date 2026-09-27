/**
 * Per-tick spatial index: each side's live units sorted by world x, so range queries scan only the
 * units near a point instead of the whole army (performance, DESIGN B16).
 *
 * Built at the start of B3 step 7. Nothing moves or dies between steps 7 and 9 (impacts are only
 * collected there), so targeting and abilities in steps 7-9 can use it; units spawned later in the
 * tick are picked up by the next tick's index, exactly as a full scan would see them next tick.
 */
import type { Side } from '@/contracts';
import type { Ctx, UnitRt } from './state';
import { alive } from './units';

/** Largest half-width (huge, 40 lu) in mlu: widens queries so edge-distance checks see every body. */
export const MAX_HALF = 40000;

export interface SpatialIndex {
  bySide: [UnitRt[], UnitRt[]];
}

export function createSpatial(): SpatialIndex {
  return { bySide: [[], []] };
}

const byX = (a: UnitRt, b: UnitRt): number => a.x - b.x || a.id - b.id;

export function buildSpatial(ctx: Ctx): void {
  const [a, b] = ctx.spatial.bySide;
  a.length = 0;
  b.length = 0;
  for (const u of ctx.s.units) {
    if (!alive(u)) continue;
    (u.side === 0 ? a : b).push(u);
  }
  a.sort(byX);
  b.sort(byX);
}

/** First index in a list sorted by x whose x ≥ lo. */
export function lowerBound(list: readonly UnitRt[], lo: number): number {
  let l = 0;
  let h = list.length;
  while (l < h) {
    const m = (l + h) >> 1;
    if ((list[m] as UnitRt).x < lo) l = m + 1;
    else h = m;
  }
  return l;
}

/** Units of `side` whose centre lies in [lo, hi], in x order (then id). */
export function unitsBetween(ctx: Ctx, side: Side, lo: number, hi: number, out: UnitRt[]): UnitRt[] {
  out.length = 0;
  const list = ctx.spatial.bySide[side];
  for (let i = lowerBound(list, lo); i < list.length; i += 1) {
    const u = list[i] as UnitRt;
    if (u.x > hi) break;
    if (alive(u)) out.push(u);
  }
  return out;
}
