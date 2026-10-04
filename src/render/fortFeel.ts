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
  thorn_hedge: 'wood',
  bone_watchtower: 'wood',
  cyclopean_wall: 'stone',
  pyrgos_tower: 'stone',
  muster_tents: 'wood',
  hidden_stakes: 'wood',
  hoplon_line: 'wood',
  slinger_camp: 'stone',
  shield_barricade: 'wood',
  longbow_tower: 'stone',
  levy_camp: 'wood',
  wolf_pits: 'wood',
  bear_snares: 'metal',
  crossbow_keep: 'stone',
  gabion_wall: 'stone',
  musket_redoubt: 'stone',
  militia_muster: 'wood',
  powder_keg: 'wood',
  cavalry_picket: 'wood',
  fougasse: 'stone',
  trench_parapet: 'wood',
  sniper_nest: 'metal',
  recruiting_depot: 'stone',
  tripwire_charge: 'metal',
  rail_barricade: 'metal',
  tesla_pylon: 'metal',
  sandbag_bunker: 'stone',
  pillbox: 'stone',
  forward_base: 'metal',
  minefield: 'metal',
  rifle_depot: 'wood',
  wire_snare: 'metal',
  hardlight_barrier: 'energy',
  sentry_pylon: 'metal',
  clone_bay: 'metal',
  grav_mire: 'energy',
  skyguard_pylon: 'metal',
  mech_bay: 'metal',
  void_rampart: 'energy',
  ion_spire: 'energy',
  warp_barracks: 'metal',
  void_mine: 'energy',
  star_bulwark: 'metal',
  stardust_snare: 'energy',
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
  // Energy forts and the Future and Cosmic camps (audit 2026-10-01): no mallets, horns or tent flaps
  buildEnergy: 'fort_build_energy',
  trapBlastEnergy: 'trap_blast_energy',
  campWarp: 'camp_warp',
  levyWarp: 'levy_warp',
} as const satisfies Record<string, SoundId>;

/** Camps that muster by warp or clone vat rather than a horn and a tent (Future, Cosmic). */
export const WARP_CAMPS: ReadonlySet<string> = new Set(['clone_bay', 'mech_bay', 'warp_barracks']);

/** The scaffold's building sound: mallets on timber, stone and metal; a charging projector for energy. */
export function fortBuildSound(card: CardId): SoundId {
  return fortMaterial(card) === 'energy' ? FORT_SOUNDS.buildEnergy : FORT_SOUNDS.build;
}

export function fortHitSound(card: CardId): SoundId {
  return `fort_hit_${fortMaterial(card)}`;
}
