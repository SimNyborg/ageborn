/**
 * The card book: the published card and rule data a bot plays with, precomputed once per content
 * object. Everything here is public knowledge (the card detail screens show the same numbers), so it
 * does not break the A7.1 honesty rules: bots still see the match only through `Observation`.
 *
 * Money is in milli-gold and distances in milli-lu, the units of `Observation` (DESIGN B3).
 */
import type { AgeId, CardId, CompiledContent, PowerDef, RoleGroup, TurretDef, UnitDef } from '@/contracts';
import { BP, MILLI, fieldPulses, msToTicks, powerEconomyOf, powerReachRules, type PowerReachRules } from '@/core';

export interface UnitCard {
  id: CardId;
  age: AgeId;
  /** `AgeDef.index` order of the card's age (A2.3 underdog bounty). */
  ageIndex: number;
  group: RoleGroup;
  legendary: boolean;
  /** An Epic card: strikes deal it 50% (A2.9.6 `strikeEpicBp`). */
  epic: boolean;
  /** Card value V(u) = card cost in whole gold (DESIGN A7.2 "Values"). */
  value: number;
  /** Cost in milli-gold. */
  cost: number;
  pop: number;
  /** Range of the first attack in milli-lu (0 for units without attacks). */
  range: number;
  /** Walking speed in lu/s: table speed × `economy.marchSpeedBp` (A17.2), for the safe-window Evolve check (A7.3). */
  speed: number;
  hitsAir: boolean;
  air: boolean;
  hidden: boolean;
  /** Riders summoned when the unit dies (A5 `riders`), or null. */
  riders: { card: CardId; count: number } | null;
}

export interface TurretCard {
  id: CardId;
  age: AgeId;
  ageIndex: number;
  /** Cost in milli-gold. */
  cost: number;
  hitsAir: boolean;
  /** Minimum range from the own gate in milli-lu (0 = none): mortars cannot hit units camping the gate. */
  minRange: number;
  /** Rough strength for choosing between the two loadout turrets: damage per second, area weighted. */
  strength: number;
}

/**
 * What a bot needs to know about an Age Power (DESIGN A2.9.9 "book.ts: cost, reload, reach, family,
 * per-unit estimate and aiValueBp from content"), all public card-detail numbers.
 */
export interface PowerInfo {
  def: PowerDef;
  /** List price, whole gold (the observation carries the effective price). */
  cost: number;
  /**
   * The family's expected damage per touched unit at loadout multiplier 1.0, whole HP (A2.9.6 coverage
   * estimate): barrage count × 2 × radius ÷ zone hits (at most count) × damage; sweep damage once;
   * charge min(runners, hits per enemy) × damage; field damage per pulse × pulses; strike shots × damage.
   */
  perUnit: number;
  hitsAir: boolean;
  hitsGround: boolean;
  /** Zone (or cloud width) in milli-lu; 0 for powers without a zone. */
  zone: number;
  /** `maxTargets` (0 = no cap: drops, Suppress). */
  cap: number;
  /** Damages or controls enemy units (auto-aim with nothing eligible is rejected before payment). */
  harmful: boolean;
  /** A control field (snare, pull, stun): valued by `aiValueBp` on engaged targets (A2.9.9). */
  control: boolean;
  /** A2.9.9 value weight, bp of card cost (controls and buffs; the cloud 4,000). */
  aiValueBp: number;
  /** A drop's summoned card value, whole gold (card cost × count); 0 for other kinds. */
  dropValue: number;
}

