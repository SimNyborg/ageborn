/** The scrolling battle camera (DESIGN A17.4): follow, yielding to the player, manual input, clamps. */
import { describe, expect, it } from 'vitest';
import { CAMERA, Camera, springOmega, springStep } from '../camera';
import { edgeSpeed, releaseVelocity } from '../input';
import { WORLD_LEFT_LU, WORLD_RIGHT_LU } from '../layout';
import { cameraFronts, followFocus, framingCenter } from '../seam';

function phone(): Camera {
  const c = new Camera();
  c.resize(844, 390);
  c.setHome(0);
  return c;
}

function run(c: Camera, ms: number, step = 16): void {
  for (let t = 0; t < ms; t += step) c.update(step);
}

describe('auto-follow focus and framing (A17.4)', () => {
  it('looks between the fronts in contact, 0.3 V ahead with a wide gap, at the enemy front once it is on your half', () => {
    const V = 1000;
    expect(followFocus({ left: 900, right: 960 }, 0, V)).toBe(930);
    expect(followFocus({ left: 200, right: 1800 }, 0, V)).toBe(500);
    expect(followFocus({ left: null, right: 700 }, 0, V)).toBe(700);
    // A lone enemy still on its own half does not pull the camera from your base.
    expect(followFocus({ left: null, right: 1900 }, 0, V)).toBeNull();
    expect(followFocus({ left: 400, right: null }, 0, V)).toBe(700);
    expect(followFocus({ left: null, right: null }, 0, V)).toBeNull();
    // The other side looks the other way.
    expect(followFocus({ left: 200, right: 1800 }, 1, V)).toBe(1500);
    // The focus sits at 55% of the view from the player's side.
    expect(framingCenter(1000, 0, V)).toBe(950);
    expect(framingCenter(1000, 1, V)).toBe(1050);
  });

  it('uses the frontmost air unit only when a side has no ground units', () => {
    const f = cameraFronts([
      { side: 0, x: 500, air: false },
      { side: 0, x: 800, air: true },
      { side: 1, x: 1400, air: true },
      { side: 1, x: 1300, air: true },
    ]);
    expect(f).toEqual({ left: 500, right: 1300 });
  });
});

describe('camera follow (A17.4)', () => {
  it('stays put inside the ±8% dead zone, then springs toward the target', () => {
    const c = phone();
    const start = c.centerX;
    c.follow(start + 0.05 * c.viewLu);
    run(c, 1000);
    expect(c.centerX).toBe(start);
    c.follow(start + 600);
    run(c, 350);
    // A critically damped spring with a 350 ms half-life: about half-way after 350 ms.
    expect(c.centerX - start).toBeGreaterThan(200);
    expect(c.centerX - start).toBeLessThan(420);
    run(c, 3000);
    expect(c.centerX).toBeCloseTo(start + 600, 0);
  });

  it('never moves faster than 900 lu/s × game speed', () => {
    const c = phone();
    c.follow(WORLD_RIGHT_LU);
    let prev = c.centerX;
    let fastest = 0;
    for (let i = 0; i < 200; i++) {
      c.update(16, 1);
      fastest = Math.max(fastest, (c.centerX - prev) / 0.016);
      prev = c.centerX;
    }
    expect(fastest).toBeLessThanOrEqual(CAMERA.followMaxLuPerSec + 1e-6);
  });

  it('the spring halves its error in the half-life', () => {
    const w = springOmega(350);
    const s = springStep(100, 0, 0, w, 0.35);
    expect(s.x).toBeCloseTo(50, 3);
  });
});

