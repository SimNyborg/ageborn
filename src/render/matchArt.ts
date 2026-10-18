/**
 * The unit sheets a match draws (G7, Safari memory, 2026-10-08).
 *
 * The HD unit sheets are the largest part of the game's memory (4096 x 4032 px each at most, up to 66 MB
 * decoded), and iOS ends a Safari tab at about 1-2 GB. A battle therefore holds only what it can draw:
 * per side, everything its deck can field in its current age and, from 70% of the evolve bar or the start
 * of an Ascension, in its next age (the same moment the next scene loads), so the new age's troops and its
 * Vanguard never appear without their art; the cards in its training queue (a queued card can outlive an
 * evolve); and every unit still on the field. Everything else is released, so the sheets of ages both
 * sides have left unload once their last units are gone.
 *
 * The art provider keeps the sheets through its duck-typed `holdArt` (visuals' `ArtHold`); a provider
 * without it (fakes, tests) loads by age as before. Presentation only: the sim never sees any of this.
 *
 * Each held visual carries how soon it may be drawn (`priority`, {@link HOLD_RANK}; 2026-10-18): the
 * provider's memory governor keeps every one at least on its 1x sheet and gives the HD sheets by it, so a
 * big collection's war stays within the iPhone memory budget (visuals' `sheetBudget.ts`).
 */
import type { AgeId, CardId, MatchConfig, Side, SimState, SkinId, VisualId } from '@/contracts';
import { TICKS_PER_SECOND } from '@/core';
import { xpThreshold } from './hudModel';

/** A visual a hold keeps: a unit with its skin, or a fort. */
export interface HeldVisual {
  visualId: VisualId;
  skin?: SkinId | null;
  /**
   * How soon the battle may draw it ({@link HOLD_RANK}); the provider's memory governor gives HD sheets by it
   * (visuals' `sheetBudget.ts`). Lower is sooner.
   */
  priority?: number;
}

/**
 * How soon a held visual may be drawn (the provider's memory governor, visuals' `SHEET_RANK`, plans HD by
 * it): on the lane now; within seconds (the training queues, what units on the lane summon or drop, the
 * Vanguard and the queue's conversions of an Ascension, a deck's paradrops and levies); the rest of each
 * side's current age; a side's next age near its evolve.
 */
export const HOLD_RANK = { field: 0, soon: 1, deck: 2, next: 3 } as const;

/**
 * A card of a side's current deck that stood on the lane this recently (sim ticks: 20 s) stays held as soon
 * to appear: a card that just fell is usually trained again, and its HD copy then does not go back and forth
 * between the copies (the provider's memory governor). Cards of an age the side has left gain nothing.
 */
export const RECENT_FIELD_TICKS = 20 * TICKS_PER_SECOND;

/** What the battle view needs from the provider's hold (visuals' `ArtHold`). */
export interface ArtHoldLike {
  set(visuals: readonly HeldVisual[]): Promise<void>;
  release(): void;
}

/** A side's next age is held from this share of its evolve threshold (bp), as the next scene is fetched. */
export const NEAR_EVOLVE_BP = 7000;

/** True when `side` nears its evolve: 70% of the XP it needs, or an Ascension under way. */
export function nearEvolve(state: Readonly<SimState>, config: Readonly<MatchConfig>, side: Side): boolean {
  const s = state.sides[side];
  if (s.ascendUntil > state.tick) return true;
  const need = xpThreshold(config, s.ageIndex);
  return need !== null && s.xp * 10_000 >= need * 1000 * NEAR_EVOLVE_BP;
}

/**
 * The cards a side can field in one age: its loadout's troops, what they summon (summoners, riders that
 * dismount; followed through), its fort (and a camp's levy) and its paradrop powers. `vanguard` (an age
 * the side evolves into) adds the age's Infantry Common, which the Ascension spawns (A2.4). Turrets are
 * world sheets and load per age.
 */
export function sideAgeCards(config: Readonly<MatchConfig>, side: Side, age: AgeId, o: { vanguard?: boolean } = {}): CardId[] {
  const content = config.content;
  const lo = config.sides[side].loadouts[age];
  const out = new Set<CardId>();
  const addUnit = (card: CardId | null | undefined): void => {
    if (!card || out.has(card)) return;
    const def = content.units[card];
    if (!def) return;
    out.add(card);
    for (const ab of def.abilities) {
      if (ab.kind === 'summon') addUnit(ab.card);
      else if (ab.kind === 'riders') addUnit(ab.onDeathSpawn);
    }
  };
  for (const c of lo?.units ?? []) addUnit(c);
  for (const p of [lo?.powers.home, lo?.powers.field]) {
    const fx = p ? content.powers[p]?.effect : undefined;
    if (fx?.kind === 'paradrop') addUnit(fx.card);
  }
  const fortId = lo?.fort ?? null;
  if (fortId) {
    out.add(fortId);
    const fort = (content as { forts?: Readonly<Record<CardId, { camp?: { spawn: CardId } }>> }).forts?.[fortId];
    addUnit(fort?.camp?.spawn);
  }
  if (o.vanguard) for (const id of vanguardCards(config, age)) addUnit(id);
  return [...out];
}

