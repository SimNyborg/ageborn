/**
 * Meta rules (DESIGN B9, A6, C2/WP7): new saves, match rewards, charges and the Clay meter, daily
 * timers at 04:00, Time Capsules (bag, roll, pity, foils, script) and Wardrobe Crates, upgrades,
 * crafting and Dust, War Plan validation, auto-fill, Equip now and the advisor, trophies, arenas and
 * the Trophy Road, quests, Codex Level, Conquest, MMR, tier choice and opponent picking, and the
 * Daily Challenge modifier.
 *
 * Pure and deterministic (B2): every function is `(save, content, clock, …) → new save`, with no
 * mutation and no I/O; randomness comes from the save's seeded capsule stream (B8) or from seeds of
 * the save, and time only from the injected `Clock` (see {@link LocalClock} for the local 04:00).
 *
 * Use `meta` (bound to the game content) or `createMeta(content)`. The `Meta` contract methods that
 * take no content (`openCapsule`, `openWardrobe`, `tickTimers`) use the bound content.
 */
import type { AgeId, CardId, Clock, CompiledContent, FormatId, MatchResultInput, Meta, PendingCrate, Result, RewardStep, SaveDoc, SideLook, SkinId } from '@/contracts';
import { content as gameContent, type Content, type ModifierId } from '@/content';
import { grantCapsuleAt, grantCrateAt, openCapsuleWith, openCrate } from './capsules';
import { conquestBoard, type ConquestEntry } from './conquest';
import {
  botLook,
  collectionProgress,
  cosmeticOdds,
  craftCosmetic,
  equipCosmetic,
  sideLook,
  syncEarnedCosmetics,
  type CosmeticEquip,
} from './cosmetics';
import { craft } from './dust';
import { claimDaily, dailyModifierAt } from './daily';
import { pickOpponentAt } from './matchmaking';
import { newSaveAt } from './newSave';
import { claimQuest, rerollQuest } from './quests';
import { ageCapsuleChoices, ageCapsuleDue, applyMatchResultAt, questGrantsAgeCapsule } from './rewards';
import { tables } from './tables';
import { localNow, type LocalClock } from './time';
import { tickTimersAt } from './timers';
import { claimRoad } from './trophies';
import { upgradeCard } from './upgrades';
import { validatePlan, type WarPlan } from './advisor';
import { autoFill, equipNow, equipSkin, setActivePlan, setWarPlan } from './warplan';

