/**
 * The War Plan (DESIGN A3): one Age Loadout per age, each with 6 unit slots (A18.9), 2 turret slots
 * and 2 typed power slots, Home and Field (A2.9.1), all from that age, all owned, no duplicates; three
 * presets.
 *
 * - Starter plan: each age's 3 common units (Infantry, Ranged, Heavy) and its Anti-heavy Rare in
 *   slot 4 (owner feedback 2026-09-29), 2 common turrets, plus its two starter powers. The starter
 *   kit always meets the minimum to play.
 * - Auto-fill: the highest-level card per slot, keeping at least one Heavy or Legendary, one Ranged
 *   and one Anti-heavy (Anti-armor role) unit per age, plus an air-hitter from Gunpowder on (a turret that hits air
 *   counts). Ties keep the content order. Units sit in content order.
 * - Equip now (after a capsule): a new card fills an empty slot, else the same-role slot, else the
 *   lowest-level slot (ties: the last slot).
 */
import type { AgeId, CardId, FormatId, Loadout, Result, SaveDoc, SkinId } from '@/contracts';
import type { Content } from '@/content';
import { hitsAir, TURRET_SLOTS, UNIT_SLOTS, type WarPlan } from './advisor';
import { FIRST_PLAN_NAME } from './rules';
import { fortSlotUnlocked, wallOf } from './forts';
import { ageCards, antiHeavyCard, isOwned, starterPower, starterPowers } from './tables';

/** Number of War Plan presets (A3). */
export const PLAN_PRESETS = 3;

function slots(ids: readonly CardId[], n: number): (CardId | null)[] {
  return Array.from({ length: n }, (_, i) => ids[i] ?? null);
}

/** The starter loadout of an age (A3 starter kit): the 3 common units, then the Anti-heavy Rare. */
export function starterLoadout(t: Content, age: AgeId): Loadout {
  const { units, turrets } = ageCards(t, age);
  const common = (id: CardId): boolean => (t.units[id] ?? t.turrets[id])?.rarity === 'common';
  const aa = antiHeavyCard(t, age);
  const troops = [...units.filter(common), ...(aa ? [aa] : [])];
  // The Fort slot starts empty; its unlock fills it with the age's wall (A16.14.6).
  return { units: slots(troops, UNIT_SLOTS), turrets: slots(turrets.filter(common), TURRET_SLOTS), powers: starterPowers(t, age), fort: null };
}

/** The starter War Plan (A3; Arena 1's gate reward, given at the start). */
export function starterPlan(t: Content, name: string = FIRST_PLAN_NAME): WarPlan {
  const loadouts = {} as Record<AgeId, Loadout>;
  for (const age of t.order.ages) loadouts[age] = starterLoadout(t, age);
  return { name, loadouts };
}

/** The active War Plan (falls back to the first preset). */
export function activePlan(s: SaveDoc): WarPlan | null {
  return s.warPlans[s.activePlan] ?? s.warPlans[0] ?? null;
}

function levelOf(s: SaveDoc, id: CardId): number {
  return s.collection[id]?.level ?? 0;
}

/** Owned cards, highest level first, content order on ties. */
function byLevel(s: SaveDoc, ids: readonly CardId[]): CardId[] {
  return ids
    .filter((id) => isOwned(s, id))
    .map((id, i) => ({ id, i }))
    .sort((a, b) => levelOf(s, b.id) - levelOf(s, a.id) || a.i - b.i)
    .map((x) => x.id);
}

