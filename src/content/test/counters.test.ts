/**
 * The counter matrix (DESIGN B4; C2/WP1 DoD: "The counter matrix is up to date").
 *
 * Staleness is checked by hash, so CI stays fast: the file stores the hash of every duel input and
 * must match the current tables. A sample of pairs is also re-duelled to prove the file really is
 * the engine's output. Regenerate with `npx tsx tools/counters.ts`.
 */
import { describe, expect, it } from 'vitest';
import type { UnitDef } from '@/contracts/content';
import { BP } from '@/core/fixed';
import { DUEL_ENGINE_VERSION, DUEL_RULES, duelCounts, runDuel, type DuelContent } from '../counters/duel';
import { counterInputHash, duelPair, duelUnitTable, matrixBpOf, strongWeak } from '../counters/matrix';
import { content, counterFile } from '../index';
import { raw } from '../raw';

const allUnits = raw.ages.flatMap((t) => t.units);
const duelContent: DuelContent = { units: duelUnitTable(allUnits), economy: raw.economy, battle: raw.battle };
const M = (a: string, b: string): number => counterFile.matrixBp[a]?.[b] ?? Number.NaN;

describe('generated/counters.json', () => {
  it('is up to date with the unit tables, economy, battle rules and duel engine', () => {
    const expected = counterInputHash(allUnits, raw.economy, raw.battle);
    expect(counterFile.inputHash, 'counters.json is stale: run `npx tsx tools/counters.ts`').toBe(expected);
    expect(counterFile.engine).toBe(DUEL_ENGINE_VERSION);
    expect(counterFile.units).toEqual(content.order.units);
  });

  it('holds a full antisymmetric matrix in bp', () => {
    for (const a of counterFile.units) {
      expect(M(a, a)).toBe(BP / 2);
      for (const b of counterFile.units) {
        expect(Number.isInteger(M(a, b)), `${a}/${b}`).toBe(true);
        expect(M(a, b) + M(b, a), `${a}/${b}`).toBe(BP);
      }
    }
  });

  it('matches a fresh run of the engine for a sample of pairs', () => {
    const sample: [string, string][] = [
      ['bonker', 'tuskback'],
      ['spear_hunter', 'tuskback'],
      ['mammoth_matriarch', 'pikeman'],
      ['friar', 'longbowman'],
      ['balloon_admiral', 'fusilier'],
      ['gyrocopter', 'rifleman'],
      ['photon_knight', 'emp_saboteur'],
      ['chrono_titan', 'rail_gunner'],
    ];
    for (const [a, b] of sample) {
      const d = duelPair(duelContent, a, b);
      const m = matrixBpOf(d);
      expect(m.ab, `${a} vs ${b}`).toBe(M(a, b));
    }
  });
});

describe('what the matrix says (A2.6 counter triangle)', () => {
  it('Heavy beats Infantry, Anti-armor beats Heavy, Infantry beats Anti-armor', () => {
    expect(M('tuskback', 'bonker')).toBeGreaterThan(BP / 2);
    expect(M('spear_hunter', 'tuskback')).toBeGreaterThan(BP / 2);
    expect(M('bonker', 'spear_hunter')).toBeGreaterThan(BP / 2);
    expect(M('destrier_knight', 'footman')).toBeGreaterThan(BP / 2);
    expect(M('pikeman', 'destrier_knight')).toBeGreaterThan(BP / 2);
  });

  it('air punishes melee-only armies', () => {
    for (const melee of ['bonker', 'tuskback', 'footman', 'corsair', 'trench_raider', 'walker_mech']) {
      expect(M('gyrocopter', melee), melee).toBe(BP);
      expect(M('balloon_admiral', melee), melee).toBe(BP);
    }
  });

  it('two units that cannot hurt each other draw', () => {
    expect(M('repair_drone', 'bonker')).toBe(BP / 2);
    expect(M('balloon_admiral', 'repair_drone')).toBe(BP / 2);
  });
});

