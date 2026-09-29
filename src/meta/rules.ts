/**
 * Meta-only constants that the content tables do not (yet) carry. Every number here is a design
 * decision recorded in `docs/decisions.md` (WP7); balance numbers belong in `src/content`, so each
 * one has a request to move it there (`docs/requests/wp7-content-meta-constants.md`).
 */
import type { CapsuleTier, CardId } from '@/contracts';

/** The `SaveDoc.v` that `newSave` writes (WP8 migrates from this version on). */
export const SAVE_VERSION = 4;

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
  /** The Daily Capsule has been unlocked (A6.3: right after capsule 2 is opened). */
  dailyUnlocked: 'meta.dailyUnlocked',
} as const;

/** Prefix of a procedural AI Commander's `OpponentSpec.generalId` (`commander:<personality>:<favourite>`). */
export const COMMANDER_ID_PREFIX = 'commander';

/** `WardrobeReveal.winnerIndex` (the contract fixes 45). There is no reel (A15.3); kept for contract stability. */
export const REEL_WINNER_INDEX = 45;