/** The `Meta` contract plus the helpers the app and the meta screens need (WP9 `UiServices`). */
export interface MetaRules extends Meta {
  /** The content `openCapsule`, `openWardrobe` and `tickTimers` use. */
  readonly content: Content;
  /**
   * The contract's `applyMatchResult`; `o.age` is the age the player picked for an Age Capsule the
   * result grants (A6.4 dialog; ask first when {@link MetaRules.ageCapsuleDue} is true).
   */
  applyMatchResult(
    s: SaveDoc,
    r: MatchResultInput,
    c: CompiledContent,
    clock: Clock,
    o?: { age?: AgeId },
  ): { save: SaveDoc; rewards: RewardStep[] };
  /** True when this result grants an Age Capsule whose age the player should pick first (A6.4). */
  ageCapsuleDue(s: SaveDoc, r: MatchResultInput, c: CompiledContent, clock: Clock): boolean;
  /** The ages the A6.4 Age Capsule dialog offers, and the suggested (default) one. */
  ageCapsuleChoices(s: SaveDoc, c: CompiledContent): { ages: AgeId[]; suggested: AgeId };
  /** True when claiming this quest grants an Age Capsule (ask for the age first, A6.4). */
  questGrantsAgeCapsule(s: SaveDoc, slot: number | 'weekly', c: CompiledContent): boolean;
  /** Moves one banked Daily Capsule into the tray (A6.3). Reasons: noDailyCapsule. */
  claimDailyCapsule(s: SaveDoc, c: CompiledContent, clock: Clock): Result<SaveDoc>;
  /** Claims a finished quest; `age` is the Age Capsule age the player picked (A6.4, A6.7). */
  claimQuest(s: SaveDoc, slot: number | 'weekly', c: CompiledContent, clock: Clock, o?: { age?: AgeId }): Result<SaveDoc>;
  /** The free daily quest reroll (A6.7). */
  rerollQuest(s: SaveDoc, slot: number, c: CompiledContent): Result<SaveDoc>;
  /** Grants a Wardrobe Crate, rolled now (A6.4). */
  grantWardrobe(s: SaveDoc, source: PendingCrate['source'], c: CompiledContent, clock: Clock): SaveDoc;
  /** Today's Daily Challenge modifier (A9.1). */
  dailyModifier(c: CompiledContent, clock: Clock): ModifierId;
  /** The Conquest board with stars and open Generals (A6.10). */
  conquestBoard(s: SaveDoc, c: CompiledContent): ConquestEntry[];
  /** Stores a War Plan preset (0-2). */
  setWarPlan(s: SaveDoc, index: number, plan: WarPlan): Result<SaveDoc>;
  setActivePlan(s: SaveDoc, index: number): Result<SaveDoc>;
  /** Equips an owned skin on its card or base, or clears the target. */
  equipSkin(s: SaveDoc, target: string, skin: SkinId | null, c: CompiledContent): Result<SaveDoc>;
  /** Clears a card's NEW badge (the collection's `isNew`). */
  markSeen(s: SaveDoc, card: CardId): SaveDoc;
  /** Equips owned cosmetic collection items (A18.9.4). */
  equipCosmetic(s: SaveDoc, e: CosmeticEquip, c: CompiledContent): Result<SaveDoc>;
  /** Crafts a capsule or crate collection item with Dust (A18.9.4). */
  craftCosmetic(s: SaveDoc, key: string, c: CompiledContent): Result<SaveDoc>;
  /** Grants the road, feat, arena and Codex Level items the save has earned. */
  syncCosmetics(s: SaveDoc, c: CompiledContent): SaveDoc;
  /** "12/40 found" per collection. */
  collectionProgress(s: SaveDoc, c: CompiledContent): ReturnType<typeof collectionProgress>;
  /** The disclosed cosmetic drop tables (A15.3). */
  cosmeticOdds(s: SaveDoc, c: CompiledContent): ReturnType<typeof cosmeticOdds>;
  /** The player's base look for a match (both sides see it, A18.9.4). */
  sideLook(s: SaveDoc, c: CompiledContent): SideLook;
  /** An AI opponent's base look, seeded by its name (never a national flag). */
  botLook(c: CompiledContent, seed: string): SideLook;
}

