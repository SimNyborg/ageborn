/**
 * Save document and store (DESIGN B15 `save.ts`, B8, A6).
 *
 * The `SaveDoc` is plain JSON, versioned by `v` and migrated by pure functions (DESIGN B8 Load order).
 * Capsule and crate contents are rolled at grant time and written before any animation (DESIGN B8,
 * A6.4, A10): the reveal is honest. Implemented by WP8 in `src/save`.
 */
import type { Bus } from './audio';
import type { Locale } from './i18n';
import type { AgeId, CapsuleTier, CardId, Foil, Rarity, Result, SkinId, SkinRarity, TeamPreset } from './ids';
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
  vibrate: boolean;
  mutedEmotes: boolean;
}

/** Profile statistics (DESIGN A6.1). */
export interface ProfileStats {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winsByTier: number[];
  lossesByTier: number[];
  trainedByCard: Record<CardId, number>;
  fastestWinMs: number | null;
  futureReached: number;
}

/** Quests (DESIGN A6.7). Daily reset at 04:00 local (B8). */
export interface QuestSlot {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface QuestState {
  daily: QuestSlot[];
  rerollUsed: boolean;
  dayKey: string;
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
}

/** An unopened Time Capsule, rolled at grant time (DESIGN A6.4, B8). */
export interface PendingCapsule {
  id: string;
  kind: 'win' | 'daily' | 'road' | 'meter' | 'age' | 'codex' | 'conquest' | 'ageUnlock';
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
  source: 'codex' | 'weekly' | 'road' | 'aeon';
  skin: SkinId;
  rarity: SkinRarity;
  duplicateDust: number;
  createdAt: number;
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
  cosmetics: { owned: string[] };
  /** War Plans: one loadout per age (DESIGN A3). */
  warPlans: { name: string; loadouts: Record<AgeId, Loadout> }[];
  activePlan: number;
  capsules: {
    pending: PendingCapsule[];
    charges: number;
    chargesUpdatedAt: number;
    freeCapsulesLeft: number;
    clayMeter: number;
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
  /** Meta RNG stream (sfc32 state) for capsule rolls (DESIGN B8). */
  rng: { capsule: [number, number, number, number] };
  scriptStep: number;
  quests: QuestState;
  codexPoints: number;
  codexLevel: number;
  mmr: number;
  lossStreak: number;
  matchesPlayed: number;
  daily: { dayKey: string; won: boolean };
  conquest: { stars: Record<string, [boolean, boolean, boolean]>; milestonesClaimed: number[] };
  stats: ProfileStats;
  settings: Settings;
  tutorial: { step: number; hintsShown: Record<string, number> };
  lastExportAt: number | null;
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
