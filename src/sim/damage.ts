/**
 * The damage pipeline, shields, heals and statuses (DESIGN A2.7 Damage, Status effects, Heal).
 *
 * Damage is integer centi-HP. The pipeline truncates after each step, in the fixed A2.7 order, with a
 * minimum of 1 HP (100 centi):
 *   1 base × level (and first-hit bonus)  2 × type mod  3 × area secondary  4 × target resist
 *   5 × attacker damage buff  6 × mark  7 × phase mods  8 × Legendary target of a power or Last Stand
 * Damage is absorbed by the temporary shield first, then the innate shield, then HP.
 */
import type { DamageMod, Side, StatusKind } from '@/contracts';
import { BP } from '@/core';
import { emit } from './events';
import { HEAVY_HIT_BP, type StatusRules, type UnitRules } from './rules';
import { NO_TARGET, baseHpBp, other, type Ctx, type Impact, type UnitRt } from './state';
import { addXp } from './systems/economy';

/** The first mod whose tag the target has, else ×1.0 (A2.6). */
export function typeModBp(mods: readonly DamageMod[], r: UnitRules): number {
  for (const m of mods) {
    if (r.def.tags.includes(m.vs)) return m.bp;
  }
  return BP;
}

/** Magnitude of an active timed status (0 when absent). */
export function statusBp(u: UnitRt, kind: StatusKind): number {
  for (const st of u.statuses) if (st.kind === kind) return st.magnitudeBp;
  return 0;
}

export function isStunned(u: UnitRt): boolean {
  for (const st of u.statuses) if (st.kind === 'stun') return true;
  return false;
}

export function isMarked(u: UnitRt): number {
  return statusBp(u, 'mark');
}

/** Strongest damage buff: timed (Royal Decree) or aura (Smoke Screen); they never stack (A2.7). */
export function damageBuffBp(u: UnitRt): number {
  const t = statusBp(u, 'damageBuff');
  return t > u.auraDamageBp ? t : u.auraDamageBp;
}

export function attackSpeedBuffBp(u: UnitRt): number {
  const t = statusBp(u, 'attackSpeedBuff');
  return t > u.auraAttackSpeedBp ? t : u.auraAttackSpeedBp;
}

export function isLeaping(u: UnitRt): boolean {
  return u.leapEnd > 0;
}

/** Cancels every pending windup; the cooldown stays spent (A2.7: stun and knockback). */
export function cancelWindups(u: UnitRt): void {
  for (const a of u.attacks) {
    a.impactTick = 0;
    a.firstHit = false;
  }
}

/**
 * Applies a status (A2.7): reapplying sets magnitude and expiry to the max of old and new; shields set
 * the pool to the max of current and new. `amount` is the shield pool or regen total in centi.
 */
export function applyStatus(ctx: Ctx, u: UnitRt, st: StatusRules, sourceId: number, amount = 0): void {
  if (u.hp <= 0 || st.ticks <= 0) return;
  const until = ctx.tick + st.ticks;
  let cur = null;
  for (const s of u.statuses) if (s.kind === st.kind) cur = s;
  if (cur) {
    if (st.magnitudeBp > cur.magnitudeBp) cur.magnitudeBp = st.magnitudeBp;
    if (until > cur.untilTick) cur.untilTick = until;
    if (amount > cur.amount) cur.amount = amount;
    cur.frozen = cur.frozen || st.frozen;
    cur.sourceId = sourceId;
  } else {
    u.statuses.push({ kind: st.kind, magnitudeBp: st.magnitudeBp, untilTick: until, amount, frozen: st.frozen, sourceId });
  }
  if (st.kind === 'shield' && amount > u.shield) u.shield = amount;
  if (st.kind === 'stun') cancelWindups(u);
  emit(ctx, { e: 'statusApplied', id: u.id, kind: st.kind, ms: st.ticks * 50, frozen: st.frozen });
}

/** Heals a unit (Legendaries receive 50%, never above max HP). Returns the HP restored. */
export function healUnit(ctx: Ctx, u: UnitRt, amount: number): number {
  if (u.hp <= 0 || amount <= 0) return 0;
  const r = ctx.rules.unitList[u.ci] as UnitRules;
  let a = r.legendary ? Math.trunc((amount * ctx.econ.healLegendaryBp) / BP) : amount;
  if (u.hp + a > u.maxHp) a = u.maxHp - u.hp;
  if (a <= 0) return 0;
  u.hp += a;
  emit(ctx, { e: 'healed', id: u.id, amount: a });
  return a;
}

/**
 * Runs the pipeline for one unit target of an impact. `primary` is false for area secondaries.
 * Returns the damage in centi and the type mod used.
 */
