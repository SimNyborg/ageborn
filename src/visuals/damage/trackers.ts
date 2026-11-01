/**
 * Item 38 B0: the combat staging's body data from the per-frame trackers the art pipeline writes into the damage bundle
 * (contract C1: every unit's torso box and head point on every frame, measured on the rig), in place of the estimate
 * from the team-colour layer's box. The team layer spans whatever wears the team colour: a knight's barding and lance
 * pennant (a Destrier Knight's "torso" reached 83 lu in front of its feet, its horse's chest is at 30), a shield or a
 * cape. The trackers are the body itself. Units without a bundle entry keep the estimate (the fallback).
 *
 * Pure: lu from the feet, x forward, y up, scaled by `hk` (screen lu per sheet lu, 1 except for an entry drawn smaller
 * than its sheet).
 */
import { frameOf } from './bundle';
import type { DamageUnitData } from './types';

/** What the trackers add to a unit view's `reach()` (all screen lu from the feet, facing +x, y up). */
export interface TrackerReach {
  /** The torso's front and back at idle (the mean over the idle frames), replacing the team layer's. */
  torsoFrontLu: number;
  torsoBackLu: number;
  /** The torso's bottom and top at idle: a head at these heights meets the torso, not the head. */
  torsoBottomLu: number;
  torsoTopLu: number;
  /** The head's centre at idle (mean). */
  headIdleLu?: number;
  headIdleYLu?: number;
  /** The head's centre on the attack's impact frame (riders and mounts: the leading head, the mount's). */
  headLu?: number;
  headYLu?: number;
  /** The torso's front on the impact frame (a swing leans the torso forward as well as moving it). */
  torsoImpactLu?: number;
}

/**
 * The tracker data of attack clip `anim` (its impact on unique frame `impactFrame`, null when unknown), with the idle
 * reference from `idleAnim`; null when the entry has no idle torso (no bundle, or a unit the pipeline has not measured).
 */
export function trackerReach(e: DamageUnitData | null | undefined, anim: string, idleAnim: string, impactFrame: number | null, hk: number): TrackerReach | null {
  const idle = e?.torso?.[idleAnim];
  if (!idle || idle.length === 0) return null;
  let front = 0;
  let back = 0;
  let bottom = 0;
  let top = 0;
  for (const [x0, y0, x1, y1] of idle) {
    front += x1;
    back -= x0;
    bottom += y0;
    top += y1;
  }
  const n = idle.length;
  const out: TrackerReach = { torsoFrontLu: (front / n) * hk, torsoBackLu: (back / n) * hk, torsoBottomLu: (bottom / n) * hk, torsoTopLu: (top / n) * hk };
  const heads = e?.head?.[idleAnim];
  if (heads && heads.length > 0) {
    let hx = 0;
    let hy = 0;
    for (const [x, y] of heads) {
      hx += x;
      hy += y;
    }
    out.headIdleLu = (hx / heads.length) * hk;
    out.headIdleYLu = (hy / heads.length) * hk;
  }
  if (impactFrame !== null) {
    const h = frameOf(e?.head?.[anim], impactFrame);
    if (h) {
      out.headLu = h[0] * hk;
      out.headYLu = h[1] * hk;
    }
    const tb = frameOf(e?.torso?.[anim], impactFrame);
    if (tb) out.torsoImpactLu = tb[2] * hk;
  }
  return out;
}
