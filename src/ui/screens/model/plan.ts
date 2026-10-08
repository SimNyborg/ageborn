/**
 * War Plan helpers for the builder (A3): slot edits that keep a loadout legal (one age, owned, no
 * duplicates; slots may be empty), average levels, and which format the averages refer to.
 * Validation and advisor warnings are meta's job (`UiServices.validatePlan`).
 */
import type { Content } from '@/content/types';
import type { AgeId, CardId, FormatId, Loadout, PlanIssue, PowerSlot, Rarity, ResearchClass, SaveDoc } from '@/contracts';
import { unitClass, type CardClass } from '@/core/cardClass';
import { FIELD_SLOT_IN_BATTLE } from '@/core/powerReach';
import { FORT_SLOT_IN_BATTLE } from '@/core/fortPads';
import type { WarPlan } from '../services';
import { isOwned, levelOf } from './cards';
import { arenaOf } from './progress';
import { featureOpen, onboardingDone } from './warPath';

/** A loadout slot: seven troops, two turrets, the two typed power slots, Home and Field (A2.9.1), and the Fort slot (A16.14.7). */
export type SlotRef = { kind: 'unit'; index: number } | { kind: 'turret'; index: number } | { kind: 'power'; slot: PowerSlot } | { kind: 'fort' };

/**
 * The save flag that unlocks the Field power slot (A2.9.1: the first clear of War Path Stone L5 or 150
 * trophies; meta sets it, `META_FLAGS.powerField`). The UI may not import meta, so it reads the flag.
 */
export const FIELD_SLOT_FLAG = 'power.field';

/**
 * The Field slot is open for this save and battles play it (else the Army shows it with a padlock and
 * its line). Until the HUD dock ships (`FIELD_SLOT_IN_BATTLE`, P2) it stays locked even for a save that
 * earned it, so the Army never shows an equipped power that no battle uses.
 */
export function fieldSlotOpen(save: SaveDoc, inBattle: boolean = FIELD_SLOT_IN_BATTLE): boolean {
  return inBattle && save.flags[FIELD_SLOT_FLAG] === true;
}

/** Why the Field slot is locked: the unlock line, or "coming soon" once earned but not yet in battles. */
export function fieldSlotLockKeys(save: SaveDoc, inBattle: boolean = FIELD_SLOT_IN_BATTLE): { line: string; short: string } {
  return !inBattle && save.flags[FIELD_SLOT_FLAG] === true ? { line: 'ui.power.fieldSoon', short: 'ui.power.fieldSoonShort' } : { line: 'ui.power.lockedField', short: 'ui.power.lockedFieldShort' };
}

/**
 * The save flag that unlocks the Fort slot (A16.14.6: the first clear of War Path Bronze L4 or 400
 * trophies; meta sets it, `META_FLAGS.fortSlot`).
 */
export const FORT_SLOT_FLAG = 'fort.slot';
/** Best trophies that open the Fort slot (A16.14.6; meta's `FORT_SLOT_TROPHIES`). */
export const FORT_UNLOCK_TROPHIES = 400;

/** A preview switch for the dev screen gallery and tests: shows the Fort slot before battles play it. */
let fortPreview = false;
export function setFortSlotPreview(on: boolean): void {
  fortPreview = on;
}

/**
 * Whether the Army shows the Fort group at all: once battles play the Fort slot (`FORT_SLOT_IN_BATTLE`,
 * F2). Until then nothing about forts is drawn, so the Army never offers a card no battle uses.
 */
export function fortSlotShown(inBattle: boolean = FORT_SLOT_IN_BATTLE): boolean {
  return inBattle || fortPreview;
}

/** The Fort slot is shown and open for this save (else it shows a padlock and how it opens). */
export function fortSlotOpen(save: SaveDoc, inBattle: boolean = FORT_SLOT_IN_BATTLE): boolean {
  return fortSlotShown(inBattle) && save.flags[FORT_SLOT_FLAG] === true;
}

