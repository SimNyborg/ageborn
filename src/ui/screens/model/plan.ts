/**
 * War Plan helpers for the builder (A3): slot edits that keep a loadout legal (one age, owned, no
 * duplicates; slots may be empty), average levels, and which format the averages refer to.
 * Validation and advisor warnings are meta's job (`UiServices.validatePlan`).
 */
import type { Content } from '@/content/types';
import type { AgeId, CardId, FormatId, Loadout, SaveDoc } from '@/contracts';
import type { WarPlan } from '../services';
import { isOwned, levelOf } from './cards';
import { arenaOf } from './progress';

export type SlotRef = { kind: 'unit'; index: number } | { kind: 'turret'; index: number } | { kind: 'power' };

export const UNIT_SLOTS = 5;
export const TURRET_SLOTS = 2;
/** A3: three renamable presets. */
export const PRESETS = 3;

export function slotKey(s: SlotRef): string {
  return s.kind === 'power' ? 'power' : `${s.kind}-${s.index}`;
}

export function slotCard(l: Loadout, s: SlotRef): CardId | null {
  if (s.kind === 'unit') return l.units[s.index] ?? null;
  if (s.kind === 'turret') return l.turrets[s.index] ?? null;
  return l.power || null;
}

/** Pads a loadout to 5 unit and 2 turret slots (older or partial saves). */
export function normalizeLoadout(l: Loadout): Loadout {
  const units = Array.from({ length: UNIT_SLOTS }, (_, i) => l.units[i] ?? null);
  const turrets = Array.from({ length: TURRET_SLOTS }, (_, i) => l.turrets[i] ?? null);
  return { units, turrets, power: l.power };
}

/** Which slot kind a card goes in. */
export function slotKindOf(content: Content, card: CardId): SlotRef['kind'] | null {
  if (content.units[card]) return 'unit';
  if (content.turrets[card]) return 'turret';
  if (content.powers[card]) return 'power';
  return null;
}

/**
 * Puts `card` into `slot`. A card already elsewhere in the loadout moves (its old slot gets whatever
 * was in the target, so nothing is lost and there are never duplicates). Returns the same loadout
 * object when the card does not fit the slot kind.
 */
export function assignCard(content: Content, loadout: Loadout, slot: SlotRef, card: CardId): Loadout {
  if (slotKindOf(content, card) !== slot.kind) return loadout;
  const l = normalizeLoadout(loadout);
  if (slot.kind === 'power') return { ...l, power: card };
  const list = slot.kind === 'unit' ? [...l.units] : [...l.turrets];
  const from = list.indexOf(card);
  const displaced = list[slot.index] ?? null;
  list[slot.index] = card;
  if (from >= 0 && from !== slot.index) list[from] = displaced;
  return slot.kind === 'unit' ? { ...l, units: list } : { ...l, turrets: list };
}

/** Empties a unit or turret slot (the power slot always holds a power). */
export function clearSlot(loadout: Loadout, slot: SlotRef): Loadout {
  const l = normalizeLoadout(loadout);
  if (slot.kind === 'unit') return { ...l, units: l.units.map((c, i) => (i === slot.index ? null : c)) };
  if (slot.kind === 'turret') return { ...l, turrets: l.turrets.map((c, i) => (i === slot.index ? null : c)) };
  return l;
}

/** The first slot of the card's kind that is empty, else null. */
export function firstEmptySlot(content: Content, loadout: Loadout, card: CardId): SlotRef | null {
  const kind = slotKindOf(content, card);
  const l = normalizeLoadout(loadout);
  if (kind === 'unit') {
    const i = l.units.indexOf(null);
    return i >= 0 ? { kind: 'unit', index: i } : null;
  }
  if (kind === 'turret') {
    const i = l.turrets.indexOf(null);
    return i >= 0 ? { kind: 'turret', index: i } : null;
  }
  if (kind === 'power') return { kind: 'power' };
  return null;
}

export function loadoutCards(l: Loadout): CardId[] {
  return [...l.units, ...l.turrets].filter((c): c is CardId => c !== null);
}

/** Average level of a loadout's units and turrets (powers have no level), or null when empty. */
export function loadoutAvgLevel(save: SaveDoc, content: Content, l: Loadout): number | null {
  const cards = loadoutCards(l).filter((c) => isOwned(save, c, content));
  if (cards.length === 0) return null;
  return cards.reduce((n, c) => n + levelOf(save, c), 0) / cards.length;
}

/** Average over every card of the plan in the given ages (A3 "War Plan average"). */
export function planAvgLevel(save: SaveDoc, content: Content, plan: WarPlan, ages: readonly AgeId[]): number | null {
  const cards = ages.flatMap((a) => (plan.loadouts[a] ? loadoutCards(plan.loadouts[a]) : [])).filter((c) => isOwned(save, c, content));
  if (cards.length === 0) return null;
  return cards.reduce((n, c) => n + levelOf(save, c), 0) / cards.length;
}

/**
 * The format the averages refer to: the longest ladder format the current arena offers (A3 "the ages
 * the next format uses"; the player picks among these from Arena 2).
 */
export function nextFormat(save: SaveDoc, content: Content): FormatId {
  const formats = arenaOf(save, content).ladderFormats;
  return formats[formats.length - 1] ?? 'short';
}

/**
 * Ages of a format whose Anti-armor card the player does not own yet (A3: "Until an AA Rare arrives,
 * that loadout plays with 3 units. Skirmish shows a note on that age.").
 */
export function agesAwaitingAntiArmor(save: SaveDoc, content: Content, format: FormatId): AgeId[] {
  return formatAges(content, format).filter(
    (age) => !content.order.units.some((id) => content.units[id]?.age === age && content.units[id]?.group === 'antiArmor' && isOwned(save, id, content)),
  );
}

/** Ages a format uses, in order. */
export function formatAges(content: Content, format: FormatId): AgeId[] {
  return content.formats[format].ages;
}

/** The active plan, or the first, or an empty plan so screens can always render. */
export function activePlan(save: SaveDoc, content: Content): { index: number; plan: WarPlan } {
  const index = save.warPlans[save.activePlan] ? save.activePlan : 0;
  const plan = save.warPlans[index] ?? emptyPlan(content, 'A');
  return { index, plan };
}

/** A plan with every slot empty and each age's default power. */
export function emptyPlan(content: Content, name: string): WarPlan {
  const loadouts = {} as Record<AgeId, Loadout>;
  for (const age of content.order.ages) {
    const power = content.order.powers.find((id) => content.powers[id]?.age === age && content.powers[id]?.slot === 'default') ?? '';
    loadouts[age] = {
      units: Array.from({ length: UNIT_SLOTS }, () => null),
      turrets: Array.from({ length: TURRET_SLOTS }, () => null),
      power,
    };
  }
  return { name, loadouts };
}

/** Cards of an age the player could put in a slot of this kind (owned first, then by display order). */
export function candidates(save: SaveDoc, content: Content, age: AgeId, kind: SlotRef['kind']): CardId[] {
  const ids =
    kind === 'unit'
      ? content.order.units.filter((id) => content.units[id]?.age === age)
      : kind === 'turret'
        ? content.order.turrets.filter((id) => content.turrets[id]?.age === age)
        : content.order.powers.filter((id) => content.powers[id]?.age === age);
  const owned = ids.filter((id) => isOwned(save, id, content));
  const unowned = ids.filter((id) => !isOwned(save, id, content));
  return [...owned, ...unowned];
}
