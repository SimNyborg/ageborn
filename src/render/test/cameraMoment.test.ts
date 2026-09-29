/**
 * The own-evolve moment (MR-80; ui-plan 5.1 "never block", UI-3 acceptance in 6.5): the camera frames
 * your base from anywhere (a 500 ms pan and a push, at most 3 s), then returns; it is skipped while
 * the player works the camera; any camera input ends it within one frame.
 */
import { describe, expect, it } from 'vitest';
import { Camera, type CameraPush } from '../camera';

const BASE_X = -70;
const push: CameraPush = { x: BASE_X, y: -60, zoom: 1.3, inMs: 450, holdMs: 4000, outMs: 800 };

function farCamera(): Camera {
  const c = new Camera();
  c.resize(844, 390);
  c.setHome(0);
  // Follow the fight far up the lane.
  c.follow(1500);
  c.resumeFollow(true);
  for (let i = 0; i < 200; i++) c.update(16);
  return c;
}

describe('the evolve moment (MR-80)', () => {
  it('frames your base from anywhere, holds at most 3 s, then follow returns to the fight', () => {
    const c = farCamera();
    const far = c.centerX;
    expect(c.inView(BASE_X)).toBe(false);
    expect(c.frameMoment(BASE_X, push)).toBe(true);
    for (let i = 0; i < 40; i++) c.update(16);
    expect(c.inView(BASE_X)).toBe(true);
    expect(c.pushed).toBeGreaterThan(0);
    // Still framed well into the beat: follow does not pull it away.
    for (let i = 0; i < 100; i++) c.update(16);
    expect(c.inView(BASE_X)).toBe(true);
    // Over after 3 s; the push eases out and follow takes the camera back toward the fight.
    for (let i = 0; i < 400; i++) c.update(16);
    expect(c.inMoment).toBe(false);
    expect(c.pushed).toBe(0);
    expect(c.centerX).toBeGreaterThan(far - 50);
  });

  it('is skipped while the player works the camera', () => {
    const c = farCamera();
    c.dragStart();
    c.dragBy(-40);
    c.dragEnd(0);
    c.update(16);
    expect(c.frameMoment(BASE_X, push)).toBe(false);
    expect(c.pushed).toBe(0);
  });

  it('any camera input ends it at once', () => {
    const c = farCamera();
    expect(c.frameMoment(BASE_X, push)).toBe(true);
    for (let i = 0; i < 20; i++) c.update(16);
    expect(c.pushed).toBeGreaterThan(0);
    c.dragStart();
    expect(c.inMoment).toBe(false);
    expect(c.pushed).toBe(0);
    // The power drag and the minimap end it too.
    const d = farCamera();
    d.frameMoment(BASE_X, push);
    d.hold('powerDrag', true);
    expect(d.inMoment).toBe(false);
  });

  it('a Manual camera left alone eases back to where it was', () => {
    const c = farCamera();
    c.dragStart();
    c.dragBy(-20);
    c.dragEnd(0);
    for (let i = 0; i < 160; i++) c.update(16);
    const was = c.centerX;
    expect(c.frameMoment(BASE_X, push)).toBe(true);
    for (let i = 0; i < 300; i++) c.update(16);
    expect(c.inMoment).toBe(false);
    for (let i = 0; i < 60; i++) c.update(16);
    expect(c.centerX).toBeCloseTo(was, 0);
  });
});
