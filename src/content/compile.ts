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
  FortDef,
  PowerDef,
  SkinDef,
  TurretDef,
  UnitDef,
} from '@/contracts/content';
import type { AgeId, CardId } from '@/contracts/ids';
import { BP, CENTI, MILLI, TICK_MS, msToTicks, mulDiv, roundDiv } from '@/core/fixed';
import { fortEconomyOf } from '@/core/fortPads';
import { addStructureMods, compileForts } from '@/core/forts';
import { hashCanonical } from '@/core/hash';
import { AGE_ORDER, agesIn, buildAges } from './ages';
import { strongWeak } from './counters/matrix';
import { FORMAT_ORDER } from './formats';
import { gateMeta } from './gate';
import { isReleased, unreleasedIds } from './release';
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

  const derived: UnitDef[] = raw.ages.flatMap((t) => t.units.map((u) => deriveUnit(cloneData(u), economy, battle)));
  // A16.14: forts compile into FortDefs plus hidden twin units (walls, towers, camps) and levies; the
  // ×2 structure mod goes at the front of every Heavy, Legendary, siege and artillery attack.
  const fortRules = fortEconomyOf(economy);
  const tableUnits = fortRules ? addStructureMods(derived, fortRules.structureBp) : derived;
  const fortSpecs = raw.ages.flatMap((t) => (t.forts ?? []).map((f) => cloneData(f)));
  const built = fortRules && fortSpecs.length > 0 ? compileForts(fortSpecs, tableUnits, fortRules) : { forts: [], twins: [], levies: [] };
  const fortList: FortDef[] = built.forts;
  const allUnits: UnitDef[] = [...tableUnits, ...built.levies, ...built.twins];
  const collectable = allUnits.filter((u) => !u.hidden);
  const turretList: TurretDef[] = raw.ages.flatMap((t) => t.turrets.map((x) => cloneData(x)));
  const powerList: PowerDef[] = sortPowers(raw.powers.map((p) => cloneData(p)));
  const skinList: SkinDef[] = input.skins.map((s) => cloneData(s));

  const units = byId(allUnits, 'unit');
  const turrets = byId(turretList, 'turret');
  const powers = byId(powerList, 'power');
  const forts = byId(fortList, 'fort');
  const skins = byId(skinList, 'skin');
  assertDistinctCardIds(allUnits, turretList, powerList, fortList);

  // The release gate (`release.ts`): unreleased cards stay in the records but never in a player list.
  const released = (id: string): boolean => isReleased({ units, turrets, powers, forts, skins }, id);
  const shown = collectable.filter((u) => released(u.id));
  const ageIndex = Object.fromEntries(ageIds.map((a) => [a, ages[a].index])) as Record<AgeId, number>;
  for (const u of collectable) {
    // Counter hints name released cards only (an unreleased card still gets its own, for dev tools).
    const sw = strongWeak(u.id, released(u.id) ? shown : [...shown, u], ageIndex, input.counters.matrixBp);
    u.strongVs = sw.strongVs;
    u.weakVs = sw.weakVs;
  }

  const formats = cloneData(raw.formats);
  const research = cloneData(raw.research ?? EMPTY_RESEARCH);
  const ticks = compileTicks(economy, battle);
  const counters = countersFromFile(input.counters, collectable);
  // Fort twins are placed, never trained: they have no integer train or move row.
  const int = compileIntegers(allUnits.filter((u) => !u.fort), turretList, ages, economy, battle);
  const order: ContentOrder = {
    ages: ageIds,
    formats: [...FORMAT_ORDER],
    units: shown.map((u) => u.id),
    hiddenUnits: allUnits.filter((u) => u.hidden && !u.fort && !u.levy && released(u.id)).map((u) => u.id),
    turrets: turretList.filter((t) => released(t.id)).map((t) => t.id),
    powers: powerList.filter((p) => released(p.id)).map((p) => p.id),
    forts: fortList.filter((f) => released(f.id)).map((f) => f.id),
    fortUnits: [...built.levies, ...built.twins].filter((u) => released(u.id)).map((u) => u.id),
    skins: skinList.filter((s) => released(s.id)).map((s) => s.id),
    unreleased: unreleasedIds({ units, turrets, powers, forts, skins }),
  };
  const metaCopy = gateMeta(cloneData(meta), released, { units, turrets, powers, forts });

  const body: Omit<Content, 'hash'> = {
    ages,
    formats,
    economy,
    units,
    turrets,
    powers,
    forts,
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
    forts: c.forts,
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

/** Power order (A2.9.11): by age; within an age starters first, then by slot (Home, Field), then source (Road, War Path by level). */
/** War Path powers by level, a side node (X0) after the levels. */
function wpOrder(p: PowerDef): number {
  return p.warPathLevel ?? (p.warPathSide !== undefined ? 100 + p.warPathSide : 0);
}

function sortPowers(list: PowerDef[]): PowerDef[] {
  const age = (p: PowerDef): number => AGE_ORDER.indexOf(p.age);
  const source = (p: PowerDef): number => (p.source === 'starter' ? 0 : p.source === 'road' ? 1 : 2);
  const slot = (p: PowerDef): number => (p.slot === 'home' ? 0 : 1);
  return list
    .map((p, i) => ({ p, i }))
    .sort(
      (a, b) =>
        age(a.p) - age(b.p) ||
        (a.p.source === 'starter' ? 0 : 1) - (b.p.source === 'starter' ? 0 : 1) ||
        slot(a.p) - slot(b.p) ||
        source(a.p) - source(b.p) ||
        wpOrder(a.p) - wpOrder(b.p) ||
        a.i - b.i,
    )
    .map((x) => x.p);
}

/**
 * Unit, turret, power and fort ids share one namespace (`CardId`). A fort and its hidden twin unit are
 * one card (A16.14.8): the twin's id must be its fort's, and no other card may use it.
 */
function assertDistinctCardIds(units: UnitDef[], turrets: TurretDef[], powers: PowerDef[], forts: FortDef[]): void {
  const seen = new Set<string>();
  const fortIds = new Set(forts.map((f) => f.id));
  for (const id of [...units.filter((u) => !u.fort).map((u) => u.id), ...turrets.map((t) => t.id), ...powers.map((p) => p.id), ...forts.map((f) => f.id)]) {
    if (seen.has(id)) throw new Error(`Card id "${id}" is used by more than one card`);
    seen.add(id);
  }
  for (const u of units) if (u.fort && !fortIds.has(u.id)) throw new Error(`Fort twin "${u.id}" has no fort card`);
}


/** Durations precompiled to ticks: max(1, round(ms / 50)) (B3). */
export function compileTicks(e: EconomyRules, battle: RawBattleRules): CompiledTicks {
  return {
    ascend: msToTicks(e.ascendMs),
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
