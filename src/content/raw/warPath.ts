/**
 * The War Path campaign, v0 data (DESIGN A18.7, ui-plan 6.4 "War Path v0 data"): one region per age
 * that exists (8), 10 levels each, 80 levels in all. Data only.
 *
 * Each region follows the A18.7.2 sawtooth: its role decides the tier offset and the window length
 * (1 = the region's age only, 2 = the previous age and its own, 3 for the Lieutenant, 4 for the boss;
 * never longer than the regions so far, so region 1 plays Stone only). The Generals are the ladder
 * Generals, the bosses those of A18.7.6 (Pip, Kettle, Moss, Boomsworth, Ada & Ivo, Rook, Tempest,
 * the Warden). Stone L1 and L2 are the onboarding matches (A8): the training match vs Old Grogg and
 * match 2 vs Pip; their rewards are the onboarding capsules, so their first clear pays no Amber.
 *
 * Not in v0 (fields left out, A18.7.10): side nodes, victory rules and mid-battle starts (replays do
 * not carry a victory rule yet), fixed loadouts, lane features, relics.
 */
import type { AgeId, CapsuleTier, CardId, FormatId } from '@/contracts/ids';
import type { Difficulty, GeneralId, ModifierId, StarGoal, WarPathLevel, WarPathRegion, WarPathRole, WarPathTables } from '../types';
import { WINDOW_CLOCKS, windowFormatId } from './economy';

/** Ages in map order (the 8-age map). */
const AGES: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

/** A18.7.2: role, tier offset and window length of levels 1-10. */
const SAWTOOTH: readonly { role: WarPathRole; tierOffset: number; window: number }[] = [
  { role: 'intro', tierOffset: -1, window: 1 },
  { role: 'practice', tierOffset: 0, window: 2 },
  { role: 'mix', tierOffset: 0, window: 2 },
  { role: 'feature', tierOffset: 0, window: 2 },
  { role: 'lieutenant', tierOffset: 1, window: 3 },
  { role: 'relief', tierOffset: -1, window: 1 },
  { role: 'ramp', tierOffset: 0, window: 2 },
  { role: 'puzzle', tierOffset: 1, window: 2 },
  { role: 'spike', tierOffset: 1, window: 2 },
  { role: 'boss', tierOffset: 2, window: 4 },
];

interface RegionRow {
  age: AgeId;
  /** A18.6.2 Normal base tier. */
  baseTier: number;
  /** The opponent's card level in this region (the boss plays one higher). */
  botLevel: number;
  /** The General of each level 1-10 (L5 the Lieutenant, L10 the boss). */
  generals: readonly GeneralId[];
  /** The relief level's fun modifier (A18.7.7: each modifier appears first in a relief level). */
  relief: ModifierId;
  /** The ramp level's modifier, or null. */
  ramp: ModifierId | null;
  /** Level 3's named Rare and the boss's named Epic (A18.7.8). */
  rare: CardId;
  epic: CardId;
  bossCapsule: CapsuleTier;
  /** The boss's extra fixed turret (A18.7.6), a turret of the region's age. */
  bossTurret: CardId;
}

