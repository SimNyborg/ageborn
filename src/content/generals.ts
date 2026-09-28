/**
 * AI Generals, Echo of You and the Conquest board (DESIGN A6.10, A7.4). Every General is an AI and
 * every surface labels it as one (A7.1).
 *
 * Personal War Plans are our design (DESIGN names only the signatures). They follow A3: every card
 * from its age, no duplicates, 5 units, 2 turrets and a power per age, for all 8 ages (A17.13). Only The Warden brings
 * Legendaries (A6.8: "The Warden is the only exception"); ladder matchmaking still applies the A6.8
 * rarity allowance to every plan, and Echo mirrors the player's own plan.
 */
import type { Loadout } from '@/contracts/sim';
import type { AgeId, CardId } from '@/contracts/ids';
import type { GeneralDef, GeneralId, GeneralTables, GeneralWeights, Personality } from './types';

type U = CardId | null;
type Plan = Record<AgeId, Loadout>;

function lo(units: [U, U, U, U, U], turrets: [U, U], power: CardId): Loadout {
  return { units, turrets, power };
}

/** The Balanced brain's weights (all 50), used where a General has no weights of its own. */
const BALANCED: GeneralWeights = { aggr: 50, turret: 50, economy: 50, greed: 50, patience: 50, legendary: 50, hold: 50 };

function w(aggr: number, turret: number, economy: number, greed: number, patience: number, legendary: number, hold: number): GeneralWeights {
  return { aggr, turret, economy, greed, patience, legendary, hold };
}

interface GeneralInput {
  id: GeneralId;
  personality: Personality;
  tiers: [number, number] | null;
  weights: GeneralWeights;
  warPlan: Partial<Record<AgeId, Loadout>> | null;
  scripted?: boolean;
  mirror?: boolean;
  legendaryLevel?: number;
  counterWeightBp?: number;
  baseStartBp?: number;
  neverEvolves?: boolean;
  signatureCards?: CardId[];
  portraits?: number;
  disclosures?: boolean;
}

function general(g: GeneralInput): GeneralDef {
  return {
    id: g.id,
    personality: g.personality,
    tiers: g.tiers,
    weights: g.weights,
    scripted: g.scripted ?? false,
    mirror: g.mirror ?? false,
    warPlan: g.warPlan,
    legendaryLevel: g.legendaryLevel ?? null,
    counterWeightBp: g.counterWeightBp ?? 10000,
    baseStartBp: g.baseStartBp ?? 10000,
    neverEvolves: g.neverEvolves ?? false,
    signatureCards: g.signatureCards ?? [],
    portraits: g.portraits ?? 1,
    disclosureKeys: g.disclosures ? [`general.${g.id}.disclosure`] : [],
    nameKey: `general.${g.id}.name`,
    personalityKey: `general.${g.id}.personality`,
    signatureKey: `general.${g.id}.signature`,
    lineKey: `general.${g.id}.line`,
  };
}

const PIP: Plan = {
  stone: lo(['pebbler', 'bonker', 'tuskback', 'spear_hunter', 'drum_shaman'], ['rock_tosser', 'angry_beehive'], 'stampede'),
  bronze: lo(['javelineer', 'hoplite', 'war_chariot', 'phalangite', 'standard_bearer'], ['archer_tower', 'sun_mirror'], 'tidal_wave'),
  medieval: lo(['longbowman', 'footman', 'destrier_knight', 'pikeman', 'friar'], ['crossbow_nest', 'pitch_cauldron'], 'arrow_storm'),
  gunpowder: lo(['fusilier', 'corsair', 'cuirassier', 'grenadier', 'field_surgeon'], ['swivel_gun', 'grapeshot_gun'], 'smoke_screen'),
  industrial: lo(['carbineer', 'riveter', 'steam_golem', 'harpoon_gunner', 'flare_spotter'], ['gatling_gun', 'mortar_pit'], 'iron_horse'),
  modern: lo(['rifleman', 'trench_raider', 'tankette', 'bazooka_trooper', 'radio_operator'], ['mg_nest', 'flak_gun'], 'paratroopers'),
  future: lo(['pulse_trooper', 'photon_knight', 'walker_mech', 'rail_gunner', 'repair_drone'], ['pulse_laser', 'arc_coil'], 'orbital_lance'),
  cosmic: lo(['ion_ranger', 'star_legionnaire', 'hover_tank', 'graviton_halberdier', 'starwarden'], ['ion_turret', 'starburst_gun'], 'starfall'),
};