/** Seven troops per battle (A18.9, owner request 2026-10-07; six before). */
export const UNIT_SLOTS = 7;
export const TURRET_SLOTS = 2;
/** A3: three renamable presets, the saved battle decks (owner request 2026-10-07). */
export const PRESETS = 3;
export const DECKS = PRESETS;
/** The default deck names, by index (meta's first plan is "A"). */
export const DECK_NAMES: readonly string[] = ['A', 'B', 'C'];

/** One deck of the switch: its index and name, and whether it has been saved yet. */
export interface DeckView {
  index: number;
  name: string;
  saved: boolean;
}

/** The three decks: the saved ones with their names, the rest under their default letter. */
export function deckList(save: SaveDoc): DeckView[] {
  return Array.from({ length: DECKS }, (_, index) => {
    const w = save.warPlans[index];
    return { index, name: w?.name?.trim() || DECK_NAMES[index]!, saved: !!w };
  });
}

export function slotKey(s: SlotRef): string {
  return s.kind === 'power' ? `power-${s.slot}` : s.kind === 'fort' ? 'fort' : `${s.kind}-${s.index}`;
}

export function slotCard(l: Loadout, s: SlotRef): CardId | null {
  if (s.kind === 'unit') return l.units[s.index] ?? null;
  if (s.kind === 'turret') return l.turrets[s.index] ?? null;
  if (s.kind === 'fort') return l.fort ?? null;
  return l.powers?.[s.slot] ?? null;
}

/** The power slot a power card fits (A2.9.1: Home powers only in Home, Field powers only in Field). */
export function powerSlotOf(content: Content, card: CardId): PowerSlot | null {
  return content.powers[card]?.slot ?? null;
}

/** Pads a loadout to 7 unit (A18.9) and 2 turret slots (older or partial saves); keeps the Fort slot. */
export function normalizeLoadout(l: Loadout): Loadout {
  const units = Array.from({ length: UNIT_SLOTS }, (_, i) => l.units[i] ?? null);
  const turrets = Array.from({ length: TURRET_SLOTS }, (_, i) => l.turrets[i] ?? null);
  return { units, turrets, powers: l.powers ?? { home: null, field: null }, fort: l.fort ?? null };
}

/** Which slot kind a card goes in. A fort shares its id with its hidden twin unit, so forts come first. */
export function slotKindOf(content: Content, card: CardId): SlotRef['kind'] | null {
  if (content.forts?.[card]) return 'fort';
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
  // A2.9.1: a power goes only into its own slot (Home or Field); the two never swap.
  if (slot.kind === 'power') return powerSlotOf(content, card) === slot.slot ? { ...l, powers: { ...l.powers, [slot.slot]: card } } : loadout;
  if (slot.kind === 'fort') return { ...l, fort: card };
  const list = slot.kind === 'unit' ? [...l.units] : [...l.turrets];
  const from = list.indexOf(card);
  const displaced = list[slot.index] ?? null;
  list[slot.index] = card;
  if (from >= 0 && from !== slot.index) list[from] = displaced;
  return slot.kind === 'unit' ? { ...l, units: list } : { ...l, turrets: list };
}

/** Empties a slot (A2.9.1: empty power slots are legal too; the advisor warns about them). */
export function clearSlot(loadout: Loadout, slot: SlotRef): Loadout {
  const l = normalizeLoadout(loadout);
  if (slot.kind === 'unit') return { ...l, units: l.units.map((c, i) => (i === slot.index ? null : c)) };
  if (slot.kind === 'turret') return { ...l, turrets: l.turrets.map((c, i) => (i === slot.index ? null : c)) };
  if (slot.kind === 'fort') return { ...l, fort: null };
  return { ...l, powers: { ...l.powers, [slot.slot]: null } };
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
  if (kind === 'power') {
    const slot = powerSlotOf(content, card);
    return slot && l.powers[slot] === null ? { kind: 'power', slot } : null;
  }
  if (kind === 'fort') return (l.fort ?? null) === null ? { kind: 'fort' } : null;
  return null;
}

