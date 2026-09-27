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
import type { CompiledContent } from '@/contracts/content';
import type { Loadout } from '@/contracts/sim';
import type {
  AgeId,
  CapsuleTier,
  CardId,
  EmoteId,
  Foil,
  FormatId,
  Rarity,
  RoleGroup,
  SkinId,
  SkinRarity,
  VisualId,
} from '@/contracts/ids';
import type { PendingCapsule } from '@/contracts/save';
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
  /** 0 = Clay ... 4 = Aeon; the climb count is the tier index above the start tier (A10). */
  index: number;
  stacks: number;
  /** Copies per stack by the stack's rarity (A6.4 step 3). */
  copies: Record<Rarity, number>;
  /** Stack rarities fixed before the random roll, in order (A6.4 step 1.1). */
  guaranteed: Rarity[];
  /** Jade: chance that one guaranteed Rare stack becomes Legendary (A6.4 step 1.3). */
  rareToLegendaryBp: number;
  /** Aeon: the guaranteed Legendary prefers an unowned card (A6.4). */
  legendaryUnownedFirst: boolean;
  /** Aeon: chance of a bonus skin at Wardrobe odds (A6.4). */
  skinChanceBp: number;
  /** Jade: +100 Dust (A6.4). */
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

export interface CapsuleTables {
  /** Clay → Aeon. */
  tierOrder: CapsuleTier[];
  tiers: Record<CapsuleTier, CapsuleTierDef>;
  /** Remaining stacks roll these rarities (A6.4 step 1.2). */
  stackRollBp: Record<Rarity, number>;
  /** Win Capsule shuffle bag contents, 100 slots (A6.4). */
  bag: Record<CapsuleTier, number>;
  /** Daily Capsule odds (A6.4). */
  dailyOddsBp: Record<CapsuleTier, number>;
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
  /** Ladder capsule charges (A6.3). */
  charges: { start: number; max: number; regenMs: number; freeCapsules: number };
  /** Pips that make a Clay capsule (A6.3). */
  clayMeterPips: number;
  /** Daily Capsule (A6.3): first after capsule 2 is opened, then one per day, banking up to 3. */
  daily: { firstAfterCapsule: number; bankMax: number };
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
export interface LadderRules {
  win: { trophies: number; amber: number; amberWithoutCharge: number };
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
  | { kind: 'gate'; arena: number };

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

export interface GeneralTables {
  order: GeneralId[];
  list: Record<GeneralId, GeneralDef>;
  conquest: ConquestRules;
  /** Personalities procedural AI Commanders may copy (A7.4). */
  commanderPersonalities: GeneralId[];
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
  | 'dailyChallengeWins';

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
  weekly: QuestDef;
  dailyCount: number;
  freeRerolls: number;
  bankMax: number;
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
  | { kind: 'powerCharge'; bp: number }
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
    /** The first win of the day gives an Age Capsule; other wins pay 20 Amber. */
    firstWinReward: 'ageCapsule';
    winAmber: number;
    resetHour: number;
  };
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
  | { kind: 'conquestStars'; stars: number };

export interface TitleDef {
  id: string;
  unlock: TitleUnlock;
  nameKey: string;
}

export interface EmoteDef {
  id: EmoteId;
  /** Bots use only GG, Salute and Thumbs up (A7.2). */
  botAllowed: boolean;
  nameKey: string;
}

export interface Cosmetics {
  banners: BannerDef[];
  frames: FrameDef[];
  titles: TitleDef[];
  emotes: EmoteDef[];
  /** A new profile's look (A5.8: Tar Pit banner and Recruit title at the start; no frame until Codex 5). */
  defaults: { banner: string; frame: string; title: string };
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
  skins: SkinId[];
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
  int: IntegerTables;
  order: ContentOrder;
  /** A2.1-A2.11 and A5.1 battle numbers that `EconomyRules` has no field for (from `raw/economy.ts`). */
  battle: RawBattleRules;
}

/** The meta tables compiled next to the battle tables (the typed `unknown` slots of the contract). */
export type MetaTables = Pick<
  Content,
  'rarities' | 'capsules' | 'arenas' | 'trophyRoad' | 'generals' | 'names' | 'quests' | 'dailyModifiers' | 'cosmetics'
>;
