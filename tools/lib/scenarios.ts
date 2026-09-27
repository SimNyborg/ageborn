/**
 * Deterministic single-scenario measurements for A2.14 targets that need no bots:
 *
 * - **Base time to kill**: a full army (60 pop) of same-age L1 Commons with no opposition needs 40-60 s
 *   to destroy a full same-age base. Measured on the real sim from the army's first base hit to the
 *   base's destruction. The defender trains nothing, owns no turrets and has Last Stand spent; the clock
 *   is off (`training.noClock`), so no phase multiplies base damage.
 * - **Power damage per unit in zone**: the A2.9 coverage estimate (count × 2 × radius / zone hits per
 *   unit) against the age's L1 Infantry and Heavy commons: 60-100% and 15-35%.
 *
 * The base scenario sets up state with the sim's dev helpers (src/sim/debug.ts), which is fine for a tool
 * and means the sim refuses to build a replay of it.
 */
import type { AgeId, CardId, CompiledContent, PowerDef, Side, UnitDef } from '../../src/contracts';
import { createSim } from '../../src/sim';
import { devClearLane, devSetXp, devSpawn, simCtx } from '../../src/sim/debug';
import { agesOf, baselinePlan, sideConfig, unitsOfAge } from './plans';

export interface BaseKillResult {
  age: AgeId;
  army: Record<CardId, number>;
  pop: number;
  /** Seconds from the first base hit to the base's destruction (the gated number). */
  seconds: number;
  /** Seconds from the army's spawn to the base's destruction (for reference). */
  fromSpawnSeconds: number;
  destroyed: boolean;
}

const TICKS_PER_SEC = 20;

function commonsOf(content: CompiledContent, age: AgeId): UnitDef[] {
  const us = unitsOfAge(content, age).filter((u) => u.rarity === 'common');
  const order = ['infantry', 'ranged', 'heavy'];
  return us.filter((u) => order.includes(u.group)).sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
}

/** Fills `popCap` round-robin with the age's Infantry, Ranged and Heavy commons. */
export function commonArmy(content: CompiledContent, age: AgeId): UnitDef[] {
  const commons = commonsOf(content, age);
  const cap = content.economy.popCap;
  const army: UnitDef[] = [];
  let pop = 0;
  for (let guard = 0; guard < 1000 && commons.length > 0; guard += 1) {
    const u = commons[guard % commons.length] as UnitDef;
    if (pop + u.pop > cap) {
      if (commons.every((c) => pop + c.pop > cap)) break;
      continue;
    }
    army.push(u);
    pop += u.pop;
  }
  return army;
}

/** Evolves `side` to `ageIndex` with the regular Evolve command (so the base rescales as in a match). */
function evolveTo(sim: ReturnType<typeof createSim>, side: Side, ageIndex: number): void {
  let seq = 0;
  for (let guard = 0; sim.state.sides[side].ageIndex < ageIndex && guard < 20; guard += 1) {
    devSetXp(sim, side, 100_000);
    seq += 1;
    sim.step([{ t: 'evolve', side, tick: sim.state.tick + 1, seq }]);
    for (let i = 0; i < 400 && sim.state.sides[side].ascendUntil > sim.state.tick; i += 1) sim.step([]);
    for (let i = 0; i < 5; i += 1) sim.step([]);
  }
}

export function baseTimeToKill(content: CompiledContent, age: AgeId, o: { maxSeconds?: number } = {}): BaseKillResult {
  const ages = agesOf(content);
  const ageIndex = ages.indexOf(age);
  const plan = baselinePlan(content);
  const sim = createSim({
    seed: 1,
    format: 'full',
    content,
    sides: [sideConfig(content, plan, { level: 1, label: 'Army', isBot: false }), sideConfig(content, plan, { level: 1, label: 'Base', isBot: false })],
    training: { noClock: true },
  });
  evolveTo(sim, 1, ageIndex);
  devClearLane(sim);
  // "No opposition": the defender's Last Stand is spent.
  simCtx(sim).s.sides[1].lastStand = 'used';

  // The column starts at the spawn point and extends forward at about the A2.7 spacing; the gated
  // number starts at the first base hit, so where the column starts does not matter.
  const army: Record<CardId, number> = {};
  let p = content.economy.spawnP;
  let pop = 0;
  for (const u of commonArmy(content, age)) {
    devSpawn(sim, 0, u.id, { p, level: 1 });
    army[u.id] = (army[u.id] ?? 0) + 1;
    pop += u.pop;
    p += Math.max(8, Math.trunc((content.economy.sizes[u.size] * content.economy.spacingBp) / 10_000));
  }

  const start = sim.state.tick;
  const limit = start + (o.maxSeconds ?? 240) * TICKS_PER_SEC;
  let firstHit: number | null = null;
  while (!sim.state.outcome && sim.state.tick < limit) {
    for (const e of sim.step([])) {
      if (firstHit === null && e.e === 'baseDamaged' && e.side === 1 && e.sourceId !== null) firstHit = e.tick;
    }
  }
  const end = sim.state.outcome ? sim.state.outcome.tick : sim.state.tick;
  const destroyed = sim.state.outcome?.reason === 'baseDestroyed' && sim.state.outcome.winner === 0;
  return {
    age,
    army,
    pop,
    seconds: destroyed && firstHit !== null ? (end - firstHit) / TICKS_PER_SEC : Number.NaN,
    fromSpawnSeconds: destroyed ? (end - start) / TICKS_PER_SEC : Number.NaN,
    destroyed,
  };
}

export interface PowerCoverage {
  power: CardId;
  age: AgeId;
  kind: PowerDef['effect']['kind'];
  /** Expected damage per enemy unit in the zone (whole HP, L1). */
  perUnit: number;
  light: CardId | null;
  lightPct: number;
  heavy: CardId | null;
  heavyPct: number;
}

/**
 * The A2.9 estimate for a damaging power; null for powers that deal no damage (buffs, clouds, drops).
 * Barrage: damage × count × 2 × radius / zone. Sweep: its damage once per unit. Stampede: damage × the
 * per-enemy hit cap.
 */
export function powerCoverage(content: CompiledContent, power: PowerDef): PowerCoverage | null {
  const fx = power.effect;
  let perUnit: number;
  if (fx.kind === 'barrage') perUnit = (fx.damage * fx.count * 2 * fx.radius) / fx.zone;
  else if (fx.kind === 'sweep') perUnit = fx.damage;
  else if (fx.kind === 'stampede') perUnit = fx.damage * fx.maxHitsPerEnemy;
  else return null;
  const commons = commonsOf(content, power.age);
  const light = commons.find((u) => u.group === 'infantry') ?? null;
  const heavy = commons.find((u) => u.group === 'heavy') ?? null;
  return {
    power: power.id,
    age: power.age,
    kind: fx.kind,
    perUnit,
    light: light?.id ?? null,
    lightPct: light ? (perUnit * 100) / light.hp : Number.NaN,
    heavy: heavy?.id ?? null,
    heavyPct: heavy ? (perUnit * 100) / heavy.hp : Number.NaN,
  };
}
