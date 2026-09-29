/**
 * Projectiles (DESIGN A2.7 Projectiles; B3 step 10).
 *
 * Travel ticks = ceil(distance / speed / 0.05); instant effects impact on the next tick. Single-target
 * projectiles home and never miss (they hit if the target is alive on the impact tick). Splash
 * projectiles aim at the target's x at fire time and hit whatever is within the radius at impact.
 * Smoke Screen misses are rolled at fire time with the sim RNG (A5.7).
 */
import type { CardId, KillerKind, Side } from '@/contracts';
import { BP, chanceBp } from '@/core';
import { makeImpact } from '../damage';
import { emit } from '../events';
import { centreDist } from '../geometry';
import type { AttackRules, UnitRules } from '../rules';
import { BASE_TARGET, NO_TARGET, type Ctx, type ProjectileRt } from '../state';
import { alive, findUnit } from '../units';

export interface FireOpts {
  side: Side;
  sourceId: number;
  sourceCard: CardId;
  sourceKind: KillerKind;
  owner: 'unit' | 'turret';
  ri: number;
  /** The attack fired; null for called strikes (which pass `travelTicks` and `visualId`). */
  a: AttackRules | null;
  attackIndex: number;
  targetId: number;
  fromX: number;
  toX: number;
  dmg: number;
  vsBase: number;
  dmgBuffBp: number;
  mount: number;
  kind?: 'attack' | 'strike';
  /** Fixed travel time (called strikes); otherwise from distance and speed. */
  travelTicks?: number;
  visualId?: string;
  /** First-hit bonus carried by a ranged attack (A17.15: Harpoon Gunner's Reel In); default ×1.0, no knockback. */
  bonusBp?: number;
  bonusKb?: number;
  /** Research of the source unit (A18.5.2): extra damage against tags, and its Troops class. */
  vsTags?: number;
  vsBp?: number;
  srcCls?: number;
}

/** Travel time in ticks for a distance (mlu) at a speed (lu/s): ceil(d × 20 / (speed × 1,000)), min 1. */
export function travelTicks(distance: number, speed: number, instant: boolean): number {
  if (instant || speed <= 0) return 1;
  const den = speed * 1000;
  const t = Math.trunc((distance * 20 + den - 1) / den);
  return t < 1 ? 1 : t;
}

/** Is x inside an active Smoke Screen cast by `side`? */
function inCloudOf(ctx: Ctx, side: Side, x: number): number {
  for (const c of ctx.s.casts) {
    if (c.side !== side || ctx.tick < c.telegraphEnd || ctx.tick > c.endTick) continue;
    const pr = ctx.rules.powers[c.power];
    if (!pr || pr.effect.kind !== 'cloud') continue;
    if (centreDist(c.x, x) <= pr.effect.halfWidth) return pr.effect.missBp;
  }
  return 0;
}

/** Spawns a projectile (or an instant effect) and emits `projectileFired`. */
export function fireProjectile(ctx: Ctx, o: FireOpts): ProjectileRt {
  const kind = o.kind ?? 'attack';
  const a = o.a;
  const travel = o.travelTicks ?? (a ? travelTicks(centreDist(o.fromX, o.toX), a.speed, a.instant || a.melee) : 1);
  // Smoke Screen (A5.7): enemy ranged and turret attacks fired from or into the cloud miss 50%.
  let miss = false;
  if (kind === 'attack') {
    const foe: Side = o.side === 0 ? 1 : 0;
    const missBp = Math.max(inCloudOf(ctx, foe, o.fromX), inCloudOf(ctx, foe, o.toX));
    if (missBp > 0) miss = chanceBp(ctx.s.rng, missBp);
  }
  const p: ProjectileRt = {
    pid: ctx.s.nextId,
    side: o.side,
    sourceId: o.sourceId,
    sourceCard: o.sourceCard,
    targetId: o.targetId,
    x: o.fromX,
    toX: o.toX,
    impactTick: ctx.tick + travel,
    attackIndex: o.attackIndex,
    visualId: o.visualId ?? a?.visualId ?? '',
    kind,
    sourceKind: o.sourceKind,
    owner: o.owner,
    ri: o.ri,
    dmg: o.dmg,
    vsBase: o.vsBase,
    dmgBuffBp: o.dmgBuffBp,
    miss,
    fromX: o.fromX,
    startTick: ctx.tick,
    mount: o.mount,
    bonusBp: o.bonusBp ?? BP,
    bonusKb: o.bonusKb ?? 0,
    vsTags: o.vsTags ?? 0,
    vsBp: o.vsBp ?? 0,
    srcCls: o.srcCls ?? -1,
  };
  ctx.s.nextId += 1;
  ctx.s.projectiles.push(p);
  emit(ctx, {
    e: 'projectileFired',
    pid: p.pid,
    from: o.sourceId,
    targetId: o.targetId,
    toX: o.toX,
    travelTicks: travel,
    visualId: p.visualId,
  });
  return p;
}

