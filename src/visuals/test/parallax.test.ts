/** Backdrop parallax on the scrolling camera (DESIGN A17.7). */
import { describe, expect, it } from 'vitest';
import { PARALLAX, placeLayer } from '../adapters/procedural/backdropView';
import { WORLD } from '../style';

const FRAME = { x0: -260, width: 1720 };

/** World range the layer covers for a placement. */
function covers(p: ReturnType<typeof placeLayer>): [number, number] {
  return [p.offset + FRAME.x0 * p.stretch, p.offset + (FRAME.x0 + FRAME.width) * p.stretch];
}

describe('backdrop parallax (A17.7)', () => {
  it('uses the A17.7 factors: sky 0.05, far 0.25, mid 0.55, ground 1', () => {
    expect(PARALLAX).toEqual({ sky: 0.05, far: 0.25, mid: 0.55, ground: 1 });
  });

  for (const view of [923, 1100, 1400, 1750]) {
    it(`always covers a ${view} lu view from one end of the world to the other`, () => {
      for (const kind of ['sky', 'far', 'mid'] as const) {
        for (let left = WORLD.worldLeftLu; left <= WORLD.worldRightLu - view + 1e-6; left += 50) {
          const [a, b] = covers(placeLayer(FRAME, PARALLAX[kind], left, view));
          expect(a).toBeLessThanOrEqual(left + 1e-6);
          expect(b).toBeGreaterThanOrEqual(left + view - 1e-6);
        }
      }
    });
  }

  it('moves at its factor of the camera movement (lower only when the art is too narrow)', () => {
    const a = placeLayer(FRAME, 0.25, 0, 923);
    const b = placeLayer(FRAME, 0.25, 100, 923);
    // Its world offset moves by (1 - factor) of the camera move, so on screen it moves at the factor.
    expect(b.offset - a.offset).toBeCloseTo(75);
    expect(a.factor).toBe(0.25);
    expect(placeLayer(FRAME, 0.55, 0, 1400).factor).toBeCloseTo((1720 - 1400) / (2360 - 1400));
  });

  it('shrinks toward the ground line when the view is short (phones)', () => {
    const p = placeLayer(FRAME, 0.25, 0, 923, 0.8);
    expect(p.scaleY).toBe(0.8);
    const [a, b] = covers(p);
    expect(a).toBeLessThanOrEqual(0);
    expect(b).toBeGreaterThanOrEqual(923);
  });
});