/** Meta rules bound to a content set (the game's by default). */
export function createMeta(bound: CompiledContent = gameContent): MetaRules {
  const t = tables(bound);
  return {
    content: t,
    newSave: (c, clock, seed) => newSaveAt(c, localNow(clock), seed),
    applyMatchResult: (s, r, c, clock, o) => {
      const out = applyMatchResultAt(s, r, tables(c), localNow(clock), o ?? {});
      return { ...out, save: syncEarnedCosmetics(out.save, tables(c)).save };
    },
    ageCapsuleDue: (s, r, c, clock) => ageCapsuleDue(s, r, tables(c), localNow(clock)),
    ageCapsuleChoices: (s, c) => ageCapsuleChoices(s, tables(c)),
    questGrantsAgeCapsule: (s, slot, c) => questGrantsAgeCapsule(s, slot, tables(c)),
    grantCapsule: (s, kind, c, clock, o) => grantCapsuleAt(s, kind, tables(c), clock.now(), o ?? {}).save,
    openCapsule: (s, id) => openCapsuleWith(s, id, t),
    openWardrobe: (s, id) => openCrate(s, id, t),
    upgrade: (s, card, c) => upgradeCard(s, card, tables(c)),
    craft: (s, id, c) => craft(s, id, tables(c)),
    validatePlan: (plan, s, c, format: FormatId) => validatePlan(plan, s, tables(c), format),
    autoFill: (s, c) => autoFill(s, tables(c)),
    equipNow: (s, card, c) => equipNow(s, card, tables(c)),
    claimRoadNode: (s, trophies, c, clock) => {
      const r = claimRoad(s, trophies, tables(c), clock.now());
      return r.ok ? { ok: true, value: syncEarnedCosmetics(r.value, tables(c)).save } : r;
    },
    pickOpponent: (s, mode, c, clock, o) => pickOpponentAt(s, mode, tables(c), localNow(clock), o ?? {}),
    tickTimers: (s, clock) => tickTimersAt(s, t, localNow(clock)),
    claimDailyCapsule: (s, c, clock) => claimDaily(s, tables(c), localNow(clock)),
    claimQuest: (s, slot, c, clock, o) => claimQuest(s, slot, tables(c), clock.now(), o ?? {}),
    rerollQuest: (s, slot, c) => rerollQuest(s, slot, tables(c)),
    grantWardrobe: (s, source, c, clock) => grantCrateAt(s, source, tables(c), clock.now()).save,
    dailyModifier: (c, clock) => dailyModifierAt(tables(c), localNow(clock)),
    conquestBoard: (s, c) => conquestBoard(s, tables(c)),
    setWarPlan: (s, index, plan) => setWarPlan(s, index, plan),
    setActivePlan: (s, index) => setActivePlan(s, index),
    equipSkin: (s, target, skin, c) => equipSkin(s, target, skin, tables(c)),
    equipCosmetic: (s, e, c) => equipCosmetic(s, tables(c), e),
    craftCosmetic: (s, key, c) => craftCosmetic(s, tables(c), key),
    syncCosmetics: (s, c) => syncEarnedCosmetics(s, tables(c)).save,
    collectionProgress: (s, c) => collectionProgress(s, tables(c)),
    cosmeticOdds: (s, c) => cosmeticOdds(s, tables(c)),
    sideLook: (s, c) => sideLook(s, tables(c)),
    botLook: (c, seed) => botLook(tables(c), seed),
    markSeen: (s, card) => {
      const e = s.collection[card];
      return e && e.isNew ? { ...s, collection: { ...s.collection, [card]: { ...e, isNew: false } } } : s;
    },
  };
}

/** The meta rules for the game content. */
export const meta: MetaRules = createMeta();

export type { LocalClock };
export type { WarPlan, PlanIssueCode } from './advisor';
export type { ConquestEntry } from './conquest';
export type { CosmeticEquip, CosmeticPool, PoolOdds } from './cosmetics';
export { COSMETIC_COLLECTIONS, cosmeticItem, cosmeticKey, ownsCosmetic } from './cosmetics';
export type { OpponentOptions } from './matchmaking';
export { commanderId, commanderInfo, ECHO_DISCLOSURE_KEY, ladderGenerals, newPlayerMistakeBonusBp, newPlayerMistakesApply, ROOKIE_DISCLOSURE_KEY } from './matchmaking';
export { bagLeft, bagSize, legendaryPityBp, strikePattern } from './capsules';
export { nextChargeInMs } from './charges';
export { craftCost } from './dust';
export { upgradeBlocker, upgradeCost } from './upgrades';
export { claimableRoadNodes, trophyDelta } from './trophies';
export { expectedScoreBp, ladderTier, tierRating } from './mmr';
export { codexLevelFor, codexPointsToNext } from './codex';
export { bagCapsuleAverages, copiesToMax, expectedCopiesX10k } from './economy';
export { planAverageLevelCenti, planHasLegendary, starterPlan } from './warplan';
export { DAILY_DIFFICULTIES, dailyDrawAt, dailyDrawOn, dailyInfoAt, dailyModifierOn, dailyRecord, defaultDailyDifficulty, type DailyDraw, type DailyInfo } from './daily';
export { createFeatTracker, featFlag, featHintFlag, featList, grantFeats, showFeatHint, type FeatTracker, type FeatTrackerConfig } from './feats';
export { activeQuests } from './quests';
export { ladderWinFor } from './trophies';
export { META_FLAGS, SAVE_VERSION } from './rules';
export { dayKeyOf, gameDay, nextResetAt, weekKeyOf } from './time';
export { countsForSupply, supplyMatchesLeft, supplyRules, type SupplyRules } from './supply';
export { isCountingWin, skillTier, warChestProgress, winsPerChest, type CountingFacts } from './warChest';
