/**
 * War Plans for the headless tools (DESIGN A2.14 baseline plan, A3 deck rules).
 *
 * **Baseline plan per age** (A2.14): the 3 Commons, the AA Rare and the Support Rare, both Common turrets
 * and both starter powers (A2.9.8: found by `source: 'starter'` and `slot`). A tested Rare replaces its
 * same-role card; a tested Epic or Legendary replaces the Support Rare; a tested turret replaces the
 * same-rarity-slot Common turret (the second slot for Rare and Epic turrets); a tested power replaces
 * the starter of its own slot (A2.9.12: per-power rows vs the slot's starter). A card that is already in
 * its age's baseline has no separate test plan: it is part of the control (the Balanced mirror).
 *
 * Everything is derived from content, so new ages and cards need no tool change (A2.5).
 */
import type { AgeId, CardId, CompiledContent, FormatId, Loadout, PowerDef, Rarity, SideConfig, TurretDef, UnitDef } from '../../src/contracts';

/** A War Plan as the sim takes it: one loadout per age. */
export type Plan = Partial<Record<AgeId, Loadout>>;

export type CardKind = 'unit' | 'turret' | 'power';

/** Ages in index order (from content, not hard-coded). */
export function agesOf(content: CompiledContent): AgeId[] {
  return (Object.values(content.ages) as { id: AgeId; index: number }[]).sort((a, b) => a.index - b.index).map((a) => a.id);
}

/** The ages a format plays, in order. */
export function formatAges(content: CompiledContent, format: FormatId): AgeId[] {
  return [...(content.formats[format]?.ages ?? [])];
}

/** Collectable unit cards of an age, in table order. */
export function unitsOfAge(content: CompiledContent, age: AgeId): UnitDef[] {
  return Object.values(content.units).filter((u) => u.age === age && u.hidden !== true);
}

export function turretsOfAge(content: CompiledContent, age: AgeId): TurretDef[] {
  return Object.values(content.turrets).filter((t) => t.age === age);
}

export function powersOfAge(content: CompiledContent, age: AgeId): PowerDef[] {
  return Object.values(content.powers).filter((p) => p.age === age);
}

function unitId(content: CompiledContent, age: AgeId, group: UnitDef['group'], rarity?: Rarity): CardId | null {
  return unitsOfAge(content, age).find((u) => u.group === group && (rarity === undefined || u.rarity === rarity))?.id ?? null;
}

/** Troop slots of a loadout (A18.9, owner request 2026-10-07: seven; six before, five before A18). */
export const TROOP_SLOTS = 7;

const RARITY_RANK: Readonly<Record<Rarity, number>> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/**
 * The A2.14 baseline loadout of one age. `deck` (5-7, default 5) is how many troop slots it fills: the
 * A2.14 baseline fills five; a bigger deck (`balance --deck 7`, the seven-troop check of 2026-10-07) fills
 * the empty slots with the age's next collectable troops, Commons first, then Rares and Epics, in table
 * order, never a Legendary (the release gate's refill order for General plans).
 */
export function baselineLoadout(content: CompiledContent, age: AgeId, deck = 5): Loadout {
  const commons = turretsOfAge(content, age).filter((t) => t.rarity === 'common');
  const starter = (slot: 'home' | 'field'): CardId | null => powersOfAge(content, age).find((p) => p.slot === slot && p.source === 'starter')?.id ?? null;
  const l = baselineFive(content, age, commons, starter);
  const extra = unitsOfAge(content, age)
    .map((u, i) => ({ u, i }))
    .filter(({ u }) => u.rarity !== 'legendary' && u.released !== false && !l.units.includes(u.id))
    .sort((a, b) => RARITY_RANK[a.u.rarity] - RARITY_RANK[b.u.rarity] || a.i - b.i)
    .map(({ u }) => u.id);
  for (let s = 5; s < Math.min(deck, TROOP_SLOTS); s += 1) l.units[s] = extra[s - 5] ?? null;
  return l;
}

function baselineFive(content: CompiledContent, age: AgeId, commons: readonly TurretDef[], starter: (slot: 'home' | 'field') => CardId | null): Loadout {
  return {
    units: [
      unitId(content, age, 'infantry', 'common'),
      unitId(content, age, 'ranged', 'common'),
      unitId(content, age, 'heavy', 'common'),
      unitId(content, age, 'antiArmor', 'rare'),
      unitId(content, age, 'support', 'rare'),
      // A18.9: a loadout has seven troop slots (owner request 2026-10-07); the A2.14 baseline keeps
      // the last two empty, so per-card deltas stay comparable with earlier runs
      null,
      null,
    ],
    turrets: [commons[0]?.id ?? null, commons[1]?.id ?? null],
    powers: { home: starter('home'), field: starter('field') },
  };
}

/** The A2.14 baseline plan over every age (`deck`: troop slots filled, see `baselineLoadout`). */
export function baselinePlan(content: CompiledContent, deck = 5): Plan {
  const plan: Plan = {};
  for (const age of agesOf(content)) plan[age] = baselineLoadout(content, age, deck);
  return plan;
}

/** A deep copy of a loadout, the Fort slot included (A16.14.1). */
export function cloneLoadout(l: Loadout): Loadout {
  return { units: [...l.units], turrets: [...l.turrets], powers: { ...l.powers }, ...(l.fort !== undefined ? { fort: l.fort } : {}) };
}

export function clonePlan(p: Plan): Plan {
  const out: Plan = {};
  for (const [age, l] of Object.entries(p) as [AgeId, Loadout][]) out[age] = cloneLoadout(l);
  return out;
}

