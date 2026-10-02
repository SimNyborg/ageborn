/**
 * The paused content expansion (CONTENT_PLAN, Stone wave W1; paused 2026-10-02) is live in the compiled
 * content, but its art, effects and sounds are not made yet: these cards draw as placeholders and play
 * no attack sound. The art and sound coverage checks skip exactly these ids until the wave resumes.
 *
 * Release check 2026-10-02: delete this file and its uses when the wave's sheets, puppets, effects and
 * sounds ship; every coverage check re-arms then. Test data only; nothing in the game reads it.
 */

/** Cards, forts, summons, powers and skins of the paused wave. */
export const PAUSED_WAVE_IDS: ReadonlySet<string> = new Set([
  // troops (and the Beast Caller's summon)
  'hunting_wolves', 'hide_shield', 'torch_runner', 'bolas_thrower', 'woolly_rhino', 'atlatl_thrower', 'boulder_hurler',
  'herbalist', 'pelt_rager', 'beast_caller', 'cave_bear', 'rockfall_shaman', 'elk_chieftain', 'cave_pup',
  // turrets, forts, powers
  'quill_porcupine', 'sapling_sling', 'thorn_hedge', 'bone_watchtower', 'tangle_vines', 'pebble_hail',
  // skins
  'snowball_pebbler', 'fossil_sabertooth', 'aurora_elk',
]);

/** Visual and projectile ids the paused wave references (B5 manifest). */
export const PAUSED_WAVE_VISUALS: ReadonlySet<string> = new Set([
  ...[...PAUSED_WAVE_IDS].filter((id) => !['quill_porcupine', 'sapling_sling', 'thorn_hedge', 'bone_watchtower', 'tangle_vines', 'pebble_hail', 'snowball_pebbler', 'fossil_sabertooth', 'aurora_elk'].includes(id)).map((id) => `unit.${id}`),
  'turret.quill_porcupine', 'turret.sapling_sling', 'fort.thorn_hedge', 'fort.bone_watchtower',
  'power.tangle_vines', 'power.pebble_hail',
  'unit.pebbler@snowball_pebbler', 'unit.sabertooth@fossil_sabertooth', 'unit.elk_chieftain@aurora_elk',
  'proj.bolas', 'proj.dart', 'proj.herb', 'proj.quill',
]);

/** Sound ids the paused wave references (A13, B7 manifest). */
export const PAUSED_WAVE_SOUNDS: ReadonlySet<string> = new Set([
  'wolf_bite', 'shield_bash', 'torch_jab', 'shot_bolas', 'horn_hook', 'shot_atlatl', 'shot_heave', 'herb_puff',
  'bear_swipe', 'antler_sweep', 'quill_fan', 'shot_sapling', 'pw_vines', 'pw_hail',
]);
