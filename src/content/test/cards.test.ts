/**
 * Every card in DESIGN A5 exists in the compiled content with the listed numbers
 * (C2/WP1 DoD: "A table-driven test that every card in A5 exists with the listed numbers").
 *
 * The rows are typed in from the DESIGN tables (A5.2-A5.7), not read from the raw files, so a typo on
 * either side fails. When balance tuning changes a number, update DESIGN and the row here.
 */
import { describe, expect, it } from 'vitest';
import type { AttackDef, DamageMod, PowerFamily, PowerSlot, PowerSource, UnitDef } from '@/contracts/content';
import { carriesStructureMod } from '@/core/forts';
import type { AgeId, Rarity, Role, Tag } from '@/contracts/ids';
import strings from '@/i18n/content.en.json';
import { content } from '../index';

type Hits = 'G' | 'A' | 'GA' | '-';
type Size = UnitDef['size'];
const R: Record<string, Rarity> = { C: 'common', R: 'rare', E: 'epic', L: 'legendary' };
const S: Record<string, Size> = { S: 'small', M: 'medium', L: 'large', H: 'huge' };

/** [slug, name, rarity, role, cost, hp, damage, interval s×10, range, speed, size, hits, tags] */
type UnitRow = [string, string, string, Role, number, number, number, number, number, number, string, Hits, string];

