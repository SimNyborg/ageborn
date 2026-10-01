/**
 * Fort feel data (DESIGN A16.14.8, A12, A13): what each fort is built of (its hit sound, chips and
 * debris) and the sound ids of the fort moments. Presentation only; the sim never reads it.
 * `src/render/test/fortFeel.test.ts` checks the table covers every fort card in the content.
 */
import type { CardId, SoundId } from '@/contracts';

export type FortMaterial = 'wood' | 'stone' | 'metal' | 'energy';

/** The main material of each fort card (hits: `fort_hit_<material>`, collapse: `fx.fort_debris_<material>`). */
export const FORT_MATERIAL: Readonly<Record<string, FortMaterial>> = {
  palisade: 'wood',
  sling_perch: 'wood',
  war_camp: 'wood',
  spike_pit: 'wood',
  cyclopean_wall: 'stone',
  pyrgos_tower: 'stone',
  muster_tents: 'wood',
  hidden_stakes: 'wood',
  shield_barricade: 'wood',
  longbow_tower: 'stone',
  levy_camp: 'wood',
  wolf_pits: 'wood',
  gabion_wall: 'stone',
  musket_redoubt: 'stone',
  militia_muster: 'wood',
  powder_keg: 'wood',
  trench_parapet: 'wood',
  sniper_nest: 'metal',
  recruiting_depot: 'stone',
  tripwire_charge: 'metal',
  sandbag_bunker: 'stone',
  pillbox: 'stone',
  forward_base: 'metal',
  minefield: 'metal',
  hardlight_barrier: 'energy',
  sentry_pylon: 'metal',
  clone_bay: 'metal',
  grav_mire: 'energy',
  void_rampart: 'energy',
  ion_spire: 'energy',
  warp_barracks: 'metal',
  void_mine: 'energy',
};

export function fortMaterial(card: CardId): FortMaterial {
  return FORT_MATERIAL[card] ?? 'wood';
}

/** A13 fort sound ids. */
export const FORT_SOUNDS = {
  place: 'fort_place',
  build: 'fort_build',
  complete: 'fort_complete',
  crumble: 'fort_crumble',
  collapse: 'fort_collapse',
  decay: 'fort_decay',
  trapArm: 'trap_arm',
  trapSnap: 'trap_snap',
  trapBlast: 'trap_blast',
  campHorn: 'camp_horn',
  levySpawn: 'levy_spawn',
  denied: 'fort_denied',
} as const satisfies Record<string, SoundId>;

export function fortHitSound(card: CardId): SoundId {
  return `fort_hit_${fortMaterial(card)}`;
}
