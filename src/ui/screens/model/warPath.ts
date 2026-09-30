/**
 * War Path view models (DESIGN A18.7, ui-plan 2.3, 2.6, 4.1): the map's nodes and their states, the
 * current level, the Home features that open with wins, a level's AI tier on a difficulty and its
 * goal lines. Pure over (save, content); the same rules as `meta/warPath.ts` (the UI may not
 * import meta, DESIGN B2), held equal by `test/warPathModel.test.ts`.
 */
import type { AgeId, MatchStats, SaveDoc, WarPathDifficulty } from '@/contracts';
import type { Content, StarGoal, WarPathLevel, WarPathUnlock } from '@/content/types';
import type { TabId } from '../../router';

export type NodeState = 'beaten' | 'current' | 'locked';

export interface MapNode {
  level: WarPathLevel;
  state: NodeState;
  stars: number;
  crown: number;
  /** Position in map order (0-based). */
  i: number;
  /** Nodes ahead of the current one (0 for the current and beaten ones): far nodes fade into mist. */
  ahead: number;
}

export interface MapRegion {
  age: AgeId;
  /** First and last node index of the region. */
  from: number;
  to: number;
  /** Stars earned in the region and the most there are. */
  stars: number;
  max: number;
  /** The boss is beaten: the next region's gate stands open. */
  done: boolean;
}

export function progressOf(save: SaveDoc): SaveDoc['warPath'] {
  return save.warPath ?? { path: 'normal', stars: {}, crowns: {}, relics: [], difficulty: 'normal', lossStreak: 0, legacy: false };
}

/** The first level not beaten yet (null once the whole path is beaten). */
export function currentLevelId(save: SaveDoc, content: Content): string | null {
  const p = progressOf(save);
  return content.warPath.order.find((id) => !(p.stars[id] ?? 0)) ?? null;
}

/** The level Home's Play starts: the current one, or the last level after the whole path (U2). */
export function playLevelId(save: SaveDoc, content: Content): string {
  return currentLevelId(save, content) ?? content.warPath.order[content.warPath.order.length - 1]!;
}

export function mapNodes(save: SaveDoc, content: Content): MapNode[] {
  const p = progressOf(save);
  const cur = currentLevelId(save, content);
  const curIndex = cur ? content.warPath.order.indexOf(cur) : content.warPath.order.length;
  return content.warPath.order.map((id, i) => {
    const stars = p.stars[id] ?? 0;
    return {
      level: content.warPath.levels[id]!,
      state: stars > 0 ? 'beaten' : id === cur ? 'current' : 'locked',
      stars,
      crown: p.crowns[id] ?? 0,
      i,
      ahead: Math.max(0, i - curIndex),
    };
  });
}

export function mapRegions(save: SaveDoc, content: Content): MapRegion[] {
  const p = progressOf(save);
  let from = 0;
  return content.warPath.regions.map((r) => {
    const stars = r.levels.reduce((n, id) => n + (p.stars[id] ?? 0), 0);
    const region: MapRegion = {
      age: r.age,
      from,
      to: from + r.levels.length - 1,
      stars,
      max: r.levels.length * 3,
      done: (p.stars[r.levels[r.levels.length - 1]!] ?? 0) > 0,
    };
    from += r.levels.length;
    return region;
  });
}

/** Levels beaten in all. */
export function beatenCount(save: SaveDoc): number {
  return Object.values(progressOf(save).stars).filter((n) => n > 0).length;
}

/**
 * The wins that open Home features (owner decision 2026-09-30): wins in any mode count (Ladder, the
 * War Path, Quick Battle, the Daily), so the War Path is no longer required to open tabs. A save whose
 * War Path stars run ahead of its win count (older fixtures) counts its beaten levels instead.
 */
export function unlockWins(save: SaveDoc): number {
  return Math.max(beatenCount(save), save.stats?.wins ?? 0);
}

/** The first-session matches are done (A8): Home's Battle starts the Ladder from now on. */
export function onboardingDone(save: SaveDoc): boolean {
  return save.tutorial.step >= 4;
}

/**
 * What Home opens along the way (ui-plan 2.6): the content's features plus the Campaign card, a UI
 * element that joins Home when the onboarding ends (owner decision 2026-09-30).
 */
export type HomeUnlock = WarPathUnlock | 'campaign';

/**
 * ui-plan 2.6: a Home feature opens with its number of wins; the Ladder and the Campaign card open
 * when the onboarding ends (Home becomes the 1v1 hub then). A legacy save keeps everything open.
 */
export function featureOpen(save: SaveDoc, content: Content, f: HomeUnlock): boolean {
  if (progressOf(save).legacy) return true;
  if (f === 'campaign') return onboardingDone(save);
  if (f === 'ladder') return onboardingDone(save) || unlockWins(save) >= content.warPath.unlocks.ladder;
  return unlockWins(save) >= content.warPath.unlocks[f];
}

/**
 * Whether upgrades have been taught (2.6): the onboarding's forced upgrade is done, or the player is
 * past it (level 3 on) or had a save from before the War Path. Until then no "Upgrade ready" marks.
 */