describe('duel setup', () => {
  it('gives both sides (nearly) the same gold within the budget', () => {
    const costs = [...new Set(Object.values(content.units).map((u) => u.cost))];
    for (const a of costs) {
      for (const b of costs) {
        const [na, nb] = duelCounts(a, b);
        const ga = na * a;
        const gb = nb * b;
        expect(ga).toBeGreaterThanOrEqual(DUEL_RULES.budgetMin);
        expect(gb).toBeLessThanOrEqual(DUEL_RULES.budgetMax);
        // Within 5% of each other.
        expect(Math.abs(ga - gb) * 100, `${a}/${b}`).toBeLessThanOrEqual(5 * Math.max(ga, gb));
      }
    }
    expect(duelCounts(50, 350)).toEqual([14, 2]);
    expect(duelCounts(50, 150)).toEqual([15, 5]);
    expect(duelCounts(110, 110)).toEqual([6, 6]);
  });

  it('is deterministic', () => {
    const a = runDuel(duelContent, 'mammoth_matriarch', 'friar', 3, 10);
    const b = runDuel(duelContent, 'mammoth_matriarch', 'friar', 3, 10);
    expect(a).toEqual(b);
  });

  it('treats both sides the same: every mirror duel is even', () => {
    for (const id of content.order.units) {
      const out = runDuel(duelContent, id, id, 3, 3);
      expect(out.hpLeftBp[0], id).toBe(out.hpLeftBp[1]);
    }
  });

  it('ends when a side is wiped, and ends idle duels early', () => {
    const wipe = runDuel(duelContent, 'tuskback', 'bonker', 5, 15);
    expect(wipe.hpLeftBp[1]).toBe(0);
    expect(wipe.ticks).toBeLessThan(DUEL_RULES.maxTicks);
    // Two healers that never meet: nothing happens, so the duel stops after the idle limit.
    const idle = runDuel(duelContent, 'friar', 'field_surgeon', 5, 5);
    expect(idle.hpLeftBp).toEqual([BP, BP]);
    expect(idle.ticks).toBeLessThan(DUEL_RULES.maxTicks);
  });

  it('melee never hits air and heals top units back up', () => {
    const vsAir = runDuel(duelContent, 'bonker', 'gyrocopter', 4, 1);
    expect(vsAir.hpLeftBp).toEqual([0, BP]);
    // Friars win against Bonkers and heal each other back to full afterwards (3 Bonkers: with the
    // three-wide front of A16.4 L4, 11 Bonkers now overrun 5 Friars).
    const healers = runDuel(duelContent, 'friar', 'bonker', 5, 3);
    expect(healers.hpLeftBp).toEqual([BP, 0]);
  });
});

describe('strongWeak (A2.6 "Strong vs" / "Weak vs")', () => {
  const unit = (id: string, age: UnitDef['age']): UnitDef => ({ ...(content.units.bonker as UnitDef), id, age });
  const units = [unit('a', 'stone'), unit('b', 'stone'), unit('c', 'medieval'), unit('d', 'gunpowder'), unit('e', 'stone'), unit('f', 'stone'), unit('g', 'stone')];
  const ageIndex = { stone: 0, medieval: 1, gunpowder: 2, modern: 3, future: 4 };
  const matrix = { a: { a: 5000, b: 9000, c: 8000, d: 10000, e: 5000, f: 1000, g: 7000 } };

  it('takes the top and bottom 3 of the same or adjacent age, winners and losers only', () => {
    expect(strongWeak('a', units, ageIndex, matrix)).toEqual({ strongVs: ['b', 'c', 'g'], weakVs: ['f'] });
  });

  it('returns empty lists for units without a row', () => {
    expect(strongWeak('b', units, ageIndex, matrix)).toEqual({ strongVs: [], weakVs: [] });
  });
});
