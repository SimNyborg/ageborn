import { describe, expect, it } from 'vitest';
import { sampleSize, tierMatches, winBar } from './runs';

/** DESIGN C2/WP3 DoD, B13: tier 1 beats tier 0 in ≥ 65% of matches (400 matches with AI_FULL=1). */
describe('tier ordering', () => {
  const n = sampleSize(100, 400);
  it(`tier 1 beats tier 0 ≥ 65% (${n} Full Wars, Balanced brain, mirrored seeds)`, () => {
    const r = tierMatches(1, 0, n);
    console.log(`tier 1 vs 0: ${r.winsA}-${r.winsB}-${r.draws} (${r.rateBp / 100}%), bar ${winBar(6500, n) / 100}%`);
    expect(r.rejected).toBe(0);
    expect(r.rateBp).toBeGreaterThanOrEqual(winBar(6500, n));
  }, 3600000);
});
