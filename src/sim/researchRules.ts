/**
 * The War Council tables in sim units (DESIGN A18.5): picks with their precompiled per-unit, turret,
 * economy and command effects, prices in milli-gold and times in ticks. Compiled once per content
 * object by `rules.ts`. `content.research` is read with a shape check, so content that predates the
 * War Council (the contract fakes) simply has no picks and every `research` command is rejected.
 */
import type { AgeId, CardId, CompiledContent, ResearchClass, ResearchPickDef, ResearchRules, ResearchTrack, Role, Tag } from '@/contracts';
import { BP, MILLI, TICKS_PER_SECOND, msToTicks } from '@/core';
import type { UnitRules } from './rules';

/** Troops class lines in a fixed order; a unit's `cls` indexes this list (A18.5.2). */
export const CLASSES: readonly ResearchClass[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'support'];
export const TRACKS: readonly ResearchTrack[] = ['troops', 'defences', 'economy', 'command'];

/** What one pick does to an own unit of its class spawned after it completes (sums; caps apply at use). */
export interface UnitFx {
  damageBp: number;
  hpBp: number;
  speedBp: number;
  attackSpeedBp: number;
  healBp: number;
  /** mlu, ranged attacks only. */
  range: number;
  vsTags: number;
  vsBp: number;
  /** Mail: bp of the age's Infantry Common L1 damage taken off each hit. */
  mailBp: number;
  resistMin: number;
  resistBp: number;
  /** Less damage taken from units of class index `takenFrom` (−1 none). */
  takenFrom: number;
  takenBp: number;
  firstHitBp: number;
  firstHitKb: number;
  firstHitHoldBp: number;
  aura: { radius: number; stat: 'attackSpeed' | 'guard'; bp: number; behindOnly: boolean } | null;
  horns: { chargeSpeedBp: number; holdDamageBp: number; flagMaxP: number; near: number } | null;
}

/** What one pick does to its side at once (turrets, income, bounty, powers). */
export interface SideFx {
  turretRange: number;
  turretAttackSpeedBp: number;
  turretDamageBp: number;
  /** Modernise price multiplier (BP when none) and build ticks (0 = the normal build time). */
  moderniseBp: number;
  moderniseTicks: number;
  incomePerTick: number;
  bountyAddBp: number;
  forageBp: number;
  powerChargeBp: number;
}

export interface PickRules {
  idx: number;
  id: string;
  track: ResearchTrack;
  /** Class index for Troops picks, −1 otherwise. */
  cls: number;
  rank: 1 | 2 | 3;
  pick: 0 | 1;
  def: ResearchPickDef;
  /** Null for picks with no unit effect. */
  unit: UnitFx | null;
  side: SideFx | null;
}

export interface ResearchSimRules {
  picks: readonly PickRules[];
  /** Milli-gold per rank (index 0 = rank I) per track. */
  cost: Readonly<Record<ResearchTrack, readonly number[]>>;
  ticks: readonly number[];
  cancelRefundBp: number;
  discountBp: number;
  baseGapBp: number;
  /** Unlock positions per rank by window length (A18.5.1); see {@link unlockPositions}. */
  unlockAt: Readonly<Record<string, readonly number[]>>;
  /** Class index per card role. */
  classOfRole: Readonly<Record<Role, number>>;
  /** Mail base per age: the age's Infantry Common L1 damage, centi (A18.5.2). */
  infantryDamage: Readonly<Partial<Record<AgeId, number>>>;
}

const TAG_BITS: Readonly<Record<Tag, number>> = {
  light: 1,
  armored: 2,
  bio: 4,
  mech: 8,
  ground: 16,
  air: 32,
  legendary: 64,
  support: 128,
  ranged: 256,
  melee: 512,
};

export function emptyUnitFx(): UnitFx {
  return {
    damageBp: 0,
    hpBp: 0,
    speedBp: 0,
    attackSpeedBp: 0,
    healBp: 0,
    range: 0,
    vsTags: 0,
    vsBp: 0,
    mailBp: 0,
    resistMin: 0,
    resistBp: 0,
    takenFrom: -1,
    takenBp: 0,
    firstHitBp: 0,
    firstHitKb: 0,
    firstHitHoldBp: 0,
    aura: null,
    horns: null,
  };
}

