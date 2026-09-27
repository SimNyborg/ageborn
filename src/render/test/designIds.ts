/**
 * The effect and sound IDs from DESIGN A14.1 and A13, copied verbatim so the render tests can check
 * that every ID the feel config and the event mapper use exists in the ID appendix.
 */
export const A14_EFFECT_IDS = new Set([
  // Instant and attack effects
  'fx.beam_laser', 'fx.beam_rail', 'fx.arc_chain', 'fx.tongue', 'fx.pitch_pour', 'fx.heal_beam',
  // Hit and death effects
  'fx.spark_blunt', 'fx.spark_slash', 'fx.spark_pierce', 'fx.spark_bullet', 'fx.scorch_laser', 'fx.blast',
  'fx.spark_effective', 'fx.puff_resisted', 'fx.muzzle', 'fx.trail', 'fx.splash_ring', 'fx.explosion_s',
  'fx.explosion_m', 'fx.explosion_l', 'fx.dust_poof', 'fx.ko_stars', 'fx.coin', 'fx.xp_sparkle', 'fx.debris',
  // Status and ability effects
  'fx.heal_glyph', 'fx.shield_bubble', 'fx.mark_reticle', 'fx.gravity_swirl', 'fx.smoke_cloud', 'fx.emp_ring',
  'fx.time_ripple', 'fx.roar_ring', 'fx.call_marker', 'fx.dizzy', 'fx.legendary_aura',
  // Power effects
  'fx.telegraph_zone', 'fx.aurochs', 'fx.meteor', 'fx.arrow_rain', 'fx.decree_glow', 'fx.cannonball_rain',
  'fx.plane_bomber', 'fx.parachute', 'fx.orbital_beam', 'fx.nanite_swarm',
  // Match effects
  'fx.evolve_pillar', 'fx.last_stand_wave', 'fx.overdrive_frame', 'fx.siege_vignette',
]);

const AGES = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];

export const A13_SOUND_IDS = new Set([
  'ui_click', 'ui_hover', 'ui_deny', 'ui_toggle', 'ui_tab', 'ui_confirm', 'meter_pip',
  'spawn_pop', 'spawn_heavy', 'spawn_legendary', 'step_heavy', 'step_mech',
  'swing_whoosh', 'shot_sling', 'shot_bow', 'shot_crossbow', 'shot_catapult', 'shot_musket', 'shot_lob', 'shot_cannon',
  'shot_grapeshot', 'shot_rifle', 'shot_mg', 'shot_flak', 'shot_rocket', 'shot_rail', 'shot_laser', 'shot_arc',
  'shot_plasma', 'bee_buzz', 'log_roll', 'cauldron_pour', 'toad_tongue', 'goose_honk', 'bomb_whistle', 'radio_call',
  'emp_pulse', 'time_stop', 'gravity_hum',
  'hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser', 'hit_heavy', 'hit_effective', 'explosion_s',
  'explosion_m', 'explosion_l', 'die_bio', 'die_mech', 'prop_drop', 'heal_tick', 'shield_up',
  'turret_build', 'turret_sell', 'turret_upgrade', 'slot_buy', 'base_hit', 'base_crumble', 'base_destroyed',
  'coin_gain', 'xp_tick', 'treasury_up',
  'evolve_ready', 'evolve_riser', ...AGES.map((a) => `evolve_fanfare_${a}`), 'evolve_enemy',
  'power_ready', 'power_telegraph', 'pw_stampede', 'pw_meteor', 'pw_arrows', 'pw_decree', 'pw_smoke', 'pw_broadside',
  'pw_paratroop', 'pw_bomber', 'pw_lance', 'pw_nanite',
  'last_stand_armed', 'last_stand_charge', 'last_stand_fire', 'overdrive_horn', 'siege_bell', 'victory_jingle',
  'defeat_jingle', 'emote_pop',
]);

export const A14_MUSIC_CUES = new Set([
  'music.menu', 'music.capsule', ...AGES.map((a) => `music.${a}`), 'stinger.victory', 'stinger.defeat',
]);
