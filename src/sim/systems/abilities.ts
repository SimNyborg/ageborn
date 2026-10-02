/**
 * B3 step 7, timed abilities (DESIGN A2.7 Heal and Periodic abilities, A5 per-card abilities).
 *
 * - Heals pulse every 0.5 s on a shared 10-tick grid. A healer's pool is split equally over up to N
 *   damaged allies within its radius, lowest HP bp first (ties to the lower id); overflow is lost. A unit
 *   receives only the single largest heal offered to it per pulse, so healers never stack.
 * - Periodic abilities (Roar, called strikes, EMP, Time Stop, pounce) are ready at spawn, fire on the
 *   first tick their condition holds, and their cooldown runs from the fire tick.
 * Stunned or leaping units use no abilities. "Allies" never include the source itself.
 */
import { BP } from '@/core';
import { applyStatus, cancelWindups, healUnit, isLeaping, isStunned } from '../damage';
import { emit } from '../events';
import { centreDist, edgeDist, isAheadOrLevel } from '../geometry';
import { TAG, levelBp, type StatusRules, type UnitRules } from '../rules';
import { NO_TARGET, type Ctx, type UnitRt } from '../state';
import { alive, findUnit, spawnUnit, unitRules } from '../units';
import { fireProjectile } from './projectiles';
import { targetInRange } from './targeting';

export function abilitySystem(ctx: Ctx): void {
  if (ctx.tick % ctx.econ.healPulseTicks === 0) healPulse(ctx);
  const units = ctx.s.units;
  const n = units.length;
  for (let i = 0; i < n; i += 1) {
    const u = units[i] as UnitRt;
    if (!alive(u) || isStunned(u) || isLeaping(u)) continue;
    const r = unitRules(ctx, u);
    if (r.roar) roar(ctx, u, r, r.roar);
    if (r.strike) callStrike(ctx, u, r, r.strike);
    if (r.emp) emp(ctx, u, r, r.emp);
    if (r.timeStop) timeStop(ctx, u, r, r.timeStop);
    if (r.pounce) pounce(ctx, u, r, r.pounce);
    if (r.summon) summon(ctx, u, r.summon);
  }
}

// ---------------------------------------------------------------------------------------------
// Heals

function healPulse(ctx: Ctx): void {
  const units = ctx.s.units;
  // best[i] = largest heal offered to units[i] this pulse
  let best: number[] | null = null;
  for (let i = 0; i < units.length; i += 1) {
    const h = units[i] as UnitRt;
    if (h.healPool <= 0 || !alive(h) || isStunned(h) || isLeaping(h)) continue;
    const hr = unitRules(ctx, h);
    if (!hr.heal) continue;
    const picks: number[] = [];
    for (let j = 0; j < units.length; j += 1) {
      const t = units[j] as UnitRt;
      // Nothing heals a fort (A16.14.2).
      if (t === h || t.side !== h.side || !alive(t) || t.fort || t.hp >= t.maxHp) continue;
      const tr = ctx.rules.unitList[t.ci] as UnitRules;
      if (edgeDist(h.x, hr.half, t.x, tr.half) > hr.heal.radius) continue;
      picks.push(j);
    }
    if (picks.length === 0) continue;
    // Lowest HP bp first, ties to the lower id (index order = id order).
    picks.sort((a, b) => {
      const ua = units[a] as UnitRt;
      const ub = units[b] as UnitRt;
      const d = Math.trunc((ua.hp * BP) / ua.maxHp) - Math.trunc((ub.hp * BP) / ub.maxHp);
      return d !== 0 ? d : ua.id - ub.id;
    });
    const k = Math.min(hr.heal.targets, picks.length);
    const share = Math.trunc(h.healPool / k);
    if (share <= 0) continue;
    if (!best) best = new Array<number>(units.length).fill(0);
    for (let q = 0; q < k; q += 1) {
      const j = picks[q] as number;
      if (share > (best[j] as number)) best[j] = share;
    }
  }
  if (!best) return;
  for (let j = 0; j < units.length; j += 1) {
    const amt = best[j] as number;
    if (amt > 0) healUnit(ctx, units[j] as UnitRt, amt);
  }
}

// ---------------------------------------------------------------------------------------------
// Periodic abilities

function ready(ctx: Ctx, u: UnitRt, slot: number): boolean {
  return ctx.tick >= (u.timers[slot] ?? 0);
}

/** Enemies (optionally ground only) within `radius` edge distance of u; never forts (they ignore EMP and Time Stop, A16.14.2). */
function enemiesWithin(ctx: Ctx, u: UnitRt, r: UnitRules, radius: number, groundOnly: boolean): UnitRt[] {
  const out: UnitRt[] = [];
  for (const e of ctx.s.units) {
    if (e.side === u.side || !alive(e) || e.fort || (groundOnly && e.air)) continue;
    if (edgeDist(u.x, r.half, e.x, unitRules(ctx, e).half) <= radius) out.push(e);
  }
  return out;
}