export function emptySideFx(): SideFx {
  return {
    turretRange: 0,
    turretAttackSpeedBp: 0,
    turretDamageBp: 0,
    moderniseBp: BP,
    moderniseTicks: 0,
    incomePerTick: 0,
    bountyAddBp: 0,
    forageBp: 0,
    powerChargeBp: 0,
  };
}

const mlu = (lu: number): number => Math.round(lu * MILLI);

function compilePick(def: ResearchPickDef, idx: number, clsIndex: (c: ResearchClass) => number): PickRules {
  let unit: UnitFx | null = null;
  let side: SideFx | null = null;
  const u = (): UnitFx => (unit ??= emptyUnitFx());
  const sd = (): SideFx => (side ??= emptySideFx());
  for (const fx of def.effects) {
    switch (fx.kind) {
      case 'unitStat':
        if (fx.stat === 'damage') u().damageBp += fx.bp;
        else if (fx.stat === 'hp') u().hpBp += fx.bp;
        else if (fx.stat === 'speed') u().speedBp += fx.bp;
        else if (fx.stat === 'attackSpeed') u().attackSpeedBp += fx.bp;
        else u().healBp += fx.bp;
        break;
      case 'unitRange':
        u().range += mlu(fx.lu);
        break;
      case 'damageVs':
        for (const t of fx.tags) u().vsTags |= TAG_BITS[t];
        u().vsBp += fx.bp;
        break;
      case 'mail':
        u().mailBp += fx.ofInfantryDamageBp;
        break;
      case 'resist':
        u().resistMin = mlu(fx.minSourceRange);
        u().resistBp += fx.bp;
        break;
      case 'takenFrom':
        u().takenFrom = clsIndex(fx.from);
        u().takenBp += fx.bp;
        break;
      case 'firstHit':
        if (fx.whileHolding) u().firstHitHoldBp += fx.bp;
        else u().firstHitBp += fx.bp;
        u().firstHitKb += mlu(fx.knockback);
        break;
      case 'aura':
        u().aura = { radius: mlu(fx.radius), stat: fx.stat, bp: fx.bp, behindOnly: fx.behindOnly === true };
        break;
      case 'warHorns':
        u().horns = { chargeSpeedBp: fx.chargeSpeedBp, holdDamageBp: fx.holdDamageBp, flagMaxP: mlu(fx.flagMaxP), near: mlu(fx.nearLu) };
        break;
      case 'turret':
        if (fx.stat === 'range') sd().turretRange += mlu(fx.value);
        else if (fx.stat === 'attackSpeed') sd().turretAttackSpeedBp += fx.value;
        else sd().turretDamageBp += fx.value;
        break;
      case 'modernise':
        sd().moderniseBp = fx.priceBp;
        sd().moderniseTicks = msToTicks(fx.buildMs);
        break;
      case 'income':
        sd().incomePerTick += Math.trunc(fx.milliGoldPerSec / TICKS_PER_SECOND);
        break;
      case 'bounty':
        sd().bountyAddBp += fx.addBp;
        if (fx.ownHalfOnly) sd().forageBp += fx.bonusBp;
        break;
      case 'powerCharge':
        sd().powerChargeBp += fx.bp;
        break;
    }
  }
  return { idx, id: def.id, track: def.track, cls: def.group ? clsIndex(def.group) : -1, rank: def.rank, pick: def.pick, def, unit, side };
}

/** A research table shaped like `ResearchRules`, or null (content without the War Council). */
function tableOf(content: CompiledContent): ResearchRules | null {
  const r = (content as { research?: unknown }).research as Partial<ResearchRules> | undefined;
  if (!r || !Array.isArray(r.picks) || !r.cost || !Array.isArray(r.timeMs) || !r.classOfRole) return null;
  return r as ResearchRules;
}

const ROLES: readonly Role[] = [
  'infantry',
  'ranged',
  'heavy',
  'antiArmor',
  'support',
  'skirmisher',
  'siege',
  'artillery',
  'airBomber',
  'airGunship',
  'antiMech',
  'siegeHeavy',
];

/** Fallback class of each role when the content has no War Council table. */
const DEFAULT_CLASS: Readonly<Record<Role, ResearchClass>> = {
  infantry: 'infantry',
  skirmisher: 'infantry',
  ranged: 'ranged',
  artillery: 'ranged',
  airBomber: 'ranged',
  airGunship: 'ranged',
  heavy: 'heavy',
  siege: 'heavy',
  siegeHeavy: 'heavy',
  antiArmor: 'antiArmor',
  antiMech: 'antiArmor',
  support: 'support',
};

