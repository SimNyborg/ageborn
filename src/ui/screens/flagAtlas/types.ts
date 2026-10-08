/**
 * The Flag Atlas as the screens receive it (PLAN 2d): `services.flagAtlasProgress()` returns this,
 * built by meta's `flagAtlasProgress` (`src/meta/flagAtlas.ts`, which may not be imported here, B2).
 * Owned by Track D, like both ends: a field added to meta's `FlagAtlasProgress` reaches the screen once
 * it is added here too (the app's `flagServices` passes meta's value through and typechecks the match).
 */
import type { FlagRegion } from '@/content/types';

/** One browsing group. */
export interface FlagRegionInfo {
  region: FlagRegion;
  /** Released flags of the region the save owns, and how many there are. */
  owned: number;
  total: number;
  /** The region's completion reward (`baseFlag.<id>`), or null (the Other flags have none, or it is not released yet). */
  reward: string | null;
  rewardOwned: boolean;
}

/** The Atlas. */
export interface FlagAtlasInfo {
  /** Owned flags of the six regions and their number (the "37/195"); the Other flags do not count. */
  owned: number;
  total: number;
  /** Every browsing group in chip order, the Other flags last. */
  regions: FlagRegionInfo[];
  /** What the next flag costs in Dust (0 for a save's first flag while the content's `firstFlagFree` is on). */
  price: number;
  /** The equipped national flag (`nationalFlag.<id>`), or null. */
  equipped: string | null;
}
