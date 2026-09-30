/**
 * Age Powers (DESIGN A2.9): casting (the `power` command), reload (B3 step 3, via `economy.ts`) and
 * B3 step 11 (telegraph countdowns; due effects collected).
 *
 * - Two typed slots per age loadout, Home and Field (A2.9.1). Each slot reloads on its own in ppm with
 *   an exact integer remainder (A2.9.3, `core/powerReach.ts`).
 * - A cast costs gold, paid in full on acceptance; no refund (A2.9.2). Validation order (A2.9.7):
 *   `badCommand`, `noPower`, `powerReloading`, `powerLockout`, `powerOutOfReach`, `powerNoTarget`, `noGold`.
 * - Reach (A2.9.4): Home powers aim in [150, 1,000 − zone/2] and touch only enemies with own-frame
 *   p ≤ 1,000; Front powers aim up to F + 150 (F never below 480) and touch up to the band max + zone/2;
 *   strikes lock one enemy anywhere; drops, buffs, charges and Suppress have no aim. A given `p` is
 *   clamped into the band; no `p` = auto-aim (the capped-value scan); a damage or control power whose
 *   auto-aim finds nothing eligible is rejected before payment.
 * - The cap and the screen (A2.9.5): one cast affects at most `maxTargets` distinct enemies, and only
 *   the first ones in cap order (nearest the caster's gate) across the whole reach area are eligible.
 *   The cast keeps `hitIds`; barrage blasts pick at impact resolution (step 13, `impacts.ts`), sweeps,
 *   charges, fields and strikes when they select targets here.
 * - Buffs affect the caster's 8 frontmost units (A2.9.5); the cloud's ally bonus is capped in `status.ts`.
 * - Powers hit units only; Legendaries take 50% damage and 50% of a power's control; Epics take 50% from
 *   strikes; kills pay 30% gold and no XP (A2.9.6, `deaths.ts`).
 * - Damage, heals and shields scale with the caster's loadout multiplier: the average level multiplier
 *   over the unit cards in the current age loadout; a drop uses the dropped card's level.
 * - Barrage impact i lands at telegraphEnd + floor(i × durationTicks / count) at
 *   x = zoneStart + (i + 0.5) × zone / count + jitter (sim RNG, 0 for line patterns); zoneStart is the
 *   zone edge nearer the caster's gate.
 */
import type { PowerSlot, Side } from '@/contracts';
import {
  BP,
  LANE_MLU,
  MILLI,
  PPM,
  autoAim,
  capCompare,
  clampToBand,
  effectiveCost,
  eligibleIds,
  frontP,
  isPowerSlot,
  randRange,
  reachAreaMax,
  reachBand,
  slotIndex,
  strikePick,
  strikeRank,
  suppressLegal,
  type CapCandidate,
  type FrontCandidate,
  type StrikeCandidate,
} from '@/core';
import { applyStatus, makeImpact } from '../damage';
import { emit } from '../events';
import { centreDist, pOf, pointDist, xOf } from '../geometry';
import { levelBp, scaleCenti, type PowerRules, type StatusRules } from '../rules';
import { cardLevel, loadoutOf, other, slotPower, type CastRt, type Ctx, type Impact, type UnitRt } from '../state';
import { alive, findUnit, spawnUnit, unitRules } from '../units';
import { markPlayed } from './training';

/** Loadout multiplier in bp: the average level multiplier of the current loadout's unit cards (A2.9.6). */
export function loadoutLevelBp(ctx: Ctx, side: Side): number {
  const lo = loadoutOf(ctx, side);
  let sum = 0;
  let n = 0;
  for (const c of lo?.units ?? []) {
    if (!c || !ctx.rules.units[c]) continue;
    sum += levelBp(ctx.econ, cardLevel(ctx, side, c));
    n += 1;
  }
  return n > 0 ? Math.trunc(sum / n) : BP;
}

/** The side's frontmost ground unit p (own frame, any unit), or −1: where drops land beyond (A5.7). */
function frontmostGround(ctx: Ctx, side: Side): number {
  let best = -1;
  for (const u of ctx.s.units) {
    if (u.side !== side || !alive(u) || u.air) continue;
    const p = pOf(u.x, side);
    if (p > best) best = p;
  }
  return best;
}

