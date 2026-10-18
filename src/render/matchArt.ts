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
 * big collection's war stays within the iPhone memory budget (visuals' `sheetBudget.ts`). Before its side
 * hands over, a next age's deck is optional (it loads only where HD fits: never a 1x copy first and HD a
 * moment later), but for its Vanguard; from 80% of the evolve bar the side hands its HD over to its next age
 * ({@link HANDOVER_BP}): the next deck ranks as the deck and gets a copy well before the evolve (HD where it
 * fits), waiting without one only while the governor frees memory (`canWait`: nothing draws it before the
 * age-up), current cards nobody fielded lately rank last, and a card of the age it is leaving that is on its 1x
 * copy stays there (`noRaise`: no HD load for a unit about to be gone; review S1).
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
  /**
   * It cannot be drawn before a later hold asks for it again without this (the next age's deck before its side
   * hands over): the governor loads it only where its HD copy fits, never a 1x copy first (review S1).
   */
  optional?: boolean;
  /**
   * Nothing draws it before its side's age-up (the next age's deck during the hand-over): its load may wait while
   * the governor frees memory, instead of loading a 1x copy first and HD a moment later (review S1).
   */
  canWait?: boolean;
  /**
   * Its side is leaving its age (handing over to the next one) or has left it: on its 1x copy it stays there,
   * so a card fielded once more before the evolve does not load its HD copy again (review S1).
   */
  noRaise?: boolean;
}

/**
 * How soon a held visual may be drawn (the provider's memory governor, visuals' `SHEET_RANK`, plans HD by
 * it): on the lane now; within seconds (the training queues, what units on the lane summon or drop, the
 * Vanguard and the queue's conversions of an Ascension, a deck's paradrops and levies); the rest of each
 * side's current age; a side's next age near its evolve.
 */
export const HOLD_RANK = { field: 0, soon: 1, deck: 2, next: 3 } as const;

/**
 * A card of a side's current deck that stood on the lane this recently (sim ticks: 60 s) stays held as soon
 * to appear: a card that just fell is usually trained again, and its HD copy then does not go back and forth
 * between the copies (the provider's memory governor; review S1: at 20 s a card the AI fields every half
 * minute flipped HD → 1x → HD). Cards of an age the side has left gain nothing.
 */
export const RECENT_FIELD_TICKS = 60 * TICKS_PER_SECOND;

/**
 * A paradrop power's troops rank as soon to appear from this much of its reload (ppm, `powerPpm`); before
 * that they are part of the deck (review N3: ranked soon for the whole age they kept HD while on cooldown).
 */
export const PARADROP_SOON_PPM = 750_000;

/** What the battle view needs from the provider's hold (visuals' `ArtHold`). */
export interface ArtHoldLike {
  set(visuals: readonly HeldVisual[]): Promise<void>;
  release(): void;
}

/** A side's next age is held from this share of its evolve threshold (bp), as the next scene is fetched. */
export const NEAR_EVOLVE_BP = 7000;

/** True when `side` nears its evolve: 70% of the XP it needs, or an Ascension under way. */
export function nearEvolve(state: Readonly<SimState>, config: Readonly<MatchConfig>, side: Side): boolean {
  return evolveShare(state, config, side, NEAR_EVOLVE_BP);
}

/**
 * From this share of its evolve threshold (bp), or from the start of an Ascension, a side hands its HD sheets
 * over to its next age (review S1): the next age's deck ranks as the deck and the current age's cards not on
 * the lane, queued or fielded lately rank last. With a big collection both decks do not fit in HD, and before
 * this the next age's HD copies loaded (and uploaded, tens of ms each on an iPhone) on the evolve itself.
 */
export const HANDOVER_BP = 8000;

/**
 * The ages whose turret and fort sheets a battle keeps after an evolve (review B1): every age from the lagging
 * side's current one on, so only ages both sides have left go. An age only the leading side has passed still
 * lies ahead of the other side, and the battle preloads an age's turrets once: releasing them left that side's
 * turrets of the age drawn by the procedural stand-in for their whole lives.
 */
export function keptAges(ages: readonly AgeId[], state: Readonly<SimState>): AgeId[] {
  return ages.slice(Math.max(0, Math.min(state.sides[0].ageIndex, state.sides[1].ageIndex)));
}

/** True when `side` hands its HD over to its next age: 80% of the XP it needs, or an Ascension under way. */
export function handingOver(state: Readonly<SimState>, config: Readonly<MatchConfig>, side: Side): boolean {
  return evolveShare(state, config, side, HANDOVER_BP);
}

