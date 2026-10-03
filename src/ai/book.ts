/**
 * The card book: the published card and rule data a bot plays with, precomputed once per content
 * object. Everything here is public knowledge (the card detail screens show the same numbers), so it
 * does not break the A7.1 honesty rules: bots still see the match only through `Observation`.
 *
 * Money is in milli-gold and distances in milli-lu, the units of `Observation` (DESIGN B3).
 */
import type { AgeId, CardId, CompiledContent, FortKind, Observation, PowerDef, RoleGroup, TurretDef, UnitDef } from '@/contracts';
import { BP, MILLI, fieldPulses, fortEconomyOf, fortPadRules, msToTicks, powerEconomyOf, powerReachRules, type FortPadRules, type PowerReachRules } from '@/core';

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
  /** X0 M1: members one train command spawns (1 for every card but a squad). */
  squad: number;
  /** One lane unit's share of the card value (value ÷ squad), whole gold: what a seen unit is worth. */
  memberValue: number;
  /** One lane unit's share of the cost (cost ÷ squad), milli-gold: what the foe paid per unit and its bounty. */
  memberCost: number;
  /** X0 M3: the summon a summoner sends and how many live at once, or null. */
  summons: { card: CardId; maxAlive: number } | null;
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
  /** A camp's Levy (A16.14.3): cost 0, counted at its AI value (8) in threat estimates only. */
  levy: boolean;
  /** A fort's hidden twin (A16.14.8): wall, tower or camp; null for real units. */
  fort: Exclude<FortKind, 'trap'> | null;
  /**
   * Breaks forts (A16.14.2): its attacks carry the ×2 structure mod (Heavy, Legendary, siege, artillery)
   * or it is a siege-only unit (Ram, Sapper: full base damage against forts).
   */
  breaker: boolean;
  /**
   * The structure row (A16.14.7 "answering forts", in place of `aiHint.vsStructure`): how well this card
   * answers a fort, bp on the counter scale (5,000 = even). Breakers 10,000 (×2); air 7,500 against walls,
   * camps and traps (it flies over them); other attacks with range ≥ 100 2,500 (×0.5); melee 5,000.
   */
  vsStructureBp: number;
  /** The same row against a tower, which shoots air: air counts by its range like any other unit. */
  vsTowerBp: number;
}

/** A Fort card as a bot knows it (A16.14.4; card detail numbers). */
export interface FortCard {
  id: CardId;
  age: AgeId;
  ageIndex: number;
  kind: FortKind;
  /** Card value in whole gold (its price). */
  value: number;
  /** Price, milli-gold. */
  cost: number;
  pop: number;
  pads: 'home' | 'any';
  size: 'medium' | 'large' | null;
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
  /** Fort cards (DESIGN A16.14): walls, towers, camps and traps. */
  forts: Readonly<Record<CardId, FortCard>>;
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
    /** Fort pad rules in milli-lu (core `fortPads`), or null for content without forts. */
    fort: FortPadRules | null;
    /** The fort slot recharge, ticks (A16.14.2). */
    fortRechargeTicks: number;
    /**
     * The falling gate (A17.3, `economy.gateFall`): in Overdrive and Siege an own unit killed this close to
     * the own gate (milli-lu; 0 when off) costs the base this share of its max HP (bp).
     */
    gateFall: number;
    gateFallHpBp: number;
  };
}

function firstRange(u: UnitDef): number {
  const a = u.attacks[0];
  return a ? a.range * MILLI : 0;
}

/** Structure row values, bp on the counter scale (5,000 = even): ×2, air over a wall, ×1, ×0.5. */
const STRUCTURE_BREAKER_BP = 10000;
const STRUCTURE_AIR_BP = 7500;
const STRUCTURE_EVEN_BP = 5000;
const STRUCTURE_RANGED_BP = 2500;

/** Does the unit break forts (A16.14.2)? The ×2 structure mod, or siege-only (base damage vs forts). */
function isBreaker(u: UnitDef): boolean {
  if (u.abilities.some((a) => a.kind === 'siegeOnly')) return true;
  return u.attacks.some((a) => (a.mods ?? []).some((m) => m.vs === 'structure'));
}

