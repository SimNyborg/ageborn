import { content } from '@/content';
import { describe, expect, it } from 'vitest';
import { renderDef, SFX_SAMPLE_RATE } from '../bank';
import {
  BOOT_GROUPS,
  DEFAULT_GAP_MS,
  DEFAULT_MAX_VOICES,
  DEFAULT_PITCH_VAR_BP,
  DEFAULT_VOL_VAR_DB,
  SOUND_GROUPS,
  SOUND_IDS,
  sounds,
} from '../sounds';
import { midi, MAX_CUTOFF_HZ, zz } from '../soundKit';
import { PAUSED_WAVE_SOUNDS } from '../../../tests/fixtures/pausedWave';

const AGES = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'] as const;

/** DESIGN A13, copied verbatim, group by group. */
const A13: Record<string, string[]> = {
  ui: ['ui_click', 'ui_hover', 'ui_deny', 'ui_toggle', 'ui_tab', 'ui_confirm', 'meter_pip'],
  spawn: ['spawn_pop', 'spawn_heavy', 'spawn_legendary', 'step_heavy', 'step_mech'],
  attacks: [
    'swing_whoosh', 'shot_sling', 'shot_bow', 'shot_crossbow', 'shot_catapult', 'shot_musket', 'shot_lob', 'shot_cannon',
    'shot_grapeshot', 'shot_rifle', 'shot_mg', 'shot_flak', 'shot_rocket', 'shot_rail', 'shot_laser', 'shot_arc',
    'shot_plasma', 'bee_buzz', 'log_roll', 'cauldron_pour', 'toad_tongue', 'goose_honk', 'bomb_whistle', 'radio_call',
    'emp_pulse', 'time_stop', 'gravity_hum',
  ],
  hits: [
    'hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser', 'hit_heavy', 'hit_effective', 'explosion_s',
    'explosion_m', 'explosion_l', 'die_bio', 'die_mech', 'prop_drop', 'heal_tick', 'shield_up',
  ],
  turrets: ['turret_build', 'turret_sell', 'turret_upgrade', 'slot_buy', 'base_hit', 'base_crumble', 'base_destroyed'],
  economy: ['coin_gain', 'xp_tick', 'treasury_up'],
  evolve: ['evolve_ready', 'evolve_riser', ...AGES.map((a) => `evolve_fanfare_${a}`), 'evolve_enemy'],
  powers: [
    'power_ready', 'power_telegraph', 'pw_stampede', 'pw_meteor', 'pw_arrows', 'pw_decree', 'pw_smoke', 'pw_broadside',
    'pw_paratroop', 'pw_bomber', 'pw_lance', 'pw_nanite',
  ],
  match: [
    'last_stand_armed', 'last_stand_charge', 'last_stand_fire', 'overdrive_horn', 'siege_bell', 'victory_jingle',
    'defeat_jingle', 'emote_pop',
  ],
  capsules: [
    'cap_thud', 'cap_riser', 'cap_climb_1', 'cap_climb_2', 'cap_climb_3', 'cap_climb_4', 'cap_clunk', 'cap_burst',
    // The 2026-09-29 ladder: the summit climbs, the summit gem and the Platinum and Aeon stingers.
    'cap_climb_5', 'cap_climb_6', 'cap_summit_rise', 'cap_burst_platinum', 'cap_burst_aeon',
    // The hammer's count-in and the graded hit layers (A10 step 3, 2026-09-29).
    'cap_strike_tick', 'cap_strike_perfect', 'cap_strike_good',
    'card_flip', 'foil_shine', 'rarity_common', 'rarity_rare', 'rarity_epic', 'rarity_legendary', 'walkout_bass',
    // The rarity burst (A10 step 5a, owner request 2026-10-07): the anticipation riser and the burst per rarity.
    'rarity_riser', 'rarity_burst_rare', 'rarity_burst_epic', 'rarity_burst_legendary',
    'copy_tick', 'upgrade_ready', 'upgrade_slam', 'level_up', 'reel_tick',
  ],
  /** A17.4: the off-screen "base under attack" badge. */
  camera: ['alert_base'],
  /** A17.12: the attack and power sounds of Bronze, Industrial and Cosmic (fanfares are under evolve). */
  a17: [
    'shot_javelin', 'shot_scorpion', 'stomp_colossus', 'mirror_beam', 'gorgon_gaze', 'shot_carbine', 'shot_harpoon',
    'flare_pop', 'fuse_hiss', 'shot_gatling', 'tesla_zap', 'shot_ion', 'shot_void', 'shot_starburst', 'shot_tachyon',
    'blink_warp', 'drone_launch', 'pw_wave', 'pw_aegis', 'pw_iron_horse', 'pw_zeppelin', 'pw_starfall', 'pw_warp',
  ],
  /** The power rework (A2.9, A5.7): the 32 new power sounds. */
  rework: [
    'pw_rockslide', 'pw_tar', 'pw_huntcry', 'pw_spear', 'pw_bolts', 'pw_gaze', 'pw_chariots', 'pw_apollo', 'pw_caltrops',
    'pw_oil', 'pw_knights', 'pw_undermine', 'pw_volley', 'pw_nets', 'pw_horse_art', 'pw_sharpshooter', 'pw_gunline',
    'pw_wire', 'pw_railgun', 'pw_hospital', 'pw_strafe', 'pw_flak', 'pw_tanks', 'pw_sniper', 'pw_pdg', 'pw_stasis',
    'pw_drones', 'pw_emp', 'pw_singularity', 'pw_flare', 'pw_comet', 'pw_ion',
    'power_cast', 'power_lock', 'turret_jammed',
  ],
  /** Forts (A16.14.8, A13): placing, building, hits by material, crumble, collapse, decay, traps, camps. */
  forts: [
    'fort_place', 'fort_build', 'fort_complete', 'fort_hit_wood', 'fort_hit_stone', 'fort_hit_metal', 'fort_hit_energy', 'fort_crumble', 'fort_collapse', 'fort_decay', 'trap_arm', 'trap_snap', 'trap_blast', 'camp_horn', 'levy_spawn', 'fort_denied',
  ],
  /** Bronze wave (CONTENT_PLAN 5.2): the attacks, turrets and powers of the 13 new Bronze cards. */
  bronzeWave: [
    'kopis_hack', 'rhomphaia_cut', 'shot_discus', 'trunk_lash', 'shot_belly_bow', 'aulos_note', 'chorus_wail', 'horse_ram',
    'sagaris_sweep', 'labrys_chop', 'hydra_bite', 'net_cast', 'shot_polybolos', 'pw_sandstorm', 'pw_whirlpool',
  ],
  /** Stone wave (CONTENT_PLAN 5.1): the attacks, turrets and powers of the new Stone cards. */
  stoneWave: [
    'wolf_bite', 'shield_bash', 'torch_jab', 'horn_hook', 'bear_swipe', 'antler_sweep', 'shot_bolas', 'shot_atlatl',
    'shot_heave', 'herb_puff', 'quill_fan', 'shot_sapling', 'pw_hail', 'pw_vines',
  ],
  /** Medieval wave (CONTENT_PLAN 5.3): the attacks, turrets and powers of the new Medieval cards. */
  medievalWave: [
    'squire_jab', 'flail_smash', 'dagger_stab', 'shot_windlass', 'greatsword_sweep', 'shot_longbow', 'hammer_clang',
    'trumpet_toot', 'whip_crack', 'shot_mangonel', 'drawbridge_slam', 'vial_toss', 'wyrm_breath', 'hound_bite',
    'shot_springald', 'crane_hook', 'pw_longbow', 'pw_bell',
  ],
  /** Gunpowder wave (CONTENT_PLAN 5.4): the attacks, turrets and powers of the new Gunpowder cards. */
  gunpowderWave: [
    'claymore_chop', 'scoop_swing', 'shot_blunderbuss', 'shot_dragoon', 'shot_coehorn', 'shot_wallgun', 'drum_roll',
    'pipe_drone', 'sabre_slash', 'mesmer_chime', 'marshal_sweep', 'shot_carronade', 'shot_sea_mortar', 'pw_rockets', 'pw_salute',
  ],
  /** Industrial wave (CONTENT_PLAN 5.5): the attacks, turrets and powers of the new Industrial cards. */
  industrialWave: [
    'pickaxe_clink', 'mantlet_jab', 'bike_skid', 'shot_bowl', 'plough_scoop', 'shot_trench_mortar', 'drill_spin', 'cornet_blast',
    'key_whack', 'car_mg', 'ice_axe_chop', 'coil_zap', 'train_gun', 'toy_bayonet', 'shot_rivet', 'hammer_slam', 'pw_shrapnel', 'pw_magnet',
  ],
  /** Modern wave (CONTENT_PLAN 5.6): the attacks, turrets and powers of the new Modern cards. */
  modernWave: [
    'butt_stroke', 'sandbag_slam', 'shot_smg', 'shot_rifle_grenade', 'shot_assault_gun', 'shot_mortar_team', 'sticky_thunk',
    'shot_pistol', 'boxing_jab', 'dive_whistle', 'dozer_shove', 'shot_ghillie', 'bomb_stick', 'shot_at_gun', 'rocket_ripple',
    'pw_barrage', 'pw_concussion',
  ],
  /** Future wave (CONTENT_PLAN 5.7): the attacks, turrets and powers of the new Future cards. */
  futureWave: [
    'baton_spin', 'shield_pulse', 'lance_swipe', 'shot_needle', 'pincer_snap', 'shot_lobber', 'lance_crackle', 'multitool_zap',
    'shot_holo', 'shot_jet_beam', 'shot_particle', 'robot_punch', 'shot_pd_laser', 'holo_flicker', 'shot_drone', 'shot_cryo',
    'tractor_hum', 'pw_painter', 'pw_nanomesh',
  ],
  /** Cosmic wave (CONTENT_PLAN 5.8): the attacks, turrets and powers of the new Cosmic cards. */
  cosmicWave: [
    'crystal_slam', 'board_kick', 'moon_spit', 'nova_lob', 'golem_uppercut', 'shot_star_mortar', 'shot_antimatter', 'tendril_flick',
    'void_whisper', 'shot_twin_laser', 'matron_spit', 'sage_orb', 'leviathan_song', 'swarm_bite', 'shot_shard', 'horizon_pulse',
    'pw_drizzle', 'pw_pulsar',
  ],
  /** MVP pass (audio audit 2026-10-01): the ui-plan 5.4 UI ids, Council, stances, escalation, warnings, energy forts. */
  mvp: [
    'ui_sheet', 'ui_pop', 'ui_whoosh', 'ui_stamp', 'card_lift', 'card_place', 'star_stamp', 'path_draw', 'node_drop', 'region_open', 'ui_unlock', 'reward_fly',
    'council_open', 'council_pick', 'vs_slam', 'sundial_claim', 'glyph_light',
    'stance_charge', 'stance_hold', 'stance_fallback', 'research_done', 'alert_heavy', 'hit_armor_crack', 'brace_clank', 'thunder', 'escalate_horn', 'crumble_pulse',
    'fort_build_energy', 'camp_warp', 'levy_warp', 'trap_blast_energy',
  ],
};
const A13_IDS = Object.values(A13).flat();

