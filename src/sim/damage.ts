/**
 * The damage pipeline, shields, heals and statuses (DESIGN A2.7 Damage, Status effects, Heal).
 *
 * Damage is integer centi-HP. The pipeline truncates after each step, in the fixed A2.7 order, with a
 * minimum of 1 HP (100 centi):
 *   1 base × level (and first-hit bonus)  2 × type mod  3 × area secondary  4 × target resist
 *   5 × attacker damage buff  6 × mark  7 × phase mods  8 × Legendary target of a power or Last Stand
 *   (or an Epic target of a strike, A2.9.6)
 * Damage is absorbed by the temporary shield first, then the innate shield, then HP.
 */
import type { DamageMod, Side, StatusKind } from '@/contracts';
import { BP } from '@/core';
import { emit } from './events';
import { escalationNow } from './escalation';
import { HEAVY_HIT_BP, type StatusRules, type UnitRules } from './rules';
import { pOf } from './geometry';
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

/**
 * A18.2 rule 4 stacking cap: `fixed` (research, side modifiers, War Horns) plus `buff` (the strongest
 * timed buff or aura), at most the cap, but never below what the buff alone gives, so an Age Power or
 * card aura keeps its A5 value while research cannot stack past the cap on top of it.
 */
export function capSum(fixed: number, buff: number, cap: number): number {
  const sum = fixed + buff;
  const limit = buff > cap ? buff : cap;
  return sum > limit ? limit : sum;
}

/** War Horns (A18.5.5): while Holding with the flag at p ≤ 480, own units near the flag deal more damage. */
function hornsDamageBp(ctx: Ctx, u: UnitRt): number {
  const h = u.fx?.horns;
  if (!h) return 0;
  const s = ctx.s.sides[u.side];
  if (s.stance !== 'hold' || s.holdP > h.flagMaxP) return 0;
  const p = pOf(u.x, u.side);
  const d = p > s.holdP ? p - s.holdP : s.holdP - p;
  return d <= h.near ? h.holdDamageBp : 0;
}

/** Damage dealt bonus of a unit's attack now, bp: research and side modifiers plus buffs, capped (A18.2). */
export function unitDamageBonusBp(ctx: Ctx, u: UnitRt): number {
  const fixed = (u.fx ? u.fx.damageBp : 0) + hornsDamageBp(ctx, u);
  return capSum(fixed, damageBuffBp(u), ctx.econ.caps.damageBp);
}

/** Attack speed bonus of a unit now, bp (may be negative: Long Draw), capped (A18.2). */
export function unitAttackSpeedBp(ctx: Ctx, u: UnitRt): number {
  return capSum(u.fx ? u.fx.attackSpeedBp : 0, attackSpeedBuffBp(u), ctx.econ.caps.attackSpeedBp);
}

/** Extra range of a unit's ranged attacks, mlu (Long Draw), capped (A18.2). Melee attacks never gain range. */
export function rangeBonus(ctx: Ctx, u: UnitRt, melee: boolean): number {
  if (melee || !u.fx || u.fx.range <= 0) return 0;
  const cap = ctx.econ.caps.range;
  return u.fx.range > cap ? cap : u.fx.range;
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
  // A16.14.2: forts ignore every status (stuns, slows, marks, shields, heals, auras).
  if (u.hp <= 0 || st.ticks <= 0 || u.fort) return;
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
  // Nothing heals a fort (A16.14.2; the Hardlight regen is its own trait, `forts.ts`).
  if (u.hp <= 0 || amount <= 0 || u.fort) return 0;
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
  if (target.fort) return fortDamage(ctx, imp, primary);
  let v = imp.dmg;
  // 1. first-hit bonus belongs to the base hit of the primary; Brace ignores it (A2.7).
  if (primary && imp.bonusBp !== BP && !tr.brace) v = Math.trunc((v * imp.bonusBp) / BP);
  // 2. type mod
  const modBp = imp.atk ? typeModBp(imp.atk.mods, tr) : BP;
  if (modBp !== BP) v = Math.trunc((v * modBp) / BP);
  // 3. area secondary (exempt: powers, Last Stand, death explosions)
  if (!primary && imp.area !== 'blast') v = Math.trunc((v * ctx.econ.areaSecondaryBp) / BP);
  // 4. target damage taken, all sources summed and floored at −35% (A18.2): Shield Wall (card or
  // research; attacks with range ≥ 100, never powers), Plating / Skirmish against Infantry, and the
  // Bulwark / Rally aura.
  const caps = ctx.econ.caps;
  let red = 0;
  if (tr.resist && !imp.power && imp.srcRange >= tr.resist.minRange) red += tr.resist.bp;
  const fx = target.fx;
  if (fx) {
    if (fx.resistBp > 0 && !imp.power && imp.srcRange >= fx.resistMin) red += fx.resistBp;
    if (fx.takenFrom >= 0 && imp.srcCls === fx.takenFrom) red += fx.takenBp;
  }
  // Guard auras never stack: the strongest applies. The Sandbag Bunker's cover counts only against
  // attacks with range ≥ 100 (A16.14.3), never powers.
  const cover = target.auraCoverBp > 0 && !imp.power && ctx.econ.fort !== null && imp.srcRange >= ctx.econ.fort.rangedMin ? target.auraCoverBp : 0;
  red += target.auraGuardBp > cover ? target.auraGuardBp : cover;
  if (red > caps.takenBp) red = caps.takenBp;
  if (red > 0) v = Math.trunc((v * (BP - red)) / BP);
  // 5. attacker damage buff (already capped at fire time), plus research against the target's tags (Hunters)
  let buff = imp.dmgBuffBp;
  if (imp.vsBp > 0 && (tr.tags & imp.vsTags) !== 0) buff = capSum(imp.vsBp, buff, caps.damageBp);
  if (buff !== 0) v = Math.trunc((v * (BP + buff)) / BP);
  // 6. mark
  const mark = isMarked(target);
  if (mark > 0) v = Math.trunc((v * (BP + mark)) / BP);
  // 7. phase: turret damage ×0.5 in Siege (Last Base Standing: the current Siege step's value, A2.10.1)
  if (imp.turret && ctx.s.phase === 'siege') v = Math.trunc((v * siegeTurretBp(ctx)) / BP);
  // 8. Legendary target of a power or Last Stand; an Epic hit by a strike (A2.9.6; not stacked)
  if (imp.power && tr.legendary) v = Math.trunc((v * ctx.econ.legendaryPowerDamageBp) / BP);
  else if (imp.strike && tr.def.rarity === 'epic') v = Math.trunc((v * ctx.econ.power.strikeEpicBp) / BP);
  // Mail (A18.5.2): a flat cut per hit, never below 1 HP and never past the −35% damage-taken floor.
  if (target.mail > 0) {
    const floor = Math.trunc((v * (BP - caps.takenBp)) / (red < BP ? BP - red : 1));
    v = v - target.mail > floor ? v - target.mail : floor;
  }
  if (v < 100) v = 100;
  return { dmg: v, modBp };
}

