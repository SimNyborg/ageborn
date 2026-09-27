/**
 * All age puppet sets (units, turrets, bases). Adding an age = adding one module here (A2.5).
 */
import type { AgeId } from '@/contracts/ids';
import type { BasePuppet } from '../rigs/base';
import type { TurretPuppet } from '../rigs/turret';
import type { PuppetDef } from '../types';
import { STONE_BASE, STONE_TURRETS, STONE_UNITS } from './stone';

export const AGE_PUPPETS: Readonly<Record<AgeId, { units: readonly PuppetDef[]; turrets: readonly TurretPuppet[]; base: BasePuppet | null }>> = {
  stone: { units: STONE_UNITS, turrets: STONE_TURRETS, base: STONE_BASE },
  medieval: { units: [], turrets: [], base: null },
  gunpowder: { units: [], turrets: [], base: null },
  modern: { units: [], turrets: [], base: null },
  future: { units: [], turrets: [], base: null },
};
