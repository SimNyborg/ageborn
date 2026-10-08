/**
 * Concrete types for the content tables that `CompiledContent` (src/contracts/content.ts) types as
 * `unknown`, plus the compiled integer view and the counter-matrix file (DESIGN B4, B15).
 *
 * `contracts` may not import `content` (DESIGN B2), so the contract leaves these slots open and this
 * module fills them in. Consumers that may import `content` (meta, ui, tools) use {@link Content} or
 * {@link asContent} to get typed access.
 *
 * Units: table units everywhere (gold, Amber, Dust, trophies, ms, lu), percentages and odds in bp
 * (10,000 = 100%). Types only; no runtime values.
 */
import type { CompiledContent, FortKind } from '@/contracts/content';
import type { Loadout } from '@/contracts/sim';
import type {
  AgeId,
  BaseEmoteId,
  CapsuleTier,
  CardId,
  Foil,
  FormatId,
  Rarity,
  RoleGroup,
  SkinId,
  SkinRarity,
  VisualId,
} from '@/contracts/ids';
import type { AvatarSlot, AvatarTint, PendingCapsule } from '@/contracts/save';
import type { RawBattleRules } from './raw/types';

// ---------------------------------------------------------------------------------------------
// Rarities, upgrades, Dust, foils (DESIGN A5.1, A6.4 step 5, A6.6, A6.7)
// ---------------------------------------------------------------------------------------------

/** One card rarity (DESIGN A6.6, A6.7). */
export interface RarityDef {
  id: Rarity;
  /** 0 = Common ... 3 = Legendary. */
  index: number;
  /** Copies to reach level i + 2: index 0 is L1 → L2, index 8 is L9 → L10 (A6.6). */
  upgradeCopies: number[];
  /** Codex points per upgrade of a card of this rarity (A6.7). */
  codexPoints: number;
  /** Dust for one copy received past L10 (A6.6). */
  dustPerExtraCopy: number;
  /** Dust to craft one copy; crafting also unlocks an unowned card (A6.6). */
  craftCopyDust: number;
  nameKey: string;
}

/** One skin rarity (DESIGN A5.8, A6.4 Wardrobe Crate, A6.6 Dust). */
export interface SkinRarityDef {
  id: SkinRarity;
  /** Wardrobe Crate odds (A6.4). */
  crateOddsBp: number;
  /** Dust for a duplicate skin (A6.6). */
  duplicateDust: number;
  /** Dust to craft a crate skin (A6.6). */
  craftDust: number;
  nameKey: string;
}

/** One foil frame (DESIGN A5.8, A6.4 step 5). `rank` orders foils: a foil unlocks if it beats the owned one. */
export interface FoilDef {
  id: Foil;
  rank: number;
  /** Chance per capsule stack on the 10,000-bp scale (A6.4 step 5); 0 for `none`. */
  rollBp: number;
  nameKey: string;
}

export interface Rarities {
  /** Common, Rare, Epic, Legendary. */
  order: Rarity[];
  cards: Record<Rarity, RarityDef>;
  /** Amber to reach level i + 2, shared by all rarities (A6.6). */
  upgradeAmber: number[];
  skinOrder: SkinRarity[];
  skins: Record<SkinRarity, SkinRarityDef>;
  /** Best first: Holo, Silver foil, Bronze foil, none (A6.4 step 5). */
  foilOrder: Foil[];
  foils: Record<Foil, FoilDef>;
  /** In-battle level trims on the ground ring: bronze L4-6, silver L7-9, gold L10 (A6.6). */
  levelTrims: { trim: 'bronze' | 'silver' | 'gold'; fromLevel: number; visualId: VisualId }[];
}

// ---------------------------------------------------------------------------------------------
// Time Capsules, pity, charges, onboarding script, Wardrobe Crates (DESIGN A6.3, A6.4, A6.5)
// ---------------------------------------------------------------------------------------------

/** One capsule tier (DESIGN A6.4 tier table). */
export interface CapsuleTierDef {
  id: CapsuleTier;
  /** 0 = Clay ... 6 = Aeon; the climb count is the tier index above the start tier (A10). */
  index: number;
  stacks: number;
  /** Copies per stack by the stack's rarity (A6.4 step 3). */
  copies: Record<Rarity, number>;
  /** Stack rarities fixed before the random roll, in order (A6.4 step 1.1). */
  guaranteed: Rarity[];
  /**
   * Chance that one guaranteed Rare stack becomes Legendary (the removed A6.4 step 1.3); 0 on every
   * tier since the 2026-09-29 ladder, kept so the odds sheet can show it only when above 0.
   */
  rareToLegendaryBp: number;
  /** Gold, Platinum, Aeon: the guaranteed Legendaries prefer unowned cards (A6.4). */
  legendaryUnownedFirst: boolean;
  /** Chance of a capsule skin (A6.4 step 7): Gold 30%, Platinum and Aeon 100%. */
  skinChanceBp: number;
  /** The capsule skin's lowest rarity; `rare` = full Wardrobe odds, Aeon `epic` (A6.4 step 7). */
  skinMinRarity: SkinRarity;
  /** Copies of the 2nd and later guaranteed Legendary stacks (Platinum and Aeon 1; A6.4 step 3). */
  extraLegendaryCopies: number;
  /** Aeon: holds an Aeon Collection item (a `capsuleTier` cosmetic source) while the set is incomplete (A6.4 step 8). */
  exclusiveItems: boolean;
  /** Bonus Dust (Jade and Gold +100, Platinum +200, Aeon +500; A6.4). */
  bonusDust: number;
  amber: number;
  /** DESIGN's "Expected copies" column ×100 (3.4 → 340), checked against the table by tests. */
  expectedCopiesCenti: number;
  nameKey: string;
}

/** How a capsule kind is granted and presented (DESIGN A6.4 "Other capsule types", A10). */
export interface CapsuleKindDef {
  kind: PendingCapsule['kind'];
  /** The climb starts here; null = fixed tier with no climb, the reveal starts at step 4 (A6.4, A10). */
  climbFrom: CapsuleTier | null;
  /** Counts toward pity and the script index (A6.5: every opened capsule except Age Unlock). */
  countsForPity: boolean;
  nameKey: string;
}

