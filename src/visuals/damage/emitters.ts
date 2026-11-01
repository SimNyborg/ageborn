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
 * Where an emitter sits: an emit spot of the bundle, a point of the torso box (`box`: its share across and up), or a
 * point of the body (the fallback: the back and the middle of the hull, never the top of the torso box, which holds a
 * crewed machine's crew and a humanoid mech's head).
 */
export type EmitterAt = { spot: string } | { box: readonly [number, number] } | 'torsoBack' | 'torsoMid' | 'head';

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
 * without, machines smoke from the back of the hull and spark at its middle, energy bodies shed motes from the middle
 * and beasts and mounts breathe at the head. A vehicle's last stage burns at `fire` (design 3.3: only vehicles burn;
 * mechs spark, flyers trail smoke): the place `fireAt` found clear of every head, or nowhere (smoke and sparks only).
 */
export function emittersFor(family: DamageFamily, stage: DamageStage, spots: readonly DamageSpot[] | undefined, heightLu: number, fire: EmitterAt | null = null): EmitterSpec[] {
  if (stage < 2) return [];
  const out: EmitterSpec[] = [];
  const emit = (spots ?? []).filter((s) => s.kind === 'emit');
  const machine = family === 'vehicle' || family === 'mech';
  const burning = burns(family) && stage === 3 && fire !== null;
  const flyer = family === 'flyer';
  if (emit.length > 0) {
    let fireSize = 0;
    for (const s of emit) {
      const at = { spot: s.id };
      const size = Math.max(4, Math.min(20, s.r || sizeOf(heightLu, 0.12)));
      switch (s.mat) {
        case 'smoke':
          if (stage === 2) out.push({ kind: 'smoke', at, rate: flyer ? 2.2 : 1.1, size });
          else {
            out.push({ kind: 'smokeDark', at, rate: flyer ? 3.2 : 2.0, size: size * 1.15 });
            fireSize = Math.max(fireSize, size * 0.8);
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
    // one fire, where it is clear of the crew (a smoke spot of the bundle, or the hull)
    if (burning && fireSize > 0) out.push({ kind: 'fire', at: fire, rate: 3, size: fireSize });
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
      if (burning) out.push({ kind: 'fire', at: fire, rate: 3, size: puff * 0.8 });
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
 * A flame's room beside a head (lu), past the head's radius: the face in front of the head's middle, the body under it
 * and the flame's own width (a fire's tongues, the ignite flare's bloom and embers rise from where they start).
 */
export const FIRE_SIDE_LU = 8;

/**
 * Whether a fire, the ignite flare or its embers may start at `(x, y)` with the head's middle at `(hx, hy)` and its
 * radius `r` (lu, x forward, y up; W0 review B1 and S3): below the head's middle, and beside the head by its radius and
 * a flame's room (`FIRE_SIDE_LU`). Not under it either: the crew's face, beard and body are there, and a flame rises.
 */
export function fireClear(x: number, y: number, hx: number, hy: number, r: number): boolean {
  return y < hy && Math.abs(x - hx) >= r + FIRE_SIDE_LU;
}

/**
 * The torso-box points a burning vehicle's fire may take, in order of preference: the hull's middle band, then toward
 * its front and back and lower down, never its top (a crewed machine's crew stands there).
 */
export const FIRE_BOX: readonly (readonly [number, number])[] = [
  [0.55, 0.45],
  [0.7, 0.4],
  [0.4, 0.4],
  [0.8, 0.32],
  [0.3, 0.32],
  [0.65, 0.25],
  [0.45, 0.25],
  [0.88, 0.45],
  [0.12, 0.45],
  [0.9, 0.22],
  [0.1, 0.22],
];

/** Clips a unit lives through with its emitters on (`die` plays with them off). */
function liveClips(entry: DamageUnitData): string[] {
  const names = new Set<string>([...Object.keys(entry.head ?? {}), ...Object.keys(entry.torso ?? {}), ...Object.keys(entry.clips ?? {})]);
  names.delete('die');
  return [...names];
}

/** How many frames a clip has in the entry (the longest of its tracks). */
function framesOf(entry: DamageUnitData, clip: string): number {
  let n = Math.max(entry.head?.[clip]?.length ?? 0, entry.torso?.[clip]?.length ?? 0);
  for (const frames of Object.values(entry.clips?.[clip] ?? {})) n = Math.max(n, frames.length);
  return n;
}

const fireCache = new WeakMap<DamageUnitData, Map<string, EmitterAt | null>>();

/**
 * Where a burning unit's fire sits, and where its ignite flare and the flare's embers start (design 3.3; W0 review B1
 * and S3): the first smoke emit spot of the bundle, else the first point of `FIRE_BOX` on the tracked torso, that is
 * `fireClear` of the head (the tracked one, else the anchor; radius `headClearLu`) on every frame of every clip the unit
 * lives through, so the fire never jumps. Null when no place is: the unit smokes and sparks but never burns and plays no
 * flare. Without a tracked torso the one candidate is the anchors' fallback point. Cached per bundle entry.
 */
export function fireAt(entry: DamageUnitData | null, anchors: Anchors, heightLu: number): EmitterAt | null {
  const key = `${heightLu}:${anchors.head.x}:${anchors.head.y}:${anchors.hitCenter.x}:${anchors.hitCenter.y}`;
  let byDef = entry ? fireCache.get(entry) : undefined;
  if (entry && byDef?.has(key)) return byDef.get(key) ?? null;
  const r = headClearLu(heightLu);
  const p: [number, number] = [0, 0];
  const clips = entry ? liveClips(entry) : [];
  const clear = (at: EmitterAt): boolean => {
    const spec: EmitterSpec = { kind: 'fire', at, rate: 0, size: 0 };
    let seen = 0;
    for (const clip of clips) {
      for (let f = 0, n = framesOf(entry as DamageUnitData, clip); f < n; f++) {
        if (!emitterPoint(spec, entry, clip, f, anchors, heightLu, p)) continue;
        seen++;
        const head = frameOf(entry?.head?.[clip], f);
        if (!fireClear(p[0], p[1], head ? head[0] : anchors.head.x, head ? head[1] : -anchors.head.y, r)) return false;
      }
    }
    if (seen > 0) return true;
    // no tracks at all: the static fallback point against the anchor head
    if (!emitterPoint(spec, entry, 'idle', 0, anchors, heightLu, p)) return false;
    return fireClear(p[0], p[1], anchors.head.x, -anchors.head.y, r);
  };
  let found: EmitterAt | null = null;
  for (const s of entry?.spots ?? []) {
    if (s.kind === 'emit' && s.mat === 'smoke' && clear({ spot: s.id })) {
      found = { spot: s.id };
      break;
    }
  }
  const tracked = !!entry?.torso && Object.keys(entry.torso).length > 0;
  const boxes = found ? [] : tracked ? FIRE_BOX : FIRE_BOX.slice(0, 1);
  for (const box of boxes) {
    if (clear({ box })) {
      found = { box };
      break;
    }
  }
  if (entry) {
    if (!byDef) fireCache.set(entry, (byDef = new Map()));
    byDef.set(key, found);
  }
  return found;
}

/**
 * A fallback point on a torso box `[x0, y0, x1, y1]` (lu, x forward, y up), into `out`: the back and the middle band of
 * the hull, never the box's top (a crewed machine's box holds its crew, a humanoid mech's ends at its head); or the
 * box's point at its shares `[u, v]` across and up.
 */
export function torsoPoint(at: 'torsoBack' | 'torsoMid' | readonly [number, number], t: readonly [number, number, number, number], out: [number, number]): void {
  const [x0, y0, x1, y1] = t;
  const w = x1 - x0;
  const h = y1 - y0;
  if (at === 'torsoBack') {
    out[0] = x0 + 0.22 * w;
    out[1] = y0 + 0.6 * h;
  } else if (at === 'torsoMid') {
    out[0] = x0 + 0.5 * w;
    out[1] = y0 + 0.5 * h;
  } else {
    out[0] = x0 + at[0] * w;
    out[1] = y0 + at[1] * h;
  }
}

/**
 * Where an emitter sits on the frame on screen (sheet lu, x forward, y up from the feet), into `out`; false when its emit
 * spot is hidden on this frame. An emit spot sits where it was authored. A body or box point comes from the tracked torso
 * box, else the static anchors, and keeps `headClearLu` from the head (the tracked one, else the anchor): a point within
 * it moves straight down to the clearance's edge. Breath leaves the nose, a little ahead of the head's middle. (Fire sits
 * where `fireAt` found it clear of the head on every frame, so it never needs that move.)
 */
export function emitterPoint(s: EmitterSpec, entry: DamageUnitData | null, anim: string, frame: number, anchors: Anchors, heightLu: number, out: [number, number]): boolean {
  if (typeof s.at === 'object' && 'spot' in s.at) {
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
  const at = typeof s.at === 'object' ? s.at.box : s.at;
  const torso = frameOf(entry?.torso?.[anim], frame);
  if (torso) torsoPoint(at, torso, out);
  else {
    const c = anchors.hitCenter;
    out[0] = c.x + (at === 'torsoBack' ? -0.18 * heightLu : 0.04 * heightLu);
    out[1] = -c.y + (at === 'torsoBack' ? 0.06 * heightLu : 0);
  }
  const r = headClearLu(heightLu);
  const dx = out[0] - hx;
  const dy = out[1] - hy;
  if (dx * dx + dy * dy < r * r) out[1] = hy - Math.sqrt(r * r - dx * dx);
  return true;
}
