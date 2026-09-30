/**
 * The Card Album (owner request 2026-09-30, "a long scroll like a Pokedex", ui-plan 4.3): every troop,
 * turret and power card, numbered once in age order (No. 1 is the first Stone troop), grouped by age
 * with each age's completion, and filtered by owned / missing, rarity and class. Pure.
 */
import type { Content } from '@/content/types';
import type { AgeId, CardId, Rarity, SaveDoc } from '@/contracts';
import type { CardClass } from '@/core/cardClass';
import { cardClassOf, cardDef, cardsOfAge, isOwned } from './cards';

export type DexOwn = 'all' | 'owned' | 'missing';

export interface DexFilter {
  own: DexOwn;
  rarity: Rarity | 'all';
  cls: CardClass | 'all';
}

export const DEX_FILTER: DexFilter = { own: 'all', rarity: 'all', cls: 'all' };

export interface DexEntry {
  id: CardId;
  /** The album number, stable under filters (1-based). */
  no: number;
  owned: boolean;
}

export interface DexAge {
  age: AgeId;
  /** The entries that pass the filter, in album order. */
  entries: DexEntry[];
  /** The age's completion over all of its cards (not the filter). */
  owned: number;
  total: number;
}

export interface Dex {
  ages: DexAge[];
  owned: number;
  total: number;
  /** Entries shown after the filter. */
  shown: number;
}

/** Every card in album order with its number: ages in order; troops, turrets, then powers. */
export function dexOrder(content: Content): { id: CardId; age: AgeId; no: number }[] {
  const out: { id: CardId; age: AgeId; no: number }[] = [];
  for (const age of content.order.ages) {
    const c = cardsOfAge(content, age);
    for (const id of [...c.units, ...c.turrets, ...c.powers]) out.push({ id, age, no: out.length + 1 });
  }
  return out;
}

export function activeDexFilters(f: DexFilter): number {
  return (f.own !== 'all' ? 1 : 0) + (f.rarity !== 'all' ? 1 : 0) + (f.cls !== 'all' ? 1 : 0);
}

/** The album for a save under a filter. */
export function dexOf(save: SaveDoc, content: Content, f: DexFilter = DEX_FILTER): Dex {
  const all = dexOrder(content);
  const ages: DexAge[] = [];
  let owned = 0;
  let shown = 0;
  for (const age of content.order.ages) {
    const inAge = all.filter((x) => x.age === age);
    let have = 0;
    const entries: DexEntry[] = [];
    for (const x of inAge) {
      const o = isOwned(save, x.id, content);
      if (o) have++;
      const def = cardDef(content, x.id);
      if (!def) continue;
      if (f.own === 'owned' && !o) continue;
      if (f.own === 'missing' && o) continue;
      if (f.rarity !== 'all' && def.rarity !== f.rarity) continue;
      if (f.cls !== 'all' && cardClassOf(def) !== f.cls) continue;
      entries.push({ id: x.id, no: x.no, owned: o });
    }
    owned += have;
    shown += entries.length;
    ages.push({ age, entries, owned: have, total: inAge.length });
  }
  return { ages, owned, total: all.length, shown };
}
