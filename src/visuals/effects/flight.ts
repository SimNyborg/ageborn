/**
 * Projectile paths (queue item 44). Presentation only: the sim decides only `arc` and the travel time, and every
 * path below lands exactly where and when the sim's shot does.
 *
 * A path runs from the muzzle to the target with x linear in the flight's progress u and y the straight line minus a
 * bulge `4 h u (1 - u)` (h lu at mid flight). The bulge that makes the path leave at a given angle is
 * `h = (|dx| tan(launch) - dyUp) / 4`; it is never negative (a projectile does not curve upward), so a weapon that
 * points at or below its target shoots straight. With a level launch at a target below (a bomb from a plane, a shell
 * from a tall gun) the path is the gravity drop `y = y0 + dy u^2`.
 */

/** The steepest launch an aimed path takes (deg; the render layer gives a steeper weapon's shot to a variant that fits). */
export const MAX_LAUNCH_DEG = 70;
/** The highest bulge an aimed path takes (lu over the straight line at mid flight): a peak stays inside a phone's view (about 240 lu above the ground). */
export const MAX_BULGE_LU = 200;
/**
 * The highest a path climbs over the higher of its two ends, as a share of the distance across: a steep lob over a
 * short distance (a flare pistol fired straight up, a rifle grenade) stays in view and never moves more than about
 * one and a half times as fast as the sim's shot (it still leaves at about 63 degrees over flat ground).
 */
export const MAX_RISE_SHARE = 0.5;

/** The bulge (lu) of a path over `dx` lu across and `dyUp` lu up (negative when the target is below) leaving at `launchDeg`. */
export function aimedBulge(dx: number, dyUp: number, launchDeg: number): number {
  if (!Number.isFinite(launchDeg)) return 0;
  const a = (Math.max(-80, Math.min(MAX_LAUNCH_DEG, launchDeg)) * Math.PI) / 180;
  const h = (Math.abs(dx) * Math.tan(a) - dyUp) / 4;
  return Math.max(0, Math.min(MAX_BULGE_LU, riseCap(dx, dyUp), h));
}

/**
 * The bulge at which the path's peak stands `MAX_RISE_SHARE * |dx|` over the higher end. The path's height over its
 * start is `dyUp u + 4 h u (1 - u)`, which peaks at `(dyUp + 4h)^2 / 16h`; setting that to the rise plus the higher
 * end's height and solving for h gives `(2P + |dyUp| + 2 sqrt(P (P + |dyUp|))) / 4` for either sign of `dyUp`.
 */
function riseCap(dx: number, dyUp: number): number {
  const p = MAX_RISE_SHARE * Math.abs(dx);
  const d = Math.abs(dyUp);
  return (2 * p + d + 2 * Math.sqrt(p * (p + d))) / 4;
}

/** The bulge (lu) of the classic arc for a shot without an aim: about a third of the distance, 28 to 170 lu. */
export function classicBulge(dist: number): number {
  return Math.min(170, Math.max(28, dist * 0.32));
}

/** The launch angle (deg above the horizontal toward the target) of a path with bulge `h` over `dx` across and `dyUp` up. */
export function launchOf(dx: number, dyUp: number, h: number): number {
  return (Math.atan2(dyUp + 4 * h, Math.max(1e-6, Math.abs(dx))) * 180) / Math.PI;
}
