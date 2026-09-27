/**
 * Small read-only helpers over the sim state for the director and the hints. They only read the
 * contract types (`SimState`, `MatchConfig`), so `tutorial` stays independent of `sim` (B2).
 */
import type { AgeId, CardId, MatchConfig, Side, SimEvent, SimState } from '@/contracts';

export const PPM_FULL = 1_000_000;
const MILLI = 1000;
/** Lane length in milli-lu (A2.1, B3). */
export const LANE_MILLI = 1_200_000;

/** Everything the director and hints read each tick. */
export interface TickInput {
  state: Readonly<SimState>;
  config: Readonly<MatchConfig>;
  /** This tick's events. */
  events: readonly SimEvent[];
  /** The player's side. */
  side: Side;
}

export const other = (s: Side): Side => (s === 0 ? 1 : 0);

/** XP needed to leave the current age in whole XP, or null in the format's final age (A2.4). */
export function xpThreshold(config: Readonly<MatchConfig>, ageIndex: number): number | null {
  const fmt = config.content.formats[config.format];
  if (!fmt || ageIndex >= fmt.ages.length - 1) return null;
  const age = fmt.ages[ageIndex];
  if (!age) return null;
  return fmt.xpToNextOverride?.[ageIndex] ?? config.content.ages[age].xpToNext;
}

/** A2.4: XP ≥ threshold, not the final age, not ascending, match running. */
export function evolveReady(i: TickInput): boolean {
  const s = i.state.sides[i.side];
  const need = xpThreshold(i.config, s.ageIndex);
  return need !== null && s.xp >= need * MILLI && s.ascendUntil <= i.state.tick && i.state.phase !== 'ended';
}

/** Whole gold of a side. */
export function goldOf(i: TickInput, side: Side = i.side): number {
  return Math.floor(i.state.sides[side].gold / MILLI);
}

/** Own-side progress in milli-lu of a world x (0 at the side's gate). */
export function pOf(x: number, side: Side): number {
  return side === 0 ? x : LANE_MILLI - x;
}

/** The age id of the player's current age. */
export function ageIdOf(i: TickInput, side: Side = i.side): AgeId | undefined {
  return i.config.content.formats[i.config.format]?.ages[i.state.sides[side].ageIndex];
}

/** The unit card in tray slot `slot` of the player's current loadout. */
export function trayCard(i: TickInput, slot: number): CardId | null {
  const age = ageIdOf(i);
  if (!age) return null;
  return i.config.sides[i.side].loadouts[age]?.units[slot] ?? null;
}

/** Unit cards of the player's current loadout (non-empty slots). */
export function loadoutUnits(i: TickInput): CardId[] {
  const out: CardId[] = [];
  for (let slot = 0; slot < 5; slot += 1) {
    const c = trayCard(i, slot);
    if (c) out.push(c);
  }
  return out;
}

/** True when `e` belongs to `side` (events without a side never match). */
export function eventOfSide(e: SimEvent, side: Side): boolean {
  return 'side' in e && e.side === side;
}