export function researchRules(
  content: CompiledContent,
  unitList: readonly UnitRules[],
  vanguard: Readonly<Record<AgeId, CardId | null>>,
): ResearchSimRules {
  const t = tableOf(content);
  const clsIndex = (c: ResearchClass): number => CLASSES.indexOf(c);
  const classOfRole = {} as Record<Role, number>;
  for (const role of ROLES) classOfRole[role] = clsIndex(t?.classOfRole[role] ?? DEFAULT_CLASS[role]);
  const infantryDamage: Partial<Record<AgeId, number>> = {};
  for (const age of Object.keys(vanguard).sort() as AgeId[]) {
    const id = vanguard[age];
    const u = id ? unitList.find((x) => x.id === id) : undefined;
    if (u) infantryDamage[age] = (u.attacks[0]?.damage ?? 0) * 100;
  }
  if (!t) {
    return {
      picks: [],
      cost: { troops: [], defences: [], economy: [], command: [] },
      ticks: [],
      cancelRefundBp: 0,
      discountBp: 0,
      baseGapBp: 0,
      unlockAt: {},
      classOfRole,
      infantryDamage,
    };
  }
  const cost = {} as Record<ResearchTrack, number[]>;
  for (const track of TRACKS) cost[track] = (t.cost[track] ?? []).map((c) => c * MILLI);
  return {
    picks: t.picks.map((p, i) => compilePick(p, i, clsIndex)),
    cost,
    ticks: t.timeMs.map((ms) => msToTicks(ms)),
    cancelRefundBp: t.cancelRefundBp,
    discountBp: t.underdog?.discountBp ?? 0,
    baseGapBp: t.underdog?.baseGapBp ?? 0,
    unlockAt: t.unlockAt ?? {},
    classOfRole,
    infantryDamage,
  };
}

/**
 * The window position (0-based) at which each rank unlocks for a window of `length` ages (A18.5.1):
 * the row for that length, else the longest row not longer than it.
 */
export function unlockPositions(r: ResearchSimRules, length: number): readonly number[] {
  let best: readonly number[] = [];
  let bestLen = 0;
  for (const k of Object.keys(r.unlockAt)) {
    const n = Number(k);
    const row = r.unlockAt[k];
    if (!row || !Number.isInteger(n) || n > length || n < bestLen) continue;
    best = row;
    bestLen = n;
  }
  return best;
}

/** Sums a unit's pick effects into one {@link UnitFx}. */
export function addUnitFx(into: UnitFx, fx: UnitFx): void {
  into.damageBp += fx.damageBp;
  into.hpBp += fx.hpBp;
  into.speedBp += fx.speedBp;
  into.attackSpeedBp += fx.attackSpeedBp;
  into.healBp += fx.healBp;
  into.range += fx.range;
  into.vsTags |= fx.vsTags;
  into.vsBp += fx.vsBp;
  into.mailBp += fx.mailBp;
  if (fx.resistBp > 0) {
    into.resistMin = fx.resistMin;
    into.resistBp += fx.resistBp;
  }
  if (fx.takenFrom >= 0) {
    into.takenFrom = fx.takenFrom;
    into.takenBp += fx.takenBp;
  }
  into.firstHitBp += fx.firstHitBp;
  into.firstHitKb += fx.firstHitKb;
  into.firstHitHoldBp += fx.firstHitHoldBp;
  if (fx.aura) into.aura = fx.aura;
  if (fx.horns) into.horns = fx.horns;
}

/** Sums side effects. */
export function addSideFx(into: SideFx, fx: SideFx): void {
  into.turretRange += fx.turretRange;
  into.turretAttackSpeedBp += fx.turretAttackSpeedBp;
  into.turretDamageBp += fx.turretDamageBp;
  if (fx.moderniseBp !== BP) into.moderniseBp = fx.moderniseBp;
  if (fx.moderniseTicks > 0) into.moderniseTicks = fx.moderniseTicks;
  into.incomePerTick += fx.incomePerTick;
  into.bountyAddBp += fx.bountyAddBp;
  into.forageBp += fx.forageBp;
  into.powerChargeBp += fx.powerChargeBp;
}
