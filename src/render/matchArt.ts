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
 */
import type { AgeId, CardId, MatchConfig, Side, SimState, SkinId, VisualId } from '@/contracts';
import { xpThreshold } from './hudModel';

/** A visual a hold keeps: a unit with its skin, or a fort. */
export interface HeldVisual {
  visualId: VisualId;
  skin?: SkinId | null;
}

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
  // the Vanguard: the age's Infantry Common (every one, should the content ever have two)
  if (o.vanguard && content.economy.vanguardCount > 0) {
    for (const id of Object.keys(content.units).sort()) {
      const u = content.units[id];
      if (u && u.age === age && u.group === 'infantry' && u.rarity === 'common' && !u.hidden) addUnit(id);
    }
  }
  return [...out];
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
 * Every visual the battle should hold now: per side its current age (and its next one when near the
 * evolve), its training queue, and the units on the field (`onField`: side and card of each live or dying
 * unit view). Keyed `visualId@skin`, so the caller can tell when the set changed.
 */
export function heldVisuals(
  config: Readonly<MatchConfig>,
  state: Readonly<SimState>,
  ages: readonly AgeId[],
  onField: Iterable<{ side: Side; card: CardId }>,
): Map<string, HeldVisual> {
  const out = new Map<string, HeldVisual>();
  const add = (side: Side, card: CardId): void => {
    const v = cardVisual(config, side, card);
    if (v) out.set(`${v.visualId}@${v.skin ?? ''}`, v);
  };
  for (const side of [0, 1] as const) {
    const s = state.sides[side];
    const age = ages[s.ageIndex];
    if (age) for (const c of sideAgeCards(config, side, age)) add(side, c);
    const next = ages[s.ageIndex + 1];
    if (next && nearEvolve(state, config, side)) for (const c of sideAgeCards(config, side, next, { vanguard: true })) add(side, c);
    for (const q of s.queue) add(side, q.card);
  }
  for (const u of onField) add(u.side, u.card);
  return out;
}
