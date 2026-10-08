/** Camera moments (A12, usability audit #5, #17): push in on a base, hold, ease out. */
import { describe, expect, it } from 'vitest';
import { Camera, pushAmount, type CameraPush } from '../camera';

const push: CameraPush = { x: -70, y: -60, zoom: 1.3, inMs: 400, holdMs: 1000, outMs: 600 };

describe('camera push', () => {
  it('eases in, holds and eases out', () => {
    expect(pushAmount(push, 0)).toBe(0);
    expect(pushAmount(push, 200)).toBeGreaterThan(0.3);
    expect(pushAmount(push, 200)).toBeLessThan(0.7);
    expect(pushAmount(push, 400)).toBe(1);
    expect(pushAmount(push, 1300)).toBe(1);
    expect(pushAmount(push, 1700)).toBeLessThan(1);
    expect(pushAmount(push, 2000)).toBe(0);
    // outMs 0 holds until released.
    expect(pushAmount({ ...push, outMs: 0 }, 60_000)).toBe(1);
  });

  it('zooms around the focus and brings it toward the middle, then returns to the fit', () => {
    const c = new Camera();
    c.resize(1280, 720);
    c.setHome(0);
    const before = c.worldToScreen(push.x, push.y);
    const fit = c.transform();
    c.pushTo(push);
    c.update(500);
    const t = c.transform();
    expect(t.scale).toBeCloseTo(fit.scale * 1.3);
    const after = c.worldToScreen(push.x, push.y);
    expect(after.x).toBeGreaterThan(before.x);
    // Taps map back through the pushed transform.
    const back = c.screenToWorld(after.x, after.y);
    expect(back.x).toBeCloseTo(push.x);
    expect(back.y).toBeCloseTo(push.y);
    c.update(2000);
    expect(c.pushed).toBe(0);
    expect(c.transform()).toEqual(fit);
  });

  it('a held push eases out on release', () => {
    const c = new Camera();
    c.resize(1280, 720);
    c.pushTo({ ...push, outMs: 0 });
    c.update(5000);
    expect(c.pushed).toBe(1);
    c.release(400);
    c.update(200);
    expect(c.pushed).toBeGreaterThan(0);
    expect(c.pushed).toBeLessThan(1);
    c.update(400);
    expect(c.pushed).toBe(0);
  });
});

describe('camera punch (A12 base destroyed)', () => {
  it('kicks in fast, springs back and settles to nothing; reduce motion skips it', () => {
    const c = new Camera();
    c.resize(844, 390);
    c.setHome(1);
    const fit = c.transform();
    c.punch(0.07, 460);
    c.update(70);
    expect(c.punchScale).toBeCloseTo(1.07, 3);
    expect(c.transform().scale).toBeCloseTo(fit.scale * 1.07, 3);
    // the spring overshoots a little below 1 on the way back
    let lowest = Infinity;
    for (let t = 70; t < 460; t += 10) {
      c.update(10);
      lowest = Math.min(lowest, c.punchScale);
    }
    expect(lowest).toBeLessThan(1);
    expect(lowest).toBeGreaterThan(0.99);
    c.update(20);
    expect(c.punchScale).toBe(1);
    expect(c.transform()).toEqual(fit);
    const calm = new Camera();
    calm.resize(844, 390);
    calm.reduceMotion = true;
    calm.punch(0.07, 460);
    calm.update(70);
    expect(calm.punchScale).toBe(1);
  });

  it('a framing pull-back below 1x keeps the ground line where it was', () => {
    const c = new Camera();
    c.resize(844, 390);
    c.setHome(1);
    const fit = c.transform();
    c.pushTo({ x: 2900, y: -150, zoom: 0.86, inMs: 300, holdMs: 0, outMs: 0 });
    c.update(400);
    const t = c.transform();
    expect(t.scale).toBeCloseTo(fit.scale * 0.86, 3);
    expect(t.y).toBe(c.layout.groundY);
  });
});
