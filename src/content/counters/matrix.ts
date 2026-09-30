/**
 * The counter matrix (DESIGN B4): M[a][b] = clamp(0.5 + (hpLeft_a − hpLeft_b) / 2, 0, 1) from
 * equal-gold duels of every collectable unit pair at L1, and the derived "Strong vs" / "Weak vs"
 * lists (top and bottom 3 opponents of the same or adjacent age).
 *
 * The matrix is stored in bp (5,000 = even) in `generated/counters.json`; `compile.ts` exposes it as
 * `content.counters[a][b]` in [0, 1] as B4 defines it. Each pair runs twice with the sides swapped
 * and the results are averaged, so M[b][a] = 1 − M[a][b] exactly and side order never biases it.
 */
import type { EconomyRules, UnitDef } from '@/contracts/content';
import type { AgeId, CardId } from '@/contracts/ids';
import { BP } from '@/core/fixed';
import { hashCanonical } from '@/core/hash';
import type { RawBattleRules } from '../raw/types';
import type { CounterFile, DuelRecord } from '../types';
import { stripPresentation } from '../util';
import { DUEL_ENGINE_VERSION, DUEL_RULES, duelCounts, runDuel, type DuelContent } from './duel';

/** How many opponents "Strong vs" and "Weak vs" list (A2.6, B4). */
export const COUNTER_LIST_SIZE = 3;

/**
 * Engine id stored in `counters.json` when the duels ran on the real sim (`src/sim/duel.ts`,
 * DESIGN B4, build phase H2). The compact engine in `./duel.ts` ({@link DUEL_ENGINE_VERSION}) stays
 * for the dev pages; the generated file uses the sim, so the bots' `f_counter` and every
 * Strong vs / Weak vs line agree with the game.
 */
export const SIM_DUEL_ENGINE = 100 + DUEL_ENGINE_VERSION;

/** One duel of `countA` × `a` against `countB` × `b`, sides as given (the sim harness or the compact engine). */
export type DuelFn = (a: CardId, b: CardId, countA: number, countB: number) => { hpLeftBp: [number, number]; ticks: number };

/**
 * Hash of every input the duels read: engine version, duel rules, every unit (duellists and the
 * summons they may spawn) without presentation fields, the economy and the battle rules.
 * A different hash means the file is stale (B4: CI fails).
 */
export function counterInputHash(
  allUnits: readonly UnitDef[],
  economy: EconomyRules,
  battle: RawBattleRules,
  /** The sim version when the duels ran on the sim (the hash cannot see sim code, so its version stands in). */
  simVersion?: string,
): string {
  return hashCanonical({
    engine: simVersion === undefined ? DUEL_ENGINE_VERSION : SIM_DUEL_ENGINE,
    rules: DUEL_RULES,
    units: allUnits.map((u) => stripPresentation(u)),
    economy,
    battle,
    ...(simVersion === undefined ? {} : { sim: simVersion }),
  });
}

/** Every unit a duel may spawn: the duellists and their summons (the Matriarch's riders). */
export function duelUnitTable(all: readonly UnitDef[]): Record<CardId, UnitDef> {
  const out: Record<CardId, UnitDef> = {};
  for (const u of all) out[u.id] = u;
  return out;
}

/** Duels one unordered pair both ways and averages (see module doc). `duel` defaults to the compact engine. */
export function duelPair(c: DuelContent, a: CardId, b: CardId, duel?: DuelFn): DuelRecord {
  const ua = c.units[a];
  const ub = c.units[b];
  if (!ua || !ub) throw new Error(`counters: unknown unit "${ua ? b : a}"`);
  const [countA, countB] = duelCounts(ua.cost, ub.cost);
  const run: DuelFn = duel ?? ((x, y, nx, ny) => runDuel(c, x, y, nx, ny));
  const first = run(a, b, countA, countB);
  const second = run(b, a, countB, countA);
  return {
    a,
    b,
    countA,
    countB,
    hpLeftA: Math.trunc((first.hpLeftBp[0] + second.hpLeftBp[1]) / 2),
    hpLeftB: Math.trunc((first.hpLeftBp[1] + second.hpLeftBp[0]) / 2),
    ticks: Math.trunc((first.ticks + second.ticks) / 2),
  };
}

