/**
 * Save document and store (DESIGN B15 `save.ts`, B8, A6).
 *
 * The `SaveDoc` is plain JSON, versioned by `v` and migrated by pure functions (DESIGN B8 Load order).
 * Capsule and crate contents are rolled at grant time and written before any animation (DESIGN B8,
 * A6.4, A10): the reveal is honest. Implemented by WP8 in `src/save`.
 */
import type { Bus } from './audio';
import type { Locale } from './i18n';
import type { AgeId, CapsuleTier, CardId, CosmeticKey, Foil, Rarity, Result, SkinId, SkinRarity, TeamPreset } from './ids';
import type { Loadout, ReplayDoc } from './sim';

/** Generated profile avatar (DESIGN A6.1). */
export interface AvatarSpec {
  seed: number;
  parts: Record<string, number>;
  portraitCard?: CardId;
}

/** Player settings (DESIGN A9 Settings, A12 feel options, B6 graphics presets). */
export interface Settings {
  volume: Record<Bus, number>;
  graphics: 'auto' | 'high' | 'lite';
  reduceMotion: boolean;
  shake: number;
  hitstop: boolean;
  damageNumbers: 'off' | 'important' | 'all';
  teamPreset: TeamPreset;
  locale: Locale;
  defaultSpeed: 1 | 1.5 | 2;
  /** Vibration on capsule climbs and Legendaries (A13); default false (A15.6). */
  vibrate: boolean;
  mutedEmotes: boolean;
  /** Break reminder after each 60 min of active play (A15.6); default true when missing. */
  breakReminder?: boolean;
  /** Every capsule opens at the burst (A10 step 4) (A15.6); default false when missing. */
  quickReveal?: boolean;
  /** A17.4 "Auto camera": the battle camera follows the fight when you are not scrolling; default true when missing. */
  autoCamera?: boolean;
  /** A17.4 edge scroll on desktop (fine pointer only); default true when missing. */
  edgeScroll?: boolean;
}

/** Profile statistics (DESIGN A6.1). */
export interface ProfileStats {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  /** Ladder, Daily Challenge and Conquest wins only (A15.9); Skirmish is practice. */
  winsByTier: number[];
  lossesByTier: number[];
  trainedByCard: Record<CardId, number>;
  fastestWinMs: number | null;
  /** Matches that reached the game's last age (A17.13: Cosmic, the end of Full War; the Future Age before A17). */
  futureReached: number;
}

