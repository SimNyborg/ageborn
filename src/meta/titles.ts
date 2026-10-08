/**
 * Profile titles (DESIGN A5.8 "13 titles", A6.1). Titles, banners and frames live in
 * `SaveDoc.cosmetics.owned` by their content ids. State-based titles (wins, Codex Level, arena, owned
 * cards, Conquest stars, national flags owned) are checked against the save; match-based ones need the
 * match facts.
 */
import type { FormatId, SaveDoc } from '@/contracts';
import type { Content, TitleUnlock } from '@/content';
import { ownedNationalFlags } from './cosmetics';
import { formatKind } from './formats';
import { ageCards, isOwned } from './tables';

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
      // `futureReached` counts matches that reached the game's last age (A17.13: Cosmic).
      if (u.age === t.order.ages[t.order.ages.length - 1] && s.stats.futureReached > 0) return true;
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
      // A window counts as its family (A18.3.4: a Full War from Bronze is a Full War); Last Base Standing
      // plays the Full War's 7 ages and counts as one (A2.10.1).
      return !!m && sameFamily(formatKind(t, m.format), u.format) && m.reachedFinalAgeAtMs !== null && m.reachedFinalAgeAtMs < u.ms;
    case 'wins':
      return s.stats.wins >= u.count;
    case 'beatGeneral':
      return !!m && m.win && m.generalId === u.general;
    case 'conquestStars':
      return conquestStarTotal(s) >= u.stars;
    case 'cardsOwned':
      return collectable(t).filter((id) => isOwned(s, id)).length >= u.count;
    case 'albumComplete':
      return collectable(t).every((id) => isOwned(s, id));
    case 'cardsMaxed':
      return collectable(t).filter((id) => maxed(s, t, id)).length >= u.count;
    case 'collectionMaxed':
      return collectable(t).every((id) => maxed(s, t, id));
    case 'feat':
      return s.flags[`feat.${u.feat}`] === true;
    case 'flagsOwned':
      // PLAN 2d: the Flag Atlas's "World Ambassador" (the six regions; the Other flags do not count)
      return ownedNationalFlags(s, t) >= u.count;
  }
}

/** Every collectable troop and turret card (released, not hidden), every age (the collection milestones). */
function collectable(t: Content): string[] {
  return t.order.ages.flatMap((age) => {
    const { units, turrets } = ageCards(t, age);
    return [...units, ...turrets];
  });
}

function maxed(s: Pick<SaveDoc, 'collection'>, t: Content, id: string): boolean {
  return (s.collection[id]?.level ?? 0) >= t.economy.maxLevel;
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

/** A title's format family, with Last Base Standing counting as the Full War (A2.10.1: the same 7 ages). */
function sameFamily(kind: string, wanted: string): boolean {
  return kind === wanted || (kind === 'untimed' && wanted === 'full');
}
