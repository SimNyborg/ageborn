/**
 * The card book: the published card and rule data a bot plays with, precomputed once per content
 * object. Everything here is public knowledge (the card detail screens show the same numbers), so it
 * does not break the A7.1 honesty rules: bots still see the match only through `Observation`.
 *
 * Money is in milli-gold and distances in milli-lu, the units of `Observation` (DESIGN B3).
 */
import type { AgeId, CardId, CompiledContent, PowerDef, RoleGroup, TurretDef, UnitDef } from '@/contracts';
import { BP, MILLI, msToTicks } from '@/core';

export interface UnitCard {
  id: CardId;
  age: AgeId;
  /** `AgeDef.index` order of the card's age (A2.3 underdog bounty). */
  ageIndex: number;
  group: RoleGroup;
  legendary: boolean;
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
  /** Rough strength for choosing between the two loadout turrets: damage per second, area weighted. */
  strength: number;
}

export interface CardBook {
  content: CompiledContent;
  units: Readonly<Record<CardId, UnitCard>>;
  turrets: Readonly<Record<CardId, TurretCard>>;
  powers: Readonly<Record<CardId, PowerDef>>;
  /** Age ids ordered by `AgeDef.index`. Every format runs a prefix of this order (A2.10). */
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
    /** Milli-gold per Treasury level, index = current level. */
    treasuryCosts: readonly number[];
    sellRefundBp: number;
    startGold: number;
    passiveGoldPerSec: number;
    treasuryGoldPerSecMilli: number;
    overdriveGoldBp: number;
    bountyGoldBp: number;
    /** A2.3 underdog bounty bonus, bp. */
    underdogBp: number;
    powerKillGoldBp: number;
    vanguardCount: number;
    lastStandRadius: number;
    /** Last Stand fires on its own at this base HP, bp (A2.11: 10%). */
    lastStandAutoBp: number;
    /** Mid-lane p (the centre of the power zone clamp, A2.1) and the power zone clamp, milli-lu. */
    midLane: number;
    zoneMin: number;
    zoneMax: number;
    ascendTicks: number;
    turretBuildTicks: number;
    stanceCooldownTicks: number;
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

  const book: CardBook = {
    content,
    units,
    turrets,
    powers: content.powers,
    ageOrder,
    unitsByAge,
    counterBp,
    econ: {
      queueMax: e.queueMax,
      popCap: e.popCap,
      legendaryLimit: e.legendaryLimit,
      mountCosts: e.mountCosts.map((c) => c * MILLI),
      mountCount: e.mountCosts.length,
      treasuryCosts: e.treasuryCosts.map((c) => c * MILLI),
      sellRefundBp: e.sellRefundBp,
      startGold: e.startGold * MILLI,
      passiveGoldPerSec: e.passiveGoldPerSec * MILLI,
      treasuryGoldPerSecMilli: e.treasuryMilliGoldPerSecPerLevel,
      overdriveGoldBp: e.overdrive.baseGoldBp,
      bountyGoldBp: e.bountyGoldBp,
      underdogBp: e.underdogBp,
      powerKillGoldBp: e.powerKillGoldBp,
      vanguardCount: e.vanguardCount,
      lastStandRadius: e.lastStand.radius * MILLI,
      lastStandAutoBp: e.lastStand.autoBp,
      midLane: Math.trunc(((e.powerZoneClamp[0] + e.powerZoneClamp[1]) * MILLI) / 2),
      zoneMin: e.powerZoneClamp[0] * MILLI,
      zoneMax: e.powerZoneClamp[1] * MILLI,
      ascendTicks: content.ticks.ascend,
      turretBuildTicks: content.ticks.turretBuild,
      stanceCooldownTicks: content.ticks.stanceCooldown,
      emoteCooldownTicks: msToTicks(e.emoteCooldownMs),
    },
  };
  books.set(content, book);
  return book;
}

/** Counter value M[a][b] in bp; 5,000 (even) when the matrix has no entry. */
export function counterBp(book: CardBook, a: CardId, b: CardId): number {
  return book.counterBp[a]?.[b] ?? BP / 2;
}
