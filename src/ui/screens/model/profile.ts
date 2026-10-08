/**
 * Profile and history view models (A6.1): stats, favourite card, collection completion, foils,
 * Legendaries owned, and the match history built from the replay ring (every opponent in v1 is an
 * AI and is marked so, A7.1).
 */
import type { Content } from '@/content/types';
import type { CardId, FormatId, ReplayDoc, SaveDoc } from '@/contracts';
import { TICK_MS } from '@/core';
import { collectionProgress, isOwned } from './cards';
import { arenaOf, conquestView } from './progress';

export interface ProfileView {
  trophies: number;
  best: number;
  arenaNameKey: string;
  arenaIndex: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  /** Rows only for tiers that have results: tier 0-10 (A7.3). */
  byTier: { tier: number; wins: number; losses: number }[];
  favourite: CardId | null;
  collection: { owned: number; total: number };
  foils: number;
  legendaries: number;
  legendariesTotal: number;
  codexLevel: number;
  conquestStars: number;
  conquestMax: number;
  /** "Highest AI tier beaten" (A15.9): the top tier with a counted win; it never goes down. */
  highestTierBeaten: number | null;
  fastestWinMs: number | null;
  futureReached: number;
}

export function profileView(save: SaveDoc, content: Content): ProfileView {
  const s = save.stats;
  let favourite: CardId | null = null;
  let most = 0;
  for (const id of Object.keys(s.trainedByCard).sort()) {
    const n = s.trainedByCard[id] ?? 0;
    if (n > most) {
      most = n;
      favourite = id;
    }
  }
  const byTier: ProfileView['byTier'] = [];
  const tiers = Math.max(s.winsByTier.length, s.lossesByTier.length);
  for (let tier = 0; tier < tiers; tier++) {
    const wins = s.winsByTier[tier] ?? 0;
    const losses = s.lossesByTier[tier] ?? 0;
    if (wins > 0 || losses > 0) byTier.push({ tier, wins, losses });
  }
  const legendaryIds = content.order.units.filter((id) => content.units[id]?.rarity === 'legendary');
  const conquest = conquestView(save, content);
  const arena = arenaOf(save, content);
  let highestTierBeaten: number | null = null;
  s.winsByTier.forEach((n, tier) => {
    if (n > 0) highestTierBeaten = tier;
  });
  return {
    highestTierBeaten,
    trophies: save.trophies.current,
    best: save.trophies.best,
    arenaNameKey: arena.nameKey,
    arenaIndex: arena.index,
    matches: s.matches,
    wins: s.wins,
    losses: s.losses,
    draws: s.draws,
    byTier,
    favourite,
    collection: collectionProgress(save, content),
    foils: Object.values(save.collection).filter((e) => e.foil !== 'none').length,
    legendaries: legendaryIds.filter((id) => isOwned(save, id, content)).length,
    legendariesTotal: legendaryIds.length,
    codexLevel: save.codexLevel,
    conquestStars: conquest.totalStars,
    conquestMax: conquest.maxStars,
    fastestWinMs: s.fastestWinMs,
    futureReached: s.futureReached,
  };
}

export type MatchResultKind = 'win' | 'loss' | 'draw';

export interface HistoryRow {
  index: number;
  opponent: string;
  /**
   * True for every labelled AI (A7.1); false for a Ladder match from Home's Battle, whose bot was shown
   * as an online player (owner decision 2026-10-07), so its row reads like the match did.
   */
  isAI: boolean;
  result: MatchResultKind;
  format: FormatId;
  durationMs: number;
  /** A replay recorded with different content cannot be played (B3 Replays). */
  playable: boolean;
}

/** The player is the non-bot side; with two humans (never in v1) side 0. */
export function historyRows(replays: readonly ReplayDoc[], contentHash: string): HistoryRow[] {
  return replays.map((r, index) => {
    const me = r.sides[0].isBot && !r.sides[1].isBot ? 1 : 0;
    const foe = me === 0 ? 1 : 0;
    const w = r.result.winner;
    return {
      index,
      opponent: r.sides[foe].label,
      isAI: r.sides[foe].isBot && !r.sides[foe].online,
      result: w === null ? 'draw' : w === me ? 'win' : 'loss',
      format: r.format,
      durationMs: r.result.tick * TICK_MS,
      playable: r.contentHash === contentHash,
    };
  });
}

/** One collection milestone row (the collection titles, content re-tune 2026-10-04). */
export interface MilestoneRow {
  /** The title it earns. */
  id: string;
  /** Progress toward it: cards owned, or cards at the level cap. */
  n: number;
  max: number;
  done: boolean;
}

/**
 * The collection milestones in content order: every title whose unlock is a collection goal
 * (`cardsOwned`, `albumComplete`, `cardsMaxed`, `collectionMaxed`), with progress from the save. A title
 * already owned is done even if a later content release added cards (titles are never taken away).
 */
export function collectionMilestones(save: SaveDoc, content: Content): MilestoneRow[] {
  const ids = [...content.order.units, ...content.order.turrets];
  const cap = content.economy.maxLevel;
  const owned = ids.filter((id) => isOwned(save, id, content)).length;
  const maxedIn = (list: readonly CardId[]): number => list.filter((id) => (save.collection[id]?.level ?? 0) >= cap).length;
  const rows: MilestoneRow[] = [];
  for (const title of content.cosmetics.titles) {
    const u = title.unlock;
    let n: number;
    let max: number;
    if (u.kind === 'cardsOwned') [n, max] = [Math.min(owned, u.count), u.count];
    else if (u.kind === 'albumComplete') [n, max] = [owned, ids.length];
    else if (u.kind === 'cardsMaxed') [n, max] = [Math.min(maxedIn(ids), u.count), u.count];
    else if (u.kind === 'collectionMaxed') [n, max] = [maxedIn(ids), ids.length];
    else continue;
    const done = save.cosmetics.owned.includes(title.id) || n >= max;
    rows.push({ id: title.id, n: done ? max : n, max, done });
  }
  return rows;
}
