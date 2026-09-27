import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { baseTimeToKill, commonArmy, powerCoverage } from '../lib/scenarios';

describe('base time to kill scenario (A2.14)', () => {
  it('builds a 60-pop army of the age Commons', () => {
    const army = commonArmy(content, 'stone');
    expect(army.every((u) => u.rarity === 'common' && u.age === 'stone')).toBe(true);
    expect(new Set(army.map((u) => u.group))).toEqual(new Set(['infantry', 'ranged', 'heavy']));
    const pop = army.reduce((a, u) => a + u.pop, 0);
    expect(pop).toBeLessThanOrEqual(content.economy.popCap);
    expect(pop).toBeGreaterThan(content.economy.popCap - 2);
  });

  it('destroys a full same-age base and measures from the first hit', () => {
    const r = baseTimeToKill(content, 'medieval');
    expect(r.destroyed).toBe(true);
    expect(r.seconds).toBeGreaterThan(0);
    expect(r.fromSpawnSeconds).toBeGreaterThan(r.seconds);
    expect(baseTimeToKill(content, 'medieval')).toEqual(r);
  });
});

describe('power damage per unit (A2.9)', () => {
  it('reproduces the A5.7 "Per unit" column', () => {
    const per = (id: string): number => powerCoverage(content, content.powers[id] as never)?.perUnit ?? Number.NaN;
    expect(per('stampede')).toBe(150);
    expect(per('meteor_shower')).toBe(140);
    expect(per('arrow_storm')).toBeCloseTo(142.2, 1);
    expect(per('broadside')).toBe(240);
    expect(per('carpet_bomber')).toBe(360);
    expect(per('orbital_lance')).toBe(450);
  });

  it('skips powers that deal no damage', () => {
    for (const id of ['royal_decree', 'smoke_screen', 'paratroopers', 'nanite_surge']) {
      expect(powerCoverage(content, content.powers[id] as never)).toBeNull();
    }
  });
});