const KETTLE: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth'], ['angry_beehive', 'rock_tosser'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'standard_bearer'], ['sun_mirror', 'archer_tower'], 'aegis'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'battering_ram'], ['pitch_cauldron', 'crossbow_nest'], 'royal_decree'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon'], ['grapeshot_gun', 'swivel_gun'], 'smoke_screen'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'sapper'], ['gatling_gun', 'mortar_pit'], 'iron_horse'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter'], ['mg_nest', 'flak_gun'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur'], ['pulse_laser', 'arc_coil'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'warp_stalker'], ['ion_turret', 'starburst_gun'], 'starfall'),
};

const MOSS: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['log_roller', 'grumpy_toad'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'standard_bearer'], ['onager', 'gorgon_bust'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['trebuchet', 'pitch_cauldron'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon'], ['grapeshot_gun', 'chainshot_cannon'], 'smoke_screen'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'flare_spotter'], ['boiler_mortar', 'tesla_tower'], 'iron_horse'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'radio_operator'], ['howitzer', 'flak_gun'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'repair_drone'], ['gravity_well', 'arc_coil'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'starwarden'], ['starfall_battery', 'tachyon_lance'], 'starfall'),
};

const LEDGER: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['rock_tosser', 'angry_beehive'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'standard_bearer'], ['archer_tower', 'onager'], 'aegis'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['crossbow_nest', 'honk_ballista'], 'royal_decree'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'bronze_cannon'], ['swivel_gun', 'congreve_rack'], 'broadside'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'sapper'], ['gatling_gun', 'tesla_tower'], 'zeppelin_raid'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter'], ['mg_nest', 'searchlight_sniper'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur'], ['pulse_laser', 'plasma_mortar'], 'nanite_surge'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'warp_stalker'], ['ion_turret', 'tachyon_lance'], 'warp_strike'),
};

const BOOMSWORTH: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['rock_tosser', 'log_roller'], 'meteor_shower'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'scorpion'], ['onager', 'archer_tower'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['trebuchet', 'crossbow_nest'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'bronze_cannon'], ['congreve_rack', 'swivel_gun'], 'broadside'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'flare_spotter'], ['boiler_mortar', 'mortar_pit'], 'zeppelin_raid'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'radio_operator'], ['howitzer', 'mg_nest'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'repair_drone'], ['plasma_mortar', 'pulse_laser'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'starwarden'], ['starfall_battery', 'ion_turret'], 'starfall'),
};

const TWINS: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth'], ['rock_tosser', 'grumpy_toad'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'scorpion'], ['archer_tower', 'gorgon_bust'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['crossbow_nest', 'honk_ballista'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon'], ['swivel_gun', 'chainshot_cannon'], 'smoke_screen'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'sapper'], ['gatling_gun', 'tesla_tower'], 'iron_horse'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter'], ['flak_gun', 'searchlight_sniper'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur'], ['arc_coil', 'gravity_well'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'warp_stalker'], ['starburst_gun', 'tachyon_lance'], 'starfall'),
};

const ROOK: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['angry_beehive', 'grumpy_toad'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'scorpion'], ['sun_mirror', 'onager'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'battering_ram'], ['crossbow_nest', 'trebuchet'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'bronze_cannon'], ['swivel_gun', 'congreve_rack'], 'smoke_screen'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'flare_spotter'], ['mortar_pit', 'boiler_mortar'], 'iron_horse'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter'], ['flak_gun', 'howitzer'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur'], ['pulse_laser', 'gravity_well'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'starwarden'], ['ion_turret', 'starfall_battery'], 'starfall'),
};

const TEMPEST: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['rock_tosser', 'angry_beehive'], 'meteor_shower'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'standard_bearer'], ['archer_tower', 'gorgon_bust'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['crossbow_nest', 'honk_ballista'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon'], ['swivel_gun', 'chainshot_cannon'], 'broadside'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'flare_spotter'], ['gatling_gun', 'tesla_tower'], 'zeppelin_raid'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'radio_operator'], ['mg_nest', 'searchlight_sniper'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'repair_drone'], ['pulse_laser', 'gravity_well'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'starwarden'], ['ion_turret', 'tachyon_lance'], 'starfall'),
};

const WARDEN: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'mammoth_matriarch'], ['rock_tosser', 'grumpy_toad'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'bronze_colossus'], ['archer_tower', 'gorgon_bust'], 'aegis'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'ursa_paladin'], ['crossbow_nest', 'honk_ballista'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'balloon_admiral'], ['swivel_gun', 'chainshot_cannon'], 'broadside'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'land_dreadnought'], ['gatling_gun', 'tesla_tower'], 'zeppelin_raid'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'behemoth_tank'], ['flak_gun', 'searchlight_sniper'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'chrono_titan'], ['pulse_laser', 'gravity_well'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'mothership'], ['ion_turret', 'tachyon_lance'], 'warp_strike'),
};

