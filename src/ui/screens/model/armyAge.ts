/**
 * Army per age (owner request 2026-09-30, ui-plan 4.2): the cards of one age in three plain groups,
 * top to bottom: **In battle** (the loadout's slots), **Available** (owned, not in this army) and
 * **Locked** (not found yet, with where they come from). Pure over the save and the content.
 */
import type { Content } from '@/content/types';
import type { AgeId, CardId, PowerSlot, SaveDoc } from '@/contracts';
import { cardsOfAge, isOwned } from './cards';
import type { SlotRef } from './plan';

export interface AgeSections {
  /** Owned cards of the age that are not in its army, troops then turrets then powers. */
  available: CardId[];
  /** Cards of the age not found yet, in the same order. */
  locked: CardId[];
  /** Every card of the age, and how many of them the save owns ("You own 12 of 15"). */
  owned: number;
  total: number;
}

/**
 * The Available and Locked groups of an age. `inArmy` is what the slots hold; `only` narrows to one
 * slot kind while a slot is selected (and `onlyPower` to one power slot), so the pool shows what fits.
 */
export function ageSections(
  save: SaveDoc,
  content: Content,
  age: AgeId,
  inArmy: ReadonlySet<CardId>,
  only?: SlotRef['kind'] | null,
  onlyPower?: PowerSlot | null,
): AgeSections {
  const c = cardsOfAge(content, age);
  const all = [...c.units, ...c.turrets, ...c.powers];
  const fits = (id: CardId): boolean => {
    const kind = content.units[id] ? 'unit' : content.turrets[id] ? 'turret' : 'power';
    if (only && kind !== only) return false;
    if (onlyPower && kind === 'power' && content.powers[id]?.slot !== onlyPower) return false;
    return true;
  };
  const owned = all.filter((id) => isOwned(save, id, content));
  return {
    available: owned.filter((id) => !inArmy.has(id) && fits(id)),
    locked: all.filter((id) => !isOwned(save, id, content) && fits(id)),
    owned: owned.length,
    total: all.length,
  };
}

/**
 * The arena whose Time Capsules first drop cards of `age` (1-based), or null when the save's current
 * arena already drops them (A6.3 `dropAges`), so a source line never promises a capsule that cannot
 * hold the card yet.
 */
export function capsuleArenaFor(save: SaveDoc, content: Content, age: AgeId): number | null {
  const list = content.arenas.list;
  const cur = list[Math.max(0, Math.min(list.length - 1, save.arenaIndex))];
  if (!cur || cur.dropAges.includes(age)) return null;
  return list.find((a) => a.dropAges.includes(age))?.index ?? null;
}

/**
 * Where a card not found yet comes from, as a short line for a small tile (i18n key and params):
 * troops and turrets from Time Capsules (from a later arena when this one does not drop that age yet;
 * Dust crafting is in Card detail), powers from their War Path level or Trophy Road node (A2.9.8).
 */
export function cardSourceShort(save: SaveDoc, content: Content, id: CardId): { key: string; params?: Record<string, string | number> } {
  const p = content.powers[id];
  if (!p) {
    const age = content.units[id]?.age ?? content.turrets[id]?.age;
    const arena = age ? capsuleArenaFor(save, content, age) : null;
    return arena === null ? { key: 'ui.armyAge.src.capsule' } : { key: 'ui.armyAge.src.arena', params: { n: arena } };
  }
  if (p.source === 'warPath' && p.warPathLevel !== undefined) return { key: 'ui.armyAge.src.warPath', params: { level: p.warPathLevel } };
  if (p.source === 'road' && p.road !== undefined) return { key: 'ui.armyAge.src.road', params: { n: p.road } };
  return { key: 'ui.armyAge.src.starter' };
}