/** Support slot index in a baseline loadout. */
const SUPPORT_SLOT = 4;
/** "The second slot for Rare and Epic turrets" (A2.14). */
const SPECIAL_TURRET_SLOT = 1;

export interface CardTest {
  card: CardId;
  kind: CardKind;
  age: AgeId;
  /** Unit and turret rarity; powers report their slot. */
  rarity: string;
  /** In its age's baseline: no separate test, it is part of the control. */
  inBaseline: boolean;
  /** The card the test plan swaps out (null for baseline cards). */
  replaces: CardId | null;
  plan: Plan;
}

function kindOf(content: CompiledContent, card: CardId): CardKind | null {
  if (content.units[card] && content.units[card].hidden !== true) return 'unit';
  if (content.turrets[card]) return 'turret';
  if (content.powers[card]) return 'power';
  return null;
}

/** The test plan for one card (A2.14). Throws for unknown or hidden cards. */
export function cardTest(content: CompiledContent, card: CardId, deck = 5): CardTest {
  const kind = kindOf(content, card);
  if (!kind) throw new Error(`cardTest: "${card}" is not a collectable unit, turret or power`);
  const base = baselinePlan(content, deck);
  const plan = clonePlan(base);
  if (kind === 'unit') {
    const u = content.units[card] as UnitDef;
    const l = plan[u.age] as Loadout;
    if (l.units.includes(card)) return { card, kind, age: u.age, rarity: u.rarity, inBaseline: true, replaces: null, plan };
    let slot = u.rarity === 'epic' || u.rarity === 'legendary' ? SUPPORT_SLOT : l.units.findIndex((id) => id !== null && content.units[id]?.group === u.group);
    if (slot < 0) slot = SUPPORT_SLOT;
    const replaces = l.units[slot] ?? null;
    l.units[slot] = card;
    return { card, kind, age: u.age, rarity: u.rarity, inBaseline: false, replaces, plan };
  }
  if (kind === 'turret') {
    const t = content.turrets[card] as TurretDef;
    const l = plan[t.age] as Loadout;
    if (l.turrets.includes(card)) return { card, kind, age: t.age, rarity: t.rarity, inBaseline: true, replaces: null, plan };
    const slot = t.rarity === 'common' ? 0 : SPECIAL_TURRET_SLOT;
    const replaces = l.turrets[slot] ?? null;
    l.turrets[slot] = card;
    return { card, kind, age: t.age, rarity: t.rarity, inBaseline: false, replaces, plan };
  }
  const p = content.powers[card] as PowerDef;
  const l = plan[p.age] as Loadout;
  if (l.powers[p.slot] === card) return { card, kind, age: p.age, rarity: p.slot, inBaseline: true, replaces: null, plan };
  const replaces = l.powers[p.slot];
  l.powers = { ...l.powers, [p.slot]: card };
  return { card, kind, age: p.age, rarity: p.slot, inBaseline: false, replaces, plan };
}

/** Every collectable card with its test, in age order: units, turrets, powers. */
export function allCardTests(content: CompiledContent, deck = 5): CardTest[] {
  const out: CardTest[] = [];
  for (const age of agesOf(content)) {
    for (const u of unitsOfAge(content, age)) out.push(cardTest(content, u.id, deck));
    for (const t of turretsOfAge(content, age)) out.push(cardTest(content, t.id, deck));
    for (const p of powersOfAge(content, age)) out.push(cardTest(content, p.id, deck));
  }
  return out;
}

/** A side for a headless match: every card (including hidden summon sources) at `level`. */
export function sideConfig(content: CompiledContent, plan: Plan, o: { level: number; label: string; isBot: boolean }): SideConfig {
  const levels: Record<CardId, number> = {};
  for (const id of Object.keys(content.units)) levels[id] = o.level;
  for (const id of Object.keys(content.turrets)) levels[id] = o.level;
  return { label: o.label, isBot: o.isBot, loadouts: clonePlan(plan), levels, skins: {} };
}

/**
 * A3 checks for a plan over the ages a format uses: 7 unit and 2 turret slots, all cards from that
 * age, no duplicates, at least 3 units and 1 turret, powers from that age in their own slots (A2.9.1).
 * Returns the problems found.
 */
export function planIssues(content: CompiledContent, plan: Plan, format: FormatId): string[] {
  const issues: string[] = [];
  for (const age of formatAges(content, format)) {
    const l = plan[age];
    if (!l) {
      issues.push(`${age}: no loadout`);
      continue;
    }
    if (l.units.length !== 7) issues.push(`${age}: ${l.units.length} unit slots, want 7`);
    if (l.turrets.length !== 2) issues.push(`${age}: ${l.turrets.length} turret slots, want 2`);
    const units = l.units.filter((c): c is CardId => c !== null);
    const turrets = l.turrets.filter((c): c is CardId => c !== null);
    if (units.length < 3) issues.push(`${age}: ${units.length} units, want at least 3`);
    if (turrets.length < 1) issues.push(`${age}: no turret`);
    if (new Set(units).size !== units.length || new Set(turrets).size !== turrets.length) issues.push(`${age}: duplicate card`);
    for (const c of units) if (content.units[c]?.age !== age || content.units[c]?.hidden === true) issues.push(`${age}: unit ${c} is not a ${age} card`);
    for (const c of turrets) if (content.turrets[c]?.age !== age) issues.push(`${age}: turret ${c} is not a ${age} card`);
    for (const slot of ['home', 'field'] as const) {
      const id = l.powers[slot];
      if (id === null) continue;
      if (content.powers[id]?.age !== age || content.powers[id]?.slot !== slot) issues.push(`${age}: power ${id} is not a ${age} ${slot} power`);
    }
  }
  return issues;
}