export interface CardBook {
  content: CompiledContent;
  units: Readonly<Record<CardId, UnitCard>>;
  turrets: Readonly<Record<CardId, TurretCard>>;
  powers: Readonly<Record<CardId, PowerDef>>;
  /** AI facts per power (A2.9.9). */
  powerInfo: Readonly<Record<CardId, PowerInfo>>;
  /**
   * Age ids ordered by `AgeDef.index`. A format is a window of this order (A18.3.4); `View.ageIndex`
   * converts the observation's window position into this order.
   */
  ageOrder: readonly AgeId[];
  /** Non-hidden unit cards per age index (for predicting the next enemy age). */
  unitsByAge: readonly (readonly UnitCard[])[];
  /** Counter matrix M[a][b] in bp (B4); missing rows read 5,000. */
  counterBp: Readonly<Record<CardId, Readonly<Record<CardId, number>>>>;
  econ: {
    queueMax: number;
    popCap: number;
    legendaryLimit: number;
    /** Milli-gold per mount purchase, index = mounts owned. */
    mountCosts: readonly number[];
    mountCount: number;
    sellRefundBp: number;
    startGold: number;
    passiveGoldPerSec: number;
    overdriveGoldBp: number;
    bountyGoldBp: number;
    /** A2.3 underdog bounty bonus, bp. */
    underdogBp: number;
    powerKillGoldBp: number;
    /** Legendaries take this share of power damage (A2.9.6). */
    legendaryPowerDamageBp: number;
    /** Epics take this share of strike damage (A2.9.6). */
    strikeEpicBp: number;
    /** Level multiplier step and cap (A5.1: 10,000 + step × (L − 1)). */
    levelStepBp: number;
    maxLevel: number;
    vanguardCount: number;
    lastStandRadius: number;
    /** Last Stand fires on its own at this base HP, bp (A2.11: 10%). */
    lastStandAutoBp: number;
    /** Mid-lane p (the centre of the power zone clamp, A2.1) and the power zone clamp, milli-lu. */
    midLane: number;
    zoneMin: number;
    zoneMax: number;
    /** Power reach rules in milli-lu (A2.9.4, core `powerReach`). */
    powerReach: PowerReachRules;
    ascendTicks: number;
    turretBuildTicks: number;
    stanceCooldownTicks: number;
    /** Hold flag range and snap (A18.4.2), milli-lu, and its move cooldown in ticks. */
    flagMin: number;
    flagMax: number;
    flagSnap: number;
    flagMoveTicks: number;
    /** Turret range cap from the own gate (A2.8), milli-lu: where the turret cover ends. */
    turretCover: number;
    emoteCooldownTicks: number;
  };
}

function firstRange(u: UnitDef): number {
  const a = u.attacks[0];
  return a ? a.range * MILLI : 0;
}

function turretStrength(t: TurretDef): number {
  const a = t.attack;
  const per = Math.trunc((a.damage * 1000 * (a.volley ?? 1)) / Math.max(1, a.intervalMs));
  const area = a.splashRadius || a.pierce || a.cleave || a.chain || a.line || a.gateZone ? 2 : 1;
  return per * area;
}

/** The cloud's A2.9.9 value weight when content gives none. */
const CLOUD_VALUE_BP = 4000;

