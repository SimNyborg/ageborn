/**
 * Helpers shared by the rig builders: the root/spin bones, anchors, palettes and slot shorthands.
 */
import type { Anchors } from '@/contracts/art';
import { boneWorld } from '../pose';
import { matApply } from '../svg';
import type { BoneDef, SlotDef } from '../types';

/**
 * Every rig starts with `root` at the feet (scale and squash anchor on the ground) and `spin` at the
 * body centre (death spins turn around the middle of the body, not the feet).
 */
export function rootBones(centerY: number): BoneDef[] {
  return [
    { id: 'root', parent: null, x: 0, y: 0 },
    { id: 'spin', parent: 'root', x: 0, y: centerY },
  ];
}

/** Rest-pose world position of a bone (puppet space). */
export function boneRest(bones: readonly BoneDef[], id: string, x = 0, y = 0): { x: number; y: number } {
  const m = boneWorld(bones).get(id);
  return m ? matApply(m, x, y) : { x, y };
}

export function anchorsFrom(bones: readonly BoneDef[], o: { heightLu: number; headBone?: string; headTop?: { x: number; y: number }; muzzleBone?: string; center?: number }): Anchors {
  const head = o.headTop ?? (o.headBone ? boneRest(bones, o.headBone, 0, -25) : { x: 0, y: -o.heightLu });
  const muzzle = o.muzzleBone ? boneRest(bones, o.muzzleBone) : { x: 10, y: -o.heightLu * 0.55 };
  return {
    feet: { x: 0, y: 0 },
    head: { x: round(head.x), y: round(head.y) },
    muzzle: { x: round(muzzle.x), y: round(muzzle.y) },
    hitCenter: { x: 0, y: round(-(o.center ?? o.heightLu * 0.5)) },
  };
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Shorthand for an extra slot on a bone. */
export function slot(part: string, bone: string, z: number, o: Partial<SlotDef> = {}): SlotDef {
  return { part, bone, z, ...o };
}
