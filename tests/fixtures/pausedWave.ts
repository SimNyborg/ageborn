/**
 * Content-wave cards that are live in the compiled content but gated (`released: false`) while their art,
 * effects and sounds are made: the art and sound coverage checks skip exactly these ids. The W1 Stone wave
 * shipped its art and left this list on 2026-10-03, the W2 Bronze, W3 Medieval, W4 Gunpowder and W5 Industrial waves the same day.
 *
 * Delete this file and its uses when no wave is gated; every coverage check re-arms then. Test data only;
 * nothing in the game reads it.
 */

/**
 * W6 Modern wave (2026-10-03): gated (`released: false`) while its art, sounds and balance are made; the wave
 * removes this block when it flips its cards.
 */
const MODERN_WAVE_IDS: readonly string[] = [
  'commando', 'sandbag_carrier', 'smg_squad', 'rifle_grenadier', 'assault_gun', 'mortar_team', 'sticky_bomber',
  'combat_medic', 'bulldog_sergeant', 'dive_bomber', 'bulldozer', 'ghillie_sniper', 'sky_fortress',
  'anti_tank_gun', 'rocket_battery', 'rifle_depot', 'wire_snare', 'creeping_barrage', 'concussion_shells',
  'desert_raider', 'tin_tankette', 'origami_fortress',
];
const MODERN_WAVE_VISUALS: readonly string[] = [
  ...MODERN_WAVE_IDS.slice(0, 13).map((id) => `unit.${id}`),
  'turret.anti_tank_gun', 'turret.rocket_battery', 'fort.rifle_depot', 'fort.wire_snare', 'power.creeping_barrage', 'power.concussion_shells',
  'unit.trench_raider@desert_raider', 'unit.tankette@tin_tankette', 'unit.sky_fortress@origami_fortress',
  'proj.rifle_grenade',
];
const MODERN_WAVE_SOUNDS: readonly string[] = [
  'butt_stroke', 'sandbag_slam', 'shot_smg', 'shot_rifle_grenade', 'shot_assault_gun', 'shot_mortar_team', 'sticky_thunk',
  'shot_pistol', 'boxing_jab', 'dive_whistle', 'dozer_shove', 'shot_ghillie', 'bomb_stick', 'shot_at_gun', 'rocket_ripple',
  'pw_barrage', 'pw_concussion',
];

/**
 * W7 Future wave (2026-10-03): gated (`released: false`) while its art, sounds and balance are made; the wave
 * removes this block when it flips its cards.
 */
const FUTURE_WAVE_IDS: readonly string[] = [
  'android_pair', 'barrier_trooper', 'hover_bike', 'needle_gunner', 'crab_mech', 'arc_lobber', 'plasma_lancer',
  'overclock_engineer', 'holo_projector', 'jetpack_trooper', 'particle_cannon', 'overload_android', 'drone_carrier',
  'holo_decoy', 'attack_drone', 'cryo_pod', 'tractor_beam', 'skyguard_pylon', 'mech_bay', 'target_painter', 'nano_mesh',
  'space_cadet', 'chrome_rail', 'grandfather_clock',
];
const FUTURE_WAVE_VISUALS: readonly string[] = [
  ...FUTURE_WAVE_IDS.slice(0, 15).map((id) => `unit.${id}`),
  'turret.cryo_pod', 'turret.tractor_beam', 'fort.skyguard_pylon', 'fort.mech_bay', 'power.target_painter', 'power.nano_mesh',
  'unit.pulse_trooper@space_cadet', 'unit.rail_gunner@chrome_rail', 'unit.chrono_titan@grandfather_clock',
  'proj.needle', 'proj.arc_shell', 'proj.frost',
];
const FUTURE_WAVE_SOUNDS: readonly string[] = [
  'baton_spin', 'shield_pulse', 'lance_swipe', 'shot_needle', 'pincer_snap', 'shot_lobber', 'lance_crackle', 'multitool_zap',
  'shot_holo', 'shot_jet_beam', 'shot_particle', 'robot_punch', 'shot_pd_laser', 'holo_flicker', 'shot_drone', 'shot_cryo',
  'tractor_hum', 'pw_painter', 'pw_nanomesh',
];

/** Cards, forts, summons, powers and skins of the gated wave. */
export const PAUSED_WAVE_IDS: ReadonlySet<string> = new Set([...MODERN_WAVE_IDS, ...FUTURE_WAVE_IDS]);

/** Visual and projectile ids the gated wave references (B5 manifest). */
export const PAUSED_WAVE_VISUALS: ReadonlySet<string> = new Set([...MODERN_WAVE_VISUALS, ...FUTURE_WAVE_VISUALS]);

/** Sound ids the gated wave references (A13, B7 manifest). */
export const PAUSED_WAVE_SOUNDS: ReadonlySet<string> = new Set([...MODERN_WAVE_SOUNDS, ...FUTURE_WAVE_SOUNDS]);