const rendered = new Map(SOUND_IDS.map((id) => [id, renderDef(sounds[id]!) as Float32Array[]]));

function peak(a: Float32Array): number {
  let m = 0;
  for (let k = 0; k < a.length; k++) m = Math.max(m, Math.abs(a[k]!));
  return m;
}

describe('sound manifest (A13)', () => {
  it('has exactly the A13 sound ids', () => {
    // 182 + the 16 fort sounds (A16.14.8) + the 31 of the MVP pass + the 15 of the Bronze wave + the 14 of the Stone wave
    // + the 18 of the Medieval wave + the 15 of the Gunpowder wave + the 18 of the Industrial wave + the 17 of the Modern wave
    // + the 19 of the Future wave + the 18 of the Cosmic wave
    expect(A13_IDS).toHaveLength(363);
    expect([...SOUND_IDS].sort()).toEqual([...A13_IDS].sort());
  });

  it('gives every id 3-5 ZzFX variants (A13) and a valid bus and group', () => {
    for (const id of SOUND_IDS) {
      const d = sounds[id]!;
      expect(d.kind === 'zzfx' || d.kind === 'zzfxMix', id).toBe(true);
      if (d.kind === 'file') continue;
      expect(d.variants.length, id).toBeGreaterThanOrEqual(3);
      expect(d.variants.length, id).toBeLessThanOrEqual(5);
      expect(SOUND_GROUPS, id).toContain(d.group);
      expect(d.bus, id).toBe(d.group === 'ui' ? 'ui' : 'sfx');
    }
    for (const id of A13.ui!) expect(sounds[id]!.bus).toBe('ui');
  });

  it('keeps the A12 variant counts for hits', () => {
    for (const id of ['hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser']) {
      expect((sounds[id] as { variants: unknown[] }).variants).toHaveLength(4);
    }
    for (const id of ['hit_heavy', 'base_hit']) expect((sounds[id] as { variants: unknown[] }).variants).toHaveLength(3);
  });

  it('uses 21 ZzFX parameters with zero randomness (variation happens at playback)', () => {
    for (const id of SOUND_IDS) {
      const d = sounds[id]!;
      const lists = d.kind === 'zzfx' ? d.variants : d.kind === 'zzfxMix' ? d.variants.flat().map((n) => n.params) : [];
      for (const p of lists) {
        expect(p, id).toHaveLength(21);
        expect(p[1], id).toBe(0);
        for (const v of p) expect(Number.isFinite(v), id).toBe(true);
      }
    }
  });

  it('renders every variant to finite, audible samples below full scale', () => {
    for (const [id, variants] of rendered) {
      for (const v of variants) {
        expect(v.length, id).toBeGreaterThan(0);
        const p = peak(v);
        expect(Number.isFinite(p), id).toBe(true);
        expect(p, id).toBeGreaterThan(0.02);
        expect(p, id).toBeLessThan(0.9);
      }
    }
  });

  it('keeps sounds short enough for their job', () => {
    const seconds = (id: string): number => Math.max(...rendered.get(id)!.map((v) => v.length)) / SFX_SAMPLE_RATE;
    for (const id of [...A13.ui!, 'meter_pip', 'copy_tick', 'reel_tick', 'card_flip', 'xp_tick', 'coin_gain']) expect(seconds(id), id).toBeLessThanOrEqual(0.35);
    for (const id of [...A13.hits!, ...A13.attacks!].filter((i) => !['explosion_l', 'time_stop'].includes(i))) expect(seconds(id), id).toBeLessThanOrEqual(1.0);
    // The telegraph spans the 1.0 s power telegraph (A2.9); the evolve riser the 2.5 s ascension.
    expect(seconds('power_telegraph')).toBeGreaterThan(0.9);
    expect(seconds('power_telegraph')).toBeLessThan(1.2);
    for (const id of SOUND_IDS) expect(seconds(id), id).toBeLessThanOrEqual(3.5);
  });

  it('makes every variant of a sound differ from the others', () => {
    const same = (a: Float32Array, b: Float32Array): boolean => a.length === b.length && a.every((x, k) => x === b[k]);
    for (const [id, variants] of rendered) {
      for (let i = 0; i < variants.length; i++) {
        for (let j = i + 1; j < variants.length; j++) expect(same(variants[i]!, variants[j]!), `${id} ${i}=${j}`).toBe(false);
      }
    }
  });

  it('climbs cap_climb_1..5 in pitch, a step each, and Aeon lower, not shriller (A10, A13)', () => {
    const tone = (id: string): number => {
      const d = sounds[id]!;
      if (d.kind !== 'zzfxMix') throw new Error(id);
      // The chime is the loudest triangle voice (a quieter glitter may sit above it).
      const tri = d.variants[0]!.filter((n) => n.params[6] === 1);
      const loud = tri.reduce((a, b) => ((b.params[0] as number) > (a.params[0] as number) ? b : a));
      return loud.params[2] as number;
    };
    const f = [1, 2, 3, 4, 5].map((n) => tone(`cap_climb_${n}`));
    for (let k = 1; k < f.length; k++) expect(f[k]!).toBeGreaterThan(f[k - 1]!);
    // Aeon is richer and lower, not shriller (A13).
    expect(tone('cap_climb_6')).toBeLessThan(tone('cap_climb_5'));
  });

  it('plays musical sounds in tune: no random pitch on jingles, fanfares and reveals', () => {
    const musical = [
      ...AGES.map((a) => `evolve_fanfare_${a}`), 'victory_jingle', 'defeat_jingle', 'rarity_common', 'rarity_rare', 'rarity_epic',
      'rarity_legendary', 'level_up', 'upgrade_ready', 'cap_climb_1', 'cap_climb_4', 'cap_climb_5', 'cap_climb_6', 'cap_burst_platinum', 'cap_burst_aeon', 'evolve_ready', 'pw_decree', 'siege_bell',
    ];
    for (const id of musical) expect(sounds[id]!.pitchVarBp, id).toBe(0);
    // Timed sounds keep their length, and the caller owns the pitch of climbs and the reel.
    for (const id of ['power_telegraph', 'evolve_riser', 'cap_riser', 'last_stand_charge', 'coin_gain', 'copy_tick', 'reel_tick']) {
      expect(sounds[id]!.pitchVarBp, id).toBe(0);
    }
  });

  it('keeps A13 per-play variation: pitch ±8% unless the pitch must hold, volume ±3 dB always', () => {
    let varied = 0;
    for (const id of SOUND_IDS) {
      const d = sounds[id]!;
      // Either the A13 default (±8%) or a steady pitch; never an ad hoc spread.
      expect(d.pitchVarBp === undefined || d.pitchVarBp === 0, id).toBe(true);
      expect(d.volVarDb, id).toBeUndefined();
      if (d.pitchVarBp === undefined) varied++;
    }
    expect(DEFAULT_PITCH_VAR_BP).toBe(800);
    expect(DEFAULT_VOL_VAR_DB).toBe(3);
    // Most sounds use the default spread.
    expect(varied).toBeGreaterThan(SOUND_IDS.length / 2);
  });

  it('never loosens the A13 voice limits: at most 4 voices, at least 40 ms between retriggers', () => {
    expect(DEFAULT_MAX_VOICES).toBe(4);
    expect(DEFAULT_GAP_MS).toBe(40);
    for (const id of SOUND_IDS) {
      const d = sounds[id]!;
      expect(d.maxVoices ?? DEFAULT_MAX_VOICES, id).toBeLessThanOrEqual(4);
      expect(d.maxVoices ?? DEFAULT_MAX_VOICES, id).toBeGreaterThanOrEqual(1);
      expect(d.gapMs ?? DEFAULT_GAP_MS, id).toBeGreaterThanOrEqual(40);
    }
  });

  it('renders the boot groups (UI and the first two ages, Stone and Bronze since A17.17) and the shared battle sounds', () => {
    expect(BOOT_GROUPS).toEqual(['ui', 'battle', 'stone', 'bronze']);
    const boot = new Set(SOUND_IDS.filter((id) => BOOT_GROUPS.includes(sounds[id]!.group)));
    // What a Stone or Bronze battle needs from its first seconds.
    for (const id of ['ui_click', 'ui_deny', 'spawn_pop', 'spawn_heavy', 'swing_whoosh', 'shot_sling', 'shot_catapult', 'shot_javelin', 'mirror_beam', 'hit_blunt', 'hit_pierce', 'die_bio', 'coin_gain', 'turret_build', 'base_hit', 'pw_stampede', 'pw_wave']) {
      expect(boot.has(id), id).toBe(true);
    }
  });
});

