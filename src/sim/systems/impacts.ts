/**
 * B3 step 13, impact resolution (DESIGN A2.7 Impact resolution, A2.6 Area attacks).
 *
 * Every impact due this tick (melee, projectiles, powers, called strikes, Last Stand) was collected in
 * steps 8-12; they are applied here together, in collection order, through the damage pipeline. A
 * unit that dies this tick still delivers impacts already scheduled for this tick. Knockback and pulls
 * apply after all damage.
 *
 * Area rule: splash, cleave, chain, pierce, line, gate zone and follow-behind attacks deal 100% to the
 * primary and 50% to every other target, and hit at most 4 targets in total unless the card says
 * otherwise. Powers, Last Stand and death explosions (`blast`) are exempt.
 */
import { BP } from '@/core';
import { applyStatus, damageBase, dealDamage, isLeaping, unitDamage } from '../damage';
import { emit } from '../events';
import { centreDist, distFromGate, edgeDist, isAheadOrLevel, pOf, pointDist, xOf } from '../geometry';
import type { UnitRules } from '../rules';
import { BASE_TARGET, LANE, other, type Ctx, type Impact, type Knock, type UnitRt } from '../state';
import { alive, findUnit, unitRules } from '../units';
import { applyPowerStatus, castEligible, inCastArea } from './powers';
import { canHit } from './targeting';

export function impactSystem(ctx: Ctx): void {
  const list = ctx.impacts;
  for (let i = 0; i < list.length; i += 1) resolveImpact(ctx, list[i] as Impact);
  list.length = 0;
  applyKnocks(ctx);
}

/**
 * Can this impact hit that unit (enemy, alive, air/ground, leaping units dodge melee)? Forts only by
 * impacts that may touch them (A16.14.2: unit attacks, death explosions, called strikes).
 */
function hittable(ctx: Ctx, imp: Impact, e: UnitRt): boolean {
  if (e.side === imp.side || !alive(e)) return false;
  if (e.fort && !imp.forts) return false;
  if (imp.atk) return canHit(imp.atk, e);
  return e.air ? imp.hitsAir : imp.hitsGround;
}

interface Cand {
  u: UnitRt;
  d: number;
}

function byDist(a: Cand, b: Cand): number {
  return a.d - b.d || a.u.id - b.u.id;
}

