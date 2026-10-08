/**
 * The Flag Atlas (PLAN 2d, owner decisions 2026-10-08): national flags bought with Dust, browsed by
 * region, with region completion rewards that are earned and never sold. Pure and deterministic (B2).
 *
 * Owned by Track D. C0 landed the signatures below with a working baseline (the buy is the craft path,
 * `meta/cosmetics.ts`, plus the rewards a purchase completes; a plain progress count; a simple search),
 * so the services, the app and Customize could be wired once; Track D fills in the rest (the search's
 * full rules, anything the Atlas screen needs) behind the same signatures.
 *
 * - Price: every flag costs `drops.flagDust` (500); a save that owns no national flag gets its first
 *   one for 0 while `drops.firstFlagFree` is on (once, any country), see `nationalFlagPrice`.
 * - A purchase cannot be undone: the UI's two-tap confirm (`useConfirmSpend`, U14) is the safeguard.
 * - An unopened capsule rolled before 2026-10-08 that holds a flag keeps it (reason `pending`).
 */
import type { I18n, Result, SaveDoc } from '@/contracts';
import { flagAliasesKey, FLAG_REGIONS, type Content, type CosmeticItemDef, type FlagRegion } from '@/content';
import { collectionItems, cosmeticItem, cosmeticKey, craftCosmetic, equippedOf, nationalFlagPrice, syncEarnedCosmetics } from './cosmetics';
import { unlockTitles } from './titles';

/** One region of the Atlas: its released flags, how many the save owns, and its completion reward. */
export interface FlagRegionProgress {
  region: FlagRegion;
  owned: number;
  total: number;
  /** The region's reward (`baseFlag.<id>`, source `flagRegion`), or null (the Other flags have none, or it is not released yet). */
  reward: string | null;
  rewardOwned: boolean;
}

/** The Atlas as the screens show it. */
export interface FlagAtlasProgress {
  /** Owned flags of the six regions and how many there are (the "37/195"); the Other flags do not count. */
  owned: number;
  total: number;
  /** Every browsing group in chip order (`FLAG_REGIONS`), the Other flags last. */
  regions: FlagRegionProgress[];
  /** What the next flag costs in Dust (0 for a save's first flag while `firstFlagFree` is on). */
  price: number;
  /** The equipped national flag (`nationalFlag.<id>`), or null. */
  equipped: string | null;
}

/** What the search reads from i18n: the flag names, and their aliases when a flag has any. */
export type FlagNames = Pick<I18n, 't' | 'has'>;

/**
 * Buys a national flag with Dust at its price (the craft path) and grants what the purchase completes:
 * a region's reward, the World Compass and the World Ambassador title (PLAN 2d: "granted automatically
 * on the completing purchase"). Reasons: wrongCollection (not a national flag), plus `craftCosmetic`'s:
 * unknownItem, unreleased, owned, pending, notEnoughDust.
 */
export function buyNationalFlag(s: SaveDoc, t: Content, key: string): Result<SaveDoc> {
  const x = cosmeticItem(t, key);
  if (!x || x.collection !== 'nationalFlag') return { ok: false, reason: x ? 'wrongCollection' : 'unknownItem' };
  const bought = craftCosmetic(s, t, key);
  if (!bought.ok) return bought;
  const earned = syncEarnedCosmetics(bought.value, t).save;
  return { ok: true, value: unlockTitles(earned, t).save };
}

/** The Atlas's counts per region and in all, its rewards, the price of the next flag and the equipped one. */
export function flagAtlasProgress(s: SaveDoc, t: Content): FlagAtlasProgress {
  const owned = new Set(s.cosmetics.owned);
  const has = (x: CosmeticItemDef): boolean => owned.has(cosmeticKey(x));
  const flags = collectionItems(t, 'nationalFlag');
  const rewards = collectionItems(t, 'baseFlag').filter((x) => x.source.kind === 'flagRegion');
  const regions = FLAG_REGIONS.map((region): FlagRegionProgress => {
    const list = flags.filter((x) => x.region === region);
    const reward = rewards.find((x) => x.source.kind === 'flagRegion' && x.source.region === region);
    return { region, owned: list.filter(has).length, total: list.length, reward: reward ? cosmeticKey(reward) : null, rewardOwned: reward ? has(reward) : false };
  });
  const atlas = flags.filter((x) => x.region !== 'other');
  return { owned: atlas.filter(has).length, total: atlas.length, regions, price: nationalFlagPrice(s, t), equipped: equippedOf(s, t).nationalFlag };
}

/** Lower case without accents, for matching ("Côte d'Ivoire" → "cote d'ivoire"). */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/**
 * The released national flags matching `q`, in content order: a prefix of the English name or of any
 * word in it, accent-insensitive; a prefix of an alias (`cosmetic.nationalFlag.<id>.aliases`, comma
 * separated: "UK", "USA", "Holland"); or the ISO code. An empty query lists every flag.
 */
export function searchFlags(t: Content, i18n: FlagNames, q: string): CosmeticItemDef[] {
  const flags = collectionItems(t, 'nationalFlag');
  const needle = fold(q);
  if (needle === '') return flags;
  const matches = (name: string): boolean => {
    const n = fold(name);
    return n.startsWith(needle) || n.split(/[\s'’-]+/).some((w) => w.startsWith(needle));
  };
  return flags.filter((x) => {
    if (x.id === needle || x.country === needle) return true;
    if (matches(i18n.t(x.nameKey))) return true;
    const aliases = flagAliasesKey(x.id);
    return i18n.has(aliases) && i18n.t(aliases).split(',').some(matches);
  });
}
