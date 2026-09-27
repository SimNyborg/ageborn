/**
 * Internal simulation state (DESIGN B3). The runtime types extend the frozen contract types in
 * `src/contracts/sim.ts` with the bookkeeping the rules need (stickiness timers, leap state, cast hit
 * lists, ...). Every extension is a plain number, boolean, string or array, so the whole state stays
 * JSON-friendly and hashable, and `Sim.state` can expose it as `Readonly<SimState>`.
 *
 * Units (B3): x in milli-lu, HP/shields/damage in centi-units, gold and XP in milli-units, power charge
 * in ppm, time in 50 ms ticks. Entity ids come from one increasing counter (`nextId`) shared by units,
 * projectiles and casts; unit id 0 means "no target" and target id −1 is the enemy base.
 */
import type {
  AgeId,
  AttackState,
  CardId,
  DmgType,
  KillerKind,
  Loadout,
  MatchConfig,
  PowerCastState,
  ProjectileState,
  QueueItem,
  Side,
  SideState,
  SimEvent,
  SimState,
  TrainingEvent,
  TurretState,
  UnitState,
} from '@/contracts';
import { BP, LANE_MLU, MILLI, TICK_MS, assert, seedSfc32 } from '@/core';
import { matchMods, type MatchMods } from './modifiers';
import { rulesFor, type AreaKind, type AttackRules, type EconRules, type FormatRules, type SimRules } from './rules';
import { createSpatial, type SpatialIndex } from './spatial';

/** No target (ids start at 1). */
export const NO_TARGET = 0;
/** The enemy base as a target (DESIGN B15 `AttackState.targetId`). */
export const BASE_TARGET = -1;
/** `sourceId` of Age Power hits (no unit fired them). */
export const POWER_SOURCE_ID = -1;
/** `sourceId` of Last Stand hits. */
export const LAST_STAND_SOURCE_ID = -2;
/** Turrets have no entity id: their `sourceId` / `from` is −10 − (side × 4 + mount). */
export const TURRET_SOURCE_BASE = -10;
export const turretSourceId = (side: Side, mount: number): number => TURRET_SOURCE_BASE - (side * 4 + mount);
/** "Never attacked" marker for `lastAttackTick`, so the first attack of a unit is a first hit. */
export const NEVER = -1000000;

export interface AttackRt extends AttackState {
  /** Next stickiness re-check (A2.7 Targeting: every 1.0 s). */
  retargetTick: number;
  /** The pending attack is the first hit of an engagement (A2.7 First-hit bonus). */
  firstHit: boolean;
  /** The pending attack is the first bite after a pounce (A5.2 Sabertooth). */
  bite: boolean;
}

export interface UnitRt extends UnitState {
  attacks: AttackRt[];
  /** Index into `SimRules.unitList`. */
  ci: number;
  /** Damage per attack in centi at the unit's level. */
  dmg: number[];
  /** Damage against bases per attack in centi at the unit's level. */
  vsBase: number[];
  innateMax: number;
  innateRegen: number;
  /** Heal pool per pulse in centi at the unit's level (0 when it does not heal). */
  healPool: number;
  lastHitId: number;
  lastHitCard: CardId;
  lastHitKind: KillerKind | null;
  lastHitSide: Side;
  lastHitCast: number | null;
  /** Aura bonuses recomputed every tick (B3 step 6). Auras never stack: the strongest applies. */
  auraAttackSpeedBp: number;
  auraDamageBp: number;
  /** Pounce leap (A5.2); `leapEnd` 0 when not leaping. */
  leapFrom: number;
  leapTo: number;
  leapStart: number;
  leapEnd: number;
  /** Signed displacement of the last movement step (overtaking uses "is moving"). */
  moved: number;
}

export interface QueueItemRt extends QueueItem {
  /** Milli-gold paid on enqueue, refunded in full on cancel (A2.7 Training). */
  paid: number;
}

export interface TurretRt extends TurretState {
  attack: AttackRt;
}

export interface ProjectileRt extends ProjectileState {
  /** `attack`: a unit or turret attack; `strike`: a called strike (Radio Operator). */
  kind: 'attack' | 'strike';
  sourceKind: KillerKind;
  /** 'unit' or 'turret': where `ri` indexes the rules. */
  owner: 'unit' | 'turret';
  /** Index into `unitList` or `turretList`. */
  ri: number;
  /** Damage in centi (level scaled). */
  dmg: number;
  vsBase: number;
  dmgBuffBp: number;
  /** Smoke Screen miss rolled at fire time (A5.7). */
  miss: boolean;
  fromX: number;
  startTick: number;
  /** Mount index for turret projectiles (−1 otherwise). */
  mount: number;
}

export interface CastRt extends PowerCastState {
  telegraphEnd: number;
  /** Last tick of the effect (inclusive). */
  endTick: number;
  /** Enemies already hit (sweep: once each; stampede: with `hitCounts`). */
  hitIds: number[];
  hitCounts: number[];
  /** Stampede: per runner, the ids it already hit. */
  runnerHits: number[][];
  /** One-shot effects (buffAll, paradrop) done. */
  applied: boolean;
}

