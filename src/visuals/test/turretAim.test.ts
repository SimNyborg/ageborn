/**
 * Queue item 44 (docs/requests/done/item44-turret-aim-point.md): a turret aims at a point, a flyer above its mount too
 * (`aimAt` takes only a ground x), within its aim limits, and `snapAim()` turns it to that aim at once, so a new
 * target's first shot leaves the turned barrel.
 */
import { Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import type { TurretView, VisualDef } from '@/contracts/art';
import { AtlasTurretView } from '../adapters/world/atlasTurretView';
import type { WorldSheet } from '../adapters/worldAtlas';
import { PartBaker } from '../bake';
import { createArtProvider } from '../provider';

const def: VisualDef = {
  kind: 'atlas',
  source: 'art/turrets/stone/rock_tosser.json',
  anchors: { feet: { x: 0, y: 0 }, head: { x: 0, y: -60 }, muzzle: { x: 20, y: -30 }, hitCenter: { x: 0, y: -30 } },
  heightLu: 60,
  team: { kind: 'mask', maskTextures: ['_team'] },
  clips: {},
  events: { attack: { impactAt: 0.1 } },
};

const frames = (n: number): Texture[] => Array.from({ length: n }, () => Texture.EMPTY);

const sheet: WorldSheet = {
  animations: { mount: frames(1), idle: frames(6), fire: frames(5), build: frames(4), destroyed: frames(3) },
  luPerUnit: 1,
  meta: {
    heightLu: 60,
    pxPerLu: 1,
    // the head turns about a pivot 30 lu up; at aim 0 the muzzle sits 30 lu ahead of it
    pivotLu: [0, 30],
    aimLimits: [-55, 40],
    clips: { fire: { durationsMs: [60, 50, 80, 100, 130], anchorsLu: { muzzle: [[30, 30], [30, 30], [30, 30], [30, 30], [30, 30]] } } },
  },
};

const DEG = 180 / Math.PI;

function atlas(side: 0 | 1, x: number, y: number): AtlasTurretView {
  const v = new AtlasTurretView({ def, sheet, decor: new PartBaker({ pxPerLu: 1, canvasFactory: () => null }), side, teamColor: 0x2f7df6, seed: 1 });
  v.root.position.set(x, y);
  return v;
}

type AimingTurret = TurretView & { aimAtPoint(x: number, y: number): void; snapAim(): void; readonly debug: { aimDeg: number } };

describe('atlas turret view: aim at a point (item 44)', () => {
  it('aims up at a flyer above its pivot, at the ground below it, and stops at its limits', () => {
    // a top mount 40 lu up: the pivot is at (100, -70)
    const v = atlas(0, 100, -40);
    v.aimAtPoint(300, -170);
    v.snapAim();
    expect(v.debug.aimDeg).toBeCloseTo(Math.atan2(-100, 200) * DEG, 6);
    v.aimAtPoint(110, -900);
    v.snapAim();
    expect(v.debug.aimDeg).toBe(-55);
    v.aimAtPoint(300, 0);
    v.snapAim();
    expect(v.debug.aimDeg).toBeCloseTo(Math.atan2(70, 200) * DEG, 6);
  });

  it('agrees with aimAt for a point on the ground, and mirrors for the right-hand side', () => {
    const a = atlas(0, 100, -40);
    a.aimAt(400);
    a.snapAim();
    const b = atlas(0, 100, -40);
    b.aimAtPoint(400, 0);
    b.snapAim();
    expect(b.debug.aimDeg).toBeCloseTo(a.debug.aimDeg, 9);
    const r = atlas(1, 1000, -40);
    r.aimAtPoint(800, -140);
    r.snapAim();
    expect(r.debug.aimDeg).toBeCloseTo(Math.atan2(-70, 200) * DEG, 6);
  });

  it('turns toward a new aim at its own speed, unless snapped: then the muzzle moves in the same frame', () => {
    const v = atlas(0, 100, -40);
    const before = v.muzzlePoint();
    v.aimAtPoint(300, -170);
    expect(v.muzzlePoint()).toEqual(before);
    v.update(16);
    expect(v.debug.aimDeg).toBeGreaterThan(Math.atan2(-100, 200) * DEG);
    v.snapAim();
    const after = v.muzzlePoint();
    const a = Math.atan2(-100, 200);
    expect(after.x).toBeCloseTo(100 + 30 * Math.cos(a), 6);
    expect(after.y).toBeCloseTo(-70 + 30 * Math.sin(a), 6);
  });

  it('snapping without an aim, or after destroy, changes nothing', () => {
    const v = atlas(0, 100, -40);
    v.snapAim();
    expect(v.debug.aimDeg).toBe(0);
    v.aimAtPoint(300, -170);
    v.destroy();
    expect(() => v.snapAim()).not.toThrow();
  });
});

describe('procedural turret view: aim at a point (item 44)', () => {
  it('aims up at a point above, agrees with aimAt on the ground, and snaps', () => {
    const art = createArtProvider({ warn: vi.fn(), dpr: 1 });
    const make = (): AimingTurret => {
      const t = art.createTurret({ visualId: 'turret.swivel_gun', side: 0, teamPreset: 'default' }) as AimingTurret;
      t.root.position.set(100, -40);
      return t;
    };
    const up = make();
    expect(typeof up.aimAtPoint).toBe('function');
    expect(typeof up.snapAim).toBe('function');
    up.aimAtPoint(300, -400);
    up.snapAim();
    expect(up.debug.aimDeg).toBeLessThan(0);
    const ground = make();
    ground.aimAt(400);
    ground.snapAim();
    const point = make();
    point.aimAtPoint(400, 0);
    point.snapAim();
    expect(point.debug.aimDeg).toBeCloseTo(ground.debug.aimDeg, 9);
    expect(ground.debug.aimDeg).toBeGreaterThan(up.debug.aimDeg);
  });
});