export function unitDamage(ctx: Ctx, imp: Impact, target: UnitRt, primary: boolean): { dmg: number; modBp: number } {
  const tr = ctx.rules.unitList[target.ci] as UnitRules;
  let v = imp.dmg;
  // 1. first-hit bonus belongs to the base hit of the primary; Brace ignores it (A2.7).
  if (primary && imp.bonusBp !== BP && !tr.brace) v = Math.trunc((v * imp.bonusBp) / BP);
  // 2. type mod
  const modBp = imp.atk ? typeModBp(imp.atk.mods, tr) : BP;
  if (modBp !== BP) v = Math.trunc((v * modBp) / BP);
  // 3. area secondary (exempt: powers, Last Stand, death explosions)
  if (!primary && imp.area !== 'blast') v = Math.trunc((v * ctx.econ.areaSecondaryBp) / BP);
  // 4. target resist (Shield Wall: attacks with range ≥ 100, never powers)
  if (tr.resist && !imp.power && imp.srcRange >= tr.resist.minRange) v = Math.trunc((v * (BP - tr.resist.bp)) / BP);
  // 5. attacker damage buff
  if (imp.dmgBuffBp > 0) v = Math.trunc((v * (BP + imp.dmgBuffBp)) / BP);
  // 6. mark
  const mark = isMarked(target);
  if (mark > 0) v = Math.trunc((v * (BP + mark)) / BP);
  // 7. phase: turret damage ×0.5 in Siege; Siege lethality (A16.4 L5, `siege.unitDamageTakenBp`, 10,000 = off)
  if (ctx.s.phase === 'siege') {
    if (imp.turret) v = Math.trunc((v * ctx.econ.siege.turretDamageBp) / BP);
    const taken = ctx.econ.siege.unitDamageTakenBp;
    if (taken !== BP) v = Math.trunc((v * taken) / BP);
  }
  // 8. Legendary target of a power or Last Stand
  if (imp.power && tr.legendary) v = Math.trunc((v * ctx.econ.legendaryPowerDamageBp) / BP);
  if (v < 100) v = 100;
  return { dmg: v, modBp };
}

/** Applies damage to a unit: temporary shield, innate shield, then HP. Emits `hit`. */
export function dealDamage(ctx: Ctx, imp: Impact, target: UnitRt, dmg: number, modBp: number): void {
  if (target.hp <= 0) return;
  let rest = dmg;
  let absorbed = 0;
  if (target.shield > 0) {
    const a = rest < target.shield ? rest : target.shield;
    target.shield -= a;
    rest -= a;
    absorbed += a;
  }
  if (rest > 0 && target.innateShield > 0) {
    const a = rest < target.innateShield ? rest : target.innateShield;
    target.innateShield -= a;
    rest -= a;
    absorbed += a;
  }
  target.hp -= rest;
  if (target.hp < 0) target.hp = 0;
  target.lastDamageTick = ctx.tick;
  target.lastHitId = imp.sourceId;
  target.lastHitCard = imp.sourceCard;
  target.lastHitKind = imp.sourceKind;
  target.lastHitSide = imp.side;
  target.lastHitCast = imp.castId;
  emit(ctx, {
    e: 'hit',
    targetId: target.id,
    sourceId: imp.sourceId,
    sourceCard: imp.sourceCard,
    castId: imp.castId,
    sourceKind: imp.sourceKind,
    damage: dmg,
    shieldAbsorbed: absorbed,
    heavy: dmg * BP >= target.maxHp * HEAVY_HIT_BP,
    modBp,
    x: target.x,
    dmgType: imp.dmgType,
  });
}

/**
 * Damages the base of `baseSide` from an attack that targeted it (A2.7: splash never damages a base).
 * The attacker earns 12 XP per 1% of that base's max HP (A2.4).
 */
export function damageBase(ctx: Ctx, baseSide: Side, imp: Impact | null, raw: number): void {
  const b = ctx.s.sides[baseSide];
  if (b.baseHp <= 0) return;
  let v = raw;
  if (imp) {
    if (imp.dmgBuffBp > 0) v = Math.trunc((v * (BP + imp.dmgBuffBp)) / BP);
    if (ctx.s.phase === 'siege') v = Math.trunc((v * ctx.econ.siege.baseDamageBp) / BP);
    if (v < 100) v = 100;
  }
  const dealt = v < b.baseHp ? v : b.baseHp;
  b.baseHp -= dealt;
  emit(ctx, {
    e: 'baseDamaged',
    side: baseSide,
    sourceId: imp ? imp.sourceId : null,
    damage: v,
    hp: b.baseHp,
    maxHp: b.baseMaxHp,
  });
  if (imp) {
    // XP = damage × 1,200 / maxHp (whole XP), in milli-XP.
    const xp = Math.trunc((dealt * ctx.econ.baseDamageXpPerPct * 100 * 1000) / b.baseMaxHp);
    addXp(ctx, other(baseSide), xp, 'base');
  }
}

/** Current base HP in bp, for Last Stand and Final Bell. */
export function baseBp(ctx: Ctx, side: Side): number {
  return baseHpBp(ctx.s.sides[side]);
}

/** A blank impact; callers fill what they need. */
export function makeImpact(side: Side, sourceId: number, sourceCard: string): Impact {
  return {
    side,
    sourceId,
    sourceCard,
    sourceKind: 'unit',
    castId: null,
    dmgType: 'blunt',
    dmg: 0,
    vsBase: 0,
    atk: null,
    targetId: NO_TARGET,
    x: 0,
    area: 'single',
    radius: 0,
    hitsGround: true,
    hitsAir: false,
    bonusBp: BP,
    bonusKb: 0,
    dmgBuffBp: 0,
    turret: false,
    power: false,
    kb: 0,
    srcX: 0,
    srcRange: 0,
  };
}