/** Old Grogg only fights in the Stone Age: Training Dummies, then a Tuskback (A8). */
const GROGG: Partial<Plan> = {
  stone: lo(['training_dummy', 'tuskback', null, null, null], [null, null], 'stampede'),
};

/** A7.4 table order. */
const LIST: GeneralDef[] = [
  general({
    id: 'grogg', personality: 'tutorial', tiers: null, weights: BALANCED, warPlan: GROGG,
    scripted: true, baseStartBp: 9000, neverEvolves: true, signatureCards: ['training_dummy'], disclosures: true,
  }),
  general({ id: 'pip', personality: 'balanced', tiers: [0, 2], weights: w(50, 40, 30, 40, 30, 20, 20), warPlan: PIP }),
  general({ id: 'kettle', personality: 'rusher', tiers: [1, 5], weights: w(90, 15, 10, 20, 20, 30, 0), warPlan: KETTLE }),
  general({ id: 'moss', personality: 'turtle', tiers: [2, 4], weights: w(25, 90, 40, 40, 50, 30, 80), warPlan: MOSS }),
  general({ id: 'ledger', personality: 'greedy', tiers: [3, 6], weights: w(40, 40, 95, 95, 40, 40, 40), warPlan: LEDGER }),
  general({
    id: 'boomsworth', personality: 'artillery', tiers: [4, 7], weights: w(50, 70, 50, 50, 50, 40, 50), warPlan: BOOMSWORTH,
    signatureCards: ['trebuchet', 'bronze_cannon', 'howitzer', 'grenadier', 'scorpion', 'boiler_mortar', 'starfall_battery'],
  }),
  general({ id: 'twins', personality: 'counters', tiers: [5, 8], weights: w(60, 50, 50, 60, 60, 50, 40), warPlan: TWINS, portraits: 2 }),
  general({
    id: 'rook', personality: 'counterPicker', tiers: [6, 9], weights: w(60, 50, 50, 60, 50, 50, 30), warPlan: ROOK,
    counterWeightBp: 15000,
  }),
  general({ id: 'tempest', personality: 'powerTiming', tiers: [7, 9], weights: w(60, 40, 50, 70, 95, 50, 40), warPlan: TEMPEST }),
  general({
    id: 'warden', personality: 'boss', tiers: [10, 10], weights: w(70, 60, 60, 70, 80, 90, 40), warPlan: WARDEN,
    legendaryLevel: 9, disclosures: true,
    signatureCards: [
      'mammoth_matriarch', 'bronze_colossus', 'ursa_paladin', 'balloon_admiral', 'land_dreadnought', 'behemoth_tank', 'chrono_titan', 'mothership',
    ],
  }),
  general({ id: 'echo', personality: 'mirror', tiers: null, weights: BALANCED, warPlan: null, mirror: true }),
];

export const generals: GeneralTables = {
  order: LIST.map((g) => g.id),
  list: Object.fromEntries(LIST.map((g) => [g.id, g])) as Record<GeneralId, GeneralDef>,
  // A6.10
  conquest: {
    unlockArena: 3,
    // A17.18 owner decision: Conquest plays Standard War (6 ages, ~6:30)
    format: 'standard',
    board: [
      { general: 'pip', tier: 1, level: 1 },
      { general: 'kettle', tier: 2, level: 2 },
      { general: 'moss', tier: 3, level: 3 },
      { general: 'ledger', tier: 4, level: 4 },
      { general: 'boomsworth', tier: 5, level: 5 },
      { general: 'twins', tier: 6, level: 6 },
      { general: 'rook', tier: 7, level: 7 },
      { general: 'tempest', tier: 8, level: 8 },
      { general: 'warden', tier: 10, level: 9 },
    ],
    stars: [
      { star: 1, condition: { kind: 'win' }, reward: { kind: 'amber', amount: 200 } },
      { star: 2, condition: { kind: 'winBaseAbove', bp: 5000 }, reward: { kind: 'dust', amount: 100 } },
      // Standard War median 6:30 (A17.2): star 3 keeps the old ~0.86 × median ratio
      { star: 3, condition: { kind: 'winBefore', ms: 345000 }, reward: { kind: 'ageCapsule' } },
    ],
    milestones: [
      { stars: 9, capsule: 'jade', title: null },
      { stars: 18, capsule: 'jade', title: null },
      { stars: 27, capsule: 'aeon', title: 'conqueror' },
    ],
  },
  commanderPersonalities: ['pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest'],
};