function anyEnemyWithin(ctx: Ctx, u: UnitRt, r: UnitRules, radius: number): boolean {
  for (const e of ctx.s.units) {
    if (e.side === u.side || !alive(e) || e.fort) continue;
    if (edgeDist(u.x, r.half, e.x, unitRules(ctx, e).half) <= radius) return true;
  }
  return false;
}

/** Ursa Roar (A5.3): every 15 s while it has a target, the nearest 8 allies within 200 lu get a shield. */
function roar(ctx: Ctx, u: UnitRt, r: UnitRules, ab: NonNullable<UnitRules['roar']>): void {
  if (!ready(ctx, u, ab.slot) || !targetInRange(ctx, u, r, 0)) return;
  const allies: { u: UnitRt; d: number }[] = [];
  for (const t of ctx.s.units) {
    if (t === u || t.side !== u.side || !alive(t) || t.fort) continue;
    const d = edgeDist(u.x, r.half, t.x, unitRules(ctx, t).half);
    if (d <= ab.radius) allies.push({ u: t, d });
  }
  u.timers[ab.slot] = ctx.tick + ab.every;
  emit(ctx, { e: 'abilityUsed', id: u.id, ability: 'periodicShieldAura', x: u.x });
  allies.sort((p, q) => p.d - q.d || p.u.id - q.u.id);
  let amount = Math.trunc((ab.shield * 100 * lvl(ctx, u)) / BP);
  // Field Care (A18.5.2): heals and shields of a Support spawned after it +20%.
  if (u.fx && u.fx.healBp !== 0) amount = Math.trunc((amount * (BP + u.fx.healBp)) / BP);
  const st: StatusRules = { kind: 'shield', magnitudeBp: 0, ticks: ab.ticks, amount, frozen: false };
  for (let i = 0; i < allies.length && i < ab.maxTargets; i += 1) applyStatus(ctx, (allies[i] as { u: UnitRt }).u, st, u.id, amount);
}

function lvl(ctx: Ctx, u: UnitRt): number {
  return levelBp(ctx.econ, u.level);
}

/**
 * Radio Operator (A5.5): every 8 s calls a shell on the nearest enemy ground unit within 400 lu; it
 * lands after 1.0 s as a 120 splash r50 under the area rule. One call-in per side per 3 s.
 */
function callStrike(ctx: Ctx, u: UnitRt, r: UnitRules, ab: NonNullable<UnitRules['strike']>): void {
  if (!ready(ctx, u, ab.slot)) return;
  const side = ctx.s.sides[u.side];
  if (ctx.tick < side.callStrikeReadyTick) return;
  // Units first; a fort only when no enemy unit is eligible (A16.14.2).
  let best: UnitRt | null = null;
  let bestD = 0;
  for (const e of ctx.s.units) {
    if (e.side === u.side || !alive(e) || e.air) continue;
    const d = edgeDist(u.x, r.half, e.x, unitRules(ctx, e).half);
    if (d > ab.search) continue;
    const better = !best || (best.fort !== undefined && e.fort === undefined) || ((best.fort !== undefined) === (e.fort !== undefined) && (d < bestD || (d === bestD && e.id < best.id)));
    if (better) {
      best = e;
      bestD = d;
    }
  }
  if (!best) return;
  u.timers[ab.slot] = ctx.tick + ab.every;
  side.callStrikeReadyTick = ctx.tick + ab.lockout;
  emit(ctx, { e: 'abilityUsed', id: u.id, ability: 'callStrike', x: best.x });
  const dmg = Math.trunc((ab.damage * 100 * lvl(ctx, u)) / BP);
  fireProjectile(ctx, {
    side: u.side,
    sourceId: u.id,
    sourceCard: u.card,
    sourceKind: 'ability',
    owner: 'unit',
    ri: r.idx,
    a: null,
    attackIndex: 0,
    targetId: NO_TARGET,
    fromX: best.x,
    toX: best.x,
    dmg,
    vsBase: 0,
    dmgBuffBp: 0,
    mount: -1,
    kind: 'strike',
    travelTicks: ab.delay,
    visualId: 'proj.shell',
  });
}

/**
 * EMP Saboteur (A5.6): every 8 s when an enemy is within 120 lu, strips temporary and innate shields
 * from every enemy within 120 lu (restarting their regen delay) and stuns mech enemies there, air
 * included, for 1.5 s.
 */
function emp(ctx: Ctx, u: UnitRt, r: UnitRules, ab: NonNullable<UnitRules['emp']>): void {
  if (!ready(ctx, u, ab.slot) || !anyEnemyWithin(ctx, u, r, ab.trigger)) return;
  u.timers[ab.slot] = ctx.tick + ab.every;
  emit(ctx, { e: 'abilityUsed', id: u.id, ability: 'emp', x: u.x });
  const stun: StatusRules = { kind: 'stun', magnitudeBp: BP, ticks: ab.stunTicks, amount: 0, frozen: false };
  for (const e of enemiesWithin(ctx, u, r, ab.radius, false)) {
    e.shield = 0;
    e.innateShield = 0;
    e.statuses = e.statuses.filter((s) => s.kind !== 'shield');
    e.lastDamageTick = ctx.tick;
    if ((unitRules(ctx, e).tags & TAG.mech) !== 0) applyStatus(ctx, e, stun, u.id);
  }
}

