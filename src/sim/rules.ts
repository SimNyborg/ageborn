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
  FormatId,
  PowerDef,
  RoleGroup,
  StatusKind,
  Tag,
  TargetPriority,
  TurretDef,
  UnitDef,
} from '@/contracts';
import { BP, MILLI, PPM, TICKS_PER_SECOND, assert, msToTicks } from '@/core';

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
  finalAgeXpCap: 1200,
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
  aura: { radius: number; status: StatusRules } | null;
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
  timeStop: { slot: number; every: number; radius: number; freeze: number; legendaryFreeze: number } | null;
  /** Innate shield; `regenPerTick` in centi at level 1. */
  innate: { amount: number; regenPerTick: number; delayTicks: number } | null;
  resist: { minRange: number; bp: number } | null;
  brace: boolean;
  siegeOnly: boolean;
  bomber: { window: number } | null;
  follow: { behind: number; soloMax: number } | null;
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
  | { kind: 'buffAll'; statuses: StatusRules[] }
  | { kind: 'cloud'; halfWidth: number; durationTicks: number; missBp: number; allyDamageBp: number }
  | { kind: 'paradrop'; card: CardId; count: number; beyond: number; fallbackP: number };

export interface PowerRules {
  id: CardId;
  idx: number;
  def: PowerDef;
  age: AgeId;
  telegraphTicks: number;
  /** Zone width shown by the telegraph (mlu); 0 for powers without a zone. */
  zone: number;
  dmgType: DmgType;
  effect: PowerEffectRules;
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
}

/** Economy and rule constants in runtime units (DESIGN A2.3-A2.11). */
export interface EconRules {
  startGold: number;
  passiveGoldPerTick: number;
  passiveXpPerTick: number;
  treasuryCosts: readonly number[];
  treasuryGoldPerTickPerLevel: number;
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
  turretBuildTicks: number;
  turretSellTicks: number;
  ascendTicks: number;
  evolveHealBp: number;
  vanguardCount: number;
  powerPerTick: number;
  powerCarryCap: number;
  overchargeXp: number;
  overchargePpm: number;
  /** XP cap (milli) in the final age of the format (A2.4). */
  finalAgeXpCap: number;
  /** Stampede start without own ground units, own-side p in mlu (A5.7). */
  stampedeFallbackP: number;
  overdrive: { baseGoldBp: number; xpBp: number; powerBp: number };
  /** Siege (A2.10); `moveSpeedBp` is the forced march (A17.3), `gateCrowd` the siege crowd in mlu (A16.4 step 2). */
  siege: { turretDamageBp: number; baseDamageBp: number; decayBpPerStep: number; decayStepTicks: number; moveSpeedBp: number; gateCrowd: number };
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
    innate: null,
    resist: null,
    brace,
    siegeOnly: false,
    bomber: null,
    follow: null,
  };
  def.abilities.forEach((ab: AbilityDef, slot) => {
    switch (ab.kind) {
      case 'firstHitBonus':
        r.firstHit = { multBp: ab.multBp, knockback: mlu(ab.knockback), idleTicks: msToTicks(ab.idleResetMs) };
        break;
      case 'aura':
        r.aura = { radius: mlu(ab.radius), status: statusRules(ab.status) };
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
        };
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
  for (const a of r.attacks) if (a.range > r.maxRange) r.maxRange = a.range;
  return r;
}

function powerDmgType(kind: PowerDef['effect']['kind']): DmgType {
  if (kind === 'stampede') return 'blunt';
  if (kind === 'sweep') return 'laser';
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
      effect = { kind: 'buffAll', statuses: fx.statuses.map(statusRules) };
      break;
    case 'cloud':
      zone = mlu(fx.width);
      effect = {
        kind: 'cloud',
        halfWidth: Math.trunc(zone / 2),
        durationTicks: msToTicks(fx.durationMs),
        missBp: fx.enemyMissBp,
        allyDamageBp: fx.allyDamageBp,
      };
      break;
    case 'paradrop':
      effect = { kind: 'paradrop', card: fx.card, count: fx.count, beyond: mlu(fx.beyondFront), fallbackP: mlu(fx.fallbackP) };
      break;
  }
  return {
    id: def.id,
    idx,
    def,
    age: def.age,
    telegraphTicks: msToTicks(def.telegraphMs),
    zone,
    dmgType: powerDmgType(fx.kind),
    effect,
  };
}

function econRules(content: CompiledContent, battle: BattleRulesLike): EconRules {
  const e = content.economy;
  const t = content.ticks;
  const decayStepTicks = msToTicks(battle.siegeDecayStepMs);
  return {
    startGold: e.startGold * MILLI,
    passiveGoldPerTick: Math.trunc((e.passiveGoldPerSec * MILLI) / TICKS_PER_SECOND),
    passiveXpPerTick: Math.trunc((e.passiveXpPerSec * MILLI) / TICKS_PER_SECOND),
    treasuryCosts: e.treasuryCosts.map((c) => c * MILLI),
    treasuryGoldPerTickPerLevel: Math.trunc(e.treasuryMilliGoldPerSecPerLevel / TICKS_PER_SECOND),
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
    turretBuildTicks: t.turretBuild,
    turretSellTicks: t.turretSell,
    ascendTicks: t.ascend,
    evolveHealBp: e.evolveHealBp,
    vanguardCount: e.vanguardCount,
    powerPerTick: Math.trunc(PPM / t.powerCharge),
    powerCarryCap: Math.trunc((PPM * e.powerCarryCapBp) / BP),
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
  };
}

function formatRules(content: CompiledContent, id: FormatId): FormatRules {
  const f = content.formats[id];
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
