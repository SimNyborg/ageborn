/**
 * The content compiler (DESIGN B4 Compilation).
 *
 * Input: the raw Part A tables (`raw/`, or the frozen copy in `tests/fixtures/content`), the meta
 * tables, the skins and the counter-matrix file. Output: one frozen {@link Content} object, which is
 * a `CompiledContent` (B15) with its open slots typed.
 *
 * What compiling does:
 * - Cards keep DESIGN's table units (lu, lu/s, ms, whole HP, gold, bp), exactly like the contract's
 *   field names and the fakes, so UI, AI and render read the same numbers everywhere.
 * - Derived per role group: pop (`economy.popByGroup`) and train time (`battle.trainMsByGroup`), A2.7.
 * - `strongVs` / `weakVs` from the counter matrix; `counters[a][b]` = M in [0, 1] (B4).
 * - `ticks`: the global durations precompiled to 50 ms ticks, max(1, round(ms / 50)) (B3).
 * - `int`: every card in B3 integer units (centi-HP, milli-lu, milli-lu per tick, ticks, milli-gold,
 *   bounties), for the sim, tools and the balance CSV.
 * - `hash`: FNV-1a over the canonical JSON of everything the battle reads, without presentation
 *   fields, string keys, meta tables or counter hints, so a new skin, sound, string or quest never
 *   turns existing replays into "from an older version" (B3 Replays).
 */
import type {
  AgeDef,
  AttackDef,
  ResearchRules,
  CompiledContent,
  CompiledTicks,
  EconomyRules,
  PowerDef,
  SkinDef,
  TurretDef,
  UnitDef,
} from '@/contracts/content';
import type { AgeId, CardId } from '@/contracts/ids';
import { BP, CENTI, MILLI, TICK_MS, msToTicks, mulDiv, roundDiv } from '@/core/fixed';
import { hashCanonical } from '@/core/hash';
import { AGE_ORDER, agesIn, buildAges } from './ages';
import { strongWeak } from './counters/matrix';
import { FORMAT_ORDER } from './formats';
import type { RawBattleRules, RawContent } from './raw/types';
import type {
  Content,
  ContentOrder,
  CounterFile,
  IntAttack,
  IntegerTables,
  IntTurret,
  IntUnit,
  MetaTables,
} from './types';
import { byId, cloneData, deepFreeze, stripPresentation } from './util';

export interface CompileInput {
  raw: RawContent;
  meta: MetaTables;
  skins: readonly SkinDef[];
  counters: CounterFile;
}

/** Compiles and freezes the content bundle. Throws on duplicate ids. */
export function compileContent(input: CompileInput): Content {
  const { raw, meta } = input;
  const economy = cloneData(raw.economy);
  const battle = cloneData(raw.battle);
  const ages = buildAges(raw.ageScale);
  const ageIds = agesIn(raw.ageScale);

  const allUnits: UnitDef[] = raw.ages.flatMap((t) => t.units.map((u) => deriveUnit(cloneData(u), economy, battle)));
  const collectable = allUnits.filter((u) => !u.hidden);
  const ageIndex = Object.fromEntries(ageIds.map((a) => [a, ages[a].index])) as Record<AgeId, number>;
  for (const u of collectable) {
    const sw = strongWeak(u.id, collectable, ageIndex, input.counters.matrixBp);
    u.strongVs = sw.strongVs;
    u.weakVs = sw.weakVs;
  }
  const turretList: TurretDef[] = raw.ages.flatMap((t) => t.turrets.map((x) => cloneData(x)));
  const powerList: PowerDef[] = sortPowers(raw.powers.map((p) => cloneData(p)));
  const skinList: SkinDef[] = input.skins.map((s) => cloneData(s));

  const units = byId(allUnits, 'unit');
  const turrets = byId(turretList, 'turret');
  const powers = byId(powerList, 'power');
  const skins = byId(skinList, 'skin');
  assertDistinctCardIds(allUnits, turretList, powerList);

  const formats = cloneData(raw.formats);
  const research = cloneData(raw.research ?? EMPTY_RESEARCH);
  const ticks = compileTicks(economy, battle);
  const counters = countersFromFile(input.counters, collectable);
  const int = compileIntegers(allUnits, turretList, ages, economy, battle);
  const order: ContentOrder = {
    ages: ageIds,
    formats: [...FORMAT_ORDER],
    units: collectable.map((u) => u.id),
    hiddenUnits: allUnits.filter((u) => u.hidden).map((u) => u.id),
    turrets: turretList.map((t) => t.id),
    powers: powerList.map((p) => p.id),
    skins: skinList.map((s) => s.id),
  };
  const metaCopy = cloneData(meta);

  const body: Omit<Content, 'hash'> = {
    ages,
    formats,
    economy,
    units,
    turrets,
    powers,
    skins,
    research,
    ...metaCopy,
    counters,
    ticks,
    int,
    order,
    battle,
  };
  return deepFreeze({ hash: contentHash(body), ...body });
}

