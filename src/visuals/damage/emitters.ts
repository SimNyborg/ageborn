/**
 * What a damaged unit gives off (queue item 40, design 3.3 and 3.5): machines smoke, spark and finally burn with small
 * pale flames, flyers trail smoke, mechs spark at the joints, energy bodies shed motes, tired beasts breathe vapour.
 * Soldiers emit nothing (their stage shows in marks, tint and weary motion). Pure: the view resolves each emitter's
 * place every frame (an emit spot of the bundle, else a point of its torso box or head) and the battle view spawns the
 * particles in world space through the shared pool, at the lowest priority, within its caps.
 */
import type { DamageFamily, DamageSpot, DamageStage, EmitKind } from './types';

/** Where an emitter sits: an emit spot of the bundle, or a point of the body (the fallback). */
export type EmitterAt = { spot: string } | 'torsoBack' | 'torsoTop' | 'torsoMid' | 'head';

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
 * without, machines smoke from the back of the torso and burn on top of it, energy bodies shed motes from the middle and
 * beasts and mounts breathe at the head.
 */
export function emittersFor(family: DamageFamily, stage: DamageStage, spots: readonly DamageSpot[] | undefined, heightLu: number): EmitterSpec[] {
  if (stage < 2) return [];
  const out: EmitterSpec[] = [];
  const emit = (spots ?? []).filter((s) => s.kind === 'emit');
  const machine = family === 'vehicle' || family === 'mech';
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
            if (machine) out.push({ kind: 'fire', at, rate: 3, size: size * 0.8 });
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
      if (machine) out.push({ kind: 'fire', at: 'torsoTop', rate: 3, size: puff * 0.8 });
      out.push({ kind: 'spark', at: 'torsoMid', rate: family === 'mech' ? 1.4 : 0.8, size: puff * 0.6 });
    }
    return out;
  }
  if (family === 'energy' && stage === 3) out.push({ kind: 'motes', at: 'torsoMid', rate: 2.5, size: puff * 0.7 });
  if ((family === 'beast' || family === 'rider') && stage === 3) out.push({ kind: 'breath', at: 'head', rate: 0.75, size: puff * 0.8 });
  return out;
}
