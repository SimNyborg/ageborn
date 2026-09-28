/**
 * Profile titles (DESIGN A5.8 "13 titles", A6.1). Titles, banners and frames live in
 * `SaveDoc.cosmetics.owned` by their content ids. State-based titles (wins, Codex Level, arena, owned
 * cards, Conquest stars) are checked against the save; match-based ones need the match facts.
 */
import type { FormatId, SaveDoc } from '@/contracts';
import type { Content, TitleUnlock } from '@/content';
import { isOwned } from './tables';

/** Facts of the match that just ended, for the match-based titles. */
export interface TitleMatchFacts {
  win: boolean;
  usedLastStand: boolean;
  format: FormatId;
  reachedFinalAgeAtMs: number | null;
  generalId: string;
}

/** Stars earned on the Conquest board. */
export function conquestStarTotal(s: Pick<SaveDoc, 'conquest'>): number {
  let n = 0;
  for (const id of Object.keys(s.conquest.stars).sort()) for (const x of s.conquest.stars[id] ?? []) if (x) n += 1;
  return n;
}

function earned(u: TitleUnlock, s: SaveDoc, t: Content, m: TitleMatchFacts | null): boolean {
  switch (u.kind) {
    case 'start':
      return true;
    case 'firstWin':
      return s.stats.wins >= 1;
    case 'reachAge': {
      if (u.age === 'future' && s.stats.futureReached > 0) return true;
      if (!m || m.reachedFinalAgeAtMs === null) return false;
      const ages = t.formats[m.format]?.ages ?? [];
      return ages[ages.length - 1] === u.age;
    }
    case 'ownCard':
      return isOwned(s, u.card);
    case 'codexLevel':
      return s.codexLevel >= u.level;
    case 'arena':
      return s.arenaIndex + 1 >= u.arena;
    case 'winAfterLastStand':
      return !!m && m.win && m.usedLastStand;
    case 'finalAgeBefore':
      return !!m && m.format === u.format && m.reachedFinalAgeAtMs !== null && m.reachedFinalAgeAtMs < u.ms;
    case 'wins':
      return s.stats.wins >= u.count;
    case 'beatGeneral':
      return !!m && m.win && m.generalId === u.general;
    case 'conquestStars':
      return conquestStarTotal(s) >= u.stars;
    case 'feat':
      return s.flags[`feat.${u.feat}`] === true;
  }
}

/** Adds every title the save has earned and not yet owned. Returns the save and the new title ids. */
export function unlockTitles(s: SaveDoc, t: Content, m: TitleMatchFacts | null = null): { save: SaveDoc; titles: string[] } {
  const owned = new Set(s.cosmetics.owned);
  const titles = t.cosmetics.titles.filter((d) => !owned.has(d.id) && earned(d.unlock, s, t, m)).map((d) => d.id);
  if (titles.length === 0) return { save: s, titles };
  return { save: { ...s, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, ...titles] } }, titles };
}

/** Adds cosmetic ids (banners, frames) that are not owned yet. */
export function addCosmetics(s: SaveDoc, ids: readonly string[]): SaveDoc {
  const fresh = ids.filter((id) => !s.cosmetics.owned.includes(id));
  if (fresh.length === 0) return s;
  return { ...s, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, ...fresh] } };
}
