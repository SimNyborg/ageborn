/**
 * Collection filters (A9 #10): age, class (the unit class badge, or all turrets, or all powers), rarity,
 * and owned / missing. The filter uses the same class the card badge shows (owner feedback 2026-09-28).
 */
import type { Content } from '@/content/types';
import type { AgeId, CardId, Rarity, SaveDoc } from '@/contracts';
import type { CardClass } from '@/core/cardClass';
import { cardClassOf, cardDef, isOwned } from './cards';

export type AgeFilter = 'all' | AgeId;
export type RarityFilter = 'all' | Rarity;
export type Ownership = 'all' | 'owned' | 'missing';
/** A unit class (as on the card badge), or all turrets, or all powers. */
export type RoleFilter = 'all' | CardClass;

export interface CollectionFilter {
  age: AgeFilter;
  rarity: RarityFilter;
  role: RoleFilter;
  own: Ownership;
}

export const NO_FILTER: CollectionFilter = { age: 'all', rarity: 'all', role: 'all', own: 'all' };

/** Cards matching the filter in display order: units, turrets, powers (DESIGN table order). */
export function filterCards(save: SaveDoc, content: Content, f: CollectionFilter): CardId[] {
  const ids = [...content.order.units, ...content.order.turrets, ...content.order.powers];
  return ids.filter((id) => {
    const def = cardDef(content, id);
    if (!def) return false;
    if (f.age !== 'all' && def.age !== f.age) return false;
    if (f.rarity !== 'all' && (def.kind === 'power' || def.rarity !== f.rarity)) return false;
    if (f.role !== 'all' && cardClassOf(def) !== f.role) return false;
    const owned = isOwned(save, id, content);
    if (f.own === 'owned' && !owned) return false;
    if (f.own === 'missing' && owned) return false;
    return true;
  });
}

/** One feat in the Feats tab (A15.10). Obscure feats are listed last. */
export interface FeatView {
  id: string;
  found: boolean;
  hinted: boolean;
  dust: number;
  title: string | null;
  nameKey: string;
  riddleKey: string;
  hintKey: string;
}

export function featViews(save: SaveDoc, content: Content): FeatView[] {
  const tables = content.feats;
  const list = tables.order.map((id) => tables.list[id]).filter((f): f is NonNullable<typeof f> => !!f);
  const ordered = [...list.filter((f) => !f.obscure), ...list.filter((f) => f.obscure)];
  return ordered.map((f) => ({
    id: f.id,
    found: save.flags[`feat.${f.id}`] === true,
    hinted: save.flags[`featHint.${f.id}`] === true,
    dust: f.dust,
    title: f.title,
    nameKey: f.nameKey,
    riddleKey: f.riddleKey,
    hintKey: f.hintKey,
  }));
}
