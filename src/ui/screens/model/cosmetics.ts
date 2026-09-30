/**
 * The cosmetic collections as the screens see them (DESIGN A18.9.4): ownership, completion counts,
 * how a locked item is earned and the equipped look. Mirrors the meta rules (starters and the six
 * starter emotes are owned by everyone), so the screens can mark tiles without calling meta.
 */
import type { Content, CosmeticCollection, CosmeticItemDef } from '@/content/types';
import type { CosmeticLoadout, SaveDoc } from '@/contracts';

export const COLLECTIONS: readonly CosmeticCollection[] = ['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop'];

export const itemKey = (x: Pick<CosmeticItemDef, 'collection' | 'id'>): string => `${x.collection}.${x.id}`;

export function itemsOf(content: Content, c: CosmeticCollection): CosmeticItemDef[] {
  return content.cosmetics.collections.items.filter((x) => x.collection === c);
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

/** The save's equipped items (the content defaults for a save without them). */
export function equippedOf(save: SaveDoc, content: Content): CosmeticLoadout {
  const e = (save.cosmetics as Partial<SaveDoc['cosmetics']>).equipped;
  if (e) return e.backdrop === undefined ? { ...e, backdrop: null } : e;
  const d = content.cosmetics.collections.defaults;
  return { emotes: [...d.emotes], quotes: [...d.quotes], baseFlag: d.baseFlag, nationalFlag: d.nationalFlag, baseSkins: {}, decorations: [...d.decorations], backdrop: d.backdrop ?? null };
}

/** "12/40 found": owned (starters included) and total per collection. */
export function progressOf(save: SaveDoc, content: Content, c: CosmeticCollection): { owned: number; total: number } {
  const items = itemsOf(content, c);
  return { owned: items.filter((x) => owns(save, content, itemKey(x))).length, total: items.length };
}

/** The collection items a Trophy Road node grants when claimed (source `road` at its trophies). */
export function roadItemsAt(content: Content, trophies: number): CosmeticItemDef[] {
  return content.cosmetics.collections.items.filter((x) => x.source.kind === 'road' && x.source.trophies === trophies);
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
    case 'capsuleTier':
      // A6.4 step 8 (the Aeon Collection); `tier` is the tier id: the caller shows `capsuleTier.<id>.short`
      return { key: 'cosmetic.ui.source.capsuleTier', params: { tier: s.tier } };
  }
}

/**
 * The Dust price when the item can be crafted, else null: drop-pool items by rarity, and a tier's
 * own set (the Aeon Collection) at `capsules.exclusiveCraftDust` (A6.4, A18.9.4; `meta.cosmeticCraftPrice`).
 */
export function craftPrice(content: Content, x: CosmeticItemDef): number | null {
  if (x.source.kind === 'capsuleTier') return content.capsules.exclusiveCraftDust;
  return x.source.kind === 'capsule' || x.source.kind === 'crate' ? content.cosmetics.collections.drops.craftDust[x.rarity] : null;
}

/**
 * A tier-exclusive item can be crafted only once the save has opened a capsule of that tier
 * (`flags['capsule.first.<tier>']`, A6.4). True while that is still ahead.
 */
export function craftLocked(save: SaveDoc, x: CosmeticItemDef): boolean {
  return x.source.kind === 'capsuleTier' && save.flags[`capsule.first.${x.source.tier}`] !== true;
}