/** The front F of a side (A2.9.4), own-frame mlu, or null: trained, surfaced, landed ground units only. */
export function powerFront(ctx: Ctx, side: Side): number | null {
  const own: FrontCandidate[] = [];
  for (const u of ctx.s.units) {
    if (u.side !== side || !alive(u)) continue;
    own.push({ id: u.id, p: pOf(u.x, side), air: u.air, summoned: u.summoned, leaping: u.leapEnd > 0, structure: u.fort !== undefined });
  }
  return frontP(own, ctx.rules.econ.power.reach.frontRank);
}

/**
 * The effective price of a power for a side, whole gold (A2.9.2): Power Hour and research discounts
 * multiply, truncated.
 */
export function powerCost(ctx: Ctx, side: Side, pr: PowerRules): number {
  return effectiveCost(pr.cost, [ctx.mods.powerCostBp, ctx.s.sides[side].fx.powerCostBp]);
}

/** Reload rate of a side's slots in bp (A2.9.3): 10,000 + research + modifier bonuses, × the Overdrive lever. */
export function powerRateBp(ctx: Ctx, side: Side): number {
  let rate = BP + ctx.s.sides[side].fx.powerReloadBp + ctx.mods.powerReloadBp;
  const hot = ctx.s.phase === 'overdrive' || ctx.s.phase === 'siege';
  if (hot && ctx.econ.overdrive.powerBp !== BP) rate = Math.trunc((rate * ctx.econ.overdrive.powerBp) / BP);
  return rate > 0 ? rate : 1;
}

/** Reload length of a slot in ticks: the equipped power's, or `economy.power.emptyReloadMs` when empty. */
export function slotReloadTicks(ctx: Ctx, side: Side, slot: PowerSlot): number {
  const id = slotPower(ctx, side, slot);
  const pr = id ? ctx.rules.powers[id] : undefined;
  return pr ? pr.reloadTicks : ctx.econ.power.emptyReloadTicks;
}

/** Can this power touch that enemy (alive, air or ground as the effect says)? Never a fort (A16.14.2); burrow comes later. */
function hittableBy(e: UnitRt, side: Side, hitsAir: boolean, hitsGround: boolean): boolean {
  if (e.side === side || !alive(e) || e.fort) return false;
  return e.air ? hitsAir : hitsGround;
}

/** What an effect may touch (A2.9.6: every power states air and ground). */
function effectTargets(pr: PowerRules): { air: boolean; ground: boolean } {
  const fx = pr.effect;
  switch (fx.kind) {
    case 'barrage':
      return { air: fx.hitsAir, ground: fx.hitsGround };
    case 'sweep':
    case 'field':
    case 'strike':
      return { air: fx.hitsAir, ground: true };
    case 'stampede':
      return { air: false, ground: true };
    default:
      return { air: true, ground: true };
  }
}

/**
 * The hittable enemies in a cast's reach area (A2.9.4 hard mask), own-frame p (mlu). Charges use the
 * run: a body overlapping [areaMin, areaMax]; everything else the centre.
 */
function areaCandidates(ctx: Ctx, c: CastRt, pr: PowerRules): { u: UnitRt; cand: CapCandidate }[] {
  const t = effectTargets(pr);
  const byBody = pr.effect.kind === 'stampede';
  const out: { u: UnitRt; cand: CapCandidate }[] = [];
  for (const e of ctx.s.units) {
    if (!hittableBy(e, c.side, t.air, t.ground)) continue;
    const p = pOf(e.x, c.side);
    if (byBody) {
      const half = unitRules(ctx, e).half;
      if (p + half < c.areaMin || p - half > c.areaMax) continue;
    } else if (p < c.areaMin || p > c.areaMax) continue;
    // Levies rank last in every cap (A16.14.3, A2.9.5 amended): they never take a slot while another unit qualifies.
    out.push({ u: e, cand: unitRules(ctx, e).levy ? { id: e.id, p, capRank: 1 } : { id: e.id, p } });
  }
  return out;
}

/**
 * Is the unit inside the cast's reach area now (A2.9.4, the hard mask)? Checked at every hit, so a unit
 * in `hitIds` that has moved past the area (knockback, a pull, Fall back) is no longer touched: staying
 * eligible for the cap never overrides the mask.
 */
