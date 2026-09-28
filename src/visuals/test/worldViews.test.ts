/**
 * Sprite-sheet world views (turrets and bases from art/blender/world): turret idle motion, fire
 * kick-back and the live muzzle point; base mount points from the sheet (mirrored for side 1) and
 * the capped rubble of hits and the collapse.
 */
import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { VisualDef } from '@/contracts/art';
import { WorldAtlas, type WorldSheet } from '../adapters/worldAtlas';
import { AtlasTurretView } from '../adapters/world/atlasTurretView';
import { AtlasBaseView } from '../adapters/world/atlasBaseView';
import { PartBaker } from '../bake';
import { WORLD_BASE_MOUNTS_LU } from '../manifest.world';

const def: VisualDef = {
  kind: 'atlas',
  source: 'art/turrets/stone/rock_tosser.json',
  anchors: { feet: { x: 0, y: 0 }, head: { x: 0, y: -60 }, muzzle: { x: 20, y: -30 }, hitCenter: { x: 0, y: -30 } },
  heightLu: 60,
  team: { kind: 'mask', maskTextures: ['_team'] },
  clips: {},
  events: { attack: { impactAt: 0.1 } },
};

function frames(n: number): Texture[] {
  return Array.from({ length: n }, () => Texture.EMPTY);
}

const turretSheet: WorldSheet = {
  animations: { mount: frames(1), idle: frames(6), fire: frames(5), build: frames(4), destroyed: frames(3) },
  luPerUnit: 1,
  meta: {
    heightLu: 60,
    pxPerLu: 1,
    pivotLu: [0, 30],
    aimLimits: [-55, 40],
    clips: { fire: { durationsMs: [60, 50, 80, 100, 130], anchorsLu: { muzzle: [[30, 30], [34, 31], [32, 30], [30, 30], [30, 30]] } } },
  },
};

const baker = (): PartBaker => new PartBaker({ pxPerLu: 1, canvasFactory: () => null });

describe('AtlasTurretView motion', () => {
  it('bobs and scans its head while idle, and kicks back on fire', () => {
    const v = new AtlasTurretView({ def, sheet: turretSheet, decor: baker(), side: 0, teamColor: 0x2f7df6, seed: 1 });
    const head = (v as unknown as { headPivot: { x: number; y: number; rotation: number } }).headPivot;
    const seen = new Set<string>();
    for (let t = 0; t < 4000; t += 50) {
      v.update(50);
      seen.add(`${head.y.toFixed(2)}:${head.rotation.toFixed(3)}`);
    }
    expect(seen.size).toBeGreaterThan(10);
    v.play('fire');
    v.update(16);
    expect(v.debug.kick).toBeGreaterThan(0);
    expect(v.debug.muzzleFlash).toBe(true);
    for (let t = 0; t < 400; t += 16) v.update(16);
    expect(v.debug.kick).toBe(0);
    v.destroy();
  });

  it('reports the muzzle in world space, following the root and its mirroring', () => {
    const a = new AtlasTurretView({ def, sheet: turretSheet, decor: baker(), side: 0, teamColor: 0x2f7df6, seed: 1 });
    a.root.position.set(100, -50);
    const p = a.muzzlePoint();
    expect(p.x).toBeGreaterThan(100);
    expect(p.y).toBeLessThan(-50);
    const b = new AtlasTurretView({ def, sheet: turretSheet, decor: baker(), side: 1, teamColor: 0xf28a1e, seed: 1 });
    b.root.position.set(1300, -50);
    expect(b.muzzlePoint().x).toBeLessThan(1300);
    a.destroy();
    b.destroy();
  });
});

describe('AtlasBaseView', () => {
  const baseSheet: WorldSheet = {
    animations: { body: frames(4), body_team: frames(4), treasury: frames(3), treasury_team: frames(3) },
    luPerUnit: 1,
    meta: { heightLu: 300, widthLu: 180, pxPerLu: 1, mountsLu: WORLD_BASE_MOUNTS_LU.map(([x, y]) => [x, y] as [number, number]), clips: {} },
  };
  const make = (side: 0 | 1): AtlasBaseView => {
    const world = new WorldAtlas(() => '', async () => baseSheet);
    world.register('art/bases/stone.json', baseSheet);
    return new AtlasBaseView({ age: 'stone', side, teamColor: 0x2f7df6, decor: baker(), seed: 3, world, sourceFor: () => 'art/bases/stone.json', def: { ...def, source: 'art/bases/stone.json' } });
  };

  it('returns the modelled mounts, mirrored for side 1', () => {
    const a = make(0);
    a.root.position.set(0, 0);
    expect(a.mountPoints()).toEqual(WORLD_BASE_MOUNTS_LU.map(([x, y]) => ({ x, y: -y })));
    const b = make(1);
    b.root.position.set(1200, 0);
    expect(b.mountPoints().map((p) => p.x)).toEqual(WORLD_BASE_MOUNTS_LU.map(([x]) => 1200 - x));
    a.destroy();
    b.destroy();
  });

  it('caps its rubble chunks and settles them on the ground', () => {
    const v = make(0);
    for (let i = 0; i < 30; i++) v.hit();
    v.collapse();
    const chunks = (v as unknown as { chunks: { s: { y: number } }[] }).chunks;
    expect(chunks.length).toBeLessThanOrEqual(40);
    for (let t = 0; t < 1200; t += 16) v.update(16);
    for (const c of chunks) expect(c.s.y).toBeLessThanOrEqual(0.001);
    v.destroy();
  });
});