const REGIONS: readonly RegionRow[] = [
  {
    age: 'stone',
    baseTier: 0,
    botLevel: 1,
    generals: ['grogg', 'pip', 'pip', 'kettle', 'kettle', 'pip', 'moss', 'kettle', 'moss', 'pip'],
    relief: 'gold_rush',
    ramp: null,
    rare: 'drum_shaman',
    epic: 'sabertooth',
    bossCapsule: 'bronze',
    bossTurret: 'rock_tosser',
  },
  {
    age: 'bronze',
    baseTier: 1,
    botLevel: 2,
    generals: ['pip', 'kettle', 'moss', 'pip', 'ledger', 'pip', 'moss', 'ledger', 'kettle', 'kettle'],
    relief: 'power_hour',
    ramp: null,
    rare: 'standard_bearer',
    epic: 'scorpion',
    bossCapsule: 'silver',
    bossTurret: 'archer_tower',
  },
  {
    age: 'medieval',
    baseTier: 2,
    botLevel: 3,
    generals: ['kettle', 'ledger', 'moss', 'kettle', 'boomsworth', 'pip', 'ledger', 'boomsworth', 'kettle', 'moss'],
    relief: 'heavy_metal',
    ramp: 'gold_rush',
    rare: 'friar',
    epic: 'battering_ram',
    bossCapsule: 'silver',
    bossTurret: 'crossbow_nest',
  },
  {
    age: 'gunpowder',
    baseTier: 3,
    botLevel: 4,
    generals: ['moss', 'ledger', 'kettle', 'moss', 'twins', 'pip', 'ledger', 'twins', 'kettle', 'boomsworth'],
    relief: 'glass_armies',
    ramp: 'fast_forward',
    rare: 'field_surgeon',
    epic: 'bronze_cannon',
    bossCapsule: 'silver',
    bossTurret: 'swivel_gun',
  },
  {
    age: 'industrial',
    baseTier: 4,
    botLevel: 5,
    generals: ['boomsworth', 'ledger', 'moss', 'kettle', 'rook', 'pip', 'boomsworth', 'rook', 'ledger', 'twins'],
    relief: 'gold_rush',
    ramp: 'sudden_siege',
    rare: 'harpoon_gunner',
    epic: 'sapper',
    bossCapsule: 'jade',
    bossTurret: 'gatling_gun',
  },
  {
    age: 'modern',
    baseTier: 5,
    botLevel: 6,
    generals: ['twins', 'boomsworth', 'ledger', 'moss', 'tempest', 'kettle', 'twins', 'tempest', 'boomsworth', 'rook'],
    relief: 'power_hour',
    ramp: 'heavy_metal',
    rare: 'bazooka_trooper',
    epic: 'gyrocopter',
    bossCapsule: 'jade',
    bossTurret: 'mg_nest',
  },
  {
    age: 'future',
    baseTier: 6,
    botLevel: 7,
    generals: ['rook', 'twins', 'boomsworth', 'ledger', 'rook', 'kettle', 'twins', 'rook', 'boomsworth', 'tempest'],
    relief: 'glass_armies',
    ramp: 'fast_forward',
    rare: 'rail_gunner',
    epic: 'emp_saboteur',
    bossCapsule: 'jade',
    bossTurret: 'pulse_laser',
  },
  {
    age: 'cosmic',
    baseTier: 7,
    botLevel: 8,
    generals: ['tempest', 'rook', 'twins', 'boomsworth', 'tempest', 'ledger', 'rook', 'twins', 'tempest', 'warden'],
    relief: 'gold_rush',
    ramp: 'sudden_siege',
    rare: 'graviton_halberdier',
    epic: 'warp_stalker',
    bossCapsule: 'aeon',
    bossTurret: 'ion_turret',
  },
];

/** A18.7.5: what each Stone to Medieval level teaches (a tip on the Level preview). */
const TEACHES: Readonly<Record<string, string>> = {
  'wp.stone.l01': 'basics',
  'wp.stone.l02': 'stance',
  'wp.stone.l03': 'turret',
  'wp.stone.l04': 'power',
  'wp.stone.l06': 'council',
  'wp.stone.l07': 'troops',
  'wp.stone.l08': 'defences',
  'wp.stone.l10': 'boss',
  'wp.bronze.l01': 'evolve',
  'wp.bronze.l03': 'troopsII',
  'wp.bronze.l06': 'command',
  'wp.medieval.l04': 'holdFlag',
};

/** First-clear Amber (A18.7.8): 40, 60 on Hard-marked levels. */
const AMBER = 40;
const AMBER_HARD = 60;
/** A boss base: +50% HP (A18.7.6). */
const BOSS_HP_BP = 5000;

