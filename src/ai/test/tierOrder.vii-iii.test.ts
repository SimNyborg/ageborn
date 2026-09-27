import { describe, expect, it } from 'vitest';
import { sampleSize, tierMatches, winBar } from './runs';

/** DESIGN C2/WP3 DoD, B13: tier 7 beats tier 3 in ≥ 75% of matches (400 matches with AI_FULL=1). */
describe('tier ordering', () => {
  const n = sampleSize(100, 400);
  it(`tier 7 beats tier 3 ≥ 75% (${n} Short Wars, Balanced brain, mirrored seeds)`, () => {
    const r = tierMatches(7, 3, n);
    console.log(`tier 7 vs 3: ${r.winsA}-${r.winsB}-${r.draws} (${r.rateBp / 100}%), bar ${winBar(7500, n) / 100}%`);
    expect(r.rejected).toBe(0);
    expect(r.rateBp).toBeGreaterThanOrEqual(winBar(7500, n));
  }, 3600000);
});
