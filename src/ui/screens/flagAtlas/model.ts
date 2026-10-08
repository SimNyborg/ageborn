/**
 * The Flag Atlas's screen model (PLAN 2d): the flags in display order with their state, the region
 * sections, and what the detail's primary button offers. Pure; the screen renders it. Owned by Track D.
 */
import type { SaveDoc } from '@/contracts';
import type { Content, CosmeticItemDef, FlagRegion } from '@/content/types';
import { findItem } from '../model/cosmetics';
import type { FlagAtlasInfo, FlagRegionInfo } from './types';

/** One flag on the grid. */
export interface AtlasFlag {
  key: string;
  item: CosmeticItemDef;
  region: FlagRegion;
  owned: boolean;
  equipped: boolean;
}

/** A region's block of the grid (one per region in chip order; one unnamed block for search results). */
export interface AtlasSection {
  region: FlagRegion | null;
  info: FlagRegionInfo | null;
  flags: AtlasFlag[];
}

/** The chip filter: a region, or every region. */
export type RegionFilter = FlagRegion | 'all';

/** The flags of `keys` (the search's display order) with their owned and equipped state. Unknown keys are skipped. */
export function atlasFlags(save: SaveDoc, content: Content, keys: readonly string[], equipped: string | null): AtlasFlag[] {
  const owned = new Set(save.cosmetics.owned);
  const out: AtlasFlag[] = [];
  for (const key of keys) {
    const item = findItem(content, key);
    if (!item || item.collection !== 'nationalFlag') continue;
    out.push({ key, item, region: item.region ?? 'other', owned: owned.has(key), equipped: key === equipped });
  }
  return out;
}

/**
 * The grid's blocks. A search shows one block of results from every region (the region is only a
 * browsing group); otherwise one block per region in chip order, or only the chosen region's block.
 */
export function atlasSections(flags: readonly AtlasFlag[], atlas: FlagAtlasInfo, filter: RegionFilter, searching: boolean): AtlasSection[] {
  if (searching) return [{ region: null, info: null, flags: [...flags] }];
  const regions = atlas.regions.filter((r) => filter === 'all' || r.region === filter);
  return regions.map((info) => ({ region: info.region, info, flags: flags.filter((f) => f.region === info.region) })).filter((s) => s.flags.length > 0);
}

/** What the detail's primary offers for a flag. */
export type AtlasAction =
  /** The save's first flag: it costs no Dust (two taps, it can be done only once). */
  | { kind: 'claim' }
  /** Buy for `price` Dust, leaving `after` (two taps). */
  | { kind: 'buy'; price: number; after: number }
  /** Not enough Dust: `missing` more needed. */
  | { kind: 'need'; price: number; missing: number }
  /** Owned: fly it on your base. */
  | { kind: 'fly' }
  /** Already flying. */
  | { kind: 'flying' };

export function atlasAction(flag: Pick<AtlasFlag, 'owned' | 'equipped'>, price: number, dust: number): AtlasAction {
  if (flag.equipped) return { kind: 'flying' };
  if (flag.owned) return { kind: 'fly' };
  if (price <= 0) return { kind: 'claim' };
  if (dust < price) return { kind: 'need', price, missing: price - dust };
  return { kind: 'buy', price, after: dust - price };
}

/**
 * The reward a purchase just completed, comparing the Atlas before and after it: a region's pennant,
 * then (on the same purchase) the World Compass. Rewards owned before never show again.
 */
export function newRewards(before: FlagAtlasInfo, after: FlagAtlasInfo): ({ kind: 'region'; region: FlagRegion; reward: string } | { kind: 'world'; reward: string | null; title: string | null })[] {
  const out: ({ kind: 'region'; region: FlagRegion; reward: string } | { kind: 'world'; reward: string | null; title: string | null })[] = [];
  for (const r of after.regions) {
    const was = before.regions.find((x) => x.region === r.region);
    if (r.reward && r.rewardOwned && !was?.rewardOwned) out.push({ kind: 'region', region: r.region, reward: r.reward });
  }
  const w = after.world;
  const bw = before.world;
  if (w && ((w.reward && w.rewardOwned && !bw?.rewardOwned) || (w.title && w.titleOwned && !bw?.titleOwned))) out.push({ kind: 'world', reward: w.reward, title: w.title });
  return out;
}
