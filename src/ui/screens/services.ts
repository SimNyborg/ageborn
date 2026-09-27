/**
 * What the meta screens need from the app (DESIGN B2: "ui: service instances only via app/services
 * injection"). The app (WP11) implements this on top of `meta` (WP7) and `save` (WP8); the screens
 * never import those packages. Queries are synchronous and pure over the current save; actions
 * update the save signal (and persist) or start flows the app owns (battle, capsule show, replays).
 *
 * The dev page and tests use `createPreviewServices` (fixtures), which fakes the effects locally.
 */
import type {
  CardId,
  FormatId,
  OpponentSpec,
  PlanIssue,
  ReplayDoc,
  SaveDoc,
  Settings,
  SkinId,
} from '@/contracts';
import type { MatchRequest } from '../router';

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

export interface UiServices {
  // ---- queries -------------------------------------------------------------------------------
  /** The next ladder opponent for the Home preview (A9 #2), or null before the ladder opens. */
  previewOpponent(): OpponentSpec | null;
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
  /** Moves one banked Daily Capsule into the tray (A6.3). */
  claimDailyCapsule(): ActionResult;

  // ---- cards and plans -----------------------------------------------------------------------
  /** Upgrade (A6.6; `meta.upgrade`). */
  upgrade(card: CardId): ActionResult;
  /** Crafting with Dust: a card copy or a crate skin (A6.6; `meta.craft`). */
  craft(id: string): ActionResult;
  setWarPlan(index: number, plan: WarPlan): void;
  setActivePlan(index: number): void;
  /** Equips a skin on a card or base, or clears it with null. */
  equipSkin(target: string, skin: SkinId | null): void;

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
