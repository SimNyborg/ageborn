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
import { raw } from './raw';
import type { GeneralDef, GeneralId, GeneralTables, GeneralWeights, Personality } from './types';

type U = CardId | null;
type Plan = Record<AgeId, Loadout>;

/**
 * A General's age loadout (A2.9.1 two power slots): the named power goes into its own slot and the
 * age's starter of the other slot fills the rest (DESIGN A2.9.9: Generals play both slots).
 */
/**
 * A General's loadout: five troops (a sixth, X0, for a content-wave signature card), two turrets and one
 * named power (a second one, X0, for the other slot); the age's starter fills any slot left.
 */
function lo(units: [U, U, U, U, U] | [U, U, U, U, U, U], turrets: [U, U], power: CardId, power2?: CardId): Loadout {
  const def = raw.powers.find((p) => p.id === power);
  const def2 = power2 ? raw.powers.find((p) => p.id === power2) : undefined;
  const starter = (slot: 'home' | 'field'): CardId | null =>
    raw.powers.find((p) => p.age === def?.age && p.slot === slot && p.source === 'starter')?.id ?? null;
  const pick = (slot: 'home' | 'field'): CardId | null => (def?.slot === slot ? power : def2?.slot === slot ? (power2 ?? null) : starter(slot));
  return { units, turrets, powers: { home: pick('home'), field: pick('field') } };
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

/**
 * Pip, the onboarding General (A8 match 2, tiers 0-II): leans on Heavies and fields no Anti-heavy
 * card, so a new player's own Heavies are not hard-countered while match 2 teaches the answer to his
 * ("Heavies! Send Spear Hunters."). With the Anti-heavy numbers (owner feedback 2026-09-29) the
 * onboarding autopilot beat a Pip that had them 84% of 80 seeds (90% before); without them 94%.
 */
const PIP: Plan = {
  stone: lo(['pebbler', 'bonker', 'tuskback', null, 'drum_shaman'], ['rock_tosser', 'angry_beehive'], 'stampede'),
  bronze: lo(['javelineer', 'hoplite', 'war_chariot', null, 'standard_bearer'], ['archer_tower', 'sun_mirror'], 'tidal_wave'),
  medieval: lo(['longbowman', 'footman', 'destrier_knight', null, 'friar'], ['crossbow_nest', 'pitch_cauldron'], 'arrow_storm'),
  gunpowder: lo(['fusilier', 'corsair', 'cuirassier', null, 'field_surgeon'], ['swivel_gun', 'grapeshot_gun'], 'smoke_screen'),
  industrial: lo(['carbineer', 'riveter', 'steam_golem', null, 'flare_spotter'], ['gatling_gun', 'mortar_pit'], 'iron_horse'),
  modern: lo(['rifleman', 'trench_raider', 'tankette', null, 'radio_operator'], ['mg_nest', 'flak_gun'], 'paratroopers'),
  future: lo(['pulse_trooper', 'photon_knight', 'walker_mech', null, 'repair_drone'], ['pulse_laser', 'arc_coil'], 'orbital_lance'),
  cosmic: lo(['ion_ranger', 'star_legionnaire', 'hover_tank', null, 'starwarden'], ['ion_turret', 'starburst_gun'], 'starfall'),
};

const KETTLE: Plan = {
  stone: lo(['hunting_wolves', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth', 'torch_runner'], ['angry_beehive', 'rock_tosser'], 'stampede'),
  bronze: lo(['hoplite', 'rhodian_slingers', 'war_chariot', 'phalangite', 'amazon_rider', 'thracian_raider'], ['sun_mirror', 'archer_tower'], 'aegis'),
  medieval: lo(['squire_pair', 'longbowman', 'destrier_knight', 'pikeman', 'battering_ram', 'brigand'], ['pitch_cauldron', 'crossbow_nest'], 'royal_decree'),
  gunpowder: lo(['voltigeurs', 'corsair', 'cuirassier', 'grenadier', 'hussar', 'powder_monkey'], ['grapeshot_gun', 'swivel_gun'], 'smoke_screen'),
  industrial: lo(['coal_miners', 'carbineer', 'steam_golem', 'harpoon_gunner', 'alpine_climber', 'dispatch_rider'], ['gatling_gun', 'mortar_pit'], 'iron_horse'),
  modern: lo(['smg_squad', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter', 'commando'], ['mg_nest', 'flak_gun'], 'paratroopers'),
  future: lo(['android_pair', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'jetpack_trooper', 'hover_bike'], ['pulse_laser', 'arc_coil'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'warp_stalker'], ['ion_turret', 'starburst_gun'], 'starfall'),
};

const MOSS: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'herbalist', 'hide_shield'], ['log_roller', 'grumpy_toad'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'standard_bearer', 'shield_bearer'], ['onager', 'gorgon_bust'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'herald', 'crossbowman'], ['trebuchet', 'pitch_cauldron'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'drummer_boy', 'highlander'], ['grapeshot_gun', 'carronade'], 'smoke_screen'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'bandmaster', 'iron_mantlet'], ['steam_hammer', 'tesla_tower'], 'iron_horse'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'combat_medic', 'sandbag_carrier'], ['howitzer', 'flak_gun'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'overclock_engineer', 'barrier_trooper'], ['cryo_pod', 'gravity_well'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'starwarden'], ['starfall_battery', 'tachyon_lance'], 'starfall'),
};

