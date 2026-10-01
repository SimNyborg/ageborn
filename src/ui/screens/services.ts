/**
 * What the meta screens need from the app (DESIGN B2: "ui: service instances only via app/services
 * injection"). The app (WP11) implements this on top of `meta` (WP7) and `save` (WP8); the screens
 * never import those packages. Queries are synchronous and pure over the current save; actions
 * update the save signal (and persist) or start flows the app owns (battle, capsule show, replays).
 *
 * The dev page and tests use `createPreviewServices` (fixtures), which fakes the effects locally.
 */
import type { AgeId, CardId, FormatId, OpponentSpec, PlanIssue, ReplayDoc, SaveDoc, Settings, SkinId, WarPathDifficulty } from '@/contracts';
import type { DailyDifficulty, MatchRequest } from '../router';

export type WarPlan = SaveDoc['warPlans'][number];

export type ActionResult = { ok: true } | { ok: false; reason: string };

/** Profile look fields the player can change (A6.1). */
export interface ProfileLookPatch {
  name?: string;
  banner?: string;
  frame?: string;
  title?: string;
  /** null clears the unit portrait and shows the face again. */
  portraitCard?: CardId | null;
}

/**
 * One change of the equipped cosmetic collection items (A18.9.4); a null key clears the slot. Only
 * owned items equip; the national flag is only ever the player's own pick.
 */
export type CosmeticEquipPatch =
  | { slot: 'baseFlag' | 'nationalFlag' | 'backdrop'; key: string | null }
  | { slot: 'baseSkin'; age: AgeId; key: string | null }
  | { slot: 'decoration'; anchor: number; key: string | null }
  | { slot: 'emotes' | 'quotes'; keys: string[] };

export interface UiServices {
  // ---- queries -------------------------------------------------------------------------------
  /**
   * The next ladder opponent for the Home preview (A9 #2) in `format` (the same General in every
   * length since 2026-10-01; the format shapes the plan), or null before the ladder opens. It is the
   * opponent `prepareMatch` gives a `{ mode: 'ladder', format }` request on the same save.
   */
  previewOpponent(format?: FormatId): OpponentSpec | null;
  /**
   * Today's Daily Challenge opponent at a difficulty, for the Home plate (bug hunt 2026-10-01 #22: the
   * plate must show exactly who you fight). Optional; null when unknown.
   */
  previewDaily?(difficulty: DailyDifficulty): OpponentSpec | null;
  /** Today's Daily Challenge modifier id (A9.1), seeded by the local date. */
  dailyModifier(): string | null;
  /** War Plan validation and advisor warnings (A3; `meta.validatePlan`). */
  validatePlan(plan: WarPlan, format: FormatId): PlanIssue[];
  /** A suggested plan (A3 auto-fill; `meta.autoFill`). Not saved until `setWarPlan`. */
  autoFill(): WarPlan;
  /** The replay ring, newest first (A6.1 history: last 20 matches). */
  matchHistory(): ReplayDoc[];

  // ---- match flow ----------------------------------------------------------------------------
  /** Picks the opponent for a request (A6.8; `meta.pickOpponent`). The UI then shows VS. */
  prepareMatch(req: MatchRequest): OpponentSpec;
  /** Starts the battle after VS; the app routes to the battle screen. */
  beginBattle(req: MatchRequest, opponent: OpponentSpec): void;
  /** Pause menu (A9 #6). */
  resume(): void;
  /** Retreat counts as a loss (A2.10). */
  retreat(): void;
  quitSkirmish(): void;
  /** Result screen: replay of the finished match (A9 #7). */
  watchReplay(index: number): void;

  // ---- capsules ------------------------------------------------------------------------------
  /** Opens the capsule show (WP10) for one pending capsule. */
  openCapsule(id: string): void;
  /** "Open all" (A10: summary plus Epic-or-better reveals). */
  openAllCapsules(): void;
  openWardrobe(id: string): void;
  /** Moves one banked Supply Capsule into the tray (A6.3). */
  claimDailyCapsule(): ActionResult;
  /**
   * Skill Aeons granted again to a save that had claimed them before the 2026-09-29 capsule ladder
   * (`meta.legacySkillAeonCount`), for the one-time notice card. 0 for everyone else.
   */
  legacySkillAeons(): number;
  /** Closes a one-time notice card for good (clears `flags['notice.<id>']`; B8 step 4). */
  dismissNotice(id: 'capsuleLadder' | 'sundial'): void;

  // ---- cards and plans -----------------------------------------------------------------------
  /** Upgrade (A6.6; `meta.upgrade`). */
  upgrade(card: CardId): ActionResult;
  /** Crafting with Dust: a card copy or a crate skin (A6.6; `meta.craft`). */
  craft(id: string): ActionResult;
  /**
   * Stores War Plan preset `index` (0-2; `meta.setWarPlan`). The UI only passes an index up to the
   * current number of presets, so a new preset is always the next one.
   */
  setWarPlan(index: number, plan: WarPlan): void;
  setActivePlan(index: number): void;
  /** Clears a card's NEW badge once the player has looked at it (`meta.markSeen`). */
  markSeen(card: CardId): void;
  /** Reveals a hidden feat's hint (A15.10; stored in `flags['featHint.<id>']`). */
  showFeatHint(id: string): void;
  /**
   * Sets UI-only flags in `SaveDoc.flags` (keys start with `ui-`): first-time pointers already
   * shown (`ui-pointer.<entry>`) and the last picked difficulty (`ui-difficulty.<id>`). Each key in
   * `patch` is set to its value; a `false` value removes the key.
   */
  setUiFlags(patch: Record<string, boolean>): void;
  /** Equips a skin on a card or base, or clears it with null. */
  equipSkin(target: string, skin: SkinId | null): void;
  /** Equips cosmetic collection items (A18.9.4; `meta.equipCosmetic`). */
  equipCosmetic(e: CosmeticEquipPatch): ActionResult;
  /** Crafts a Time Capsule or Wardrobe Crate collection item with Dust (`meta.craftCosmetic`). */
  craftCosmetic(key: string): ActionResult;

  // ---- War Path --------------------------------------------------------------------------------
  /** Remembers the War Path difficulty (A18.7, default Normal; `meta.setWarPathDifficulty`). */
  setWarPathDifficulty(d: WarPathDifficulty): void;

  // ---- progression ---------------------------------------------------------------------------
  /** Trophy Road (A6.3; `meta.claimRoadNode`). */
  claimRoadNode(trophies: number): ActionResult;
  /** Daily slot index, or 'weekly'. */
  claimQuest(slot: number | 'weekly'): ActionResult;
  /** One free reroll per day (A6.7). */
  rerollQuest(slot: number): ActionResult;

  // ---- profile and settings ------------------------------------------------------------------
  setProfile(patch: ProfileLookPatch): void;
  updateSettings(patch: Partial<Settings>): void;
  /** Export code (B8: JSON → deflate → base64url). */
  exportCode(): string;
  /** Downloads the `.ageborn` file (B8). */
  downloadSave(): void;
  /** Validates and migrates (B8). On success the app replaces the save. */
  importCode(code: string): ActionResult;
  /** Starts a fresh profile (after the UI's double confirmation). */
  resetSave(): void;
  /** A8 instrumentation: downloads the local event log. */
  exportEventLog(): void;
}