/** One step of the onboarding capsule script (DESIGN A6.5). Overrides the bag and uses no charges. */
export interface ScriptedCapsuleDef {
  /** 1-based capsule number. */
  capsule: number;
  tier: CapsuleTier;
  /** Guaranteed cards, each revealed as NEW. */
  cards: CardId[];
  /** Capsule 4: the first Epic, random and unowned, from the pool. */
  randomUnownedEpic: boolean;
  /** Capsule 5: the full Legendary walkout. */
  fullWalkout: boolean;
}

/** The size of one tier in the all-ages table (DESIGN A6.4, X0): what changes once every age drops. */
export interface CapsuleTierSize {
  stacks: number;
  copies: Record<Rarity, number>;
  amber: number;
  /** Expected copies ×100, checked against the table by tests (as `CapsuleTierDef.expectedCopiesCenti`). */
  expectedCopiesCenti: number;
}

/**
 * The all-ages capsule table (content re-tune 2026-10-04, CONTENT_PLAN 8 option B; DESIGN A6.4): from
 * `fromArena` (1-based), where all eight ages and nearly the whole 208-card pool drop, every capsule
 * tier holds these stacks, copies and Amber instead of `tiers`' values, so time to max a card stays on
 * the A6.9 targets with a pool 2.4 times the size. Guarantees, odds, pity, Dust, skins and the bag do
 * not change. Arenas below `fromArena` and the onboarding script keep `tiers` exactly.
 */
export interface AllAgesCapsules {
  fromArena: number;
  /** Stacks of an Age Capsule from `fromArena` (one more than `ageCapsule.stacks`). */
  ageCapsuleStacks: number;
  tiers: Record<CapsuleTier, CapsuleTierSize>;
}

export interface CapsuleTables {
  /** Clay → Aeon: the ladder, lowest first; a tier's index is its place here. */
  tierOrder: CapsuleTier[];
  /** The tier table of Arenas 1-2 and the onboarding script (A6.4); see `allAges` for Arena 3 and up. */
  tiers: Record<CapsuleTier, CapsuleTierDef>;
  /** Stacks, copies and Amber from Arena 3 on (A6.4 all-ages table); read through `capsuleTierFor`. */
  allAges: AllAgesCapsules;
  /** Remaining stacks roll these rarities (A6.4 step 1.2). */
  stackRollBp: Record<Rarity, number>;
  /** Win Capsule shuffle bag contents (A6.4); the bag size is the sum of the counts (200), never a constant. */
  bag: Record<CapsuleTier, number>;
  /** Supply Capsule odds (A6.4). */
  dailyOddsBp: Record<CapsuleTier, number>;
  /**
   * The highest tier the 4 main strikes climb to (A10); each tier above it is one summit strike
   * (Platinum 1, Aeon 2).
   */
  summitAbove: CapsuleTier;
  /** Legendary catch-up once every Legendary of the pool is owned (A6.4 step 4). */
  legendaryCatchUp: boolean;
  /** Dust an `exclusiveItems` capsule adds once its collection is complete (A6.4 step 8). */
  exclusiveCompleteDust: number;
  /** Dust price to craft a `capsuleTier` cosmetic after the first capsule of that tier (A6.4, A18.9.4). */
  exclusiveCraftDust: number;
  /** Unowned cards weigh ×3 when picking stack cards (A6.4 step 4). */
  unownedWeight: number;
  pity: {
    /** At least one Epic stack every 10 capsules (A6.5). */
    epicEvery: number;
    /** No Legendary bonus while n ≤ 25 (A6.5). */
    legendaryFreeUntil: number;
    /** For 26 ≤ n ≤ 39: chance (n − 25) × 5% (A6.5). */
    legendaryStepBp: number;
    /** Capsule n = 40 guarantees one (A6.5). */
    legendaryGuaranteeAt: number;
    /** At least one unowned card every 5 capsules (A6.5). */
    newCardEvery: number;
    /** Wardrobe: Epic or better at least every 5 crates, Legendary at least every 25 (A6.5). */
    wardrobeEpicEvery: number;
    wardrobeLegendaryEvery: number;
  };
  /**
   * The Sundial (A6.3, A15.4; capsule charges until 2026-09-30): `start` ready capsules on a new save,
   * one more every `regenMs`, holding up to `max`; the first `freeCapsules` capsules of a save need none.
   */
  charges: { start: number; max: number; regenMs: number; freeCapsules: number };
  /** Pips that make a Clay capsule (A6.3): Ladder matches that bring no capsule add one. */
  clayMeterPips: number;
  /** Daily Capsule (A6.3): first after capsule 2 is opened, then one per day, banking up to 3. */
  daily: { firstAfterCapsule: number; bankMax: number };
  /**
   * Supply Capsule (A15.4): every `matchesPerCapsule`-th finished match uses one banked allowance; the
   * allowance banks up to `allowanceMax`. `accrues` false (retired 2026-09-30, folded into the Sundial):
   * no new allowance is added, an allowance banked before still converts.
   */
  supply: { matchesPerCapsule: number; allowanceMax: number; accrues: boolean };
  /** All daily timers reset at local 04:00 (A6.3). */
  resetHour: number;
  kinds: Record<PendingCapsule['kind'], CapsuleKindDef>;
  /** Age Capsule: Silver-sized (4 stacks, Silver copies), one age picked on grant, ≥ 1 Epic stack (A6.4). */
  ageCapsule: { stacks: number; copiesTier: CapsuleTier; guaranteed: Rarity[] };
  /** Codex Capsule: Silver tier, fixed (A6.4). */
  codexCapsuleTier: CapsuleTier;
  /** Age Unlock Capsule: the age's AA Rare plus 4 copies of each of its 3 common units (A6.3). */
  ageUnlock: { rareCopies: number; commonCopies: number };
  /** Onboarding script, capsules 1-5 (A6.5). */
  script: ScriptedCapsuleDef[];
  /** Wardrobe Crate: 1 skin, no duplicate until all crate skins of that rarity are owned (A6.4). */
  wardrobe: { noDuplicateUntilAllOwned: boolean };
}

// ---------------------------------------------------------------------------------------------
// Arenas, ladder results, matchmaking (DESIGN A6.3, A6.8)
// ---------------------------------------------------------------------------------------------