describe('manual camera and yielding (A17.4)', () => {
  it('a drag pans 1:1 and switches to Manual; follow resumes after 5 s without input', () => {
    const c = phone();
    c.follow(1200);
    const x0 = c.centerX;
    c.dragStart();
    c.dragBy(-100);
    expect(c.mode).toBe('manual');
    expect(c.centerX).toBeCloseTo(x0 + 100 / c.scale);
    c.dragEnd(0);
    run(c, 4800);
    expect(c.mode).toBe('manual');
    run(c, 400);
    expect(c.mode).toBe('follow');
    run(c, 3000);
    expect(c.centerX).toBeCloseTo(c.followTarget(), 0);
  });

  it('never resumes while something holds it (pointer, popover, power drag)', () => {
    const c = phone();
    c.wheel(200);
    c.hold('popover', true);
    run(c, 8000);
    expect(c.mode).toBe('manual');
    c.hold('popover', false);
    run(c, 5200);
    expect(c.mode).toBe('follow');
  });

  it('with Auto camera off it never resumes by itself; the front button jumps once and stays Manual', () => {
    const c = phone();
    c.autoCamera = false;
    c.follow(1500);
    c.wheel(100);
    run(c, 10_000);
    expect(c.mode).toBe('manual');
    c.jumpFront();
    run(c, 500);
    expect(c.mode).toBe('manual');
    expect(c.centerX).toBeCloseTo(c.followTarget(), 0);
    c.autoCamera = true;
    c.jumpFront();
    run(c, 500);
    expect(c.mode).toBe('follow');
  });

  it('the base button eases to the opening view in 350 ms and stays Manual', () => {
    const c = phone();
    c.scrubTo(1500);
    c.jumpHome();
    run(c, 360);
    expect(c.mode).toBe('manual');
    expect(c.worldToScreen(WORLD_LEFT_LU, 0).x).toBeCloseTo(0, 3);
  });

  it('a swipe flings with momentum that decays and stops, clamped to the world', () => {
    const c = phone();
    c.dragStart();
    c.dragBy(-40);
    c.dragEnd(-2000);
    const after = c.centerX;
    run(c, 200);
    const mid = c.centerX;
    expect(mid).toBeGreaterThan(after);
    run(c, 3000);
    const end = c.centerX;
    run(c, 500);
    expect(c.centerX).toBe(end);
    expect(c.viewRange().right).toBeLessThanOrEqual(WORLD_RIGHT_LU + 1e-6);
  });

  it('rubber-bands at most 40 px past an end and springs back', () => {
    const c = phone();
    c.dragStart();
    c.dragBy(500);
    const over = c.bounds().lo - c.centerX;
    expect(over).toBeGreaterThan(0);
    expect(over * c.scale).toBeLessThanOrEqual(CAMERA.rubberPx + 1e-6);
    c.dragEnd(0);
    run(c, 300);
    expect(c.centerX).toBeCloseTo(c.bounds().lo, 6);
  });

  it('reduce motion: no momentum and no rubber band', () => {
    const c = phone();
    c.reduceMotion = true;
    c.dragStart();
    c.dragBy(500);
    expect(c.centerX).toBe(c.bounds().lo);
    c.dragBy(-100);
    const x = c.centerX;
    c.dragEnd(-3000);
    run(c, 500);
    expect(c.centerX).toBe(x);
  });

  it('arrow keys reach 1,000 lu/s in 150 ms (Shift 2,000)', () => {
    const c = phone();
    c.setKeys(1, false);
    run(c, 150, 10);
    const a = c.centerX;
    run(c, 100, 10);
    expect((c.centerX - a) / 0.1).toBeCloseTo(1000, -1);
    c.setKeys(1, true);
    run(c, 300, 10);
    const b = c.centerX;
    run(c, 100, 10);
    expect((c.centerX - b) / 0.1).toBeCloseTo(2000, -1);
  });

  it('a destroyed base locks the camera on it', () => {
    const c = phone();
    c.lockOn(2070);
    run(c, 600);
    expect(c.centerX).toBeCloseTo(c.bounds().hi, 3);
    c.wheel(-500);
    c.jumpHome();
    run(c, 600);
    expect(c.centerX).toBeCloseTo(c.bounds().hi, 3);
  });
});

describe('input helpers (A17.4)', () => {
  it('edge scroll: 300 lu/s at 32 px from the edge up to 1,200 lu/s at the edge', () => {
    expect(edgeSpeed(500, 1280)).toBe(0);
    expect(edgeSpeed(0, 1280)).toBe(-1200);
    expect(edgeSpeed(1280, 1280)).toBe(1200);
    expect(edgeSpeed(32, 1280)).toBe(-300);
    expect(edgeSpeed(1264, 1280)).toBeCloseTo(750);
  });

  it('release velocity is the average over the last 100 ms, and 0 for a pointer that stopped', () => {
    const samples = [
      { x: 0, t: 0 },
      { x: 50, t: 100 },
      { x: 150, t: 150 },
      { x: 250, t: 200 },
    ];
    expect(releaseVelocity(samples, 205)).toBeCloseTo(2000);
    expect(releaseVelocity(samples, 400)).toBe(0);
  });
});
