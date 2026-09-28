/**
 * Fortification prototype (DESIGN A16.14 "Checkpoint A prototype"): no sim, contract, content or art
 * change. A wall is a `palisade` unit added to a clone of the compiled content, copied from Tuskback's
 * compiled def with `speed: 0`, no abilities, tags `armored` + `ground`, `hidden: true`, the
 * placeholder visual `unit.palisade`, and one inert attack (`damage: 0`, `range: 2000`, hits nothing).
 *
 * Why it works: the inert attack never fires; the overtaking rule lets own units walk through a parked
 * ally with a longer range; the enemy block rule stops enemies at the wall; `devSpawn(..., { summoned:
 * true })` means no pop and no bounty. Known gaps (A16.14): no scaffold, pop cost, contact rule or
 * ranged ×0.5, so enemy ranged units shoot the wall at full damage. It is a worst case for turtling.
 *
 * Dev and test only: a sim touched by `devSpawn` can no longer produce a replay.
 */
import type { CardId, CompiledContent, Side, Sim, UnitDef, UnitState } from '@/contracts';
import { MILLI, toSideP } from '@/core';
import { devSpawn } from '@/sim/debug';

export const WALL_CARD: CardId = 'palisade';
/** Pads (A16.14): p 240, 360 and 460 for either side. */
export const WALL_PADS: readonly number[] = [240, 360, 460];
/** Recharge between placements (A16.14 card rules; the sandbox shows it, the proxy uses it). */
export const WALL_RECHARGE_MS = 25_000;
/** A pad is legal only with no enemy ground unit within 120 lu of it. */
export const WALL_PAD_CLEAR_LU = 120;
/** The wall's price in the headless proxy: 125 gold of its own spending per wall. */
export const WALL_COST = 125;

export interface WallOptions {
  /** HP multiplier: 1 is the full rule, 2 a feel switch. */
  hpScale?: 1 | 2;
  /** The unit the wall is copied from (default Tuskback, the Stone Heavy Common). */
  from?: CardId;
}

/** The compiled content plus a `palisade` wall unit (A16.14). */
export function withWalls(content: CompiledContent, o: WallOptions = {}): CompiledContent {
  const base = content.units[o.from ?? 'tuskback'];
  if (!base) throw new Error(`walls: no unit "${o.from ?? 'tuskback'}" to copy`);
  const first = base.attacks[0];
  if (!first) throw new Error('walls: the base unit has no attack');
  const wall: UnitDef = {
    ...base,
    id: WALL_CARD,
    speed: 0,
    hp: base.hp * (o.hpScale ?? 1),
    abilities: [],
    tags: ['armored', 'ground'],
    hidden: true,
    visualId: 'unit.palisade',
    attacks: [{ ...first, damage: 0, range: 2000, hitsGround: false, hitsAir: false, splashRadius: 0 }],
    strongVs: [],
    weakVs: [],
  };
  return { ...content, units: { ...content.units, [WALL_CARD]: wall } };
}

/** Places a wall for `side` at own-side progress `p` (whole lu). No pop, no bounty. */
export function placeWall(sim: Sim, side: Side, p: number): UnitState {
  return devSpawn(sim, side, WALL_CARD, { p, summoned: true });
}

/** The live walls of a side. */
export function wallsOf(sim: Sim, side: Side): UnitState[] {
  return sim.state.units.filter((u) => u.side === side && u.card === WALL_CARD);
}

/** A unit's progress on `side`'s own axis, whole lu. */
export function progressFor(u: Pick<UnitState, 'x'>, side: Side): number {
  return Math.trunc(toSideP(u.x, side) / MILLI);
}

/** True when a pad is legal: no enemy ground unit within 120 lu of it (`p` in the side's own lu). */
export function padClear(sim: Sim, side: Side, p: number): boolean {
  for (const u of sim.state.units) {
    if (u.side === side || u.card === WALL_CARD || u.air) continue;
    if (Math.abs(progressFor(u, side) - p) <= WALL_PAD_CLEAR_LU) return false;
  }
  return true;
}