/** An arena gate reward (DESIGN A6.3 "Gate rewards"). */
export type GateReward =
  | { kind: 'starterPlan' }
  | { kind: 'banner'; banner: string }
  | { kind: 'capsule'; tier: CapsuleTier }
  | { kind: 'ageUnlock'; ages: AgeId[] }
  | { kind: 'conquestUnlock' }
  | { kind: 'skin'; skin: SkinId }
  | { kind: 'wardenJoins' };

export type ArenaId =
  | 'tar_pits'
  | 'frostfang'
  | 'kingsmoat'
  | 'powder_bay'
  | 'iron_front'
  | 'neon_harbor'
  | 'orbital_ring'
  | 'chrono_rift';

/** One arena (DESIGN A6.3 arena table). */
export interface ArenaDef {
  /** 1-based, as in DESIGN. */
  index: number;
  id: ArenaId;
  /** Trophies at the gate. */
  trophies: number;
  ladderFormats: FormatId[];
  /** Ages in the capsule drop pool. */
  dropAges: AgeId[];
  /** False in Arena 1: the 1% Legendary stack roll moves to Common (A6.4 step 1.2). */
  randomLegendaries: boolean;
  /** Inclusive tier range, 0 = tier 0 ... 10 = tier X (A6.3, A7.3). */
  botTiers: [number, number];
  botLevel: number;
  /** Highest rarity a procedural bot fields (A6.8): Commons and Rares in Arena 1, Epics from Arena 2. */
  botMaxRarity: Exclude<Rarity, 'legendary'>;
  /** Chance that The Warden is the ladder opponent (A7.4: 1 in 5 Arena 8 matches). */
  wardenChanceBp: number;
  gateRewards: GateReward[];
  /** Ground and weather layer (A14.1). */
  groundVisualId: VisualId;
  nameKey: string;
}

/** Ladder, Skirmish and matchmaking rules (DESIGN A6.3, A6.8). */
export interface LadderWin {
  trophies: number;
  amber: number;
  amberWithoutCharge: number;
}

export interface LadderRules {
  /** A ladder match with no format, or below `winByFormat.fromTrophies` (A6.3). */
  win: LadderWin;
  /** Rewards by format from `fromTrophies` (A15.8: 0 since 2026-10-03; Last Base Standing included). */
  winByFormat: { fromTrophies: number; formats: Partial<Record<FormatId, LadderWin>> };
  loss: { trophies: number; amber: number; noLossBelowTrophies: number };
  draw: { trophies: number; amber: number };
  /** After 3 ladder losses in a row, the next opponent is one tier lower (A6.3). */
  lossProtection: { streak: number; tierDrop: number };
  skirmishWinAmber: number;
  /** Hidden Elo (A6.8): tier = clamp(round((MMR − 870) / 100), arena min, arena max). */
  mmr: { start: number; k: number; tierRatingBase: number; tierRatingStep: number; tierOffset: number; tierDivisor: number };
  maxTier: number;
  /** First 20 matches: +10 points bot mistake rate (A6.8). */
  newPlayer: { matches: number; mistakeBonusBp: number };
  /** Procedural bot level roll −1 / 0 / +1 (A6.8). */
  levelRollBp: { minus: number; zero: number; plus: number };
  /** Skirmish "Standard levels" toggle (A6.8). */
  standardLevel: number;
}

export interface ArenaTables {
  list: ArenaDef[];
  ladder: LadderRules;
}

// ---------------------------------------------------------------------------------------------
// Trophy Road (DESIGN A6.3)
// ---------------------------------------------------------------------------------------------

export type RoadReward =
  | { kind: 'amber'; amount: number }
  | { kind: 'dust'; amount: number }
  | { kind: 'power'; card: CardId }
  | { kind: 'capsule'; tier: CapsuleTier }
  | { kind: 'wardrobe' }
  /** The arena gate rewards of `ArenaDef.gateRewards` for that arena index. */
  | { kind: 'gate'; arena: number }
  /** A Fort card of a region's fort set (A16.14.6): the fallback of its War Path level; 60 Amber when owned. */
  | { kind: 'fort'; card: CardId };

export interface RoadNode {
  /** 0-based position on the road. */
  index: number;
  trophies: number;
  rewards: RoadReward[];
}

export interface TrophyRoad {
  nodes: RoadNode[];
  /** Amber nodes pay base + perHundred × trophies / 100 (A6.3). */
  amberFormula: { base: number; perHundred: number };
}

// ---------------------------------------------------------------------------------------------
// Generals, Echo, Conquest (DESIGN A6.10, A7.4)
// ---------------------------------------------------------------------------------------------

export type GeneralId =
  | 'grogg'
  | 'pip'
  | 'kettle'
  | 'moss'
  | 'ledger'
  | 'boomsworth'
  | 'twins'
  | 'rook'
  | 'tempest'
  | 'warden'
  | 'echo';

export type Personality =
  | 'tutorial'
  | 'balanced'
  | 'rusher'
  | 'turtle'
  | 'greedy'
  | 'artillery'
  | 'counters'
  | 'counterPicker'
  | 'powerTiming'
  | 'boss'
  | 'mirror';

/** Personality weights 0-100 (DESIGN A7.2, A7.4); same shape as `BotProfile.weights`. */
export interface GeneralWeights {
  aggr: number;
  turret: number;
  economy: number;
  greed: number;
  patience: number;
  legendary: number;
  hold: number;
}

