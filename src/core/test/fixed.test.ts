import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyBp,
  applyBpChain,
  clamp,
  cosDegBp,
  fromSideP,
  idiv,
  isqrt,
  LANE_MLU,
  lerpBp,
  msToTicks,
  mulDiv,
  pctToBp,
  ratioBp,
  roundDiv,
  sinDegBp,
  toSideP,
} from '../fixed';

describe('bp math', () => {
  it('applies multipliers with truncation toward zero', () => {
    expect(applyBp(1000, 12500)).toBe(1250);
    expect(applyBp(999, 5000)).toBe(499);
    expect(applyBp(-999, 5000)).toBe(-499);
    expect(applyBp(7, 10000)).toBe(7);
  });

  it('chains multipliers one at a time (order matters with truncation)', () => {
    expect(applyBpChain(101, [5000, 15000])).toBe(75); // 101 -> 50 -> 75
    expect(applyBpChain(101, [15000, 5000])).toBe(75); // 101 -> 151 -> 75
    expect(applyBpChain(33, [3333, 30000])).toBe(30); // 33 -> 10 -> 30
    expect(applyBpChain(33, [30000, 3333])).toBe(32); // 33 -> 99 -> 32
  });

  it('converts percentages and ratios', () => {
    expect(pctToBp(25)).toBe(2500);
    expect(ratioBp(1, 3)).toBe(3333);
    expect(mulDiv(7, 3, 2)).toBe(10);
  });

  it('divides as integers', () => {
    expect(idiv(7, 2)).toBe(3);
    expect(idiv(-7, 2)).toBe(-3);
    expect(roundDiv(5, 2)).toBe(3);
    expect(roundDiv(-5, 2)).toBe(-3);
    expect(roundDiv(4, 3)).toBe(1);
  });

  it('interpolates with a bp weight', () => {
    expect(lerpBp(0, 1000, 2500)).toBe(250);
    expect(lerpBp(1000, 0, 10000)).toBe(0);
  });
});

describe('time', () => {
  it('msToTicks = max(1, round(ms / 50))', () => {
    expect(msToTicks(0)).toBe(1);
    expect(msToTicks(24)).toBe(1);
    expect(msToTicks(50)).toBe(1);
    expect(msToTicks(74)).toBe(1);
    expect(msToTicks(75)).toBe(2);
    expect(msToTicks(1000)).toBe(20);
    expect(msToTicks(1225)).toBe(25);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (ms) => {
        expect(msToTicks(ms)).toBe(Math.max(1, Math.round(ms / 50)));
      }),
    );
  });
});

describe('isqrt', () => {
  it('matches known answers', () => {
    expect([0, 1, 2, 3, 4, 15, 16, 17, 1_000_000].map(isqrt)).toEqual([0, 1, 1, 1, 2, 3, 4, 4, 1000]);
    expect(isqrt(2 ** 31 - 1)).toBe(46340);
  });

  it('is the floor square root', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 40 }), (n) => {
        const r = isqrt(n);
        expect(r * r).toBeLessThanOrEqual(n);
        expect((r + 1) * (r + 1)).toBeGreaterThan(n);
      }),
    );
  });
});

describe('trig tables', () => {
  it('matches known answers', () => {
    expect(sinDegBp(0)).toBe(0);
    expect(sinDegBp(30)).toBe(5000);
    expect(sinDegBp(90)).toBe(10000);
    expect(sinDegBp(150)).toBe(5000);
    expect(sinDegBp(210)).toBe(-5000);
    expect(sinDegBp(-90)).toBe(-10000);
    expect(sinDegBp(450)).toBe(10000);
    expect(cosDegBp(0)).toBe(10000);
    expect(cosDegBp(60)).toBe(5000);
    expect(cosDegBp(180)).toBe(-10000);
  });

  it('stays within 1 bp of Math.sin', () => {
    for (let d = -720; d <= 720; d += 1) {
      expect(Math.abs(sinDegBp(d) - Math.round(Math.sin((d * Math.PI) / 180) * 10000))).toBeLessThanOrEqual(1);
    }
  });
});

describe('lane helpers', () => {
  it('maps per-side positions symmetrically', () => {
    expect(toSideP(0, 0)).toBe(0);
    expect(toSideP(0, 1)).toBe(LANE_MLU);
    expect(fromSideP(toSideP(123456, 1), 1)).toBe(123456);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
  });
});
