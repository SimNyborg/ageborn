/**
 * Meta-only constants that the content tables do not (yet) carry. Every number here is a design
 * decision recorded in `docs/decisions.md` (WP7); balance numbers belong in `src/content`, so each
 * one has a request to move it there (`docs/requests/wp7-content-meta-constants.md`).
 */
import type { CapsuleTier, CardId } from '@/contracts';

/** The `SaveDoc.v` that `newSave` writes (WP8 migrates from this version on). */
export const SAVE_VERSION = 14;

/**
 * Share of ladder and Daily Challenge opponents that are named AI Generals; the rest are procedural
 * AI Commanders, which "fill the ladder between Generals" (A7.4). DESIGN gives no number.
 */
export const GENERAL_SHARE_BP = 3000;

/** Age Unlock Capsules have no tier in A6.3; they show as Silver (4 stacks, like the Silver tier). */
export const AGE_UNLOCK_TIER: CapsuleTier = 'silver';

/**
 * Cards topped up in a scripted capsule, by capsule number (A6.5 script, A8 "one forced upgrade:
 * Bonker to L2" after capsule 2). Capsule 1 always carries a Bonker stack so the upgrade works.
 */
export const SCRIPT_EXTRA_CARDS: Readonly<Record<number, readonly CardId[]>> = { 1: ['bonker'] };

/** A8 match 3: the first ladder match is against Captain Kettle. */
export const FIRST_LADDER_GENERAL = 'kettle';

/** A8 match 2: Pip Quickstep at tier 0 on Short War. */
export const TUTORIAL_MATCH2 = { general: 'pip', tier: 0, format: 'short' } as const;

/** The name of the first War Plan preset (A3: three renamable presets; the UI labels them A/B/C). */
export const FIRST_PLAN_NAME = 'A';

/** `SaveDoc.flags` keys owned by meta. */
export const META_FLAGS = {
  /** The first ladder match has been played (A8: match 3 is Captain Kettle). */
  ladderPlayed: 'meta.ladderPlayed',
  /** The Supply Capsule has been unlocked (A6.3: right after capsule 2 is opened; retired 2026-09-30, A15.4). */
  dailyUnlocked: 'meta.dailyUnlocked',
  /**
   * The one-time "The Sundial" card in the Capsules tab (A6.3, 2026-09-30): set by the save v10
   * migration for saves that have played, cleared when closed. Same key as `save/migrations/v10.ts`.
   */
  sundialNotice: 'notice.sundial',
  /**
   * The save was full under the old 28-charge cap (set by the save v10 migration): the first timer
   * tick restarts the Sundial's period at that moment and clears it, so 28 stays 28 (not up to 34).
   * Same key as `save/migrations/v10.ts`.
   */
  sundialRestart: 'sundial.restart',
  /**
   * The Field power slot is unlocked (A2.9.1): the first of War Path Stone L5 cleared or 150 trophies;
   * the v7 save migration sets it for every save that has played. Same key as `save/migrations/v7.ts`.
   */
  powerField: 'power.field',
  /**
   * The Fort slot is unlocked (A16.14.6): the first of War Path Bronze L4 cleared or 400 trophies; the v11
   * save migration sets it for saves past either. Same key as `save/migrations/v11.ts`.
   */
  fortSlot: 'fort.slot',
} as const;

/** Best trophies that unlock the Fort slot (A16.14.6: 400, Arena 3). */
export const FORT_SLOT_TROPHIES = 400;

/** The War Path level whose first clear unlocks the Fort slot (A16.14.6: Bronze L4, which teaches forts). */
export const FORT_UNLOCK_LEVEL = 'wp.bronze.l04';

/** Amber paid instead of a fort the save already owns from the other source (A16.14.6, the power rule). */
export const FORT_OWNED_AMBER = 60;

/** Best trophies that unlock the Field power slot (A2.9.1: the Gate 2 node). */
export const POWER_FIELD_TROPHIES = 150;

/**
 * Amber paid instead of a power the save already owns (A2.9.8: a War Path power granted by the Trophy
 * Road fallback, or the other way round). Moves to `content.warPath.powerOwnedAmber` with
 * docs/requests/powers-sources.md.
 */
export const POWER_OWNED_AMBER = 60;

/** Whether battles send each side's Field power (A2.9.13); the one switch lives in `core`. */
export { FIELD_SLOT_IN_BATTLE } from '@/core/powerReach';

/** Prefix of a procedural AI Commander's `OpponentSpec.generalId` (`commander:<personality>:<favourite>`). */
export const COMMANDER_ID_PREFIX = 'commander';

/** `WardrobeReveal.winnerIndex` (the contract fixes 45). There is no reel (A15.3); kept for contract stability. */
export const REEL_WINNER_INDEX = 45;
