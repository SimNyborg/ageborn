/**
 * Forts (DESIGN A16.14, spec sections 2-3): placement (the `fort` command), scaffold completion, camps
 * and their levies, traps, field towers, the contact rule, decay (with the Siege switch) and the
 * Hardlight regen and Sandbag cover. Walls, towers and camps are units (their hidden twin cards) with
 * `UnitState.fort`; traps live in `SimState.traps`.
 *
 * Step order (B3, spec 2.8): placement is a command (step 1); scaffold completion, camp spawns and trap
 * arming and expiry run in the spawn step (5, after training); regen and cover with the statuses (6);
 * the contact set and tower shots with the unit attacks (8); trap charges after the turrets (9);
 * decay after the impacts (13), then deaths are resolved once (14).
 */
import type { Side, TrapState } from '@/contracts';
import {
  BP,
  MILLI,
  TICKS_PER_SECOND,
  coverLimitP,
  decayLoss,
  fortDenyReason,
  padDenyReason,
  padSafe,
  towerRangeOnPad,
  type FortPadRules,
  type FrontCandidate,
  type PadContext,
  type PadEnemy,
} from '@/core';
import { makeImpact } from '../damage';
import { emit } from '../events';
import { centreDist, edgeDist, isAheadOrLevel, pOf, xOf } from '../geometry';
import { scaleCenti, type FortRules, type UnitRules } from '../rules';
import { NEVER, NO_TARGET, slotFort, type Ctx, type UnitRt } from '../state';
import { alive, findUnit, spawnFort, spawnUnit, unitRules } from '../units';
import { loadoutLevelBp } from './powers';
import { fireProjectile } from './projectiles';
import { markPlayed } from './training';
import { unitSpeed } from './movement';
import { turretRange } from './targeting';

// ---------------------------------------------------------------------------------------------
// Counting and the pad context

/** What a side has on its pads now: forts alive (scaffolds and traps count), towers, a live camp, taken pads. */
export function fortCounts(ctx: Ctx, side: Side): { alive: number; towers: number; campAlive: boolean; taken: number[] } {
  let n = 0;
  let towers = 0;
  let camp = false;
  const taken: number[] = [];
  for (const u of ctx.s.units) {
    if (u.side !== side || !u.fort || !alive(u)) continue;
    n += 1;
    if (u.fort.kind === 'tower') towers += 1;
    if (u.fort.kind === 'camp') camp = true;
    taken.push(u.fort.pad);
  }
  for (const t of ctx.s.traps) {
    if (t.side !== side) continue;
    n += 1;
    taken.push(t.pad);
  }
  return { alive: n, towers, campAlive: camp, taken };
}

/** The pad context of a side for a fort card (own frame, mlu; core `fortPads`). */
export function padContext(ctx: Ctx, side: Side, fr: FortRules, taken: readonly number[]): PadContext {
  const enemies: PadEnemy[] = [];
  const own: FrontCandidate[] = [];
  for (const u of ctx.s.units) {
    if (!alive(u)) continue;
    const r = unitRules(ctx, u);
    const p = pOf(u.x, side);
    if (u.side === side) {
      own.push({ id: u.id, p, air: u.air, summoned: u.summoned, leaping: u.leapEnd > 0, structure: u.fort !== undefined });
    } else if (!u.fort) {
      // Enemy forts stand on their own pads, never within reach of ours; they never move. Current speed
      // (research, Charge with War Horns, speed buffs and slows) for a unit that moved last tick, card
      // speed for a standing one (A16.14.1 safe pad).
      const v = u.moved !== 0 ? unitSpeed(ctx, u, r) : r.speed;
      enemies.push({ id: u.id, p, half: r.half, air: u.air, speed: v * TICKS_PER_SECOND });
    }
  }
  return { cardPads: fr.pads, size: fr.def.size, taken, enemies, own };
}

/** The longest range among a side's built turrets (mlu, with research), or null with none (the cover limit, A16.14.2). */
export function longestTurretRange(ctx: Ctx, side: Side): number | null {
  let best: number | null = null;
  const s = ctx.s.sides[side];
  for (const t of s.turrets) {
    if (!t || t.state === 'selling') continue;
    const tr = ctx.rules.turrets[t.card];
    if (!tr) continue;
    const r = turretRange(ctx, side, tr.attack);
    if (best === null || r > best) best = r;
  }
  return best;
}

