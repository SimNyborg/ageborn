/**
 * Runtime rule tables for the simulation (DESIGN B3, B4).
 *
 * `CompiledContent` keeps table units (ms, lu, lu/s, whole HP and damage, gold, bp; see
 * docs/requests/wp2-content-units.md). This module converts them once per content object into the
 * sim's integer units: ticks, milli-lu (mlu), mlu per tick, centi-HP (applied at spawn with the level
 * multiplier) and milli-gold/XP. The result is cached in a WeakMap, so every match on the same content
 * shares it. Nothing here depends on a match; per-match modifiers live in `modifiers.ts`.
 */
import type {
  AbilityDef,
  AgeId,
  AttackDef,
  CardId,
  CompiledContent,
  DamageMod,
  DmgType,
  EconomyRules,
  FormatId,
  FortDef,
  PowerDef,
  PowerFamily,
  PowerReach,
  PowerSlot,
  RoleGroup,
  StatusKind,
  Tag,
  TargetPriority,
  TurretDef,
  UnitDef,
} from '@/contracts';
import {
  BP,
  MILLI,
  PPM,
  TICKS_PER_SECOND,
  assert,
  fieldPulses,
  fortEconomyOf,
  fortPadRules,
  msToTicks,
  powerEconomyOf,
  powerReachRules,
  type FortPadRules,
  type PowerReachRules,
} from '@/core';
import { researchRules, type ResearchSimRules } from './researchRules';

/** Tag bit flags (DESIGN A2.6). */
export const TAG: Readonly<Record<Tag, number>> = {
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
  structure: 1024,
};

/**
 * The battle numbers `CompiledContent` has no contract field for (DESIGN A2.1-A2.11, A5.7). WP1's
 * compiled content carries them as `content.battle` (`src/content/raw/economy.ts`), and so does the
 * shim's output; the sim reads them structurally because it may not import the content layer (B2).
 */
export interface BattleRulesLike {
  /** Mid-lane p, lu (A2.1): power auto-aim fallback. */
  midLane: number;
  /** Default windups in percent of the interval, for attacks that state none (A2.7). */
  windupPct: { melee: number; ranged: number; turret: number };
  /** Knockback resist of Brace units and air units, bp (A2.7). */
  braceKnockbackResistBp: number;
  airKnockbackResistBp: number;
  /** Modernise credit: the share of the old turret's price taken off the new one, bp (A2.3, A2.8). */
  moderniseCreditBp: number;
  /** XP cap in the final age of the format, whole XP (A2.4). */
  finalAgeXpCap: number;
  /** Siege base decay is applied in steps of this period, ms (A2.10). */
  siegeDecayStepMs: number;
  /** Stampede start when the caster has no ground units, p in lu (A5.7). */
  stampedeFallbackP: number;
}