/**
 * The battle-relevant slice that `hash` covers (see the module doc): ages, formats, economy, battle
 * rules, cards and daily modifier effects, without presentation fields.
 */
export function hashedSlice(c: Omit<CompiledContent, 'hash'> & Pick<Content, 'battle' | 'dailyModifiers'>): unknown {
  return stripPresentation({
    ages: c.ages,
    formats: c.formats,
    economy: c.economy,
    battle: c.battle,
    units: c.units,
    turrets: c.turrets,
    powers: c.powers,
    research: c.research,
    modifiers: c.dailyModifiers.list,
    ticks: c.ticks,
  });
}

/** `contentHash`: FNV-1a over canonical JSON (B4), as 8 hex digits. */
export function contentHash(c: Omit<CompiledContent, 'hash'> & Pick<Content, 'battle' | 'dailyModifiers'>): string {
  return hashCanonical(hashedSlice(c));
}

/** The War Council of raw copies that predate it (the frozen fixture): no picks, so research is never valid. */
export const EMPTY_RESEARCH: ResearchRules = {
  picks: [],
  cost: { troops: [], defences: [], economy: [], command: [] },
  timeMs: [],
  cancelRefundBp: 0,
  underdog: { discountBp: 0, baseGapBp: 0 },
  unlockAt: {},
  classOfRole: {
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
  },
};

/** Pop and train time follow the role group (A2.7); the raw values are checked against these by schema tests. */
function deriveUnit(u: UnitDef, economy: EconomyRules, battle: RawBattleRules): UnitDef {
  u.pop = economy.popByGroup[u.group];
  u.trainMs = battle.trainMsByGroup[u.group];
  u.strongVs = [];
  u.weakVs = [];
  return u;
}

/** Default powers before alternates, each in age order. */
function sortPowers(list: PowerDef[]): PowerDef[] {
  const age = (p: PowerDef): number => AGE_ORDER.indexOf(p.age);
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => age(a.p) - age(b.p) || (a.p.slot === b.p.slot ? 0 : a.p.slot === 'default' ? -1 : 1) || a.i - b.i)
    .map((x) => x.p);
}

/** Unit, turret and power ids share one namespace (`CardId`). */
function assertDistinctCardIds(units: UnitDef[], turrets: TurretDef[], powers: PowerDef[]): void {
  const seen = new Set<string>();
  for (const id of [...units.map((u) => u.id), ...turrets.map((t) => t.id), ...powers.map((p) => p.id)]) {
    if (seen.has(id)) throw new Error(`Card id "${id}" is used by more than one card`);
    seen.add(id);
  }
}

