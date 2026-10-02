/**
 * Unit creation and lookups shared by the systems (DESIGN B3 Entities: arrays with stable increasing
 * ids, iterated in id order).
 */
import type { CardId, Side, SimEvent } from '@/contracts';
import { BP, assert } from '@/core';
import { emit } from './events';
import { clampToLane } from './geometry';
import { unitFxAtSpawn } from './research';
import { levelBp, scaleCenti, type UnitRules } from './rules';
import { NEVER, NO_TARGET, type AttackRt, type Ctx, type UnitRt } from './state';

export function unitRules(ctx: Ctx, u: UnitRt): UnitRules {
  return ctx.rules.unitList[u.ci] as UnitRules;
}

/**
 * Spawns a unit at world x. Summoned units (riders, Paratroopers, Vanguard, levies) use no pop and pay no
 * bounty. `o.lvlBp` overrides the level multiplier (a levy uses its camp's loadout multiplier, A16.14.3);
 * `o.from` is the camp that sent it (`unitSpawned.from`).
 */
export function spawnUnit(
  ctx: Ctx,
  side: Side,
  card: CardId,
  x: number,
  level: number,
  summoned: boolean,
  o: { lvlBp?: number; from?: number; summoner?: number } = {},
): UnitRt {
  const r = ctx.rules.units[card];
  assert(r !== undefined, `unknown unit card ${card}`);
  const lvl = o.lvlBp ?? levelBp(ctx.econ, level);
  // Research that completed before this spawn and the side's modifiers (A18.2 rule 2, A18.11).
  const at = unitFxAtSpawn(ctx, side, r);
  const fx = at.fx;
  const caps = ctx.econ.caps;
  let maxHp = Math.trunc((scaleCenti(r.hp, lvl) * ctx.mods.unitHpBp) / BP);
  if (fx && fx.hpBp !== 0) maxHp = Math.trunc((maxHp * (BP + Math.min(caps.hpBp, fx.hpBp))) / BP);
  const healBp = fx && fx.healBp !== 0 ? BP + fx.healBp : BP;
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
    // Periodic abilities are ready at spawn; a summoner's first summon waits `firstTicks` (X0 M3).
    timers: r.def.abilities.map((_, i) => (r.summon && r.summon.slot === i ? ctx.tick + r.summon.firstTicks : 0)),
    lastDamageTick: NEVER,
    ci: r.idx,
    dmg: r.attacks.map((a) => scaleCenti(a.damage, lvl)),
    vsBase: r.attacks.map((a) => scaleCenti(a.vsBaseDamage, lvl)),
    innateMax,
    innateRegen: r.innate ? Math.trunc((r.innate.regenPerTick * lvl) / BP) : 0,
    healPool: r.heal ? Math.trunc((Math.trunc((r.heal.poolPerPulse * lvl) / BP) * healBp) / BP) : 0,
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
    cls: ctx.rules.research.classOfRole[r.def.role] ?? -1,
    picks: at.picks,
    fx,
    mail: at.mail,
    lastEngagedTick: NEVER,
    auraGuardBp: 0,
    auraCoverBp: 0,
    decayed: false,
    summons: [],
  };
  ctx.s.nextId += 1;
  ctx.s.units.push(u);
  // A squad member uses its share of the card's pop (X0 M1: pop ÷ count).
  if (!summoned) ctx.s.sides[side].pop += Math.trunc(r.pop / r.squad);
  const ev: Omit<SimEvent & { e: 'unitSpawned' }, 'tick'> = { e: 'unitSpawned', id: u.id, side, card, x: u.x, summoned, level: u.level };
  if (o.from !== undefined) ev.from = o.from;
  if (o.summoner !== undefined) ev.summoner = o.summoner;
  emit(ctx, ev);
  return u;
}

/**
 * Spawns a fort's twin (a wall, tower or camp, A16.14.2) as a scaffold at world x: max HP × the placing
 * loadout's multiplier (no card level, no unit or side modifier, no research), placed at
 * `scaffoldHpBp` of it; its pop is reserved now. `doneTick` is when the scaffold completes.
 */
export function spawnFort(ctx: Ctx, side: Side, card: CardId, pad: number, x: number, multBp: number, doneTick: number): UnitRt {
  const r = ctx.rules.units[card];
  const f = r?.fort;
  const fe = ctx.econ.fort;
  assert(r !== undefined && f !== null && f !== undefined && fe !== null, `not a fort twin: ${card}`);
  const maxHp = scaleCenti(r.hp, multBp);
  const hp = Math.max(1, Math.trunc((maxHp * fe.scaffoldHpBp) / BP));
  const kind = f.kind === 'trap' ? 'wall' : f.kind;
  const u: UnitRt = {
    id: ctx.s.nextId,
    side,
    card,
    level: 1,
    x,
    prevX: x,
    hp,
    maxHp,
    shield: 0,
    innateShield: 0,
    mode: 'hold',
    attacks: r.attacks.map(() => ({ targetId: NO_TARGET, impactTick: 0, nextAttackTick: 0, lastAttackTick: NEVER, retargetTick: 0, firstHit: false, bite: false })),
    statuses: [],
    air: false,
    summoned: false,
    timers: [],
    lastDamageTick: NEVER,
    ci: r.idx,
    dmg: r.attacks.map((a) => scaleCenti(a.damage, multBp)),
    vsBase: r.attacks.map(() => 0),
    innateMax: 0,
    innateRegen: 0,
    healPool: 0,
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
    cls: -1,
    picks: [],
    fx: null,
    mail: 0,
    lastEngagedTick: NEVER,
    auraGuardBp: 0,
    auraCoverBp: 0,
    decayed: false,
    summons: [],
    fort: {
      pad,
      kind,
      doneTick,
      done: false,
      decayFromTick: 0,
      campNextTick: 0,
      levyIds: [],
      multBp,
      silencedUntilTick: 0,
      lastEnemyHitTick: NEVER,
      lastEnemyHitBy: NO_TARGET,
    },
  };
  ctx.s.nextId += 1;
  ctx.s.units.push(u);
  ctx.s.sides[side].pop += r.pop;
  emit(ctx, { e: 'unitSpawned', id: u.id, side, card, x: u.x, summoned: false, level: u.level });
  return u;
}

/** A wall, tower or camp (a fort's twin, A16.14.8). */
export function isFort(u: UnitRt): boolean {
  return u.fort !== undefined;
}

/** A fort whose scaffold has completed: it blocks, fires and spawns (A16.14.2). */
export function fortDone(u: UnitRt): boolean {
  return u.fort !== undefined && u.fort.done;
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