export function inCastArea(ctx: Ctx, c: CastRt, pr: PowerRules, e: UnitRt): boolean {
  const p = pOf(e.x, c.side);
  if (pr.effect.kind === 'stampede') {
    const half = unitRules(ctx, e).half;
    return p + half >= c.areaMin && p - half <= c.areaMax;
  }
  return p >= c.areaMin && p <= c.areaMax;
}

/** The eligible set of a cast now (A2.9.5): its `hitIds` plus the first free cap slots in cap order. */
export function castEligible(ctx: Ctx, c: CastRt, pr: PowerRules): Set<number> {
  const cands = areaCandidates(ctx, c, pr).map((x) => x.cand);
  return eligibleIds(cands, pr.maxTargets > 0 ? pr.maxTargets : cands.length, c.hitIds);
}

/** Validates and starts a cast (A2.9.7). Returns a rejection reason or null. */
export function castPower(ctx: Ctx, side: Side, slot: unknown, aimP: unknown): string | null {
  if (!isPowerSlot(slot)) return 'badCommand';
  if (aimP !== undefined && (typeof aimP !== 'number' || !Number.isFinite(aimP))) return 'badCommand';
  const s = ctx.s.sides[side];
  const si = slotIndex(slot);
  const id = slotPower(ctx, side, slot);
  const pr = id ? ctx.rules.powers[id] : undefined;
  if (!pr) return 'noPower';
  if (s.powerPpm[si] < PPM) return 'powerReloading';
  if (ctx.tick < s.powerLockoutUntil) return 'powerLockout';
  const e = ctx.econ;
  const r = e.power.reach;
  const fx = pr.effect;
  const front = powerFront(ctx, side);
  if (fx.kind === 'suppress' && !suppressLegal(front, r)) return 'powerOutOfReach';

  // Where the cast lands and the reach area (own-frame mlu).
  let centreP = r.zoneMin;
  let areaMin = 0;
  let areaMax = r.lane;
  let targetId = -1;
  const band = reachBand(pr.reach, pr.zone, front, r);
  switch (fx.kind) {
    case 'barrage':
    case 'sweep':
    case 'field':
    case 'cloud': {
      const b = band ?? [r.zoneMin, r.zoneMax];
      areaMax = reachAreaMax(pr.reach, pr.zone, b, r);
      if (aimP !== undefined) {
        centreP = clampToBand(Math.trunc((aimP as number) * MILLI), b);
      } else {
        const probe = probeCast(side, pr, areaMin, areaMax);
        const cands = areaCandidates(ctx, probe, pr);
        const elig = fx.kind === 'cloud' ? null : eligibleIds(cands.map((x) => x.cand), pr.maxTargets > 0 ? pr.maxTargets : cands.length, []);
        const scored = cands.filter((x) => !elig || elig.has(x.u.id)).map((x) => ({ p: x.cand.p, value: unitRules(ctx, x.u).cost }));
        const aim = autoAim(b, pr.zone, scored, r.scanStep);
        if (aim.score <= 0 && pr.harmful) return 'powerNoTarget';
        // Nothing to aim at (a cloud): just in front of your army, as far as the band allows.
        centreP = aim.score > 0 ? aim.p : b[1];
      }
      break;
    }
    case 'stampede': {
      // From F, or p = 200 without one (A2.9.4, `battle.stampedeFallbackP`); the run is the reach area.
      const start = front !== null ? front : e.stampedeFallbackP;
      areaMin = start;
      areaMax = start + fx.distance;
      centreP = start + Math.trunc(fx.distance / 2);
      break;
    }
    case 'strike': {
      const cands = strikeCandidates(ctx, side, pr);
      if (aimP !== undefined) {
        const aim = clampToBand(Math.trunc((aimP as number) * MILLI), [r.zoneMin, r.zoneMax]);
        const pick = strikePick(cands, aim, r.strikePick);
        if (pick === null) return 'powerNoTarget';
        targetId = pick;
      } else {
        const total = scaleCenti(fx.damage * fx.shots, loadoutLevelBp(ctx, side));
        const best = strikeRank(cands, total, e.power.strikeEpicBp, e.legendaryPowerDamageBp)[0];
        if (!best) return 'powerNoTarget';
        targetId = best.id;
      }
      const t = findUnit(ctx, targetId);
      centreP = t ? pOf(t.x, side) : r.zoneMin;
      break;
    }
    case 'paradrop': {
      const f = frontmostGround(ctx, other(side));
      if (f < 0) centreP = fx.fallbackP;
      else {
        // 150 lu beyond the enemy's frontmost ground unit, in the caster's frame, clamped to p ≤ 1,850.
        const land = pOf(xOf(f, other(side)), side) + fx.beyond;
        centreP = land > r.zoneMax ? r.zoneMax : land;
      }
      break;
    }
    case 'buffAll': {
      centreP = front !== null ? front : e.spawnP;
      break;
    }
    case 'suppress': {
      // No aim: the jam lands on the enemy wall (the telegraph marks every enemy mount).
      centreP = LANE_MLU - r.turretRangeCap;
      break;
    }
  }

  const cost = powerCost(ctx, side, pr);
  if (s.gold < cost * MILLI) return 'noGold';

  // Accept: pay, reset the slot, start the cast.
  s.gold -= cost * MILLI;
  s.powerPpm[si] = 0;
  s.powerRem[si] = 0;
  if (e.power.lockTicks > 0) s.powerLockoutUntil = ctx.tick + e.power.lockTicks;
  const castId = ctx.s.nextId;
  ctx.s.nextId += 1;
  const tele = ctx.tick + pr.telegraphTicks;
  const cast: CastRt = {
    castId,
    side,
    slot,
    power: pr.id,
    startTick: ctx.tick,
    x: xOf(centreP, side),
    zone: pr.zone,
    nextIndex: 0,
    levelBp: fx.kind === 'paradrop' ? levelBp(e, cardLevel(ctx, side, fx.card)) : loadoutLevelBp(ctx, side),
    targetId,
    telegraphEnd: tele,
    endTick: tele + effectTicks(pr),
    cost,
    areaMin,
    areaMax,
    hitIds: [],
    hitCounts: [],
    runnerHits: fx.kind === 'stampede' ? Array.from({ length: fx.runners }, () => []) : [],
    applied: false,
  };
  ctx.s.casts.push(cast);
  markPlayed(s, pr.id);
  emit(ctx, {
    e: 'powerTelegraph',
    side,
    slot,
    power: pr.id,
    castId,
    x: cast.x,
    zone: pr.zone,
    cost,
    targetId,
    telegraphMs: pr.def.telegraphMs,
  });
  return null;
}