const LEDGER: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman', 'beast_caller'], ['rock_tosser', 'angry_beehive'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'aulos_piper', 'wooden_horse'], ['archer_tower', 'onager'], 'aegis'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'kennel_master', 'siege_belfry'], ['crossbow_nest', 'honk_ballista'], 'royal_decree'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'bronze_cannon', 'drummer_boy'], ['swivel_gun', 'congreve_rack'], 'broadside'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'clockwork_tinker', 'sapper'], ['gatling_gun', 'tesla_tower'], 'zeppelin_raid'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter', 'bulldozer'], ['mg_nest', 'searchlight_sniper'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'holo_projector', 'emp_saboteur'], ['pulse_laser', 'plasma_mortar'], 'nanite_surge'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'warp_stalker'], ['ion_turret', 'tachyon_lance'], 'warp_strike'),
};

const BOOMSWORTH: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman', 'atlatl_thrower'], ['rock_tosser', 'sapling_sling'], 'meteor_shower'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'scorpion', 'cretan_archer'], ['onager', 'polybolos'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'mangonel_cart', 'yeoman_archer'], ['trebuchet', 'springald'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'coehorn_crew', 'cuirassier', 'grenadier', 'bronze_cannon', 'rocket_cart'], ['sea_mortar', 'swivel_gun'], 'broadside'),
  industrial: lo(['riveter', 'trench_mortar', 'steam_golem', 'harpoon_gunner', 'flare_spotter', 'armoured_car'], ['boiler_mortar', 'mortar_pit'], 'zeppelin_raid'),
  modern: lo(['trench_raider', 'mortar_team', 'tankette', 'bazooka_trooper', 'radio_operator', 'dive_bomber'], ['howitzer', 'rocket_battery'], 'carpet_bomber'),
  future: lo(['photon_knight', 'arc_lobber', 'walker_mech', 'rail_gunner', 'repair_drone', 'particle_cannon'], ['plasma_mortar', 'pulse_laser'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'starwarden'], ['starfall_battery', 'ion_turret'], 'starfall'),
};

const TWINS: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth', 'boulder_hurler'], ['rock_tosser', 'grumpy_toad'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'tragic_chorus', 'belly_bowman'], ['archer_tower', 'gorgon_bust'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar', 'warhammer_sergeant'], ['crossbow_nest', 'honk_ballista'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'bagpiper', 'wall_gunner'], ['swivel_gun', 'chainshot_cannon'], 'smoke_screen'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'sapper', 'steam_driller'], ['gatling_gun', 'tesla_tower'], 'iron_horse'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter', 'sticky_bomber'], ['flak_gun', 'searchlight_sniper'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur', 'plasma_lancer'], ['arc_coil', 'gravity_well'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'warp_stalker'], ['starburst_gun', 'tachyon_lance'], 'starfall'),
};

const ROOK: Plan = {
  stone: lo(['bonker', 'pebbler', 'woolly_rhino', 'spear_hunter', 'drum_shaman', 'bolas_thrower'], ['quill_porcupine', 'grumpy_toad'], 'stampede'),
  bronze: lo(['hoplite', 'javelineer', 'war_elephant', 'phalangite', 'scorpion', 'discus_thrower'], ['net_caster', 'onager'], 'tidal_wave'),
  medieval: lo(['footman', 'longbowman', 'greatsword_knight', 'pikeman', 'battering_ram', 'flailman'], ['grapple_crane', 'trebuchet'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'dragoon', 'grenadier', 'bronze_cannon', 'blunderbuss'], ['carronade', 'congreve_rack'], 'smoke_screen'),
  industrial: lo(['riveter', 'carbineer', 'steam_tractor', 'harpoon_gunner', 'flare_spotter', 'bomb_bowler'], ['rivet_spitter', 'boiler_mortar'], 'iron_horse'),
  modern: lo(['trench_raider', 'rifleman', 'assault_gun', 'bazooka_trooper', 'ghillie_sniper', 'rifle_grenadier'], ['anti_tank_gun', 'howitzer'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'crab_mech', 'rail_gunner', 'emp_saboteur', 'needle_gunner'], ['tractor_beam', 'gravity_well'], 'orbital_lance'),
  cosmic: lo(['star_legionnaire', 'ion_ranger', 'hover_tank', 'graviton_halberdier', 'starwarden'], ['ion_turret', 'starfall_battery'], 'starfall'),
};

const TEMPEST: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman', 'rockfall_shaman'], ['rock_tosser', 'angry_beehive'], 'tangle_vines', 'pebble_hail'),
  bronze: lo(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'standard_bearer', 'minotaur'], ['archer_tower', 'gorgon_bust'], 'charybdis', 'sandstorm'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar', 'alchemist'], ['crossbow_nest', 'honk_ballista'], 'great_bell', 'longbow_volley'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon', 'mesmerist'], ['swivel_gun', 'chainshot_cannon'], 'cannon_salute', 'rocket_volley'),
  industrial: lo(['riveter', 'carbineer', 'steam_golem', 'harpoon_gunner', 'flare_spotter', 'spark_scientist'], ['gatling_gun', 'tesla_tower'], 'great_magnet', 'shrapnel_shells'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'radio_operator', 'bulldog_sergeant'], ['mg_nest', 'searchlight_sniper'], 'concussion_shells', 'creeping_barrage'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'repair_drone', 'overload_android'], ['pulse_laser', 'gravity_well'], 'nano_mesh', 'target_painter'),
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
  // Owner feedback 2026-09-28: Quick Battle and Skirmish pick a named difficulty, each an AI tier.
  difficulty: {
    order: ['easy', 'normal', 'hard', 'expert', 'legendary'],
    tiers: { easy: 2, normal: 4, hard: 6, expert: 8, legendary: 10 },
    default: 'normal',
  },
};