/** The auto-filled loadout of one age (A3). */
export function autoFillLoadout(s: SaveDoc, t: Content, age: AgeId, current?: Loadout): Loadout {
  const { units, turrets } = ageCards(t, age);
  const rankedUnits = byLevel(s, units);
  const pickedTurrets = byLevel(s, turrets).slice(0, TURRET_SLOTS);
  const picked: CardId[] = [];
  const need = (pred: (id: CardId) => boolean): void => {
    if (picked.some(pred)) return;
    const id = rankedUnits.find((u) => !picked.includes(u) && pred(u));
    if (id && picked.length < UNIT_SLOTS) picked.push(id);
  };
  const group = (id: CardId): string | undefined => t.units[id]?.group;
  need((id) => group(id) === 'heavy' || group(id) === 'legendary');
  need((id) => group(id) === 'ranged');
  need((id) => group(id) === 'antiArmor');
  if (t.ages[age].index >= t.ages.gunpowder.index && !pickedTurrets.some((id) => hitsAir(t, id))) need((id) => hitsAir(t, id));
  for (const id of rankedUnits) if (picked.length < UNIT_SLOTS && !picked.includes(id)) picked.push(id);
  const ordered = units.filter((id) => picked.includes(id));
  // Powers (A2.9.1): keep an owned power of this age in its own slot, else the age's starter.
  const keep = (slot: 'home' | 'field'): CardId => {
    const cur = current?.powers?.[slot] ?? null;
    const ok = cur !== null && t.powers[cur]?.age === age && t.powers[cur]?.slot === slot && s.powersOwned.includes(cur);
    return ok ? cur : starterPower(t, age, slot);
  };
  // The Fort slot (A16.14.7): keep an owned fort of this age, else the age's wall once the slot is open.
  const curFort = current?.fort ?? null;
  const keepFort = curFort !== null && t.forts?.[curFort]?.age === age && (s.fortsOwned ?? []).includes(curFort);
  const fort = keepFort ? curFort : fortSlotUnlocked(s) ? wallOf(t, age) : null;
  return {
    units: slots(ordered, UNIT_SLOTS),
    turrets: slots(turrets.filter((id) => pickedTurrets.includes(id)), TURRET_SLOTS),
    powers: { home: keep('home'), field: keep('field') },
    fort,
  };
}

/** Save flag: the sixth troop slot of save v4 has been filled once (A18.9, A18.11). */
export const SIXTH_SLOT_FLAG = 'meta-troop-slot-6';

/**
 * Six troops (A18.9): the sixth unit slot that save v4 added empty is filled once, in every plan and
 * age, with the highest-level owned unit of that age not already in the loadout (ties: content
 * order). A slot the player empties later stays empty.
 */
export function fillNewTroopSlots(s: SaveDoc, t: Content): SaveDoc {
  if (s.flags[SIXTH_SLOT_FLAG]) return s;
  const warPlans = s.warPlans.map((plan) => {
    const loadouts = { ...plan.loadouts };
    for (const age of Object.keys(loadouts) as AgeId[]) {
      const l = loadouts[age];
      if (!l || (l.units[UNIT_SLOTS - 1] ?? null) !== null) continue;
      const pick = byLevel(s, ageCards(t, age).units).find((id) => !l.units.includes(id));
      const units: (CardId | null)[] = Array.from({ length: UNIT_SLOTS }, (_, i) => l.units[i] ?? null);
      if (pick) units[UNIT_SLOTS - 1] = pick;
      loadouts[age] = { ...l, units };
    }
    return { ...plan, loadouts };
  });
  return { ...s, warPlans, flags: { ...s.flags, [SIXTH_SLOT_FLAG]: true } };
}

/** Auto-fill for the active plan (A3); not saved until the player keeps it. */
export function autoFill(s: SaveDoc, t: Content): WarPlan {
  const plan = activePlan(s);
  const loadouts = {} as Record<AgeId, Loadout>;
  for (const age of t.order.ages) loadouts[age] = autoFillLoadout(s, t, age, plan?.loadouts[age]);
  return { name: plan?.name ?? FIRST_PLAN_NAME, loadouts };
}

/** The index of the slot "Equip now" replaces, among `ids` (A3). */
function equipSlot(s: SaveDoc, t: Content, ids: readonly (CardId | null)[], card: CardId): number {
  const empty = ids.indexOf(null);
  if (empty >= 0) return empty;
  const lowest = (pred: (id: CardId) => boolean): number => {
    let best = -1;
    ids.forEach((id, i) => {
      if (id === null || !pred(id)) return;
      if (best < 0 || levelOf(s, id) <= levelOf(s, ids[best] as CardId)) best = i;
    });
    return best;
  };
  const role = t.units[card]?.group;
  const same = role ? lowest((id) => t.units[id]?.group === role) : -1;
  return same >= 0 ? same : lowest(() => true);
}

/** "Equip now" (A3): puts an owned card into its age's loadout of the active plan. */
export function equipNow(s: SaveDoc, card: CardId, t: Content): SaveDoc {
  const plan = activePlan(s);
  const unit = t.units[card];
  const turret = t.turrets[card];
  const power = t.powers[card];
  const age = unit?.age ?? turret?.age ?? power?.age;
  if (!plan || !age || (unit?.hidden ?? false)) return s;
  const owned = power ? s.powersOwned.includes(card) : isOwned(s, card);
  const l = plan.loadouts[age];
  if (!owned || !l) return s;
  let next: Loadout;
  if (power) {
    // A2.9.1: a power goes into its own slot (Home or Field).
    if (l.powers[power.slot] === card) return s;
    next = { ...l, powers: { ...l.powers, [power.slot]: card } };
  } else if (unit) {
    if (l.units.includes(card)) return s;
    const units = [...l.units];
    units[equipSlot(s, t, units, card)] = card;
    next = { ...l, units };
  } else {
    if (l.turrets.includes(card)) return s;
    const turrets = [...l.turrets];
    turrets[equipSlot(s, t, turrets, card)] = card;
    next = { ...l, turrets };
  }
  const idx = s.warPlans[s.activePlan] ? s.activePlan : 0;
  const warPlans = s.warPlans.map((p, i) => (i === idx ? { ...p, loadouts: { ...p.loadouts, [age]: next } } : p));
  return { ...s, warPlans };
}