/** The structure row of a unit card (A16.14.7), against walls/camps (`tower` false) or towers. */
function structureRow(u: UnitDef, rangedMinLu: number, tower: boolean): number {
  if (u.fort || u.levy || u.attacks.length === 0) return STRUCTURE_EVEN_BP;
  if (isBreaker(u)) return STRUCTURE_BREAKER_BP;
  if (!tower && u.tags.includes('air')) return STRUCTURE_AIR_BP;
  return (u.attacks[0]?.range ?? 0) >= rangedMinLu ? STRUCTURE_RANGED_BP : STRUCTURE_EVEN_BP;
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

  const fortEcon = fortEconomyOf(e);
  const rangedMinLu = fortEcon?.rangedMinLu ?? 100;
  const units: Record<CardId, UnitCard> = {};
  for (const id of Object.keys(content.units).sort()) {
    const u = content.units[id];
    if (!u) continue;
    const riders = u.abilities.find((a) => a.kind === 'riders');
    const summon = u.abilities.find((a) => a.kind === 'summon');
    // A levy or a summon (X0 M3) costs 0 but counts at its AI value in threat estimates.
    const free = u.levy === true || u.summon === true;
    const squad = u.squad?.count ?? 1;
    const value = free ? (u.aiValue ?? 0) : u.cost;
    units[id] = {
      id,
      age: u.age,
      ageIndex: ageIndex(u.age),
      group: u.group,
      legendary: u.group === 'legendary' || u.rarity === 'legendary',
      epic: u.rarity === 'epic',
      // A16.14.3: a levy costs 0 but counts at its AI value (8) in threat estimates.
      value,
      cost: value * MILLI,
      squad,
      memberValue: Math.trunc(value / squad),
      memberCost: Math.trunc((value * MILLI) / squad),
      summons: summon?.kind === 'summon' ? { card: summon.card, maxAlive: summon.maxAlive } : null,
      pop: e.popByGroup[u.group] ?? 0,
      range: firstRange(u),
      speed: Math.max(0, Math.trunc((u.speed * e.marchSpeedBp) / BP)),
      hitsAir: u.attacks.some((a) => a.hitsAir),
      air: u.tags.includes('air'),
      hidden: u.hidden === true,
      riders: riders?.kind === 'riders' ? { card: riders.onDeathSpawn, count: riders.count } : null,
      levy: free,
      fort: u.fort?.kind ?? null,
      breaker: !u.fort && isBreaker(u),
      vsStructureBp: structureRow(u, rangedMinLu, false),
      vsTowerBp: structureRow(u, rangedMinLu, true),
    };
  }
  const forts: Record<CardId, FortCard> = {};
  for (const id of Object.keys(content.forts ?? {}).sort()) {
    const f = content.forts[id];
    if (!f) continue;
    forts[id] = { id, age: f.age, ageIndex: ageIndex(f.age), kind: f.fortKind, value: f.cost, cost: f.cost * MILLI, pop: f.pop, pads: f.pads, size: f.size };
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
  // Age predictions only expect cards a player can meet (the release gate, `UnitDef.released`).
  const unitsByAge = ageOrder.map((age) => Object.values(units).filter((u) => u.age === age && !u.hidden && content.units[u.id]?.released !== false));

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
    forts,
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
      fort: fortPadRules(e, MILLI),
      fortRechargeTicks: fortEcon ? msToTicks(fortEcon.rechargeMs) : 0,
      gateFall: (e.gateFall?.lu ?? 0) * MILLI,
      gateFallHpBp: e.gateFall?.hpBp ?? 0,
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

/**
 * The clocks a bot plays by (A18.3.4, A2.10.1, A2.10.2): the window's clocks; with Siege steps in the
 * observation, Siege I as the Siege and the observed Final Bell (null in Last Base Standing, which
 * shares its 7 ages with the Full War, so the window alone would wrongly report the Full War's Bell).
 */
export function observedClock(book: CardBook, obs: Pick<Observation, 'ages' | 'escalation'>): MatchClock {
  const c = matchClock(book, obs.ages);
  const e = obs.escalation;
  const first = e?.steps[0];
  return e && first ? { overdrive: c.overdrive, siege: first.tick, finalBell: e.finalBellTick ?? null } : c;
}

/** Counter value M[a][b] in bp; 5,000 (even) when the matrix has no entry. */
export function counterBp(book: CardBook, a: CardId, b: CardId): number {
  return book.counterBp[a]?.[b] ?? BP / 2;
}