export interface SideRt extends SideState {
  queue: QueueItemRt[];
  turrets: (TurretRt | null)[];
  /** Cards this side has played (trained, built, cast): the opponent's Scouted list (A3). */
  played: CardId[];
  emoteReadyTick: number;
  /** Tick the Last Stand charge completes (0 when not charging). */
  lastStandFireTick: number;
  /** Passive income accumulated since the last per-second `goldEarned` / `xpEarned` event. */
  passiveGoldAcc: number;
  passiveXpAcc: number;
  /** Unlocked tray slots per age (tutorial trays, A8); null = every slot. */
  trays: Partial<Record<AgeId, number[]>> | null;
}

export interface SimStateRt extends SimState {
  sides: [SideRt, SideRt];
  units: UnitRt[];
  projectiles: ProjectileRt[];
  casts: CastRt[];
}

/** One impact collected during a tick and applied in step 13 (A2.7 Impact resolution). */
export interface Impact {
  side: Side;
  sourceId: number;
  sourceCard: CardId;
  sourceKind: KillerKind;
  castId: number | null;
  dmgType: DmgType;
  /** Damage in centi, level scaled. */
  dmg: number;
  vsBase: number;
  atk: AttackRules | null;
  /** Primary target: a unit id, BASE_TARGET, or NO_TARGET for a point impact. */
  targetId: number;
  /** Impact point (area centre). */
  x: number;
  /** Area kind; `blast` = exempt from the area rule (powers, Last Stand, death explosions, A2.6). */
  area: AreaKind | 'blast';
  radius: number;
  hitsGround: boolean;
  hitsAir: boolean;
  /** First-hit multiplier and knockback for the primary (A2.7); ignored by Brace. */
  bonusBp: number;
  bonusKb: number;
  dmgBuffBp: number;
  turret: boolean;
  /** Power or Last Stand: Legendaries take 50%, Shield Wall does not apply (A2.7, A5.3). */
  power: boolean;
  /** Knockback applied to every ground target (stampede, Last Stand), mlu. */
  kb: number;
  /** Attacker position; "behind" for cleave, pierce and follow-behind is away from it. */
  srcX: number;
  /** Range of the source attack or ability (mlu); Shield Wall resists sources with range ≥ 100 lu (A5.3). */
  srcRange: number;
}

/** A queued displacement, applied after all damage in step 13 (A2.7 Knockback and pulls). */
export interface Knock {
  id: number;
  /** Displacement in the target's p-frame before resist: negative = toward its own gate. */
  dp: number;
  /** Toad drag: stops at the target's frontmost ally and short of the dragging side's nearest ground unit. */
  drag: boolean;
}

/** Per-match context shared by all systems. Created once by `createSim`. */
export interface Ctx {
  cfg: MatchConfig;
  rules: SimRules;
  econ: EconRules;
  fmt: FormatRules;
  mods: MatchMods;
  s: SimStateRt;
  /** Events of the current tick. */
  ev: SimEvent[];
  tick: number;
  impacts: Impact[];
  knocks: Knock[];
  manualLastStand: [boolean, boolean];
  stanceEnabled: [boolean, boolean];
  overdriveTick: number | null;
  siegeTick: number | null;
  finalBellTick: number | null;
  retreatTick: number | null;
  /** Training script sorted by tick; `scriptCursor` is the next event. */
  script: readonly TrainingEvent[];
  scriptCursor: number;
  /** Per-tick spatial index (built at step 7) and a scratch list for range queries. */
  spatial: SpatialIndex;
  scratch: UnitRt[];
}

/** Creates the context and the tick-0 state for a match. */
export function createCtx(cfg: MatchConfig): Ctx {
  const rules = rulesFor(cfg.content);
  const fmt = rules.formats[cfg.format];
  assert(fmt !== undefined, `unknown format ${cfg.format}`);
  assert(fmt.ages.length > 0, `format ${cfg.format} has no ages`);
  const mods = matchMods(cfg.modifiers);
  const econ = rules.econ;
  const t = cfg.training;
  const noClock = t?.noClock === true;
  const siegeShift = Math.trunc(mods.siegeEarlierMs / TICK_MS);
  const siegeTick = noClock || fmt.siegeTick === null ? null : Math.max(1, fmt.siegeTick - siegeShift);
  const script = [...(t?.script ?? [])].sort((a, b) => a.tick - b.tick || a.side - b.side);

  const firstAge = fmt.ages[0] as AgeId;
  const baseMax = rules.baseHp[firstAge] * 100;
  const sides = [0, 1].map((side) => {
    const hp = side === 1 && t?.enemyBaseStartBp !== undefined ? Math.trunc((baseMax * t.enemyBaseStartBp) / BP) : baseMax;
    const s: SideRt = {
      gold: econ.startGold,
      xp: 0,
      ageIndex: 0,
      ascendUntil: 0,
      queue: [],
      pop: 0,
      treasury: 0,
      mountsOwned: 1,
      turrets: new Array<TurretRt | null>(econ.mountCount).fill(null),
      powerPpm: 0,
      stance: 'charge',
      stanceReadyTick: 0,
      baseHp: hp,
      baseMaxHp: baseMax,
      lastStand: 'locked',
      retreated: false,
      callStrikeReadyTick: 0,
      played: [],
      emoteReadyTick: 0,
      lastStandFireTick: 0,
      passiveGoldAcc: 0,
      passiveXpAcc: 0,
      // Tutorial trays restrict the learner (side 0) only; bots train from their full loadout (A8).
      trays: side === 0 && t?.trays ? cloneTrays(t.trays) : null,
    };
    return s;
  }) as [SideRt, SideRt];

  const s: SimStateRt = {
    tick: 0,
    phase: 'regulation',
    sides,
    units: [],
    projectiles: [],
    casts: [],
    rng: seedSfc32(cfg.seed),
    nextId: 1,
    outcome: null,
    hashes: [],
  };
  return {
    cfg,
    rules,
    econ,
    fmt,
    mods,
    s,
    ev: [],
    tick: 0,
    impacts: [],
    knocks: [],
    manualLastStand: t?.manualLastStand ? [t.manualLastStand[0], t.manualLastStand[1]] : [true, true],
    stanceEnabled: t?.stanceEnabled ? [t.stanceEnabled[0], t.stanceEnabled[1]] : [true, true],
    overdriveTick: noClock ? null : fmt.overdriveTick,
    siegeTick,
    finalBellTick: noClock ? null : fmt.finalBellTick,
    retreatTick: noClock ? null : fmt.retreatTick,
    script,
    scriptCursor: 0,
    spatial: createSpatial(),
    scratch: [],
  };
}

