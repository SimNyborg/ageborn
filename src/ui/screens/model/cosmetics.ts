/**
 * The cosmetic collections as the screens see them (DESIGN A18.9.4): ownership, completion counts,
 * how a locked item is earned and the equipped look. Mirrors the meta rules (starters and the six
 * starter emotes are owned by everyone), so the screens can mark tiles without calling meta.
 *
 * The release gate (PLAN 2e): an item with `released: false` is never listed, counted or offered here
 * (Customize, the Trophy Road, the Flag Atlas); `findItem` still finds it by key.
 */
import { ageNameKey, capsuleTierShortKey, flagRegionNameKey, titleNameKey } from '@/content/keys';
import type { Content, CosmeticCollection, CosmeticItemDef } from '@/content/types';
import type { CosmeticLoadout, SaveDoc } from '@/contracts';

export const COLLECTIONS: readonly CosmeticCollection[] = ['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop', 'scene'];

/** Every collection, the avatar wearables included (they live in Customize › General, not their own tab). */
export const ALL_COLLECTIONS: readonly CosmeticCollection[] = [...COLLECTIONS, 'avatar'];

export const itemKey = (x: Pick<CosmeticItemDef, 'collection' | 'id'>): string => `${x.collection}.${x.id}`;

/** True when players may meet the item (PLAN 2e release gate; mirrors `isCosmeticReleased`). */
export const isReleasedItem = (x: Pick<CosmeticItemDef, 'released'>): boolean => x.released !== false;

/** The released items of one collection, in content order. */
export function itemsOf(content: Content, c: CosmeticCollection): CosmeticItemDef[] {
  return content.cosmetics.collections.items.filter((x) => x.collection === c && isReleasedItem(x));
}

export function findItem(content: Content, key: string): CosmeticItemDef | undefined {
  return content.cosmetics.collections.items.find((x) => itemKey(x) === key);
}

export function isStarterEmote(content: Content, id: string): boolean {
  return content.cosmetics.emotes.some((e) => e.id === id);
}

export function owns(save: SaveDoc, content: Content, key: string): boolean {
  if (isStarterEmote(content, key)) return true;
  const x = findItem(content, key);
  return !!x && (x.source.kind === 'start' || save.cosmetics.owned.includes(key));
}

/** The save's equipped items (the content defaults for a save without them; a look from before save v14 has no scenes). */
export function equippedOf(save: SaveDoc, content: Content): CosmeticLoadout {
  const e = (save.cosmetics as Partial<SaveDoc['cosmetics']>).equipped;
  if (e) return e.backdrop !== undefined && e.scenes !== undefined ? e : { ...e, backdrop: e.backdrop ?? null, scenes: e.scenes ?? {} };
  const d = content.cosmetics.collections.defaults;
  return {
    emotes: [...d.emotes],
    quotes: [...d.quotes],
    baseFlag: d.baseFlag,
    nationalFlag: d.nationalFlag,
    baseSkins: {},
    decorations: [...d.decorations],
    backdrop: d.backdrop ?? null,
    scenes: { ...(d.scenes ?? {}) },
  };
}

/** "12/40 found": owned (starters included) and total per collection. */
export function progressOf(save: SaveDoc, content: Content, c: CosmeticCollection): { owned: number; total: number } {
  const items = itemsOf(content, c);
  return { owned: items.filter((x) => owns(save, content, itemKey(x))).length, total: items.length };
}

/** The released collection items a Trophy Road node grants when claimed (source `road` at its trophies). */
export function roadItemsAt(content: Content, trophies: number): CosmeticItemDef[] {
  return content.cosmetics.collections.items.filter((x) => x.source.kind === 'road' && x.source.trophies === trophies && isReleasedItem(x));
}

/** Owned items first (in content order), then the rest. */
export function ownedFirst(save: SaveDoc, content: Content, items: readonly CosmeticItemDef[]): CosmeticItemDef[] {
  const o = items.filter((x) => owns(save, content, itemKey(x)));
  return [...o, ...items.filter((x) => !o.includes(x))];
}

