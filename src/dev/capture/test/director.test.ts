import { describe, expect, it } from 'vitest';
import { CameraDirector, clampFraming, framingTransform, shotTarget, smootherstep, springOmega, springStep, type SceneSample } from '../director';

const WORLD = { left: -180, right: 2180 };
const scene = (left: number | null, right: number | null, units: SceneSample['units'] = []): SceneSample => ({ fronts: { left, right }, units, bases: [-70, 2070] });

describe('capture camera director', () => {
  it('turns a framing into the world transform (width fits the canvas, ground at its share)', () => {
    const t = framingTransform({ x: 1000, w: 500, ground: 0.75 }, 540, 960);
    expect(t.scale).toBeCloseTo(540 / 500);
    // world x 1000 sits at the canvas centre, world y 0 on the ground line
    expect(t.x + 1000 * t.scale).toBeCloseTo(270);
    expect(t.y).toBeCloseTo(720);
  });

  it('never frames past the world ends', () => {
    expect(clampFraming({ x: -500, w: 600, ground: 0.7 }, WORLD).x).toBe(-180 + 300);
    expect(clampFraming({ x: 5000, w: 600, ground: 0.7 }, WORLD).x).toBe(2180 - 300);
    // wider than the world: the whole world, centred
    const wide = clampFraming({ x: 0, w: 9000, ground: 0.7 }, WORLD);
    expect(wide.w).toBe(2360);
    expect(wide.x).toBe(1000);
  });

  it('frames the fight between both fronts, zoomed to fit within its limits', () => {
    const cur = { x: 0, w: 800, ground: 0.7 };
    const close = shotTarget({ kind: 'fight', wMin: 400, wMax: 1000, margin: 100 }, scene(900, 1000), cur);
    expect(close.x).toBe(950);
    expect(close.w).toBe(400);
    const apart = shotTarget({ kind: 'fight', wMin: 400, wMax: 1000, margin: 100 }, scene(300, 1700), cur);
    expect(apart.w).toBe(1000);
    // one army alone: its front, looking toward the enemy
    const lone = shotTarget({ kind: 'fight', wMin: 400 }, scene(600, null), cur);
    expect(lone.x).toBeGreaterThan(600);
  });

  it('tracks a unit with room ahead of it in the direction it faces', () => {
    const units = [{ id: 7, side: 1 as const, x: 1200 }];
    const t = shotTarget({ kind: 'track', id: 7, w: 500, lead: 0.2 }, scene(null, 1200, units), { x: 0, w: 500, ground: 0.7 });
    // side 1 faces left: the camera looks left of the unit
    expect(t.x).toBeCloseTo(1100);
  });

  it('eases to a shot over its time and lands exactly on it, whatever the frame length', () => {
    for (const dt of [1000 / 30, 1000 / 60, 50]) {
      const d = new CameraDirector({ x: 500, w: 600, ground: 0.7 }, WORLD);
      d.setShot({ kind: 'look', x: 1200, w: 450, how: { move: 'ease', ms: 600 } });
      let f = d.framing;
      for (let t = 0; t < 600 - 1e-6; t += dt) f = d.update(dt, scene(null, null));
      expect(f.x).toBeCloseTo(1200, 6);
      expect(f.w).toBeCloseTo(450, 6);
    }
  });

  it('cuts at once and keeps following a moving target with a spring', () => {
    const d = new CameraDirector({ x: 500, w: 600, ground: 0.7 }, WORLD);
    d.setShot({ kind: 'fight', wMin: 500, wMax: 500, how: { move: 'cut' } });
    expect(d.update(33, scene(900, 1100)).x).toBe(1000);
    // the fight moves 100 lu to the left: the camera follows smoothly, without overshooting
    const xs: number[] = [];
    for (let i = 0; i < 90; i++) xs.push(d.update(1000 / 30, scene(800, 1000)).x);
    expect(xs[0]).toBeLessThan(1000);
    expect(xs[0]).toBeGreaterThan(900);
    expect(xs[xs.length - 1]).toBeCloseTo(900, 0);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(900 - 1e-6);
  });

  it('drifts slowly once arrived (a push in)', () => {
    const d = new CameraDirector({ x: 1000, w: 600, ground: 0.7 }, WORLD);
    d.setShot({ kind: 'look', x: 1000, w: 600, how: { move: 'cut' }, drift: -30 });
    d.update(33, scene(null, null));
    let f = d.framing;
    for (let i = 0; i < 60; i++) f = d.update(1000 / 30, scene(null, null));
    expect(f.w).toBeLessThan(600);
    // 2 s at 30 lu/s: about 60 lu narrower (the follow spring trails it a little)
    expect(f.w).toBeGreaterThan(535);
    expect(f.w).toBeLessThan(580);
  });

  it('has smooth easing and spring helpers', () => {
    expect(smootherstep(0)).toBe(0);
    expect(smootherstep(1)).toBe(1);
    expect(smootherstep(0.5)).toBeCloseTo(0.5);
    // the spring halves its error in its half-life
    const s = springStep(100, 0, 0, springOmega(400), 0.4);
    expect(s.x).toBeCloseTo(50, 1);
  });
});

describe('capture camera director on a tall canvas', () => {
  it('narrows framings that would show above the backdrop sky', () => {
    const view = { width: 540, height: 960 };
    // at ground 0.7 a 540 x 960 canvas may show at most 760 x 540 / (0.7 x 960) = 611 lu
    const f = clampFraming({ x: 1000, w: 900, ground: 0.7 }, WORLD, view);
    expect(f.w).toBeCloseTo(610.7, 0);
    expect(clampFraming({ x: 1000, w: 500, ground: 0.7 }, WORLD, view).w).toBe(500);
    const d = new CameraDirector({ x: 1000, w: 500, ground: 0.7 }, WORLD, view);
    d.setShot({ kind: 'look', x: 1000, w: 1400, how: { move: 'cut' } });
    expect(d.update(33, scene(null, null)).w).toBeLessThan(612);
  });
});
