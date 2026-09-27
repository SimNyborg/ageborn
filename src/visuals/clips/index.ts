/**
 * The clip library and the per-family clip sets that fill `VisualDef.clips` (DESIGN B5).
 */
import type { ClipName, ClipRef } from '@/contracts/art';
import type { ClipDef, MotionSpec } from '../types';
import { ABILITY_CLIPS } from './abilities';
import { COMMON_CLIPS } from './common';

export const CLIP_LIBRARY: ReadonlyMap<string, ClipDef> = new Map([...COMMON_CLIPS, ...ABILITY_CLIPS].map((c) => [c.id, c]));

export const UNIT_CLIP_NAMES: readonly ClipName[] = ['spawn', 'idle', 'walk', 'attack', 'hit', 'stun', 'die', 'victory', 'ability'];
export const TURRET_CLIP_NAMES = ['build', 'idle', 'fire', 'sell', 'modernise'] as const;

export function getClip(id: string): ClipDef | undefined {
  return CLIP_LIBRARY.get(id);
}

function ref(id: string): ClipRef {
  const c = CLIP_LIBRARY.get(id);
  if (!c) throw new Error(`Unknown clip "${id}"`);
  return { kind: 'keyframes', ref: id, durationMs: c.durationMs, loop: c.loop };
}

/** The nine unit clips for a motion spec (every visual implements every clip name, A11). */
export function unitClipSet(m: MotionSpec): Record<ClipName, ClipRef> {
  const f = m.family;
  const die = f === 'vehicle' || f === 'walker' ? 'vehicle.die' : f === 'flyer' ? 'flyer.die' : 'common.die';
  return {
    spawn: ref('common.spawn'),
    idle: ref(`${f}.idle`),
    walk: ref(`${f}.walk`),
    attack: ref(m.attack),
    hit: ref('common.hit'),
    stun: ref('common.stun'),
    die: ref(die),
    victory: ref('common.victory'),
    ability: ref(m.ability),
  };
}

export function turretClipSet(fire = 'turret.fire'): Record<string, ClipRef> {
  return {
    build: ref('turret.build'),
    idle: ref('turret.idle'),
    fire: ref(fire),
    sell: ref('turret.sell'),
    modernise: ref('turret.modernise'),
  };
}
