import { describe, expect, it } from 'vitest';
import { sampleSize, tierMatches, winBar } from './runs';

/** DESIGN C2/WP3 DoD, B13: tier 10 beats tier 1 in ≥ 90% of matches (400 matches with AI_FULL=1). */
describe('tier ordering', () => {
  const n = sampleSize(100, 400);
  it(`tier 10 beats tier 1 ≥ 90% (${n} Full Wars, Balanced brain, mirrored seeds)`, () => {
    const r = tierMatches(10, 1, n);
    console.log(`tier 10 vs 1: ${r.winsA}-${r.winsB}-${r.draws} (${r.rateBp / 100}%), bar ${winBar(9000, n) / 100}%`);
    expect(r.rejected).toBe(0);
    expect(r.rateBp).toBeGreaterThanOrEqual(winBar(9000, n));
  }, 3600000);
});
