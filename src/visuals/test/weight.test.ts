/**
 * Realistic weight for rendered units (docs/ui-plan.md 5.8; MR-100, MR-103): bodies are rigid, so
 * the spawn arrival and the hit reaction are offsets and timing by mass, never a scale squash.
 */
import { describe, expect, it } from 'vitest';
import { flinchOffset, spawnArrival, unitMass, UNIT_WEIGHT, walkStep, WALK_STEP, type UnitMass } from '../adapters/atlas';

const MASSES: UnitMass[] = ['light', 'medium', 'heavy'];

describe('unit weight (5.8)', () => {
  it('sorts units into mass classes by role and height', () => {
    expect(unitMass('infantry', 68)).toBe('light');
    expect(unitMass('ranged', 64)).toBe('light');
    expect(unitMass('antiArmor', 72)).toBe('medium');
    expect(unitMass('infantry', 104)).toBe('medium');
    expect(unitMass('heavy', 80)).toBe('heavy');
    expect(unitMass(null, 196)).toBe('heavy');
  });

  it('MR-100: a spawn drops in and settles into its stance; heavier bodies take longer and settle lower', () => {
    for (const m of MASSES) {
      const w = UNIT_WEIGHT[m];
      expect(spawnArrival(m, 0).y).toBeLessThan(0);
      expect(spawnArrival(m, 0).alpha).toBe(0);
      expect(spawnArrival(m, w.spawnMs).y).toBeCloseTo(0, 6);
      expect(spawnArrival(m, w.spawnMs).alpha).toBe(1);
      let low = 0;
      for (let t = 0; t <= w.spawnMs; t += 5) low = Math.max(low, spawnArrival(m, t).y);
      expect(low).toBeGreaterThan(0);
      expect(low).toBeLessThanOrEqual(w.settleLu + 1e-9);
    }
    expect(UNIT_WEIGHT.heavy.spawnMs).toBeGreaterThan(UNIT_WEIGHT.light.spawnMs);
    expect(UNIT_WEIGHT.heavy.settleLu).toBeGreaterThan(UNIT_WEIGHT.light.settleLu);
  });

  it('MR-103: a hit flinches back by mass (light 4-6, medium 2-3, heavy 1) and returns with one small overshoot', () => {
    const peak = (m: UnitMass) => {
      let p = 0;
      let over = 0;
      for (let t = 0; t <= UNIT_WEIGHT[m].flinchMs; t += 2) {
        p = Math.max(p, flinchOffset(m, t));
        over = Math.min(over, flinchOffset(m, t));
      }
      return { p, over };
    };
    expect(peak('light').p).toBeGreaterThanOrEqual(4);
    expect(peak('light').p).toBeLessThanOrEqual(6);
    expect(peak('medium').p).toBeGreaterThanOrEqual(2);
    expect(peak('medium').p).toBeLessThanOrEqual(3);
    expect(peak('heavy').p).toBeLessThanOrEqual(1.01);
    for (const m of MASSES) {
      expect(peak(m).over).toBeLessThan(0);
      expect(peak(m).over).toBeGreaterThan(-0.2 * UNIT_WEIGHT[m].flinchLu);
      expect(flinchOffset(m, UNIT_WEIGHT[m].flinchMs)).toBe(0);
      expect(UNIT_WEIGHT[m].flinchMs).toBeGreaterThanOrEqual(120);
      expect(UNIT_WEIGHT[m].flinchMs).toBeLessThanOrEqual(200);
    }
  });
});

describe('walkStep (owner feedback 2026-10-02: units step, not float)', () => {
  it('bounces twice per cycle, grounded at contact, lighter units more', () => {
    for (const m of ['light', 'medium', 'heavy'] as const) {
      expect(walkStep(m, 0).y).toBeCloseTo(0);
      expect(walkStep(m, 0.5).y).toBeCloseTo(0);
      expect(walkStep(m, 0.25).y).toBeCloseTo(-WALK_STEP[m].bobLu);
      expect(walkStep(m, 0.75).y).toBeCloseTo(-WALK_STEP[m].bobLu);
      expect(walkStep(m, 1.25).y).toBeCloseTo(walkStep(m, 0.25).y);
      expect(Math.abs(walkStep(m, 0.25).rot)).toBeCloseTo(WALK_STEP[m].swayRad);
    }
    expect(WALK_STEP.light.bobLu).toBeGreaterThan(WALK_STEP.heavy.bobLu);
    expect(WALK_STEP.light.swayRad).toBeGreaterThan(WALK_STEP.heavy.swayRad);
  });
});