/**
 * A newly found card goes into an **empty** troop or turret slot of its age in the active plan, if
 * there is one; nothing is ever replaced (FTUE audit 2026-10-01 #7: capsule 1's two new cards stayed
 * on the bench, so match 2 ran with 4 of 6 troops and two empty sockets).
 */
export function fillEmptySlot(s: SaveDoc, card: CardId, t: Content): SaveDoc {
  const plan = activePlan(s);
  const unit = t.units[card];
  const turret = t.turrets[card];
  const age = unit?.age ?? turret?.age;
  if (!plan || !age || (unit?.hidden ?? false) || !isOwned(s, card)) return s;
  const l = plan.loadouts[age];
  if (!l) return s;
  const ids = unit ? l.units : l.turrets;
  const empty = ids.indexOf(null);
  if (empty < 0 || ids.includes(card)) return s;
  const filled = [...ids];
  filled[empty] = card;
  const next: Loadout = unit ? { ...l, units: filled } : { ...l, turrets: filled };
  const idx = s.warPlans[s.activePlan] ? s.activePlan : 0;
  const warPlans = s.warPlans.map((p, i) => (i === idx ? { ...p, loadouts: { ...p.loadouts, [age]: next } } : p));
  return { ...s, warPlans };
}

/** Stores a preset (index 0-2; a new index adds the next preset). Reasons: badIndex. */
export function setWarPlan(s: SaveDoc, index: number, plan: WarPlan): Result<SaveDoc> {
  if (!Number.isInteger(index) || index < 0 || index >= PLAN_PRESETS || index > s.warPlans.length) return { ok: false, reason: 'badIndex' };
  const warPlans = [...s.warPlans];
  warPlans[index] = plan;
  return { ok: true, value: { ...s, warPlans } };
}

/** Chooses the active preset. Reasons: badIndex. */
export function setActivePlan(s: SaveDoc, index: number): Result<SaveDoc> {
  if (!s.warPlans[index]) return { ok: false, reason: 'badIndex' };
  return { ok: true, value: { ...s, activePlan: index } };
}

/** Equips an owned skin on its card or base, or clears the target with null. Reasons: notOwned, wrongTarget. */
export function equipSkin(s: SaveDoc, target: string, skin: SkinId | null, t: Content): Result<SaveDoc> {
  const equipped = { ...s.skins.equipped };
  if (skin === null) delete equipped[target];
  else {
    const def = t.skins[skin];
    if (!def || def.target !== target) return { ok: false, reason: 'wrongTarget' };
    if (!s.skins.owned.includes(skin)) return { ok: false, reason: 'notOwned' };
    equipped[target] = skin;
  }
  return { ok: true, value: { ...s, skins: { ...s.skins, equipped } } };
}

/** True when the active plan holds a Legendary in an age of `format` (A6.7, A6.8). */
export function planHasLegendary(s: SaveDoc, t: Content, format: FormatId): boolean {
  const plan = activePlan(s);
  if (!plan) return false;
  return (t.formats[format]?.ages ?? []).some((age) => plan.loadouts[age]?.units.some((id) => id !== null && t.units[id]?.rarity === 'legendary'));
}

/** Average card level of the plan's units and turrets over the ages of `format` (A3 builder), or null. */
export function planAverageLevelCenti(s: SaveDoc, t: Content, format: FormatId, plan: WarPlan | null = activePlan(s)): number | null {
  if (!plan) return null;
  let sum = 0;
  let n = 0;
  for (const age of t.formats[format]?.ages ?? []) {
    const l = plan.loadouts[age];
    for (const id of [...(l?.units ?? []), ...(l?.turrets ?? [])]) {
      if (id === null) continue;
      sum += Math.max(1, levelOf(s, id));
      n += 1;
    }
  }
  return n === 0 ? null : Math.trunc((sum * 100) / n);
}