function attackOf(ctx: Ctx, p: ProjectileRt): AttackRules | null {
  if (p.owner === 'turret') return ctx.rules.turretList[p.ri]?.attack ?? null;
  const r = ctx.rules.unitList[p.ri] as UnitRules | undefined;
  return r?.attacks[p.attackIndex] ?? null;
}

/** B3 step 10: advance projectiles; arrivals add impacts. */
export function projectileSystem(ctx: Ctx): void {
  const list = ctx.s.projectiles;
  let w = 0;
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i] as ProjectileRt;
    if (ctx.tick < p.impactTick) {
      // Homing projectiles follow their target; others fly to the aim point.
      const a = attackOf(ctx, p);
      if (a && a.area !== 'splash' && p.targetId > 0 && p.kind === 'attack') {
        const t = findUnit(ctx, p.targetId);
        if (t && alive(t)) p.toX = t.x;
      }
      const total = p.impactTick - p.startTick;
      const done = ctx.tick - p.startTick;
      p.x = p.fromX + Math.trunc(((p.toX - p.fromX) * done) / total);
      list[w] = p;
      w += 1;
      continue;
    }
    p.x = p.toX;
    if (!p.miss) collectProjectileImpact(ctx, p);
  }
  list.length = w;
}

function collectProjectileImpact(ctx: Ctx, p: ProjectileRt): void {
  const imp = makeImpact(p.side, p.sourceId, p.sourceCard);
  imp.sourceKind = p.sourceKind;
  imp.dmg = p.dmg;
  imp.vsBase = p.vsBase;
  imp.dmgBuffBp = p.dmgBuffBp;
  imp.vsTags = p.vsTags;
  imp.vsBp = p.vsBp;
  imp.srcCls = p.srcCls;
  imp.turret = p.owner === 'turret';
  imp.srcX = p.fromX;
  imp.x = p.toX;
  if (p.kind === 'strike') {
    // Called strike (A5.5 Radio Operator): splash on ground units under the area rule, from an ability.
    const r = ctx.rules.unitList[p.ri] as UnitRules | undefined;
    imp.dmgType = 'blast';
    imp.area = 'splash';
    imp.radius = r?.strike ? r.strike.radius : 0;
    imp.hitsGround = true;
    imp.hitsAir = false;
    imp.srcRange = r?.strike ? r.strike.search : 0;
    imp.targetId = NO_TARGET;
    ctx.impacts.push(imp);
    return;
  }
  const a = attackOf(ctx, p);
  if (!a) return;
  imp.dmgType = a.dmgType;
  imp.atk = a;
  imp.srcRange = a.range;
  imp.hitsGround = a.hitsGround;
  imp.hitsAir = a.hitsAir;
  if (p.targetId === BASE_TARGET) {
    imp.targetId = BASE_TARGET;
    ctx.impacts.push(imp);
    return;
  }
  imp.area = a.area;
  imp.radius = a.radius;
  switch (a.area) {
    case 'splash':
    case 'line':
    case 'gateZone':
      // Point or gate impacts: targets are found at resolution. A splash projectile is aimed at a point
      // (the target's x at fire time, A2.7), so its primary is the enemy whose centre is nearest the
      // impact (A2.6), not necessarily the unit it was fired at.
      imp.targetId = NO_TARGET;
      break;
    default: {
      // Homing: needs the target alive on the impact tick.
      const t = findUnit(ctx, p.targetId);
      if (!t || !alive(t)) return;
      imp.targetId = t.id;
      imp.x = t.x;
      imp.bonusBp = p.bonusBp;
      imp.bonusKb = p.bonusKb;
    }
  }
  ctx.impacts.push(imp);
}