/** A throwaway cast shell for the auto-aim scan (no hits yet). */
function probeCast(side: Side, pr: PowerRules, areaMin: number, areaMax: number): CastRt {
  return {
    castId: 0,
    side,
    slot: pr.slot,
    power: pr.id,
    startTick: 0,
    x: 0,
    zone: pr.zone,
    nextIndex: 0,
    levelBp: BP,
    targetId: -1,
    telegraphEnd: 0,
    endTick: 0,
    cost: 0,
    areaMin,
    areaMax,
    hitIds: [],
    hitCounts: [],
    runnerHits: [],
    applied: false,
  };
}

/** Every enemy a strike may lock (A2.9.7): hittable, anywhere on the lane. */
function strikeCandidates(ctx: Ctx, side: Side, pr: PowerRules): StrikeCandidate[] {
  const t = effectTargets(pr);
  const out: StrikeCandidate[] = [];
  for (const e of ctx.s.units) {
    if (!hittableBy(e, side, t.air, t.ground)) continue;
    const ur = unitRules(ctx, e);
    out.push({
      id: e.id,
      p: pOf(e.x, side),
      cost: ur.cost,
      hp: e.hp + e.shield + e.innateShield,
      epic: ur.def.rarity === 'epic',
      legendary: ur.legendary,
    });
  }
  return out;
}

/** Ticks from the telegraph end to the last tick of the effect. */
function effectTicks(pr: PowerRules): number {
  const fx = pr.effect;
  switch (fx.kind) {
    case 'barrage':
    case 'sweep':
    case 'cloud':
      return fx.durationTicks;
    case 'stampede':
      return (fx.runners - 1) * fx.spacingTicks + Math.trunc((fx.distance + fx.step - 1) / fx.step);
    case 'field':
      return (fx.pulses - 1) * FIELD_PULSE_TICKS;
    case 'strike':
      return (fx.shots - 1) * fx.intervalTicks;
    default:
      return 0;
  }
}