/** The side's safe-pad inputs, computed once per observation (the scaffold rules and the cover limit). */
export interface SafeInputs {
  rules: FortPadRules;
  cover: number | null;
}
export function safeInputs(ctx: Ctx, side: Side): SafeInputs | null {
  const f = ctx.econ.fort;
  if (!f) return null;
  return { rules: scaffoldRules(ctx, side) ?? f.pads, cover: coverLimitP(f.pads, longestTurretRange(ctx, side)) };
}

/** Is pad `i` safe for the side's Fort card now (AI and Key D, A16.14.2)? Pass `si` to reuse the inputs across pads. */
export function fortPadSafe(ctx: Ctx, side: Side, i: number, pc: PadContext, si: SafeInputs | null = safeInputs(ctx, side)): boolean {
  if (!si) return false;
  return padSafe(si.rules, i, pc, si.cover);
}

/** The side's scaffold time in ticks: Engineers (A16.14.5) or the economy's. */
export function scaffoldTicksOf(ctx: Ctx, side: Side): number {
  const f = ctx.econ.fort;
  const eng = ctx.s.sides[side].fx.fortScaffoldTicks;
  return eng > 0 ? eng : f ? f.pads.scaffoldTicks : 0;
}

function scaffoldRules(ctx: Ctx, side: Side): FortPadRules | null {
  const f = ctx.econ.fort;
  if (!f) return null;
  const ticks = scaffoldTicksOf(ctx, side);
  return ticks === f.pads.scaffoldTicks ? f.pads : { ...f.pads, scaffoldTicks: ticks };
}

/** The deny reason of pad `i` for the side's card now (`fortPadKind` ... `fortPadField`), or null. */
export function fortPadReason(ctx: Ctx, i: number, pc: PadContext): string | null {
  const f = ctx.econ.fort;
  return f ? padDenyReason(f.pads, i, pc) : 'fortPadKind';
}

/** A tower's range on its pad (A16.14.1 cover invariant): min(card range, 560 − pad − half-width), mlu. */
export function towerRangeOf(ctx: Ctx, u: UnitRt, r: UnitRules): number {
  const f = ctx.econ.fort;
  const a = r.attacks[0];
  if (!f || !a || !u.fort) return 0;
  const pad = f.pads.pads[u.fort.pad] ?? pOf(u.x, u.side);
  return towerRangeOnPad(a.range, pad, r.half, f.pads.towerReachMax);
}

// ---------------------------------------------------------------------------------------------
// Placement (the `fort` command, A16.14.2)

/** Validates and applies a `fort` command. Returns a rejection reason, or null when placed. */
export function placeFort(ctx: Ctx, side: Side, pad: unknown): string | null {
  const f = ctx.econ.fort;
  if (typeof pad !== 'number' || !Number.isInteger(pad) || pad < 0 || (f !== null && pad >= f.pads.pads.length)) return 'badCommand';
  const card = slotFort(ctx, side);
  const fr = card ? ctx.rules.forts[card] : undefined;
  if (!f || !card || !fr) return 'noFort';
  const s = ctx.s.sides[side];
  const counts = fortCounts(ctx, side);
  const pc = padContext(ctx, side, fr, counts.taken);
  const reason = fortDenyReason(f.pads, {
    pad,
    hasCard: true,
    siege: ctx.s.phase === 'siege',
    readyTicks: s.fortReadyTick - ctx.tick,
    kind: fr.kind,
    aliveForts: counts.alive,
    aliveTowers: counts.towers,
    campAlive: counts.campAlive,
    pop: s.pop,
    fortPop: fr.pop,
    popCap: ctx.econ.popCap,
    gold: s.gold,
    cost: fr.cost * MILLI,
    ctx: pc,
  });
  if (reason) return reason;
  // Accept: pay (never refunded), reserve pop, raise the scaffold (or lay the trap), restart the recharge.
  s.gold -= fr.cost * MILLI;
  const padP = f.pads.pads[pad] as number;
  const x = xOf(padP, side);
  const multBp = loadoutLevelBp(ctx, side);
  let id: number;
  if (fr.trap) {
    const t = fr.trap;
    id = ctx.s.nextId;
    ctx.s.nextId += 1;
    const armTick = ctx.tick + t.armTicks;
    const trap: TrapState = { id, side, card, pad, p: padP, armTick, untilTick: armTick + t.lifeTicks, charges: t.charges, nextTick: armTick, multBp };
    ctx.s.traps.push(trap);
    s.pop += fr.pop;
  } else {
    id = spawnFort(ctx, side, card, pad, x, multBp, ctx.tick + scaffoldTicksOf(ctx, side)).id;
  }
  s.fortReadyTick = ctx.tick + f.rechargeTicks;
  markPlayed(s, card);
  emit(ctx, { e: 'fortPlaced', side, id, card, pad, x, cost: fr.cost });
  return null;
}

