/**
 * Age Powers (DESIGN A2.9, A5.7): casting (from the `power` command) and B3 step 11 (telegraph
 * countdowns; due impacts collected).
 *
 * - Charge 0 → 100% over 50 s (economy step); casting needs 100% and resets it.
 * - Tap = auto-aim (the `densest` scan over p 150-1,850, `economy.powerZoneClamp`), or a given own-side p, clamped to that range.
 * - A 1.0 s telegraph is visible to both sides; then the effect plays out.
 * - Barrage impact i lands at telegraphEnd + floor(i × durationTicks / count) at
 *   x = zoneStart + (i + 0.5) × zone / count + jitter (sim RNG, 0 for line patterns); zoneStart is the zone
 *   edge nearer the caster's gate.
 * - Powers hit units only; Legendaries take 50%; kills pay 30% gold and no XP.
 * - Damage, heals and shields scale with the caster's loadout multiplier: the average level multiplier
 *   over the unit cards in the current age loadout. Paratroopers use the caster's Rifleman level.
 */
import type { Side } from '@/contracts';
import { BP, MILLI, PPM, randRange } from '@/core';
import { applyStatus, makeImpact } from '../damage';
import { emit } from '../events';
import { pOf, pointDist, xOf } from '../geometry';
import { levelBp, scaleCenti, type PowerRules } from '../rules';
import { cardLevel, loadoutOf, other, type CastRt, type Ctx, type Impact, type UnitRt } from '../state';
import { alive, spawnUnit, unitRules } from '../units';
import { densestP } from './targeting';
import { markPlayed } from './training';

/** Loadout multiplier in bp: the average level multiplier of the current loadout's unit cards (A2.9). */
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

/** The caster's frontmost ground unit p (own frame), or −1. */
function frontP(ctx: Ctx, side: Side): number {
  let best = -1;
  for (const u of ctx.s.units) {
    if (u.side !== side || !alive(u) || u.air) continue;
    const p = pOf(u.x, side);
    if (p > best) best = p;
  }
  return best;
}

/** Validates and starts a cast. Returns a rejection reason or null. */
export function castPower(ctx: Ctx, side: Side, aimP: number | undefined): string | null {
  const s = ctx.s.sides[side];
  if (s.powerPpm < PPM) return 'powerNotReady';
  const lo = loadoutOf(ctx, side);
  const pr = lo ? ctx.rules.powers[lo.power] : undefined;
  if (!pr) return 'noPower';
  const e = ctx.econ;
  const fx = pr.effect;
  let centreP: number;
  switch (fx.kind) {
    case 'barrage':
    case 'sweep':
    case 'cloud': {
      if (aimP !== undefined && Number.isFinite(aimP)) {
        centreP = Math.trunc(aimP * MILLI);
      } else {
        const hitsAir = fx.kind === 'cloud' ? true : fx.hitsAir;
        centreP = densestP(ctx, side, e.zoneMin, e.zoneMax, Math.trunc(pr.zone / 2), true, hitsAir) ?? e.midLane;
      }
      centreP = centreP < e.zoneMin ? e.zoneMin : centreP > e.zoneMax ? e.zoneMax : centreP;
      break;
    }
    case 'stampede': {
      const f = frontP(ctx, side);
      // From the frontmost own ground unit, or p = 200 without one (A5.7, `battle.stampedeFallbackP`).
      centreP = (f >= 0 ? f : e.stampedeFallbackP) + Math.trunc(fx.distance / 2);
      break;
    }
    case 'paradrop': {
      const f = frontP(ctx, other(side));
      if (f < 0) centreP = fx.fallbackP;
      else {
        // 150 lu beyond the enemy's frontmost ground unit, in the caster's frame, clamped to p ≤ 1,850 (the zone clamp).
        const land = pOf(xOf(f, other(side)), side) + fx.beyond;
        centreP = land > e.zoneMax ? e.zoneMax : land;
      }
      break;
    }
    case 'buffAll': {
      const f = frontP(ctx, side);
      centreP = f >= 0 ? f : e.spawnP;
      break;
    }
  }
  const castId = ctx.s.nextId;
  ctx.s.nextId += 1;
  const tele = ctx.tick + pr.telegraphTicks;
  const cast: CastRt = {
    castId,
    side,
    power: pr.id,
    startTick: ctx.tick,
    x: xOf(centreP, side),
    zone: pr.zone,
    nextIndex: 0,
    levelBp: fx.kind === 'paradrop' ? levelBp(e, cardLevel(ctx, side, fx.card)) : loadoutLevelBp(ctx, side),
    telegraphEnd: tele,
    endTick: tele + effectTicks(pr),
    hitIds: [],
    hitCounts: [],
    runnerHits: fx.kind === 'stampede' ? Array.from({ length: fx.runners }, () => []) : [],
    applied: false,
  };
  s.powerPpm = 0;
  ctx.s.casts.push(cast);
  markPlayed(s, pr.id);
  emit(ctx, { e: 'powerTelegraph', side, power: pr.id, castId, x: cast.x, zone: pr.zone });
  return null;
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
    default:
      return 0;
  }
}

