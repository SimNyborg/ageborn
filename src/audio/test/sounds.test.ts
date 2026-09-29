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
    'card_flip', 'foil_shine', 'rarity_common', 'rarity_rare', 'rarity_epic', 'rarity_legendary', 'walkout_bass',
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
    expect(A13_IDS).toHaveLength(179);
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
    for (const id of used) expect(Object.hasOwn(sounds, id), id).toBe(true);
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