/** One AI General (DESIGN A7.4). Every surface labels them AI (A7.1). */
export interface GeneralDef {
  id: GeneralId;
  personality: Personality;
  /** Inclusive tier range; null for Old Grogg (Training) and Echo (any tier, chosen in Skirmish). */
  tiers: [number, number] | null;
  /** For Old Grogg (scripted) and Echo (derived) these are the Balanced defaults, unused by their brains. */
  weights: GeneralWeights;
  /** Old Grogg follows the tutorial script instead of the utility brain (A7.4, A8). */
  scripted: boolean;
  /** Echo mirrors the player's active War Plan (A7.4). */
  mirror: boolean;
  /**
   * The General's personal War Plan (A6.10), used in Conquest and as the base of its ladder plan.
   * Ladder matchmaking still applies the A6.8 rarity allowance. Null for Echo.
   */
  warPlan: Partial<Record<AgeId, Loadout>> | null;
  /** Fixed card level of this General's Legendaries (The Warden: L9, disclosed on VS; A7.4). */
  legendaryLevel: number | null;
  /** Counter weight multiplier in bp (Rook: ×1.5; A7.4). 10,000 = normal. */
  counterWeightBp: number;
  /** Own base starts at this share of max HP (Old Grogg: 50%, disclosed "Training match"; A7.4). */
  baseStartBp: number;
  /** Old Grogg never evolves (A7.4). */
  neverEvolves: boolean;
  /** Cards named in the Signature column (A7.4), for the VS screen and bot openings. */
  signatureCards: CardId[];
  /** Two portraits on one bot (Ada & Ivo; A7.4). */
  portraits: number;
  /** What the VS screen must disclose (A7.1, A7.4), as i18n keys. */
  disclosureKeys: string[];
  nameKey: string;
  personalityKey: string;
  signatureKey: string;
  /** The VS line (A7.4). */
  lineKey: string;
}

/** Conquest board (DESIGN A6.10). */
export interface ConquestRules {
  unlockArena: number;
  format: FormatId;
  /** Board order; each opens after the previous one is beaten once. */
  board: { general: GeneralId; tier: number; level: number }[];
  stars: {
    star: 1 | 2 | 3;
    /** Star 1 = win; star 2 = win with own base above `baseAboveBp`; star 3 = win before `beforeMs`. */
    condition: { kind: 'win' } | { kind: 'winBaseAbove'; bp: number } | { kind: 'winBefore'; ms: number };
    reward: { kind: 'amber'; amount: number } | { kind: 'dust'; amount: number } | { kind: 'ageCapsule' };
  }[];
  milestones: { stars: number; capsule: CapsuleTier; title: string | null }[];
}

/**
 * The difficulty picker of Quick Battle and Skirmish (owner feedback 2026-09-28): five named steps,
 * each an AI tier (A7.3). The player picks one; the bot never gets the new-player mistakes then.
 */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'legendary';

export interface DifficultyTable {
  order: Difficulty[];
  /** The AI tier (0-X) each difficulty plays at. */
  tiers: Record<Difficulty, number>;
  /** The choice before the player has picked one. */
  default: Difficulty;
}

export interface GeneralTables {
  order: GeneralId[];
  list: Record<GeneralId, GeneralDef>;
  conquest: ConquestRules;
  /** Personalities procedural AI Commanders may copy (A7.4). */
  commanderPersonalities: GeneralId[];
  /** Quick Battle and Skirmish difficulties (owner feedback 2026-09-28). */
  difficulty: DifficultyTable;
}

// ---------------------------------------------------------------------------------------------
// Names (DESIGN A6.1, A7.4)
// ---------------------------------------------------------------------------------------------

export interface NameTables {
  /** Every AI Commander name starts with this prefix (A7.1, A7.4). */
  aiPrefix: string;
  /** "Brakka": one start and one end syllable. */
  commanderFirst: { start: string[]; end: string[] };
  /** "Stonejaw": one start and one end part. */
  commanderLast: { start: string[]; end: string[] };
  /** Auto profile names: prefix, a dash and `digits` digits ("Chief-4821"; A6.1). */
  player: { prefixes: string[]; digits: number };
  /** The simulated online players of the Ladder (owner decision 2026-10-07; meta `onlinePlayer.ts`). */
  online: OnlineNameTables;
}

/**
 * Gamer tags for the simulated online players (owner decision 2026-10-07): our own family-friendly
 * words and common given names, never a real person, a brand or a General (tests check the lists).
 */
export interface OnlineNameTables {
  /** "Swift", "Sleepy": the first word of a two-word tag. */
  adjectives: string[];
  /** "Otter", "Pancake": the second word, or a tag of its own with a number. */
  nouns: string[];
  /** Common given names by region, with the national flags (`nationalFlag` item ids) most often beside them. */
  given: { flags: string[]; names: string[] }[];
  /** Number suffixes ("7", "21", "404"); vetted: never a rude or hateful code. */
  numbers: string[];
  /** "Sir", "Lady": a playful title in front of a noun ("SirPancake"). */
  titles: string[];
  /** Letters a tag may never contain, even across word joins ("xXMooseXx"): such a tag is drawn again. */
  blocked: string[];
  /** The longest tag (the HUD nameplate and the plate keep it whole). */
  maxLength: number;
  /** The search pairs within this many trophies of the player, inside the player's arena. */
  trophySpread: number;
}

// ---------------------------------------------------------------------------------------------
// Quests and Codex (DESIGN A6.7)
// ---------------------------------------------------------------------------------------------

/** What a quest counts. Match-based metrics come from `MatchStats` (B3, B15 meta.ts). */
export type QuestMetric =
  | 'wins'
  | 'battles'
  | 'unitsTrained'
  | 'evolves'
  | 'fastFinalAge'
  | 'turretKills'
  | 'winsWithoutTreasury'
  | 'powerMultiHit'
  | 'baseDamage'
  | 'heavyKillsByAA'
  | 'winsWithLegendary'
  | 'fastBaseKill'
  | 'winsAfterLastStand'
  | 'upgrades'
  | 'dailyChallengeWins'
  /** War Chest: counting wins (A15.5). */
  | 'countingWins';

export type QuestReward =
  | { kind: 'amber'; amount: number }
  | { kind: 'dust'; amount: number }
  | { kind: 'ageCapsule' }
  | { kind: 'wardrobe' };

export interface QuestDef {
  id: string;
  metric: QuestMetric;
  /** Progress needed. */
  target: number;
  rewards: QuestReward[];
  /** Skirmish matches count only for "Play 3 battles" and "Train 30 units" (A6.7). */
  skirmishCounts: boolean;
  /** Offered only if the player owns a Legendary (A6.7). */
  requiresLegendary: boolean;
  /** Offered only from this match number on (Last Stand quest: match 5; A6.7). */
  fromMatch: number;
  /** fastFinalAge: reach the final age before this time per format (A6.7). */
  beforeMsByFormat?: Partial<Record<FormatId, number>>;
  /** fastBaseKill: destroy a base before this time (A6.7). */
  beforeMs?: number;
  /** powerMultiHit: enemies hit by one Age Power (A6.7). */
  minHits?: number;
  /** Draw weight (A6.7, A15.4): 1 for activity quests, 2 for skill and variety quests. */
  weight: number;
  nameKey: string;
}