describe('content sound ids resolve (B13 integrity)', () => {
  it('every unit, turret, power and skin sound exists in the manifest', () => {
    const used = new Set<string>();
    for (const u of Object.values(content.units)) {
      used.add(u.sfx.spawn);
      used.add(u.sfx.die);
      for (const a of u.attacks) used.add(a.sfx);
    }
    for (const t of Object.values(content.turrets)) used.add(t.attack.sfx);
    for (const p of Object.values(content.powers)) used.add(p.sfx);
    for (const s of Object.values(content.skins)) for (const id of Object.values(s.sfxOverrides ?? {})) used.add(id);
    expect(used.size).toBeGreaterThan(30);
    // the paused content wave has no sounds yet (tests/fixtures/pausedWave.ts)
    for (const id of used) if (!PAUSED_WAVE_SOUNDS.has(id)) expect(Object.hasOwn(sounds, id), id).toBe(true);
  });

  it('the A14.2 hit mapping resolves: hit_<dmgType>, explosion_s for blast', () => {
    for (const d of ['blunt', 'slash', 'pierce', 'bullet', 'laser']) expect(Object.hasOwn(sounds, `hit_${d}`)).toBe(true);
    expect(Object.hasOwn(sounds, 'explosion_s')).toBe(true);
  });
});

describe('sound kit', () => {
  it('maps note names to MIDI', () => {
    expect(midi('C4')).toBe(60);
    expect(midi('A4')).toBe(69);
    expect(midi('F#5')).toBe(78);
    expect(midi('Bb3')).toBe(58);
    expect(() => midi('H2')).toThrow();
  });

  it('converts named filters to the ZzFX convention and refuses unstable cutoffs', () => {
    expect(zz({ lowpass: 2000 })[20]).toBe(-1000);
    expect(zz({ highpass: 3000 })[20]).toBe(1500);
    expect(() => zz({ lowpass: MAX_CUTOFF_HZ + 1 })).toThrow();
    expect(() => zz({ lowpass: 100, highpass: 200 })).toThrow();
  });
});