/**
 * Chrono Titan Time Stop (A5.6): when an enemy first comes within 200 lu and every 15 s after, every
 * enemy within 200 lu (air included) is frozen 1.5 s (Legendaries 0.75 s).
 */
function timeStop(ctx: Ctx, u: UnitRt, r: UnitRules, ab: NonNullable<UnitRules['timeStop']>): void {
  if (!ready(ctx, u, ab.slot) || !anyEnemyWithin(ctx, u, r, ab.radius)) return;
  u.timers[ab.slot] = ctx.tick + ab.every;
  emit(ctx, { e: 'abilityUsed', id: u.id, ability: 'timeStop', x: u.x });
  for (const e of enemiesWithin(ctx, u, r, ab.radius, false)) {
    const legendary = unitRules(ctx, e).legendary;
    applyStatus(
      ctx,
      e,
      { kind: 'stun', magnitudeBp: BP, ticks: legendary ? ab.legendaryFreeze : ab.freeze, amount: 0, frozen: ab.frozen },
      u.id,
    );
  }
}

/**
 * Sabertooth Pounce (A5.2): when blocked by an enemy ground unit (one within attack range ahead), leap
 * (0.5 s, untargetable by melee) to the nearest enemy ranged or support ground unit within 150 lu beyond
 * the blocker, landing at the target's centre − (wT + wS)/2 on the near side; the first bite deals ×2.
 * No target: no leap and no cooldown.
 */
function pounce(ctx: Ctx, u: UnitRt, r: UnitRules, ab: NonNullable<UnitRules['pounce']>): void {
  if (!ready(ctx, u, ab.slot)) return;
  const a0 = r.attacks[0];
  if (!a0) return;
  // The blocker: nearest enemy ground unit ahead within attack range.
  let blocker: UnitRt | null = null;
  let bd = 0;
  for (const e of ctx.s.units) {
    if (e.side === u.side || !alive(e) || e.air || !isAheadOrLevel(u.side, u.x, e.x)) continue;
    const d = edgeDist(u.x, r.half, e.x, unitRules(ctx, e).half);
    if (d > a0.range) continue;
    if (!blocker || d < bd || (d === bd && e.id < blocker.id)) {
      blocker = e;
      bd = d;
    }
  }
  if (!blocker) return;
  let target: UnitRt | null = null;
  let td = 0;
  for (const e of ctx.s.units) {
    if (e === blocker || e.side === u.side || !alive(e) || e.air) continue;
    const er = unitRules(ctx, e);
    if ((er.tags & (TAG.ranged | TAG.support)) === 0) continue;
    if (!isAheadOrLevel(u.side, blocker.x, e.x) || centreDist(blocker.x, e.x) > ab.search) continue;
    const d = edgeDist(u.x, r.half, e.x, er.half);
    if (!target || d < td || (d === td && e.id < target.id)) {
      target = e;
      td = d;
    }
  }
  if (!target) return;
  const tr = unitRules(ctx, target);
  const dir = u.side === 0 ? 1 : -1;
  const landing = target.x - dir * (tr.half + r.half);
  u.timers[ab.slot] = ctx.tick + ab.cooldown;
  cancelWindups(u);
  u.leapFrom = u.x;
  u.leapTo = landing;
  u.leapStart = ctx.tick;
  u.leapEnd = ctx.tick + ab.leapTicks;
  u.mode = 'leap';
  const st = u.attacks[0];
  if (st) {
    st.targetId = target.id;
    st.bite = true;
    st.retargetTick = u.leapEnd + ctx.econ.retargetTicks;
  }
  emit(ctx, { e: 'abilityUsed', id: u.id, ability: 'pounce', x: landing });
}

/**
 * Summoner (X0 M3, the camp levy rules on a moving unit): on the first tick at or after its timer with
 * fewer than `maxAlive` of its summons alive, a summon appears at the summoner's position at the
 * summoner's level; the timer then restarts and never banks a second summon. Stunned or leaping
 * summoners wait (the system skips them); live summons stay when the summoner dies.
 */
function summon(ctx: Ctx, u: UnitRt, ab: NonNullable<UnitRules['summon']>): void {
  if (!ready(ctx, u, ab.slot) || !ctx.rules.units[ab.card]) return;
  if (u.summons.length > 0) {
    u.summons = u.summons.filter((id) => {
      const s = findUnit(ctx, id);
      return s !== undefined && alive(s);
    });
  }
  if (u.summons.length >= ab.maxAlive) return;
  const s = spawnUnit(ctx, u.side, ab.card, u.x, u.level, true, { summoner: u.id });
  u.summons.push(s.id);
  u.timers[ab.slot] = ctx.tick + ab.everyTicks;
  emit(ctx, { e: 'abilityUsed', id: u.id, ability: 'summon', x: u.x });
}