function powerImpact(ctx: Ctx, c: CastRt, pr: PowerRules, dmgWhole: number): Impact {
  const imp = makeImpact(c.side, -1, pr.id);
  imp.sourceKind = 'power';
  imp.castId = c.castId;
  imp.dmgType = pr.dmgType;
  imp.dmg = scaleCenti(dmgWhole, c.levelBp);
  imp.power = true;
  imp.srcX = c.x;
  return imp;
}

/** B3 step 11: telegraph countdowns and due power impacts. */
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
        const imp = powerImpact(ctx, c, pr, fx.damage);
        imp.area = 'blast';
        imp.radius = fx.radius;
        imp.x = x;
        imp.hitsGround = true;
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
      for (const e of ctx.s.units) {
        if (e.side === c.side || !alive(e) || (e.air && !fx.hitsAir) || c.hitIds.includes(e.id)) continue;
        if (pointDist(beamX, e.x, unitRules(ctx, e).half) > fx.halfWidth) continue;
        c.hitIds.push(e.id);
        const imp = powerImpact(ctx, c, pr, fx.damage);
        imp.targetId = e.id;
        imp.x = e.x;
        imp.hitsAir = fx.hitsAir;
        ctx.impacts.push(imp);
      }
      return;
    }
    case 'stampede': {
      const startP = pOf(c.x, c.side) - Math.trunc(fx.distance / 2);
      for (let r = 0; r < fx.runners; r += 1) {
        const launch = c.telegraphEnd + r * fx.spacingTicks;
        if (tick < launch) break;
        const hi = Math.min(fx.distance, fx.step * (tick - launch));
        const lo = tick === launch ? 0 : Math.min(fx.distance, fx.step * (tick - 1 - launch));
        if (tick === launch) {
          emit(ctx, { e: 'powerImpact', side: c.side, power: c.power, castId: c.castId, x: xOf(startP, c.side), index: r });
        } else if (lo >= fx.distance) continue;
        const hits = c.runnerHits[r] as number[];
        for (const e of ctx.s.units) {
          if (e.side === c.side || !alive(e) || e.air || hits.includes(e.id)) continue;
          const ep = pOf(e.x, c.side);
          const half = unitRules(ctx, e).half;
          if (ep + half < startP + lo || ep - half > startP + hi) continue;
          const hi2 = c.hitIds.indexOf(e.id);
          const count = hi2 >= 0 ? (c.hitCounts[hi2] as number) : 0;
          if (count >= fx.maxHits) continue;
          if (hi2 >= 0) c.hitCounts[hi2] = count + 1;
          else {
            c.hitIds.push(e.id);
            c.hitCounts.push(1);
          }
          hits.push(e.id);
          const imp = powerImpact(ctx, c, pr, fx.damage);
          imp.targetId = e.id;
          imp.x = e.x;
          imp.kb = fx.knockback;
          ctx.impacts.push(imp);
        }
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
      for (const u of ctx.s.units) {
        if (u.side !== c.side || !alive(u)) continue;
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