const UNITS: Record<AgeId, UnitRow[]> = {
  // A5.2 Stone Age (P 1.00)
  stone: [
    ['bonker', 'Bonker', 'C', 'infantry', 50, 160, 20, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['pebbler', 'Pebbler', 'C', 'ranged', 75, 95, 18, 14, 200, 65, 'S', 'GA', 'light bio ranged'],
    ['tuskback', 'Tuskback', 'C', 'heavy', 150, 560, 42, 15, 16, 55, 'L', 'G', 'armored bio melee'],
    ['spear_hunter', 'Spear Hunter', 'R', 'antiArmor', 100, 220, 26, 12, 60, 70, 'M', 'G', 'light bio melee'],
    ['drum_shaman', 'Drum Shaman', 'R', 'support', 110, 130, 8, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['sabertooth', 'Sabertooth', 'E', 'skirmisher', 200, 380, 34, 8, 12, 100, 'M', 'G', 'light bio melee'],
    ['mammoth_matriarch', 'Mammoth Matriarch', 'L', 'siegeHeavy', 350, 1700, 55, 20, 20, 40, 'H', 'G', 'armored bio melee legendary'],
  ],
  // A17.9 Bronze Age (P 1.16)
  bronze: [
    ['hoplite', 'Hoplite', 'C', 'infantry', 50, 186, 23, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['javelineer', 'Javelineer', 'C', 'ranged', 75, 110, 20, 14, 210, 65, 'S', 'GA', 'light bio ranged'],
    ['war_chariot', 'War Chariot', 'C', 'heavy', 150, 630, 49, 15, 16, 65, 'L', 'G', 'armored bio melee'],
    ['phalangite', 'Phalangite', 'R', 'antiArmor', 100, 255, 30, 12, 65, 70, 'M', 'G', 'light bio melee'],
    ['standard_bearer', 'Standard Bearer', 'R', 'support', 110, 151, 9, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['scorpion', 'Scorpion', 'E', 'artillery', 200, 330, 64, 30, 290, 45, 'L', 'G', 'light mech ranged'],
    ['bronze_colossus', 'Bronze Colossus', 'L', 'siegeHeavy', 350, 2050, 64, 20, 20, 40, 'H', 'G', 'armored mech melee legendary'],
  ],
  // A5.3 Medieval Age (P 1.35)
  medieval: [
    ['footman', 'Footman', 'C', 'infantry', 50, 216, 27, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['longbowman', 'Longbowman', 'C', 'ranged', 75, 128, 24, 14, 230, 65, 'S', 'GA', 'light bio ranged'],
    ['destrier_knight', 'Destrier Knight', 'C', 'heavy', 150, 756, 57, 15, 16, 60, 'L', 'G', 'armored bio melee'],
    ['pikeman', 'Pikeman', 'R', 'antiArmor', 100, 297, 35, 12, 70, 70, 'M', 'G', 'light bio melee'],
    ['friar', 'Friar', 'R', 'support', 110, 175, 11, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['battering_ram', 'Battering Ram', 'E', 'siege', 200, 900, 10, 20, 12, 45, 'L', 'G', 'armored mech melee'],
    ['ursa_paladin', 'Ursa Paladin', 'L', 'siegeHeavy', 350, 2300, 70, 14, 20, 55, 'H', 'G', 'armored bio melee legendary'],
  ],
  // A5.4 Gunpowder Age (P 1.82)
  gunpowder: [
    ['corsair', 'Corsair', 'C', 'infantry', 50, 291, 36, 10, 16, 72, 'S', 'G', 'light bio melee'],
    ['fusilier', 'Fusilier', 'C', 'ranged', 75, 173, 47, 20, 240, 65, 'S', 'GA', 'light bio ranged'],
    ['cuirassier', 'Cuirassier', 'C', 'heavy', 150, 1019, 76, 15, 16, 60, 'L', 'G', 'armored bio melee'],
    ['grenadier', 'Grenadier', 'R', 'antiArmor', 100, 253, 55, 18, 150, 68, 'M', 'G', 'light bio ranged'],
    ['field_surgeon', 'Field Surgeon', 'R', 'support', 110, 237, 15, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['bronze_cannon', 'Bronze Cannon', 'E', 'artillery', 200, 500, 110, 35, 280, 45, 'L', 'G', 'light mech ranged'],
    ['balloon_admiral', 'Balloon Admiral', 'L', 'airBomber', 350, 1500, 110, 16, 40, 45, 'H', 'G', 'air legendary'],
  ],
  // A17.10 Industrial Age (P 2.12)
  industrial: [
    ['riveter', 'Riveter', 'C', 'infantry', 50, 330, 42, 10, 16, 72, 'S', 'G', 'light bio melee'],
    ['carbineer', 'Carbineer', 'C', 'ranged', 75, 201, 33, 12, 250, 65, 'S', 'GA', 'light bio ranged'],
    ['steam_golem', 'Steam Golem', 'C', 'heavy', 150, 1187, 89, 15, 16, 55, 'L', 'G', 'armored mech melee'],
    ['harpoon_gunner', 'Harpoon Gunner', 'R', 'antiArmor', 100, 286, 55, 12, 210, 65, 'M', 'GA', 'light bio ranged'],
    ['flare_spotter', 'Flare Spotter', 'R', 'support', 110, 276, 17, 12, 200, 65, 'S', 'GA', 'light bio support ranged'],
    ['sapper', 'Sapper', 'E', 'siege', 200, 560, 12, 20, 12, 85, 'M', 'G', 'light bio melee'],
    ['land_dreadnought', 'Land Dreadnought', 'L', 'siegeHeavy', 350, 3600, 130, 22, 160, 35, 'H', 'G', 'armored mech ranged legendary'],
  ],
  // A5.5 Modern Age (P 2.46)
  modern: [
    ['trench_raider', 'Trench Raider', 'C', 'infantry', 50, 394, 49, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['rifleman', 'Rifleman', 'C', 'ranged', 75, 234, 32, 10, 260, 65, 'S', 'GA', 'light bio ranged'],
    ['tankette', 'Tankette', 'C', 'heavy', 150, 1378, 104, 15, 90, 50, 'L', 'G', 'armored mech ranged'],
    ['bazooka_trooper', 'Bazooka Trooper', 'R', 'antiArmor', 100, 363, 64, 12, 200, 65, 'M', 'GA', 'light bio ranged'],
    ['radio_operator', 'Radio Operator', 'R', 'support', 110, 320, 20, 12, 200, 65, 'S', 'GA', 'light bio support ranged'],
    ['gyrocopter', 'Gyrocopter', 'E', 'airGunship', 200, 740, 20, 3, 150, 80, 'M', 'GA', 'air mech'],
    ['behemoth_tank', 'Behemoth Tank', 'L', 'siegeHeavy', 350, 4100, 170, 25, 240, 35, 'H', 'G', 'armored mech legendary'],
  ],
  // A5.6 Future Age (P 3.32)
  future: [
    ['photon_knight', 'Photon Knight', 'C', 'infantry', 50, 470, 66, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['pulse_trooper', 'Pulse Trooper', 'C', 'ranged', 75, 315, 43, 10, 260, 65, 'S', 'GA', 'light bio ranged'],
    ['walker_mech', 'Walker Mech', 'C', 'heavy', 150, 1860, 140, 15, 60, 50, 'L', 'G', 'armored mech melee'],
    ['rail_gunner', 'Rail Gunner', 'R', 'antiArmor', 100, 440, 86, 12, 240, 65, 'M', 'GA', 'light bio ranged'],
    ['repair_drone', 'Repair Drone', 'R', 'support', 110, 430, 0, 0, 160, 70, 'S', '-', 'air mech support'],
    ['emp_saboteur', 'EMP Saboteur', 'E', 'antiMech', 200, 700, 50, 10, 12, 85, 'M', 'G', 'light bio melee'],
    ['chrono_titan', 'Chrono Titan', 'L', 'siegeHeavy', 350, 5600, 230, 16, 60, 35, 'H', 'G', 'armored mech melee legendary'],
  ],
  // A17.11 Cosmic Age (P 4.48)
  cosmic: [
    ['star_legionnaire', 'Star Legionnaire', 'C', 'infantry', 50, 700, 90, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['ion_ranger', 'Ion Ranger', 'C', 'ranged', 75, 426, 54, 10, 270, 65, 'S', 'GA', 'light bio ranged'],
    ['hover_tank', 'Hover Tank', 'C', 'heavy', 150, 2509, 188, 15, 90, 55, 'L', 'G', 'armored mech ranged'],
    ['graviton_halberdier', 'Graviton Halberdier', 'R', 'antiArmor', 100, 985, 116, 12, 70, 70, 'M', 'G', 'light bio melee'],
    ['starwarden', 'Starwarden', 'R', 'support', 110, 582, 36, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['warp_stalker', 'Warp Stalker', 'E', 'skirmisher', 200, 1600, 140, 8, 12, 100, 'M', 'G', 'light bio melee'],
    ['mothership', 'Mothership', 'L', 'airGunship', 350, 3700, 80, 6, 180, 40, 'H', 'GA', 'air mech legendary'],
  ],
};

/** [slug, name, rarity, cost, damage, interval s×10, range, hits] */
type TurretRow = [string, string, string, number, number, number, number, Hits];

const TURRETS: Record<AgeId, TurretRow[]> = {
  stone: [
    ['rock_tosser', 'Rock Tosser', 'C', 150, 30, 15, 360, 'GA'],
    ['angry_beehive', 'Angry Beehive', 'C', 175, 5, 2, 220, 'GA'],
    ['log_roller', 'Log Roller', 'R', 250, 45, 40, 300, 'G'],
    ['grumpy_toad', 'Grumpy Toad', 'E', 250, 60, 50, 420, 'G'],
  ],
  bronze: [
    ['archer_tower', 'Archer Tower', 'C', 150, 35, 15, 370, 'GA'],
    ['sun_mirror', 'Sun Mirror', 'C', 175, 9, 3, 230, 'GA'],
    ['onager', 'Onager', 'R', 250, 95, 45, 480, 'G'],
    ['gorgon_bust', 'Gorgon Bust', 'E', 250, 55, 60, 380, 'GA'],
  ],
  medieval: [
    ['crossbow_nest', 'Crossbow Nest', 'C', 150, 40, 15, 380, 'GA'],
    ['pitch_cauldron', 'Pitch Cauldron', 'C', 175, 14, 5, 130, 'G'],
    ['trebuchet', 'Trebuchet', 'R', 250, 110, 45, 480, 'G'],
    ['honk_ballista', 'Honk Ballista', 'E', 250, 70, 30, 400, 'GA'],
  ],
  gunpowder: [
    ['swivel_gun', 'Swivel Gun', 'C', 150, 22, 6, 340, 'GA'],
    ['grapeshot_gun', 'Grapeshot Gun', 'C', 175, 50, 20, 220, 'GA'],
    ['congreve_rack', 'Congreve Rack', 'R', 250, 55, 50, 460, 'GA'],
    ['chainshot_cannon', 'Chainshot Cannon', 'E', 250, 75, 40, 400, 'G'],
  ],
  industrial: [
    ['gatling_gun', 'Gatling Gun', 'C', 150, 13, 3, 350, 'GA'],
    ['mortar_pit', 'Mortar Pit', 'C', 175, 68, 20, 300, 'G'],
    ['boiler_mortar', 'Boiler Mortar', 'R', 250, 172, 50, 480, 'G'],
    ['tesla_tower', 'Tesla Tower', 'E', 250, 130, 45, 380, 'GA'],
  ],
  modern: [
    ['mg_nest', 'MG Nest', 'C', 150, 15, 3, 340, 'GA'],
    ['flak_gun', 'Flak Gun', 'C', 175, 60, 15, 420, 'GA'],
    ['howitzer', 'Howitzer', 'R', 250, 200, 50, 480, 'G'],
    ['searchlight_sniper', 'Searchlight Sniper', 'E', 250, 280, 40, 480, 'GA'],
  ],
  future: [
    ['pulse_laser', 'Pulse Laser', 'C', 150, 20, 3, 360, 'GA'],
    ['arc_coil', 'Arc Coil', 'C', 175, 60, 18, 260, 'GA'],
    ['plasma_mortar', 'Plasma Mortar', 'R', 250, 270, 50, 480, 'G'],
    ['gravity_well', 'Gravity Well', 'E', 250, 60, 70, 400, 'G'],
  ],
  cosmic: [
    ['ion_turret', 'Ion Turret', 'C', 150, 27, 3, 370, 'GA'],
    ['starburst_gun', 'Starburst Gun', 'C', 175, 123, 20, 240, 'GA'],
    ['starfall_battery', 'Starfall Battery', 'R', 250, 363, 50, 480, 'G'],
    ['tachyon_lance', 'Tachyon Lance', 'E', 250, 184, 40, 420, 'GA'],
  ],
};

/** A5.7: [slug, name, age, slot, effect fields to match] */
/** A5.7 roster (the power rework, A2.9): slug, name, age, slot, family, source, cost, reload, telegraph, cap (0 = none). */
type PowerRow = [string, string, AgeId, PowerSlot, PowerFamily, PowerSource, number, number, number, number];

const POWERS: PowerRow[] = [
  ['rockslide', 'Rockslide', 'stone', 'home', 'sweep', 'starter', 100, 40000, 1000, 5],
  ['meteor_shower', 'Meteor Shower', 'stone', 'home', 'bombard', 'road', 100, 40000, 1000, 4],
  ['sticky_tar', 'Sticky Tar', 'stone', 'home', 'snare', 'warPath', 75, 30000, 1000, 6],
  ['stampede', 'Stampede', 'stone', 'field', 'charge', 'starter', 100, 40000, 1000, 6],
  ['hunt_cry', 'Hunt Cry', 'stone', 'field', 'rally', 'warPath', 125, 45000, 500, 8],
  ['hunters_spear', 'Hunter’s Spear', 'stone', 'field', 'strike', 'warPath', 75, 30000, 1500, 1],
  ['tidal_wave', 'Tidal Wave', 'bronze', 'home', 'sweep', 'starter', 100, 40000, 1000, 5],
  ['zeus_bolts', 'Zeus’s Bolts', 'bronze', 'home', 'bombard', 'warPath', 100, 40000, 1000, 4],
  ['medusa_gaze', 'Medusa’s Gaze', 'bronze', 'home', 'stun', 'warPath', 75, 35000, 1000, 5],
  ['chariot_rush', 'Chariot Rush', 'bronze', 'field', 'charge', 'starter', 100, 40000, 1000, 6],
  ['aegis', 'Aegis', 'bronze', 'field', 'ward', 'road', 125, 45000, 500, 8],
  ['apollo_arrow', 'Apollo’s Arrow', 'bronze', 'field', 'strike', 'warPath', 75, 30000, 1500, 1],
  ['arrow_storm', 'Arrow Storm', 'medieval', 'home', 'bombard', 'starter', 100, 40000, 1000, 4],
  ['caltrops', 'Caltrops', 'medieval', 'home', 'snare', 'warPath', 75, 30000, 1000, 6],
  ['boiling_oil', 'Boiling Oil', 'medieval', 'home', 'sweep', 'warPath', 100, 40000, 1000, 3],
  ['knights_charge', 'Knights’ Charge', 'medieval', 'field', 'charge', 'starter', 100, 40000, 1000, 6],
  ['royal_decree', 'Royal Decree', 'medieval', 'field', 'rally', 'road', 125, 45000, 500, 8],
  ['undermine', 'Undermine', 'medieval', 'field', 'suppress', 'warPath', 125, 60000, 1500, 0],
  ['volley_fire', 'Volley Fire', 'gunpowder', 'home', 'sweep', 'starter', 100, 40000, 1000, 5],
  ['broadside', 'Broadside', 'gunpowder', 'home', 'bombard', 'road', 100, 40000, 1000, 4],
  ['boarding_nets', 'Boarding Nets', 'gunpowder', 'home', 'pull', 'warPath', 75, 30000, 1000, 6],
  ['smoke_screen', 'Smoke Screen', 'gunpowder', 'field', 'cloud', 'starter', 100, 40000, 1000, 8],
  ['horse_artillery', 'Horse Artillery', 'gunpowder', 'field', 'frontBarrage', 'warPath', 100, 35000, 1000, 5],
  ['sharpshooter', 'Sharpshooter', 'gunpowder', 'field', 'strike', 'warPath', 75, 30000, 1500, 1],
  ['gun_line', 'Gun Line', 'industrial', 'home', 'sweep', 'starter', 100, 40000, 1000, 5],
  ['zeppelin_raid', 'Zeppelin Raid', 'industrial', 'home', 'bombard', 'road', 100, 40000, 1000, 4],
  ['barbed_wire', 'Barbed Wire', 'industrial', 'home', 'snare', 'warPath', 75, 30000, 1000, 6],
  ['iron_horse', 'Iron Horse', 'industrial', 'field', 'charge', 'starter', 100, 40000, 1000, 6],
  ['railway_gun', 'Railway Gun', 'industrial', 'field', 'strike', 'warPath', 75, 30000, 2000, 1],
  ['field_hospital', 'Field Hospital', 'industrial', 'field', 'mend', 'warPath', 125, 45000, 500, 8],
  ['strafing_run', 'Strafing Run', 'modern', 'home', 'sweep', 'starter', 100, 40000, 1000, 5],
  ['carpet_bomber', 'Carpet Bomber', 'modern', 'home', 'bombard', 'road', 100, 40000, 1000, 4],
  ['aa_screen', 'AA Screen', 'modern', 'home', 'flak', 'warPath', 75, 25000, 500, 3],
  ['paratroopers', 'Paratroopers', 'modern', 'field', 'drop', 'starter', 150, 60000, 1000, 0],
  ['tank_rush', 'Tank Rush', 'modern', 'field', 'charge', 'warPath', 100, 40000, 1000, 6],
  ['sniper_team', 'Sniper Team', 'modern', 'field', 'strike', 'warPath', 75, 25000, 1500, 1],
  ['orbital_lance', 'Orbital Lance', 'future', 'home', 'sweep', 'starter', 100, 40000, 1000, 5],
  ['point_defense', 'Point Defense Grid', 'future', 'home', 'bombard', 'warPath', 100, 40000, 1000, 4],
  ['stasis_field', 'Stasis Field', 'future', 'home', 'stun', 'warPath', 75, 35000, 1000, 6],
  ['drone_swarm', 'Drone Swarm', 'future', 'field', 'frontBarrage', 'starter', 100, 35000, 1000, 5],
  ['nanite_surge', 'Nanite Surge', 'future', 'field', 'mend', 'road', 150, 50000, 500, 8],
  ['emp_blackout', 'EMP Blackout', 'future', 'field', 'suppress', 'warPath', 125, 60000, 1500, 0],
  ['starfall', 'Starfall', 'cosmic', 'home', 'bombard', 'starter', 100, 40000, 1000, 4],
  ['singularity', 'Singularity', 'cosmic', 'home', 'pull', 'warPath', 75, 30000, 1000, 6],
  ['solar_flare', 'Solar Flare', 'cosmic', 'home', 'sweep', 'warPath', 100, 40000, 1000, 4],
  ['comet_run', 'Comet Run', 'cosmic', 'field', 'charge', 'starter', 100, 40000, 1000, 6],
  ['warp_strike', 'Warp Strike', 'cosmic', 'field', 'drop', 'road', 150, 60000, 1000, 0],
  ['ion_cannon', 'Ion Cannon', 'cosmic', 'field', 'strike', 'warPath', 75, 25000, 1500, 1],
];

/** A2.7 train times and pop per role group (derived by the compiler). */
const GROUP_TRAIN: Record<string, [number, number]> = {
  infantry: [1500, 2], ranged: [2000, 3], antiArmor: [2500, 4], support: [3000, 4], heavy: [4000, 6], epic: [4000, 8], legendary: [7000, 14],
};

function hitsOf(a: AttackDef | undefined): Hits {
  if (!a) return '-';
  return a.hitsGround && a.hitsAir ? 'GA' : a.hitsAir ? 'A' : 'G';
}

const en: { card: Record<string, { name: string }> } = strings;

describe('A5 unit tables', () => {
  for (const age of Object.keys(UNITS) as AgeId[]) {
    for (const row of UNITS[age]) {
      const [slug, name, rar, role, cost, hp, dmg, int10, range, speed, size, hits, tags] = row;
      it(`${age}: ${slug}`, () => {
        const u = content.units[slug];
        expect(u, slug).toBeDefined();
        if (!u) return;
        expect(u.age).toBe(age);
        expect(u.rarity).toBe(R[rar]);
        expect(u.role).toBe(role);
        expect(u.cost).toBe(cost);
        expect(u.hp).toBe(hp);
        expect(u.speed).toBe(speed);
        expect(u.size).toBe(S[size]);
        expect(hitsOf(u.attacks[0])).toBe(hits);
        // The table's Tags column; every non-air unit also carries `ground` (WP0 raw decision).
        const want = tags.split(' ') as Tag[];
        expect([...u.tags].sort()).toEqual([...want, ...(want.includes('air') ? [] : ['ground' as Tag])].sort());
        const [trainMs, pop] = GROUP_TRAIN[u.group] ?? [0, 0];
        expect(u.trainMs).toBe(trainMs);
        expect(u.pop).toBe(pop);
        expect(en.card[slug]?.name).toBe(name);
        if (hits === '-') {
          expect(u.attacks).toEqual([]);
          return;
        }
        const a = u.attacks[0] as AttackDef;
        expect(a.damage).toBe(dmg);
        expect(a.intervalMs).toBe(int10 * 100);
        expect(a.range).toBe(range);
      });
    }
  }

  it('lists all 56 collectable units (A17.13)', () => {
    const rows = Object.values(UNITS).flat().map((r) => r[0]);
    expect(rows).toHaveLength(56);
    expect([...content.order.units].sort()).toEqual([...rows].sort());
  });

  it('has the hidden tutorial Training Dummy (A5.6)', () => {
    const d = content.units.training_dummy;
    expect(d).toMatchObject({ cost: 50, hp: 40, speed: 50, size: 'small', hidden: true });
    expect(d?.attacks[0]).toMatchObject({ damage: 4, intervalMs: 1000, range: 16, hitsGround: true, hitsAir: false });
  });

  it('encodes the listed traits', () => {
    const ab = (id: string) => content.units[id]?.abilities ?? [];
    expect(content.units.pebbler?.attacks[0]?.chain).toEqual({ count: 2, hop: 40 });
    expect(ab('tuskback')).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 });
    expect(ab('drum_shaman')).toContainEqual({ kind: 'aura', radius: 160, status: { kind: 'attackSpeedBuff', magnitudeBp: 2000, durationMs: 0 } });
    expect(ab('sabertooth')).toContainEqual({ kind: 'pounce', searchRange: 150, cooldownMs: 10000, leapMs: 500, firstBiteBp: 20000 });
    expect(ab('mammoth_matriarch').find((a) => a.kind === 'riders')).toMatchObject({ count: 2, onDeathSpawn: 'pebbler', attack: { damage: 12, intervalMs: 1400, range: 200 } });
    expect(ab('footman')).toContainEqual({ kind: 'resist', minSourceRange: 100, bp: 2500 });
    expect(ab('pikeman')).toContainEqual({ kind: 'brace' });
    expect(ab('friar')).toContainEqual({ kind: 'heal', hpPerSec: 40, radius: 160, targets: 2, pulseMs: 500 });
    expect(content.units.battering_ram?.attacks[0]?.vsBaseDamage).toBe(160);
    expect(ab('ursa_paladin')).toContainEqual({ kind: 'periodicShieldAura', everyMs: 15000, radius: 200, maxTargets: 8, shield: 60, durationMs: 6000 });
    expect(content.units.ursa_paladin?.attacks[0]?.cleave).toEqual({ count: 2, reach: 40 });
    expect(ab('corsair')).toContainEqual({ kind: 'firstHitBonus', multBp: 10000, knockback: -20, idleResetMs: 2000 });
    expect(content.units.grenadier?.attacks[0]).toMatchObject({ splashRadius: 35, priority: 'armored' });
    expect(ab('field_surgeon')).toContainEqual({ kind: 'heal', hpPerSec: 55, radius: 160, targets: 2, pulseMs: 500 });
    expect(content.units.bronze_cannon?.attacks[0]).toMatchObject({ splashRadius: 50, minRange: 80 });
    expect(ab('balloon_admiral')).toContainEqual({ kind: 'onDeathExplode', damage: 250, radius: 70 });
    expect(content.units.rifleman?.attacks[0]?.onHit).toEqual([{ kind: 'slow', magnitudeBp: 1500, durationMs: 1000 }]);
    expect(ab('radio_operator')).toContainEqual({ kind: 'callStrike', everyMs: 8000, searchRange: 400, delayMs: 1000, damage: 120, radius: 50, sideLockoutMs: 3000 });
    expect(content.units.behemoth_tank?.attacks[1]).toMatchObject({ damage: 20, intervalMs: 400, range: 150, hitsGround: true, hitsAir: true, priority: 'air' });
    expect(ab('photon_knight')).toContainEqual({ kind: 'innateShield', amount: 90, regenPerSec: 30, delayMs: 3000 });
    expect(content.units.rail_gunner?.attacks[0]?.pierce).toEqual({ count: 2, length: 150 });
    expect(ab('repair_drone')).toContainEqual({ kind: 'heal', hpPerSec: 100, radius: 160, targets: 2, pulseMs: 500 });
    expect(ab('emp_saboteur')).toContainEqual({ kind: 'emp', everyMs: 8000, triggerRadius: 120, radius: 120, stunMs: 1500 });
    expect(ab('chrono_titan')).toContainEqual({ kind: 'timeStop', everyMs: 15000, radius: 200, freezeMs: 1500, legendaryFreezeMs: 750 });
    expect(content.units.chrono_titan?.attacks[0]?.cleave).toEqual({ count: 3, reach: 60 });
    // A17.9-A17.11
    expect(ab('hoplite')).toContainEqual({ kind: 'firstHitBonus', multBp: 10000, knockback: 15, idleResetMs: 2000 });
    expect(content.units.javelineer?.attacks[0]?.pierce).toEqual({ count: 2, length: 50 });
    expect(ab('war_chariot')).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 });
    expect(content.units.phalangite?.attacks[0]).toMatchObject({ priority: 'armored', mods: [{ vs: 'legendary', bp: 20000 }, { vs: 'armored', bp: 30000 }, { vs: 'mech', bp: 30000 }, { vs: 'light', bp: 7500 }] });
    expect(ab('standard_bearer')).toContainEqual({ kind: 'aura', radius: 160, status: { kind: 'damageBuff', magnitudeBp: 1500, durationMs: 0 } });
    expect(content.units.scorpion?.attacks[0]).toMatchObject({ minRange: 60, pierce: { count: 3, length: 150 } });
    expect(content.units.bronze_colossus?.attacks[0]).toMatchObject({ splashRadius: 45, onHit: [{ kind: 'slow', magnitudeBp: 2000, durationMs: 1500 }] });
    expect(ab('bronze_colossus')).toContainEqual({ kind: 'onDeathExplode', damage: 160, radius: 70 });
    expect(ab('riveter')).toContainEqual({ kind: 'firstHitBonus', multBp: 15000, knockback: 0, idleResetMs: 2000 });
    expect(ab('steam_golem')).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 });
    expect(ab('harpoon_gunner')).toContainEqual({ kind: 'firstHitBonus', multBp: 10000, knockback: -25, idleResetMs: 2000 });
    expect(content.units.flare_spotter?.attacks[0]).toMatchObject({ priority: 'armored', onHit: [{ kind: 'mark', magnitudeBp: 2000, durationMs: 3000 }] });
    expect(content.units.sapper?.attacks[0]?.vsBaseDamage).toBe(240);
    expect(ab('sapper')).toEqual([{ kind: 'siegeOnly' }, { kind: 'onDeathExplode', damage: 180, radius: 60 }]);
    expect(ab('land_dreadnought').find((a) => a.kind === 'riders')).toMatchObject({ count: 2, onDeathSpawn: 'carbineer', attack: { damage: 10, intervalMs: 500, range: 160 } });
    expect(ab('star_legionnaire')).toContainEqual({ kind: 'resist', minSourceRange: 100, bp: 2000 });
    expect(content.units.ion_ranger?.attacks[0]?.chain).toEqual({ count: 2, hop: 50 });
    expect(ab('graviton_halberdier')).toContainEqual({ kind: 'brace' });
    // Anti-heavy (owner feedback 2026-09-29): Brace for the whole class, so a Heavy's charge never applies.
    for (const id of ['spear_hunter', 'phalangite', 'pikeman', 'grenadier', 'harpoon_gunner', 'bazooka_trooper', 'rail_gunner', 'graviton_halberdier']) expect(ab(id), id).toContainEqual({ kind: 'brace' });
    expect(ab('starwarden')).toContainEqual({ kind: 'periodicShieldAura', everyMs: 8000, radius: 180, maxTargets: 4, shield: 200, durationMs: 5000 });
    expect(ab('warp_stalker')).toContainEqual({ kind: 'pounce', searchRange: 200, cooldownMs: 10000, leapMs: 400, firstBiteBp: 20000 });
    expect(ab('mothership')).toEqual([
      { kind: 'callStrike', everyMs: 6000, searchRange: 400, delayMs: 1000, damage: 300, radius: 50, sideLockoutMs: 3000 },
      { kind: 'onDeathExplode', damage: 350, radius: 80 },
    ]);
  });
});

describe('A5 turret tables', () => {
  for (const age of Object.keys(TURRETS) as AgeId[]) {
    for (const [slug, name, rar, cost, dmg, int10, range, hits] of TURRETS[age]) {
      it(`${age}: ${slug}`, () => {
        const t = content.turrets[slug];
        expect(t, slug).toBeDefined();
        expect(t?.age).toBe(age);
        expect(t?.rarity).toBe(R[rar]);
        expect(t?.cost).toBe(cost);
        expect(t?.attack.damage).toBe(dmg);
        expect(t?.attack.intervalMs).toBe(int10 * 100);
        expect(t?.attack.range).toBe(range);
        expect(hitsOf(t?.attack)).toBe(hits);
        expect(en.card[slug]?.name).toBe(name);
      });
    }
  }

  it('lists all 32 turrets and the listed notes', () => {
    expect(Object.values(TURRETS).flat()).toHaveLength(32);
    expect(Object.keys(content.turrets)).toHaveLength(32);
    // A17.9-A17.11
    expect(content.turrets.gorgon_bust?.attack).toMatchObject({ priority: 'armored', onHit: [{ kind: 'stun', magnitudeBp: 10000, durationMs: 1500 }] });
    expect(content.turrets.onager?.attack).toMatchObject({ splashRadius: 50, minRange: 150 });
    expect(content.turrets.mortar_pit?.attack).toMatchObject({ splashRadius: 40, minRange: 60 });
    expect(content.turrets.boiler_mortar?.attack).toMatchObject({ splashRadius: 55, minRange: 170 });
    expect(content.turrets.tesla_tower?.attack).toMatchObject({ chain: { count: 4, hop: 90 }, onHit: [{ kind: 'stun', magnitudeBp: 10000, durationMs: 500 }] });
    expect(content.turrets.starburst_gun?.attack).toMatchObject({ followBehind: 90, maxTargets: 4 });
    expect(content.turrets.starfall_battery?.attack).toMatchObject({ splashRadius: 60, minRange: 180 });
    expect(content.turrets.tachyon_lance?.attack.pierce).toEqual({ count: 4, length: 250 });
    expect(content.turrets.log_roller?.attack).toMatchObject({ line: { fromGate: 300 }, maxTargets: 6 });
    expect(content.turrets.pitch_cauldron?.attack.gateZone).toEqual({ radius: 130 });
    expect(content.turrets.trebuchet?.attack).toMatchObject({ splashRadius: 50, minRange: 150 });
    expect(content.turrets.honk_ballista?.attack).toMatchObject({ chain: { count: 3, hop: 80 }, onHit: [{ kind: 'slow', magnitudeBp: 3000, durationMs: 2000 }] });
    expect(content.turrets.grapeshot_gun?.attack).toMatchObject({ followBehind: 90, maxTargets: 4 });
    expect(content.turrets.congreve_rack?.attack).toMatchObject({ volley: 4, splashRadius: 30, scatter: 40, mods: [{ vs: 'air', bp: 15000 }] });
    expect(content.turrets.chainshot_cannon?.attack.pierce).toEqual({ count: 4, length: 200 });
    expect(content.turrets.flak_gun?.attack).toMatchObject({ splashRadius: 40, mods: [{ vs: 'air', bp: 20000 }], priority: 'air' });
    expect(content.turrets.searchlight_sniper?.attack.onHit).toEqual([{ kind: 'mark', magnitudeBp: 2000, durationMs: 4000 }]);
    expect(content.turrets.arc_coil?.attack.chain).toEqual({ count: 3, hop: 100 });
    expect(content.turrets.gravity_well?.attack).toMatchObject({ priority: 'densest', splashRadius: 90, maxTargets: 4, pull: { radius: 90, fractionBp: 6000 } });
  });
});

/**
 * A14.2 per-card attack mapping: [card, projectile visual / instant effect / 'melee', attack SFX, damage type].
 * Secondary attacks follow the primary in the order `attacks[1..]`, then riders. The Repair Drone has no attack.
 */
type FxRow = [string, string, string, AttackDef['dmgType']];

const A14_2: Record<string, FxRow[]> = {
  bonker: [['bonker', 'melee', 'swing_whoosh', 'blunt']],
  pebbler: [['pebbler', 'proj.rock', 'shot_sling', 'blunt']],
  tuskback: [['tuskback', 'melee', 'swing_whoosh', 'blunt']],
  spear_hunter: [['spear_hunter', 'melee', 'swing_whoosh', 'pierce']],
  drum_shaman: [['drum_shaman', 'proj.rock', 'shot_sling', 'blunt']],
  sabertooth: [['sabertooth', 'melee', 'swing_whoosh', 'slash']],
  mammoth_matriarch: [['mammoth_matriarch', 'melee', 'swing_whoosh', 'blast'], ['riders', 'proj.rock', 'shot_sling', 'blunt']],
  footman: [['footman', 'melee', 'swing_whoosh', 'slash']],
  longbowman: [['longbowman', 'proj.arrow', 'shot_bow', 'pierce']],
  destrier_knight: [['destrier_knight', 'melee', 'swing_whoosh', 'pierce']],
  pikeman: [['pikeman', 'melee', 'swing_whoosh', 'pierce']],
  friar: [['friar', 'proj.rock', 'shot_sling', 'blunt']],
  battering_ram: [['battering_ram', 'melee', 'swing_whoosh', 'blast']],
  ursa_paladin: [['ursa_paladin', 'melee', 'swing_whoosh', 'slash']],
  corsair: [['corsair', 'melee', 'swing_whoosh', 'slash']],
  fusilier: [['fusilier', 'proj.musket', 'shot_musket', 'bullet']],
  cuirassier: [['cuirassier', 'melee', 'swing_whoosh', 'slash']],
  grenadier: [['grenadier', 'proj.lob', 'shot_lob', 'blast']],
  field_surgeon: [['field_surgeon', 'proj.musket', 'shot_musket', 'bullet']],
  bronze_cannon: [['bronze_cannon', 'proj.cannonball', 'shot_cannon', 'blast']],
  balloon_admiral: [['balloon_admiral', 'proj.bomb', 'bomb_whistle', 'blast']],
  trench_raider: [['trench_raider', 'melee', 'swing_whoosh', 'slash']],
  rifleman: [['rifleman', 'proj.bullet', 'shot_rifle', 'bullet']],
  tankette: [['tankette', 'proj.shell', 'shot_cannon', 'blast']],
  bazooka_trooper: [['bazooka_trooper', 'proj.rocket', 'shot_rocket', 'blast']],
  radio_operator: [['radio_operator', 'proj.bullet', 'shot_rifle', 'bullet']],
  gyrocopter: [['gyrocopter', 'proj.bullet', 'shot_mg', 'bullet']],
  behemoth_tank: [['main gun', 'proj.shell', 'shot_cannon', 'blast'], ['MG', 'proj.bullet', 'shot_mg', 'bullet']],
  photon_knight: [['photon_knight', 'melee', 'swing_whoosh', 'laser']],
  pulse_trooper: [['pulse_trooper', 'proj.plasma', 'shot_plasma', 'laser']],
  walker_mech: [['walker_mech', 'melee', 'swing_whoosh', 'blunt']],
  rail_gunner: [['rail_gunner', 'fx.beam_rail', 'shot_rail', 'laser']],
  repair_drone: [],
  emp_saboteur: [['emp_saboteur', 'melee', 'swing_whoosh', 'laser']],
  chrono_titan: [['chrono_titan', 'melee', 'swing_whoosh', 'blunt']],
  training_dummy: [['training_dummy', 'melee', 'swing_whoosh', 'blunt']],
  rock_tosser: [['rock_tosser', 'proj.boulder', 'shot_catapult', 'blunt']],
  angry_beehive: [['angry_beehive', 'proj.bee', 'bee_buzz', 'pierce']],
  log_roller: [['log_roller', 'proj.log', 'log_roll', 'blunt']],
  grumpy_toad: [['grumpy_toad', 'fx.tongue', 'toad_tongue', 'blunt']],
  crossbow_nest: [['crossbow_nest', 'proj.bolt', 'shot_crossbow', 'pierce']],
  pitch_cauldron: [['pitch_cauldron', 'fx.pitch_pour', 'cauldron_pour', 'blast']],
  trebuchet: [['trebuchet', 'proj.boulder', 'shot_catapult', 'blast']],
  honk_ballista: [['honk_ballista', 'proj.goose', 'goose_honk', 'blunt']],
  swivel_gun: [['swivel_gun', 'proj.musket', 'shot_musket', 'bullet']],
  grapeshot_gun: [['grapeshot_gun', 'proj.grapeshot', 'shot_grapeshot', 'bullet']],
  congreve_rack: [['congreve_rack', 'proj.rocket', 'shot_rocket', 'blast']],
  chainshot_cannon: [['chainshot_cannon', 'proj.chainshot', 'shot_cannon', 'blunt']],
  mg_nest: [['mg_nest', 'proj.bullet', 'shot_mg', 'bullet']],
  flak_gun: [['flak_gun', 'proj.flak', 'shot_flak', 'blast']],
  howitzer: [['howitzer', 'proj.shell', 'shot_cannon', 'blast']],
  searchlight_sniper: [['searchlight_sniper', 'proj.bullet', 'shot_rifle', 'bullet']],
  pulse_laser: [['pulse_laser', 'fx.beam_laser', 'shot_laser', 'laser']],
  arc_coil: [['arc_coil', 'fx.arc_chain', 'shot_arc', 'laser']],
  plasma_mortar: [['plasma_mortar', 'proj.plasma_mortar', 'shot_plasma', 'blast']],
  gravity_well: [['gravity_well', 'proj.gravity_orb', 'gravity_hum', 'blast']],
  // A17.12 attack mapping
  hoplite: [['hoplite', 'melee', 'swing_whoosh', 'pierce']],
  javelineer: [['javelineer', 'proj.javelin', 'shot_javelin', 'pierce']],
  war_chariot: [['war_chariot', 'melee', 'swing_whoosh', 'slash']],
  phalangite: [['phalangite', 'melee', 'swing_whoosh', 'pierce']],
  standard_bearer: [['standard_bearer', 'proj.javelin', 'shot_javelin', 'pierce']],
  scorpion: [['scorpion', 'proj.scorpion_bolt', 'shot_scorpion', 'pierce']],
  bronze_colossus: [['bronze_colossus', 'melee', 'stomp_colossus', 'blast']],
  riveter: [['riveter', 'melee', 'swing_whoosh', 'blunt']],
  carbineer: [['carbineer', 'proj.bullet', 'shot_carbine', 'bullet']],
  steam_golem: [['steam_golem', 'melee', 'swing_whoosh', 'blunt']],
  harpoon_gunner: [['harpoon_gunner', 'proj.harpoon', 'shot_harpoon', 'pierce']],
  flare_spotter: [['flare_spotter', 'proj.flare', 'flare_pop', 'blast']],
  sapper: [['sapper', 'melee', 'fuse_hiss', 'blast']],
  land_dreadnought: [['land_dreadnought', 'proj.shell', 'shot_cannon', 'blast'], ['riders', 'proj.bullet', 'shot_gatling', 'bullet']],
  star_legionnaire: [['star_legionnaire', 'melee', 'swing_whoosh', 'laser']],
  ion_ranger: [['ion_ranger', 'proj.ion', 'shot_ion', 'laser']],
  hover_tank: [['hover_tank', 'proj.plasma', 'shot_plasma', 'blast']],
  graviton_halberdier: [['graviton_halberdier', 'melee', 'swing_whoosh', 'laser']],
  starwarden: [['starwarden', 'proj.ion', 'shot_ion', 'laser']],
  warp_stalker: [['warp_stalker', 'melee', 'swing_whoosh', 'slash']],
  mothership: [['mothership', 'fx.beam_void', 'shot_void', 'laser']],
  archer_tower: [['archer_tower', 'proj.arrow', 'shot_bow', 'pierce']],
  sun_mirror: [['sun_mirror', 'fx.sun_beam', 'mirror_beam', 'laser']],
  onager: [['onager', 'proj.boulder', 'shot_catapult', 'blast']],
  gorgon_bust: [['gorgon_bust', 'fx.gorgon_gaze', 'gorgon_gaze', 'laser']],
  gatling_gun: [['gatling_gun', 'proj.bullet', 'shot_gatling', 'bullet']],
  mortar_pit: [['mortar_pit', 'proj.lob', 'shot_lob', 'blast']],
  boiler_mortar: [['boiler_mortar', 'proj.shell', 'shot_cannon', 'blast']],
  tesla_tower: [['tesla_tower', 'fx.tesla_arc', 'tesla_zap', 'laser']],
  ion_turret: [['ion_turret', 'fx.beam_ion', 'shot_ion', 'laser']],
  starburst_gun: [['starburst_gun', 'proj.starburst', 'shot_starburst', 'laser']],
  starfall_battery: [['starfall_battery', 'proj.star_shard', 'shot_plasma', 'blast']],
  tachyon_lance: [['tachyon_lance', 'fx.beam_tachyon', 'shot_tachyon', 'laser']],
};

/** Every attack of a card, primary first, then secondary attacks, then riders. */
function attacksOf(id: string): AttackDef[] {
  const u = content.units[id];
  if (u) {
    const riders = u.abilities.flatMap((a) => (a.kind === 'riders' ? [a.attack] : []));
    return [...u.attacks, ...riders];
  }
  const t = content.turrets[id];
  return t ? [t.attack] : [];
}

function fxOf(a: AttackDef): string {
  if (!a.projectile) return 'melee';
  return 'instant' in a.projectile ? a.projectile.effectId : a.projectile.visualId;
}

/** A2.6 role-default mods, in order (bp). */
const MODS = {
  blunt: [{ vs: 'armored', bp: 7000 }],
  // Anti-heavy (owner feedback 2026-09-29): a first `legendary` entry keeps Legendary matchups as before.
  meleeAA: [{ vs: 'legendary', bp: 20000 }, { vs: 'armored', bp: 30000 }, { vs: 'mech', bp: 30000 }, { vs: 'light', bp: 7500 }],
  rangedAA: [{ vs: 'legendary', bp: 20000 }, { vs: 'armored', bp: 30000 }, { vs: 'mech', bp: 30000 }, { vs: 'light', bp: 5000 }],
  harpoon: [{ vs: 'legendary', bp: 20000 }, { vs: 'armored', bp: 30000 }, { vs: 'mech', bp: 30000 }, { vs: 'light', bp: 5000 }],
  rail: [{ vs: 'armored', bp: 20000 }, { vs: 'mech', bp: 20000 }, { vs: 'light', bp: 5000 }],
  grenadier: [{ vs: 'legendary', bp: 15000 }, { vs: 'armored', bp: 25000 }, { vs: 'mech', bp: 25000 }, { vs: 'light', bp: 5000 }],
  flak: [{ vs: 'air', bp: 20000 }],
  congreve: [{ vs: 'air', bp: 15000 }],
} as const;

/** A2.6: which cards carry which mods on their first attack. Everything else has none. */
const MODS_BY_CARD: Record<string, readonly { vs: string; bp: number }[]> = {
  // Infantry melee ("blunt"), including the tutorial dummy (an Infantry melee unit, A5.6)
  bonker: MODS.blunt, footman: MODS.blunt, corsair: MODS.blunt, trench_raider: MODS.blunt, photon_knight: MODS.blunt,
  training_dummy: MODS.blunt,
  hoplite: MODS.blunt, riveter: MODS.blunt, star_legionnaire: MODS.blunt,
  spear_hunter: MODS.meleeAA, pikeman: MODS.meleeAA, phalangite: MODS.meleeAA, graviton_halberdier: MODS.meleeAA,
  bazooka_trooper: MODS.rangedAA, rail_gunner: MODS.rail, harpoon_gunner: MODS.harpoon,
  grenadier: MODS.grenadier,
  flak_gun: MODS.flak,
  congreve_rack: MODS.congreve,
};

/** A5 target priorities of first attacks ("priority armored", "priority air", ...); everything else `front`. */
const PRIORITY_BY_CARD: Record<string, string> = {
  spear_hunter: 'armored', pikeman: 'armored', grenadier: 'armored', bazooka_trooper: 'armored', rail_gunner: 'armored',
  searchlight_sniper: 'armored', flak_gun: 'air', gravity_well: 'densest',
  phalangite: 'armored', harpoon_gunner: 'armored', flare_spotter: 'armored', graviton_halberdier: 'armored', gorgon_bust: 'armored',
  // Grumpy Toad grabs "the nearest enemy ranged or support ground unit" first
  grumpy_toad: 'backline',
};

describe('A14.2 attack mapping, A2.6 mods and A5 priorities (every card)', () => {
  const cards = [...content.order.units, ...content.order.hiddenUnits, ...content.order.turrets];

  it('lists every unit and turret exactly once', () => {
    expect(Object.keys(A14_2).sort()).toEqual([...cards].sort());
  });

  for (const id of cards) {
    it(`${id}: projectile or effect, sound, damage type, mods and priority`, () => {
      const attacks = attacksOf(id);
      const rows = A14_2[id] ?? [];
      expect(attacks.map((a) => [fxOf(a), a.sfx, a.dmgType])).toEqual(rows.map(([, fx, sfx, dmg]) => [fx, sfx, dmg]));
      for (const a of attacks) {
        const fx = fxOf(a);
        // A5.1: lasers and rails are instant; `fx.*` ids are instant effects, `proj.*` ids fly.
        if (fx.startsWith('fx.')) expect(a.projectile, id).toMatchObject({ instant: true });
        if (fx.startsWith('proj.')) expect(a.projectile && 'speed' in a.projectile ? a.projectile.speed : 0, id).toBeGreaterThan(0);
      }
      const [first, ...rest] = attacks;
      if (!first) return;
      // A16.14.2: the compiler puts the ×2 structure mod (vs forts) at the front of every attack of a
      // Heavy, Legendary, siege or artillery card; the A2.6 mods follow it unchanged.
      const structure = content.units[id] !== undefined && carriesStructureMod(content.units[id]);
      const own = (a: AttackDef): DamageMod[] => (a.mods ?? []).filter((m) => m.vs !== 'structure');
      for (const a of attacks) {
        const lead = (a.mods ?? [])[0];
        if (structure) expect(lead, id).toEqual({ vs: 'structure', bp: content.economy.fort?.structureBp });
        else expect((a.mods ?? []).some((m) => m.vs === 'structure'), id).toBe(false);
      }
      expect(own(first), id).toEqual(MODS_BY_CARD[id] ?? []);
      expect(first.priority ?? 'front', id).toBe(PRIORITY_BY_CARD[id] ?? 'front');
      // Secondary attacks (the Behemoth MG, the Matriarch's riders) carry no mods of their own.
      for (const a of rest) expect(own(a), id).toEqual([]);
    });
  }

  it('encodes the remaining A5 notes: arcs, splash, minimum ranges, charges, base damage', () => {
    const arc = (id: string, i = 0) => {
      const p = attacksOf(id)[i]?.projectile;
      return p !== undefined && 'speed' in p && p.arc === true;
    };
    // "Arc" in A5, and the Grenadier's lob over allies
    for (const id of ['rock_tosser', 'trebuchet', 'bronze_cannon', 'howitzer', 'plasma_mortar', 'grenadier']) expect(arc(id), id).toBe(true);
    for (const id of ['pebbler', 'longbowman', 'fusilier', 'rifleman', 'tankette', 'mg_nest', 'crossbow_nest']) expect(arc(id), id).toBe(false);
    expect(content.units.mammoth_matriarch?.attacks[0]?.splashRadius).toBe(40);
    expect(content.units.behemoth_tank?.attacks[0]).toMatchObject({ splashRadius: 40, range: 240, hitsGround: true, hitsAir: false });
    expect(content.units.balloon_admiral?.attacks[0]).toMatchObject({ splashRadius: 50, vsBaseDamage: 110 });
    expect(content.units.balloon_admiral?.abilities).toContainEqual({ kind: 'bomber', dropWindow: 40 });
    expect(content.units.battering_ram?.abilities).toContainEqual({ kind: 'siegeOnly' });
    expect(content.turrets.howitzer?.attack).toMatchObject({ splashRadius: 60, minRange: 180 });
    expect(content.turrets.plasma_mortar?.attack).toMatchObject({ splashRadius: 60, minRange: 180 });
    expect(content.turrets.grumpy_toad?.attack.drag).toEqual({ distance: 120 });
    expect(content.turrets.gravity_well?.attack.onHit).toEqual([{ kind: 'slow', magnitudeBp: 5000, durationMs: 2500 }]);
    // Heavy commons' first-hit charges (Gore, Lance charge, Charge): ×2 and 30 lu knockback
    for (const id of ['tuskback', 'destrier_knight', 'cuirassier']) {
      expect(content.units[id]?.abilities, id).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 });
    }
    // followSupport on every Support Rare (A5)
    for (const id of ['drum_shaman', 'friar', 'field_surgeon', 'radio_operator', 'repair_drone']) {
      expect(content.units[id]?.abilities, id).toContainEqual({ kind: 'followSupport', behindFront: 60, soloMaxP: 200 });
    }
  });
});

describe('A2.7 / A2.8 price rules', () => {
  it('pop follows cost in 25-gold steps (A2.7)', () => {
    for (const id of [...content.order.units, ...content.order.hiddenUnits]) {
      const u = content.units[id];
      expect(u?.pop, id).toBe(Math.floor((u?.cost ?? 0) / 25));
    }
  });

  it('turrets cost 150 / 175 for the two Commons, 250 for the Rare and the Epic (A2.8)', () => {
    for (const age of content.order.ages) {
      const ts = content.order.turrets.map((id) => content.turrets[id]).filter((t) => t?.age === age);
      expect(ts.map((t) => [t?.rarity, t?.cost]), age).toEqual([['common', 150], ['common', 175], ['rare', 250], ['epic', 250]]);
    }
  });
});

describe('A5.7 Age Powers', () => {
  for (const [slug, name, age, slot, family, source, cost, reloadMs, telegraphMs, cap] of POWERS) {
    it(`${age}: ${slug}`, () => {
      const p = content.powers[slug];
      expect(p, slug).toBeDefined();
      expect(p).toMatchObject({ age, slot, family, source, cost, reloadMs, telegraphMs });
      expect(p?.maxTargets ?? 0).toBe(cap);
      expect(en.card[slug]?.name).toBe(name);
    });
  }

  it('has the 48 powers of the roster and nothing else', () => {
    expect(Object.keys(content.powers).sort()).toEqual(POWERS.map((r) => r[0]).sort());
  });

  it('encodes the buffs (8 frontmost own units)', () => {
    expect(content.powers.royal_decree?.effect).toEqual({
      kind: 'buffAll',
      maxTargets: 8,
      statuses: [
        { kind: 'damageBuff', magnitudeBp: 3000, durationMs: 8000 },
        { kind: 'speedBuff', magnitudeBp: 2000, durationMs: 8000 },
      ],
    });
    expect(content.powers.nanite_surge?.effect).toEqual({
      kind: 'buffAll',
      maxTargets: 8,
      statuses: [
        { kind: 'regen', magnitudeBp: 4000, durationMs: 4000 },
        { kind: 'shield', magnitudeBp: 0, durationMs: 6000, amount: 150 },
      ],
    });
    expect(content.powers.aegis?.effect).toEqual({
      kind: 'buffAll',
      maxTargets: 8,
      statuses: [
        { kind: 'shield', magnitudeBp: 0, durationMs: 6000, amount: 80 },
        { kind: 'damageBuff', magnitudeBp: 1500, durationMs: 6000 },
      ],
    });
  });

  /** The age's L1 Infantry Common, Heavy Common and non-Legendary Epic (A2.9.6 "I" and "H"). */
  const ageUnits = (age: AgeId) => {
    const us = Object.values(content.units).filter((u) => u.age === age && !u.hidden);
    const find = (group: string, rarity: string): UnitDef => {
      const u = us.find((x) => x.group === group && x.rarity === rarity);
      if (!u) throw new Error(`${age} ${group}`);
      return u;
    };
    return { i: find('infantry', 'common'), h: find('heavy', 'common'), epic: find('epic', 'epic') };
  };
  /** HP with the innate shield (the Photon Knight's counts as HP). */
  const ehp = (u: UnitDef): number => {
    const shield = u.abilities.find((a) => a.kind === 'innateShield');
    return u.hp + (shield?.kind === 'innateShield' ? shield.amount : 0);
  };

  /**
   * The static per-power checks of A2.9.6 and A2.9.12: coverage per unit (count × 2 × radius / zone
   * for barrages, the damage for sweeps, the per-enemy hit cap for charges) against L1 Infantry and
   * Heavy, in whole percent, within the family target.
   */
  it('per-unit damage is within each family target (A2.9.6)', () => {
    for (const pw of Object.values(content.powers)) {
      const e = pw.effect;
      let perUnit: number;
      if (e.kind === 'barrage') perUnit = (e.damage * e.count * 2 * e.radius) / e.zone;
      else if (e.kind === 'stampede') perUnit = e.damage * e.maxHitsPerEnemy;
      else if (e.kind === 'sweep') perUnit = e.damage;
      else continue;
      if (pw.family === 'flak') continue;
      const { i, h } = ageUnits(pw.age);
      const li = Math.round((perUnit * 100) / ehp(i));
      const hi = Math.round((perUnit * 100) / ehp(h));
      if (pw.family === 'bombard' || pw.family === 'sweep') {
        expect(li, `${pw.id} vs ${i.id}`).toBeGreaterThanOrEqual(80);
        expect(li, `${pw.id} vs ${i.id}`).toBeLessThanOrEqual(100);
        expect(hi, `${pw.id} vs ${h.id}`).toBeGreaterThanOrEqual(20);
        expect(hi, `${pw.id} vs ${h.id}`).toBeLessThanOrEqual(30);
      } else {
        expect(li, `${pw.id} vs ${i.id}`).toBeGreaterThanOrEqual(60);
        expect(li, `${pw.id} vs ${i.id}`).toBeLessThanOrEqual(95);
        expect(hi, `${pw.id} vs ${h.id}`).toBeGreaterThanOrEqual(15);
        expect(hi, `${pw.id} vs ${h.id}`).toBeLessThanOrEqual(27);
      }
    }
  });

  it('strikes deal 55-65% of the Heavy and never kill a full-HP same-age Heavy or Epic (Epics take 50%)', () => {
    const epicBp = content.economy.power.strikeEpicBp;
    for (const pw of Object.values(content.powers)) {
      const e = pw.effect;
      if (e.kind !== 'strike') continue;
      const { h, epic } = ageUnits(pw.age);
      const total = e.damage * e.shots;
      const pct = Math.round((total * 100) / ehp(h));
      expect(pct, pw.id).toBeGreaterThanOrEqual(55);
      expect(pct, pw.id).toBeLessThanOrEqual(65);
      expect(total, `${pw.id} vs ${h.id}`).toBeLessThan(ehp(h));
      expect(Math.trunc((total * epicBp) / 10000), `${pw.id} vs ${epic.id}`).toBeLessThan(ehp(epic));
    }
  });

  it('controls give at least 12 disabled unit-seconds per 100 gold at the cap; their damage stays small', () => {
    for (const pw of Object.values(content.powers)) {
      const e = pw.effect;
      if (e.kind !== 'field') continue;
      const pulses = Math.max(1, Math.trunc(e.durationMs / 500));
      const cap = pw.maxTargets ?? 0;
      let ds = 0;
      for (const st of e.statuses ?? []) {
        if (st.kind === 'stun') ds += (cap * st.durationMs) / 1000;
        if (st.kind === 'snare') ds += (cap * (st.magnitudeBp / 10000) * pulses * 500) / 1000;
      }
      expect((ds * 100) / pw.cost, pw.id).toBeGreaterThanOrEqual(12);
      const { i } = ageUnits(pw.age);
      const dmg = (e.damagePerPulse ?? 0) * pulses;
      expect((dmg * 100) / ehp(i), pw.id).toBeLessThanOrEqual(45);
      if (pw.family === 'snare' || pw.family === 'pull') {
        expect(Math.round((dmg * 100) / i.hp), pw.id).toBeGreaterThanOrEqual(30);
        expect(Math.round((dmg * 100) / i.hp), pw.id).toBeLessThanOrEqual(40);
      }
    }
  });

  it('Flak never takes out its age’s air Epic in one cast; buffs give at most 70% of the Infantry in shields and heals', () => {
    for (const pw of Object.values(content.powers)) {
      const e = pw.effect;
      if (pw.family === 'flak' && e.kind === 'barrage') {
        expect(e.damage * e.count, pw.id).toBeLessThanOrEqual(ehp(ageUnits(pw.age).epic));
      }
      if (e.kind === 'buffAll') {
        const { i } = ageUnits(pw.age);
        let total = 0;
        for (const st of e.statuses) {
          if (st.kind === 'shield') total += st.amount ?? 0;
          if (st.kind === 'regen') total += (i.hp * st.magnitudeBp) / 10000;
        }
        expect((total * 100) / ehp(i), pw.id).toBeLessThanOrEqual(70);
        for (const st of e.statuses) {
          if (st.kind === 'speedBuff') expect(st.magnitudeBp, pw.id).toBeLessThanOrEqual(content.economy.statCaps.speedBp);
          if (st.kind === 'attackSpeedBuff') expect(st.magnitudeBp, pw.id).toBeLessThanOrEqual(content.economy.statCaps.attackSpeedBp);
          if (st.kind === 'damageBuff') expect(st.magnitudeBp, pw.id).toBeLessThanOrEqual(content.economy.statCaps.damageBp);
        }
      }
    }
  });
});
