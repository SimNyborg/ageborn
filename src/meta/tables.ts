/**
 * Typed access to the content tables meta reads (DESIGN B4, B15: the contract types the meta tables
 * as `unknown`; `src/content/types.ts` gives them their shape) and small lookups shared by the rule
 * modules: card definitions, ownership, the arena and its drop pool.
 */
import type { AgeId, CapsuleTier, CardId, CompiledContent, Rarity, SaveDoc, TurretDef, UnitDef } from '@/contracts';
import { asContent, type ArenaDef, type Content } from '@/content';

/** The typed content (throws on content without meta tables, such as the contract fakes). */
export function tables(c: CompiledContent): Content {
  return asContent(c);
}

export const RARITY_ORDER: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const RARITY_INDEX: Readonly<Record<Rarity, number>> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export const TIER_ORDER: readonly CapsuleTier[] = ['clay', 'bronze', 'silver', 'jade', 'aeon'];
export const TIER_INDEX: Readonly<Record<CapsuleTier, number>> = { clay: 0, bronze: 1, silver: 2, jade: 3, aeon: 4 };

/** A collectable card: a unit or a turret (powers are owned separately, `SaveDoc.powersOwned`). */
export type CardDef = UnitDef | TurretDef;

export function cardDef(t: Content, id: CardId): CardDef | null {
  return t.units[id] ?? t.turrets[id] ?? null;
}

/** Units and turrets that can be collected (the hidden Training Dummy cannot). */
export function isCollectable(t: Content, id: CardId): boolean {
  const u = t.units[id];
  if (u) return u.hidden !== true;
  return t.turrets[id] !== undefined;
}

export function cardRarity(t: Content, id: CardId): Rarity {
  return cardDef(t, id)?.rarity ?? 'common';
}

/** Owned means the card is in the collection at level 1 or more (A6.1, A6.6). */
export function isOwned(s: Pick<SaveDoc, 'collection'>, id: CardId): boolean {
  const e = s.collection[id];
  return e !== undefined && e.level >= 1;
}

/** The player's arena (`SaveDoc.arenaIndex` is 0-based into `arenas.list`). */
export function arenaOf(s: Pick<SaveDoc, 'arenaIndex'>, t: Content): ArenaDef {
  const list = t.arenas.list;
  const i = Math.max(0, Math.min(list.length - 1, s.arenaIndex));
  const a = list[i];
  if (!a) throw new Error('meta: the content has no arenas');
  return a;
}

/** A drop pool: collectable cards, in content display order, and the same split by rarity. */
export interface Pool {
  cards: readonly CardId[];
  byRarity: Readonly<Record<Rarity, readonly CardId[]>>;
}

const poolCache = new WeakMap<Content, Map<string, Pool>>();

function buildPool(t: Content, ages: readonly AgeId[]): Pool {
  const inAges = (age: AgeId): boolean => ages.includes(age);
  const cards = [
    ...t.order.units.filter((id) => inAges(t.units[id]?.age ?? 'stone') && isCollectable(t, id)),
    ...t.order.turrets.filter((id) => inAges(t.turrets[id]?.age ?? 'stone')),
  ];
  const byRarity: Record<Rarity, CardId[]> = { common: [], rare: [], epic: [], legendary: [] };
  for (const id of cards) byRarity[cardRarity(t, id)].push(id);
  return { cards, byRarity };
}

/** The drop pool of a set of ages (an arena's drop ages, or one age for an Age Capsule), cached. */
export function poolOf(t: Content, ages: readonly AgeId[]): Pool {
  let byKey = poolCache.get(t);
  if (!byKey) {
    byKey = new Map();
    poolCache.set(t, byKey);
  }
  const key = ages.join(',');
  let pool = byKey.get(key);
  if (!pool) {
    pool = buildPool(t, ages);
    byKey.set(key, pool);
  }
  return pool;
}

/** Collectable units and turrets of one age, in content order. */
export function ageCards(t: Content, age: AgeId): { units: CardId[]; turrets: CardId[] } {
  return {
    units: t.order.units.filter((id) => t.units[id]?.age === age && isCollectable(t, id)),
    turrets: t.order.turrets.filter((id) => t.turrets[id]?.age === age),
  };
}

/** The age's default Age Power (A3 starter kit). */
export function defaultPower(t: Content, age: AgeId): CardId {
  const id = t.order.powers.find((p) => t.powers[p]?.age === age && t.powers[p]?.slot === 'default');
  if (!id) throw new Error(`meta: no default power for ${age}`);
  return id;
}

/**
 * The latest time the save knows about. Meta functions without a `Clock` (upgrades, crafting,
 * opening) stamp anything they create with it, so the capsule tray keeps its order.
 */
export function lastKnownTime(s: SaveDoc): number {
  let t = Math.max(s.createdAt, s.capsules.chargesUpdatedAt);
  for (const p of s.capsules.pending) t = Math.max(t, p.createdAt);
  for (const p of s.capsules.wardrobe) t = Math.max(t, p.createdAt);
  return t;
}
