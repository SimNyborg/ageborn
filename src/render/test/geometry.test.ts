import { describe, expect, it } from 'vitest';
import { Camera, followFraction } from '../camera';
import { AIR_ALTITUDE_LU, depthRows, depthZ, easeToward, rowForRank } from '../depth';
import { clamp01, lerp, viewX } from '../interpolate';
import { NARROW_SCREEN_PX, WORLD_LEFT_LU, WORLD_RIGHT_LU, WORLD_WIDTH_LU, baseCenterX, pToX, screenLayout, xToP } from '../layout';
import { FixedStepClock } from '../loop';
import { SEAM_MAX_LU, SEAM_MIN_LU, SEAM_START_LU, frontLines, frontMidpoint, stepSeam } from '../seam';

describe('layout (A2.1)', () => {
  it('splits the screen 12 / 64 / 24 and fits 1,560 lu across the lane band', () => {
    const L = screenLayout(1280, 720);
    expect(WORLD_WIDTH_LU).toBe(1560);
    expect(L.topBarH).toBeCloseTo(86.4);
    expect(L.bandH).toBeCloseTo(460.8);
    expect(L.trayH).toBeCloseTo(172.8);
    expect(L.trayY).toBeCloseTo(720 - 172.8);
    expect(L.scale).toBeCloseTo(1280 / 1560);
    expect(L.offsetX).toBeCloseTo(0);
    // Infantry (~68 lu) is about 56 px at 1,280 px wide (A11).
    expect(68 * L.scale).toBeCloseTo(55.8, 0);
  });

  it('caps the scale on very wide, short screens and centres the world', () => {
    const L = screenLayout(2400, 600);
    expect(L.scale).toBeLessThan(2400 / 1560);
    expect(L.offsetX).toBeGreaterThan(0);
    expect(L.offsetX * 2 + WORLD_WIDTH_LU * L.scale).toBeCloseTo(2400);
  });

  it('maps progress and world x for both sides', () => {
    expect(pToX(20, 0)).toBe(20);
    expect(pToX(20, 1)).toBe(1180);
    expect(xToP(1180, 1)).toBe(20);
    expect(baseCenterX(0)).toBe(-70);
    expect(baseCenterX(1)).toBe(1270);
  });
});

describe('camera (A2.1)', () => {
  it('fits the whole world with no scrolling by default', () => {
    const c = new Camera();
    c.resize(1280, 720);
    const left = c.worldToScreen(WORLD_LEFT_LU, 0);
    const right = c.worldToScreen(WORLD_RIGHT_LU, 0);
    expect(left.x).toBeCloseTo(0);
    expect(right.x).toBeCloseTo(1280);
    expect(left.y).toBeCloseTo(c.layout.groundY);
    const back = c.screenToWorld(640, 300);
    const again = c.worldToScreen(back.x, back.y);
    expect(again.x).toBeCloseTo(640);
    expect(again.y).toBeCloseTo(300);
  });

  it('offers pinch zoom up to 1.6x only below 900 CSS px', () => {
    const wide = new Camera();
    wide.resize(1280, 720);
    wide.setZoom(1.5);
    expect(wide.zoom).toBe(1);
    const phone = new Camera();
    phone.resize(NARROW_SCREEN_PX - 56, 390);
    expect(phone.canZoom).toBe(true);
    phone.setZoom(3);
    expect(phone.zoom).toBe(1.6);
    phone.setZoom(0.5);
    expect(phone.zoom).toBe(1);
  });

  it('follows the front midpoint with k = 0.08 per 60 fps frame, scaled by dt', () => {
    expect(followFraction(0.08, 1000 / 60)).toBeCloseTo(0.08);
    expect(followFraction(0.08, 2000 / 60)).toBeCloseTo(1 - 0.92 * 0.92);
    const c = new Camera();
    c.resize(800, 400);
    c.setZoom(1.6);
    const start = c.centerX;
    c.follow(start + 200);
    c.update(1000 / 60);
    expect(c.centerX - start).toBeCloseTo(16, 0);
    for (let i = 0; i < 600; i++) c.update(1000 / 60);
    expect(c.centerX).toBeCloseTo(start + 200, 0);
  });

  it('stays inside the world while zoomed and resets on double tap', () => {
    const c = new Camera();
    c.resize(800, 400);
    c.setZoom(1.6);
    c.follow(-1000);
    for (let i = 0; i < 300; i++) c.update(16);
    expect(c.screenToWorld(0, 0).x).toBeGreaterThanOrEqual(WORLD_LEFT_LU - 1e-6);
    c.reset();
    expect(c.zoom).toBe(1);
    expect(c.worldToScreen(WORLD_LEFT_LU, 0).x).toBeCloseTo(0);
  });
});

