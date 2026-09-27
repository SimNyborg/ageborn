import { describe, expect, it } from 'vitest';
import { CARD_H, CARD_W, fanLayout } from '../cardFan';

describe('fan layout', () => {
  it('keeps every card of 1 to 24 inside the 1280 × 720 stage without overlaps', () => {
    for (let n = 1; n <= 24; n++) {
      const slots = fanLayout(n);
      expect(slots).toHaveLength(n);
      for (const s of slots) {
        const hw = (CARD_W * s.scale) / 2 + 4;
        const hh = (CARD_H * s.scale) / 2 + 4;
        expect(s.x - hw).toBeGreaterThanOrEqual(0);
        expect(s.x + hw).toBeLessThanOrEqual(1280);
        expect(s.y - hh).toBeGreaterThanOrEqual(0);
        // Leave room for the copies bar under the lowest row and the summary buttons.
        expect(s.y + hh + 40 * s.scale).toBeLessThanOrEqual(720);
      }
      for (let i = 1; i < n; i++) {
        const a = slots[i - 1];
        const b = slots[i];
        if (!a || !b || Math.abs(a.y - b.y) > 60) continue;
        expect(b.x - a.x).toBeGreaterThanOrEqual(CARD_W * b.scale);
      }
    }
  });

  it('reveals left to right: slots are in reading order', () => {
    const s = fanLayout(5);
    for (let i = 1; i < s.length; i++) expect((s[i]?.x ?? 0) > (s[i - 1]?.x ?? 0)).toBe(true);
  });
});
