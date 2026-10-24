/**
 * The clash moment (queue item 38 A6): two lines meeting. When the first melee blows land after the fronts were
 * apart for a while, with enough units of each side near the contact, the battle answers once: a crash, a dust
 * curtain along the contact line, a small camera punch, a kick, a short hit-stop on the engaged units and a lift
 * of the music's intensity; on wide screens the camera leans in a little.
 *
 * Pure and deterministic: the event mapper feeds it the melee blows on the sim's clock (ticks), so a replay meets
 * its clashes on the same blows.
 */
import type { Side } from '@/contracts';

export interface ClashRules {
  /** No melee blow landed for at least this long (game ms): the fronts were apart, the next contact is new. */
  apartMs: number;
  /** A new contact may still become a clash this long after its first blow (the rest of the lines arriving). */
  windowMs: number;
  /** At most one clash per this long (game ms). */
  gapMs: number;
  /** Units within this distance (lu) of the contact count as its lines. */
  nearLu: number;
  /** Each side needs at least this many units near the contact. */
  minPerSide: number;
  /** The shake (trauma, 0..1) and the camera punch (zoom share and length, ms), for a clash in view. */
  trauma: number;
  punchZoom: number;
  punchMs: number;
  /** The short hit-stop on the engaged units near the contact (ms; units in their wind-up are left alone). */
  freezeMs: number;
  /** Music intensity added (0..1). */
  intensity: number;
  /** The dust curtain's width (lu): `baseLu` plus `perUnitLu` per unit near the contact, clamped. */
  width: { baseLu: number; perUnitLu: number; minLu: number; maxLu: number };
  /**
   * The wide-screen lean-in (MR-80 rules: only while the camera follows, never while the player works it, ended by
   * any camera input; not with Reduce motion): screens showing at least `minViewLu` of world, a fight with at least
   * `minPerSide` units a side; zoom and its in, hold and out (ms).
   */
  lean: { minViewLu: number; minPerSide: number; zoom: number; inMs: number; holdMs: number; outMs: number };
}

export const CLASH_DEFAULTS: ClashRules = {
  apartMs: 3000,
  windowMs: 1500,
  gapMs: 8000,
  nearLu: 140,
  minPerSide: 2,
  trauma: 0.4,
  punchZoom: 0.03,
  punchMs: 300,
  freezeMs: 70,
  intensity: 0.35,
  width: { baseLu: 60, perUnitLu: 14, minLu: 100, maxLu: 220 },
  lean: { minViewLu: 1050, minPerSide: 3, zoom: 1.08, inMs: 500, holdMs: 1600, outMs: 900 },
};

/** A unit as the clash counts it: its side and world x (lu). Forts do not count. */
export interface ClashUnit {
  side: Side;
  x: number;
  fort?: boolean;
}

/** How many units of each side stand within `nearLu` of `x`. */
export function countNear(units: Iterable<ClashUnit>, x: number, nearLu: number): [number, number] {
  const n: [number, number] = [0, 0];
  for (const u of units) {
    if (u.fort || Math.abs(u.x - x) > nearLu) continue;
    n[u.side]++;
  }
  return n;
}

/** The dust curtain's width (lu) for a clash with these counts. */
export function clashWidth(near: readonly [number, number], r: ClashRules = CLASH_DEFAULTS): number {
  const w = r.width.baseLu + r.width.perUnitLu * (near[0] + near[1]);
  return Math.round(Math.max(r.width.minLu, Math.min(r.width.maxLu, w)));
}

/** Follows the melee blows of a match and says which one is a clash. */
export class ClashDetector {
  private lastBlowMs = -Infinity;
  private contactMs = -Infinity;
  private lastClashMs = -Infinity;
  private firedThisContact = false;

  /**
   * A melee blow between two units landed at game time `ms`; `near` counts the units of each side near it (asked
   * only when the blow could be the clash). Returns the counts when this blow is the clash (the moment plays once),
   * else null.
   */
  blow(ms: number, near: () => readonly [number, number], r: ClashRules = CLASH_DEFAULTS): readonly [number, number] | null {
    if (ms - this.lastBlowMs >= r.apartMs) {
      this.contactMs = ms;
      this.firedThisContact = false;
    }
    this.lastBlowMs = Math.max(this.lastBlowMs, ms);
    if (this.firedThisContact || ms - this.contactMs > r.windowMs || ms - this.lastClashMs < r.gapMs) return null;
    const n = near();
    if (n[0] < r.minPerSide || n[1] < r.minPerSide) return null;
    this.firedThisContact = true;
    this.lastClashMs = ms;
    return n;
  }

  reset(): void {
    this.lastBlowMs = -Infinity;
    this.contactMs = -Infinity;
    this.lastClashMs = -Infinity;
    this.firedThisContact = false;
  }
}
