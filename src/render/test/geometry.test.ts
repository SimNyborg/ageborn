import { describe, expect, it } from 'vitest';
import { Camera } from '../camera';
import { AIR_ALTITUDE_LU, CROWD_ROWS_LU, crowdRow, depthRows, depthZ, easeToward, rowForRank } from '../depth';
import { clamp01, lerp, viewX } from '../interpolate';
import { LANE_LU, WORLD_LEFT_LU, WORLD_RIGHT_LU, WORLD_WIDTH_LU, baseCenterX, pToX, screenLayout, xToP } from '../layout';
import { FixedStepClock } from '../loop';
import { SEAM_MAX_LU, SEAM_MIN_LU, SEAM_START_LU, frontLines, frontMidpoint, stepSeam } from '../seam';

describe('layout (A17.7)', () => {
  it('takes the lane from core: 2,000 lu, a 2,360 lu world from -180 to 2,180', () => {
    expect(LANE_LU).toBe(2000);
    expect(WORLD_WIDTH_LU).toBe(2360);
    expect(WORLD_LEFT_LU).toBe(-180);
    expect(WORLD_RIGHT_LU).toBe(2180);
  });

  it('desktop: 12 / 64 / 24 and about 1,400 lu across (infantry ~62 px at 1280 × 720)', () => {
    const L = screenLayout(1280, 720);
    expect(L.device).toBe('desktop');
    expect(L.topBarH).toBeCloseTo(86.4);
    expect(L.bandH).toBeCloseTo(460.8);
    expect(L.trayH).toBeCloseTo(172.8);
    expect(L.scale).toBeCloseTo(1280 / 1400);
    expect(L.viewLu).toBeCloseTo(1400);
    expect(68 * L.scale).toBeCloseTo(62.2, 0);
  });

  it('phone: 10% (min 36 px) / 68% / 22%, 290 lu of height (infantry >= 60 px on 844 × 390)', () => {
    const L = screenLayout(844, 390);
    expect(L.device).toBe('phone');
    expect(L.topBarH).toBeCloseTo(39);
    expect(L.bandH).toBeCloseTo(265.2);
    expect(L.trayH).toBeCloseTo(85.8);
    expect(L.scale).toBeCloseTo(265.2 / 290);
    expect(68 * L.scale).toBeGreaterThanOrEqual(60);
    expect(L.viewLu).toBeCloseTo(923, 0);
    expect(screenLayout(667, 300).topBarH).toBe(36);
  });

  it('tablet: about 1,100 lu across, capped by the band height on short wide screens', () => {
    const T = screenLayout(1024, 768);
    expect(T.device).toBe('tablet');
    expect(T.viewLu).toBeCloseTo(1100);
    const wide = screenLayout(2400, 600);
    expect(wide.scale).toBeCloseTo((600 * 0.64) / 330);
  });

  it('maps progress and world x for both sides', () => {
    expect(pToX(20, 0)).toBe(20);
    expect(pToX(20, 1)).toBe(1980);
    expect(xToP(1980, 1)).toBe(20);
    expect(baseCenterX(0)).toBe(-70);
    expect(baseCenterX(1)).toBe(2070);
  });
});

describe('camera basics (A17.4)', () => {
  it('opens with your base at the left edge and maps screen and world both ways', () => {
    const c = new Camera();
    c.resize(1280, 720);
    c.setHome(0);
    expect(c.worldToScreen(WORLD_LEFT_LU, 0).x).toBeCloseTo(0);
    expect(c.worldToScreen(WORLD_LEFT_LU, 0).y).toBeCloseTo(c.layout.groundY);
    const back = c.screenToWorld(640, 300);
    const again = c.worldToScreen(back.x, back.y);
    expect(again.x).toBeCloseTo(640);
    expect(again.y).toBeCloseTo(300);
    const other = new Camera();
    other.resize(1280, 720);
    other.setHome(1);
    expect(other.worldToScreen(WORLD_RIGHT_LU, 0).x).toBeCloseTo(1280);
  });

  it('zooms within [0.8, 1.25] on every device, and a double tap resets it', () => {
    const c = new Camera();
    c.resize(1280, 720);
    c.setZoom(3);
    expect(c.zoom).toBe(1.25);
    c.setZoom(0.1);
    expect(c.zoom).toBe(0.8);
    c.reset();
    expect(c.zoom).toBe(1);
    expect(c.mode).toBe('follow');
  });

  it('fixes the centre on the lane middle when the whole world fits', () => {
    const c = new Camera();
    c.resize(4000, 600);
    c.setZoom(0.8);
    expect(c.viewLu).toBeGreaterThanOrEqual(WORLD_WIDTH_LU);
    expect(c.bounds()).toEqual({ lo: 1000, hi: 1000 });
  });
});

describe('depth rows (A2.1, three-wide front)', () => {
  it('puts the three front-rank units at -12 / 0 / +12 and the rest at -16, 0, +16 by rank mod 3', () => {
    expect([0, 1, 2, 3, 4, 5].map(rowForRank)).toEqual([-12, 0, 12, -16, 0, 16]);
  });

  it('orders each side by p descending, then id', () => {
    const rows = depthRows([
      { id: 5, side: 0, x: 300, air: false },
      { id: 2, side: 0, x: 500, air: false },
      { id: 9, side: 0, x: 500, air: false },
      { id: 3, side: 1, x: 1500, air: false }, // p = 500: front for side 1
      { id: 4, side: 1, x: 1700, air: false },
      { id: 7, side: 1, x: 1450, air: true },
    ]);
    expect(rows.get(2)).toBe(-12);
    expect(rows.get(9)).toBe(0);
    expect(rows.get(5)).toBe(12);
    expect(rows.get(3)).toBe(-12);
    expect(rows.get(4)).toBe(0);
    expect(rows.get(7)).toBe(AIR_ALTITUDE_LU);
  });

  it('spreads a siege crowd at the enemy gate over the crowd rows', () => {
    const units = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, side: 0 as const, x: 1960, air: false }));
    const rows = depthRows(units);
    const crowd = units.slice(3).map((u) => rows.get(u.id));
    expect(crowd.slice(0, 7)).toEqual([...CROWD_ROWS_LU]);
    expect(new Set(crowd).size).toBeGreaterThanOrEqual(6);
    expect(crowdRow(7)).toBeLessThan(CROWD_ROWS_LU[0]);
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

describe('split-age seam (A11, A17.3)', () => {
  it('starts at 1,000, drifts at most 30 lu/s and stays within [700, 1,300]', () => {
    expect([SEAM_START_LU, SEAM_MIN_LU, SEAM_MAX_LU]).toEqual([1000, 700, 1300]);
    let s = SEAM_START_LU;
    s = stepSeam(s, 2000, 1000);
    expect(s).toBe(1030);
    for (let i = 0; i < 100; i++) s = stepSeam(s, 2000, 1000);
    expect(s).toBe(SEAM_MAX_LU);
    for (let i = 0; i < 100; i++) s = stepSeam(s, -500, 1000);
    expect(s).toBe(SEAM_MIN_LU);
    expect(stepSeam(1000, 1005, 1000)).toBe(1005);
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
    expect(frontMidpoint([])).toBe(1000);
    expect(frontMidpoint([{ side: 0, x: 800, air: false }])).toBe(1400);
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
