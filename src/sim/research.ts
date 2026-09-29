/**
 * The War Council at run time (DESIGN A18.5.1): one research slot per side, prices with the underdog
 * discount, completion (B3 step 4, after the turret timers), cancel with a 75% refund, and the effects
 * a unit carries from its spawn (A18.2 rule 2: research is never retroactive).
 *
 * Validation reasons (`commandRejected`): `badCommand` (no such pick), `researchBusy` (the slot is in
 * use), `researchOwned`, `otherPickOwned` (the rank's other pick is owned), `rankLocked` (the rank has
 * not opened in this window yet, or the rank below in the line is not owned), `noGold`,
 * `nothingToCancel`.
 */
import type { Command, Side } from '@/contracts';
import { BP } from '@/core';
import { emit } from './events';
import { addSideFx, addUnitFx, emptySideFx, emptyUnitFx, type PickRules, type UnitFx } from './researchRules';
import type { UnitRules } from './rules';
import { baseHpBp, other, type Ctx } from './state';

type ResearchCmd = Extract<Command, { t: 'research' }>;

/** The pick a command names: track, class line (Troops only), rank and pick A or B. */
export function findPick(ctx: Ctx, c: Pick<ResearchCmd, 'track' | 'group' | 'rank' | 'pick'>): PickRules | undefined {
  const troops = c.track === 'troops';
  return ctx.rules.research.picks.find(
    (p) => p.track === c.track && p.rank === c.rank && p.pick === c.pick && (!troops || p.def.group === c.group),
  );
}

/** Is `p`'s rank open for this side: unlocked by its window position, and the rank below owned (A18.5.1)? */
export function rankOpen(ctx: Ctx, side: Side, p: PickRules): boolean {
  const at = ctx.rankUnlock[p.rank - 1];
  if (at === undefined || ctx.s.sides[side].ageIndex < at) return false;
  if (p.rank === 1) return true;
  const owned = ctx.s.sides[side].research.owned;
  return owned.some((i) => {
    const q = ctx.rules.research.picks[i];
    return q !== undefined && q.track === p.track && q.cls === p.cls && q.rank === p.rank - 1;
  });
}

/** The highest rank open for this side at its window position (A18.5.1), 0 when none. */
export function ranksOpen(ctx: Ctx, side: Side): number {
  const pos = ctx.s.sides[side].ageIndex;
  let n = 0;
  ctx.rankUnlock.forEach((at, i) => {
    if (pos >= at) n = i + 1;
  });
  return ctx.rules.research.picks.length > 0 ? n : 0;
}

/** Why the side cannot start `p` now (ignoring gold), or null. */
export function researchBlock(ctx: Ctx, side: Side, p: PickRules): string | null {
  const s = ctx.s.sides[side];
  if (s.research.cur >= 0) return 'researchBusy';
  if (s.research.owned.includes(p.idx)) return 'researchOwned';
  const sibling = ctx.rules.research.picks.find((q) => q.track === p.track && q.cls === p.cls && q.rank === p.rank && q.pick !== p.pick);
  if (sibling && s.research.owned.includes(sibling.idx)) return 'otherPickOwned';
  if (!rankOpen(ctx, side, p)) return 'rankLocked';
  return null;
}

/**
 * Is the side behind (A18.5.1 underdog discount): a lower age position than the enemy's, or a base
 * HP percentage 20 or more points below the enemy's?
 */
export function isUnderdog(ctx: Ctx, side: Side): boolean {
  const me = ctx.s.sides[side];
  const foe = ctx.s.sides[other(side)];
  if (me.ageIndex < foe.ageIndex) return true;
  const gap = ctx.rules.research.baseGapBp;
  return gap > 0 && baseHpBp(foe) - baseHpBp(me) >= gap;
}

/** Price of `p` for the side right now, milli-gold (the underdog discount is rounded down, A18.5.1). */
export function researchPrice(ctx: Ctx, side: Side, p: PickRules): number {
  const base = ctx.rules.research.cost[p.track][p.rank - 1] ?? 0;
  if (!isUnderdog(ctx, side) || ctx.rules.research.discountBp <= 0) return base;
  return Math.trunc((base * (BP - ctx.rules.research.discountBp)) / BP);
}