// ---------------------------------------------------------------------------------------------
// Step 5: completion, camps, traps arming and expiry

/** B3 step 5 (after training): scaffolds complete, camps send levies, traps arm and expire (A16.14.2-A16.14.3). */
export function fortSpawnSystem(ctx: Ctx): void {
  const f = ctx.econ.fort;
  if (!f) return;
  const tick = ctx.tick;
  const siege = ctx.s.phase === 'siege';
  // Traps: expire when spent, at the end of their life, or when Siege starts; else arm on time.
  const traps = ctx.s.traps;
  let w = 0;
  for (let i = 0; i < traps.length; i += 1) {
    const t = traps[i] as TrapState;
    if (siege || t.charges <= 0 || tick >= t.untilTick) {
      const fr = ctx.rules.forts[t.card];
      ctx.s.sides[t.side].pop -= fr ? fr.pop : 0;
      emit(ctx, { e: 'trapExpired', id: t.id });
      continue;
    }
    if (tick === t.armTick) emit(ctx, { e: 'trapArmed', id: t.id });
    traps[w] = t;
    w += 1;
  }
  traps.length = w;
  // Walls, towers and camps, in id order (levies spawned here are appended and skipped this tick).
  const units = ctx.s.units;
  const n = units.length;
  for (let i = 0; i < n; i += 1) {
    const u = units[i] as UnitRt;
    const fs = u.fort;
    if (!fs || !alive(u)) continue;
    const r = unitRules(ctx, u);
    if (!fs.done && tick >= fs.doneTick) complete(ctx, u, r);
    if (fs.done && fs.kind === 'camp' && !siege) campSpawn(ctx, u, r);
  }
}

/** A scaffold completes (A16.14.2): the other half of its HP, blocking, towers armed, the decay clock, overlaps pushed out. */
function complete(ctx: Ctx, u: UnitRt, r: UnitRules): void {
  const f = ctx.econ.fort;
  const fs = u.fort;
  if (!f || !fs) return;
  const tick = ctx.tick;
  fs.done = true;
  const placed = Math.max(1, Math.trunc((u.maxHp * f.scaffoldHpBp) / BP));
  u.hp += u.maxHp - placed;
  if (u.hp > u.maxHp) u.hp = u.maxHp;
  // A scaffold that completes in Siege decays from its completion (spec 2.6).
  fs.decayFromTick = ctx.s.phase === 'siege' ? tick : tick + f.decayStartTicks;
  if (fs.kind === 'camp' && r.fort?.camp) fs.campNextTick = tick + r.fort.camp.firstTicks;
  const st = u.attacks[0];
  if (st) st.nextAttackTick = tick;
  // Enemy ground units overlapping it: past its centre (toward the owner's gate) keep going; the others
  // are set to its near edge. Own units are never moved.
  const fp = pOf(u.x, u.side);
  for (const e of ctx.s.units) {
    if (e.side === u.side || !alive(e) || e.air || e.fort || e.leapEnd > 0) continue;
    const er = unitRules(ctx, e);
    const d = centreDist(u.x, e.x);
    if (d >= r.half + er.half) continue;
    const ep = pOf(e.x, u.side);
    if (ep < fp) continue;
    const fromX = e.x;
    e.x = xOf(fp + r.half + er.half, u.side);
    if (e.x !== fromX) emit(ctx, { e: 'knockback', id: e.id, fromX, toX: e.x });
  }
  emit(ctx, { e: 'fortBuilt', id: u.id });
}

