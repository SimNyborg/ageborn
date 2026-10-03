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

/** Cards, forts, summons, powers and skins of the gated wave. */
export const PAUSED_WAVE_IDS: ReadonlySet<string> = new Set([...MODERN_WAVE_IDS]);

/** Visual and projectile ids the gated wave references (B5 manifest). */
export const PAUSED_WAVE_VISUALS: ReadonlySet<string> = new Set([...MODERN_WAVE_VISUALS]);

/** Sound ids the gated wave references (A13, B7 manifest). */
export const PAUSED_WAVE_SOUNDS: ReadonlySet<string> = new Set([...MODERN_WAVE_SOUNDS]);