export function loadoutCards(l: Loadout): CardId[] {
  return [...l.units, ...l.turrets].filter((c): c is CardId => c !== null);
}

/** The War Council's Troops lines in display order (DESIGN A18.5.2). */
export const RESEARCH_LINES: readonly ResearchClass[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'support'];

/**
 * Research compatibility of a loadout (DESIGN A18.5.2): for each Troops line, whether the loadout
 * holds a unit that line's research helps (Epics and Legendaries count in their base role's class),
 * so the builder can show that a Heavy line is wasted in an age with no Heavy.
 */
export function researchLines(content: Content, l: Loadout): { cls: ResearchClass; has: boolean }[] {
  const held = new Set<ResearchClass>();
  for (const id of l.units) {
    const u = id ? content.units[id] : undefined;
    const cls = u && u.role !== 'fort' ? content.research?.classOfRole[u.role] : undefined;
    if (cls) held.add(cls);
  }
  return RESEARCH_LINES.map((cls) => ({ cls, has: held.has(cls) }));
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
 * the next format uses"; the player picks among these from Arena 1).
 */
export function nextFormat(save: SaveDoc, content: Content): FormatId {
  // Last Base Standing (A2.10.1) plays the Long War's ages; the longest timed length names them.
  const formats = arenaOf(save, content).ladderFormats.filter((f) => content.formats[f]?.kind !== 'untimed');
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
  return content.formats[format]?.ages ?? [];
}

/**
 * A readable name for any format (U9: no ids on screen). The named formats have their own string
 * (`format.<id>.name`: "Short War"); the generated age windows (`w2.stone`, `short.bronze`, ...) have
 * none, so they read as their ages: "Stone to Bronze", or one age's name.
 */
export function formatName(content: Content, t: (key: string, params?: Record<string, string | number>) => string, format: FormatId): string {
  const key = `format.${format}.name`;
  const named = t(key);
  if (named !== key) return named;
  const ages = formatAges(content, format);
  const first = ages[0];
  const last = ages[ages.length - 1];
  if (!first || !last) return t('ui.format.custom');
  if (first === last) return t(`warPath.region.${first}`);
  return t('ui.format.span', { from: t(`warPath.regionShort.${first}`), to: t(`warPath.regionShort.${last}`) });
}

/** The active plan, or the first, or an empty plan so screens can always render. */
export function activePlan(save: SaveDoc, content: Content): { index: number; plan: WarPlan } {
  const index = save.warPlans[save.activePlan] ? save.activePlan : 0;
  const plan = save.warPlans[index] ?? emptyPlan(content, 'A');
  return { index, plan };
}

/** A plan with every slot empty and each age's two starter powers (A2.9.8: found by `source`). */
export function emptyPlan(content: Content, name: string): WarPlan {
  const loadouts = {} as Record<AgeId, Loadout>;
  for (const age of content.order.ages) {
    const starter = (slot: 'home' | 'field'): CardId | null =>
      content.order.powers.find((id) => content.powers[id]?.age === age && content.powers[id]?.slot === slot && content.powers[id]?.source === 'starter') ?? null;
    loadouts[age] = {
      units: Array.from({ length: UNIT_SLOTS }, () => null),
      turrets: Array.from({ length: TURRET_SLOTS }, () => null),
      powers: { home: starter('home'), field: starter('field') },
    };
  }
  return { name, loadouts };
}

// ---------------------------------------------------------------------------------------------
// Army (ui-plan 4.2, UI-4): the deck builder's rules, kept pure so they are unit-tested.
// ---------------------------------------------------------------------------------------------

/** Short age names for tabs and pills ("Bronze" for "Bronze Age: Hellas"). */
export const AGE_SHORT_KEY: Readonly<Record<AgeId, string>> = {
  stone: 'ui.army.ageShort.stone',
  bronze: 'ui.army.ageShort.bronze',
  medieval: 'ui.army.ageShort.medieval',
  gunpowder: 'ui.army.ageShort.gunpowder',
  industrial: 'ui.army.ageShort.industrial',
  modern: 'ui.army.ageShort.modern',
  future: 'ui.army.ageShort.future',
  cosmic: 'ui.army.ageShort.cosmic',
};

/** Every slot of a loadout in reading order: seven troops, two turrets, the Home and Field powers, the Fort. */
export const ALL_SLOTS: readonly SlotRef[] = [
  ...Array.from({ length: UNIT_SLOTS }, (_, index) => ({
    kind: 'unit' as const,
    index,
  })),
  ...Array.from({ length: TURRET_SLOTS }, (_, index) => ({
    kind: 'turret' as const,
    index,
  })),
  { kind: 'power', slot: 'home' },
  { kind: 'power', slot: 'field' },
  { kind: 'fort' },
];

/** The slot a key names ("unit-3", "turret-0", "power-home", "fort"), or null. */
export function slotFromKey(key: string): SlotRef | null {
  return ALL_SLOTS.find((s) => slotKey(s) === key) ?? null;
}

/** The age a card belongs to. */
export function cardAge(content: Content, card: CardId): AgeId | null {
  return (content.forts?.[card] ?? content.units[card] ?? content.turrets[card] ?? content.powers[card])?.age ?? null;
}

/**
 * Whether a card can go in this slot of this age's loadout (same kind, same age, owned; a power only
 * in its own slot, and the Field slot only once it is open).
 */
export function fitsSlot(save: SaveDoc, content: Content, age: AgeId, slot: SlotRef, card: CardId): boolean {
  if (slotKindOf(content, card) !== slot.kind || cardAge(content, card) !== age || !isOwned(save, card, content)) return false;
  if (slot.kind === 'fort') return fortSlotOpen(save);
  if (slot.kind !== 'power') return true;
  return powerSlotOf(content, card) === slot.slot && (slot.slot === 'home' || fieldSlotOpen(save));
}

/** The slot a card sits in, or null. */
export function slotOfCard(l: Loadout, card: CardId): SlotRef | null {
  const n = normalizeLoadout(l);
  const u = n.units.indexOf(card);
  if (u >= 0) return { kind: 'unit', index: u };
  const tIdx = n.turrets.indexOf(card);
  if (tIdx >= 0) return { kind: 'turret', index: tIdx };
  if (n.powers.home === card) return { kind: 'power', slot: 'home' };
  if (n.powers.field === card) return { kind: 'power', slot: 'field' };
  if (n.fort === card) return { kind: 'fort' };
  return null;
}

/**
 * The A3 "Equip now" rule (ui-plan 4.2 "Use"): the first empty slot of the card's kind, else the
 * slot of a card of the same class (the lowest level among them), else the lowest-level slot. A
 * power takes its own slot (Home or Field; A2.9.10 "Equip now" fills it if empty, else swaps). Null
 * when the card cannot be placed (another kind of card, or the Field slot is still locked).
 */
export function equipSlot(save: SaveDoc, content: Content, l: Loadout, card: CardId): SlotRef | null {
  const kind = slotKindOf(content, card);
  if (!kind) return null;
  if (kind === 'power') {
    const slot = powerSlotOf(content, card);
    if (!slot || (slot === 'field' && !fieldSlotOpen(save))) return null;
    return { kind: 'power', slot };
  }
  // The one Fort slot (A16.14.7): a fort fills it or swaps with the one there.
  if (kind === 'fort') return fortSlotOpen(save) ? { kind: 'fort' } : null;
  const already = slotOfCard(l, card);
  if (already) return already;
  const empty = firstEmptySlot(content, l, card);
  if (empty) return empty;
  const n = normalizeLoadout(l);
  const list = kind === 'unit' ? n.units : n.turrets;
  const lowest = (idx: number[]): number => idx.reduce((best, i) => (levelOf(save, list[i]!) < levelOf(save, list[best]!) ? i : best), idx[0]!);
  const all = list.map((_, i) => i);
  if (kind === 'unit') {
    const def = content.units[card]!;
    const cls = unitClass(def);
    const same = all.filter((i) => {
      const u = content.units[list[i]!];
      return !!u && unitClass(u) === cls;
    });
    if (same.length) return { kind, index: lowest(same) };
  }
  return { kind, index: lowest(all) };
}

/** Slots whose card differs between two loadouts (for the auto-fill toast and its stagger). */
export function changedSlots(a: Loadout, b: Loadout): SlotRef[] {
  const x = normalizeLoadout(a);
  const y = normalizeLoadout(b);
  return ALL_SLOTS.filter((s) => slotCard(x, s) !== slotCard(y, s));
}

/**
 * The ages the player has reached (ui-plan 4.2 "only reached ages"): the War Path regions up to the
 * current one, every age of the ladder formats once the ladder is open, and every age for a save
 * from before the War Path. Always at least the first age.
 */
export function reachedAges(save: SaveDoc, content: Content): AgeId[] {
  const ages = content.order.ages;
  const wp = save.warPath;
  if (!wp || wp.legacy) return [...ages];
  const reached = new Set<AgeId>([ages[0]!]);
  const cur = content.warPath.order.find((id) => !(wp.stars[id] ?? 0));
  const region = cur ? content.warPath.levels[cur]?.region : ages[ages.length - 1];
  const upTo = region ? ages.indexOf(region) : 0;
  ages.forEach((a, i) => {
    if (i <= upTo) reached.add(a);
  });
  if (featureOpen(save, content, 'ladder')) {
    for (const f of arenaOf(save, content).ladderFormats) for (const a of formatAges(content, f)) reached.add(a);
  }
  return ages.filter((a) => reached.has(a));
}

/**
 * The saved decks (presets A/B/C) open right after the onboarding (owner request 2026-10-07; they waited
 * for the first boss before, so nobody found them), at once for a save from before the War Path, and
 * for any save that already holds more than one deck.
 */
export function decksOpen(save: SaveDoc): boolean {
  const wp = save.warPath;
  return !wp || wp.legacy || onboardingDone(save) || save.warPlans.length > 1;
}

/** The age tab's status mark (ui-plan 3.6 "Age tabs"): full and valid, advisor warning, or not playable. */
export type AgeStatus = 'ok' | 'warn' | 'error';

export function ageStatus(issues: readonly PlanIssue[], age: AgeId, l: Loadout): AgeStatus {
  const own = issues.filter((i) => i.age === age);
  if (own.some((i) => i.severity === 'error')) return 'error';
  const n = normalizeLoadout(l);
  if (own.length > 0 || n.units.includes(null) || n.turrets.includes(null)) return 'warn';
  return 'ok';
}

/** The Army grid's view and filters (ui-plan 4.2 "Right column"). */
export type ArmyView = 'age' | 'all';
export type ArmySort = 'level' | 'rarity' | 'cost' | 'ready';
export interface ArmyFilter {
  view: ArmyView;
  /** Class chips (the 7 player classes plus Turret and Power); empty = all. */
  classes: readonly CardClass[];
  /** The Power chip's Home / Field chips (A2.9.10); empty = both. They narrow powers only. */
  powerSlots: readonly PowerSlot[];
  rarity: Rarity | 'all';
  ownedOnly: boolean;
  sort: ArmySort | null;
}

export const ARMY_FILTER: ArmyFilter = {
  view: 'age',
  classes: [],
  powerSlots: [],
  rarity: 'all',
  ownedOnly: false,
  sort: null,
};

/** How many filters are active beyond the view (the filter button's count). */
export function activeFilterCount(f: ArmyFilter): number {
  return f.classes.length + (f.powerSlots?.length ?? 0) + (f.rarity !== 'all' ? 1 : 0) + (f.ownedOnly ? 1 : 0) + (f.sort ? 1 : 0);
}

const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

/**
 * The Army grid (ui-plan 4.2): "This age" shows the cards of the age that fit its slots (troops,
 * turrets, powers); "All cards" is the album of every age. `only` narrows to one slot kind while a
 * slot is selected (`onlyPower` to one power slot). Owned cards come first unless a sort says
 * otherwise; the order is otherwise the content's display order.
 */
export function armyCards(save: SaveDoc, content: Content, age: AgeId, f: ArmyFilter, only?: SlotRef['kind'] | null, onlyPower?: PowerSlot | null): CardId[] {
  const ids = [...content.order.units, ...content.order.turrets, ...content.order.powers];
  const list = ids.filter((id) => {
    const def = content.units[id] ?? content.turrets[id] ?? content.powers[id];
    if (!def) return false;
    if (f.view === 'age' && def.age !== age) return false;
    if (only && def.kind !== only) return false;
    if (onlyPower && def.kind === 'power' && def.slot !== onlyPower) return false;
    const cls: CardClass = def.kind === 'unit' ? unitClass(def) : def.kind;
    if (f.classes.length && !f.classes.includes(cls)) return false;
    if (def.kind === 'power' && f.powerSlots?.length && !f.powerSlots.includes(def.slot)) return false;
    if (f.rarity !== 'all' && def.rarity !== f.rarity) return false;
    if (f.ownedOnly && !isOwned(save, id, content)) return false;
    return true;
  });
  const owned = (id: CardId) => (isOwned(save, id, content) ? 0 : 1);
  const index = new Map(list.map((id, i) => [id, i]));
  const key = (id: CardId): number => {
    const def = content.units[id] ?? content.turrets[id] ?? content.powers[id];
    switch (f.sort) {
      case 'level':
        return -levelOf(save, id);
      case 'rarity':
        return def ? -RARITY_RANK[def.rarity] : 1;
      case 'cost':
        return def ? def.cost : 100000;
      case 'ready': {
        const e = save.collection[id];
        const need = def && def.kind !== 'power' && e ? content.rarities.cards[def.rarity].upgradeCopies[e.level - 1] : undefined;
        return need !== undefined && e && e.copies >= need ? 0 : 1;
      }
      default:
        return 0;
    }
  };
  return [...list].sort((a, b) => owned(a) - owned(b) || key(a) - key(b) || index.get(a)! - index.get(b)!);
}

/** Album completion over every troop, turret and power card ("34/56", ui-plan 4.2, MR-63). */
export function albumProgress(save: SaveDoc, content: Content): { owned: number; total: number } {
  const ids = [...content.order.units, ...content.order.turrets, ...content.order.powers];
  return {
    owned: ids.filter((id) => isOwned(save, id, content)).length,
    total: ids.length,
  };
}

/** Cards of an age the player could put in a slot of this kind (owned first, then by display order). */
export function candidates(save: SaveDoc, content: Content, age: AgeId, kind: SlotRef['kind'], powerSlot?: PowerSlot): CardId[] {
  const ids =
    kind === 'unit'
      ? content.order.units.filter((id) => content.units[id]?.age === age)
      : kind === 'turret'
        ? content.order.turrets.filter((id) => content.turrets[id]?.age === age)
        : kind === 'fort'
          ? (content.order.forts ?? []).filter((id) => content.forts?.[id]?.age === age)
          : content.order.powers.filter((id) => content.powers[id]?.age === age && (!powerSlot || content.powers[id]?.slot === powerSlot));
  const owned = ids.filter((id) => isOwned(save, id, content));
  const unowned = ids.filter((id) => !isOwned(save, id, content));
  return [...owned, ...unowned];
}