/** Resolves one impact immediately (also used for death explosions in step 14). */
export function resolveImpact(ctx: Ctx, imp: Impact): void {
  if (imp.targetId === BASE_TARGET) {
    damageBase(ctx, other(imp.side), imp, imp.vsBase);
    return;
  }
  const a = imp.atk;
  switch (imp.area) {
    case 'single': {
      const t = findUnit(ctx, imp.targetId);
      if (t && hittable(ctx, imp, t)) hitUnit(ctx, imp, t, true);
      return;
    }
    case 'blast': {
      // Exempt from the area rule: full damage to everything within the radius (centre distance).
      const cast = imp.cast;
      const pr = cast ? ctx.rules.powers[cast.power] : undefined;
      if (cast && pr && pr.maxTargets > 0) {
        // A power blast (A2.9.5): only the cast's eligible units (its `hitIds` plus the first free cap
        // slots in cap order across the reach area), taken in cap order, and only while they are inside
        // the reach area (A2.9.4, the hard mask: a hit unit knocked past the Home line is not hit again).
        const elig = castEligible(ctx, cast, pr);
        const hits: Cand[] = [];
        for (const e of ctx.s.units) {
          if (!elig.has(e.id) || !hittable(ctx, imp, e) || !inCastArea(ctx, cast, pr, e)) continue;
          if (centreDist(imp.x, e.x) <= imp.radius) hits.push({ u: e, d: pOf(e.x, cast.side) });
        }
        hits.sort(byDist);
        for (const h of hits) {
          if (!cast.hitIds.includes(h.u.id)) cast.hitIds.push(h.u.id);
          hitUnit(ctx, imp, h.u, true);
        }
        return;
      }
      const hits: Cand[] = [];
      for (const e of ctx.s.units) {
        if (!hittable(ctx, imp, e)) continue;
        const d = centreDist(imp.x, e.x);
        if (d <= imp.radius) hits.push({ u: e, d });
      }
      hits.sort(byDist);
      for (const h of hits) hitUnit(ctx, imp, h.u, true);
      return;
    }
    case 'splash': {
      const cands: Cand[] = [];
      for (const e of ctx.s.units) {
        if (!hittable(ctx, imp, e)) continue;
        const d = centreDist(imp.x, e.x);
        if (d <= imp.radius) cands.push({ u: e, d });
      }
      cands.sort(byDist);
      // Melee splash (a unit target) keeps that target as the primary while it is inside the radius;
      // splash aimed at a point (projectiles, `targetId` 0) takes the enemy nearest the impact (A2.6).
      const aimed = imp.targetId > 0 ? cands.findIndex((c) => c.u.id === imp.targetId) : -1;
      if (aimed > 0) cands.unshift(cands.splice(aimed, 1)[0] as Cand);
      const max = a ? a.maxTargets : ctx.econ.areaMaxTargets;
      const pulled = a && a.pullRadius > 0;
      for (let i = 0; i < cands.length && i < max; i += 1) hitUnit(ctx, imp, (cands[i] as Cand).u, i === 0, !pulled);
      if (pulled && a) pullToCentre(ctx, imp);
      return;
    }
    case 'cleave':
    case 'pierce':
    case 'followBehind': {
      const t = findUnit(ctx, imp.targetId);
      if (!t || !hittable(ctx, imp, t)) return;
      const count = imp.area === 'followBehind' ? (a ? a.maxTargets : ctx.econ.areaMaxTargets) : a ? a.count : 1;
      const reach = a ? a.reach : 0;
      // "Behind" = away from the attacker, measured from the primary's centre (A2.6).
      const away = t.x > imp.srcX ? 1 : t.x < imp.srcX ? -1 : imp.side === 0 ? 1 : -1;
      const behind: Cand[] = [];
      for (const e of ctx.s.units) {
        // A fort can be a primary target, never a secondary hop (A16.14.2).
        if (e === t || e.fort || !hittable(ctx, imp, e)) continue;
        if (away > 0 ? e.x < t.x : e.x > t.x) continue;
        const d = pointDist(t.x, e.x, unitRules(ctx, e).half);
        if (d <= reach) behind.push({ u: e, d });
      }
      behind.sort(byDist);
      hitUnit(ctx, imp, t, true);
      for (let i = 0; i < behind.length && i < count - 1; i += 1) hitUnit(ctx, imp, (behind[i] as Cand).u, false);
      return;
    }
    case 'chain': {
      const t = findUnit(ctx, imp.targetId);
      if (!t || !hittable(ctx, imp, t)) return;
      const count = a ? a.count : 1;
      const hop = a ? a.reach : 0;
      const hit: UnitRt[] = [t];
      hitUnit(ctx, imp, t, true);
      let prev = t;
      while (hit.length < count) {
        const pr = unitRules(ctx, prev);
        let next: UnitRt | null = null;
        let nd = 0;
        for (const e of ctx.s.units) {
          if (hit.includes(e) || e.fort || !hittable(ctx, imp, e)) continue;
          const d = edgeDist(prev.x, pr.half, e.x, unitRules(ctx, e).half);
          if (d > hop) continue;
          if (!next || d < nd || (d === nd && e.id < next.id)) {
            next = e;
            nd = d;
          }
        }
        if (!next) break;
        hit.push(next);
        hitUnit(ctx, imp, next, false);
        prev = next;
      }
      return;
    }
    case 'line':
    case 'gateZone': {
      // Ground enemies within `reach` of the attacker's gate, nearest to the gate first (A5.2, A5.3).
      const reach = a ? a.reach : 0;
      const max = a ? a.maxTargets : ctx.econ.areaMaxTargets;
      const cands: Cand[] = [];
      for (const e of ctx.s.units) {
        if (!hittable(ctx, imp, e) || e.air) continue;
        const d = distFromGate(imp.side, e.x, unitRules(ctx, e).half);
        if (d <= reach) cands.push({ u: e, d });
      }
      cands.sort(byDist);
      for (let i = 0; i < cands.length && i < max; i += 1) hitUnit(ctx, imp, (cands[i] as Cand).u, i === 0);
      return;
    }
  }
}

