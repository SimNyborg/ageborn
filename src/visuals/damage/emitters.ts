/**
 * What a damaged unit gives off (queue item 40, design 3.3 and 3.5): machines smoke, spark and finally burn with small
 * pale flames, flyers trail smoke, mechs spark at the joints, energy bodies shed motes, tired beasts breathe vapour.
 * Soldiers emit nothing (their stage shows in marks, tint and weary motion). Pure: the view resolves each emitter's
 * place every frame (an emit spot of the bundle, else a point of its torso box or head) and the battle view spawns the
 * particles in world space through the shared pool, at the lowest priority, within its caps.
 */
import type { Anchors } from '@/contracts/art';
import { frameOf } from './bundle';
import { burns } from './stage';
import type { DamageFamily, DamageSpot, DamageStage, DamageUnitData, EmitKind, SpotFrame } from './types';

/**
 * Where an emitter sits: an emit spot of the bundle, or a point of the body (the fallback: the back and the middle of
 * the hull, never the top of the torso box, which holds a crewed machine's crew and a humanoid mech's head).
 */
export type EmitterAt = { spot: string } | 'torsoBack' | 'hull' | 'torsoMid' | 'head';

export interface EmitterSpec {
  kind: EmitKind;
  at: EmitterAt;
  /** Particles per second of game time ("clear" strength, the owner's default). */
  rate: number;
  /** Puff size (lu). */
  size: number;
}

/** Puff size of a fallback emitter: a share of the body's height, within reason. */
function sizeOf(heightLu: number, share: number): number {
  return Math.max(5, Math.min(18, heightLu * share));
}

/**
 * The emitters of a unit at a stage. With emit spots (contract C1: `mat` is the medium) each spot speaks for itself;
 * without, machines smoke from the back of the hull, vehicles burn on its middle (design 3.3: only vehicles burn; mechs
 * spark, flyers trail smoke), energy bodies shed motes from the middle and beasts and mounts breathe at the head.
 */
export function emittersFor(family: DamageFamily, stage: DamageStage, spots: readonly DamageSpot[] | undefined, heightLu: number): EmitterSpec[] {
  if (stage < 2) return [];
  const out: EmitterSpec[] = [];
  const emit = (spots ?? []).filter((s) => s.kind === 'emit');
  const machine = family === 'vehicle' || family === 'mech';
  const fire = burns(family);
  const flyer = family === 'flyer';
  if (emit.length > 0) {
    for (const s of emit) {
      const at = { spot: s.id };
      const size = Math.max(4, Math.min(20, s.r || sizeOf(heightLu, 0.12)));
      switch (s.mat) {
        case 'smoke':
          if (stage === 2) out.push({ kind: 'smoke', at, rate: flyer ? 2.2 : 1.1, size });
          else {
            out.push({ kind: 'smokeDark', at, rate: flyer ? 3.2 : 2.0, size: size * 1.15 });
            if (fire) out.push({ kind: 'fire', at, rate: 3, size: size * 0.8 });
          }
          break;
        case 'steam':
          out.push({ kind: 'steam', at, rate: stage === 2 ? 1.3 : 2.4, size });
          break;
        case 'spark':
          if (stage === 3 || family === 'mech') out.push({ kind: 'spark', at, rate: stage === 3 ? 1.4 : 0.6, size });
          break;
        case 'breath':
          if (stage === 3) out.push({ kind: 'breath', at, rate: 0.75, size });
          break;
        case 'motes':
          if (stage === 3) out.push({ kind: 'motes', at, rate: 2.5, size });
          break;
      }
    }
    return out;
  }
  // the fallback: points of the body
  const puff = sizeOf(heightLu, 0.12);
  if (machine || flyer) {
    if (stage === 2) {
      out.push({ kind: 'smoke', at: 'torsoBack', rate: flyer ? 2.2 : 1.1, size: puff });
      if (family === 'mech') out.push({ kind: 'spark', at: 'torsoMid', rate: 0.6, size: puff * 0.6 });
    } else {
      out.push({ kind: 'smokeDark', at: 'torsoBack', rate: flyer ? 3.2 : 2.0, size: puff * 1.15 });
      if (fire) out.push({ kind: 'fire', at: 'hull', rate: 3, size: puff * 0.8 });
      out.push({ kind: 'spark', at: 'torsoMid', rate: family === 'mech' ? 1.4 : 0.8, size: puff * 0.6 });
    }
    return out;
  }
  if (family === 'energy' && stage === 3) out.push({ kind: 'motes', at: 'torsoMid', rate: 2.5, size: puff * 0.7 });
  if ((family === 'beast' || family === 'rider') && stage === 3) out.push({ kind: 'breath', at: 'head', rate: 0.75, size: puff * 0.8 });
  return out;
}

/** The room a body emitter keeps from the head (lu): smoke and fire never start on a crew's face or a robot's head. */
export function headClearLu(heightLu: number): number {
  return Math.max(8, Math.min(16, 0.18 * heightLu));
}

/**
 * A fallback point on a torso box `[x0, y0, x1, y1]` (lu, x forward, y up), into `out`: the back and the middle band of
 * the hull, never the box's top (a crewed machine's box holds its crew, a humanoid mech's ends at its head).
 */
export function torsoPoint(at: 'torsoBack' | 'hull' | 'torsoMid', t: readonly [number, number, number, number], out: [number, number]): void {
  const [x0, y0, x1, y1] = t;
  const w = x1 - x0;
  const h = y1 - y0;
  if (at === 'torsoBack') {
    out[0] = x0 + 0.22 * w;
    out[1] = y0 + 0.6 * h;
  } else if (at === 'hull') {
    out[0] = x0 + 0.55 * w;
    out[1] = y0 + 0.45 * h;
  } else {
    out[0] = x0 + 0.5 * w;
    out[1] = y0 + 0.5 * h;
  }
}

/**
 * Where an emitter sits on the frame on screen (sheet lu, x forward, y up from the feet), into `out`; false when its emit
 * spot is hidden on this frame. An emit spot sits where it was authored. A body point comes from the tracked torso box,
 * else the static anchors, and keeps `headClearLu` from the head (the tracked one, else the anchor): a point within it
 * moves straight down to the clearance's edge. Breath leaves the nose, a little ahead of the head's middle.
 */
export function emitterPoint(s: EmitterSpec, entry: DamageUnitData | null, anim: string, frame: number, anchors: Anchors, heightLu: number, out: [number, number]): boolean {
  if (typeof s.at === 'object') {
    const f = frameOf<SpotFrame>(entry?.clips?.[anim]?.[s.at.spot], frame);
    if (!f || f[4] <= 0) return false;
    out[0] = f[0];
    out[1] = f[1];
    return true;
  }
  const head = frameOf(entry?.head?.[anim], frame);
  const hx = head ? head[0] : anchors.head.x;
  const hy = head ? head[1] : -anchors.head.y;
  if (s.at === 'head') {
    out[0] = hx + heightLu * 0.06;
    out[1] = hy;
    return true;
  }
  const torso = frameOf(entry?.torso?.[anim], frame);
  if (torso) torsoPoint(s.at, torso, out);
  else {
    const c = anchors.hitCenter;
    out[0] = c.x + (s.at === 'torsoBack' ? -0.18 * heightLu : 0.04 * heightLu);
    out[1] = -c.y + (s.at === 'torsoBack' ? 0.06 * heightLu : 0);
  }
  const r = headClearLu(heightLu);
  const dx = out[0] - hx;
  const dy = out[1] - hy;
  if (dx * dx + dy * dy < r * r) out[1] = hy - Math.sqrt(r * r - dx * dx);
  return true;
}