/** "Win before" is 70% of the window's Final Bell, rounded down to 15 s. */
function winBefore(length: number): StarGoal {
  const bell = WINDOW_CLOCKS[length]?.finalBellMs ?? 360000;
  const ms = Math.floor((bell * 7) / 10 / 15000) * 15000;
  return { kind: 'winBefore', ms };
}

/** The disclosed ★★ goal by role (A18.7.4). */
function goalFor(role: WarPathRole, window: number): StarGoal {
  switch (role) {
    case 'intro':
    case 'ramp':
    case 'boss':
      return { kind: 'baseAbove', bp: 5000 };
    case 'feature':
      return { kind: 'baseAbove', bp: 7000 };
    case 'practice':
    case 'lieutenant':
      return winBefore(window);
    case 'mix':
    case 'spike':
      return { kind: 'noLastStand' };
    case 'relief':
      return { kind: 'powerHits', n: 3 };
    case 'puzzle':
      return { kind: 'noEconomy' };
  }
}

function levelId(age: AgeId, index: number): string {
  return `wp.${age}.l${String(index).padStart(2, '0')}`;
}

function buildLevels(): { regions: WarPathRegion[]; levels: Record<string, WarPathLevel>; order: string[] } {
  const regions: WarPathRegion[] = [];
  const levels: Record<string, WarPathLevel> = {};
  const order: string[] = [];
  REGIONS.forEach((r, ri) => {
    const ids: string[] = [];
    SAWTOOTH.forEach((s, li) => {
      const index = li + 1;
      const id = levelId(r.age, index);
      const length = Math.min(s.window, ri + 1);
      const start = AGES[ri - length + 1] as AgeId;
      const format: FormatId = windowFormatId(length, start);
      const onboarding = r.age === 'stone' && index <= 2 ? (index as 1 | 2) : null;
      const hard = s.role === 'lieutenant' || s.role === 'spike' || s.role === 'boss';
      const modifiers: ModifierId[] = s.role === 'relief' ? [r.relief] : s.role === 'ramp' && r.ramp ? [r.ramp] : [];
      levels[id] = {
        id,
        region: r.age,
        index,
        role: s.role,
        format,
        general: r.generals[li] as GeneralId,
        tierOffset: s.tierOffset,
        botLevel: s.role === 'boss' ? r.botLevel + 1 : r.botLevel,
        modifiers,
        goal2: goalFor(s.role, length),
        teaches: TEACHES[id] ?? null,
        reward: {
          amber: onboarding !== null ? 0 : hard ? AMBER_HARD : AMBER,
          capsule: s.role === 'boss' ? r.bossCapsule : null,
          card: index === 3 ? r.rare : s.role === 'boss' ? r.epic : null,
        },
        boss: s.role === 'boss' ? { baseHpBp: BOSS_HP_BP, extraTurret: r.bossTurret } : null,
        onboarding,
      };
      ids.push(id);
      order.push(id);
    });
    regions.push({ age: r.age, baseTier: r.baseTier, levels: ids });
  });
  return { regions, levels, order };
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert', 'legendary'];

export const warPath: WarPathTables = {
  ...buildLevels(),
  // A18.6.2: Easy −2, Normal 0, Hard +1, Expert +2, Legendary always X
  difficulty: { order: DIFFICULTIES, tierOffset: { easy: -2, normal: 0, hard: 1, expert: 2, legendary: 0 }, legendaryTier: 10, default: 'normal' },
  threeStarFrom: 'hard',
  tryEasyAfter: 3,
  // ui-plan 2.6 (owner decision 2026-09-30): wins in any mode open one new Home thing each; the
  // Ladder opens with the end of the onboarding (its two matches), since Home is the 1v1 hub
  unlocks: { army: 1, capsules: 2, modes: 3, customize: 4, progress: 5, ladder: 2, daily: 6 },
  goalsFromLevel: 5,
};
