/**
 * The quadruped rig (DESIGN A11 Rigs: boar, sabertooth, bear, mammoth; also the rider's mounts).
 *
 * Bones: root (feet) > spin > body (centre) > neck > snout (head) > jaw, eyes, trunk;
 * body > tail, saddle, legFN / legFF / legBN / legBF (front/back, near/far).
 * Legs are single chunky segments whose pivot is the hip or shoulder and whose sole sits `legLen`
 * below it. Far legs are drawn behind the body and a little darker.
 */
import type { AgeId, RoleGroup } from '@/contracts/ids';
import { getClip } from '../clips';
import { strideFor } from '../clips/procedural';
import type { Palette } from '../palette';
import type { BoneDef, PuppetDef, SlotDef } from '../types';
import { anchorsFrom, finishUnit, rootBones } from './common';

export interface PartAt {
  part: string;
  x: number;
  y: number;
  rot?: number;
  z?: number;
}

export interface QuadSpec {
  id: string;
  age: AgeId;
  palette: Palette;
  height: number;
  /** Body part (pivot at the body centre) and the body centre's height above the ground (lu). */
  body: string;
  bodyHeight: number;
  /** Leg parts: pivot at the hip, sole at `legLen` below it. */
  legFront: string;
  legBack: string;
  legLen: number;
  frontX: number;
  backX: number;
  /** Hip height relative to the body centre (positive = below the centre). */
  legY: number;
  /** Far legs sit this far behind the near legs (x offset). */
  farDx?: number;
  neck: { x: number; y: number; rot?: number };
  head: PartAt;
  jaw?: PartAt;
  eyes?: PartAt;
  tail?: PartAt;
  trunk?: PartAt;
  saddle?: { x: number; y: number };
  extras?: SlotDef[];
  extraBones?: BoneDef[];
  attack: string;
  ability?: string;
  group: RoleGroup;
  size: 'small' | 'medium' | 'large' | 'huge';
  legendary?: boolean;
  aura?: PuppetDef['aura'];
  legDeg?: number;
  /** World y of the head top (for the head anchor). */
  headTopY?: number;
  /** Bone whose origin is the `muzzle` anchor (where projectiles leave, e.g. the Matriarch's riders). */
  muzzleBone?: string;
}

export function quadruped(s: QuadSpec): PuppetDef {
  const centerY = -s.bodyHeight;
  const farDx = s.farDx ?? -5;
  const bones: BoneDef[] = [
    ...rootBones(centerY),
    { id: 'body', parent: 'spin', x: 0, y: 0 },
    { id: 'neck', parent: 'body', x: s.neck.x, y: s.neck.y, rot: s.neck.rot ?? 0 },
    { id: 'snout', parent: 'neck', x: s.head.x, y: s.head.y, rot: s.head.rot ?? 0 },
    { id: 'jaw', parent: 'snout', x: s.jaw?.x ?? 0, y: s.jaw?.y ?? 0 },
    { id: 'eyes', parent: 'snout', x: s.eyes?.x ?? 0, y: s.eyes?.y ?? 0 },
    { id: 'trunk', parent: 'snout', x: s.trunk?.x ?? 0, y: s.trunk?.y ?? 0, rot: s.trunk?.rot ?? 0 },
    { id: 'tail', parent: 'body', x: s.tail?.x ?? 0, y: s.tail?.y ?? 0, rot: s.tail?.rot ?? 0 },
    { id: 'saddle', parent: 'body', x: s.saddle?.x ?? 0, y: s.saddle?.y ?? 0 },
    { id: 'legFF', parent: 'body', x: s.frontX + farDx, y: s.legY },
    { id: 'legBF', parent: 'body', x: s.backX + farDx, y: s.legY },
    { id: 'legBN', parent: 'body', x: s.backX, y: s.legY },
    { id: 'legFN', parent: 'body', x: s.frontX, y: s.legY },
    ...(s.extraBones ?? []),
  ];
  const slots: SlotDef[] = [
    { id: 'legFF', part: s.legFront, bone: 'legFF', z: 5, tone: 'back' },
    { id: 'legBF', part: s.legBack, bone: 'legBF', z: 6, tone: 'back' },
    ...(s.tail ? [{ id: 'tail', part: s.tail.part, bone: 'tail', z: s.tail.z ?? 8 }] : []),
    { id: 'body', part: s.body, bone: 'body', z: 20 },
    { id: 'legBN', part: s.legBack, bone: 'legBN', z: 22 },
    { id: 'legFN', part: s.legFront, bone: 'legFN', z: 23 },
    ...(s.jaw ? [{ id: 'jaw', part: s.jaw.part, bone: 'jaw', z: s.jaw.z ?? 29 }] : []),
    { id: 'head', part: s.head.part, bone: 'snout', z: s.head.z ?? 30 },
    ...(s.eyes ? [{ id: 'eyes', part: s.eyes.part, bone: 'eyes', z: s.eyes.z ?? 31 }] : []),
    ...(s.trunk ? [{ id: 'trunk', part: s.trunk.part, bone: 'trunk', z: s.trunk.z ?? 32 }] : []),
    ...(s.extras ?? []),
  ];
  const legDeg = s.legDeg ?? 22;
  const attackClip = getClip(s.attack);
  return finishUnit({
    id: s.id,
    kind: 'unit',
    rig: 'quadruped',
    age: s.age,
    bones,
    slots,
    palette: s.palette,
    heightLu: s.height,
    anchors: anchorsFrom(bones, {
      heightLu: s.height,
      headTop: { x: s.neck.x + s.head.x, y: s.headTopY ?? -s.height },
      muzzleBone: s.muzzleBone,
      center: s.bodyHeight,
    }),
    motion: {
      family: 'quadruped',
      attack: s.attack,
      ability: s.ability ?? 'ability.flourish',
      legLu: s.legLen,
      legDeg,
      strideLu: strideFor(s.legLen, legDeg),
      speedLuPerSec: 55,
    },
    impactAt: attackClip?.impactAt ?? 0.55,
    group: s.group,
    size: s.size,
    legendary: s.legendary,
    aura: s.aura ?? (s.legendary ? 'legendary' : null),
  });
}
