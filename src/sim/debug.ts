/**
 * Dev and test helpers: the sandbox panel (src/dev/sandbox/simPanel.tsx) and unit tests use them to set
 * up scenarios directly. They change the state outside the command stream, so a sim touched by them
 * can no longer produce a replay (`buildReplay` refuses). Never use them in gameplay code.
 *
 * Positions are given as the side's own progress p in whole lu; gold and XP in whole units.
 */
import type { CardId, PowerSlot, Side, Sim, SimEvent, UnitState } from '@/contracts';
import { BP, MILLI, PPM, assert, slotIndex } from '@/core';
import { SimImpl } from './createSim';
import { xOf } from './geometry';
import { refreshSideFx } from './research';
import { NEVER, NO_TARGET, cardLevel, type Ctx, type UnitRt } from './state';
import { spawnUnit } from './units';

function impl(sim: Sim): SimImpl {
  assert(sim instanceof SimImpl, 'dev helpers need a sim created by createSim');
  sim.devTouched = true;
  return sim;
}

/** The internal context of a sim (tests only). */
export function simCtx(sim: Sim): Ctx {
  assert(sim instanceof SimImpl, 'simCtx needs a sim created by createSim');
  return sim.ctx;
}

/** Runs `n` ticks without commands and returns their events. */
export function stepN(sim: Sim, n: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < n && !sim.state.outcome; i += 1) out.push(...sim.step([]));
  return out;
}

/** Spawns any unit card on either side at own-side progress `p` (lu, default the spawn point). */
export function devSpawn(
  sim: Sim,
  side: Side,
  card: CardId,
  o: { p?: number; level?: number; summoned?: boolean } = {},
): UnitState {
  const s = impl(sim);
  const ctx = s.ctx;
  const p = (o.p ?? ctx.econ.spawnP / MILLI) * MILLI;
  const u = spawnUnit(ctx, side, card, xOf(Math.trunc(p), side), o.level ?? cardLevel(ctx, side, card), o.summoned ?? false);
  // A dev spawn happens between ticks: make it look settled for interpolation.
  u.prevX = u.x;
  return u;
}

/** Places an active turret of any card on a mount (buys the mount if needed). */
export function devPlaceTurret(sim: Sim, side: Side, mount: number, card: CardId, level?: number): void {
  const ctx = impl(sim).ctx;
  const tr = ctx.rules.turrets[card];
  assert(tr !== undefined, `unknown turret card ${card}`);
  const s = ctx.s.sides[side];
  assert(mount >= 0 && mount < s.turrets.length, `bad mount ${mount}`);
  if (s.mountsOwned <= mount) s.mountsOwned = mount + 1;
  s.turrets[mount] = {
    card,
    age: tr.age,
    level: level ?? cardLevel(ctx, side, card),
    state: 'active',
    readyTick: ctx.s.tick,
    attack: { targetId: NO_TARGET, impactTick: 0, nextAttackTick: 0, lastAttackTick: NEVER, retargetTick: 0, firstHit: false, bite: false },
  };
}

/** Sets a side's gold (whole). */
export function devSetGold(sim: Sim, side: Side, gold: number): void {
  impl(sim).ctx.s.sides[side].gold = Math.trunc(gold * MILLI);
}

/** Sets a side's XP (whole), ignoring the cap. */
export function devSetXp(sim: Sim, side: Side, xp: number): void {
  impl(sim).ctx.s.sides[side].xp = Math.trunc(xp * MILLI);
}

/** Sets a side's power slot reload progress in ppm (both slots when `slot` is omitted; A2.9.3). */
export function devSetPower(sim: Sim, side: Side, ppm: number, slot?: PowerSlot): void {
  const s = impl(sim).ctx.s.sides[side];
  const v = Math.max(0, Math.min(PPM, Math.trunc(ppm)));
  for (const i of slot === undefined ? [0, 1] : [slotIndex(slot)]) {
    s.powerPpm[i] = v;
    s.powerRem[i] = 0;
  }
}

/** Sets a side's base HP as bp of its max. */
export function devSetBaseBp(sim: Sim, side: Side, bp: number): void {
  const s = impl(sim).ctx.s.sides[side];
  s.baseHp = Math.trunc((s.baseMaxHp * bp) / BP);
}

/** Moves a unit to own-side progress `p` (lu). */
export function devMove(sim: Sim, id: number, p: number): void {
  const ctx = impl(sim).ctx;
  const u = ctx.s.units.find((x) => x.id === id);
  assert(u !== undefined, `no unit ${id}`);
  u.x = xOf(Math.trunc(p * MILLI), u.side);
  u.prevX = u.x;
}

/** Removes every unit, projectile and cast (sandbox reset of the lane). */
export function devClearLane(sim: Sim): void {
  const ctx = impl(sim).ctx;
  ctx.s.units.length = 0;
  ctx.s.projectiles.length = 0;
  ctx.s.casts.length = 0;
  for (const s of ctx.s.sides) s.pop = 0;
}

/** The live unit with this id, typed with the internal fields (tests only). */
export function unitById(sim: Sim, id: number): UnitRt | undefined {
  return simCtx(sim).s.units.find((u) => u.id === id);
}

/** Grants a side a research pick at once, as if it had just completed (tests and dev pages; A18.5). */
export function devGrantResearch(sim: Sim, side: Side, pickId: string): void {
  const ctx = impl(sim).ctx;
  const p = ctx.rules.research.picks.find((q) => q.id === pickId);
  assert(p !== undefined, `unknown research pick ${pickId}`);
  const s = ctx.s.sides[side];
  if (!s.research.owned.includes(p.idx)) s.research.owned.push(p.idx);
  refreshSideFx(ctx, side);
}