/** The A2.9.9 facts of one power. */
export function powerInfo(p: PowerDef): PowerInfo {
  const fx = p.effect;
  let perUnit = 0;
  let hitsAir = true;
  let hitsGround = true;
  let zone = 0;
  let harmful = false;
  let control = false;
  switch (fx.kind) {
    case 'barrage': {
      const cover = fx.zone > 0 ? Math.trunc((fx.count * 2 * fx.radius * BP) / fx.zone) : fx.count * BP;
      perUnit = Math.trunc((Math.min(fx.count * BP, cover) * fx.damage) / BP);
      hitsAir = fx.hitsAir;
      hitsGround = fx.hitsGround !== false;
      zone = fx.zone * MILLI;
      harmful = true;
      break;
    }
    case 'sweep':
      perUnit = fx.damage;
      hitsAir = fx.hitsAir;
      zone = fx.zone * MILLI;
      harmful = true;
      break;
    case 'stampede':
      perUnit = Math.min(fx.runners, fx.maxHitsPerEnemy) * fx.damage;
      hitsAir = false;
      zone = fx.distance * MILLI;
      harmful = true;
      break;
    case 'field':
      perUnit = (fx.damagePerPulse ?? 0) * fieldPulses(fx.durationMs);
      hitsAir = fx.hitsAir;
      zone = fx.zone * MILLI;
      harmful = true;
      control = (fx.statuses?.length ?? 0) > 0 || (fx.pullBp ?? 0) > 0;
      break;
    case 'strike':
      perUnit = fx.shots * fx.damage;
      hitsAir = fx.hitsAir;
      harmful = true;
      break;
    case 'cloud':
      zone = fx.width * MILLI;
      break;
    default:
      break;
  }
  return {
    def: p,
    cost: p.cost,
    perUnit,
    hitsAir,
    hitsGround,
    zone,
    cap: p.maxTargets ?? 0,
    harmful,
    control,
    aiValueBp: p.aiValueBp ?? (fx.kind === 'cloud' ? CLOUD_VALUE_BP : 0),
    dropValue: 0,
  };
}

const books = new WeakMap<CompiledContent, CardBook>();

/** The card book of a content object (cached). */
export function cardBook(content: CompiledContent): CardBook {
  const cached = books.get(content);
  if (cached) return cached;
  const e = content.economy;
  const ageOrder = (Object.keys(content.ages) as AgeId[]).sort((a, b) => content.ages[a].index - content.ages[b].index);
  const ageIndex = (age: AgeId): number => ageOrder.indexOf(age);

  const units: Record<CardId, UnitCard> = {};
  for (const id of Object.keys(content.units).sort()) {
    const u = content.units[id];
    if (!u) continue;
    const riders = u.abilities.find((a) => a.kind === 'riders');
    units[id] = {
      id,
      age: u.age,
      ageIndex: ageIndex(u.age),
      group: u.group,
      legendary: u.group === 'legendary' || u.rarity === 'legendary',
      epic: u.rarity === 'epic',
      value: u.cost,
      cost: u.cost * MILLI,
      pop: e.popByGroup[u.group] ?? 0,
      range: firstRange(u),
      speed: Math.max(0, Math.trunc((u.speed * e.marchSpeedBp) / BP)),
      hitsAir: u.attacks.some((a) => a.hitsAir),
      air: u.tags.includes('air'),
      hidden: u.hidden === true,
      riders: riders?.kind === 'riders' ? { card: riders.onDeathSpawn, count: riders.count } : null,
    };
  }
  const turrets: Record<CardId, TurretCard> = {};
  for (const id of Object.keys(content.turrets).sort()) {
    const t = content.turrets[id];
    if (!t) continue;
    turrets[id] = {
      id,
      age: t.age,
      ageIndex: ageIndex(t.age),
      cost: t.cost * MILLI,
      hitsAir: t.attack.hitsAir,
      minRange: (t.attack.minRange ?? 0) * MILLI,
      strength: turretStrength(t),
    };
  }
  const unitsByAge = ageOrder.map((age) => Object.values(units).filter((u) => u.age === age && !u.hidden));

  const counterBp: Record<CardId, Record<CardId, number>> = {};
  for (const a of Object.keys(content.counters ?? {}).sort()) {
    const row = content.counters[a];
    if (!row) continue;
    const out: Record<CardId, number> = {};
    for (const b of Object.keys(row)) {
      const m = row[b];
      if (typeof m === 'number' && Number.isFinite(m)) out[b] = Math.max(0, Math.min(BP, Math.round(m * BP)));
    }
    counterBp[a] = out;
  }

  const infos: Record<CardId, PowerInfo> = {};
  for (const id of Object.keys(content.powers).sort()) {
    const p = content.powers[id];
    if (!p) continue;
    const info = powerInfo(p);
    if (p.effect.kind === 'paradrop') info.dropValue = (units[p.effect.card]?.value ?? 0) * p.effect.count;
    infos[id] = info;
  }

  const book: CardBook = {
    content,
    units,
    turrets,
    powers: content.powers,
    powerInfo: infos,
    ageOrder,
    unitsByAge,
    counterBp,
    econ: {
      queueMax: e.queueMax,
      popCap: e.popCap,
      legendaryLimit: e.legendaryLimit,
      mountCosts: e.mountCosts.map((c) => c * MILLI),
      mountCount: e.mountCosts.length,
      sellRefundBp: e.sellRefundBp,
      startGold: e.startGold * MILLI,
      passiveGoldPerSec: e.passiveGoldPerSec * MILLI,
      overdriveGoldBp: e.overdrive.baseGoldBp,
      bountyGoldBp: e.bountyGoldBp,
      underdogBp: e.underdogBp,
      powerKillGoldBp: e.powerKillGoldBp,
      legendaryPowerDamageBp: e.legendaryPowerDamageBp,
      strikeEpicBp: powerEconomyOf(e).strikeEpicBp,
      levelStepBp: e.levelStepBp,
      maxLevel: e.maxLevel,
      vanguardCount: e.vanguardCount,
      lastStandRadius: e.lastStand.radius * MILLI,
      lastStandAutoBp: e.lastStand.autoBp,
      midLane: Math.trunc(((e.powerZoneClamp[0] + e.powerZoneClamp[1]) * MILLI) / 2),
      zoneMin: e.powerZoneClamp[0] * MILLI,
      zoneMax: e.powerZoneClamp[1] * MILLI,
      powerReach: powerReachRules(e, MILLI),
      ascendTicks: content.ticks.ascend,
      turretBuildTicks: content.ticks.turretBuild,
      stanceCooldownTicks: content.ticks.stanceCooldown,
      flagMin: e.holdFlag.minP * MILLI,
      flagMax: e.holdFlag.maxP * MILLI,
      flagSnap: Math.max(1, e.holdFlag.snapLu) * MILLI,
      flagMoveTicks: msToTicks(e.holdFlag.moveCooldownMs),
      turretCover: e.turretRangeCap * MILLI,
      emoteCooldownTicks: msToTicks(e.emoteCooldownMs),
    },
  };
  books.set(content, book);
  return book;
}

