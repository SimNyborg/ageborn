/**
 * NEW until seen (save v15 `cosmetics.fresh`, PLAN 2a): a collection item that came from a capsule, a
 * crate or an earned reward wears a NEW pip on its Customize card, and the tab that holds it a dot.
 *
 * - Opening a tab counts as seeing its items: the screen marks them seen at once (one quiet save write),
 *   so the tab's dot goes, while the cards keep their pip for the rest of this visit (the screen's
 *   snapshot, {@link FreshContext}); next time they are plain.
 * - Only released items the tab shows count, so an item hidden by the release gate never keeps a dot lit.
 */
import type { Content, CosmeticCollection } from '@/content/types';
import type { AgeId, SaveDoc } from '@/contracts';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { CustomizeTab } from '../../router';
import { findItem } from '../model/cosmetics';

/** The collections each Customize tab shows: what its dot counts and what a visit marks seen. */
export const TAB_COLLECTIONS: Readonly<Partial<Record<CustomizeTab, readonly CosmeticCollection[]>>> = {
  general: ['avatar'],
  bases: ['baseSkin'],
  backdrops: ['scene', 'backdrop'],
  flags: ['baseFlag', 'nationalFlag'],
  decorations: ['decoration'],
  emotes: ['emote'],
  quotes: ['quote'],
};

/** The save's NEW keys in `collections` (released items only), oldest first. */
export function freshKeys(s: SaveDoc, content: Content, collections: readonly CosmeticCollection[]): string[] {
  return (s.cosmetics.fresh ?? []).filter((k) => {
    const x = findItem(content, k);
    return !!x && x.released !== false && collections.includes(x.collection) && s.cosmetics.owned.includes(k);
  });
}

/** The keys that were NEW when the screen opened (the cards' pips for this visit). */
export const FreshContext = createContext<ReadonlySet<string>>(new Set());

export function useFresh(): ReadonlySet<string> {
  return useContext(FreshContext);
}

/** The age of the newest NEW item of an age-bound collection (base skins, scenes), so its tab opens there. */
export function freshAge(fresh: ReadonlySet<string>, content: Content, collection: 'baseSkin' | 'scene'): AgeId | null {
  let age: AgeId | null = null;
  for (const k of fresh) {
    const x = findItem(content, k);
    if (x && x.collection === collection && x.released !== false && x.age) age = x.age;
  }
  return age;
}
