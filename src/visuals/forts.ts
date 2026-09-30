/**
 * Fort and levy placeholder visuals (DESIGN A16.14.8, F1): until F3 draws the 32 fort rigs and the 8
 * levy puppets, each fort (`fort.<slug>`) reuses its age's long-range Common turret puppet (a static rig
 * with a muzzle, re-grouped as `fort` with the fort's size) and each levy (`unit.<slug>`) its age's
 * Infantry Common puppet. Visuals may not read the content (DESIGN B2), so the ids are
 * listed here; `src/visuals/test/manifest.test.ts` checks them against the content.
 */
import type { AgeId } from '@/contracts/ids';
import { AGE_PUPPETS } from './puppets';
import type { TurretPuppet } from './rigs/turret';
import type { PuppetDef } from './types';

/** Every fort card (A16.14.4): id, age and kind (towers are medium, walls and camps large, traps flat). */
export const FORT_VISUALS: readonly { id: string; age: AgeId; kind: 'wall' | 'tower' | 'camp' | 'trap' }[] = [
  { id: 'palisade', age: 'stone', kind: 'wall' },
  { id: 'sling_perch', age: 'stone', kind: 'tower' },
  { id: 'war_camp', age: 'stone', kind: 'camp' },
  { id: 'spike_pit', age: 'stone', kind: 'trap' },
  { id: 'cyclopean_wall', age: 'bronze', kind: 'wall' },
  { id: 'pyrgos_tower', age: 'bronze', kind: 'tower' },
  { id: 'muster_tents', age: 'bronze', kind: 'camp' },
  { id: 'hidden_stakes', age: 'bronze', kind: 'trap' },
  { id: 'shield_barricade', age: 'medieval', kind: 'wall' },
  { id: 'longbow_tower', age: 'medieval', kind: 'tower' },
  { id: 'levy_camp', age: 'medieval', kind: 'camp' },
  { id: 'wolf_pits', age: 'medieval', kind: 'trap' },
  { id: 'gabion_wall', age: 'gunpowder', kind: 'wall' },
  { id: 'musket_redoubt', age: 'gunpowder', kind: 'tower' },
  { id: 'militia_muster', age: 'gunpowder', kind: 'camp' },
  { id: 'powder_keg', age: 'gunpowder', kind: 'trap' },
  { id: 'trench_parapet', age: 'industrial', kind: 'wall' },
  { id: 'sniper_nest', age: 'industrial', kind: 'tower' },
  { id: 'recruiting_depot', age: 'industrial', kind: 'camp' },
  { id: 'tripwire_charge', age: 'industrial', kind: 'trap' },
  { id: 'sandbag_bunker', age: 'modern', kind: 'wall' },
  { id: 'pillbox', age: 'modern', kind: 'tower' },
  { id: 'forward_base', age: 'modern', kind: 'camp' },
  { id: 'minefield', age: 'modern', kind: 'trap' },
  { id: 'hardlight_barrier', age: 'future', kind: 'wall' },
  { id: 'sentry_pylon', age: 'future', kind: 'tower' },
  { id: 'clone_bay', age: 'future', kind: 'camp' },
  { id: 'grav_mire', age: 'future', kind: 'trap' },
  { id: 'void_rampart', age: 'cosmic', kind: 'wall' },
  { id: 'ion_spire', age: 'cosmic', kind: 'tower' },
  { id: 'warp_barracks', age: 'cosmic', kind: 'camp' },
  { id: 'void_mine', age: 'cosmic', kind: 'trap' },
];

/** Every levy (A16.14.3): id and age; drawn as the age's Infantry Common puppet. */
export const LEVY_VISUALS: readonly { id: string; age: AgeId }[] = [
  { id: 'cave_youth', age: 'stone' },
  { id: 'citizen_levy', age: 'bronze' },
  { id: 'peasant_levy', age: 'medieval' },
  { id: 'militiaman', age: 'gunpowder' },
  { id: 'volunteer', age: 'industrial' },
  { id: 'conscript', age: 'modern' },
  { id: 'clone_cadet', age: 'future' },
  { id: 'star_recruit', age: 'cosmic' },
];

/** The age's first Common turret puppet (the placeholder body of its forts). */
function turretOf(age: AgeId): TurretPuppet | undefined {
  return AGE_PUPPETS[age].turrets[0];
}

/** The age's Infantry puppet (the placeholder body of its levy). */
function infantryOf(age: AgeId): PuppetDef | undefined {
  return AGE_PUPPETS[age].units.find((p) => p.group === 'infantry');
}

/** Placeholder fort puppets: the age's turret rig as `fort.<slug>`, group `fort`, the fort's size class. */
export const FORT_PUPPETS: readonly TurretPuppet[] = FORT_VISUALS.flatMap((f) => {
  const base = turretOf(f.age);
  if (!base) return [];
  const size: PuppetDef['size'] = f.kind === 'tower' ? 'medium' : 'large';
  return [{ ...base, id: `fort.${f.id}`, group: 'fort', size, legendary: false }];
});

/**
 * Placeholder levy puppets: the age's Infantry puppet as `unit.<slug>` (same anchors and height; F3 draws
 * the plain levy outfit at 0.85 scale, A16.14.8).
 */
export const LEVY_PUPPETS: readonly PuppetDef[] = LEVY_VISUALS.flatMap((l) => {
  const base = infantryOf(l.age);
  if (!base) return [];
  return [{ ...base, id: `unit.${l.id}` }];
});