/** Field pulses are 10 ticks (0.5 s) apart (A2.9.7). */
export const FIELD_PULSE_TICKS = 10;

function powerImpact(c: CastRt, pr: PowerRules, dmgWhole: number): Impact {
  const imp = makeImpact(c.side, -1, pr.id);
  imp.sourceKind = 'power';
  imp.castId = c.castId;
  imp.cast = c;
  imp.dmgType = pr.dmgType;
  imp.dmg = scaleCenti(dmgWhole, c.levelBp);
  imp.power = true;
  imp.srcX = c.x;
  return imp;
}

/**
 * A power's status on an enemy (A2.9.6): Legendaries keep `economy.power.legendaryControlBp` of a stun,
 * snare, slow or mark's duration.
 */
export function applyPowerStatus(ctx: Ctx, u: UnitRt, st: StatusRules): void {
  const control = st.kind === 'stun' || st.kind === 'snare' || st.kind === 'slow' || st.kind === 'mark';
  if (control && unitRules(ctx, u).legendary) {
    const ticks = Math.trunc((st.ticks * ctx.econ.power.legendaryControlBp) / BP);
    if (ticks <= 0) return;
    applyStatus(ctx, u, { ...st, ticks }, -1);
    return;
  }
  applyStatus(ctx, u, st, -1);
}

/** B3 step 11: telegraph countdowns and due power effects. */
export function powerSystem(ctx: Ctx): void {
  const casts = ctx.s.casts;
  let w = 0;
  for (let i = 0; i < casts.length; i += 1) {
    const c = casts[i] as CastRt;
    const pr = ctx.rules.powers[c.power];
    if (pr && ctx.tick >= c.telegraphEnd) runCast(ctx, c, pr);
    if (pr && ctx.tick < c.endTick) {
      casts[w] = c;
      w += 1;
    }
  }
  casts.length = w;
}

/** A unit in cap order (A2.9.5): own-frame p of the caster; levies rank last (`capRank` 1, A16.14.3). */
function capCand(ctx: Ctx, e: UnitRt, side: Side): CapCandidate {
  const p = pOf(e.x, side);
  return unitRules(ctx, e).levy ? { id: e.id, p, capRank: 1 } : { id: e.id, p };
}

/** Adds a unit to the cast's `hitIds` once. */
function markHit(c: CastRt, id: number): void {
  if (!c.hitIds.includes(id)) c.hitIds.push(id);
}

