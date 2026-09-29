/**
 * The effect and sound IDs from DESIGN A14.1 and A13 (with the merged A17.12 ids), copied verbatim so the render tests can check
 * that every ID the feel config and the event mapper use exists in the ID appendix.
 */
export const A14_EFFECT_IDS = new Set([
  // Instant and attack effects
  'fx.beam_laser', 'fx.beam_rail', 'fx.arc_chain', 'fx.tongue', 'fx.pitch_pour', 'fx.heal_beam',
  'fx.sun_beam', 'fx.gorgon_gaze', 'fx.tesla_arc', 'fx.beam_void', 'fx.beam_ion', 'fx.beam_tachyon',
  // Hit and death effects
  'fx.spark_blunt', 'fx.spark_slash', 'fx.spark_pierce', 'fx.spark_bullet', 'fx.scorch_laser', 'fx.blast',
  'fx.spark_effective', 'fx.puff_resisted', 'fx.muzzle', 'fx.trail', 'fx.splash_ring', 'fx.explosion_s',
  'fx.explosion_m', 'fx.explosion_l', 'fx.dust_poof', 'fx.ko_stars', 'fx.coin', 'fx.xp_sparkle', 'fx.debris',
  // Status and ability effects
  'fx.heal_glyph', 'fx.shield_bubble', 'fx.mark_reticle', 'fx.gravity_swirl', 'fx.smoke_cloud', 'fx.emp_ring',
  'fx.time_ripple', 'fx.roar_ring', 'fx.call_marker', 'fx.dizzy', 'fx.legendary_aura',
  'fx.stomp_ring', 'fx.fuse_spark', 'fx.beacon_ring', 'fx.blink',
  // Power effects
  'fx.telegraph_zone', 'fx.aurochs', 'fx.meteor', 'fx.arrow_rain', 'fx.decree_glow', 'fx.cannonball_rain',
  'fx.plane_bomber', 'fx.parachute', 'fx.orbital_beam', 'fx.nanite_swarm',
  'fx.tidal_wave', 'fx.aegis_glow', 'fx.iron_horse', 'fx.zeppelin', 'fx.star_shard_rain', 'fx.warp_portal',
  // Match effects
  'fx.evolve_pillar', 'fx.last_stand_wave', 'fx.overdrive_frame', 'fx.siege_vignette',
]);

const AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

/** The power sounds added by the Age Power rework (A2.9, A5.7; DESIGN A13 "Powers" row). */
const REWORK_POWER_SOUND_IDS = [
  'pw_rockslide', 'pw_tar', 'pw_huntcry', 'pw_spear', 'pw_chariots', 'pw_bolts', 'pw_apollo', 'pw_gaze',
  'pw_knights', 'pw_caltrops', 'pw_undermine', 'pw_oil', 'pw_volley', 'pw_nets', 'pw_sharpshooter', 'pw_horse_art',
  'pw_gunline', 'pw_wire', 'pw_flak', 'pw_hospital', 'pw_strafe', 'pw_emp', 'pw_sniper', 'pw_tanks',
  'pw_drones', 'pw_stasis', 'pw_pdg', 'pw_railgun', 'pw_comet', 'pw_flare', 'pw_ion', 'pw_singularity',
  'power_cast', 'power_lock', 'turret_jammed',
];

/** Sound ids added by A17 (docs/design-lane-ages.md, A17.12). */
const A17_SOUND_IDS = [
  'shot_javelin', 'shot_scorpion', 'stomp_colossus', 'mirror_beam', 'gorgon_gaze', 'shot_carbine', 'shot_harpoon',
  'flare_pop', 'fuse_hiss', 'shot_gatling', 'tesla_zap', 'shot_ion', 'shot_void', 'shot_starburst', 'shot_tachyon',
  'blink_warp', 'drone_launch', 'pw_wave', 'pw_aegis', 'pw_iron_horse', 'pw_zeppelin', 'pw_starfall', 'pw_warp', 'alert_base',
];

export const A13_SOUND_IDS = new Set([
  ...A17_SOUND_IDS,
  ...REWORK_POWER_SOUND_IDS,
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

export const A14_PROJECTILE_IDS = new Set([
  'proj.rock', 'proj.boulder', 'proj.bee', 'proj.log', 'proj.arrow', 'proj.bolt', 'proj.goose', 'proj.musket', 'proj.lob',
  'proj.cannonball', 'proj.grapeshot', 'proj.rocket', 'proj.chainshot', 'proj.bomb', 'proj.bullet', 'proj.shell', 'proj.flak',
  'proj.plasma', 'proj.plasma_mortar', 'proj.gravity_orb',
  'proj.javelin', 'proj.scorpion_bolt', 'proj.harpoon', 'proj.flare', 'proj.ion', 'proj.starburst', 'proj.star_shard',
]);
