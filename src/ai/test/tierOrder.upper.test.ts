import { describe, expect, it } from 'vitest';
import { sampleSize, tierMatches, winBar } from './runs';

/**
 * Owner feedback 2026-09-28 ("too easy"): the difficulty picker's upper steps (Hard VI, Expert VIII,
 * Legendary X) must be clearly ordered. Measured like `tools/sim-cli.ts strength` (card level 7, a draw
 * counts half, mirrored seeds), which also runs the full matrix against scripted players.
 */
describe('tier ordering, upper tiers', () => {
  const n = sampleSize(60, 400);
  for (const [a, b, format] of [
    [10, 6, 'standard'],
    [8, 6, 'full'],
  ] as const) {
    it(`tier ${a} beats tier ${b} ≥ 60% (${n} ${format} matches at L7, draws half)`, () => {
      const r = tierMatches(a, b, n, format, 7);
      const rateBp = Math.floor(((2 * r.winsA + r.draws) * 10000) / (2 * n));
      console.log(`tier ${a} vs ${b} (${format}): ${r.winsA}-${r.winsB}-${r.draws} (${rateBp / 100}%), bar ${winBar(6000, n) / 100}%`);
      expect(r.rejected).toBe(0);
      expect(rateBp).toBeGreaterThanOrEqual(winBar(6000, n));
    }, 3600000);
  }
});