/** M[a][b] in bp from a duel record. */
export function matrixBpOf(d: DuelRecord): { ab: number; ba: number } {
  const ab = BP / 2 + Math.trunc((d.hpLeftA - d.hpLeftB) / 2);
  return { ab: Math.max(0, Math.min(BP, ab)), ba: BP - Math.max(0, Math.min(BP, ab)) };
}

export interface CounterBuildInput {
  /** Collectable units, in content order. */
  units: readonly UnitDef[];
  /** Every unit including hidden ones (summons may reference them). */
  allUnits: readonly UnitDef[];
  economy: EconomyRules;
  battle: RawBattleRules;
}

/**
 * Runs every duel and builds the counter file. Deterministic; takes a few seconds. With `sim` the
 * duels run on the given sim harness and the file records the sim version (B4, build phase H2).
 */
export function buildCounterFile(
  input: CounterBuildInput,
  onProgress?: (done: number, total: number) => void,
  sim?: { duel: DuelFn; version: string },
): CounterFile {
  const c: DuelContent = { units: duelUnitTable(input.allUnits), economy: input.economy, battle: input.battle };
  const ids = input.units.map((u) => u.id);
  const matrixBp: Record<CardId, Record<CardId, number>> = {};
  for (const a of ids) matrixBp[a] = { [a]: BP / 2 };
  const total = (ids.length * (ids.length - 1)) / 2;
  let done = 0;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i] as CardId;
      const b = ids[j] as CardId;
      const m = matrixBpOf(duelPair(c, a, b, sim?.duel));
      (matrixBp[a] as Record<CardId, number>)[b] = m.ab;
      (matrixBp[b] as Record<CardId, number>)[a] = m.ba;
      done += 1;
      onProgress?.(done, total);
    }
  }
  return {
    format: 1,
    engine: sim ? SIM_DUEL_ENGINE : DUEL_ENGINE_VERSION,
    inputHash: counterInputHash(input.allUnits, input.economy, input.battle, sim?.version),
    units: ids,
    matrixBp,
  };
}

/**
 * "Strong vs" and "Weak vs" for one unit (DESIGN A2.6, B4): the top and bottom 3 opponents of the
 * same or an adjacent age by M. Only opponents it actually beats (M > 0.5) count as strong, and
 * only those it loses to (M < 0.5) as weak. Ties keep content order.
 */
export function strongWeak(
  id: CardId,
  unitsInOrder: readonly UnitDef[],
  ageIndex: Record<AgeId, number>,
  matrixBp: Record<CardId, Record<CardId, number>>,
): { strongVs: CardId[]; weakVs: CardId[] } {
  const self = unitsInOrder.find((u) => u.id === id);
  const row = matrixBp[id];
  if (!self || !row) return { strongVs: [], weakVs: [] };
  const own = ageIndex[self.age];
  const rivals = unitsInOrder
    .filter((u) => u.id !== id && Math.abs(ageIndex[u.age] - own) <= 1 && row[u.id] !== undefined)
    .map((u, order) => ({ id: u.id, m: row[u.id] as number, order }));
  const strongVs = [...rivals]
    .filter((r) => r.m > BP / 2)
    .sort((x, y) => y.m - x.m || x.order - y.order)
    .slice(0, COUNTER_LIST_SIZE)
    .map((r) => r.id);
  const weakVs = [...rivals]
    .filter((r) => r.m < BP / 2)
    .sort((x, y) => x.m - y.m || x.order - y.order)
    .slice(0, COUNTER_LIST_SIZE)
    .map((r) => r.id);
  return { strongVs, weakVs };
}

/** Checks the loaded JSON against the {@link CounterFile} shape (a light guard; the schema test is thorough). */
export function parseCounterFile(json: unknown): CounterFile {
  const f = json as Partial<CounterFile> | null;
  if (
    !f ||
    f.format !== 1 ||
    typeof f.engine !== 'number' ||
    typeof f.inputHash !== 'string' ||
    !Array.isArray(f.units) ||
    typeof f.matrixBp !== 'object' ||
    f.matrixBp === null
  ) {
    throw new Error('counters.json is malformed; run `npx tsx tools/counters.ts`');
  }
  return f as CounterFile;
}
