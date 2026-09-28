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
  return {
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
  /** Always true in v1: every opponent is an AI (A7.1). Kept so the marker can never be skipped. */
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
      isAI: r.sides[foe].isBot,
      result: w === null ? 'draw' : w === me ? 'win' : 'loss',
      format: r.format,
      durationMs: r.result.tick * TICK_MS,
      playable: r.contentHash === contentHash,
    };
  });
}
