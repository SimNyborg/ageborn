/**
 * The collapse runs once per match, so its code is always cold when a base falls, and cold code costs
 * several times more on the very frame of the end. A small collapse (a fracture and the dry run's
 * physics, no display objects) run once when the first base view is made gets it compiled while the
 * battle loads instead.
 */
import { fracture } from './fracture';
import { COLLAPSE_PROFILES } from './profiles';
import { collapseBeats } from './world';

let warmed = false;

/** Runs once per page; later calls return at once. */
export function warmCollapse(): void {
  if (warmed) return;
  warmed = true;
  for (const p of [COLLAPSE_PROFILES.medieval, COLLAPSE_PROFILES.future]) {
    const rect = { x: -182, y: -320, w: 210, h: 345 };
    const fr = fracture({ rect, mask: null, seed: 7, cells: Math.round(p.cells * 0.55), stumpLu: p.stumpLu, aspect: p.aspect, topple: p.topple });
    collapseBeats({ fracture: fr, profile: p, seed: 7, lite: true, reduce: false, kitFrames: 0, treasuryAt: null, lights: [], smokeSpots: [] });
  }
}