export interface CodexRules {
  /** Points per Codex Level (A6.7); points per upgrade live in `rarities.cards[r].codexPoints`. */
  pointsPerLevel: number;
  amberPerLevel: number;
  /** Silver Codex Capsule at levels 5, 15, 25 ... (A6.7). */
  capsule: { firstLevel: number; every: number; tier: CapsuleTier };
  /** Wardrobe Crate at levels 10, 20, 30 ... (A6.7). */
  wardrobe: { firstLevel: number; every: number };
}

export interface QuestTables {
  daily: QuestDef[];
  /**
   * The War Chest (A15.5): `target` is `winsPerChest`; it counts counting wins, grants its rewards at
   * once when full and restarts at 0. It never resets by time.
   */
  weekly: QuestDef;
  /** New quests per day (at 04:00) and the number of active quests at the front of the queue. */
  dailyCount: number;
  freeRerolls: number;
  /** The quest queue holds up to this many (A15.4). */
  queueMax: number;
  resetHour: number;
  codex: CodexRules;
}

// ---------------------------------------------------------------------------------------------
// Daily Challenge modifiers (DESIGN A9.1)
// ---------------------------------------------------------------------------------------------

export type ModifierId = 'gold_rush' | 'glass_armies' | 'power_hour' | 'fast_forward' | 'heavy_metal' | 'sudden_siege';

/** A symmetric rule change, applied to both sides (A7.1, A9.1). */
export type ModifierEffect =
  | { kind: 'passiveGold'; bp: number }
  | { kind: 'unitHp'; bp: number }
  /** Power reload +bp (rate bonus) and price −bp (A2.9.2-A2.9.3: Power Hour +10,000 / 5,000). */
  | { kind: 'powers'; reloadBp: number; costBp: number }
  | { kind: 'xpThreshold'; bp: number }
  | { kind: 'unitCost'; groups: RoleGroup[]; bp: number }
  | { kind: 'siegeShift'; ms: number };

export interface DailyModifierDef {
  id: ModifierId;
  /** 1-based, as in DESIGN A9.1. */
  index: number;
  effect: ModifierEffect;
  nameKey: string;
  descKey: string;
}

export interface DailyModifierTables {
  order: ModifierId[];
  list: Record<ModifierId, DailyModifierDef>;
  /** Daily Challenge rules (A9.1). */
  challenge: {
    format: FormatId;
    /** A win that uses a banked Daily reward gives an Age Capsule; other wins pay `winAmber` (A15.7). */
    firstWinReward: 'ageCapsule';
    winAmber: number;
    resetHour: number;
    /** The Daily reward bank: +1 at each reset, up to `bankMax`; a new save starts with `bankStart`. */
    bankMax: number;
    bankStart: number;
    /** Every card on both sides plays at this level (A15.7). */
    standardLevel: number;
    /** AI tier per difficulty (A15.7). */
    difficulties: Record<DailyDifficulty, number>;
    /** The opponent pool: the 8 ladder Generals from Pip Quickstep to Madame Tempest (A15.7). */
    generals: string[];
  };
}

export type DailyDifficulty = 'recruit' | 'veteran' | 'warlord';

// ---------------------------------------------------------------------------------------------
// Hidden feats (DESIGN A15.10)
// ---------------------------------------------------------------------------------------------

/** The closed list of feat predicates: only what the 12 v1 feats need. A new kind is code. */
export type FeatPredicate =
  /** A unit of `killerAge` kills a unit of `victimAge`. */
  | { kind: 'crossAgeKill'; killerAge: AgeId; victimAge: AgeId }
  /** One cast of `power` kills at least `min` units of `victimAges`. */
  | { kind: 'castKills'; power: CardId; victimAges: AgeId[]; min: number }
  /** Win a match of `formats` without evolving past `maxAge`. */
  | { kind: 'winMaxAge'; formats: FormatId[]; maxAge: AgeId }
  /** Win a match of `formats` without building a turret. */
  | { kind: 'winNoTurret'; formats: FormatId[] }
  /** Win at the Final Bell by at most `maxMarginBp` base HP. */
  | { kind: 'winFinalBellMargin'; maxMarginBp: number }
  /** One Last Stand volley kills at least `min` units. */
  | { kind: 'lastStandKills'; min: number }
  /** Reach `age` before `beforeMs` in a match of `formats`. */
  | { kind: 'reachAgeBefore'; age: AgeId; beforeMs: number; formats: FormatId[] }
  /** Win after the opponent was at least `ages` ages ahead. */
  | { kind: 'winAfterAgesBehind'; ages: number }
  /** Win a match of `formats` with only Common cards and default powers in the plan. */
  | { kind: 'winCommonsOnly'; formats: FormatId[] }
  /** Win after the own base fell below `belowBp`. */
  | { kind: 'winAfterBaseBelow'; belowBp: number }
  /** A unit of `unitAge` deals the final blow to an enemy base that is in `baseAge`. */
  | { kind: 'finalBaseBlow'; unitAge: AgeId; baseAge: AgeId }
  /** Living units from `ages` different ages on the own side at once. */
  | { kind: 'agesAlive'; ages: number };

export interface FeatDef {
  id: string;
  predicate: FeatPredicate;
  /** Dust paid once when found (A15.10). */
  dust: number;
  /** A title id granted with the feat, or null. */
  title: string | null;
  /** "Obscure" feats are listed last. */
  obscure: boolean;
  nameKey: string;
  riddleKey: string;
  hintKey: string;
}

export interface FeatTables {
  order: string[];
  list: Record<string, FeatDef>;
}

// ---------------------------------------------------------------------------------------------
// Cosmetics (DESIGN A5.8)
// ---------------------------------------------------------------------------------------------

export interface BannerDef {
  id: string;
  /** Arena whose gate gives it; 1 = given at the start (Tar Pit). */
  arena: number;
  nameKey: string;
}

export interface FrameDef {
  id: string;
  codexLevel: number;
  nameKey: string;
}