describe('depth rows (A2.1)', () => {
  it('puts the two front-rank units at -8 / +8 and the rest at -16, 0, +16 by rank mod 3', () => {
    expect([0, 1, 2, 3, 4, 5].map(rowForRank)).toEqual([-8, 8, 16, -16, 0, 16]);
  });

  it('orders each side by p descending, then id', () => {
    const rows = depthRows([
      { id: 5, side: 0, x: 300, air: false },
      { id: 2, side: 0, x: 500, air: false },
      { id: 9, side: 0, x: 500, air: false },
      { id: 3, side: 1, x: 700, air: false }, // p = 500: front for side 1
      { id: 4, side: 1, x: 900, air: false },
      { id: 7, side: 1, x: 650, air: true },
    ]);
    expect(rows.get(2)).toBe(-8);
    expect(rows.get(9)).toBe(8);
    expect(rows.get(5)).toBe(16);
    expect(rows.get(3)).toBe(-8);
    expect(rows.get(4)).toBe(8);
    expect(rows.get(7)).toBe(AIR_ALTITUDE_LU);
  });

  it('sorts nearer rows on top and air above every ground unit', () => {
    expect(depthZ(16, false, 1)).toBeGreaterThan(depthZ(-16, false, 2));
    expect(depthZ(AIR_ALTITUDE_LU, true, 3)).toBeGreaterThan(depthZ(16, false, 999));
    expect(easeToward(0, 16, 5)).toBe(5);
    expect(easeToward(14, 16, 5)).toBe(16);
  });
});

describe('interpolation (B6)', () => {
  it('lerps prevX to x by alpha, in lu', () => {
    expect(viewX({ prevX: 100_000, x: 110_000 }, 0.5)).toBe(105);
    expect(viewX({ prevX: 100_000, x: 110_000 }, 2)).toBe(110);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(clamp01(-1)).toBe(0);
  });
});

describe('split-age seam (A11)', () => {
  it('starts at 600, drifts at most 20 lu/s and stays within [450, 750]', () => {
    let s = SEAM_START_LU;
    s = stepSeam(s, 1000, 1000);
    expect(s).toBe(620);
    for (let i = 0; i < 100; i++) s = stepSeam(s, 1000, 1000);
    expect(s).toBe(SEAM_MAX_LU);
    for (let i = 0; i < 100; i++) s = stepSeam(s, -500, 1000);
    expect(s).toBe(SEAM_MIN_LU);
    expect(stepSeam(600, 605, 1000)).toBe(605);
  });

  it('targets the midpoint of the two ground front lines (gates when a side is empty)', () => {
    const units = [
      { side: 0 as const, x: 400, air: false },
      { side: 0 as const, x: 520, air: false },
      { side: 1 as const, x: 700, air: false },
      { side: 1 as const, x: 300, air: true },
    ];
    expect(frontLines(units)).toEqual({ left: 520, right: 700 });
    expect(frontMidpoint(units)).toBe(610);
    expect(frontMidpoint([])).toBe(600);
    expect(frontMidpoint([{ side: 0, x: 800, air: false }])).toBe(1000);
  });
});

describe('fixed-step clock (B6 loop)', () => {
  it('adds min(frame, 250) × speed and yields whole 50 ms ticks', () => {
    const c = new FixedStepClock();
    c.add(120, 1, false);
    let n = 0;
    while (c.consume()) n++;
    expect(n).toBe(2);
    expect(c.alpha).toBeCloseTo(0.4);
    c.add(1000, 2, false); // clamped to 250 × 2
    n = 0;
    while (c.consume()) n++;
    expect(n).toBe(10);
  });

  it('adds nothing while frozen or at speed 0', () => {
    const c = new FixedStepClock();
    c.add(200, 1, true);
    c.add(200, 0, false);
    expect(c.consume()).toBe(false);
    expect(c.alpha).toBe(0);
  });
});
