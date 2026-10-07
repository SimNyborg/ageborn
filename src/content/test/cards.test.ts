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
import { contentAllReleased as full } from '../../../tests/fixtures/allReleased';

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
    // X0 Stone wave (CONTENT_PLAN 5.1; DESIGN A5.2 wave table)
    ['hunting_wolves', 'Hunting Wolves', 'C', 'infantry', 50, 100, 12, 10, 16, 80, 'S', 'G', 'light bio melee'],
    ['hide_shield', 'Hide Shield', 'C', 'infantry', 50, 216, 13, 10, 16, 65, 'S', 'G', 'light bio melee'],
    ['torch_runner', 'Torch Runner', 'C', 'infantry', 50, 166, 20, 10, 16, 100, 'S', 'G', 'light bio melee'],
    ['bolas_thrower', 'Bolas Thrower', 'C', 'ranged', 75, 100, 10, 14, 165, 65, 'S', 'G', 'light bio ranged'],
    ['woolly_rhino', 'Woolly Rhino', 'C', 'heavy', 150, 580, 33, 15, 20, 50, 'L', 'G', 'armored bio melee'],
    ['atlatl_thrower', 'Atlatl Thrower', 'R', 'ranged', 75, 92, 39, 26, 400, 60, 'S', 'G', 'light bio ranged'],
    ['boulder_hurler', 'Boulder Hurler', 'R', 'antiArmor', 100, 175, 40, 14, 130, 65, 'M', 'G', 'light bio ranged'],
    ['herbalist', 'Herbalist', 'R', 'support', 110, 130, 8, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['pelt_rager', 'Pelt Rager', 'R', 'infantry', 50, 176, 17, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['beast_caller', 'Beast Caller', 'E', 'support', 200, 260, 12, 12, 30, 65, 'S', 'G', 'light bio support melee'],
    ['cave_bear', 'Cave Bear', 'E', 'heavy', 200, 800, 50, 14, 16, 55, 'L', 'G', 'armored bio melee'],
    ['rockfall_shaman', 'Rockfall Shaman', 'E', 'support', 200, 240, 12, 14, 170, 60, 'S', 'GA', 'light bio support ranged'],
    ['elk_chieftain', 'Elk Chieftain', 'L', 'heavy', 350, 900, 40, 18, 20, 50, 'L', 'G', 'armored bio melee legendary'],
  ],
  // A17.9 Bronze Age (P 1.16)
  bronze: [
    ['hoplite', 'Hoplite', 'C', 'infantry', 50, 186, 23, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['javelineer', 'Javelineer', 'C', 'ranged', 75, 110, 20, 14, 210, 65, 'S', 'GA', 'light bio ranged'],
    ['war_chariot', 'War Chariot', 'C', 'heavy', 150, 630, 48, 15, 16, 65, 'L', 'G', 'armored bio melee'],
    ['phalangite', 'Phalangite', 'R', 'antiArmor', 100, 255, 30, 12, 65, 70, 'M', 'G', 'light bio melee'],
    ['standard_bearer', 'Standard Bearer', 'R', 'support', 110, 151, 9, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['scorpion', 'Scorpion', 'E', 'artillery', 200, 330, 64, 30, 290, 45, 'L', 'G', 'light mech ranged'],
    ['bronze_colossus', 'Bronze Colossus', 'L', 'siegeHeavy', 350, 1700, 64, 20, 20, 40, 'H', 'G', 'armored mech melee legendary'],
    // W2 Bronze wave (CONTENT_PLAN 5.2; DESIGN A17.9 wave table)
['shield_bearer', 'Shield Bearer', 'C', 'infantry', 50, 240, 16, 10, 16, 65, 'S', 'G', 'light bio melee'],
    ['thracian_raider', 'Thracian Raider', 'C', 'infantry', 50, 190, 22, 10, 16, 90, 'S', 'G', 'light bio melee'],
    ['rhodian_slingers', 'Rhodian Slingers', 'C', 'ranged', 75, 36, 6, 16, 180, 65, 'S', 'GA', 'light bio ranged'],
    ['discus_thrower', 'Discus Thrower', 'C', 'ranged', 75, 90, 12, 16, 200, 65, 'S', 'GA', 'light bio ranged'],
    ['war_elephant', 'War Elephant', 'C', 'heavy', 150, 690, 38, 18, 20, 60, 'L', 'G', 'armored bio melee'],
    ['cretan_archer', 'Cretan Archer', 'R', 'ranged', 75, 99, 38, 25, 410, 60, 'S', 'G', 'light bio ranged'],
    ['belly_bowman', 'Belly Bowman', 'R', 'antiArmor', 100, 220, 40, 12, 200, 65, 'M', 'G', 'light bio ranged'],
    ['aulos_piper', 'Aulos Piper', 'R', 'support', 110, 151, 9, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['tragic_chorus', 'Tragic Chorus', 'R', 'support', 110, 166, 9, 12, 150, 60, 'S', 'GA', 'light bio support ranged'],
    ['wooden_horse', 'Wooden Horse', 'E', 'siege', 200, 800, 12, 20, 12, 45, 'L', 'G', 'armored mech melee'],
    ['amazon_rider', 'Amazon Rider', 'E', 'skirmisher', 200, 500, 40, 9, 16, 95, 'L', 'G', 'light bio melee'],
    ['minotaur', 'Minotaur', 'E', 'heavy', 200, 880, 45, 16, 18, 60, 'L', 'G', 'armored bio melee'],
    ['hydra', 'Hydra', 'L', 'heavy', 350, 1230, 48, 22, 40, 45, 'H', 'G', 'armored bio melee legendary'],
  ],
  // A5.3 Medieval Age (P 1.35)
  medieval: [
    ['footman', 'Footman', 'C', 'infantry', 50, 216, 27, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['longbowman', 'Longbowman', 'C', 'ranged', 75, 128, 24, 14, 230, 65, 'S', 'GA', 'light bio ranged'],
    ['destrier_knight', 'Destrier Knight', 'C', 'heavy', 150, 756, 54, 15, 16, 60, 'L', 'G', 'armored bio melee'],
    ['pikeman', 'Pikeman', 'R', 'antiArmor', 100, 297, 35, 12, 70, 70, 'M', 'G', 'light bio melee'],
    ['friar', 'Friar', 'R', 'support', 110, 175, 11, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['battering_ram', 'Battering Ram', 'E', 'siege', 200, 900, 10, 20, 12, 45, 'L', 'G', 'armored mech melee'],
    ['ursa_paladin', 'Ursa Paladin', 'L', 'siegeHeavy', 350, 2150, 70, 20, 20, 55, 'H', 'G', 'armored bio melee legendary'],
    // W3 Medieval wave (CONTENT_PLAN 5.3)
    ['squire_pair', 'Squires', 'C', 'infantry', 50, 131, 15, 10, 16, 80, 'S', 'G', 'light bio melee'],
    ['flailman', 'Flailman', 'C', 'infantry', 50, 216, 22, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['brigand', 'Brigand', 'C', 'infantry', 50, 228, 26, 10, 16, 100, 'S', 'G', 'light bio melee'],
    ['crossbowman', 'Crossbowman', 'C', 'ranged', 75, 128, 43, 25, 220, 65, 'S', 'GA', 'light bio ranged'],
    ['greatsword_knight', 'Greatsword Knight', 'C', 'heavy', 150, 760, 40, 15, 20, 55, 'L', 'G', 'armored bio melee'],
    ['yeoman_archer', 'Yeoman Archer', 'R', 'ranged', 75, 124, 62, 26, 430, 60, 'S', 'G', 'light bio ranged'],
    ['warhammer_sergeant', 'Warhammer Sergeant', 'R', 'antiArmor', 100, 350, 35, 12, 20, 70, 'M', 'G', 'light bio melee'],
    ['herald', 'Herald', 'R', 'support', 110, 175, 11, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['kennel_master', 'Kennel Master', 'R', 'support', 110, 175, 11, 12, 40, 65, 'S', 'G', 'light bio support melee'],
    ['mangonel_cart', 'Mangonel', 'E', 'siege', 200, 450, 82, 35, 300, 45, 'L', 'G', 'light mech ranged'],
    ['siege_belfry', 'Siege Belfry', 'E', 'siege', 200, 900, 30, 20, 16, 40, 'L', 'G', 'armored mech melee'],
    ['alchemist', 'Alchemist', 'E', 'support', 200, 324, 16, 14, 170, 60, 'S', 'GA', 'light bio support ranged'],
    ['lindworm', 'Lindworm', 'L', 'heavy', 350, 1170, 55, 18, 80, 50, 'H', 'G', 'armored bio melee legendary'],
  ],
  // A5.4 Gunpowder Age (P 1.82)
  gunpowder: [
    ['corsair', 'Corsair', 'C', 'infantry', 50, 291, 36, 10, 16, 72, 'S', 'G', 'light bio melee'],
    ['fusilier', 'Fusilier', 'C', 'ranged', 75, 173, 47, 20, 240, 65, 'S', 'GA', 'light bio ranged'],
    ['cuirassier', 'Cuirassier', 'C', 'heavy', 150, 1019, 74, 15, 16, 60, 'L', 'G', 'armored bio melee'],
    ['grenadier', 'Grenadier', 'R', 'antiArmor', 100, 253, 55, 18, 150, 68, 'M', 'G', 'light bio ranged'],
    ['field_surgeon', 'Field Surgeon', 'R', 'support', 110, 237, 15, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['bronze_cannon', 'Bronze Cannon', 'E', 'artillery', 200, 500, 110, 35, 280, 45, 'L', 'G', 'light mech ranged'],
    ['balloon_admiral', 'Balloon Admiral', 'L', 'airBomber', 350, 1200, 85, 16, 40, 45, 'H', 'G', 'air legendary'],
    // W4 Gunpowder wave (CONTENT_PLAN 5.4; DESIGN A5.4 wave table)
    ['highlander', 'Highlander', 'C', 'infantry', 50, 380, 25, 10, 16, 67, 'S', 'G', 'light bio melee'],
    ['powder_monkey', 'Powder Monkey', 'C', 'infantry', 50, 262, 34, 10, 16, 100, 'S', 'G', 'light bio melee'],
    ['voltigeurs', 'Voltigeurs', 'C', 'ranged', 75, 69, 19, 20, 210, 65, 'S', 'GA', 'light bio ranged'],
    ['blunderbuss', 'Blunderbuss', 'C', 'ranged', 75, 164, 57, 26, 120, 65, 'S', 'GA', 'light bio ranged'],
    ['dragoon', 'Dragoon', 'C', 'heavy', 150, 820, 49, 15, 90, 55, 'L', 'G', 'armored bio ranged'],
    ['coehorn_crew', 'Coehorn Crew', 'R', 'ranged', 75, 210, 80, 30, 440, 60, 'S', 'G', 'light bio ranged'],
    ['wall_gunner', 'Wall Gunner', 'R', 'antiArmor', 100, 210, 40, 20, 220, 65, 'M', 'G', 'light bio ranged'],
    ['drummer_boy', 'Drummer Boy', 'R', 'support', 110, 340, 32, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['bagpiper', 'Bagpiper', 'R', 'support', 110, 420, 40, 12, 150, 60, 'S', 'GA', 'light bio support ranged'],
    ['rocket_cart', 'Rocket Cart', 'E', 'artillery', 200, 1300, 70, 35, 330, 45, 'L', 'G', 'light mech ranged'],
    ['hussar', 'Hussar', 'E', 'skirmisher', 200, 1000, 78, 9, 16, 95, 'L', 'G', 'light bio melee'],
    ['mesmerist', 'Mesmerist', 'E', 'support', 200, 1050, 58, 12, 170, 60, 'S', 'GA', 'light bio support ranged'],
    ['grand_marshal', 'Grand Marshal', 'L', 'heavy', 350, 1500, 80, 15, 20, 55, 'H', 'G', 'armored bio melee legendary'],
  ],
  // A17.10 Industrial Age (P 2.12)
  industrial: [
    ['riveter', 'Riveter', 'C', 'infantry', 50, 330, 42, 10, 16, 72, 'S', 'G', 'light bio melee'],
    ['carbineer', 'Carbineer', 'C', 'ranged', 75, 201, 33, 12, 250, 65, 'S', 'GA', 'light bio ranged'],
    ['steam_golem', 'Steam Golem', 'C', 'heavy', 150, 1187, 85, 15, 16, 55, 'L', 'G', 'armored mech melee'],
    ['harpoon_gunner', 'Harpoon Gunner', 'R', 'antiArmor', 100, 286, 55, 12, 210, 65, 'M', 'GA', 'light bio ranged'],
    ['flare_spotter', 'Flare Spotter', 'R', 'support', 110, 276, 17, 12, 200, 65, 'S', 'GA', 'light bio support ranged'],
    ['sapper', 'Sapper', 'E', 'siege', 200, 560, 12, 20, 12, 85, 'M', 'G', 'light bio melee'],
    ['land_dreadnought', 'Land Dreadnought', 'L', 'siegeHeavy', 350, 1800, 85, 22, 160, 35, 'H', 'G', 'armored mech ranged legendary'],
    // W5 Industrial wave (CONTENT_PLAN 5.5; DESIGN A5.x wave table)
    ['coal_miners', 'Coal Miners', 'C', 'infantry', 50, 194, 24, 10, 16, 82, 'S', 'G', 'light bio melee'],
    ['iron_mantlet', 'Iron Mantlet', 'C', 'infantry', 50, 420, 28, 10, 16, 67, 'S', 'G', 'light bio melee'],
    ['dispatch_rider', 'Dispatch Rider', 'C', 'infantry', 50, 325, 42, 10, 16, 110, 'M', 'G', 'light bio melee'],
    ['bomb_bowler', 'Bomb Bowler', 'C', 'ranged', 75, 191, 24, 15, 220, 65, 'S', 'G', 'light bio ranged'],
    ['steam_tractor', 'Steam Tractor', 'C', 'heavy', 150, 1200, 65, 15, 20, 50, 'L', 'G', 'armored mech melee'],
    ['trench_mortar', 'Trench Mortar', 'R', 'ranged', 75, 266, 118, 34, 440, 60, 'S', 'G', 'light bio ranged'],
    ['steam_driller', 'Steam Driller', 'R', 'antiArmor', 100, 490, 50, 12, 40, 70, 'M', 'G', 'light bio melee'],
    ['bandmaster', 'Bandmaster', 'R', 'support', 110, 390, 36, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['clockwork_tinker', 'Clockwork Tinker', 'R', 'support', 110, 275, 17, 12, 40, 65, 'S', 'G', 'light bio support melee'],
    ['armoured_car', 'Armoured Car', 'E', 'siege', 200, 1400, 18, 3, 150, 55, 'L', 'GA', 'armored mech ranged'],
    ['alpine_climber', 'Alpine Climber', 'E', 'skirmisher', 200, 980, 80, 9, 16, 85, 'M', 'G', 'light bio melee'],
    ['spark_scientist', 'Spark Scientist', 'E', 'support', 200, 1200, 55, 12, 170, 60, 'S', 'GA', 'light bio support ranged'],
    ['armoured_train', 'Armoured Train', 'L', 'siegeHeavy', 350, 1520, 90, 24, 220, 40, 'H', 'G', 'armored mech ranged legendary'],
  ],
  // A5.5 Modern Age (P 2.46)
  modern: [
    ['trench_raider', 'Trench Raider', 'C', 'infantry', 50, 394, 49, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['rifleman', 'Rifleman', 'C', 'ranged', 75, 234, 32, 10, 260, 65, 'S', 'GA', 'light bio ranged'],
    ['tankette', 'Tankette', 'C', 'heavy', 150, 1378, 99, 15, 90, 50, 'L', 'G', 'armored mech ranged'],
    ['bazooka_trooper', 'Bazooka Trooper', 'R', 'antiArmor', 100, 363, 64, 12, 200, 65, 'M', 'GA', 'light bio ranged'],
    ['radio_operator', 'Radio Operator', 'R', 'support', 110, 320, 20, 12, 200, 65, 'S', 'GA', 'light bio support ranged'],
    ['gyrocopter', 'Gyrocopter', 'E', 'airGunship', 200, 740, 20, 3, 150, 80, 'M', 'GA', 'air mech'],
    ['behemoth_tank', 'Behemoth Tank', 'L', 'siegeHeavy', 350, 2500, 130, 35, 240, 35, 'H', 'G', 'armored mech legendary'],
    // W6 Modern wave (CONTENT_PLAN 5.6)
    ['commando', 'Commando', 'C', 'infantry', 50, 380, 48, 10, 16, 110, 'S', 'G', 'light bio melee'],
    ['sandbag_carrier', 'Sandbag Carrier', 'C', 'infantry', 50, 455, 33, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['smg_squad', 'SMG Squad', 'C', 'ranged', 75, 74, 11, 10, 170, 65, 'S', 'GA', 'light bio ranged'],
    ['rifle_grenadier', 'Rifle Grenadier', 'C', 'ranged', 75, 210, 42, 15, 230, 65, 'S', 'G', 'light bio ranged'],
    ['assault_gun', 'Assault Gun', 'C', 'heavy', 150, 1350, 84, 15, 90, 45, 'L', 'G', 'armored mech ranged'],
    ['mortar_team', 'Mortar Team', 'R', 'ranged', 75, 266, 124, 30, 440, 60, 'S', 'G', 'light bio ranged'],
    ['sticky_bomber', 'Sticky Bomber', 'R', 'antiArmor', 100, 580, 124, 20, 16, 70, 'M', 'G', 'light bio melee'],
    ['combat_medic', 'Combat Medic', 'R', 'support', 110, 330, 22, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['bulldog_sergeant', 'Bulldog Sergeant', 'R', 'infantry', 50, 415, 42, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['dive_bomber', 'Dive Bomber', 'E', 'airBomber', 200, 800, 66, 20, 40, 80, 'M', 'G', 'air mech'],
    ['bulldozer', 'Bulldozer', 'E', 'siege', 200, 1600, 28, 20, 12, 45, 'L', 'G', 'armored mech melee'],
    ['ghillie_sniper', 'Ghillie Sniper', 'E', 'ranged', 200, 640, 180, 40, 360, 55, 'S', 'GA', 'light bio ranged'],
    ['sky_fortress', 'Sky Fortress', 'L', 'airBomber', 350, 1270, 70, 16, 40, 40, 'H', 'G', 'air mech legendary'],
  ],
  // A5.6 Future Age (P 3.32)
  future: [
    ['photon_knight', 'Photon Knight', 'C', 'infantry', 50, 470, 66, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['pulse_trooper', 'Pulse Trooper', 'C', 'ranged', 75, 315, 43, 10, 260, 65, 'S', 'GA', 'light bio ranged'],
    ['walker_mech', 'Walker Mech', 'C', 'heavy', 150, 1860, 140, 15, 60, 50, 'L', 'G', 'armored mech melee'],
    ['rail_gunner', 'Rail Gunner', 'R', 'antiArmor', 100, 440, 86, 12, 240, 65, 'M', 'GA', 'light bio ranged'],
    ['repair_drone', 'Repair Drone', 'R', 'support', 110, 430, 0, 0, 160, 70, 'S', '-', 'air mech support'],
    ['emp_saboteur', 'EMP Saboteur', 'E', 'antiMech', 200, 700, 50, 10, 12, 85, 'M', 'G', 'light bio melee'],
    ['chrono_titan', 'Chrono Titan', 'L', 'siegeHeavy', 350, 4500, 190, 16, 60, 35, 'H', 'G', 'armored mech melee legendary'],
    // W7 Future wave units (CONTENT_PLAN 5.7; measured numbers, docs/decisions.md)
    ['android_pair', 'Android Pair', 'C', 'infantry', 50, 328, 40, 10, 16, 85, 'S', 'G', 'light bio melee'],
    ['barrier_trooper', 'Barrier Trooper', 'C', 'infantry', 50, 650, 47, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['hover_bike', 'Hover Biker', 'C', 'infantry', 50, 545, 66, 10, 16, 110, 'M', 'G', 'light bio melee'],
    ['needle_gunner', 'Needle Gunner', 'C', 'ranged', 75, 250, 13, 5, 220, 75, 'S', 'GA', 'light bio ranged'],
    ['crab_mech', 'Crab Mech', 'C', 'heavy', 150, 2000, 109, 15, 20, 45, 'L', 'G', 'armored mech melee'],
    ['arc_lobber', 'Arc Lobber', 'R', 'ranged', 75, 360, 172, 29, 440, 60, 'S', 'G', 'light bio ranged'],
    ['plasma_lancer', 'Plasma Lancer', 'R', 'antiArmor', 100, 800, 100, 12, 60, 70, 'M', 'G', 'light bio melee'],
    ['overclock_engineer', 'Overclock Engineer', 'R', 'support', 110, 610, 56, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['holo_projector', 'Holo Projector', 'R', 'support', 110, 430, 40, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['jetpack_trooper', 'Jetpack Trooper', 'E', 'airGunship', 200, 950, 46, 6, 160, 80, 'M', 'GA', 'air bio'],
    ['particle_cannon', 'Particle Cannon', 'E', 'siege', 200, 1500, 200, 35, 300, 45, 'L', 'G', 'armored mech ranged'],
    ['overload_android', 'Overload Android', 'E', 'skirmisher', 200, 1700, 90, 9, 16, 60, 'M', 'G', 'armored mech melee'],
    ['drone_carrier', 'Drone Carrier', 'L', 'siegeHeavy', 350, 1900, 40, 5, 200, 35, 'H', 'GA', 'armored mech ranged legendary'],
  ],
  // A17.11 Cosmic Age (P 4.48)
  cosmic: [
    ['star_legionnaire', 'Star Legionnaire', 'C', 'infantry', 50, 700, 90, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['ion_ranger', 'Ion Ranger', 'C', 'ranged', 75, 426, 54, 10, 270, 65, 'S', 'GA', 'light bio ranged'],
    ['hover_tank', 'Hover Tank', 'C', 'heavy', 150, 2509, 179, 15, 90, 55, 'L', 'G', 'armored mech ranged'],
    ['graviton_halberdier', 'Graviton Halberdier', 'R', 'antiArmor', 100, 985, 116, 12, 70, 70, 'M', 'G', 'light bio melee'],
    ['starwarden', 'Starwarden', 'R', 'support', 110, 582, 36, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['warp_stalker', 'Warp Stalker', 'E', 'skirmisher', 200, 1600, 140, 8, 12, 100, 'M', 'G', 'light bio melee'],
    ['mothership', 'Mothership', 'L', 'airGunship', 350, 2100, 40, 6, 180, 40, 'H', 'GA', 'air mech legendary'],
    // W8 Cosmic wave units (CONTENT_PLAN 5.8; measured numbers, docs/decisions.md)
    ['crystal_guard', 'Crystal Guard', 'C', 'infantry', 50, 890, 67, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['void_skimmer', 'Void Skimmer', 'C', 'infantry', 50, 670, 94, 10, 16, 110, 'S', 'G', 'light bio melee'],
    ['moonlings', 'Moonlings', 'C', 'ranged', 75, 172, 21, 10, 230, 65, 'S', 'GA', 'light bio ranged'],
    ['nova_thrower', 'Nova Thrower', 'C', 'ranged', 75, 440, 62, 11.5, 240, 65, 'S', 'G', 'light bio ranged'],
    ['asteroid_golem', 'Asteroid Golem', 'C', 'heavy', 150, 2950, 146, 15, 20, 50, 'L', 'G', 'armored mech melee'],
    ['star_mortar', 'Star Mortar', 'R', 'ranged', 75, 470, 190, 28, 440, 60, 'S', 'G', 'light bio ranged'],
    ['antimatter_rifler', 'Antimatter Rifler', 'R', 'antiArmor', 100, 700, 140, 16, 220, 65, 'M', 'G', 'light bio ranged'],
    ['bio_weaver', 'Bio-Weaver', 'R', 'support', 110, 580, 36, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['void_whisperer', 'Void Whisperer', 'R', 'support', 110, 760, 48, 12, 150, 60, 'S', 'GA', 'light bio support ranged'],
    ['star_fighter', 'Star Fighter', 'E', 'airGunship', 200, 1250, 48, 5, 170, 85, 'M', 'GA', 'air mech'],
    ['swarm_matron', 'Swarm Matron', 'E', 'support', 200, 1300, 50, 12, 150, 60, 'M', 'GA', 'light bio ranged'],
    ['gravity_sage', 'Gravity Sage', 'E', 'support', 200, 1700, 70, 12, 160, 60, 'S', 'GA', 'light bio support ranged'],
    ['star_leviathan', 'Star Leviathan', 'L', 'heavy', 350, 2800, 118, 20, 90, 40, 'H', 'G', 'armored bio ranged legendary'],
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
    // X0 Stone wave
    ['quill_porcupine', 'Quill Porcupine', 'C', 175, 9, 15, 280, 'GA'],
    ['sapling_sling', 'Sapling Sling', 'R', 250, 82, 45, 480, 'G'],
  ],
  bronze: [
    ['archer_tower', 'Archer Tower', 'C', 150, 35, 15, 370, 'GA'],
    ['sun_mirror', 'Sun Mirror', 'C', 175, 9, 3, 230, 'GA'],
    ['onager', 'Onager', 'R', 250, 95, 45, 480, 'G'],
    ['gorgon_bust', 'Gorgon Bust', 'E', 250, 55, 60, 380, 'GA'],
    // W2 Bronze wave turrets
    ['net_caster', 'Net Caster', 'C', 175, 28, 15, 320, 'GA'],
    ['polybolos', 'Polybolos', 'R', 250, 35, 30, 420, 'GA'],
  ],
  medieval: [
    ['crossbow_nest', 'Crossbow Nest', 'C', 150, 40, 15, 380, 'GA'],
    ['pitch_cauldron', 'Pitch Cauldron', 'C', 175, 14, 5, 130, 'G'],
    ['trebuchet', 'Trebuchet', 'R', 250, 110, 45, 480, 'G'],
    ['honk_ballista', 'Honk Ballista', 'E', 250, 70, 30, 400, 'GA'],
    // W3 Medieval wave
    ['springald', 'Springald', 'C', 175, 48, 20, 360, 'G'],
    ['grapple_crane', 'Grapple Crane', 'R', 250, 68, 50, 380, 'G'],
  ],
  gunpowder: [
    ['swivel_gun', 'Swivel Gun', 'C', 150, 22, 6, 340, 'GA'],
    ['grapeshot_gun', 'Grapeshot Gun', 'C', 175, 50, 20, 220, 'GA'],
    ['congreve_rack', 'Congreve Rack', 'R', 250, 55, 50, 460, 'GA'],
    ['chainshot_cannon', 'Chainshot Cannon', 'E', 250, 75, 40, 400, 'G'],
    // W4 Gunpowder wave
    ['carronade', 'Carronade', 'C', 175, 66, 25, 320, 'G'],
    ['sea_mortar', 'Sea Mortar', 'R', 250, 149, 45, 480, 'G'],
  ],
  industrial: [
    ['gatling_gun', 'Gatling Gun', 'C', 150, 13, 3, 350, 'GA'],
    ['mortar_pit', 'Mortar Pit', 'C', 175, 68, 20, 300, 'G'],
    ['boiler_mortar', 'Boiler Mortar', 'R', 250, 172, 50, 480, 'G'],
    ['tesla_tower', 'Tesla Tower', 'E', 250, 130, 45, 380, 'GA'],
    // W5 Industrial wave
    ['rivet_spitter', 'Rivet Spitter', 'C', 175, 19, 15, 280, 'GA'],
    ['steam_hammer', 'Steam Hammer', 'R', 250, 57, 10, 150, 'G'],
  ],
  modern: [
    ['mg_nest', 'MG Nest', 'C', 150, 15, 3, 340, 'GA'],
    ['flak_gun', 'Flak Gun', 'C', 175, 60, 15, 420, 'GA'],
    ['howitzer', 'Howitzer', 'R', 250, 200, 50, 480, 'G'],
    ['searchlight_sniper', 'Searchlight Sniper', 'E', 250, 280, 40, 480, 'GA'],
    // W6 Modern wave
    ['anti_tank_gun', 'Anti-Tank Gun', 'C', 175, 110, 25, 320, 'G'],
    ['rocket_battery', 'Rocket Battery', 'R', 250, 74, 60, 460, 'G'],
  ],
  future: [
    ['pulse_laser', 'Pulse Laser', 'C', 150, 20, 3, 360, 'GA'],
    ['arc_coil', 'Arc Coil', 'C', 175, 60, 18, 260, 'GA'],
    ['plasma_mortar', 'Plasma Mortar', 'R', 250, 270, 50, 480, 'G'],
    ['gravity_well', 'Gravity Well', 'E', 250, 60, 70, 400, 'G'],
    // W7 Future wave turrets
    ['cryo_pod', 'Cryo Pod', 'C', 175, 80, 15, 320, 'GA'],
    ['tractor_beam', 'Tractor Beam', 'R', 250, 166, 50, 380, 'G'],
  ],
  cosmic: [
    ['ion_turret', 'Ion Turret', 'C', 150, 27, 3, 370, 'GA'],
    ['starburst_gun', 'Starburst Gun', 'C', 175, 123, 20, 240, 'GA'],
    ['starfall_battery', 'Starfall Battery', 'R', 250, 363, 50, 480, 'G'],
    ['tachyon_lance', 'Tachyon Lance', 'E', 250, 184, 40, 420, 'GA'],
    // W8 Cosmic wave turrets
    ['shard_spitter', 'Shard Spitter', 'C', 175, 40, 15, 280, 'GA'],
    ['event_horizon', 'Event Horizon', 'R', 250, 120, 10, 150, 'G'],
  ],
};

/** A5.7: [slug, name, age, slot, effect fields to match] */
/** A5.7 roster (the power rework, A2.9): slug, name, age, slot, family, source, cost, reload, telegraph, cap (0 = none). */
type PowerRow = [string, string, AgeId, PowerSlot, PowerFamily, PowerSource, number, number, number, number];

const POWERS: PowerRow[] = [
  ['rockslide', 'Rockslide', 'stone', 'home', 'sweep', 'starter', 125, 40000, 1000, 4],
  ['meteor_shower', 'Meteor Shower', 'stone', 'home', 'bombard', 'road', 125, 40000, 1000, 3],
  ['sticky_tar', 'Sticky Tar', 'stone', 'home', 'snare', 'warPath', 75, 30000, 1000, 6],
  ['stampede', 'Stampede', 'stone', 'field', 'charge', 'starter', 100, 40000, 1000, 5],
  ['hunt_cry', 'Hunt Cry', 'stone', 'field', 'rally', 'warPath', 125, 45000, 500, 8],
  ['hunters_spear', 'Hunter’s Spear', 'stone', 'field', 'strike', 'warPath', 50, 15000, 1500, 1],
  ['pebble_hail', 'Pebble Hail', 'stone', 'field', 'volley', 'warPath', 50, 25000, 1000, 8],
  ['tangle_vines', 'Tangle Vines', 'stone', 'home', 'pull', 'warPath', 75, 30000, 1000, 6],
  ['tidal_wave', 'Tidal Wave', 'bronze', 'home', 'sweep', 'starter', 125, 40000, 1000, 4],
  ['zeus_bolts', 'Zeus’s Bolts', 'bronze', 'home', 'bombard', 'warPath', 125, 40000, 1000, 3],
  ['medusa_gaze', 'Medusa’s Gaze', 'bronze', 'home', 'stun', 'warPath', 75, 35000, 1000, 5],
  ['chariot_rush', 'Chariot Rush', 'bronze', 'field', 'charge', 'starter', 100, 40000, 1000, 5],
  ['aegis', 'Aegis', 'bronze', 'field', 'ward', 'road', 75, 30000, 500, 8],
  ['apollo_arrow', 'Apollo’s Arrow', 'bronze', 'field', 'strike', 'warPath', 50, 15000, 1500, 1],
  // W2 Bronze wave powers
  ['sandstorm', 'Sandstorm', 'bronze', 'field', 'signal', 'warPath', 50, 25000, 1000, 8],
  ['charybdis', 'Charybdis', 'bronze', 'home', 'pull', 'warPath', 75, 30000, 1000, 6],
  ['arrow_storm', 'Arrow Storm', 'medieval', 'home', 'bombard', 'starter', 125, 40000, 1000, 3],
  ['caltrops', 'Caltrops', 'medieval', 'home', 'snare', 'warPath', 75, 30000, 1000, 6],
  ['boiling_oil', 'Boiling Oil', 'medieval', 'home', 'sweep', 'warPath', 125, 40000, 1000, 2],
  ['knights_charge', 'Knights’ Charge', 'medieval', 'field', 'charge', 'starter', 100, 40000, 1000, 5],
  ['royal_decree', 'Royal Decree', 'medieval', 'field', 'rally', 'road', 75, 30000, 500, 8],
  ['undermine', 'Undermine', 'medieval', 'field', 'suppress', 'warPath', 125, 60000, 1500, 0],
  ['longbow_volley', 'Longbow Volley', 'medieval', 'field', 'volley', 'warPath', 50, 25000, 1000, 8],
  ['great_bell', 'Great Bell', 'medieval', 'home', 'stun', 'warPath', 75, 35000, 1000, 5],
  ['volley_fire', 'Volley Fire', 'gunpowder', 'home', 'sweep', 'starter', 125, 40000, 1000, 4],
  ['broadside', 'Broadside', 'gunpowder', 'home', 'bombard', 'road', 100, 40000, 1000, 4],
  ['boarding_nets', 'Boarding Nets', 'gunpowder', 'home', 'pull', 'warPath', 75, 30000, 1000, 6],
  ['smoke_screen', 'Smoke Screen', 'gunpowder', 'field', 'cloud', 'starter', 100, 40000, 1000, 8],
  ['horse_artillery', 'Horse Artillery', 'gunpowder', 'field', 'frontBarrage', 'warPath', 100, 35000, 1000, 4],
  ['sharpshooter', 'Sharpshooter', 'gunpowder', 'field', 'strike', 'warPath', 75, 30000, 1500, 1],
  ['rocket_volley', 'Rocket Volley', 'gunpowder', 'field', 'volley', 'warPath', 50, 25000, 1000, 8],
  ['cannon_salute', 'Cannon Salute', 'gunpowder', 'home', 'stun', 'warPath', 75, 35000, 1000, 6],
  ['gun_line', 'Gun Line', 'industrial', 'home', 'sweep', 'starter', 125, 40000, 1000, 4],
  ['zeppelin_raid', 'Zeppelin Raid', 'industrial', 'home', 'bombard', 'road', 125, 40000, 1000, 3],
  ['barbed_wire', 'Barbed Wire', 'industrial', 'home', 'snare', 'warPath', 75, 30000, 1000, 6],
  ['iron_horse', 'Iron Horse', 'industrial', 'field', 'charge', 'starter', 100, 40000, 1000, 5],
  ['railway_gun', 'Railway Gun', 'industrial', 'field', 'strike', 'warPath', 50, 15000, 2000, 1],
  ['field_hospital', 'Field Hospital', 'industrial', 'field', 'mend', 'warPath', 75, 30000, 500, 8],
  ['shrapnel_shells', 'Shrapnel Shells', 'industrial', 'field', 'volley', 'warPath', 50, 25000, 1000, 8],
  ['great_magnet', 'Great Magnet', 'industrial', 'home', 'pull', 'warPath', 75, 30000, 1000, 6],
  ['strafing_run', 'Strafing Run', 'modern', 'home', 'sweep', 'starter', 100, 40000, 1000, 4],
  ['carpet_bomber', 'Carpet Bomber', 'modern', 'home', 'bombard', 'road', 125, 40000, 1000, 3],
  ['aa_screen', 'AA Screen', 'modern', 'home', 'flak', 'warPath', 75, 25000, 500, 3],
  ['paratroopers', 'Paratroopers', 'modern', 'field', 'drop', 'starter', 150, 60000, 1000, 0],
  ['tank_rush', 'Tank Rush', 'modern', 'field', 'charge', 'warPath', 100, 40000, 1000, 5],
  ['sniper_team', 'Sniper Team', 'modern', 'field', 'strike', 'warPath', 50, 15000, 1000, 1],
  ['creeping_barrage', 'Creeping Barrage', 'modern', 'field', 'volley', 'warPath', 50, 25000, 1000, 8],
  ['concussion_shells', 'Concussion Shells', 'modern', 'home', 'stun', 'warPath', 75, 35000, 1000, 6],
  // W7 Future wave powers
  ['target_painter', 'Target Painter', 'future', 'field', 'signal', 'warPath', 50, 25000, 1000, 8],
  ['nano_mesh', 'Nano Mesh', 'future', 'home', 'snare', 'warPath', 75, 30000, 1000, 6],
  ['orbital_lance', 'Orbital Lance', 'future', 'home', 'sweep', 'starter', 125, 40000, 1000, 4],
  ['point_defense', 'Point Defense Grid', 'future', 'home', 'bombard', 'warPath', 100, 40000, 1000, 4],
  ['stasis_field', 'Stasis Field', 'future', 'home', 'stun', 'warPath', 75, 35000, 1000, 6],
  ['drone_swarm', 'Drone Swarm', 'future', 'field', 'frontBarrage', 'starter', 100, 35000, 1000, 4],
  ['nanite_surge', 'Nanite Surge', 'future', 'field', 'mend', 'road', 150, 50000, 500, 8],
  ['emp_blackout', 'EMP Blackout', 'future', 'field', 'suppress', 'warPath', 125, 60000, 1500, 0],
  ['starfall', 'Starfall', 'cosmic', 'home', 'bombard', 'starter', 125, 40000, 1000, 3],
  ['singularity', 'Singularity', 'cosmic', 'home', 'pull', 'warPath', 100, 30000, 1000, 6],
  ['solar_flare', 'Solar Flare', 'cosmic', 'home', 'sweep', 'warPath', 125, 40000, 1000, 3],
  ['comet_run', 'Comet Run', 'cosmic', 'field', 'charge', 'starter', 100, 40000, 1000, 5],
  ['warp_strike', 'Warp Strike', 'cosmic', 'field', 'drop', 'road', 150, 60000, 1000, 0],
  ['ion_cannon', 'Ion Strike', 'cosmic', 'field', 'strike', 'warPath', 50, 15000, 1500, 1],
  // W8 Cosmic wave powers
  ['meteor_drizzle', 'Meteor Drizzle', 'cosmic', 'field', 'volley', 'warPath', 50, 25000, 1000, 8],
  ['pulsar_pulse', 'Pulsar Pulse', 'cosmic', 'home', 'stun', 'warPath', 75, 35000, 1000, 6],
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

  it('lists every collectable unit (56 in A17.13, plus the X0 content waves)', () => {
    const rows = Object.values(UNITS).flat().map((r) => r[0]);
    // Every card of the tables, released or held back by the release gate (`full` opens the gate).
    expect(rows).toHaveLength(full.order.units.length);
    expect([...full.order.units].sort()).toEqual([...rows].sort());
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
    expect(ab('ursa_paladin')).toContainEqual({ kind: 'periodicShieldAura', everyMs: 15000, radius: 200, maxTargets: 8, shield: 35, durationMs: 6000 });
    expect(content.units.ursa_paladin?.attacks[0]?.cleave).toEqual({ count: 2, reach: 40 });
    expect(ab('corsair')).toContainEqual({ kind: 'firstHitBonus', multBp: 10000, knockback: -20, idleResetMs: 2000 });
    expect(content.units.grenadier?.attacks[0]).toMatchObject({ splashRadius: 35, priority: 'armored' });
    expect(ab('field_surgeon')).toContainEqual({ kind: 'heal', hpPerSec: 55, radius: 160, targets: 2, pulseMs: 500 });
    expect(content.units.bronze_cannon?.attacks[0]).toMatchObject({ splashRadius: 50, minRange: 80 });
    expect(ab('balloon_admiral')).toContainEqual({ kind: 'onDeathExplode', damage: 200, radius: 70 });
    expect(content.units.rifleman?.attacks[0]?.onHit).toEqual([{ kind: 'slow', magnitudeBp: 1500, durationMs: 1000 }]);
    expect(ab('radio_operator')).toContainEqual({ kind: 'callStrike', everyMs: 8000, searchRange: 400, delayMs: 1000, damage: 120, radius: 50, sideLockoutMs: 3000 });
    expect(content.units.behemoth_tank?.attacks[1]).toMatchObject({ damage: 14, intervalMs: 400, range: 150, hitsGround: true, hitsAir: true, priority: 'air' });
    expect(ab('photon_knight')).toContainEqual({ kind: 'innateShield', amount: 90, regenPerSec: 30, delayMs: 3000 });
    expect(content.units.rail_gunner?.attacks[0]?.pierce).toEqual({ count: 2, length: 150 });
    expect(ab('repair_drone')).toContainEqual({ kind: 'heal', hpPerSec: 100, radius: 160, targets: 2, pulseMs: 500 });
    expect(ab('emp_saboteur')).toContainEqual({ kind: 'emp', everyMs: 8000, triggerRadius: 120, radius: 120, stunMs: 1500 });
    expect(ab('chrono_titan')).toContainEqual({ kind: 'timeStop', everyMs: 20000, radius: 200, freezeMs: 1500, legendaryFreezeMs: 750 });
    expect(content.units.chrono_titan?.attacks[0]?.cleave).toEqual({ count: 3, reach: 60 });
    // A17.9-A17.11
    expect(ab('hoplite')).toContainEqual({ kind: 'firstHitBonus', multBp: 10000, knockback: 15, idleResetMs: 2000 });
    expect(content.units.javelineer?.attacks[0]?.pierce).toEqual({ count: 2, length: 50 });
    expect(ab('war_chariot')).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 });
    expect(content.units.phalangite?.attacks[0]).toMatchObject({ priority: 'armored', mods: [{ vs: 'legendary', bp: 20000 }, { vs: 'armored', bp: 30000 }, { vs: 'mech', bp: 30000 }, { vs: 'light', bp: 7500 }] });
    expect(ab('standard_bearer')).toContainEqual({ kind: 'aura', radius: 160, status: { kind: 'damageBuff', magnitudeBp: 1500, durationMs: 0 } });
    expect(content.units.scorpion?.attacks[0]).toMatchObject({ minRange: 60, pierce: { count: 3, length: 150 } });
    expect(content.units.bronze_colossus?.attacks[0]).toMatchObject({ splashRadius: 45, onHit: [{ kind: 'slow', magnitudeBp: 2000, durationMs: 1500 }] });
    expect(ab('bronze_colossus')).toContainEqual({ kind: 'onDeathExplode', damage: 100, radius: 70 });
    expect(ab('riveter')).toContainEqual({ kind: 'firstHitBonus', multBp: 15000, knockback: 0, idleResetMs: 2000 });
    expect(ab('steam_golem')).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 });
    expect(ab('harpoon_gunner')).toContainEqual({ kind: 'firstHitBonus', multBp: 10000, knockback: -25, idleResetMs: 2000 });
    expect(content.units.flare_spotter?.attacks[0]).toMatchObject({ priority: 'armored', onHit: [{ kind: 'mark', magnitudeBp: 2000, durationMs: 3000 }] });
    expect(content.units.sapper?.attacks[0]?.vsBaseDamage).toBe(240);
    expect(ab('sapper')).toEqual([{ kind: 'siegeOnly' }, { kind: 'onDeathExplode', damage: 180, radius: 60 }]);
    expect(ab('land_dreadnought').find((a) => a.kind === 'riders')).toMatchObject({ count: 2, onDeathSpawn: 'carbineer', attack: { damage: 6, intervalMs: 500, range: 160 } });
    expect(ab('star_legionnaire')).toContainEqual({ kind: 'resist', minSourceRange: 100, bp: 2000 });
    expect(content.units.ion_ranger?.attacks[0]?.chain).toEqual({ count: 2, hop: 50 });
    expect(ab('graviton_halberdier')).toContainEqual({ kind: 'brace' });
    // Anti-heavy (owner feedback 2026-09-29): Brace for the whole class, so a Heavy's charge never applies.
    for (const id of ['spear_hunter', 'phalangite', 'pikeman', 'grenadier', 'harpoon_gunner', 'bazooka_trooper', 'rail_gunner', 'graviton_halberdier']) expect(ab(id), id).toContainEqual({ kind: 'brace' });
    expect(ab('starwarden')).toContainEqual({ kind: 'periodicShieldAura', everyMs: 8000, radius: 180, maxTargets: 4, shield: 200, durationMs: 5000 });
    expect(ab('warp_stalker')).toContainEqual({ kind: 'pounce', searchRange: 200, cooldownMs: 10000, leapMs: 400, firstBiteBp: 20000 });
    expect(ab('mothership')).toEqual([
      { kind: 'callStrike', everyMs: 10000, searchRange: 400, delayMs: 1000, damage: 150, radius: 50, sideLockoutMs: 3000 },
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

  it('lists every turret (32, plus the X0 content waves) and the listed notes', () => {
    expect(Object.values(TURRETS).flat()).toHaveLength(Object.keys(content.turrets).length);
    expect([...full.order.turrets].sort()).toEqual(Object.values(TURRETS).flat().map((r) => r[0]).sort());
    // X0 Stone wave
    expect(content.turrets.quill_porcupine?.attack).toMatchObject({ volley: 3, pierce: { count: 2, length: 60 } });
    expect(content.turrets.sapling_sling?.attack).toMatchObject({ splashRadius: 50, minRange: 150 });
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
  // X0 Stone wave
  hunting_wolves: [['hunting_wolves', 'melee', 'wolf_bite', 'slash']],
  hide_shield: [['hide_shield', 'melee', 'shield_bash', 'blunt']],
  torch_runner: [['torch_runner', 'melee', 'torch_jab', 'blunt']],
  bolas_thrower: [['bolas_thrower', 'proj.bolas', 'shot_bolas', 'blunt']],
  woolly_rhino: [['woolly_rhino', 'melee', 'horn_hook', 'blunt']],
  atlatl_thrower: [['atlatl_thrower', 'proj.dart', 'shot_atlatl', 'pierce']],
  boulder_hurler: [['boulder_hurler', 'proj.boulder', 'shot_heave', 'blunt']],
  herbalist: [['herbalist', 'proj.herb', 'herb_puff', 'blunt']],
  pelt_rager: [['pelt_rager', 'melee', 'swing_whoosh', 'blunt']],
  beast_caller: [['beast_caller', 'melee', 'swing_whoosh', 'blunt']],
  cave_bear: [['cave_bear', 'melee', 'bear_swipe', 'slash']],
  rockfall_shaman: [['rockfall_shaman', 'proj.rock', 'shot_sling', 'blunt']],
  elk_chieftain: [['elk_chieftain', 'melee', 'antler_sweep', 'blunt']],
  cave_pup: [['cave_pup', 'melee', 'wolf_bite', 'slash']],
  quill_porcupine: [['quill_porcupine', 'proj.quill', 'quill_fan', 'pierce']],
  // W3 Medieval wave
  squire_pair: [['squire_pair', 'melee', 'squire_jab', 'pierce']],
  flailman: [['flailman', 'melee', 'flail_smash', 'blunt']],
  brigand: [['brigand', 'melee', 'dagger_stab', 'slash']],
  crossbowman: [['crossbowman', 'proj.bolt', 'shot_windlass', 'pierce']],
  greatsword_knight: [['greatsword_knight', 'melee', 'greatsword_sweep', 'slash']],
  yeoman_archer: [['yeoman_archer', 'proj.longarrow', 'shot_longbow', 'pierce']],
  warhammer_sergeant: [['warhammer_sergeant', 'melee', 'hammer_clang', 'blunt']],
  herald: [['herald', 'proj.note', 'trumpet_toot', 'blunt']],
  kennel_master: [['kennel_master', 'melee', 'whip_crack', 'slash']],
  mangonel_cart: [['mangonel_cart', 'proj.boulder', 'shot_mangonel', 'blast']],
  siege_belfry: [['siege_belfry', 'melee', 'drawbridge_slam', 'blunt'], ['riders', 'proj.arrow', 'shot_bow', 'pierce']],
  alchemist: [['alchemist', 'proj.vial', 'vial_toss', 'blast']],
  lindworm: [['lindworm', 'fx.lindworm_breath', 'wyrm_breath', 'blast']],
  war_hound: [['war_hound', 'melee', 'hound_bite', 'slash']],
  springald: [['springald', 'proj.spear_bolt', 'shot_springald', 'pierce']],
  grapple_crane: [['grapple_crane', 'fx.grapple_hook', 'crane_hook', 'pierce']],
  // W4 Gunpowder wave
  highlander: [['highlander', 'melee', 'claymore_chop', 'slash']],
  powder_monkey: [['powder_monkey', 'melee', 'scoop_swing', 'blunt']],
  voltigeurs: [['voltigeurs', 'proj.musket', 'shot_musket', 'bullet']],
  blunderbuss: [['blunderbuss', 'fx.blunderbuss_spray', 'shot_blunderbuss', 'bullet']],
  dragoon: [['dragoon', 'proj.musket', 'shot_dragoon', 'bullet']],
  coehorn_crew: [['coehorn_crew', 'proj.mortar_shell', 'shot_coehorn', 'blast']],
  wall_gunner: [['wall_gunner', 'proj.musket', 'shot_wallgun', 'bullet']],
  drummer_boy: [['drummer_boy', 'fx.drum_boom', 'drum_roll', 'blunt']],
  bagpiper: [['bagpiper', 'fx.pipe_drone', 'pipe_drone', 'blunt']],
  rocket_cart: [['rocket_cart', 'proj.rocket', 'shot_rocket', 'blast']],
  hussar: [['hussar', 'melee', 'sabre_slash', 'slash']],
  mesmerist: [['mesmerist', 'fx.mesmer_spiral', 'mesmer_chime', 'blunt']],
  grand_marshal: [['grand_marshal', 'melee', 'marshal_sweep', 'slash']],
  carronade: [['carronade', 'proj.cannonball', 'shot_carronade', 'blunt']],
  sea_mortar: [['sea_mortar', 'proj.cannonball', 'shot_sea_mortar', 'blast']],
  sapling_sling: [['sapling_sling', 'proj.boulder', 'shot_sapling', 'blast']],
  // W5 Industrial wave
  coal_miners: [['coal_miners', 'melee', 'pickaxe_clink', 'pierce']],
  iron_mantlet: [['iron_mantlet', 'melee', 'mantlet_jab', 'pierce']],
  dispatch_rider: [['dispatch_rider', 'melee', 'bike_skid', 'blunt']],
  bomb_bowler: [['bomb_bowler', 'proj.bowl_bomb', 'shot_bowl', 'blast']],
  steam_tractor: [['steam_tractor', 'melee', 'plough_scoop', 'blunt']],
  trench_mortar: [['trench_mortar', 'proj.mortar_shell', 'shot_trench_mortar', 'blast']],
  steam_driller: [['steam_driller', 'melee', 'drill_spin', 'pierce']],
  bandmaster: [['bandmaster', 'proj.note', 'cornet_blast', 'blunt']],
  clockwork_tinker: [['clockwork_tinker', 'melee', 'key_whack', 'blunt']],
  armoured_car: [['armoured_car', 'proj.bullet', 'car_mg', 'bullet']],
  alpine_climber: [['alpine_climber', 'melee', 'ice_axe_chop', 'pierce']],
  spark_scientist: [['spark_scientist', 'fx.coil_arc', 'coil_zap', 'laser']],
  armoured_train: [['main gun', 'proj.shell', 'train_gun', 'blast'], ['MG', 'proj.bullet', 'shot_gatling', 'bullet']],
  clockwork_soldier: [['clockwork_soldier', 'melee', 'toy_bayonet', 'pierce']],
  rivet_spitter: [['rivet_spitter', 'proj.rivet', 'shot_rivet', 'pierce']],
  steam_hammer: [['steam_hammer', 'fx.hammer_shock', 'hammer_slam', 'blunt']],
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
  // W6 Modern wave
  commando: [['commando', 'melee', 'butt_stroke', 'blunt']],
  sandbag_carrier: [['sandbag_carrier', 'melee', 'sandbag_slam', 'blunt']],
  smg_squad: [['smg_squad', 'proj.bullet', 'shot_smg', 'bullet']],
  rifle_grenadier: [['rifle_grenadier', 'proj.rifle_grenade', 'shot_rifle_grenade', 'blast']],
  assault_gun: [['assault_gun', 'proj.shell', 'shot_assault_gun', 'blast']],
  mortar_team: [['mortar_team', 'proj.mortar_shell', 'shot_mortar_team', 'blast']],
  sticky_bomber: [['sticky_bomber', 'melee', 'sticky_thunk', 'blast']],
  combat_medic: [['combat_medic', 'proj.bullet', 'shot_pistol', 'bullet']],
  bulldog_sergeant: [['bulldog_sergeant', 'melee', 'boxing_jab', 'blunt']],
  dive_bomber: [['dive_bomber', 'proj.bomb', 'dive_whistle', 'blast']],
  bulldozer: [['bulldozer', 'melee', 'dozer_shove', 'blunt']],
  ghillie_sniper: [['ghillie_sniper', 'proj.bullet', 'shot_ghillie', 'bullet']],
  sky_fortress: [['sky_fortress', 'proj.bomb', 'bomb_stick', 'blast'], ['riders', 'proj.bullet', 'shot_mg', 'bullet']],
  anti_tank_gun: [['anti_tank_gun', 'proj.shell', 'shot_at_gun', 'pierce']],
  rocket_battery: [['rocket_battery', 'proj.rocket', 'rocket_ripple', 'blast']],
  pulse_laser: [['pulse_laser', 'fx.beam_laser', 'shot_laser', 'laser']],
  arc_coil: [['arc_coil', 'fx.arc_chain', 'shot_arc', 'laser']],
  plasma_mortar: [['plasma_mortar', 'proj.plasma_mortar', 'shot_plasma', 'blast']],
  gravity_well: [['gravity_well', 'proj.gravity_orb', 'gravity_hum', 'blast']],
  // W7 Future wave attacks
  android_pair: [['android_pair', 'melee', 'baton_spin', 'blunt']],
  barrier_trooper: [['barrier_trooper', 'melee', 'shield_pulse', 'laser']],
  hover_bike: [['hover_bike', 'melee', 'lance_swipe', 'laser']],
  needle_gunner: [['needle_gunner', 'proj.needle', 'shot_needle', 'laser']],
  crab_mech: [['crab_mech', 'melee', 'pincer_snap', 'blunt']],
  arc_lobber: [['arc_lobber', 'proj.arc_shell', 'shot_lobber', 'blast']],
  plasma_lancer: [['plasma_lancer', 'melee', 'lance_crackle', 'laser']],
  overclock_engineer: [['overclock_engineer', 'fx.zap_beam', 'multitool_zap', 'laser']],
  holo_projector: [['holo_projector', 'proj.plasma', 'shot_holo', 'laser']],
  jetpack_trooper: [['jetpack_trooper', 'proj.plasma', 'shot_jet_beam', 'laser']],
  particle_cannon: [['particle_cannon', 'fx.particle_beam', 'shot_particle', 'laser']],
  overload_android: [['overload_android', 'melee', 'robot_punch', 'blunt']],
  drone_carrier: [['drone_carrier', 'fx.beam_laser', 'shot_pd_laser', 'laser']],
  holo_decoy: [['holo_decoy', 'melee', 'holo_flicker', 'laser']],
  attack_drone: [['attack_drone', 'proj.plasma', 'shot_drone', 'laser']],
  cryo_pod: [['cryo_pod', 'proj.frost', 'shot_cryo', 'laser']],
  tractor_beam: [['tractor_beam', 'fx.tractor_beam', 'tractor_hum', 'laser']],
  // A17.12 attack mapping
  hoplite: [['hoplite', 'melee', 'swing_whoosh', 'pierce']],
  javelineer: [['javelineer', 'proj.javelin', 'shot_javelin', 'pierce']],
  war_chariot: [['war_chariot', 'melee', 'swing_whoosh', 'slash']],
  phalangite: [['phalangite', 'melee', 'swing_whoosh', 'pierce']],
  standard_bearer: [['standard_bearer', 'proj.javelin', 'shot_javelin', 'pierce']],
  scorpion: [['scorpion', 'proj.scorpion_bolt', 'shot_scorpion', 'pierce']],
  bronze_colossus: [['bronze_colossus', 'melee', 'stomp_colossus', 'blast']],
  // W2 Bronze wave attacks
  shield_bearer: [['shield_bearer', 'melee', 'kopis_hack', 'slash']],
  thracian_raider: [['thracian_raider', 'melee', 'rhomphaia_cut', 'slash']],
  rhodian_slingers: [['rhodian_slingers', 'proj.rock', 'shot_sling', 'blunt']],
  discus_thrower: [['discus_thrower', 'proj.discus', 'shot_discus', 'blunt']],
  war_elephant: [['war_elephant', 'melee', 'trunk_lash', 'blunt']],
  cretan_archer: [['cretan_archer', 'proj.arrow_arc', 'shot_bow', 'pierce']],
  belly_bowman: [['belly_bowman', 'proj.bolt', 'shot_belly_bow', 'pierce']],
  aulos_piper: [['aulos_piper', 'fx.note_pop', 'aulos_note', 'blunt']],
  tragic_chorus: [['tragic_chorus', 'fx.wail_ring', 'chorus_wail', 'blunt']],
  wooden_horse: [['wooden_horse', 'melee', 'horse_ram', 'blast'], ['wooden_horse', 'melee', 'swing_whoosh', 'pierce']],
  amazon_rider: [['amazon_rider', 'melee', 'sagaris_sweep', 'slash']],
  minotaur: [['minotaur', 'melee', 'labrys_chop', 'slash']],
  hydra: [['hydra', 'melee', 'hydra_bite', 'slash']],
  net_caster: [['net_caster', 'proj.net', 'net_cast', 'blunt']],
  polybolos: [['polybolos', 'proj.bolt', 'shot_polybolos', 'pierce']],
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
  // W8 Cosmic wave
  crystal_guard: [['crystal_guard', 'melee', 'crystal_slam', 'blunt']],
  void_skimmer: [['void_skimmer', 'melee', 'board_kick', 'slash']],
  moonlings: [['moonlings', 'proj.moon_pellet', 'moon_spit', 'laser']],
  nova_thrower: [['nova_thrower', 'proj.nova_orb', 'nova_lob', 'blast']],
  asteroid_golem: [['asteroid_golem', 'melee', 'golem_uppercut', 'blunt']],
  star_mortar: [['star_mortar', 'proj.mini_star', 'shot_star_mortar', 'blast']],
  antimatter_rifler: [['antimatter_rifler', 'proj.antimatter', 'shot_antimatter', 'laser']],
  bio_weaver: [['bio_weaver', 'fx.tendril_lash', 'tendril_flick', 'slash']],
  void_whisperer: [['void_whisperer', 'fx.void_ripple', 'void_whisper', 'laser']],
  star_fighter: [['star_fighter', 'proj.twin_laser', 'shot_twin_laser', 'laser']],
  swarm_matron: [['swarm_matron', 'proj.swarm_glob', 'matron_spit', 'blast']],
  gravity_sage: [['gravity_sage', 'proj.sage_orb', 'sage_orb', 'laser']],
  star_leviathan: [['star_leviathan', 'fx.song_wave', 'leviathan_song', 'blast'], ['riders', 'proj.moon_pellet', 'moon_spit', 'laser']],
  swarmling: [['swarmling', 'melee', 'swarm_bite', 'slash']],
  shard_spitter: [['shard_spitter', 'proj.shard', 'shot_shard', 'pierce']],
  event_horizon: [['event_horizon', 'fx.horizon_pulse', 'horizon_pulse', 'laser']],
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
  hide_shield: MODS.blunt, pelt_rager: MODS.blunt, boulder_hurler: MODS.rangedAA,
  hoplite: MODS.blunt, riveter: MODS.blunt, star_legionnaire: MODS.blunt,
  // W2 Bronze wave
  shield_bearer: MODS.blunt, belly_bowman: MODS.rangedAA,
  spear_hunter: MODS.meleeAA, pikeman: MODS.meleeAA, phalangite: MODS.meleeAA, graviton_halberdier: MODS.meleeAA,
  bazooka_trooper: MODS.rangedAA, rail_gunner: MODS.rail, harpoon_gunner: MODS.harpoon,
  grenadier: MODS.grenadier,
  flak_gun: MODS.flak,
  congreve_rack: MODS.congreve,
  // W3 Medieval wave: the Crossbowman's heavy bolts (armored ×1.25)
  squire_pair: MODS.blunt, flailman: MODS.blunt, warhammer_sergeant: MODS.meleeAA, crossbowman: [{ vs: 'armored', bp: 12500 }],
  // W4 Gunpowder wave: the Highlander's claymore (Infantry melee) and the Wall Gunner (ranged Anti-heavy)
  highlander: MODS.blunt, wall_gunner: MODS.rangedAA,
  // W5 Industrial wave: the pickaxe Pair and the mantlet Guard (Infantry melee), the Steam Driller (melee Anti-heavy)
  coal_miners: MODS.blunt, iron_mantlet: MODS.blunt, steam_driller: MODS.meleeAA,
  // W6 Modern wave: the sandbag Guard (Infantry melee) and the Sticky Bomber (melee Anti-heavy)
  sandbag_carrier: MODS.blunt, sticky_bomber: MODS.meleeAA,
  // W7 Future wave: the android Pair and the hardlight Guard (Infantry melee), the Plasma Lancer (melee Anti-heavy)
  android_pair: MODS.blunt, barrier_trooper: MODS.blunt, plasma_lancer: MODS.meleeAA,
  // W8 Cosmic wave: the Crystal Guard (Infantry melee), the Antimatter Rifler (ranged Anti-heavy)
  crystal_guard: MODS.blunt, antimatter_rifler: MODS.rangedAA,
};

/** A5 target priorities of first attacks ("priority armored", "priority air", ...); everything else `front`. */
const PRIORITY_BY_CARD: Record<string, string> = {
  spear_hunter: 'armored', pikeman: 'armored', grenadier: 'armored', bazooka_trooper: 'armored', rail_gunner: 'armored',
  searchlight_sniper: 'armored', flak_gun: 'air', gravity_well: 'densest',
  phalangite: 'armored', harpoon_gunner: 'armored', flare_spotter: 'armored', graviton_halberdier: 'armored', gorgon_bust: 'armored',
  // Grumpy Toad grabs "the nearest enemy ranged or support ground unit" first
  grumpy_toad: 'backline',
  boulder_hurler: 'armored',
  belly_bowman: 'armored',
  warhammer_sergeant: 'armored', grapple_crane: 'armored',
  wall_gunner: 'armored', carronade: 'armored',
  steam_driller: 'armored',
  sticky_bomber: 'armored', anti_tank_gun: 'armored', ghillie_sniper: 'backline',
  plasma_lancer: 'armored', tractor_beam: 'armored',
  antimatter_rifler: 'armored',
};

describe('A14.2 attack mapping, A2.6 mods and A5 priorities (every card)', () => {
  const cards = [...full.order.units, ...full.order.hiddenUnits, ...full.order.turrets];

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
      // A summon (X0 M3) costs 0 and keeps its group's pop, like a levy (it never uses pop).
      if (u?.summon) continue;
      expect(u?.pop, id).toBe(Math.floor((u?.cost ?? 0) / 25));
    }
  });

  it('turrets cost 150 / 175 for the two Commons, 250 for the Rare and the Epic (A2.8)', () => {
    for (const age of content.order.ages) {
      const ts = content.order.turrets.map((id) => content.turrets[id]).filter((t) => t?.age === age);
      // The original four first; X0 wave turrets: Commons 175, Rares 250 (CONTENT_PLAN 4).
      expect(ts.slice(0, 4).map((t) => [t?.rarity, t?.cost]), age).toEqual([['common', 150], ['common', 175], ['rare', 250], ['epic', 250]]);
      for (const t of ts.slice(4)) expect(t?.cost, t?.id).toBe(t?.rarity === 'common' ? 175 : 250);
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

  it('has the powers of the roster (48 plus the X0 waves) and nothing else', () => {
    expect(Object.keys(content.powers).sort()).toEqual(POWERS.map((r) => r[0]).sort());
  });

  it('encodes the buffs (8 frontmost own units)', () => {
    expect(content.powers.royal_decree?.effect).toEqual({
      kind: 'buffAll',
      maxTargets: 8,
      statuses: [
        { kind: 'damageBuff', magnitudeBp: 3500, durationMs: 15000 },
        { kind: 'speedBuff', magnitudeBp: 2000, durationMs: 15000 },
        { kind: 'attackSpeedBuff', magnitudeBp: 2500, durationMs: 15000 },
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
        { kind: 'shield', magnitudeBp: 0, durationMs: 8000, amount: 120 },
        { kind: 'damageBuff', magnitudeBp: 2500, durationMs: 8000 },
      ],
    });
  });

  /** The age's L1 Infantry Common, Heavy Common and non-Legendary Epic (A2.9.6 "I" and "H"). */
  const ageUnits = (age: AgeId) => {
    const us = Object.values(content.units).filter((u) => u.age === age && !u.hidden);
    const find = (group: string, rarity: string): UnitDef => {
      // The age's baselines are its starters (X0); the original Epic comes first.
      const u = us.find((x) => x.group === group && x.rarity === rarity && x.starter === true) ?? us.find((x) => x.group === group && x.rarity === rarity);
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
      // Whole-lane powers (H7) have their own budget (the next test).
      if (e.kind !== 'field' || pw.reach === 'lane') continue;
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

  it('whole-lane powers stay inside the lane budget: per unit ≤ 30% of the Infantry and ≤ 10% of the Heavy (A2.9.4, H7)', () => {
    const lane = Object.values(content.powers).filter((pw) => pw.reach === 'lane');
    expect(lane.length).toBeGreaterThan(0);
    for (const pw of lane) {
      const e = pw.effect;
      if (e.kind !== 'field') throw new Error(`${pw.id}: a lane power is a field`);
      const { i, h } = ageUnits(pw.age);
      const dmg = e.damagePerPulse ?? 0;
      expect(dmg * 100, pw.id).toBeLessThanOrEqual(30 * i.hp);
      expect(dmg * 100, pw.id).toBeLessThanOrEqual(10 * h.hp);
      expect(e.zone, pw.id).toBe(content.battle.laneLength);
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