/**
 * A camp sends a levy (A16.14.3, spec 2.8): on the first tick at or after `campNextTick` with fewer than
 * `maxAlive` of its levies alive; the timer never banks a second spawn. Levies spawn exactly at the camp.
 */
function campSpawn(ctx: Ctx, u: UnitRt, r: UnitRules): void {
  const fs = u.fort;
  const camp = r.fort?.camp;
  if (!fs || !camp || ctx.tick < fs.campNextTick) return;
  fs.levyIds = fs.levyIds.filter((id) => {
    const l = findUnit(ctx, id);
    return l !== undefined && alive(l);
  });
  if (fs.levyIds.length >= camp.maxAlive || !ctx.rules.units[camp.spawn]) return;
  const levy = spawnUnit(ctx, u.side, camp.spawn, u.x, 1, true, { lvlBp: fs.multBp, from: u.id });
  fs.levyIds.push(levy.id);
  fs.campNextTick = ctx.tick + camp.everyTicks;
}

// ---------------------------------------------------------------------------------------------
// Step 6: Hardlight regen and Sandbag cover

/**
 * B3 step 6 (after the unit statuses): the Hardlight Barrier regenerates 1% of max HP per second after
 * 3 s without damage, only between completion and the start of its decay and never in Siege; the Sandbag
 * Bunker gives own ground units within 60 lu behind it −20% from attacks with range ≥ 100 (A16.14.3).
 */
