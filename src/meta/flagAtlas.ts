/**
 * The Flag Atlas (PLAN 2d, owner decisions 2026-10-08): national flags bought with Dust, browsed by
 * region, with region completion rewards that are earned and never sold. Pure and deterministic (B2).
 * Owned by Track D.
 *
 * - Price: every flag costs `drops.flagDust` (500); a save that owns no national flag gets its first
 *   one for 0 while `drops.firstFlagFree` is on (once, any country), see `nationalFlagPrice`.
 * - Buying is the craft path (`craftCosmetic`); the purchase then grants what it completes: a region's
 *   Region Pennant, the World Compass at all 195 and the World Ambassador title. A grant happens once:
 *   an owned key is never granted again, so a reload or a second sync changes nothing.
 * - A purchase cannot be undone: the UI's two-tap confirm (`useConfirmSpend`, U14) is the safeguard.
 * - An unopened capsule rolled before 2026-10-08 that holds a flag keeps it (reason `pending`).
 * - The search (`searchFlags`) and the Atlas's order are deterministic: regions in chip order, flags by
 *   their English name with accents folded; search results best match first.
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

/** The reward for all of the Atlas's flags (the six regions): the World Compass base flag and the World Ambassador title. */
export interface FlagWorldProgress {
  /** How many flags it takes (195). */
  count: number;
  /** The base flag (`baseFlag.world_compass`, source `flagsOwned`), or null when there is none (or it is not released). */
  reward: string | null;
  rewardOwned: boolean;
  /** The title id (unlock `flagsOwned`), or null. */
  title: string | null;
  titleOwned: boolean;
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
  /** The reward for all 195. */
  world: FlagWorldProgress;
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
  const rewards = collectionItems(t, 'baseFlag');
  const regions = FLAG_REGIONS.map((region): FlagRegionProgress => {
    const list = flags.filter((x) => x.region === region);
    const reward = rewards.find((x) => x.source.kind === 'flagRegion' && x.source.region === region);
    return { region, owned: list.filter(has).length, total: list.length, reward: reward ? cosmeticKey(reward) : null, rewardOwned: reward ? has(reward) : false };
  });
  const atlas = flags.filter((x) => x.region !== 'other');
  const compass = rewards.find((x) => x.source.kind === 'flagsOwned');
  const title = t.cosmetics.titles.find((x) => x.unlock.kind === 'flagsOwned');
  const count = compass?.source.kind === 'flagsOwned' ? compass.source.count : title?.unlock.kind === 'flagsOwned' ? title.unlock.count : atlas.length;
  return {
    owned: atlas.filter(has).length,
    total: atlas.length,
    regions,
    price: nationalFlagPrice(s, t),
    equipped: equippedOf(s, t).nationalFlag,
    world: {
      count,
      reward: compass ? cosmeticKey(compass) : null,
      rewardOwned: compass ? has(compass) : false,
      title: title?.id ?? null,
      titleOwned: title ? owned.has(title.id) : false,
    },
  };
}

/** Letters NFD does not split into a base letter and a mark. */
const SPECIAL: Readonly<Record<string, string>> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', ı: 'i', þ: 'th' };

/**
 * A name folded for matching and sorting: lower case, accents off, and every run of other characters
 * (spaces, apostrophes, hyphens, dots) one space ("Côte d'Ivoire" → "cote d ivoire", "St. Lucia" →
 * "st lucia", "Guinea-Bissau" → "guinea bissau").
 */
export function foldName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[øæœßłđıþ]/g, (c) => SPECIAL[c] ?? c)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** True when `q` starts the folded text at a word boundary ("ivoire" in "cote d ivoire"). */
const fromWord = (folded: string, q: string): boolean => ` ${folded}`.includes(` ${q}`);

/** Byte-wise comparison of folded names (deterministic, locale-free). */
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The released national flags in the Atlas's order: the regions in chip order, then by English name. */
export function atlasOrder(t: Content, i18n: FlagNames): CosmeticItemDef[] {
  const flags = collectionItems(t, 'nationalFlag');
  const rank = new Map(FLAG_REGIONS.map((r, i) => [r, i]));
  const name = new Map(flags.map((x) => [x.id, foldName(i18n.t(x.nameKey))]));
  return flags
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (rank.get(a.x.region ?? 'other') ?? 99) - (rank.get(b.x.region ?? 'other') ?? 99) || byText(name.get(a.x.id) ?? '', name.get(b.x.id) ?? '') || a.i - b.i)
    .map((e) => e.x);
}

/**
 * How well a flag matches a query (lower is better), or null: 0 the whole name or an alias, 1 the ISO
 * code (`dk`, `gb-eng`), 2 a prefix of the name, 3 a prefix from any word of the name on, 4 a prefix of
 * an alias or from any of its words on. `q` is folded; `raw` is the query in lower case (for codes).
 */
function matchRank(x: CosmeticItemDef, name: string, aliases: readonly string[], q: string, raw: string): number | null {
  const code = x.country ?? x.id;
  if (name === q || aliases.includes(q)) return 0;
  if (raw === code || raw === x.id || q === foldName(code)) return 1;
  if (name.startsWith(q)) return 2;
  if (fromWord(name, q)) return 3;
  if (aliases.some((a) => fromWord(a, q))) return 4;
  return null;
}

/**
 * The released national flags matching `q`, best match first and then in name order: the whole name or
 * an alias, the ISO code, a prefix of the name, a prefix of a word in it, a prefix of an alias
 * (`cosmetic.nationalFlag.<id>.aliases`, comma separated: "UK", "USA", "Holland"); accents, apostrophes
 * and case never matter ("cote", "türk", "TURK"). The region is only a browsing group: the search covers
 * every region. An empty query lists every flag in the Atlas's order.
 */
export function searchFlags(t: Content, i18n: FlagNames, q: string): CosmeticItemDef[] {
  const order = atlasOrder(t, i18n);
  const needle = foldName(q);
  if (needle === '') return order;
  const raw = q.trim().toLowerCase();
  const hits: { x: CosmeticItemDef; rank: number; name: string }[] = [];
  for (const x of order) {
    const name = foldName(i18n.t(x.nameKey));
    const key = flagAliasesKey(x.id);
    const aliases = i18n.has(key) ? i18n.t(key).split(',').map(foldName).filter(Boolean) : [];
    const rank = matchRank(x, name, aliases, needle, raw);
    if (rank !== null) hits.push({ x, rank, name });
  }
  return hits.sort((a, b) => a.rank - b.rank || byText(a.name, b.name)).map((h) => h.x);
}
