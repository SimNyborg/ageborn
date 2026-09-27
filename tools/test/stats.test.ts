import { describe, expect, it } from 'vitest';
import { chiSquare, gammaQ, lnGamma, longestRun, mean, median, pairedDelta, proportion, quantile, shareWithin, stdev } from '../lib/stats';

describe('descriptive statistics', () => {
  it('computes quantiles with linear interpolation', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(quantile([0, 10], 0.1)).toBeCloseTo(1);
    expect(Number.isNaN(median([]))).toBe(true);
  });

  it('computes mean, sample stdev and shares', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(stdev([5])).toBe(0);
    expect(shareWithin([1, 5, 9, 12], 5, 9)).toBe(0.5);
  });

  it('finds the longest run without a hit', () => {
    expect(longestRun([true, false, false, true, false])).toBe(2);
    expect(longestRun([])).toBe(0);
  });
});

describe('confidence intervals', () => {
  it('reports the paired win-rate delta in points around 50%', () => {
    const e = pairedDelta([1, 0.5, 0.5, 0, 1, 0.5, 0.5, 1]);
    expect(e.value).toBeCloseTo(12.5, 6);
    expect(e.lo).toBeLessThan(e.value);
    expect(e.hi).toBeGreaterThan(e.value);
    expect(e.n).toBe(8);
    // Identical pairs give a zero-width interval; `requireSamples` guards small runs.
    const flat = pairedDelta([0.5, 0.5]);
    expect([flat.value, flat.lo, flat.hi]).toEqual([0, 0, 0]);
  });

  it('matches a textbook Wilson interval', () => {
    const e = proportion(50, 100);
    expect(e.value).toBe(50);
    expect(e.lo).toBeCloseTo(40.38, 1);
    expect(e.hi).toBeCloseTo(59.62, 1);
    expect(Number.isNaN(proportion(0, 0).value)).toBe(true);
  });
});

describe('chi-square', () => {
  it('has a correct incomplete gamma', () => {
    expect(lnGamma(5)).toBeCloseTo(Math.log(24), 10);
    expect(lnGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 10);
    for (const x of [0.1, 1, 3, 12]) expect(gammaQ(1, x)).toBeCloseTo(Math.exp(-x), 10);
  });

  it('computes the statistic and p-value for a known case', () => {
    // Three equal categories: expected 20 each; χ² = (100 + 0 + 100) / 20 = 10, df 2, p = e^-5.
    const r = chiSquare([10, 20, 30], [1, 1, 1]);
    expect(r.stat).toBeCloseTo(10, 10);
    expect(r.df).toBe(2);
    expect(r.p).toBeCloseTo(Math.exp(-5), 8);
  });

  it('passes a perfect fit and fails an impossible category', () => {
    expect(chiSquare([7800, 1500, 500, 200], [7800, 1500, 500, 200]).p).toBeCloseTo(1, 6);
    expect(chiSquare([0, 5, 5], [0, 1, 1]).df).toBe(1);
    expect(chiSquare([1, 5, 5], [0, 1, 1]).p).toBe(0);
  });
});