function evolveShare(state: Readonly<SimState>, config: Readonly<MatchConfig>, side: Side, bp: number): boolean {
  const s = state.sides[side];
  if (s.ascendUntil > state.tick) return true;
  const need = xpThreshold(config, s.ageIndex);
  return need !== null && s.xp * 10_000 >= need * 1000 * bp;
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

/**
 * The cards a side's deck can bring on within seconds in one age without training them: the troops of its
 * paradrop powers that are (nearly) reloaded ({@link PARADROP_SOON_PPM}; review N3). A camp's levy follows the
 * standing camp instead (`heldVisuals`' follow-ups), so a camp of an age its side has left still has its levy
 * held (review S3), and a camp not placed takes no HD.
 */
function instantCards(config: Readonly<MatchConfig>, state: Readonly<SimState>, side: Side, age: AgeId): CardId[] {
  const content = config.content;
  const lo = config.sides[side].loadouts[age];
  const ppm = state.sides[side].powerPpm;
  const out: CardId[] = [];
  const slots = [lo?.powers.home, lo?.powers.field];
  for (let i = 0; i < slots.length; i++) {
    const p = slots[i];
    const fx = p ? content.powers[p]?.effect : undefined;
    if (fx?.kind === 'paradrop' && (ppm?.[i] ?? 0) >= PARADROP_SOON_PPM) out.push(fx.card);
  }
  return out;
}

/** A camp's levy card when `card` is a camp's twin (the fort as a unit on the lane, A16.14.8), else null. */
function campLevy(config: Readonly<MatchConfig>, card: CardId): CardId | null {
  if (config.content.units[card]?.fort?.kind !== 'camp') return null;
  return (config.content as { forts?: Readonly<Record<CardId, { camp?: { spawn: CardId } }>> }).forts?.[card]?.camp?.spawn ?? null;
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
 * card of each live or dying unit view) with what they can bring on (summons, a rider's dismounted crew, a
 * standing camp's levy: a unit of an age its side has left still brings them on). `recent`: cards that stood
 * on the lane lately ({@link RECENT_FIELD_TICKS}). Before its hand-over a side's next age is held as optional
 * (its Vanguard, which the age-up spawns, is not), and until its Ascension as `canWait`; a side handing over
 * to its next age ({@link handingOver}) ranks that age's deck as the deck and its current deck last, but for
 * what is on the lane, queued or fielded lately, and marks the cards of the age it leaves (and of ages it has
 * left) `noRaise`. Keyed `visualId@skin`, so the caller can tell when the set changed.
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
  const handover: [boolean, boolean] = [false, false];
  // a card of the age its side is handing over from, or of an age the side has left
  const leaving = (side: Side, card: CardId): boolean => {
    const age = content.units[card]?.age;
    const i = age ? ages.indexOf(age) : -1;
    const at = state.sides[side].ageIndex;
    return i >= 0 && (i < at || (i === at && handover[side]));
  };
  // a visual held twice keeps its best rank, and is optional (canWait, noRaise) only when every hold of it is
  const add = (side: Side, card: CardId, rank: number, optional = false, canWait = false): void => {
    const v = cardVisual(config, side, card);
    if (!v) return;
    const key = `${v.visualId}@${v.skin ?? ''}`;
    const had = out.get(key);
    const opt = optional && (!had || had.optional === true);
    const wait = (optional || canWait) && (!had || had.optional === true || had.canWait === true);
    const stay = leaving(side, card) && (!had || had.noRaise === true);
    const best = had ? Math.min(had.priority ?? HOLD_RANK.deck, rank) : rank;
    out.set(key, { ...v, priority: best, ...(opt ? { optional: true } : {}), ...(wait && !opt ? { canWait: true } : {}), ...(stay ? { noRaise: true } : {}) });
  };
  // what a unit brings on (followed through), held as soon as the unit trains or stands on the lane
  const followUps = (side: Side, card: CardId, seen = new Set<CardId>()): void => {
    if (seen.has(card)) return;
    seen.add(card);
    const levy = campLevy(config, card);
    if (levy) add(side, levy, HOLD_RANK.soon);
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
    const next = ages[s.ageIndex + 1];
    handover[side] = next !== undefined && handingOver(state, config, side);
    if (age) {
      for (const c of sideAgeCards(config, side, age)) add(side, c, handover[side] ? HOLD_RANK.next : HOLD_RANK.deck);
      for (const c of instantCards(config, state, side, age)) add(side, c, HOLD_RANK.soon);
    }
    if (next && nearEvolve(state, config, side)) {
      // before the hand-over the next deck loads only where its HD copy fits; from it, every card gets a copy well
      // before the age-up (a fast-forward or a slow device leaves no time later), but may wait while the governor
      // frees memory, until the Ascension; the Vanguard is held as any card
      const ascending = s.ascendUntil > state.tick;
      const vanguard = new Set(vanguardCards(config, next));
      for (const c of sideAgeCards(config, side, next, { vanguard: true })) {
        const later = !vanguard.has(c);
        add(side, c, handover[side] ? HOLD_RANK.deck : HOLD_RANK.next, later && !handover[side], later && !ascending);
      }
      if (ascending) {
        // the age-up spawns the Vanguard and turns each queued card into the new age's card of its group (A2.4)
        for (const c of vanguard) add(side, c, HOLD_RANK.soon);
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
  // a card that stood on the lane lately ranks as soon to appear, if its side still fields it (RECENT_FIELD_TICKS;
  // also in a hand-over: a card the side keeps fielding would otherwise go 1x and back to HD before the evolve)
  for (const u of recent) {
    const v = cardVisual(config, u.side, u.card);
    if (v && out.has(`${v.visualId}@${v.skin ?? ''}`)) add(u.side, u.card, HOLD_RANK.soon);
  }
  return out;
}