/** The i18n key and params that say how a locked item is earned. */
export function sourceHint(x: CosmeticItemDef): { key: string; params?: Record<string, string | number> } {
  const s = x.source;
  switch (s.kind) {
    case 'start':
      return { key: 'cosmetic.ui.source.start' };
    case 'capsule':
      return { key: 'cosmetic.ui.source.capsule' };
    case 'crate':
      return { key: 'cosmetic.ui.source.crate' };
    case 'road':
      return { key: 'cosmetic.ui.source.road', params: { n: s.trophies } };
    case 'feat':
      return { key: 'cosmetic.ui.source.feat' };
    case 'arena':
      return { key: 'cosmetic.ui.source.arena', params: { n: s.arena } };
    case 'codexLevel':
      return { key: 'cosmetic.ui.source.codex', params: { n: s.level } };
    case 'warPath':
      return { key: 'cosmetic.ui.source.warPath' };
    case 'warPathBoss':
      // `age` is the age id: the caller shows `age.<id>.name`
      return { key: 'cosmetic.ui.source.warPathBoss', params: { age: s.age } };
    case 'warPathStars':
      return { key: 'cosmetic.ui.source.warPathStars', params: { age: s.age } };
    case 'title':
      // `title` is the title id: the caller shows `title.<id>.name`
      return { key: 'cosmetic.ui.source.title', params: { title: s.title } };
    case 'capsuleTier':
      // A6.4 step 8 (the Aeon Collection); `tier` is the tier id: the caller shows `capsuleTier.<id>.short`
      return { key: 'cosmetic.ui.source.capsuleTier', params: { tier: s.tier } };
    case 'dust':
      // PLAN 2d: national flags are bought with Dust at one price
      return { key: 'cosmetic.ui.source.dust' };
    case 'flagRegion':
      // `region` is the region id: the caller shows `cosmetic.flagRegion.<id>.name`
      return { key: 'cosmetic.ui.source.flagRegion', params: { region: s.region } };
    case 'flagsOwned':
      return { key: 'cosmetic.ui.source.flagsOwned', params: { n: s.count } };
  }
}

/** How a locked item is earned, as display text (age, tier and title names resolved). */
export function sourceText(t: (key: string, params?: Record<string, string | number>) => string, x: CosmeticItemDef): string {
  const h = sourceHint(x);
  const s = x.source;
  if (s.kind === 'capsuleTier') return t(h.key, { tier: t(capsuleTierShortKey(s.tier)) });
  if (s.kind === 'warPathBoss' || s.kind === 'warPathStars') return t(h.key, { age: t(ageNameKey(s.age)) });
  if (s.kind === 'title') return t(h.key, { title: t(titleNameKey(s.title)) });
  if (s.kind === 'flagRegion') return t(h.key, { region: t(flagRegionNameKey(s.region)) });
  return t(h.key, h.params);
}

/**
 * The Dust price when the item can be crafted, else null: drop-pool items by rarity, a tier's own set
 * (the Aeon Collection) at `capsules.exclusiveCraftDust` (A6.4, A18.9.4), and a national flag at its
 * one price `drops.flagDust`, or 0 for a save's first flag while `drops.firstFlagFree` is on (PLAN 2d;
 * pass the save). Mirrors `meta.cosmeticCraftPrice`.
 */
export function craftPrice(content: Content, x: CosmeticItemDef, save?: SaveDoc): number | null {
  const d = content.cosmetics.collections.drops;
  if (x.source.kind === 'capsuleTier') return content.capsules.exclusiveCraftDust;
  if (x.source.kind === 'dust') return save ? nationalFlagPrice(save, content) : d.flagDust;
  return x.source.kind === 'capsule' || x.source.kind === 'crate' ? d.craftDust[x.rarity] : null;
}

/** What the save's next national flag costs: 0 while it owns none and `firstFlagFree` is on, else `flagDust` (mirrors meta). */
export function nationalFlagPrice(save: SaveDoc, content: Content): number {
  const d = content.cosmetics.collections.drops;
  if (d.firstFlagFree && !save.cosmetics.owned.some((k) => k.startsWith('nationalFlag.') && findItem(content, k) !== undefined)) return 0;
  return d.flagDust;
}

/**
 * A tier-exclusive item can be crafted only once the save has opened a capsule of that tier
 * (`flags['capsule.first.<tier>']`, A6.4). True while that is still ahead.
 */
export function craftLocked(save: SaveDoc, x: CosmeticItemDef): boolean {
  return x.source.kind === 'capsuleTier' && save.flags[`capsule.first.${x.source.tier}`] !== true;
}