export type TitleUnlock =
  | { kind: 'start' }
  | { kind: 'firstWin' }
  | { kind: 'reachAge'; age: AgeId }
  | { kind: 'ownCard'; card: CardId }
  | { kind: 'codexLevel'; level: number }
  | { kind: 'arena'; arena: number }
  | { kind: 'winAfterLastStand' }
  | { kind: 'finalAgeBefore'; format: FormatId; ms: number }
  | { kind: 'wins'; count: number }
  | { kind: 'beatGeneral'; general: GeneralId }
  | { kind: 'conquestStars'; stars: number }
  /** Collection milestones (content re-tune 2026-10-04): own `count` troop and turret cards. */
  | { kind: 'cardsOwned'; count: number }
  /** Own every collectable troop and turret card (the Card Album's cards, released ones only). */
  | { kind: 'albumComplete' }
  /** `count` collectable troop and turret cards at the level cap. */
  | { kind: 'cardsMaxed'; count: number }
  /** Every collectable troop and turret card at the level cap. */
  | { kind: 'collectionMaxed' }
  /** A hidden feat's title (A15.10). */
  | { kind: 'feat'; feat: string };

export interface TitleDef {
  id: string;
  unlock: TitleUnlock;
  nameKey: string;
}

export interface EmoteDef {
  id: BaseEmoteId;
  /** Bots use only GG, Salute and Thumbs up (A7.2). */
  botAllowed: boolean;
  nameKey: string;
}

/**
 * The cosmetic collections (DESIGN A18.9.4). An item's key is `<collection>.<id>`. `backdrop` is the
 * battle background skin (A18.9.4 "Backdrop skins", owner request 2026-09-30): a themed restyle of your
 * half's sky and parallax layers in every age.
 */
export type CosmeticCollection = 'emote' | 'quote' | 'baseFlag' | 'nationalFlag' | 'baseSkin' | 'decoration' | 'backdrop' | 'avatar';

/**
 * Where a collection item comes from (A18.9.4: all earned, nothing sold). `capsule` and `crate` items
 * are the disclosed drop pools of Time Capsules and the Wardrobe Crate, and can also be crafted with
 * Dust; the others are granted by state (a claimed Trophy Road node, a found feat, an arena reached,
 * a Codex Level). `warPath` items arrive with the War Path (A18.7) and are shown as "coming later".
 */
export type CosmeticSource =
  | { kind: 'start' }
  | { kind: 'capsule' }
  | { kind: 'crate' }
  | { kind: 'road'; trophies: number }
  | { kind: 'feat'; feat: string }
  | { kind: 'arena'; arena: number }
  | { kind: 'codexLevel'; level: number }
  | { kind: 'warPath' }
  /** Avatar wearables (owner request 2026-10-07): the first clear of an age's War Path boss on Normal or harder. */
  | { kind: 'warPathBoss'; age: AgeId }
  /** Avatar wearables: every level of an age's War Path region at 3 stars (its star chest). */
  | { kind: 'warPathStars'; age: AgeId }
  /** Avatar wearables: a title is owned (the collection milestones). */
  | { kind: 'title'; title: string }
  /** A top-tier exclusive (the Aeon Collection, A6.4 step 8): from that tier's capsules, craftable after the first one. */
  | { kind: 'capsuleTier'; tier: CapsuleTier };

export type DecorationKind = 'statue' | 'banner' | 'brazier' | 'trophy' | 'plant';

/** One collection item (A18.9.4 "id, collection, rarity, source, art id"). */
export interface CosmeticItemDef {
  id: string;
  collection: CosmeticCollection;
  rarity: Rarity;
  source: CosmeticSource;
  /** Manifest id `cosmetic.<collection>.<id>` (A14.4); the visuals draw it. */
  art: string;
  nameKey: string;
  /** Quotes: the fixed line (`cosmetic.quote.<id>.text`). */
  textKey?: string;
  /** Emotes: an age theme or `general`. */
  theme?: AgeId | 'general';
  /** Base skins: the one age the skin restyles. */
  age?: AgeId;
  /** Decorations: what it is. */
  kind?: DecorationKind;
  /** National flags: ISO 3166 code (`gb-eng` for England), for search and sorting only. */
  country?: string;
  /** Avatar wearables: the creator slot the item fills. */
  slot?: AvatarSlot;
}

/**
 * One part of the avatar creator ("Make your General", owner request 2026-10-07, AUDIT §6). Starter
 * parts belong to everyone; wearables are earned only (their `collection: 'avatar'` items carry the
 * source and rarity) and never sold. The UI draws each id (`src/ui/components/avatar`).
 */
export interface AvatarPartDef {
  id: string;
  slot: AvatarSlot;
  rarity: 'starter' | Rarity;
  /** Starter parts: `start`; wearables: the earned source (also on the collection item). */
  source: CosmeticSource;
  nameKey: string;
  /** The age a wearable belongs to (War Path sources, themed items). */
  age?: AgeId;
}

/** A fixed look (AI Generals): slot → part id and tint indices. */
export interface AvatarLookDef {
  look: Partial<Record<AvatarSlot, string>>;
  tints: Record<AvatarTint, number>;
}

/** The avatar creator's tables. */
export interface AvatarTables {
  /** Slots in creator order. */
  slots: AvatarSlot[];
  parts: AvatarPartDef[];
  /** How many colours each tint has (indices into the UI palette). */
  tints: Record<AvatarTint, number>;
  /** The tint each slot's tile row offers. */
  tintOf: Partial<Record<AvatarSlot, AvatarTint>>;
  /** Slots that may be empty (their `<slot>_none` part). */
  optional: AvatarSlot[];
  /**
   * The AI Generals' fixed looks, built from the same parts (A7.1: every portrait still shows the AI
   * label). Ada & Ivo have two (`twins` and `twins_b`).
   */
  generals: Record<string, AvatarLookDef>;
}