/** Damage, on-hit statuses and queued displacements for one target of an impact. */
function hitUnit(ctx: Ctx, imp: Impact, t: UnitRt, primary: boolean, withOnHit = true): void {
  const { dmg, modBp } = unitDamage(ctx, imp, t, primary);
  dealDamage(ctx, imp, t, dmg, modBp);
  // A power's statuses land after its damage (fields, A2.9.7), on survivors only; a trap's likewise (A16.14.3).
  if (imp.powerStatuses && t.hp > 0) for (const st of imp.powerStatuses) applyPowerStatus(ctx, t, st);
  if (imp.trapStatuses && t.hp > 0) for (const st of imp.trapStatuses) applyStatus(ctx, t, st, imp.sourceId);
  const a = imp.atk;
  if (withOnHit && a && a.onHit.length > 0 && t.hp > 0) {
    for (const st of a.onHit) applyStatus(ctx, t, st, imp.sourceId);
  }
  const tr = unitRules(ctx, t);
  // Forts ignore knockback, pulls and drags (A16.14.2).
  if (t.fort) return;
  if (primary && imp.bonusKb !== 0 && !tr.brace) ctx.knocks.push({ id: t.id, dp: -imp.bonusKb, drag: false });
  if (imp.kb !== 0 && !t.air) ctx.knocks.push({ id: t.id, dp: -imp.kb, drag: false });
  if (primary && a && a.drag > 0) ctx.knocks.push({ id: t.id, dp: a.drag, drag: true });
}

/**
 * Gravity Well (A5.6): every ground enemy within the pull radius of the impact is pulled a fraction of
 * the way to the centre and receives the on-hit statuses (the slow).
 */
function pullToCentre(ctx: Ctx, imp: Impact): void {
  const a = imp.atk;
  if (!a) return;
  for (const e of ctx.s.units) {
    if (e.side === imp.side || !alive(e) || e.air || e.fort) continue;
    if (centreDist(imp.x, e.x) > a.pullRadius) continue;
    for (const st of a.onHit) applyStatus(ctx, e, st, imp.sourceId);
    const dx = Math.trunc(((imp.x - e.x) * a.pullFracBp) / BP);
    // In the target's p-frame.
    const dp = e.side === 0 ? dx : -dx;
    if (dp !== 0) ctx.knocks.push({ id: e.id, dp, drag: false });
  }
}

/** Applies queued knockbacks, pulls and drags after all damage (A2.7 Knockback and pulls). */
function applyKnocks(ctx: Ctx): void {
  const list = ctx.knocks;
  for (let i = 0; i < list.length; i += 1) applyKnock(ctx, list[i] as Knock);
  list.length = 0;
}

function applyKnock(ctx: Ctx, k: Knock): void {
  const u = findUnit(ctx, k.id);
  if (!u || !alive(u) || isLeaping(u) || u.fort) return;
  const r = unitRules(ctx, u);
  // p −= knockback × (100 − resist) / 100: Brace and air 100%, large and huge 50% (A2.7).
  let dp = Math.trunc((k.dp * (BP - r.kbResistBp)) / BP);
  if (dp === 0) return;
  const p0 = pOf(u.x, u.side);
  if (k.drag) dp = limitDrag(ctx, u, r, p0, dp);
  let p = p0 + dp;
  if (p < 0) p = 0;
  const pMax = LANE - r.half;
  if (p > pMax) p = pMax;
  if (p === p0) return;
  const fromX = u.x;
  u.x = xOf(p, u.side);
  for (const a of u.attacks) {
    a.impactTick = 0;
    a.firstHit = false;
  }
  emit(ctx, { e: 'knockback', id: u.id, fromX, toX: u.x });
}

/**
 * Toad drag (A5.2): toward the turret's gate (forward in the target's frame), stopping at the target's
 * frontmost ground ally and short of the dragging side's nearest ground unit.
 */
function limitDrag(ctx: Ctx, u: UnitRt, r: UnitRules, p0: number, dp: number): number {
  let maxP = p0 + dp;
  let allyFront = -1;
  for (const e of ctx.s.units) {
    if (e === u || !alive(e) || e.air) continue;
    const ep = pOf(e.x, u.side);
    if (e.side === u.side) {
      if (ep > allyFront) allyFront = ep;
    } else if (isAheadOrLevel(u.side, u.x, e.x)) {
      const limit = ep - unitRules(ctx, e).half - r.half;
      if (limit < maxP) maxP = limit;
    }
  }
  if (allyFront > p0 && allyFront < maxP) maxP = allyFront;
  const d = maxP - p0;
  return d > 0 ? d : 0;
}
