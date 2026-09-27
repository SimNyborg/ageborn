/**
 * The base (fortress) rig (DESIGN A11 Bases): Cave Hold, Keep, Star Fort, Bunker, Spire.
 *
 * Origin at the gate on the ground, facing right, extending about 140 lu behind the gate (negative
 * x). Slots may depend on the crumble stage (75%, 50%, 25%) and the Treasury level through
 * `SlotDef.when`. Four turret mounts are stacked vertically on the front face (A2.8).
 */
import type { AgeId, Pt } from '@/contracts/ids';
import type { Palette } from '../palette';
import type { BoneDef, PuppetDef, SlotDef } from '../types';
import { uniqueSlots } from './common';

export interface BaseSpec {
  id: string;
  age: AgeId;
  palette: Palette;
  height: number;
  width: number;
  bones: BoneDef[];
  slots: SlotDef[];
  /** Four turret mounts, bottom to top, in base space (A2.8: stacked vertically). */
  mounts: [Pt, Pt, Pt, Pt];
  /** Where the Last Stand horn icon floats. */
  hornAt: Pt;
  /** Bones that wave (flags, banners) and flicker (torches, lights). */
  flags?: string[];
  flickers?: string[];
}

export interface BasePuppet extends PuppetDef {
  mounts: [Pt, Pt, Pt, Pt];
  hornAt: Pt;
  width: number;
  flags: string[];
  flickers: string[];
}

export function base(s: BaseSpec): BasePuppet {
  const bones: BoneDef[] = [{ id: 'root', parent: null, x: 0, y: 0 }, ...s.bones];
  return {
    id: s.id,
    kind: 'base',
    rig: 'base',
    age: s.age,
    bones,
    slots: uniqueSlots(s.slots),
    palette: s.palette,
    heightLu: s.height,
    anchors: {
      feet: { x: 0, y: 0 },
      head: { x: -s.width / 2, y: -s.height },
      muzzle: { x: 0, y: -s.height * 0.5 },
      hitCenter: { x: -s.width * 0.4, y: -s.height * 0.45 },
    },
    motion: { family: 'base', attack: 'turret.fire', ability: 'turret.fire' },
    impactAt: 0,
    mounts: s.mounts,
    hornAt: s.hornAt,
    width: s.width,
    flags: s.flags ?? [],
    flickers: s.flickers ?? [],
  };
}