/** Starts a research item (the `research` command). */
export function startResearch(ctx: Ctx, side: Side, c: ResearchCmd): string | null {
  if (c.rank !== 1 && c.rank !== 2 && c.rank !== 3) return 'badCommand';
  if (c.pick !== 0 && c.pick !== 1) return 'badCommand';
  const p = findPick(ctx, c);
  if (!p) return 'badCommand';
  const block = researchBlock(ctx, side, p);
  if (block) return block;
  const s = ctx.s.sides[side];
  const price = researchPrice(ctx, side, p);
  if (s.gold < price) return 'noGold';
  const ticks = ctx.rules.research.ticks[p.rank - 1] ?? 1;
  s.gold -= price;
  s.research.cur = p.idx;
  s.research.startTick = ctx.tick;
  s.research.endTick = ctx.tick + ticks;
  s.research.paid = price;
  emit(ctx, { e: 'researchStarted', side, pick: p.id, cost: price, endTick: s.research.endTick });
  return null;
}

/** Cancels the research in progress with a 75% refund (the `researchCancel` command). */
export function cancelResearch(ctx: Ctx, side: Side): string | null {
  const s = ctx.s.sides[side];
  const p = ctx.rules.research.picks[s.research.cur];
  if (s.research.cur < 0 || !p) return 'nothingToCancel';
  const refund = Math.trunc((s.research.paid * ctx.rules.research.cancelRefundBp) / BP);
  s.gold += refund;
  s.research.cur = -1;
  s.research.paid = 0;
  s.research.startTick = 0;
  s.research.endTick = 0;
  emit(ctx, { e: 'researchCancelled', side, pick: p.id, refund });
  return null;
}

/** Recomputes the side's summed turret, economy and command effects from its owned picks. */
export function refreshSideFx(ctx: Ctx, side: Side): void {
  const s = ctx.s.sides[side];
  const fx = emptySideFx();
  for (const i of s.research.owned) {
    const p = ctx.rules.research.picks[i];
    if (p?.side) addSideFx(fx, p.side);
  }
  s.fx = fx;
}

/** B3 step 4 (after the turret timers): research completes; it continues through Ascension (A18.5.1). */
export function researchSystem(ctx: Ctx): void {
  for (const side of [0, 1] as const) {
    const s = ctx.s.sides[side];
    if (s.research.cur < 0 || ctx.tick < s.research.endTick) continue;
    const p = ctx.rules.research.picks[s.research.cur];
    s.research.cur = -1;
    s.research.paid = 0;
    s.research.startTick = 0;
    s.research.endTick = 0;
    if (!p) continue;
    s.research.owned.push(p.idx);
    refreshSideFx(ctx, side);
    emit(ctx, { e: 'researchDone', side, pick: p.id });
    if (p.track === 'economy') {
      // The base's economy prop grows with the Economy track (A18.5.4 replaced the Treasury).
      s.treasury += 1;
      emit(ctx, { e: 'treasuryUp', side, level: s.treasury });
    }
  }
}

/** Progress of the research in progress, bp (0 when idle). */
export function researchProgressBp(ctx: Ctx, side: Side): number {
  const r = ctx.s.sides[side].research;
  if (r.cur < 0 || r.endTick <= r.startTick) return 0;
  const done = ctx.tick - r.startTick;
  return Math.max(0, Math.min(BP, Math.trunc((done * BP) / (r.endTick - r.startTick))));
}

/**
 * The effects a unit carries from its spawn: the owned picks of its class line and the Command picks
 * that act on units (War Horns), plus the side's `sideMods` unit stats (A18.11). Null when none.
 */
export function unitFxAtSpawn(ctx: Ctx, side: Side, r: UnitRules): { fx: UnitFx | null; picks: number[]; mail: number } {
  const s = ctx.s.sides[side];
  const cls = ctx.rules.research.classOfRole[r.def.role] ?? -1;
  let fx: UnitFx | null = null;
  const picks: number[] = [];
  for (const i of s.research.owned) {
    const p = ctx.rules.research.picks[i];
    if (!p?.unit || (p.cls >= 0 && p.cls !== cls)) continue;
    fx ??= emptyUnitFx();
    addUnitFx(fx, p.unit);
    picks.push(i);
  }
  const mods = ctx.cfg.sides[side].sideMods;
  if (mods) {
    const d = Math.trunc(mods.unitDamageBp ?? 0);
    const h = Math.trunc(mods.unitHpBp ?? 0);
    const sp = Math.trunc(mods.unitSpeedBp ?? 0);
    const as = Math.trunc(mods.unitAttackSpeedBp ?? 0);
    if (d !== 0 || h !== 0 || sp !== 0 || as !== 0) {
      fx ??= emptyUnitFx();
      fx.damageBp += d;
      fx.hpBp += h;
      fx.speedBp += sp;
      fx.attackSpeedBp += as;
    }
  }
  let mail = 0;
  if (fx && fx.mailBp > 0) mail = Math.trunc(((ctx.rules.research.infantryDamage[r.age] ?? 0) * fx.mailBp) / BP);
  return { fx, picks, mail };
}