/** Disclosed drop tables of the collections (A18.9.4, A15.3 honesty: odds shown on every screen). */
export interface CosmeticDrops {
  /** Chance that a Time Capsule of a tier holds one collection item, bp. Script and Age Unlock capsules never do. */
  capsuleChanceBp: Record<CapsuleTier, number>;
  /** The item's rarity in a Time Capsule, bp (sums to 10,000). */
  capsuleRarityBp: Record<Rarity, number>;
  /** Every Wardrobe Crate holds one collection item next to its skin; its rarity, bp (sums to 10,000). */
  crateRarityBp: Record<Rarity, number>;
  /** Dust for a duplicate (only once every item of that pool and rarity is owned). */
  duplicateDust: Record<Rarity, number>;
  /** Dust price to craft a `capsule` or `crate` item. */
  craftDust: Record<Rarity, number>;
}

export interface CosmeticCollections {
  /** Every collection item, in display order per collection. */
  items: CosmeticItemDef[];
  drops: CosmeticDrops;
  /** Battle wheel sizes: emotes and quotes (A9.2 emote wheel). */
  wheel: { emotes: number; quotes: number };
  /** Extra cooldown between two quotes, ms (the sim's emote cooldown applies to every emote and quote). */
  quoteCooldownMs: number;
  /** Base decoration anchors: fixed spots that never cover mounts or the HP bar. */
  decorationAnchors: number;
  /** A new profile's equipped items (keys). */
  defaults: {
    emotes: string[];
    quotes: string[];
    baseFlag: string | null;
    nationalFlag: string | null;
    decorations: (string | null)[];
    /** The battle backdrop skin; null is each age's own classic sky. */
    backdrop: string | null;
  };
}

export interface Cosmetics {
  banners: BannerDef[];
  frames: FrameDef[];
  titles: TitleDef[];
  emotes: EmoteDef[];
  /** A new profile's look (A5.8: Tar Pit banner and Recruit title at the start; no frame until Codex 5). */
  defaults: { banner: string; frame: string; title: string };
  /** Emotes, quotes, base and national flags, base skins, decorations and backdrops (A18.9.4). */
  collections: CosmeticCollections;
  /** The avatar creator's parts (owner request 2026-10-07). */
  avatar: AvatarTables;
}

// ---------------------------------------------------------------------------------------------
// Compiled integer view (DESIGN B3 integer units, B4 Compilation)
// ---------------------------------------------------------------------------------------------

/** One attack in B3 integer units. */
export interface IntAttack {
  /** Centi-HP at level 1. */
  damage: number;
  /** Centi-HP against bases, or null to use `damage` (A2.7). */
  vsBaseDamage: number | null;
  intervalTicks: number;
  /** round(intervalTicks × windupPct / 100) at the base interval (A2.7 Attack cycle). */
  windupTicks: number;
  /** Milli-lu. */
  range: number;
  /** Milli-lu; 0 when the attack has no minimum range. */
  minRange: number;
  /** Milli-lu per tick; null for melee and instant attacks. */
  projectileSpeed: number | null;
  instant: boolean;
}

/** One unit in B3 integer units. Level scaling is applied by the sim (A5.1). */
export interface IntUnit {
  /** Centi-HP at level 1. */
  hp: number;
  /** Milli-lu per tick. */
  speed: number;
  /** Collision width in milli-lu. */
  width: number;
  trainTicks: number;
  pop: number;
  /** Milli-gold. */
  cost: number;
  /** Kill bounty and loss XP in milli-units (A2.3, A2.4, A5.1). Underdog adds `underdogBp` on top. */
  bounty: { gold: number; xp: number; lossXp: number; powerGold: number };
  attacks: IntAttack[];
}

export interface IntTurret {
  /** Milli-gold. */
  cost: number;
  /** Milli-gold refunded on sale (A2.3). */
  sellRefund: number;
  attack: IntAttack;
}

/** B3 integer units for every card, precomputed by `compile.ts` (DESIGN B4 Compilation). */
export interface IntegerTables {
  units: Record<CardId, IntUnit>;
  turrets: Record<CardId, IntTurret>;
  /** Base max HP per age in centi-HP (A2.2). */
  baseHp: Record<AgeId, number>;
  /** XP thresholds in milli-XP; null in the last age (A2.4). */
  xpToNext: Record<AgeId, number | null>;
}

// ---------------------------------------------------------------------------------------------
// Counter matrix file (DESIGN B4 Counter matrix)
// ---------------------------------------------------------------------------------------------

/** One duel pair's setup and outcome (the dev page re-runs duels on demand to show them). */
export interface DuelRecord {
  a: CardId;
  b: CardId;
  countA: number;
  countB: number;
  /** HP left as a share of starting HP, bp, averaged over both side assignments. */
  hpLeftA: number;
  hpLeftB: number;
  /** Ticks until one side was wiped or the time limit hit, averaged over both side assignments. */
  ticks: number;
}

/** `src/content/generated/counters.json`. */
export interface CounterFile {
  /** Bumped when the file layout changes. */
  format: 1;
  /** Duel engine version; bumped whenever the duel rules change (src/content/counters/duel.ts). */
  engine: number;
  /** Hash of every input the duels read; a mismatch means the file is stale (B4: CI fails). */
  inputHash: string;
  /** Collectable unit ids, in content order. */
  units: CardId[];
  /** M[a][b] in bp: 5,000 = even, 10,000 = a wins untouched (B4). */
  matrixBp: Record<CardId, Record<CardId, number>>;
}

// ---------------------------------------------------------------------------------------------
// The whole compiled content
// ---------------------------------------------------------------------------------------------

/** Display order of every collection, so screens never depend on object key order. */
export interface ContentOrder {
  ages: AgeId[];
  formats: FormatId[];
  /** Collectable units in DESIGN table order (per age: 3 Commons, AA Rare, Support Rare, Epic, Legendary). */
  units: CardId[];
  /** Hidden units such as the Training Dummy. */
  hiddenUnits: CardId[];
  turrets: CardId[];
  powers: CardId[];
  /** Fort cards in table order (A16.14.4: per age Wall, Tower, Camp, Trap). */
  forts: CardId[];
  /** The hidden units forts bring (A16.14.8): levies, then the fort twins. Never collectable. */
  fortUnits: CardId[];
  skins: SkinId[];
  /**
   * The release gate (`release.ts`): every unit, turret, power, fort and skin id with `released: false`
   * (or a skin of such a card), sorted. These ids are in the records but in none of the lists above,
   * so players and bots never meet them; dev tools and the schema read them from here.
   */
  unreleased: string[];
}