export function fortStatusSystem(ctx: Ctx): void {
  const f = ctx.econ.fort;
  if (!f) return;
  const tick = ctx.tick;
  const units = ctx.s.units;
  for (const u of units) u.auraCoverBp = 0;
  for (const src of units) {
    const fs = src.fort;
    if (!fs || !fs.done || !alive(src)) continue;
    const fr = unitRules(ctx, src).fort;
    if (!fr) continue;
    if (fr.regen && ctx.s.phase !== 'siege' && tick < fs.decayFromTick && src.hp < src.maxHp) {
      const onGrid = (tick - fs.doneTick) % TICKS_PER_SECOND === 0;
      if (onGrid && tick - src.lastDamageTick >= fr.regen.delayTicks) {
        const add = decayLoss(src.maxHp, fr.regen.bpPerStep);
        const a = src.hp + add > src.maxHp ? src.maxHp - src.hp : add;
        if (a > 0) {
          src.hp += a;
          emit(ctx, { e: 'healed', id: src.id, amount: a });
        }
      }
    }
    if (fr.cover) {
      const sp = pOf(src.x, src.side);
      const half = unitRules(ctx, src).half;
      for (const u of units) {
        if (u.side !== src.side || u.fort || u.air || !alive(u)) continue;
        const up = pOf(u.x, u.side);
        if (up > sp) continue;
        const ur = unitRules(ctx, u);
        if (edgeDist(src.x, half, u.x, ur.half) > fr.cover.behind) continue;
        if (fr.cover.bp > u.auraCoverBp) u.auraCoverBp = fr.cover.bp;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Step 8: the contact rule and field towers

/** Scratch lists for `pickContacts` (reused every tick; never part of the state). */
const FRONT: { u: UnitRt; d: number }[] = [];
const BEHIND: { u: UnitRt; d: number }[] = [];
const byDist = (a: { u: UnitRt; d: number }, b: { u: UnitRt; d: number }): number => a.d - b.d || a.u.id - b.u.id;

/**
 * The contact rule (A16.14.2), a hard cap on short-range attackers: while a completed fort blocks the
 * enemy front, at most `contactMax` enemy ground units may attack it with an attack of compiled range
 * < 100. The set is the blocked front rank first (the units that stand at it: within their attack-0
 * range, nearest first), then the others whose centre is within `contactLu` behind the blocked front
 * unit, nearest first, ties to the lower id. Members may hit it with attack 0 as if in range; every
 * other short-range attacker may not target it at all (targeting reads the set). Re-picked every tick;
 * a unit is in at most one fort's set (forts in id order). Attacks with range ≥ 100 are never capped
 * (they pick forts last and deal ×0.5).
 */
export function pickContacts(ctx: Ctx): void {
  const c = ctx.contact;
  c.clear();
  const f = ctx.econ.fort;
  if (!f) return;
  const units = ctx.s.units;
  for (const fort of units) {
    if (!fort.fort || !fort.fort.done || !alive(fort)) continue;
    const fr = unitRules(ctx, fort);
    FRONT.length = 0;
    BEHIND.length = 0;
    for (const e of units) {
      if (e.side === fort.side || !alive(e) || e.air || e.fort || e.leapEnd > 0 || c.has(e.id)) continue;
      if (!isAheadOrLevel(e.side, e.x, fort.x)) continue;
      const er = unitRules(ctx, e);
      const reach = er.attacks[0]?.range ?? 0;
      if (reach >= f.rangedMin) continue;
      const d = edgeDist(e.x, er.half, fort.x, fr.half);
      if (d <= reach) FRONT.push({ u: e, d });
      else BEHIND.push({ u: e, d: pOf(e.x, e.side) });
    }
    if (FRONT.length === 0) continue;
    FRONT.sort(byDist);
    const lead = FRONT[0] as { u: UnitRt };
    const leadP = pOf(lead.u.x, lead.u.side);
    let n = 0;
    for (const x of FRONT) {
      if (n >= f.contactMax) break;
      c.set(x.u.id, fort.id);
      n += 1;
    }
    if (n >= f.contactMax) continue;
    let w = 0;
    for (const x of BEHIND) {
      const p = x.d;
      if (p > leadP || leadP - p > f.contact) continue;
      BEHIND[w] = { u: x.u, d: leadP - p };
      w += 1;
    }
    BEHIND.length = w;
    BEHIND.sort(byDist);
    for (const x of BEHIND) {
      if (n >= f.contactMax) break;
      c.set(x.u.id, fort.id);
      n += 1;
    }
  }
  FRONT.length = 0;
  BEHIND.length = 0;
}

/**
 * A field tower's shot (A16.14.3): a stationary archer with a 0% windup (the renderer plays the 200 ms
 * anticipation from `nextAttackTick`). It picks afresh every shot: the nearest enemy unit in range
 * (edge distance from the tower, ties the lower id), never a base or a fort; silenced by Suppress; no
 * shots while a scaffold. Damage ×0.5 in Siege (the turret rule, via the impact's `turret` flag).
 */
export function towerFire(ctx: Ctx, u: UnitRt, r: UnitRules): void {
  const fs = u.fort;
  const st = u.attacks[0];
  const a = r.attacks[0];
  if (!fs || !fs.done || !st || !a || ctx.tick < st.nextAttackTick || ctx.tick < fs.silencedUntilTick) return;
  const range = towerRangeOf(ctx, u, r);
  let best: UnitRt | null = null;
  let bestD = 0;
  for (const e of ctx.s.units) {
    if (e.side === u.side || !alive(e) || e.fort) continue;
    if (e.air ? !a.hitsAir : !a.hitsGround) continue;
    const d = edgeDist(u.x, r.half, e.x, unitRules(ctx, e).half);
    if (d > range || d < a.minRange) continue;
    if (!best || d < bestD || (d === bestD && e.id < best.id)) {
      best = e;
      bestD = d;
    }
  }
  if (!best) {
    st.targetId = NO_TARGET;
    return;
  }
  st.targetId = best.id;
  st.lastAttackTick = ctx.tick;
  st.nextAttackTick = ctx.tick + a.intervalTicks;
  emit(ctx, { e: 'attackStarted', id: u.id, targetId: best.id, windupTicks: 0, attackIndex: 0 });
  fireProjectile(ctx, {
    side: u.side,
    sourceId: u.id,
    sourceCard: u.card,
    sourceKind: 'unit',
    owner: 'unit',
    ri: r.idx,
    a,
    attackIndex: 0,
    targetId: best.id,
    fromX: u.x,
    toX: best.x,
    dmg: u.dmg[0] ?? 0,
    vsBase: 0,
    dmgBuffBp: 0,
    mount: -1,
    tower: true,
  });
}

// ---------------------------------------------------------------------------------------------
// Step 9: traps

/**
 * Trap charges (A16.14.3, spec 2.8): an armed trap fires on the enemy ground unit whose centre is nearest
 * its centre within `triggerLu` (ties the lower id), at most once per `betweenMs`; the charge hits that
 * unit plus its area by the A2.6 rule (at most 4 targets, secondaries 50%), then applies its statuses.
 * Air, forts and leaping units never trigger it; nothing fires in Siege (traps expire when it starts).
 */
export function trapSystem(ctx: Ctx): void {
  if (!ctx.econ.fort || ctx.s.traps.length === 0 || ctx.s.phase === 'siege') return;
  const tick = ctx.tick;
  for (const t of ctx.s.traps) {
    if (tick < t.armTick || tick < t.nextTick || t.charges <= 0) continue;
    const fr = ctx.rules.forts[t.card];
    const tr = fr?.trap;
    if (!tr) continue;
    const x = xOf(t.p, t.side);
    let prim: UnitRt | null = null;
    let pd = 0;
    for (const e of ctx.s.units) {
      if (e.side === t.side || !alive(e) || e.air || e.fort || e.leapEnd > 0) continue;
      const d = centreDist(x, e.x);
      if (d > tr.trigger) continue;
      if (!prim || d < pd || (d === pd && e.id < prim.id)) {
        prim = e;
        pd = d;
      }
    }
    if (!prim) continue;
    const imp = makeImpact(t.side, t.id, t.card);
    imp.sourceKind = 'ability';
    imp.dmgType = tr.radius > 0 ? 'blast' : 'pierce';
    imp.dmg = scaleCenti(tr.damage, t.multBp);
    imp.targetId = prim.id;
    imp.x = tr.radius > 0 ? x : prim.x;
    imp.area = tr.radius > 0 ? 'splash' : 'single';
    imp.radius = tr.radius;
    imp.hitsGround = true;
    imp.hitsAir = false;
    imp.srcX = x;
    imp.trapStatuses = tr.statuses;
    ctx.impacts.push(imp);
    const charge = tr.charges - t.charges;
    t.charges -= 1;
    t.nextTick = tick + tr.betweenTicks;
    emit(ctx, { e: 'trapTriggered', id: t.id, charge, x });
  }
}

// ---------------------------------------------------------------------------------------------
// Step 13: decay

/**
 * Decay (A16.14.2, spec 2.6), after the impacts: from `decayStartMs` after completion a fort loses 1% of
 * max HP every 20 ticks (from its own `decayFromTick`); once Siege starts every completed fort loses 2%
 * every 20 ticks counted from the Siege start (a fort completed in Siege: from its completion). Each
 * loss is rounded up, so a fort never outlives its budget. A fort whose decay would reach 0 is removed
 * by the death step with `fortDecayed`: its bounty goes to the enemy that hit it in the last 3 s, else
 * to nobody.
 */
export function fortDecaySystem(ctx: Ctx): void {
  const f = ctx.econ.fort;
  if (!f) return;
  const tick = ctx.tick;
  const siege = ctx.s.phase === 'siege' && ctx.siegeTick !== null;
  for (const u of ctx.s.units) {
    const fs = u.fort;
    if (!fs || !fs.done || u.hp <= 0 || u.mode === 'dying') continue;
    let anchor = fs.decayFromTick;
    let bp = f.decayBpPerStep;
    if (siege) {
      const start = ctx.siegeTick as number;
      anchor = fs.doneTick > start ? fs.doneTick : start;
      if (fs.decayFromTick !== anchor) fs.decayFromTick = anchor;
      bp = Math.trunc((f.decayBpPerStep * f.siegeDecayBp) / BP);
    }
    if (tick <= anchor || (tick - anchor) % TICKS_PER_SECOND !== 0) continue;
    const loss = decayLoss(u.maxHp, bp);
    if (u.hp > loss) {
      u.hp -= loss;
      continue;
    }
    u.hp = 0;
    u.decayed = true;
    const credited = fs.lastEnemyHitTick !== NEVER && tick - fs.lastEnemyHitTick <= f.creditTicks && u.lastHitSide !== u.side && u.lastHitKind !== null;
    if (!credited) {
      u.lastHitKind = 'decay';
      u.lastHitSide = u.side;
      u.lastHitId = NO_TARGET;
      u.lastHitCard = '';
      u.lastHitCast = null;
    }
  }
}