/** Durations precompiled to ticks: max(1, round(ms / 50)) (B3). */
export function compileTicks(e: EconomyRules, battle: RawBattleRules): CompiledTicks {
  return {
    ascend: msToTicks(e.ascendMs),
    powerCharge: msToTicks(e.powerChargeMs),
    turretBuild: msToTicks(e.turretBuildMs),
    turretSell: msToTicks(e.turretSellMs),
    stanceCooldown: msToTicks(e.stanceCooldownMs),
    retarget: msToTicks(e.retargetMs),
    healPulse: msToTicks(battle.healPulseMs),
    firstHitIdle: msToTicks(e.firstHitIdleMs),
    lastStandCharge: msToTicks(e.lastStand.chargeMs),
  };
}

/** M[a][b] in [0, 1] for every collectable pair present in the file (B4). */
function countersFromFile(file: CounterFile, collectable: UnitDef[]): Record<CardId, Record<CardId, number>> {
  const out: Record<CardId, Record<CardId, number>> = {};
  for (const a of collectable) {
    const row = file.matrixBp[a.id];
    if (!row) continue;
    const r: Record<CardId, number> = {};
    for (const b of collectable) {
      const m = row[b.id];
      if (m !== undefined) r[b.id] = m / BP;
    }
    out[a.id] = r;
  }
  return out;
}

/** Lu/s → milli-lu per tick (B3). Exact for integer speeds. */
export function speedToMilliLuPerTick(luPerSec: number): number {
  return mulDiv(luPerSec * MILLI, TICK_MS, 1000);
}

function intAttack(a: AttackDef, fallbackWindupPct: number): IntAttack {
  const intervalTicks = msToTicks(a.intervalMs);
  const p = a.projectile;
  return {
    damage: a.damage * CENTI,
    vsBaseDamage: a.vsBaseDamage === undefined ? null : a.vsBaseDamage * CENTI,
    intervalTicks,
    windupTicks: roundDiv(intervalTicks * (a.windupPct ?? fallbackWindupPct), 100),
    range: a.range * MILLI,
    minRange: (a.minRange ?? 0) * MILLI,
    projectileSpeed: p && 'speed' in p ? speedToMilliLuPerTick(p.speed) : null,
    instant: p !== undefined && 'instant' in p,
  };
}

/** Every card in B3 integer units (B3, B4). */
export function compileIntegers(
  units: readonly UnitDef[],
  turrets: readonly TurretDef[],
  ages: Record<AgeId, AgeDef>,
  e: EconomyRules,
  battle: RawBattleRules,
): IntegerTables {
  const out: IntegerTables = { units: {}, turrets: {}, baseHp: {} as Record<AgeId, number>, xpToNext: {} as Record<AgeId, number | null> };
  for (const u of units) {
    const cost = u.cost * MILLI;
    const unit: IntUnit = {
      hp: u.hp * CENTI,
      speed: speedToMilliLuPerTick(u.speed),
      width: e.sizes[u.size] * MILLI,
      trainTicks: msToTicks(u.trainMs),
      pop: u.pop,
      cost,
      bounty: {
        gold: mulDiv(cost, e.bountyGoldBp, BP),
        xp: mulDiv(cost, e.bountyXpBp, BP),
        lossXp: mulDiv(cost, e.ownLossXpBp, BP),
        powerGold: mulDiv(cost, e.powerKillGoldBp, BP),
      },
      attacks: u.attacks.map((a) => intAttack(a, a.projectile === undefined ? battle.windupPct.melee : battle.windupPct.ranged)),
    };
    out.units[u.id] = unit;
  }
  for (const t of turrets) {
    const cost = t.cost * MILLI;
    const turret: IntTurret = { cost, sellRefund: mulDiv(cost, e.sellRefundBp, BP), attack: intAttack(t.attack, battle.windupPct.turret) };
    out.turrets[t.id] = turret;
  }
  for (const id of AGE_ORDER) {
    const a = ages[id] as AgeDef | undefined;
    if (!a) continue;
    out.baseHp[id] = a.baseHp * CENTI;
    out.xpToNext[id] = a.xpToNext === null ? null : a.xpToNext * MILLI;
  }
  return out;
}