/** DESIGN values, used for content without a `battle` table (the contract fakes) and for missing fields. */
export const DEFAULT_BATTLE: Readonly<BattleRulesLike> = {
  midLane: 1000,
  windupPct: { melee: 40, ranged: 50, turret: 0 },
  braceKnockbackResistBp: BP,
  airKnockbackResistBp: BP,
  moderniseCreditBp: 5000,
  finalAgeXpCap: 1650,
  siegeDecayStepMs: 1000,
  stampedeFallbackP: 200,
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** A positive integer field, or `fallback` for content that predates it (contract fakes, old fixtures). */
function posOr(v: unknown, fallback: number): number {
  return isNum(v) && v > 0 ? Math.trunc(v) : fallback;
}

/** A non-negative integer field, or `fallback` for content that predates it. */
function nonNegOr(v: unknown, fallback: number): number {
  return isNum(v) && v >= 0 ? Math.trunc(v) : fallback;
}

/**
 * DESIGN values of the A16.4/A17 economy fields, for content that predates them (old fixtures and
 * hand-built test content): walking ×1.25 (A17.2), Siege forced march ×1.2 (A17.3), a three-wide front
 * (A16.4 L4) and a 60 lu siege crowd (A16.4 step 2).
 */
export const DEFAULT_MARCH_BP = 12500;
export const DEFAULT_SIEGE_MOVE_BP = 12000;
export const DEFAULT_FRONT_WIDTH = 3;
export const DEFAULT_GATE_CROWD_LU = 60;

/** The Crumble rope's dead band when the content has none (A2.10.1: 40 lu). */
export const DEFAULT_ROPE_DEAD_BAND_LU = 40;
/** DESIGN A18.2 / A18.4.2 values for content that predates them. */
export const DEFAULT_TURRET_HARD_CAP_LU = 560;
export const DEFAULT_HOLD_MAX_LU = 800;
export const DEFAULT_HOLD_SNAP_LU = 20;
export const DEFAULT_FLAG_MOVE_MS = 1000;
export const DEFAULT_FALLBACK_P_LU = 200;
export const DEFAULT_CAPS: Readonly<EconomyRules['statCaps']> = { damageBp: 3500, takenBp: 3500, hpBp: 3000, attackSpeedBp: 2500, speedBp: 2000, rangeLu: 60 };

/** The walking speed multiplier (A17.2, `economy.marchSpeedBp`). */
function marchBp(content: CompiledContent): number {
  return posOr((content.economy as { marchSpeedBp?: unknown }).marchSpeedBp, DEFAULT_MARCH_BP);
}

/** The content's battle table, field by field, falling back to {@link DEFAULT_BATTLE}. */
export function battleOf(content: CompiledContent): BattleRulesLike {
  const b = (content as { battle?: unknown }).battle;
  const d = DEFAULT_BATTLE;
  if (b === null || typeof b !== 'object') return { ...d, windupPct: { ...d.windupPct } };
  const o = b as Partial<Record<keyof BattleRulesLike, unknown>>;
  const w = (o.windupPct ?? {}) as Partial<Record<'melee' | 'ranged' | 'turret', unknown>>;
  const n = (k: Exclude<keyof BattleRulesLike, 'windupPct'>): number => {
    const v = o[k];
    return isNum(v) ? v : d[k];
  };
  return {
    midLane: n('midLane'),
    windupPct: {
      melee: isNum(w.melee) ? w.melee : d.windupPct.melee,
      ranged: isNum(w.ranged) ? w.ranged : d.windupPct.ranged,
      turret: isNum(w.turret) ? w.turret : d.windupPct.turret,
    },
    braceKnockbackResistBp: n('braceKnockbackResistBp'),
    airKnockbackResistBp: n('airKnockbackResistBp'),
    moderniseCreditBp: n('moderniseCreditBp'),
    finalAgeXpCap: n('finalAgeXpCap'),
    siegeDecayStepMs: n('siegeDecayStepMs'),
    stampedeFallbackP: n('stampedeFallbackP'),
  };
}

/** "Heavy hit" threshold for the `hit.heavy` flag: ≥ 15% of the victim's max HP (DESIGN A12). */
export const HEAVY_HIT_BP = 1500;
/** Density scan step for `densest` targeting and power auto-aim (DESIGN A2.7, A2.9): 10 lu. */
export const DENSE_SCAN_STEP = 10 * MILLI;

export type AreaKind = 'single' | 'splash' | 'cleave' | 'chain' | 'pierce' | 'line' | 'gateZone' | 'followBehind';

/** A status to apply, with its duration in ticks. */
export interface StatusRules {
  kind: StatusKind;
  magnitudeBp: number;
  ticks: number;
  /** Whole-number pool (shields) before level or loadout scaling; 0 when unused. */
  amount: number;
  frozen: boolean;
}

/** One attack in runtime units. Distances in mlu, times in ticks, damage still whole (scaled at spawn). */
export interface AttackRules {
  damage: number;
  vsBaseDamage: number;
  intervalTicks: number;
  windupPct: number;
  range: number;
  minRange: number;
  hitsGround: boolean;
  hitsAir: boolean;
  /** No projectile: the impact is scheduled directly (DESIGN A2.7 step 2). */
  melee: boolean;
  /** Instant effect: impact on the next tick (DESIGN A2.7 Projectiles). */
  instant: boolean;
  /** Projectile speed in lu/s (0 for melee and instant). */
  speed: number;
  /** Projectile visual or instant effect id, for `projectileFired`. */
  visualId: string;
  area: AreaKind;
  /** Splash radius (centre distance), mlu. */
  radius: number;
  /** Pierce / cleave / chain count including the primary. */
  count: number;
  /** Pierce length, cleave reach, chain hop, line length from the gate, gate zone radius or follow-behind reach, mlu. */
  reach: number;
  maxTargets: number;
  volley: number;
  scatter: number;
  mods: readonly DamageMod[];
  priority: TargetPriority;
  onHit: readonly StatusRules[];
  drag: number;
  pullRadius: number;
  pullFracBp: number;
  dmgType: DmgType;
}

export interface UnitRules {
  id: CardId;
  idx: number;
  def: UnitDef;
  age: AgeId;
  /** `AgeDef.index` of the card's age (underdog rule, A2.3). */
  ageIdx: number;
  group: RoleGroup;
  cost: number;
  pop: number;
  trainTicks: number;
  hp: number;
  /** Move speed in mlu per tick. */
  speed: number;
  width: number;
  half: number;
  kbResistBp: number;
  tags: number;
  air: boolean;
  legendary: boolean;
  ranged: boolean;
  /** Attacks, riders appended (one entry per rider). */
  attacks: AttackRules[];
  /** Longest attack range (mlu), used by the overtaking rule. */
  maxRange: number;
  riders: { count: number; spawn: CardId } | null;
  firstHit: { multBp: number; knockback: number; idleTicks: number } | null;
  /** A card aura (A2.7); `foe` = a Dread aura on enemy ground units (Bronze wave M4). */
  aura: { radius: number; status: StatusRules; foe: boolean } | null;
  heal: { poolPerPulse: number; radius: number; targets: number } | null;
  pounce: { slot: number; search: number; cooldown: number; leapTicks: number; biteBp: number } | null;
  deathExplode: { damage: number; radius: number } | null;
  roar: { slot: number; every: number; radius: number; maxTargets: number; shield: number; ticks: number } | null;
  strike: {
    slot: number;
    every: number;
    search: number;
    delay: number;
    damage: number;
    radius: number;
    lockout: number;
  } | null;
  emp: { slot: number; every: number; trigger: number; radius: number; stunTicks: number } | null;
  timeStop: { slot: number; every: number; radius: number; freeze: number; legendaryFreeze: number; frozen: boolean } | null;
  /** Frenzy (X0 M2): self damage and attack speed bonus while HP ≤ `belowHpBp` of max. */
  frenzy: { belowHpBp: number; damageBp: number; attackSpeedBp: number } | null;
  /** Summoner (X0 M3): a free summon every `everyTicks` (first after `firstTicks`) while fewer than `maxAlive` live. */
  summon: { slot: number; card: CardId; firstTicks: number; everyTicks: number; maxAlive: number } | null;
  /** Squad (X0 M1): members per train command (1 for every other card). */
  squad: number;
  /** One unit's share of the card cost (cost ÷ squad; 0 for summons): bounty, scoring and auto-aim value. */
  value: number;
  /** Innate shield; `regenPerTick` in centi at level 1. */
  innate: { amount: number; regenPerTick: number; delayTicks: number } | null;
  resist: { minRange: number; bp: number } | null;
  brace: boolean;
  siegeOnly: boolean;
  bomber: { window: number } | null;
  follow: { behind: number; soloMax: number } | null;
  /** A wall, tower or camp twin (A16.14.8): its fort rules; null for every other unit. */
  fort: FortRules | null;
  /**
   * A free summon: a camp's levy (A16.14.3) or a summoner's summon (X0 M3). Always marches, ranks last
   * in power caps, no pop and no bounty.
   */
  levy: boolean;
  /**
   * The ×2 structure mod this unit's attacks carry against forts (bp, 0 = none; A16.14.2): Heavy,
   * Legendary, siege and artillery units. Also used for its ability impacts (death explosions, strikes).
   */
  structureBp: number;
}

/** A fort card in runtime units (DESIGN A16.14): distances in mlu, times in ticks, HP and damage whole. */
export interface FortRules {
  id: CardId;
  def: FortDef;
  age: AgeId;
  ageIdx: number;
  kind: FortDef['fortKind'];
  /** Whole gold. */
  cost: number;
  pop: number;
  /** Max HP at L1, whole (0 for traps). */
  hp: number;
  /** Body half-width, mlu (0 for traps). */
  half: number;
  pads: 'home' | 'any';
  /** A camp's levy card and timing. */
  camp: { spawn: CardId; everyTicks: number; firstTicks: number; maxAlive: number } | null;
  trap: {
    charges: number;
    trigger: number;
    betweenTicks: number;
    armTicks: number;
    lifeTicks: number;
    damage: number;
    radius: number;
    maxTargets: number;
    statuses: StatusRules[];
  } | null;
  /** Sandbag Bunker: own ground units within `behind` behind it take `bp` less from attacks with range ≥ 100. */
  cover: { behind: number; bp: number } | null;
  /** Hardlight Barrier: regen bp of max HP per 20 ticks after `delayTicks` without damage. */
  regen: { bpPerStep: number; delayTicks: number } | null;
}

/** The fort rules of a match (DESIGN A16.14.2, spec 13) in runtime units; null for content without forts. */
export interface FortSimRules {
  /** Pads and placement rules in mlu (core `fortPads`). */
  pads: FortPadRules;
  rechargeTicks: number;
  firstReadyTicks: number;
  scaffoldHpBp: number;
  decayStartTicks: number;
  /** Decay per 20-tick step, bp of max HP; Siege multiplies it by `siegeDecayBp`. */
  decayBpPerStep: number;
  siegeDecayBp: number;
  creditTicks: number;
  siegeTakenBp: number;
  rangedTakenBp: number;
  /** "Range ≥ 100": the compiled base range of the attack, mlu. */
  rangedMin: number;
  bountyGoldBp: number;
  bountyXpBp: number;
  contact: number;
  contactMax: number;
}

export interface TurretRules {
  id: CardId;
  idx: number;
  def: TurretDef;
  age: AgeId;
  ageIdx: number;
  cost: number;
  attack: AttackRules;
}

export type PowerEffectRules =
  | {
      kind: 'barrage';
      count: number;
      durationTicks: number;
      zone: number;
      damage: number;
      radius: number;
      jitter: number;
      hitsAir: boolean;
      hitsGround: boolean;
    }
  | { kind: 'sweep'; zone: number; durationTicks: number; damage: number; halfWidth: number; hitsAir: boolean }
  | {
      kind: 'stampede';
      runners: number;
      spacingTicks: number;
      distance: number;
      step: number;
      damage: number;
      knockback: number;
      maxHits: number;
    }
  | { kind: 'buffAll'; statuses: StatusRules[]; maxTargets: number }
  /** `allyMax`: the most own units that get the ally damage bonus (A2.9.5: 8). */
  | { kind: 'cloud'; halfWidth: number; durationTicks: number; missBp: number; allyDamageBp: number; allyMax: number }
  | { kind: 'paradrop'; card: CardId; count: number; beyond: number; fallbackP: number }
  /** A ground field (A2.9.7): `pulses` pulses 10 ticks apart; statuses, damage (whole), pull (bp). */
  | { kind: 'field'; halfZone: number; pulses: number; hitsAir: boolean; statuses: StatusRules[]; damage: number; pullBp: number }
  /** A homing strike on one locked target (A2.9.7). */
  | { kind: 'strike'; shots: number; intervalTicks: number; damage: number; hitsAir: boolean }
  /** Every enemy mount is silenced for `ticks` (A2.9.7). */
  | { kind: 'suppress'; ticks: number };

export interface PowerRules {
  id: CardId;
  idx: number;
  def: PowerDef;
  age: AgeId;
  slot: PowerSlot;
  reach: PowerReach;
  family: PowerFamily;
  /** Whole gold per cast before modifiers (A2.9.2). */
  cost: number;
  reloadTicks: number;
  telegraphTicks: number;
  /** The cap (A2.9.5): enemy units for damage and control, own units for buffs and the cloud; 0 = none. */
  maxTargets: number;
  /** Zone width shown by the telegraph (mlu); 0 for powers without a zone. */
  zone: number;
  dmgType: DmgType;
  /** Damages or controls enemy units (auto-aim with nothing eligible is rejected before payment, A2.9.4). */
  harmful: boolean;
  effect: PowerEffectRules;
}

/** Age Power rules in runtime units (A2.9.3-A2.9.6). */
export interface PowerEconRules {
  startPpm: number;
  emptyReloadTicks: number;
  strikeEpicBp: number;
  legendaryControlBp: number;
  lockTicks: number;
  /** Reach rules in mlu, own frame (core `powerReach`). */
  reach: PowerReachRules;
}

export interface FormatRules {
  id: FormatId;
  ages: readonly AgeId[];
  /** XP (whole) needed to leave each age of the format; null for the final age. */
  thresholds: readonly (number | null)[];
  overdriveTick: number | null;
  siegeTick: number | null;
  finalBellTick: number | null;
  retreatTick: number | null;
  /**
   * Last Base Standing (A2.10.1): the Siege steps with their start ticks, in order (the first is Siege I
   * at `siegeTick`); null in every format with a Final Bell.
   */
  escalation: readonly EscalationRt[] | null;
}

/** One Siege step of Last Base Standing in ticks (A2.10.1); multipliers in bp, the rope in bp per second. */
export interface EscalationRt {
  tick: number;
  baseDamageBp: number;
  turretDamageBp: number;
  crumbleBpPerSec: number;
}

/** Economy and rule constants in runtime units (DESIGN A2.3-A2.11). */
export interface EconRules {
  startGold: number;
  passiveGoldPerTick: number;
  passiveXpPerTick: number;
  mountCosts: readonly number[];
  mountCount: number;
  bountyGoldBp: number;
  bountyXpBp: number;
  powerKillGoldBp: number;
  powerKillXpBp: number;
  ownLossXpBp: number;
  underdogBp: number;
  baseDamageXpPerPct: number;
  xpCapBp: number;
  popCap: number;
  queueMax: number;
  legendaryLimit: number;
  sellRefundBp: number;
  /** Modernise: the new price minus this share of the old turret's price (A2.3). */
  moderniseCreditBp: number;
  turretRangeCap: number;
  /** A18.2: turret range with research and modifiers never exceeds this (mlu from the own gate). */
  turretRangeHardCap: number;
  turretBuildTicks: number;
  turretSellTicks: number;
  ascendTicks: number;
  evolveHealBp: number;
  vanguardCount: number;
  /** Each slot's progress at an evolve becomes min(progress, this), ppm (A2.9.3). */
  powerCarryCap: number;
  power: PowerEconRules;
  overchargeXp: number;
  overchargePpm: number;
  /** XP cap (milli) in the final age of the format (A2.4). */
  finalAgeXpCap: number;
  /** Stampede start without own ground units, own-side p in mlu (A5.7). */
  stampedeFallbackP: number;
  overdrive: { baseGoldBp: number; xpBp: number; powerBp: number };
  /** Siege (A2.10); `moveSpeedBp` is the forced march (A17.3), `gateCrowd` the siege crowd in mlu (A16.4 step 2). */
  siege: { turretDamageBp: number; baseDamageBp: number; decayBpPerStep: number; decayStepTicks: number; moveSpeedBp: number; gateCrowd: number; ropeDeadBand: number };
  lastStand: { thresholdBp: number; autoBp: number; radius: number; damagePerP: number; knockback: number; chargeTicks: number };
  spawnP: number;
  holdLine: number;
  holdRetreatSpeedBp: number;
  leash: number;
  spacingBp: number;
  retargetTicks: number;
  retargetCloser: number;
  selfDefense: number;
  stanceCooldownTicks: number;
  /** A18.4.2 Hold flag range and snap (mlu), flag move cooldown (ticks); Fall back line (mlu). */
  holdMin: number;
  holdMax: number;
  holdSnap: number;
  flagMoveTicks: number;
  fallbackP: number;
  /** A18.4.2 engagement freshness: ticks with no target before the next hit is a first hit. */
  freshTicks: number;
  /** A18.2 rule 4 hard stacking caps (bp; `range` in mlu). */
  caps: { damageBp: number; takenBp: number; hpBp: number; attackSpeedBp: number; speedBp: number; range: number };
  emoteCooldownTicks: number;
  areaSecondaryBp: number;
  areaMaxTargets: number;
  healLegendaryBp: number;
  legendaryPowerDamageBp: number;
  zoneMin: number;
  zoneMax: number;
  midLane: number;
  drawGapBp: number;
  levelStepBp: number;
  maxLevel: number;
  healPulseTicks: number;
  /** Units that may stand side by side at the front of a file (A2.7, A16.4 L4). */
  frontWidth: number;
  /** The falling gate (A16.4 stall fix; Overdrive and Siege): `dist` in mlu from the own gate (0 = off), base loss in bp of the unit's max HP. */
  gateFall: { dist: number; hpBp: number };
  /** The open gate (A16.4 stall fix): mlu from the own gate that must hold no own ground unit (0 = off). */
  openGate: number;
  /** Forts (A16.14); null when the content has no `economy.fort`. */
  fort: FortSimRules | null;
}

export interface SimRules {
  content: CompiledContent;
  econ: EconRules;
  units: Readonly<Record<CardId, UnitRules>>;
  unitList: readonly UnitRules[];
  turrets: Readonly<Record<CardId, TurretRules>>;
  turretList: readonly TurretRules[];
  powers: Readonly<Record<CardId, PowerRules>>;
  formats: Readonly<Record<FormatId, FormatRules>>;
  /** `AgeDef.index` per age. */
  ageIdx: Readonly<Record<AgeId, number>>;
  /** Base max HP per age, whole. */
  baseHp: Readonly<Record<AgeId, number>>;
  /** Age power scale P in bp per age. */
  pBp: Readonly<Record<AgeId, number>>;
  /** The Common Infantry card of each age (Vanguard, A2.4), or null. */
  vanguard: Readonly<Record<AgeId, CardId | null>>;
  /** Every id an `emote` command may carry (see {@link emoteIds}). */
  emotes: ReadonlySet<string>;
  /** The War Council (A18.5), see `research.ts`. */
  research: ResearchSimRules;
  /** Fort cards (A16.14), traps included; empty for content without forts. */
  forts: Readonly<Record<CardId, FortRules>>;
}

/** The six starter emotes (B15 `BaseEmoteId`). */
const BASE_EMOTES = ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'] as const;

/**
 * The ids an `emote` command may carry: the six starter emotes plus the collected emotes
 * (`emote.<id>`) and fixed quotes (`quote.<id>`) the content lists (A18.9.4). `cosmetics` is an open
 * slot of the contract, so it is read with a shape check; content without it (the fakes) gets the six.
 * Anything else is rejected, so events only ever carry known ids.
 */
export function emoteIds(content: CompiledContent): ReadonlySet<string> {
  const out = new Set<string>(BASE_EMOTES);
  const cos = content.cosmetics as { collections?: { items?: unknown } } | null | undefined;
  const items = cos?.collections?.items;
  if (Array.isArray(items)) {
    for (const x of items as { id?: unknown; collection?: unknown }[]) {
      if (typeof x.id === 'string' && (x.collection === 'emote' || x.collection === 'quote')) out.add(`${x.collection}.${x.id}`);
    }
  }
  return out;
}

const cache = new WeakMap<CompiledContent, SimRules>();

/** Returns the runtime rules for `content`, compiling them once per content object. */
export function rulesFor(content: CompiledContent): SimRules {
  let r = cache.get(content);
  if (!r) {
    r = compileRules(content);
    cache.set(content, r);
  }
  return r;
}

/** lu to mlu. */
const mlu = (lu: number): number => Math.round(lu * MILLI);

/** Sorted keys of a record, so iteration order never depends on insertion order. */
function sortedKeys<T extends string>(o: Readonly<Record<T, unknown>>): T[] {
  return (Object.keys(o) as T[]).sort();
}

function statusRules(s: { kind: StatusKind; magnitudeBp: number; durationMs: number; amount?: number; frozen?: boolean }): StatusRules {
  return {
    kind: s.kind,
    magnitudeBp: s.magnitudeBp,
    ticks: s.durationMs > 0 ? msToTicks(s.durationMs) : 0,
    amount: s.amount ?? 0,
    frozen: s.frozen ?? false,
  };
}

function tagMask(tags: readonly Tag[]): number {
  let m = 0;
  for (const t of tags) m |= TAG[t];
  return m;
}

function attackRules(
  a: AttackDef,
  isTurret: boolean,
  areaMaxTargets: number,
  rangeCap: number | null,
  windups: BattleRulesLike['windupPct'],
): AttackRules {
  const proj = a.projectile;
  const melee = proj === undefined;
  const instant = proj !== undefined && 'instant' in proj;
  let area: AreaKind = 'single';
  let count = 1;
  let reach = 0;
  if (a.splashRadius !== undefined) area = 'splash';
  else if (a.pierce) {
    area = 'pierce';
    count = a.pierce.count;
    reach = mlu(a.pierce.length);
  } else if (a.cleave) {
    area = 'cleave';
    count = a.cleave.count;
    reach = mlu(a.cleave.reach);
  } else if (a.chain) {
    area = 'chain';
    count = a.chain.count;
    reach = mlu(a.chain.hop);
  } else if (a.line) {
    area = 'line';
    reach = mlu(a.line.fromGate);
  } else if (a.gateZone) {
    area = 'gateZone';
    reach = mlu(a.gateZone.radius);
  } else if (a.followBehind !== undefined) {
    area = 'followBehind';
    reach = mlu(a.followBehind);
  }
  const range = mlu(a.range);
  const windupDefault = isTurret ? windups.turret : melee ? windups.melee : windups.ranged;
  return {
    damage: a.damage,
    vsBaseDamage: a.vsBaseDamage ?? a.damage,
    intervalTicks: msToTicks(a.intervalMs),
    windupPct: a.windupPct ?? windupDefault,
    range: rangeCap === null ? range : Math.min(range, rangeCap),
    minRange: mlu(a.minRange ?? 0),
    hitsGround: a.hitsGround,
    hitsAir: a.hitsAir,
    melee,
    instant,
    speed: proj && !instant && 'speed' in proj ? proj.speed : 0,
    visualId: proj ? ('instant' in proj ? proj.effectId : proj.visualId) : '',
    area,
    radius: mlu(a.splashRadius ?? 0),
    count,
    reach,
    maxTargets: a.maxTargets ?? (area === 'single' ? 1 : areaMaxTargets),
    volley: a.volley ?? 1,
    scatter: mlu(a.scatter ?? 0),
    mods: a.mods ?? [],
    priority: a.priority ?? 'front',
    onHit: (a.onHit ?? []).map(statusRules),
    drag: mlu(a.drag?.distance ?? 0),
    pullRadius: mlu(a.pull?.radius ?? 0),
    pullFracBp: a.pull?.fractionBp ?? 0,
    dmgType: a.dmgType,
  };
}

function unitRules(def: UnitDef, idx: number, content: CompiledContent, battle: BattleRulesLike): UnitRules {
  const e = content.economy;
  const width = mlu(e.sizes[def.size]);
  const tags = tagMask(def.tags);
  const air = (tags & TAG.air) !== 0;
  const brace = def.abilities.some((a) => a.kind === 'brace');
  const attacks = def.attacks.map((a) => attackRules(a, false, e.areaMaxTargets, null, battle.windupPct));
  // Knockback resist (A2.7): by size, or the Brace / air value; the strongest applies.
  let kbResistBp = e.knockbackResistBp[def.size];
  if (air && battle.airKnockbackResistBp > kbResistBp) kbResistBp = battle.airKnockbackResistBp;
  if (brace && battle.braceKnockbackResistBp > kbResistBp) kbResistBp = battle.braceKnockbackResistBp;
  const r: UnitRules = {
    id: def.id,
    idx,
    def,
    age: def.age,
    ageIdx: content.ages[def.age].index,
    group: def.group,
    cost: def.cost,
    pop: def.pop,
    trainTicks: msToTicks(def.trainMs),
    hp: def.hp,
    // A17.15: trunc(speed × 1,000 / 20 × marchSpeedBp / 10,000), applied once here (A17.2 walking ×1.25).
    speed: Math.trunc((Math.trunc((def.speed * MILLI) / TICKS_PER_SECOND) * marchBp(content)) / BP),
    width,
    half: Math.trunc(width / 2),
    kbResistBp,
    tags,
    air,
    legendary: (tags & TAG.legendary) !== 0,
    ranged: (tags & TAG.ranged) !== 0,
    attacks,
    maxRange: 0,
    riders: null,
    firstHit: null,
    aura: null,
    heal: null,
    pounce: null,
    deathExplode: null,
    roar: null,
    strike: null,
    emp: null,
    timeStop: null,
    frenzy: null,
    summon: null,
    squad: def.squad?.count ?? 1,
    value: Math.trunc(def.cost / (def.squad?.count ?? 1)),
    innate: null,
    resist: null,
    brace,
    siegeOnly: false,
    bomber: null,
    follow: null,
    fort: null,
    levy: def.levy === true || def.summon === true,
    structureBp: 0,
  };
  def.abilities.forEach((ab: AbilityDef, slot) => {
    switch (ab.kind) {
      case 'firstHitBonus':
        r.firstHit = { multBp: ab.multBp, knockback: mlu(ab.knockback), idleTicks: msToTicks(ab.idleResetMs) };
        break;
      case 'aura':
        r.aura = { radius: mlu(ab.radius), status: statusRules(ab.status), foe: ab.foe === true };
        break;
      case 'heal':
        // Per-pulse pool = hpPerSec × pulseMs / 1,000 (A2.7), in centi at level 1. Pulses run on the
        // shared heal grid (`ticks.healPulse`), so pulseMs is the grid period.
        r.heal = {
          poolPerPulse: Math.trunc((ab.hpPerSec * 100 * ab.pulseMs) / 1000),
          radius: mlu(ab.radius),
          targets: ab.targets,
        };
        break;
      case 'pounce':
        r.pounce = {
          slot,
          search: mlu(ab.searchRange),
          cooldown: msToTicks(ab.cooldownMs),
          leapTicks: msToTicks(ab.leapMs),
          biteBp: ab.firstBiteBp,
        };
        break;
      case 'riders':
        r.riders = { count: ab.count, spawn: ab.onDeathSpawn };
        for (let i = 0; i < ab.count; i += 1) attacks.push(attackRules(ab.attack, false, e.areaMaxTargets, null, battle.windupPct));
        break;
      case 'onDeathExplode':
        r.deathExplode = { damage: ab.damage, radius: mlu(ab.radius) };
        break;
      case 'periodicShieldAura':
        r.roar = {
          slot,
          every: msToTicks(ab.everyMs),
          radius: mlu(ab.radius),
          maxTargets: ab.maxTargets,
          shield: ab.shield,
          ticks: msToTicks(ab.durationMs),
        };
        break;
      case 'callStrike':
        r.strike = {
          slot,
          every: msToTicks(ab.everyMs),
          search: mlu(ab.searchRange),
          delay: msToTicks(ab.delayMs),
          damage: ab.damage,
          radius: mlu(ab.radius),
          lockout: msToTicks(ab.sideLockoutMs),
        };
        break;
      case 'emp':
        r.emp = {
          slot,
          every: msToTicks(ab.everyMs),
          trigger: mlu(ab.triggerRadius),
          radius: mlu(ab.radius),
          stunTicks: msToTicks(ab.stunMs),
        };
        break;
      case 'timeStop':
        r.timeStop = {
          slot,
          every: msToTicks(ab.everyMs),
          radius: mlu(ab.radius),
          freeze: msToTicks(ab.freezeMs),
          legendaryFreeze: msToTicks(ab.legendaryFreezeMs),
          frozen: ab.frozen !== false,
        };
        break;
      case 'frenzy':
        r.frenzy = { belowHpBp: ab.belowHpBp, damageBp: ab.damageBp, attackSpeedBp: ab.attackSpeedBp };
        break;
      case 'summon':
        r.summon = { slot, card: ab.card, firstTicks: msToTicks(ab.firstMs), everyTicks: msToTicks(ab.everyMs), maxAlive: ab.maxAlive };
        break;
      case 'innateShield':
        r.innate = {
          amount: ab.amount,
          regenPerTick: Math.trunc((ab.regenPerSec * 100) / TICKS_PER_SECOND),
          delayTicks: msToTicks(ab.delayMs),
        };
        break;
      case 'resist':
        r.resist = { minRange: mlu(ab.minSourceRange), bp: ab.bp };
        break;
      case 'brace':
        break;
      case 'siegeOnly':
        r.siegeOnly = true;
        break;
      case 'bomber':
        r.bomber = { window: mlu(ab.dropWindow) };
        break;
      case 'followSupport':
        r.follow = { behind: mlu(ab.behindFront), soloMax: mlu(ab.soloMaxP) };
        break;
    }
  });
  for (const a of r.attacks) {
    if (a.range > r.maxRange) r.maxRange = a.range;
    for (const m of a.mods) if (m.vs === 'structure' && m.bp > r.structureBp) r.structureBp = m.bp;
  }
  return r;
}

/** A fort card in runtime units. */
function fortRules(def: FortDef, content: CompiledContent): FortRules {
  const e = content.economy;
  const width = def.size ? mlu(e.sizes[def.size]) : 0;
  const t = def.trap;
  return {
    id: def.id,
    def,
    age: def.age,
    ageIdx: content.ages[def.age].index,
    kind: def.fortKind,
    cost: def.cost,
    pop: def.pop,
    hp: def.hp,
    half: Math.trunc(width / 2),
    pads: def.pads,
    camp: def.camp
      ? { spawn: def.camp.spawn, everyTicks: msToTicks(def.camp.everyMs), firstTicks: msToTicks(def.camp.firstMs), maxAlive: def.camp.maxAlive }
      : null,
    trap: t
      ? {
          charges: t.charges,
          trigger: mlu(t.triggerLu),
          betweenTicks: msToTicks(t.betweenMs),
          armTicks: msToTicks(t.armMs),
          lifeTicks: msToTicks(t.lifeMs),
          damage: t.damage,
          radius: mlu(t.radius),
          maxTargets: t.maxTargets,
          statuses: t.statuses.map(statusRules),
        }
      : null,
    cover: def.cover ? { behind: mlu(def.cover.behindLu), bp: def.cover.rangedTakenBp } : null,
    regen: def.regen ? { bpPerStep: def.regen.bpPerSec, delayTicks: msToTicks(def.regen.delayMs) } : null,
  };
}

/** The fort rules of the content (A16.14.2) in runtime units, or null without `economy.fort`. */
function fortSimRules(content: CompiledContent): FortSimRules | null {
  const f = fortEconomyOf(content.economy);
  const pads = fortPadRules(content.economy, MILLI);
  if (!f || !pads) return null;
  return {
    pads,
    rechargeTicks: msToTicks(f.rechargeMs),
    firstReadyTicks: f.firstReadyMs > 0 ? msToTicks(f.firstReadyMs) : 0,
    scaffoldHpBp: f.scaffoldHpBp,
    decayStartTicks: msToTicks(f.decayStartMs),
    decayBpPerStep: f.decayBpPerSec,
    siegeDecayBp: f.siegeDecayBp,
    creditTicks: msToTicks(f.decayCreditMs),
    siegeTakenBp: f.siegeTakenBp,
    rangedTakenBp: f.rangedTakenBp,
    rangedMin: mlu(f.rangedMinLu),
    bountyGoldBp: f.bountyGoldBp,
    bountyXpBp: f.bountyXpBp,
    contact: mlu(f.contactLu),
    contactMax: f.contactMax,
  };
}

function powerDmgType(kind: PowerDef['effect']['kind']): DmgType {
  if (kind === 'stampede') return 'blunt';
  if (kind === 'sweep') return 'laser';
  if (kind === 'strike') return 'pierce';
  return 'blast';
}

function powerRules(def: PowerDef, idx: number): PowerRules {
  const fx = def.effect;
  let effect: PowerEffectRules;
  let zone = 0;
  switch (fx.kind) {
    case 'barrage':
      zone = mlu(fx.zone);
      effect = {
        kind: 'barrage',
        count: fx.count,
        durationTicks: msToTicks(fx.durationMs),
        zone,
        damage: fx.damage,
        radius: mlu(fx.radius),
        jitter: fx.pattern === 'line' ? 0 : mlu(fx.jitter),
        hitsAir: fx.hitsAir,
        hitsGround: fx.hitsGround !== false,
      };
      break;
    case 'sweep':
      zone = mlu(fx.zone);
      effect = {
        kind: 'sweep',
        zone,
        durationTicks: msToTicks(fx.durationMs),
        damage: fx.damage,
        halfWidth: Math.trunc(mlu(fx.width) / 2),
        hitsAir: fx.hitsAir,
      };
      break;
    case 'stampede':
      zone = mlu(fx.distance);
      effect = {
        kind: 'stampede',
        runners: fx.runners,
        spacingTicks: msToTicks(fx.spacingMs),
        distance: zone,
        step: Math.trunc((fx.speed * MILLI) / TICKS_PER_SECOND),
        damage: fx.damage,
        knockback: mlu(fx.knockback),
        maxHits: fx.maxHitsPerEnemy,
      };
      break;
    case 'buffAll':
      effect = { kind: 'buffAll', statuses: fx.statuses.map(statusRules), maxTargets: fx.maxTargets > 0 ? fx.maxTargets : BUFF_MAX_TARGETS };
      break;
    case 'cloud':
      zone = mlu(fx.width);
      effect = {
        kind: 'cloud',
        halfWidth: Math.trunc(zone / 2),
        durationTicks: msToTicks(fx.durationMs),
        missBp: fx.enemyMissBp,
        allyDamageBp: fx.allyDamageBp,
        allyMax: def.maxTargets !== undefined && def.maxTargets > 0 ? def.maxTargets : BUFF_MAX_TARGETS,
      };
      break;
    case 'paradrop':
      effect = { kind: 'paradrop', card: fx.card, count: fx.count, beyond: mlu(fx.beyondFront), fallbackP: mlu(fx.fallbackP) };
      break;
    case 'field':
      zone = mlu(fx.zone);
      effect = {
        kind: 'field',
        halfZone: Math.trunc(zone / 2),
        pulses: fieldPulses(fx.durationMs),
        hitsAir: fx.hitsAir,
        statuses: (fx.statuses ?? []).map(statusRules),
        damage: fx.damagePerPulse ?? 0,
        pullBp: fx.pullBp ?? 0,
      };
      break;
    case 'strike':
      effect = { kind: 'strike', shots: fx.shots, intervalTicks: fx.intervalMs > 0 ? msToTicks(fx.intervalMs) : 0, damage: fx.damage, hitsAir: fx.hitsAir };
      break;
    case 'suppress':
      effect = { kind: 'suppress', ticks: msToTicks(fx.durationMs) };
      break;
  }
  const harmful = fx.kind === 'barrage' || fx.kind === 'sweep' || fx.kind === 'stampede' || fx.kind === 'field' || fx.kind === 'strike';
  return {
    id: def.id,
    idx,
    def,
    age: def.age,
    slot: def.slot,
    reach: def.reach,
    family: def.family,
    cost: def.cost,
    reloadTicks: msToTicks(def.reloadMs),
    telegraphTicks: msToTicks(def.telegraphMs),
    maxTargets: capOf(def, effect),
    zone,
    dmgType: powerDmgType(fx.kind),
    harmful,
    effect,
  };
}

/** Buffs and the cloud's ally bonus affect at most this many own units by default (A2.9.5). */
export const BUFF_MAX_TARGETS = 8;

/** The cap of a power (A2.9.5): the card's `maxTargets`; a buff's effect cap; strikes always 1; 0 = none. */
function capOf(def: PowerDef, effect: PowerEffectRules): number {
  if (effect.kind === 'strike') return 1;
  if (def.maxTargets !== undefined && def.maxTargets > 0) return def.maxTargets;
  if (effect.kind === 'buffAll') return effect.maxTargets;
  if (effect.kind === 'cloud') return effect.allyMax;
  return 0;
}

function powerEcon(e: EconomyRules): PowerEconRules {
  const pe = powerEconomyOf(e);
  return {
    startPpm: Math.trunc((PPM * pe.startBp) / BP),
    emptyReloadTicks: msToTicks(pe.emptyReloadMs),
    strikeEpicBp: pe.strikeEpicBp,
    legendaryControlBp: pe.legendaryControlBp,
    lockTicks: pe.lockMs > 0 ? msToTicks(pe.lockMs) : 0,
    reach: powerReachRules(e, MILLI),
  };
}

function econRules(content: CompiledContent, battle: BattleRulesLike): EconRules {
  const e = content.economy;
  const t = content.ticks;
  // A18 fields read with a shape check, so content that predates them (old fixtures) keeps working.
  const eo = e as Partial<EconomyRules>;
  const flag = eo.holdFlag as Partial<EconomyRules['holdFlag']> | undefined;
  const caps = eo.statCaps as Partial<EconomyRules['statCaps']> | undefined;
  const decayStepTicks = msToTicks(battle.siegeDecayStepMs);
  return {
    startGold: e.startGold * MILLI,
    passiveGoldPerTick: Math.trunc((e.passiveGoldPerSec * MILLI) / TICKS_PER_SECOND),
    passiveXpPerTick: Math.trunc((e.passiveXpPerSec * MILLI) / TICKS_PER_SECOND),
    mountCosts: e.mountCosts.map((c) => c * MILLI),
    mountCount: e.mountCosts.length,
    bountyGoldBp: e.bountyGoldBp,
    bountyXpBp: e.bountyXpBp,
    powerKillGoldBp: e.powerKillGoldBp,
    powerKillXpBp: e.powerKillXpBp,
    ownLossXpBp: e.ownLossXpBp,
    underdogBp: e.underdogBp,
    baseDamageXpPerPct: e.baseDamageXpPerPct,
    xpCapBp: e.xpCapBp,
    popCap: e.popCap,
    queueMax: e.queueMax,
    legendaryLimit: e.legendaryLimit,
    sellRefundBp: e.sellRefundBp,
    moderniseCreditBp: battle.moderniseCreditBp,
    turretRangeCap: mlu(e.turretRangeCap),
    turretRangeHardCap: mlu(posOr(eo.turretRangeHardCapLu, DEFAULT_TURRET_HARD_CAP_LU)),
    turretBuildTicks: t.turretBuild,
    turretSellTicks: t.turretSell,
    ascendTicks: t.ascend,
    evolveHealBp: e.evolveHealBp,
    vanguardCount: e.vanguardCount,
    powerCarryCap: Math.trunc((PPM * e.powerCarryCapBp) / BP),
    power: powerEcon(e),
    overchargeXp: e.overchargeXp * MILLI,
    overchargePpm: Math.trunc((PPM * e.overchargeBp) / BP),
    finalAgeXpCap: battle.finalAgeXpCap * MILLI,
    stampedeFallbackP: mlu(battle.stampedeFallbackP),
    overdrive: { ...e.overdrive },
    // A2.10: decay is applied every 20 ticks (1 s); the per-step loss is the per-second rate × the step.
    siege: {
      turretDamageBp: e.siege.turretDamageBp,
      baseDamageBp: e.siege.baseDamageBp,
      decayBpPerStep: Math.trunc((e.siege.decayBpPerSec * decayStepTicks) / TICKS_PER_SECOND),
      decayStepTicks,
      moveSpeedBp: posOr(e.siege.moveSpeedBp, DEFAULT_SIEGE_MOVE_BP),
      gateCrowd: mlu(nonNegOr(e.siege.gateCrowdLu, DEFAULT_GATE_CROWD_LU)),
      // A2.10.1: absent in content that predates Last Base Standing (only read in a format with steps)
      ropeDeadBand: mlu(nonNegOr(e.siege.ropeDeadBandLu, DEFAULT_ROPE_DEAD_BAND_LU)),
    },
    lastStand: {
      thresholdBp: e.lastStand.thresholdBp,
      autoBp: e.lastStand.autoBp,
      radius: mlu(e.lastStand.radius),
      damagePerP: e.lastStand.damagePerP,
      knockback: mlu(e.lastStand.knockback),
      chargeTicks: t.lastStandCharge,
    },
    spawnP: mlu(e.spawnP),
    holdLine: mlu(e.holdLine),
    holdRetreatSpeedBp: e.holdRetreatSpeedBp,
    leash: mlu(e.leash),
    spacingBp: e.spacingBp,
    retargetTicks: t.retarget,
    retargetCloser: mlu(e.retargetCloserLu),
    selfDefense: mlu(e.rangedSelfDefenseLu),
    stanceCooldownTicks: t.stanceCooldown,
    holdMin: mlu(posOr(flag?.minP, e.holdLine)),
    holdMax: mlu(posOr(flag?.maxP, DEFAULT_HOLD_MAX_LU)),
    holdSnap: mlu(posOr(flag?.snapLu, DEFAULT_HOLD_SNAP_LU)),
    flagMoveTicks: msToTicks(posOr(flag?.moveCooldownMs, DEFAULT_FLAG_MOVE_MS)),
    fallbackP: mlu(posOr(eo.fallbackP, DEFAULT_FALLBACK_P_LU)),
    freshTicks: t.firstHitIdle,
    caps: {
      damageBp: nonNegOr(caps?.damageBp, DEFAULT_CAPS.damageBp),
      takenBp: nonNegOr(caps?.takenBp, DEFAULT_CAPS.takenBp),
      hpBp: nonNegOr(caps?.hpBp, DEFAULT_CAPS.hpBp),
      attackSpeedBp: nonNegOr(caps?.attackSpeedBp, DEFAULT_CAPS.attackSpeedBp),
      speedBp: nonNegOr(caps?.speedBp, DEFAULT_CAPS.speedBp),
      range: mlu(nonNegOr(caps?.rangeLu, DEFAULT_CAPS.rangeLu)),
    },
    emoteCooldownTicks: msToTicks(e.emoteCooldownMs),
    areaSecondaryBp: e.areaSecondaryBp,
    areaMaxTargets: e.areaMaxTargets,
    healLegendaryBp: e.healLegendaryBp,
    legendaryPowerDamageBp: e.legendaryPowerDamageBp,
    zoneMin: mlu(e.powerZoneClamp[0]),
    zoneMax: mlu(e.powerZoneClamp[1]),
    midLane: mlu(battle.midLane),
    drawGapBp: e.drawGapBp,
    levelStepBp: e.levelStepBp,
    maxLevel: e.maxLevel,
    healPulseTicks: t.healPulse,
    frontWidth: posOr(e.frontWidth, DEFAULT_FRONT_WIDTH),
    // Off for content that predates it (the frozen golden fixture), so old replays keep their hashes.
    gateFall: { dist: mlu(nonNegOr(e.gateFall?.lu, 0)), hpBp: nonNegOr(e.gateFall?.hpBp, 0) },
    openGate: mlu(nonNegOr(e.openGateLu, 0)),
    fort: fortSimRules(content),
  };
}

function formatRules(content: CompiledContent, id: FormatId): FormatRules {
  const f = content.formats[id];
  assert(f !== undefined, `unknown format ${id}`);
  const toTick = (ms: number | null): number | null => (ms === null ? null : msToTicks(ms));
  const thresholds = f.ages.map((age, i) => {
    if (i === f.ages.length - 1) return null;
    const override = f.xpToNextOverride?.[i];
    const base = override ?? content.ages[age].xpToNext;
    assert(base !== null, `format ${id}: age ${age} has no XP threshold`);
    return base;
  });
  return {
    id,
    ages: [...f.ages],
    thresholds,
    overdriveTick: toTick(f.overdriveMs),
    siegeTick: toTick(f.siegeMs),
    finalBellTick: toTick(f.finalBellMs),
    retreatTick: toTick(f.retreatAfterMs),
    escalation:
      f.escalation && f.escalation.length > 0
        ? f.escalation.map((x) => ({ tick: msToTicks(x.atMs), baseDamageBp: x.baseDamageBp, turretDamageBp: x.turretDamageBp, crumbleBpPerSec: x.crumbleBpPerSec }))
        : null,
  };
}

function compileRules(content: CompiledContent): SimRules {
  const battle = battleOf(content);
  const units: Record<CardId, UnitRules> = {};
  const unitList: UnitRules[] = [];
  for (const id of sortedKeys(content.units)) {
    const def = content.units[id];
    if (!def) continue;
    const r = unitRules(def, unitList.length, content, battle);
    units[id] = r;
    unitList.push(r);
  }
  const rangeCap = mlu(content.economy.turretRangeCap);
  const turrets: Record<CardId, TurretRules> = {};
  const turretList: TurretRules[] = [];
  for (const id of sortedKeys(content.turrets)) {
    const def = content.turrets[id];
    if (!def) continue;
    const r: TurretRules = {
      id,
      idx: turretList.length,
      def,
      age: def.age,
      ageIdx: content.ages[def.age].index,
      cost: def.cost,
      attack: attackRules(def.attack, true, content.economy.areaMaxTargets, rangeCap, battle.windupPct),
    };
    turrets[id] = r;
    turretList.push(r);
  }
  // A16.14: fort cards (traps included) and the rules of their hidden twins.
  const forts: Record<CardId, FortRules> = {};
  const fortDefs = (content as { forts?: Record<CardId, FortDef> }).forts ?? {};
  for (const id of sortedKeys(fortDefs)) {
    const def = fortDefs[id];
    if (!def) continue;
    const twin = units[id] ?? null;
    const fr = fortRules(def, content);
    forts[id] = fr;
    if (twin && twin.def.fort) twin.fort = fr;
  }
  const powers: Record<CardId, PowerRules> = {};
  let pi = 0;
  for (const id of sortedKeys(content.powers)) {
    const def = content.powers[id];
    if (!def) continue;
    powers[id] = powerRules(def, pi);
    pi += 1;
  }
  const ageIds = sortedKeys(content.ages);
  const ageIdx = {} as Record<AgeId, number>;
  const baseHp = {} as Record<AgeId, number>;
  const pBp = {} as Record<AgeId, number>;
  const vanguard = {} as Record<AgeId, CardId | null>;
  for (const a of ageIds) {
    const def = content.ages[a];
    ageIdx[a] = def.index;
    baseHp[a] = def.baseHp;
    pBp[a] = def.pBp;
    const inf = unitList.find((u) => u.age === a && u.group === 'infantry' && u.def.rarity === 'common' && !u.def.hidden);
    vanguard[a] = inf ? inf.id : null;
  }
  const formats = {} as Record<FormatId, FormatRules>;
  for (const f of sortedKeys(content.formats)) formats[f] = formatRules(content, f);
  return {
    content,
    econ: econRules(content, battle),
    units,
    unitList,
    turrets,
    turretList,
    powers,
    formats,
    ageIdx,
    baseHp,
    pBp,
    vanguard,
    emotes: emoteIds(content),
    research: researchRules(content, unitList, vanguard),
    forts,
  };
}

/** Level multiplier in bp: 10,000 + 500 × (L − 1), L clamped to 1..max (DESIGN A5.1). */
export function levelBp(econ: EconRules, level: number): number {
  const l = level < 1 ? 1 : level > econ.maxLevel ? econ.maxLevel : Math.trunc(level);
  return BP + econ.levelStepBp * (l - 1);
}

/** A whole table value scaled to centi-units at a level multiplier, as one integer step (DESIGN A5.1). */
export function scaleCenti(whole: number, lvlBp: number): number {
  return Math.trunc((whole * 100 * lvlBp) / BP);
}