/** The cards a side's deck can bring on at any moment in one age: its paradrop powers' troops and its camp's levy. */
function instantCards(config: Readonly<MatchConfig>, side: Side, age: AgeId): CardId[] {
  const content = config.content;
  const lo = config.sides[side].loadouts[age];
  const out: CardId[] = [];
  for (const p of [lo?.powers.home, lo?.powers.field]) {
    const fx = p ? content.powers[p]?.effect : undefined;
    if (fx?.kind === 'paradrop') out.push(fx.card);
  }
  const fortId = lo?.fort ?? null;
  const camp = fortId ? (content as { forts?: Readonly<Record<CardId, { camp?: { spawn: CardId } }>> }).forts?.[fortId]?.camp?.spawn : undefined;
  if (camp) out.push(camp);
  return out;
}

/** The Vanguard of an age: its Infantry Common (every one, should the content ever have two), which the Ascension spawns (A2.4). */
function vanguardCards(config: Readonly<MatchConfig>, age: AgeId): CardId[] {
  const content = config.content;
  if (content.economy.vanguardCount <= 0) return [];
  return Object.keys(content.units)
    .sort()
    .filter((id) => {
      const u = content.units[id];
      return !!u && u.age === age && u.group === 'infantry' && u.rarity === 'common' && !u.hidden;
    });
}

/** The visual a side draws for a card (its skin applied); null for a card the content does not know. */
export function cardVisual(config: Readonly<MatchConfig>, side: Side, card: CardId): HeldVisual | null {
  const def = config.content.units[card];
  const fort = (config.content as { forts?: Readonly<Record<CardId, { visualId: VisualId }>> }).forts?.[card];
  const visualId = def?.visualId ?? fort?.visualId;
  if (!visualId) return null;
  const skin = config.sides[side].skins[card];
  return skin ? { visualId, skin } : { visualId };
}

/**
 * Every visual the battle should hold now, each at its best {@link HOLD_RANK}: per side its current age (and
 * its next one when near the evolve), its training queue, and the units on the field (`onField`: side and
 * card of each live or dying unit view) with what they can bring on (summons, a rider's dismounted crew: a
 * unit of an age its side has left still summons). `recent`: cards that stood on the lane lately
 * ({@link RECENT_FIELD_TICKS}). Keyed `visualId@skin`, so the caller can tell when the set changed.
 */
export function heldVisuals(
  config: Readonly<MatchConfig>,
  state: Readonly<SimState>,
  ages: readonly AgeId[],
  onField: Iterable<{ side: Side; card: CardId }>,
  recent: Iterable<{ side: Side; card: CardId }> = [],
): Map<string, HeldVisual> {
  const content = config.content;
  const out = new Map<string, HeldVisual>();
  const add = (side: Side, card: CardId, rank: number): void => {
    const v = cardVisual(config, side, card);
    if (!v) return;
    const key = `${v.visualId}@${v.skin ?? ''}`;
    const had = out.get(key);
    if (!had || (had.priority ?? HOLD_RANK.deck) > rank) out.set(key, { ...v, priority: rank });
  };
  // what a unit brings on (followed through), held as soon as the unit trains or stands on the lane
  const followUps = (side: Side, card: CardId, seen = new Set<CardId>()): void => {
    if (seen.has(card)) return;
    seen.add(card);
    for (const ab of content.units[card]?.abilities ?? []) {
      const next = ab.kind === 'summon' ? ab.card : ab.kind === 'riders' ? ab.onDeathSpawn : null;
      if (!next) continue;
      add(side, next, HOLD_RANK.soon);
      followUps(side, next, seen);
    }
  };
  for (const side of [0, 1] as const) {
    const s = state.sides[side];
    const age = ages[s.ageIndex];
    if (age) {
      for (const c of sideAgeCards(config, side, age)) add(side, c, HOLD_RANK.deck);
      for (const c of instantCards(config, side, age)) add(side, c, HOLD_RANK.soon);
    }
    const next = ages[s.ageIndex + 1];
    if (next && nearEvolve(state, config, side)) {
      for (const c of sideAgeCards(config, side, next, { vanguard: true })) add(side, c, HOLD_RANK.next);
      if (s.ascendUntil > state.tick) {
        // the age-up spawns the Vanguard and turns each queued card into the new age's card of its group (A2.4)
        for (const c of vanguardCards(config, next)) add(side, c, HOLD_RANK.soon);
        const lo = config.sides[side].loadouts[next];
        for (const q of s.queue) {
          const to = lo?.units.find((c) => c !== null && content.units[c]?.group === q.group);
          if (to) add(side, to, HOLD_RANK.soon);
        }
      }
    }
    for (const q of s.queue) {
      add(side, q.card, HOLD_RANK.soon);
      followUps(side, q.card);
    }
  }
  for (const u of onField) {
    add(u.side, u.card, HOLD_RANK.field);
    followUps(u.side, u.card);
  }
  // a card that stood on the lane lately ranks as soon to appear, if its side still fields it (RECENT_FIELD_TICKS)
  for (const u of recent) {
    const v = cardVisual(config, u.side, u.card);
    if (v && out.has(`${v.visualId}@${v.skin ?? ''}`)) add(u.side, u.card, HOLD_RANK.soon);
  }
  return out;
}