/**
 * `CompiledContent` with its `unknown` slots typed, plus the integer view and display order.
 * Structurally a `CompiledContent`, so it can be passed wherever the contract is expected.
 */
export interface Content extends CompiledContent {
  rarities: Rarities;
  capsules: CapsuleTables;
  arenas: ArenaTables;
  trophyRoad: TrophyRoad;
  generals: GeneralTables;
  names: NameTables;
  quests: QuestTables;
  dailyModifiers: DailyModifierTables;
  cosmetics: Cosmetics;
  feats: FeatTables;
  /** The War Path campaign (A18.7). */
  warPath: WarPathTables;
  /** X0: units, turrets, powers and forts per age by rarity, slot and kind (`rosterShape.ts`). */
  rosterShape: RosterShape;
  /** X0: the arena (1-based) from which a content-wave card drops (`cardArena.ts`); absent = its age's arena. */
  cardArena: Readonly<Record<CardId, number>>;
  int: IntegerTables;
  order: ContentOrder;
  /** A2.1-A2.11 and A5.1 battle numbers that `EconomyRules` has no field for (from `raw/economy.ts`). */
  battle: RawBattleRules;
}

/** The meta tables compiled next to the battle tables (the typed `unknown` slots of the contract). */
export type MetaTables = Pick<
  Content,
  | 'rarities'
  | 'capsules'
  | 'arenas'
  | 'trophyRoad'
  | 'generals'
  | 'names'
  | 'quests'
  | 'dailyModifiers'
  | 'cosmetics'
  | 'feats'
  | 'warPath'
  | 'rosterShape'
  | 'cardArena'
>;

/** X0: one age's roster shape (CONTENT_PLAN 2): counts by rarity, slot and kind. */
export interface AgeRosterShape {
  units: Record<Rarity, number>;
  turrets: { common: number; rare: number; epic: number };
  powers: { home: number; field: number };
  forts: Record<FortKind, number>;
}

export type RosterShape = Record<AgeId, AgeRosterShape>;

// ---------------------------------------------------------------------------------------------
// War Path (DESIGN A18.7, ui-plan 6.4)
// ---------------------------------------------------------------------------------------------

/** A level's role in its region's sawtooth (A18.7.2). */
export type WarPathRole = 'intro' | 'practice' | 'mix' | 'feature' | 'lieutenant' | 'relief' | 'ramp' | 'puzzle' | 'spike' | 'boss' | 'side';

/**
 * The disclosed ★★ goal of a level (A18.7.4), read from the match stats. ★★★ is the same goal on
 * Hard or harder.
 */
export type StarGoal =
  /** Win with your base above `bp` of its HP. */
  | { kind: 'baseAbove'; bp: number }
  /** Win before `ms` on the match clock. */
  | { kind: 'winBefore'; ms: number }
  /** Win without the Last Stand. */
  | { kind: 'noLastStand' }
  /** Win without Economy research. */
  | { kind: 'noEconomy' }
  /** Hit at least `n` enemies with one Age Power. */
  | { kind: 'powerHits'; n: number };

/** What a first clear pays (A18.7.8). */
export interface WarPathReward {
  amber: number;
  /** A fixed capsule of this tier (bosses). */
  capsule: CapsuleTier | null;
  /** A named card (level 3: a Rare of the region's age; the boss: an Epic). */
  card: CardId | null;
}

export interface WarPathLevel {
  /** `wp.<age>.l01` ... `l10`, stable forever (A18.7.1). */
  id: string;
  region: AgeId;
  /** 1-10 in the region. */
  index: number;
  role: WarPathRole;
  /** The age window and its clocks (a content `FormatId`). */
  format: FormatId;
  /** Labelled AI (A7.1). */
  general: GeneralId;
  /** Added to the region's base tier and the difficulty offset (A18.6.2), clamped to [0, 10]. */
  tierOffset: number;
  /** The opponent's card level (A6.8). */
  botLevel: number;
  /** Disclosed symmetric modifiers (A18.7.7). */
  modifiers: ModifierId[];
  goal2: StarGoal;
  /** What the level teaches (a `warPath.teach.<id>` tip), if anything (A18.7.5). */
  teaches: string | null;
  reward: WarPathReward;
  /** Boss base: +HP and one extra fixed turret, disclosed (A18.7.6). */
  boss: { baseHpBp: number; extraTurret: CardId } | null;
  /** The onboarding match this level is while onboarding runs (Stone L1 and L2, A8). */
  onboarding: 1 | 2 | null;
  /**
   * X0 side nodes (A18.7.1, CONTENT_PLAN 6): an optional level `wp.<age>.s1` or `s2` that opens once its
   * region's level `after` is beaten. It is never part of the main path (`order`), so it never blocks
   * progress; its first clear grants the region's side-node power (s1) or fort variant (s2).
   */
  side?: { n: 1 | 2; after: number };
}

export interface WarPathRegion {
  age: AgeId;
  /** The Normal base tier of the region (A18.6.2). */
  baseTier: number;
  /** Level ids in order. */
  levels: string[];
  /** X0: the region's side nodes (`wp.<age>.s1`, `s2`), once its content wave has shipped. */
  sides?: string[];
}

export interface WarPathTables {
  regions: WarPathRegion[];
  levels: Record<string, WarPathLevel>;
  /** Every level id in map order. */
  order: string[];
  /** A18.6.2: the tier offset of each difficulty; Legendary always plays at `legendaryTier`. */
  difficulty: { order: Difficulty[]; tierOffset: Record<Difficulty, number>; legendaryTier: number; default: Difficulty };
  /** ★★★ needs this difficulty or harder (A18.7.4). */
  threeStarFrom: Difficulty;
  /** "Try Easy" after this many losses in a row (A18.7.4). */
  tryEasyAfter: number;
  /** Home features and the War Path levels whose first clear opens them (ui-plan 2.6). */
  unlocks: Record<WarPathUnlock, number>;
  /** The difficulty control and the ★★/★★★ goals show from this level on, or once a level is beaten (2.6). */
  goalsFromLevel: number;
}

/** Home features that open one at a time along the War Path (ui-plan 2.6). */
export type WarPathUnlock = 'army' | 'capsules' | 'modes' | 'customize' | 'progress' | 'ladder' | 'daily';
