/**
 * Capsule and crate show (WP10, DESIGN A10, A15.3, A15.6).
 *
 * The app mounts a screen after the meta has rolled and saved the result (A6.4, B8):
 *
 *   const catalog = createCatalog(content);
 *   const progress = progressFromCollections(before.collection, after.collection, upgradeCopies, maxLevel);
 *   <CapsuleScreen pixi={app} art={art} audio={audio} catalog={catalog} reveals={[reveal]}
 *     progress={progress} pityRules={content.capsules.pity} settings={save.settings}
 *     pendingCount={n} onEquip={...} onUpgrade={...} onOpenNext={...} onDone={...} />
 *   <WardrobeScreen ... reveal={crateReveal} pity={save.pity} />
 *
 * The Wardrobe Crate uses the card flip; there is no reel (A15.3). The pure parts (plan, runner,
 * summary model) have no Pixi imports and are unit-tested.
 */
export { CapsuleScreen, WardrobeScreen, type CapsuleScreenProps, type WardrobeScreenProps } from './CapsuleScreen';
export { CapsuleStage, DESIGN_H, DESIGN_W, type StageDeps } from './capsuleStage';
export { createCatalog, fallbackCardInfo, fallbackSkinInfo } from './catalog';
export {
  checkPlan,
  longestUnskippableMs,
  MINI_BEATS,
  nominalDurationMs,
  planCapsuleShow,
  planOpenAll,
  planWardrobeShow,
  SHOW_LIMITS,
  stingerFor,
  SHOW_TIMING,
  WALKOUT_BEATS,
  type Cue,
  type PlanOptions,
  type ShowPlan,
  type ShowStep,
  type StepKind,
  type WardrobePlanOptions,
} from './plan';
export { CREST, RARITY_COLORS, TIER_COLORS, TIER_RAMPS } from './palette';
export { ShowRunner, type RunnerOptions, type RunnerState, type ShowView, type StrikeHit, type TimedStrike } from './runner';
export { comboPitchBp, gradeOffset, judgeTap, nextCombo, STRIKE_WINDOW, strikeOffsetMs, windowCloseMs, type StrikeGrade, type StrikeJudgement, type StrikeWindow } from './strikeTiming';
export {
  buildSummary,
  pityLines,
  progressFromCollections,
  revealCards,
  wardrobePityLines,
  type PityLine,
  type RevealCard,
  type SummaryItem,
  type SummaryModel,
} from './summaryModel';
export { climbCount, crestCount, isBackLoaded, isSummitTier, LEGENDARY_CRESTS, resolveStrikes, strikePattern, strikeSplit, summitGemCount, SUMMIT_ABOVE, TIER_ORDER, tierIndex } from './tiers';
export {
  DEFAULT_PITY_RULES,
  DEFAULT_SHOW_SETTINGS,
  type CapsuleCatalog,
  type CardInfo,
  type CardProgress,
  type PityCounters,
  type PityRules,
  type ProgressLookup,
  type ShowSettings,
  type SkinInfo,
} from './types';
