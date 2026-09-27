/**
 * Helpers shared by the rig builders: the root/spin bones, anchors, palettes and slot shorthands.
 */
import type { Anchors } from '@/contracts/art';
import { puppetBounds } from '../draw';
import { getPart } from '../parts/registry';
import { boneWorld, slotId } from '../pose';
import { matApply } from '../svg';
import type { BoneDef, PuppetDef, SlotDef } from '../types';

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

/** Gives repeated slot ids (the same part on two bones) a `#n` suffix so every slot id is unique. */
export function uniqueSlots(slots: readonly SlotDef[]): SlotDef[] {
  const seen = new Map<string, number>();
  return slots.map((s) => {
    const id = slotId(s);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    return n === 0 ? s : { ...s, id: `${id}#${n + 1}` };
  });
}

/**
 * Finishes a unit puppet: unique slot ids, and `heightLu` plus the head anchor taken from the drawn
 * rest pose (the top of the hat, plume or rotor), so health bars sit just above the art (B6).
 */
export function finishUnit<T extends PuppetDef>(p: T): T {
  const q = { ...p, slots: uniqueSlots(p.slots) };
  const b = puppetBounds(q, getPart);
  if (!Number.isFinite(b.minY) || b.minY >= 0) return q;
  const top = Math.round(b.minY * 10) / 10;
  return { ...q, heightLu: Math.round(-b.minY), anchors: { ...q.anchors, head: { x: q.anchors.head.x, y: top } } };
}
