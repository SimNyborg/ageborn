/**
 * AI Generals, Echo of You and the Conquest board (DESIGN A6.10, A7.4). Every General is an AI and
 * every surface labels it as one (A7.1).
 *
 * Personal War Plans are our design (DESIGN names only the signatures). They follow A3: every card
 * from its age, no duplicates, 5 units, 2 turrets and a power per age. Only The Warden brings
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
  medieval: lo(['longbowman', 'footman', 'destrier_knight', 'pikeman', 'friar'], ['crossbow_nest', 'pitch_cauldron'], 'arrow_storm'),
  gunpowder: lo(['fusilier', 'corsair', 'cuirassier', 'grenadier', 'field_surgeon'], ['swivel_gun', 'grapeshot_gun'], 'smoke_screen'),
  modern: lo(['rifleman', 'trench_raider', 'tankette', 'bazooka_trooper', 'radio_operator'], ['mg_nest', 'flak_gun'], 'paratroopers'),
  future: lo(['pulse_trooper', 'photon_knight', 'walker_mech', 'rail_gunner', 'repair_drone'], ['pulse_laser', 'arc_coil'], 'orbital_lance'),
};

const KETTLE: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth'], ['angry_beehive', 'rock_tosser'], 'stampede'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'battering_ram'], ['pitch_cauldron', 'crossbow_nest'], 'royal_decree'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon'], ['grapeshot_gun', 'swivel_gun'], 'smoke_screen'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter'], ['mg_nest', 'flak_gun'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur'], ['pulse_laser', 'arc_coil'], 'orbital_lance'),
};

const MOSS: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['log_roller', 'grumpy_toad'], 'stampede'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['trebuchet', 'pitch_cauldron'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon'], ['grapeshot_gun', 'chainshot_cannon'], 'smoke_screen'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'radio_operator'], ['howitzer', 'flak_gun'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'repair_drone'], ['gravity_well', 'arc_coil'], 'orbital_lance'),
};

const LEDGER: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['rock_tosser', 'angry_beehive'], 'stampede'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['crossbow_nest', 'honk_ballista'], 'royal_decree'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'bronze_cannon'], ['swivel_gun', 'congreve_rack'], 'broadside'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter'], ['mg_nest', 'searchlight_sniper'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur'], ['pulse_laser', 'plasma_mortar'], 'nanite_surge'),
};

const BOOMSWORTH: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['rock_tosser', 'log_roller'], 'meteor_shower'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['trebuchet', 'crossbow_nest'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'bronze_cannon'], ['congreve_rack', 'swivel_gun'], 'broadside'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'radio_operator'], ['howitzer', 'mg_nest'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'repair_drone'], ['plasma_mortar', 'pulse_laser'], 'orbital_lance'),
};

const TWINS: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'sabertooth'], ['rock_tosser', 'grumpy_toad'], 'stampede'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['crossbow_nest', 'honk_ballista'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon'], ['swivel_gun', 'chainshot_cannon'], 'smoke_screen'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter'], ['flak_gun', 'searchlight_sniper'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur'], ['arc_coil', 'gravity_well'], 'orbital_lance'),
};

const ROOK: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['angry_beehive', 'grumpy_toad'], 'stampede'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'battering_ram'], ['crossbow_nest', 'trebuchet'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'bronze_cannon'], ['swivel_gun', 'congreve_rack'], 'smoke_screen'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'gyrocopter'], ['flak_gun', 'howitzer'], 'paratroopers'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'emp_saboteur'], ['pulse_laser', 'gravity_well'], 'orbital_lance'),
};

const TEMPEST: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman'], ['rock_tosser', 'angry_beehive'], 'meteor_shower'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'friar'], ['crossbow_nest', 'honk_ballista'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'field_surgeon'], ['swivel_gun', 'chainshot_cannon'], 'broadside'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'radio_operator'], ['mg_nest', 'searchlight_sniper'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'repair_drone'], ['pulse_laser', 'gravity_well'], 'orbital_lance'),
};

const WARDEN: Plan = {
  stone: lo(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'mammoth_matriarch'], ['rock_tosser', 'grumpy_toad'], 'stampede'),
  medieval: lo(['footman', 'longbowman', 'destrier_knight', 'pikeman', 'ursa_paladin'], ['crossbow_nest', 'honk_ballista'], 'arrow_storm'),
  gunpowder: lo(['corsair', 'fusilier', 'cuirassier', 'grenadier', 'balloon_admiral'], ['swivel_gun', 'chainshot_cannon'], 'broadside'),
  modern: lo(['trench_raider', 'rifleman', 'tankette', 'bazooka_trooper', 'behemoth_tank'], ['flak_gun', 'searchlight_sniper'], 'carpet_bomber'),
  future: lo(['photon_knight', 'pulse_trooper', 'walker_mech', 'rail_gunner', 'chrono_titan'], ['pulse_laser', 'gravity_well'], 'orbital_lance'),
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
    signatureCards: ['trebuchet', 'bronze_cannon', 'howitzer', 'grenadier'],
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
    signatureCards: ['mammoth_matriarch', 'ursa_paladin', 'balloon_admiral', 'behemoth_tank', 'chrono_titan'],
  }),
  general({ id: 'echo', personality: 'mirror', tiers: null, weights: BALANCED, warPlan: null, mirror: true }),
];

export const generals: GeneralTables = {
  order: LIST.map((g) => g.id),
  list: Object.fromEntries(LIST.map((g) => [g.id, g])) as Record<GeneralId, GeneralDef>,
  // A6.10
  conquest: {
    unlockArena: 3,
    format: 'full',
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
      { star: 3, condition: { kind: 'winBefore', ms: 360000 }, reward: { kind: 'ageCapsule' } },
    ],
    milestones: [
      { stars: 9, capsule: 'jade', title: null },
      { stars: 18, capsule: 'jade', title: null },
      { stars: 27, capsule: 'aeon', title: 'conqueror' },
    ],
  },
  commanderPersonalities: ['pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest'],
};
