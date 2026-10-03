/**
 * Content-wave cards that are live in the compiled content but gated (`released: false`) while their art,
 * effects and sounds are made: the art and sound coverage checks skip exactly these ids. The W1 Stone wave
 * shipped its art and left this list on 2026-10-03, the W2 Bronze, W3 Medieval and W4 Gunpowder waves the same day.
 *
 * Delete this file and its uses when no wave is gated; every coverage check re-arms then. Test data only;
 * nothing in the game reads it.
 */

/**
 * W5 Industrial wave (2026-10-03): gated (`released: false`) while its art, sounds and balance are made; the
 * wave removes this block when it flips its cards.
 */
const INDUSTRIAL_WAVE_IDS: readonly string[] = [
  'coal_miners', 'iron_mantlet', 'dispatch_rider', 'bomb_bowler', 'steam_tractor', 'trench_mortar', 'steam_driller',
  'bandmaster', 'clockwork_tinker', 'armoured_car', 'alpine_climber', 'spark_scientist', 'armoured_train', 'clockwork_soldier',
  'rivet_spitter', 'steam_hammer', 'rail_barricade', 'tesla_pylon', 'shrapnel_shells', 'great_magnet',
  'chimney_sweep', 'teapot_golem', 'circus_train',
];
const INDUSTRIAL_WAVE_VISUALS: readonly string[] = [
  ...INDUSTRIAL_WAVE_IDS.slice(0, 14).map((id) => `unit.${id}`),
  'turret.rivet_spitter', 'turret.steam_hammer', 'fort.rail_barricade', 'fort.tesla_pylon', 'power.shrapnel_shells', 'power.great_magnet',
  'unit.riveter@chimney_sweep', 'unit.steam_golem@teapot_golem', 'unit.armoured_train@circus_train',
  'proj.bowl_bomb', 'proj.rivet', 'fx.coil_arc', 'fx.hammer_shock',
];
const INDUSTRIAL_WAVE_SOUNDS: readonly string[] = [
  'pickaxe_clink', 'mantlet_jab', 'bike_skid', 'shot_bowl', 'plough_scoop', 'shot_trench_mortar', 'drill_spin', 'cornet_blast',
  'key_whack', 'car_mg', 'ice_axe_chop', 'coil_zap', 'train_gun', 'toy_bayonet', 'shot_rivet', 'hammer_slam', 'pw_shrapnel', 'pw_magnet',
];

/** Cards, forts, summons, powers and skins of the gated wave. */
export const PAUSED_WAVE_IDS: ReadonlySet<string> = new Set<string>([]);

/** Visual and projectile ids the gated wave references (B5 manifest). */
export const PAUSED_WAVE_VISUALS: ReadonlySet<string> = new Set<string>([]);

/** Sound ids the gated wave references (A13, B7 manifest). */
export const PAUSED_WAVE_SOUNDS: ReadonlySet<string> = new Set<string>([]);
