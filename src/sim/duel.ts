/**
 * Duel harness for the counter matrix (docs/requests/wp1-counter-duel-harness.md, DESIGN B4):
 * `countA` × card `a` on side 0 against `countB` × card `b` on side 1, all at level 1, on the real
 * lane rules with no turrets, powers, phases or training. Both groups start 300 lu apart around
 * mid-lane. The duel ends when one side is wiped or after `maxTicks` (default 90 s).
 *
 * Bases stay in place but play no part in the result: a unit that finds nothing to hit keeps
 * advancing along the lane (the sim has no "turn around"), so an air unit and a melee unit that can
 * never trade simply run out the clock.
 */
import type { CardId, CompiledContent, Loadout, SideConfig } from '@/contracts';
import { BP, LANE_MLU, MILLI, assert } from '@/core';
import { SimImpl } from './createSim';
import { xOf } from './geometry';
import { stepTick } from './step';
import { spawnUnit } from './units';

export interface DuelResult {
  /** Remaining HP of each side's group as bp of its starting HP. */
  hpLeftBp: [number, number];
  ticks: number;
}

/** Where each group starts, own-side p in mlu: 150 lu before mid-lane, so 300 lu apart centre to centre. */
const START_P = LANE_MLU / 2 - 150 * MILLI;

function emptySide(label: string): SideConfig {
  const empty: Loadout = { units: [null, null, null, null, null], turrets: [null, null], power: '' };
  return { label, isBot: true, loadouts: { stone: empty }, levels: {}, skins: {} };
}

export function runDuel(
  content: CompiledContent,
  a: CardId,
  b: CardId,
  countA: number,
  countB: number,
  o: { maxTicks?: number } = {},
): DuelResult {
  assert(content.units[a] !== undefined && content.units[b] !== undefined, 'runDuel: unknown card');
  const sim = new SimImpl({
    seed: 1,
    format: 'full',
    content,
    sides: [emptySide('A'), emptySide('B')],
    training: { noClock: true, manualLastStand: [false, false], stanceEnabled: [false, false] },
  });
  const ctx = sim.ctx;
  // No Last Stand volleys: the bases are not part of a duel.
  ctx.s.sides[0].lastStand = 'used';
  ctx.s.sides[1].lastStand = 'used';
  const start: [number, number] = [0, 0];
  const groups: [CardId, number][] = [
    [a, countA],
    [b, countB],
  ];
  for (const side of [0, 1] as const) {
    const [card, n] = groups[side] as [CardId, number];
    for (let i = 0; i < n; i += 1) start[side] += spawnUnit(ctx, side, card, xOf(START_P, side), 1, true).maxHp;
  }
  const max = o.maxTicks ?? 1800;
  const left: [number, number] = [start[0], start[1]];
  while (ctx.s.tick < max && !ctx.s.outcome) {
    stepTick(ctx, []);
    left[0] = 0;
    left[1] = 0;
    for (const u of ctx.s.units) if (u.hp > 0) left[u.side] += u.hp;
    if (left[0] === 0 || left[1] === 0) break;
  }
  const bp = (side: 0 | 1): number => (start[side] > 0 ? Math.trunc((left[side] * BP) / start[side]) : 0);
  return { hpLeftBp: [bp(0), bp(1)], ticks: ctx.s.tick };
}