function cloneTrays(t: Partial<Record<AgeId, number[]>>): Partial<Record<AgeId, number[]>> {
  const out: Partial<Record<AgeId, number[]>> = {};
  for (const k of (Object.keys(t) as AgeId[]).sort()) {
    const v = t[k];
    if (v) out[k] = [...v];
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Accessors shared by systems.

export const other = (side: Side): Side => (side === 0 ? 1 : 0);

/** The side's current age id (the format's ages in order; `ageIndex` is the position). */
export function ageOf(ctx: Ctx, side: Side): AgeId {
  return ctx.fmt.ages[ctx.s.sides[side].ageIndex] as AgeId;
}

/** `AgeDef.index` of the side's current age. */
export function ageIdxOf(ctx: Ctx, side: Side): number {
  return ctx.rules.ageIdx[ageOf(ctx, side)];
}

export function isFinalAge(ctx: Ctx, side: Side): boolean {
  return ctx.s.sides[side].ageIndex >= ctx.fmt.ages.length - 1;
}

/** XP (milli) needed to evolve out of the current age, or null in the final age (A2.4, A9.1 Fast Forward). */
export function thresholdOf(ctx: Ctx, side: Side): number | null {
  const t = ctx.fmt.thresholds[ctx.s.sides[side].ageIndex];
  if (t === null || t === undefined) return null;
  return Math.trunc((t * MILLI * ctx.mods.xpThresholdBp) / BP);
}

/** XP cap (milli): 1.5 × threshold, or the Overcharge amount in the final age (A2.4). */
export function xpCapOf(ctx: Ctx, side: Side): number {
  const t = thresholdOf(ctx, side);
  if (t === null) return ctx.econ.overchargeXp;
  return Math.trunc((t * ctx.econ.xpCapBp) / BP);
}

/** XP as bp of the current threshold; in the final age, of the Overcharge amount (A2.4). */
export function xpBp(ctx: Ctx, side: Side): number {
  const t = thresholdOf(ctx, side) ?? ctx.econ.overchargeXp;
  return t > 0 ? Math.trunc((ctx.s.sides[side].xp * BP) / t) : 0;
}

export function isAscending(ctx: Ctx, side: Side): boolean {
  return ctx.s.sides[side].ascendUntil > 0;
}

/** Evolve is available: XP ≥ threshold, not final, not ascending (A2.4). */
export function canEvolve(ctx: Ctx, side: Side): boolean {
  const t = thresholdOf(ctx, side);
  return t !== null && !isAscending(ctx, side) && ctx.s.sides[side].xp >= t;
}

export function loadoutOf(ctx: Ctx, side: Side): Loadout | undefined {
  return ctx.cfg.sides[side].loadouts[ageOf(ctx, side)];
}

export function cardLevel(ctx: Ctx, side: Side, card: CardId): number {
  return ctx.cfg.sides[side].levels[card] ?? 1;
}

/** Effective unit card cost in milli-gold (A9.1 Heavy Metal). */
export function unitCost(ctx: Ctx, card: CardId): number {
  const r = ctx.rules.units[card];
  if (!r) return 0;
  return Math.trunc((r.cost * MILLI * ctx.mods.costBp[r.group]) / BP);
}

/** Base HP in bp of max. */
export function baseHpBp(side: SideState): number {
  if (side.baseMaxHp <= 0) return 0;
  const hp = side.baseHp < 0 ? 0 : side.baseHp;
  return Math.trunc((hp * BP) / side.baseMaxHp);
}

/** The lane length in milli-lu. */
export const LANE = LANE_MLU;
