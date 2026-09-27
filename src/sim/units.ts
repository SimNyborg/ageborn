/**
 * Unit creation and lookups shared by the systems (DESIGN B3 Entities: arrays with stable increasing
 * ids, iterated in id order).
 */
import type { CardId, Side } from '@/contracts';
import { BP, assert } from '@/core';
import { emit } from './events';
import { clampToLane } from './geometry';
import { levelBp, scaleCenti, type UnitRules } from './rules';
import { NEVER, NO_TARGET, type AttackRt, type Ctx, type UnitRt } from './state';

export function unitRules(ctx: Ctx, u: UnitRt): UnitRules {
  return ctx.rules.unitList[u.ci] as UnitRules;
}

/** Spawns a unit at world x. Summoned units (riders, Paratroopers, Vanguard) use no pop and pay no bounty. */
export function spawnUnit(ctx: Ctx, side: Side, card: CardId, x: number, level: number, summoned: boolean): UnitRt {
  const r = ctx.rules.units[card];
  assert(r !== undefined, `unknown unit card ${card}`);
  const lvl = levelBp(ctx.econ, level);
  const maxHp = Math.trunc((scaleCenti(r.hp, lvl) * ctx.mods.unitHpBp) / BP);
  const innateMax = r.innate ? scaleCenti(r.innate.amount, lvl) : 0;
  const attacks: AttackRt[] = r.attacks.map(() => ({
    targetId: NO_TARGET,
    impactTick: 0,
    nextAttackTick: 0,
    lastAttackTick: NEVER,
    retargetTick: 0,
    firstHit: false,
    bite: false,
  }));
  const px = clampToLane(side, x, r.half);
  const u: UnitRt = {
    id: ctx.s.nextId,
    side,
    card,
    level: Math.max(1, Math.min(ctx.econ.maxLevel, Math.trunc(level))),
    x: px,
    prevX: px,
    hp: maxHp,
    maxHp,
    shield: 0,
    innateShield: innateMax,
    mode: 'walk',
    attacks,
    statuses: [],
    air: r.air,
    summoned,
    timers: r.def.abilities.map(() => 0),
    lastDamageTick: NEVER,
    ci: r.idx,
    dmg: r.attacks.map((a) => scaleCenti(a.damage, lvl)),
    vsBase: r.attacks.map((a) => scaleCenti(a.vsBaseDamage, lvl)),
    innateMax,
    innateRegen: r.innate ? Math.trunc((r.innate.regenPerTick * lvl) / BP) : 0,
    healPool: r.heal ? Math.trunc((r.heal.poolPerPulse * lvl) / BP) : 0,
    lastHitId: NO_TARGET,
    lastHitCard: '',
    lastHitKind: null,
    lastHitSide: side,
    lastHitCast: null,
    auraAttackSpeedBp: 0,
    auraDamageBp: 0,
    leapFrom: 0,
    leapTo: 0,
    leapStart: 0,
    leapEnd: 0,
    moved: 0,
  };
  ctx.s.nextId += 1;
  ctx.s.units.push(u);
  if (!summoned) ctx.s.sides[side].pop += r.pop;
  emit(ctx, { e: 'unitSpawned', id: u.id, side, card, x: u.x, summoned, level: u.level });
  return u;
}

/** Binary search by id (units are sorted by id). */
export function findUnit(ctx: Ctx, id: number): UnitRt | undefined {
  const a = ctx.s.units;
  let lo = 0;
  let hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const u = a[mid] as UnitRt;
    if (u.id === id) return u;
    if (u.id < id) lo = mid + 1;
    else hi = mid - 1;
  }
  return undefined;
}

/** Alive: HP above 0 and not yet removed. */
export function alive(u: UnitRt): boolean {
  return u.hp > 0 && u.mode !== 'dying';
}
