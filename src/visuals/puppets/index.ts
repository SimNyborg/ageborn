/**
 * All age puppet sets (units, turrets, bases). Adding an age = adding one module here (A2.5).
 */
import type { AgeId } from '@/contracts/ids';
import type { BasePuppet } from '../rigs/base';
import type { TurretPuppet } from '../rigs/turret';
import type { PuppetDef } from '../types';
import { FUTURE_BASE, FUTURE_TURRETS, FUTURE_UNITS } from './future';
import { GUNPOWDER_BASE, GUNPOWDER_TURRETS, GUNPOWDER_UNITS } from './gunpowder';
import { MODERN_BASE, MODERN_TURRETS, MODERN_UNITS } from './modern';
import { MEDIEVAL_BASE, MEDIEVAL_TURRETS, MEDIEVAL_UNITS } from './medieval';
import { STONE_BASE, STONE_TURRETS, STONE_UNITS } from './stone';

export const AGE_PUPPETS: Readonly<Record<AgeId, { units: readonly PuppetDef[]; turrets: readonly TurretPuppet[]; base: BasePuppet | null }>> = {
  stone: { units: STONE_UNITS, turrets: STONE_TURRETS, base: STONE_BASE },
  medieval: { units: MEDIEVAL_UNITS, turrets: MEDIEVAL_TURRETS, base: MEDIEVAL_BASE },
  gunpowder: { units: GUNPOWDER_UNITS, turrets: GUNPOWDER_TURRETS, base: GUNPOWDER_BASE },
  modern: { units: MODERN_UNITS, turrets: MODERN_TURRETS, base: MODERN_BASE },
  future: { units: FUTURE_UNITS, turrets: FUTURE_TURRETS, base: FUTURE_BASE },
};