/** A match's clocks in ticks (A18.3.4), null where the format has none (the tutorial). */
export interface MatchClock {
  overdrive: number | null;
  siege: number | null;
  finalBell: number | null;
}

const clocks = new WeakMap<CardBook, Map<string, MatchClock>>();

/**
 * The clocks of the match's age window (public: the start screen shows the format). Formats with the
 * same window share their clocks (A18.3.4: clocks follow the window length), so the window in the
 * observation is enough.
 */
export function matchClock(book: CardBook, ages: readonly AgeId[] | undefined): MatchClock {
  const key = (ages ?? []).join(',');
  let byKey = clocks.get(book);
  if (!byKey) {
    byKey = new Map();
    clocks.set(book, byKey);
  }
  const hit = byKey.get(key);
  if (hit) return hit;
  const ticks = (ms: number | null): number | null => (ms === null ? null : msToTicks(ms));
  const formats = Object.keys(book.content.formats).sort();
  let out: MatchClock = { overdrive: null, siege: null, finalBell: null };
  for (const id of formats) {
    const f = book.content.formats[id];
    if (!f || f.ages.join(',') !== key || f.finalBellMs === null) continue;
    out = { overdrive: ticks(f.overdriveMs), siege: ticks(f.siegeMs), finalBell: ticks(f.finalBellMs) };
    break;
  }
  byKey.set(key, out);
  return out;
}

/** Counter value M[a][b] in bp; 5,000 (even) when the matrix has no entry. */
export function counterBp(book: CardBook, a: CardId, b: CardId): number {
  return book.counterBp[a]?.[b] ?? BP / 2;
}