function runCast(ctx: Ctx, c: CastRt, pr: PowerRules): void {
  const fx = pr.effect;
  const tick = ctx.tick;
  const k = tick - c.telegraphEnd;
  const zoneStartP = pOf(c.x, c.side) - Math.trunc(c.zone / 2);
  switch (fx.kind) {
    case 'barrage': {
      while (c.nextIndex < fx.count && c.telegraphEnd + Math.trunc((c.nextIndex * fx.durationTicks) / fx.count) <= tick) {
        const idx = c.nextIndex;
        const jitter = fx.jitter > 0 ? randRange(ctx.s.rng, -fx.jitter, fx.jitter) : 0;
        const p = zoneStartP + Math.trunc(((2 * idx + 1) * fx.zone) / (2 * fx.count)) + jitter;
        const x = xOf(p, c.side);
        emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x, index: idx });
        // The blast picks its eligible targets at resolution (step 13, `impacts.ts`).
        const imp = powerImpact(c, pr, fx.damage);
        imp.area = 'blast';
        imp.radius = fx.radius;
        imp.x = x;
        imp.hitsGround = fx.hitsGround;
        imp.hitsAir = fx.hitsAir;
        ctx.impacts.push(imp);
        c.nextIndex += 1;
      }
      return;
    }
    case 'sweep': {
      if (k > fx.durationTicks) return;
      const beamP = zoneStartP + Math.trunc((fx.zone * k) / fx.durationTicks);
      const beamX = xOf(beamP, c.side);
      emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x: beamX, index: k });
      const elig = castEligible(ctx, c, pr);
      const touched: { u: UnitRt; cand: CapCandidate }[] = [];
      for (const e of ctx.s.units) {
        if (!elig.has(e.id) || c.hitIds.includes(e.id) || !hittableBy(e, c.side, fx.hitsAir, true) || !inCastArea(ctx, c, pr, e)) continue;
        if (pointDist(beamX, e.x, unitRules(ctx, e).half) > fx.halfWidth) continue;
        touched.push({ u: e, cand: capCand(ctx, e, c.side) });
      }
      touched.sort((a, b) => capCompare(a.cand, b.cand));
      for (const { u } of touched) {
        markHit(c, u.id);
        const imp = powerImpact(c, pr, fx.damage);
        imp.targetId = u.id;
        imp.x = u.x;
        imp.hitsAir = fx.hitsAir;
        ctx.impacts.push(imp);
      }
      return;
    }
    case 'stampede': {
      const startP = c.areaMin;
      let elig: Set<number> | null = null;
      for (let r = 0; r < fx.runners; r += 1) {
        const launch = c.telegraphEnd + r * fx.spacingTicks;
        if (tick < launch) break;
        const hi = Math.min(fx.distance, fx.step * (tick - launch));
        const lo = tick === launch ? 0 : Math.min(fx.distance, fx.step * (tick - 1 - launch));
        if (tick === launch) {
          emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x: xOf(startP, c.side), index: r });
        } else if (lo >= fx.distance) continue;
        if (!elig) elig = castEligible(ctx, c, pr);
        const hits = c.runnerHits[r] as number[];
        const touched: { u: UnitRt; cand: CapCandidate }[] = [];
        for (const e of ctx.s.units) {
          if (!elig.has(e.id) || e.side === c.side || !alive(e) || e.air || e.fort || hits.includes(e.id) || !inCastArea(ctx, c, pr, e)) continue;
          const ep = pOf(e.x, c.side);
          const half = unitRules(ctx, e).half;
          if (ep + half < startP + lo || ep - half > startP + hi) continue;
          touched.push({ u: e, cand: capCand(ctx, e, c.side) });
        }
        touched.sort((a, b) => capCompare(a.cand, b.cand));
        for (const { u: e } of touched) {
          const hi2 = c.hitIds.indexOf(e.id);
          const count = hi2 >= 0 ? (c.hitCounts[hi2] as number) : 0;
          if (count >= fx.maxHits) continue;
          if (hi2 >= 0) c.hitCounts[hi2] = count + 1;
          else {
            c.hitIds.push(e.id);
            c.hitCounts.push(1);
          }
          hits.push(e.id);
          const imp = powerImpact(c, pr, fx.damage);
          imp.targetId = e.id;
          imp.x = e.x;
          imp.kb = fx.knockback;
          ctx.impacts.push(imp);
        }
      }
      return;
    }
    case 'field': {
      // Pulse k lands at telegraphEnd + 10k (A2.9.7).
      if (k < 0 || k % FIELD_PULSE_TICKS !== 0) return;
      const pulse = Math.trunc(k / FIELD_PULSE_TICKS);
      if (pulse >= fx.pulses) return;
      c.nextIndex = pulse + 1;
      emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x: c.x, index: pulse });
      const elig = castEligible(ctx, c, pr);
      const touched: { u: UnitRt; cand: CapCandidate }[] = [];
      for (const e of ctx.s.units) {
        if (!elig.has(e.id) || !hittableBy(e, c.side, fx.hitsAir, true) || !inCastArea(ctx, c, pr, e)) continue;
        if (centreDist(c.x, e.x) > fx.halfZone) continue;
        touched.push({ u: e, cand: capCand(ctx, e, c.side) });
      }
      touched.sort((a, b) => capCompare(a.cand, b.cand));
      for (const { u } of touched) {
        markHit(c, u.id);
        if (fx.damage > 0) {
          // 1. damage, then 2. statuses (after the damage, in step 13).
          const imp = powerImpact(c, pr, fx.damage);
          imp.targetId = u.id;
          imp.x = u.x;
          imp.hitsAir = fx.hitsAir;
          imp.powerStatuses = fx.statuses;
          ctx.impacts.push(imp);
        } else {
          for (const st of fx.statuses) applyPowerStatus(ctx, u, st);
        }
        // 3. the first pulse pulls toward the centre (knockback resist applies; air is immune).
        if (pulse === 0 && fx.pullBp > 0 && !u.air) {
          let pull = Math.trunc(((c.x - u.x) * fx.pullBp) / BP);
          if (unitRules(ctx, u).legendary) pull = Math.trunc((pull * ctx.econ.power.legendaryControlBp) / BP);
          const dp = u.side === 0 ? pull : -pull;
          if (dp !== 0) ctx.knocks.push({ id: u.id, dp, drag: false });
        }
      }
      return;
    }
    case 'strike': {
      // Shot i lands at telegraphEnd + i × interval on the locked unit, if it is still alive and
      // hittable (homing, no miss); otherwise it fizzles (A2.9.7).
      while (c.nextIndex < fx.shots && c.telegraphEnd + c.nextIndex * fx.intervalTicks <= tick) {
        const idx = c.nextIndex;
        c.nextIndex += 1;
        const t = findUnit(ctx, c.targetId);
        const x = t ? t.x : c.x;
        emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x, index: idx });
        if (!t || !hittableBy(t, c.side, fx.hitsAir, true)) continue;
        markHit(c, t.id);
        const imp = powerImpact(c, pr, fx.damage);
        imp.targetId = t.id;
        imp.x = t.x;
        imp.hitsAir = fx.hitsAir;
        imp.strike = true;
        ctx.impacts.push(imp);
      }
      return;
    }
    case 'suppress': {
      if (c.applied) return;
      c.applied = true;
      emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x: c.x, index: 0 });
      // Every enemy mount (built or empty, a boss's extra mount and a marked turret included) starts no
      // turret attack until then; the silence belongs to the mount (A2.9.7).
      const foe = other(c.side);
      const fs = ctx.s.sides[foe];
      const until = tick + fx.ticks;
      for (let m = 0; m < fs.mountSilencedUntil.length; m += 1) {
        if ((fs.mountSilencedUntil[m] ?? 0) < until) fs.mountSilencedUntil[m] = until;
        emit(ctx, { e: 'turretSilenced', side: foe, mount: m, untilTick: fs.mountSilencedUntil[m] as number });
      }
      // Suppress silences the enemy's field towers too (A16.14.3), scaffolds included.
      for (const u of ctx.s.units) {
        if (u.side !== foe || !u.fort || u.fort.kind !== 'tower' || !alive(u)) continue;
        if (u.fort.silencedUntilTick < until) u.fort.silencedUntilTick = until;
        emit(ctx, { e: 'towerSilenced', side: foe, id: u.id, untilTick: u.fort.silencedUntilTick });
      }
      return;
    }
    case 'cloud': {
      if (k === 0) emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x: c.x, index: 0 });
      return;
    }
    case 'buffAll': {
      if (c.applied) return;
      c.applied = true;
      emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x: c.x, index: 0 });
      // The caster's frontmost units (highest own-frame p, ties the lower id), air and summons included, never
      // forts, levies last (A2.9.5, A16.14.3).
      const own = ctx.s.units.filter((u) => u.side === c.side && alive(u) && !u.fort);
      const rank = (u: UnitRt): number => (unitRules(ctx, u).levy ? 1 : 0);
      own.sort((a, b) => rank(a) - rank(b) || pOf(b.x, c.side) - pOf(a.x, c.side) || a.id - b.id);
      const n = own.length < fx.maxTargets ? own.length : fx.maxTargets;
      for (let i = 0; i < n; i += 1) {
        const u = own[i] as UnitRt;
        c.hitIds.push(u.id);
        for (const st of fx.statuses) applyStatus(ctx, u, st, -1, buffAmount(u, st.kind, st.magnitudeBp, st.amount, c.levelBp));
      }
      return;
    }
    case 'paradrop': {
      if (c.applied) return;
      c.applied = true;
      emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x: c.x, index: 0 });
      const level = cardLevel(ctx, c.side, fx.card);
      for (let n = 0; n < fx.count; n += 1) spawnUnit(ctx, c.side, fx.card, c.x, level, true);
      return;
    }
  }
}

/**
 * The pool of a buff status: shields are `amount` × the loadout multiplier; regen heals
 * `magnitudeBp` of the unit's max HP over its duration (already proportional, so not scaled again).
 */
function buffAmount(u: UnitRt, kind: string, magnitudeBp: number, amount: number, lvlBp: number): number {
  if (kind === 'shield') return scaleCenti(amount, lvlBp);
  if (kind === 'regen') return Math.trunc((u.maxHp * magnitudeBp) / BP);
  return 0;
}