export function upgradesTaught(save: SaveDoc): boolean {
  return !!save.flags['tutorial.firstUpgrade'] || progressOf(save).legacy || beatenCount(save) >= 3;
}

/** The tab each feature opens (Modes, Ladder and Daily live on Home). */
export const TAB_FEATURE: Readonly<Record<Exclude<TabId, 'battle'>, WarPathUnlock>> = {
  army: 'army',
  capsules: 'capsules',
  progress: 'progress',
  customize: 'customize',
};

/**
 * The order in which Home features open (one per return to Home, 2.6). The Ladder (the hub's arena
 * and trophies) and the Campaign card arrive with the end of the onboarding, after Army and before
 * Modes.
 */
export const UNLOCK_ORDER: readonly HomeUnlock[] = ['army', 'ladder', 'capsules', 'campaign', 'modes', 'customize', 'progress', 'daily'];

/** The flag that records a feature's unlock ceremony as shown (`SaveDoc.flags['ui-unlock.<id>']`). */
export const unlockFlag = (f: HomeUnlock): string => `ui-unlock.${f}`;

/** The first feature that is open but whose unlock ceremony has not played yet (MR-40), or null. */
export function pendingUnlock(save: SaveDoc, content: Content): HomeUnlock | null {
  if (progressOf(save).legacy) return null;
  return UNLOCK_ORDER.find((f) => featureOpen(save, content, f) && !save.flags[unlockFlag(f)]) ?? null;
}

/** A18.6.2: the AI tier of a level on a difficulty. */
export function levelTier(content: Content, level: WarPathLevel, d: WarPathDifficulty): number {
  const dt = content.warPath.difficulty;
  if (d === 'legendary') return dt.legendaryTier;
  const base = content.warPath.regions.find((r) => r.age === level.region)?.baseTier ?? 0;
  return Math.max(0, Math.min(dt.legendaryTier, base + level.tierOffset + (dt.tierOffset[d] ?? 0)));
}

/** Hard-marked levels (Lieutenant, Spike, boss) show a "Hard" tag (4.1). */
export function hardMarked(level: WarPathLevel): boolean {
  return level.role === 'lieutenant' || level.role === 'spike' || level.role === 'boss';
}

/** The goal line of a level's ★★ as an i18n key and params (A18.7.4). */
export function goalText(goal: StarGoal): { key: string; params: Record<string, string | number> } {
  switch (goal.kind) {
    case 'baseAbove':
      return { key: 'warPath.goal.baseAbove', params: { n: Math.round(goal.bp / 100) } };
    case 'winBefore': {
      const s = Math.floor(goal.ms / 1000);
      return { key: 'warPath.goal.winBefore', params: { time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` } };
    }
    case 'noLastStand':
      return { key: 'warPath.goal.noLastStand', params: {} };
    case 'noEconomy':
      return { key: 'warPath.goal.noEconomy', params: {} };
    case 'powerHits':
      return { key: 'warPath.goal.powerHits', params: { n: goal.n } };
  }
}

/** True when the match stats meet a goal (the Result's star lines). */
export function goalMet(goal: StarGoal, stats: MatchStats): boolean {
  switch (goal.kind) {
    case 'baseAbove':
      return stats.ownBaseHpBpAtEnd > goal.bp;
    case 'winBefore':
      return stats.durationMs < goal.ms;
    case 'noLastStand':
      return !stats.usedLastStand;
    case 'noEconomy':
      return !stats.usedTreasury;
    case 'powerHits':
      return stats.powerMaxHits >= goal.n;
  }
}

/** The ★★ and ★★★ goals and the difficulty control show once the level is beaten, or from L5 (2.6). */
export function goalsShown(save: SaveDoc, content: Content, level: WarPathLevel): boolean {
  const i = content.warPath.order.indexOf(level.id);
  return (progressOf(save).stars[level.id] ?? 0) > 0 || i + 1 >= content.warPath.goalsFromLevel || progressOf(save).legacy;
}

/** The level's display name key. */
export const levelNameKey = (id: string): string => `warPath.level.${id.replace(/^wp\./, '')}`;
/** The region's display name key ("Bronze Age: Hellas"). */
export const regionNameKey = (age: AgeId): string => `warPath.region.${age}`;

/** "Level 4" inside the region; the region label is separate. */
export function levelNumber(level: WarPathLevel): number {
  return level.index;
}

/** The request Home's Play and a node's Play start (the onboarding matches while they are due). */
export type PlayTarget = { kind: 'tutorial'; match: 1 | 2 } | { kind: 'level'; level: string };

/** Onboarding step indexes (`SaveDoc.tutorial.step`): match 1 and match 2 (A8). */
const ONBOARDING_MATCH_STEP: Readonly<Record<number, 1 | 2>> = { 0: 1, 2: 2 };

export function playTarget(save: SaveDoc, content: Content, levelId: string): PlayTarget {
  const level = content.warPath.levels[levelId];
  const due = ONBOARDING_MATCH_STEP[save.tutorial.step];
  if (level && due !== undefined && level.onboarding === due) return { kind: 'tutorial', match: due };
  return { kind: 'level', level: levelId };
}