/**
 * The A2.7 pipeline with a fort as the target (A16.14.2 section 2.5): base × level (siege-only units use
 * their vs-base damage); the type mod is the attack's `structure` mod if it has one (for ability impacts:
 * the source card's), else ×0.5 when the compiled base range is ≥ 100, else ×1 (outside the −35% floor:
 * it is a type mod, not a resist); the area secondary; no resists, auras or marks; attacker damage
 * buffs; ×2 in Siege. Powers and Last Stand never get here. Minimum 1 HP.
 */
function fortDamage(ctx: Ctx, imp: Impact, primary: boolean): { dmg: number; modBp: number } {
  const f = ctx.econ.fort;
  const src = ctx.rules.units[imp.sourceCard];
  let v = imp.dmg;
  // 1. base × level: siege-only units (Battering Ram, Sapper) hit forts with their vs-base damage, no ×2.
  const siegeOnly = src?.siegeOnly === true && imp.sourceKind === 'unit';
  if (siegeOnly) v = imp.vsBase;
  else if (primary && imp.bonusBp !== BP) v = Math.trunc((v * imp.bonusBp) / BP);
  // 2. type mod
  let modBp = BP;
  if (!siegeOnly) {
    const structure = imp.atk ? imp.atk.mods.find((m) => m.vs === 'structure')?.bp : src && src.structureBp > 0 ? src.structureBp : undefined;
    if (structure !== undefined) modBp = structure;
    else if (f && imp.srcRange >= f.rangedMin) modBp = f.rangedTakenBp;
  }
  if (modBp !== BP) v = Math.trunc((v * modBp) / BP);
  // 3. area secondary (death explosions are exempt, as for units)
  if (!primary && imp.area !== 'blast') v = Math.trunc((v * ctx.econ.areaSecondaryBp) / BP);
  // 5. attacker damage buffs
  if (imp.dmgBuffBp !== 0) v = Math.trunc((v * (BP + imp.dmgBuffBp)) / BP);
  // 7. Siege: forts crumble (×2 damage taken)
  if (f && ctx.s.phase === 'siege' && f.siegeTakenBp !== BP) v = Math.trunc((v * f.siegeTakenBp) / BP);
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
  if (target.fort && imp.side !== target.side) {
    // A16.14.2 decay credit: the last enemy hit (a fort that decays within 3 s counts as destroyed by it).
    target.fort.lastEnemyHitTick = ctx.tick;
    target.fort.lastEnemyHitBy = imp.sourceId;
  }
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
    if (imp.dmgBuffBp !== 0) v = Math.trunc((v * (BP + imp.dmgBuffBp)) / BP);
    if (ctx.s.phase === 'siege') v = Math.trunc((v * siegeBaseBp(ctx)) / BP);
    if (v < 100) v = 100;
    // A18.7.3 "Take the tower": every hit aimed at this base also hits its marked turret.
    if (b.markHp > 0) b.markHp = v < b.markHp ? b.markHp - v : 0;
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

/** Turret and field tower damage in Siege (A2.10): ×0.5, or the Siege step in force (A2.10.1). */
export function siegeTurretBp(ctx: Ctx): number {
  const step = ctx.escalation ? escalationNow(ctx) : null;
  return step ? step.turretDamageBp : ctx.econ.siege.turretDamageBp;
}

/** Base damage from attacks in Siege (A2.10): ×2, or the Siege step in force (A2.10.1). */
export function siegeBaseBp(ctx: Ctx): number {
  const step = ctx.escalation ? escalationNow(ctx) : null;
  return step ? step.baseDamageBp : ctx.econ.siege.baseDamageBp;
}

/** Current base HP in bp, for Last Stand and Final Bell. */
export function baseBp(ctx: Ctx, side: Side): number {
  return baseHpBp(ctx.s.sides[side]);
}

/** A blank impact; callers fill what they need. */
export function makeImpact(side: Side, sourceId: number, sourceCard: string): Impact {
  return {
    cast: null,
    strike: false,
    powerStatuses: null,
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
    vsTags: 0,
    vsBp: 0,
    srcCls: -1,
    forts: false,
    trapStatuses: null,
  };
}
