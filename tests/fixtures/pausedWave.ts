/**
 * Content-wave cards that are live in the compiled content but gated (`released: false`) while their art,
 * effects and sounds are made: the art and sound coverage checks skip exactly these ids. The W1 Stone wave
 * shipped its art and left this list on 2026-10-03, the W2 Bronze, W3 Medieval, W4 Gunpowder, W5 Industrial and W6 Modern waves the same day.
 *
 * Delete this file and its uses when no wave is gated; every coverage check re-arms then. Test data only;
 * nothing in the game reads it.
 */

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
export const PAUSED_WAVE_IDS: ReadonlySet<string> = new Set([...FUTURE_WAVE_IDS]);

/** Visual and projectile ids the gated wave references (B5 manifest). */
export const PAUSED_WAVE_VISUALS: ReadonlySet<string> = new Set([...FUTURE_WAVE_VISUALS]);

/** Sound ids the gated wave references (A13, B7 manifest). */
export const PAUSED_WAVE_SOUNDS: ReadonlySet<string> = new Set([...FUTURE_WAVE_SOUNDS]);
