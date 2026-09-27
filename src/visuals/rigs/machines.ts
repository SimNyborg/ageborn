/**
 * Machine rigs (DESIGN A11 Rigs):
 *  - vehicle: hull, wheels or treads, turret, barrel (Ram, Cannon, Tankette, Behemoth)
 *  - walker: a hull on two jointed legs, optional arms (Walker Mech, Chrono Titan)
 *  - flyer: body, rotor or balloon, gondola (Balloon, Gyrocopter, Drone), authored at altitude
 *
 * These rigs take explicit bone lists (machines vary too much for one template) plus the slots that
 * place parts on them; the helpers here add the root and spin bones, anchors and motion.
 */
import type { AgeId, RoleGroup } from '@/contracts/ids';
import { getClip } from '../clips';
import { strideFor } from '../clips/procedural';
import type { Palette } from '../palette';
import type { BoneDef, PuppetDef, SlotDef } from '../types';
import { anchorsFrom, rootBones } from './common';

export interface MachineSpec {
  id: string;
  age: AgeId;
  palette: Palette;
  height: number;
  /** Height of the body centre above the ground (the spin bone). */
  center: number;
  /** Bones below `spin` (their parents must be `spin` or listed earlier). */
  bones: BoneDef[];
  slots: SlotDef[];
  attack: string;
  ability?: string;
  group: RoleGroup;
  size: 'small' | 'medium' | 'large' | 'huge';
  legendary?: boolean;
  aura?: PuppetDef['aura'];
  /** Bone whose origin is the muzzle (projectile spawn). */
  muzzleBone?: string;
  headTop?: { x: number; y: number };
  /** Wheel radius (vehicles), leg length (walkers). */
  wheelRadius?: number;
  legLen?: number;
  legDeg?: number;
  speed?: number;
}

function machine(rig: 'vehicle' | 'walker' | 'flyer', s: MachineSpec): PuppetDef {
  const bones: BoneDef[] = [...rootBones(-s.center), ...s.bones];
  const attackClip = getClip(s.attack);
  const legLu = s.legLen ?? 30;
  const legDeg = s.legDeg ?? 20;
  return {
    id: s.id,
    kind: 'unit',
    rig,
    age: s.age,
    bones,
    slots: s.slots,
    palette: s.palette,
    heightLu: s.height,
    anchors: anchorsFrom(bones, { heightLu: s.height, headTop: s.headTop ?? { x: 0, y: -s.height }, muzzleBone: s.muzzleBone, center: s.center }),
    motion: {
      family: rig,
      attack: s.attack,
      ability: s.ability ?? 'ability.flourish',
      legLu,
      legDeg,
      strideLu: rig === 'vehicle' ? 40 : strideFor(legLu, legDeg),
      wheelRadiusLu: s.wheelRadius ?? 10,
      speedLuPerSec: s.speed ?? 45,
      air: rig === 'flyer',
    },
    impactAt: attackClip?.impactAt ?? 0.5,
    group: s.group,
    size: s.size,
    legendary: s.legendary,
    aura: s.aura ?? (s.legendary ? 'legendary' : null),
  };
}

export const vehicle = (s: MachineSpec): PuppetDef => machine('vehicle', s);
export const walker = (s: MachineSpec): PuppetDef => machine('walker', s);
export const flyer = (s: MachineSpec): PuppetDef => machine('flyer', s);