/** Quests (DESIGN A6.7). Daily reset at 04:00 local (B8). */
export interface QuestSlot {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface QuestState {
  /** A queue of up to 21 quests; only the first 3 are active and progress (A6.7, A15.4). */
  daily: QuestSlot[];
  rerollUsed: boolean;
  dayKey: string;
  /**
   * War Chest progress (A15.5): `progress` counts counting wins (0-19) and is never reset by
   * `tickTimers`; `weekKey` is unused and kept for contract stability.
   */
  weekly: QuestSlot;
  weekKey: string;
}

/** One card stack inside a capsule (DESIGN A6.4, A10). */
export interface CapsuleStack {
  card: CardId;
  rarity: Rarity;
  copies: number;
  isNew: boolean;
  foil: Foil;
  dust: number;
}

export interface CapsuleContents {
  stacks: CapsuleStack[];
  amber: number;
  dust: number;
  skin: SkinId | null;
  /** A bonus cosmetic collection item (A18.9.4), rolled at grant; absent or null when none. */
  cosmetic?: CosmeticKey | null;
}

/** An unopened Time Capsule, rolled at grant time (DESIGN A6.4, B8). */
export interface PendingCapsule {
  id: string;
  kind: 'win' | 'daily' | 'road' | 'meter' | 'age' | 'codex' | 'conquest' | 'ageUnlock' | 'warPath';
  tier: CapsuleTier;
  /** The tier shown before the climb animation (DESIGN A10). */
  startTier: CapsuleTier;
  /** Onboarding script step, if scripted (DESIGN A6.5). */
  scriptIndex: number | null;
  age: AgeId | null;
  contents: CapsuleContents;
  createdAt: number;
}

/** An unopened Wardrobe Crate, rolled at grant time (DESIGN A10.1, A5.8). */
export interface PendingCrate {
  id: string;
  /** `welcome`: the one crate for winning the training match (owner feedback 2026-09-28). */
  source: 'codex' | 'weekly' | 'road' | 'aeon' | 'welcome';
  skin: SkinId;
  rarity: SkinRarity;
  duplicateDust: number;
  createdAt: number;
  /** The crate's cosmetic collection item (A18.9.4), rolled at grant; absent in older crates. */
  cosmetic?: CosmeticKey | null;
}

/** Everything the capsule show needs; pity counters shown before and after (DESIGN A6.5, A10). */
export interface CapsuleReveal {
  capsule: PendingCapsule;
  climbs: number;
  strikeClimbs: boolean[];
  pityBefore: SaveDoc['pity'];
  pityAfter: SaveDoc['pity'];
  firstLegendaryReveal: CardId[];
}

/** CS-style reel: the winner always sits at tile index 45 (DESIGN A10.1). */
export interface WardrobeReveal {
  crate: PendingCrate;
  reelTiles: SkinId[];
  winnerIndex: 45;
  stopOffsetBp: number;
}

/**
 * The equipped cosmetic collection items (DESIGN A18.9.4), as keys `<collection>.<id>`. Only owned
 * (or starter) items can be equipped. The national flag is only ever the player's own pick, never
 * inferred from location; null means no national flag.
 */
export interface CosmeticLoadout {
  /** The battle emote wheel: starter emote ids and `emote.<id>` keys, at most 8. */
  emotes: string[];
  /** The quote wheel: `quote.<id>` keys, at most 4. */
  quotes: string[];
  baseFlag: CosmeticKey | null;
  nationalFlag: CosmeticKey | null;
  /** A base skin per age (`baseSkin.<id>`). */
  baseSkins: Partial<Record<AgeId, CosmeticKey>>;
  /** One per base decoration anchor (3 anchors); null leaves it empty. */
  decorations: (CosmeticKey | null)[];
}

/** A single-player difficulty (A18.6): Easy, Normal, Hard, Expert, Legendary. */
export type WarPathDifficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'legendary';

/** War Path progress (DESIGN A18.7.10, ui-plan 6.4; save v5). */
export interface WarPathProgress {
  /** The path being played; the Veteran and Legend Paths are v1.1 (A18.7.8). */
  path: 'normal' | 'veteran' | 'legend';
  /** Best stars per level id (`wp.<age>.l01`), 1-3; a level without an entry is not beaten. */
  stars: Record<string, number>;
  /** Highest difficulty beaten per level: 1 Easy ... 5 Legendary (A18.7.4). */
  crowns: Record<string, number>;
  /** War Relics (v1.1). */
  relics: string[];
  /** The difficulty War Path levels are played on (default Normal, remembered). */
  difficulty: WarPathDifficulty;
  /** Losses in a row on War Path levels ("Try Easy" after 3, A18.7.4). */
  lossStreak: number;
  /** A save from before the War Path: every Home feature stays open (A15.1, nothing is taken back). */
  legacy: boolean;
}

/** The whole persisted profile (DESIGN B8, A6). No real-money fields, ever (CLAUDE.md, A6.2). */
export interface SaveDoc {
  v: number;
  createdAt: number;
  profile: { name: string; avatar: AvatarSpec; banner: string; frame: string; title: string };
  /** All currencies are earned (DESIGN A6.2). */
  currencies: { amber: number; dust: number };
  trophies: { current: number; best: number; roadClaimed: number[] };
  arenaIndex: number;
  collection: Record<CardId, { level: number; copies: number; isNew: boolean; foil: Foil }>;
  powersOwned: CardId[];
  skins: { owned: SkinId[]; equipped: Record<string, SkinId> };
  /**
   * Banner and title ids, plus cosmetic collection keys (`<collection>.<id>`, A18.9.4) in `owned`;
   * `equipped` is the chosen look and battle wheel (save v3).
   */
  cosmetics: { owned: string[]; equipped: CosmeticLoadout };
  /** War Plans: one loadout per age (DESIGN A3). */
  warPlans: { name: string; loadouts: Record<AgeId, Loadout> }[];
  activePlan: number;
  capsules: {
    pending: PendingCapsule[];
    /** Capsule charges; the bank holds up to 28 (A15.4). */
    charges: number;
    chargesUpdatedAt: number;
    freeCapsulesLeft: number;
    clayMeter: number;
    /** The Supply Capsule allowance, up to 7 (A15.4); `PendingCapsule.kind 'daily'` shows as "Supply Capsule". */
    dailyBank: number;
    dailyNextAt: number | null;
    bag: number[];
    wardrobe: PendingCrate[];
  };
  /** Pity counters, visible on every capsule screen (DESIGN A6.5). */
  pity: {
    sinceEpic: number;
    sinceLegendary: number;
    sinceNewCard: number;
    opened: number;
    wardrobeSinceEpic: number;
    wardrobeSinceLegendary: number;
  };
  /**
   * Meta RNG streams (sfc32 state): capsule rolls (DESIGN B8) and, from save v3, the cosmetic
   * collection drops, kept apart so cosmetics never change a capsule's cards.
   */
  rng: { capsule: [number, number, number, number]; cosmetic?: [number, number, number, number] };
  scriptStep: number;
  quests: QuestState;
  codexPoints: number;
  codexLevel: number;
  mmr: number;
  lossStreak: number;
  matchesPlayed: number;
  /** Daily Challenge reward bank (A15.7): +1 at each 04:00, up to 7; a new save starts with 1. */
  daily: { dayKey: string; bank: number };
  conquest: { stars: Record<string, [boolean, boolean, boolean]>; milestonesClaimed: number[] };
  /** War Path progress (A18.7; save v5). */
  warPath: WarPathProgress;
  stats: ProfileStats;
  settings: Settings;
  tutorial: { step: number; hintsShown: Record<string, number> };
  lastExportAt: number | null;
  /** Free flags; meta sets `feat.<id>` for found feats and `featHint.<id>` for shown hints (A15.10). */
  flags: Record<string, boolean>;
}

/**
 * Persistence behind an interface so IndexedDB or cloud stores can replace localStorage later (DESIGN B8).
 * Writes are debounced 2 s unless `immediate` (after a capsule roll or upgrade). Replays keep a ring of 20.
 */
export interface SaveStore {
  load(): Promise<SaveDoc | null>;
  save(doc: SaveDoc, o?: { immediate?: boolean }): Promise<void>;
  /** JSON → fflate deflate → base64url (DESIGN B8 Export/import). */
  exportCode(doc: SaveDoc): string;
  /** Validates and migrates (DESIGN B8). */
  importCode(code: string): Result<SaveDoc>;
  loadReplays(): ReplayDoc[];
  pushReplay(r: ReplayDoc): void;
}

/** One pure migration step `m[v]: doc_v → doc_{v+1}` (DESIGN B8 Load order). */
export type Migration = (doc: unknown) => unknown;
