/**
 * The turret rig (DESIGN A11 Rigs: base, pivot, barrel).
 *
 * Turrets: origin at the mount point (the bottom of the turret's footing), facing right. `pivot`
 * rotates to aim, `barrel` recoils along its own -x, `arm` swings for throwing engines, `muzzle`
 * marks where shots leave. Turret clips: build drop-in, idle scan, aim, fire recoil, modernise,
 * sell poof, outdated arrow glow (A11).
 */
import type { AgeId } from '@/contracts/ids';
import type { Palette } from '../palette';
import type { BoneDef, PuppetDef, SlotDef } from '../types';
import { boneRest, uniqueSlots } from './common';

export interface TurretSpec {
  id: string;
  age: AgeId;
  palette: Palette;
  height: number;
  /** Bones below root: must include `pivot`; may include `barrel`, `arm`, `lid`, `muzzle`. */
  bones: BoneDef[];
  slots: SlotDef[];
  /** Aim limits in degrees (clockwise = down). Turrets that do not rotate use [0, 0]. */
  aim?: [number, number];
  /** Fire clip id (default 'turret.fire'). */
  fire?: string;
}

export interface TurretPuppet extends PuppetDef {
  aimLimits: [number, number];
  fireClip: string;
}

export function turret(s: TurretSpec): TurretPuppet {
  const bones: BoneDef[] = [{ id: 'root', parent: null, x: 0, y: 0 }, ...s.bones];
  const hasMuzzle = bones.some((b) => b.id === 'muzzle');
  const muzzleW = hasMuzzle ? boneRest(bones, 'muzzle') : { x: 20, y: -s.height * 0.6 };
  const pivotW = bones.some((b) => b.id === 'pivot') ? boneRest(bones, 'pivot') : { x: 0, y: -s.height / 2 };
  return {
    id: s.id,
    kind: 'turret',
    rig: 'turret',
    age: s.age,
    bones,
    slots: uniqueSlots(s.slots),
    palette: s.palette,
    heightLu: s.height,
    anchors: {
      feet: { x: 0, y: 0 },
      head: { x: 0, y: -s.height },
      muzzle: { x: round(muzzleW.x), y: round(muzzleW.y) },
      hitCenter: { x: 0, y: round(pivotW.y) },
    },
    motion: { family: 'turret', attack: s.fire ?? 'turret.fire', ability: 'turret.fire' },
    impactAt: 0.1,
    aimLimits: s.aim ?? [-55, 40],
    fireClip: s.fire ?? 'turret.fire',
  };
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}
