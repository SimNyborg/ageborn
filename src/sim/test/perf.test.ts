import { describe, expect, it } from 'vitest';
import { replayMatch } from '../replay';
import { fixture } from './helpers';
import { recordStress } from './stress';

/**
 * Regression guard for the B3 budget (a headless Full War ≤ 400 ms on desktop Node; the precise
 * number comes from `npm run bench -- src/sim`). The bound here is loose so slow CI machines do not
 * flake; a real regression (an accidental O(n³) loop) blows well past it.
 */
describe('performance (B3, B16)', () => {
  it('replays a worst-case Full War well within budget', () => {
    const doc = recordStress();
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 3; i += 1) {
      const t0 = performance.now();
      const sim = replayMatch(doc, fixture);
      best = Math.min(best, performance.now() - t0);
      expect(sim.state.tick).toBe(11400);
    }
    expect(best).toBeLessThan(1500);
  }, 30000);
});
