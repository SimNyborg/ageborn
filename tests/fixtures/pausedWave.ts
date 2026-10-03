/**
 * Content-wave cards that are live in the compiled content but gated (`released: false`) while their art,
 * effects and sounds are made: the art and sound coverage checks skip exactly these ids. The W1 Stone wave
 * shipped its art and left this list on 2026-10-03, the W3 Medieval and W4 Gunpowder waves the same day.
 *
 * Delete this file and its uses when no wave is gated; every coverage check re-arms then. Test data only;
 * nothing in the game reads it.
 */

/**
 * W2 Bronze wave (2026-10-03): gated (`released: false`) while its art, sounds and balance are made; the wave
 * removes this block when it flips its cards.
 */
const BRONZE_WAVE_IDS: readonly string[] = [
  'shield_bearer', 'thracian_raider', 'rhodian_slingers', 'discus_thrower', 'war_elephant', 'cretan_archer', 'belly_bowman',
  'aulos_piper', 'tragic_chorus', 'wooden_horse', 'amazon_rider', 'minotaur', 'hydra',
  'net_caster', 'polybolos', 'hoplon_line', 'slinger_camp', 'sandstorm', 'charybdis',
  'marble_hoplite', 'sun_chariot', 'obsidian_colossus',
];
const BRONZE_WAVE_VISUALS: readonly string[] = [
  ...BRONZE_WAVE_IDS.slice(0, 13).map((id) => `unit.${id}`),
  'turret.net_caster', 'turret.polybolos', 'fort.hoplon_line', 'fort.slinger_camp', 'power.sandstorm', 'power.charybdis',
  'unit.hoplite@marble_hoplite', 'unit.war_chariot@sun_chariot', 'unit.bronze_colossus@obsidian_colossus',
  'proj.discus', 'proj.net', 'proj.arrow_arc', 'fx.note_pop', 'fx.wail_ring',
];
const BRONZE_WAVE_SOUNDS: readonly string[] = [
  'kopis_hack', 'rhomphaia_cut', 'shot_discus', 'trunk_lash', 'shot_belly_bow', 'aulos_note', 'chorus_wail', 'horse_ram',
  'sagaris_sweep', 'labrys_chop', 'hydra_bite', 'net_cast', 'shot_polybolos', 'pw_sandstorm', 'pw_whirlpool',
];

/** Cards, forts, summons, powers and skins of the gated wave. */
export const PAUSED_WAVE_IDS: ReadonlySet<string> = new Set(BRONZE_WAVE_IDS);

/** Visual and projectile ids the gated wave references (B5 manifest). */
export const PAUSED_WAVE_VISUALS: ReadonlySet<string> = new Set(BRONZE_WAVE_VISUALS);

/** Sound ids the gated wave references (A13, B7 manifest). */
export const PAUSED_WAVE_SOUNDS: ReadonlySet<string> = new Set(BRONZE_WAVE_SOUNDS);
