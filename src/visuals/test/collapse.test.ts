/**
 * The destroyed base's collapse (DESIGN A11, A12): the seeded fracture, the fixed-step world, its beats
 * against the end sequence, the reduce-motion path, the collapse kits in the manifest and on disk, and
 * the atlas base view wiring (seeded collapse, mount poses for the falling turrets).
 */
import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { AgeId } from '@/contracts/ids';
import type { VisualDef } from '@/contracts/art';
import { AtlasBaseView } from '../adapters/world/atlasBaseView';
import { fracture, polyArea, type Rect } from '../adapters/world/collapse/fracture';
import { COLLAPSE_PROFILES, collapseProfile } from '../adapters/world/collapse/profiles';
import { BREAK_MS, BREAK_MS_REDUCED, CollapseWorld, collapseBeats, STEP_MS, type WorldOptions } from '../adapters/world/collapse/world';
import { WorldAtlas, type WorldSheet } from '../adapters/worldAtlas';
import { PartBaker } from '../bake';
import { MANIFEST } from '../manifest';
import { baseCollapseSource, BASE_COLLAPSE_MS, WORLD_BASE_COLLAPSE_KITS, WORLD_BASE_MOUNTS_LU, WORLD_BASE_SHEETS } from '../manifest.world';

const AGES: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];
const RECT: Rect = { x: -182, y: -320, w: 210, h: 345 };

interface KitJson {
  animations: Record<string, string[]>;
  meta: { image: string; ageborn: { kind: string; age: string } };
}
const KITS = import.meta.glob<KitJson>('/public/art/bases/*.collapse.json', { eager: true, import: 'default' });
const KIT_PNGS = new Set(Object.keys(import.meta.glob('/public/art/bases/*.collapse.png', { query: '?url', import: 'default' })));

function options(age: AgeId, seed: number, o: Partial<WorldOptions> = {}): WorldOptions {
  const p = collapseProfile(age);
  const fr = fracture({ rect: RECT, mask: null, seed, cells: p.cells, stumpLu: p.stumpLu, aspect: p.aspect, topple: p.topple });
  return { fracture: fr, profile: p, seed, lite: false, reduce: false, kitFrames: 8, treasuryAt: { x: -150, y: -10 }, lights: [], smokeSpots: [], ...o };
}

/** A comparable snapshot of the world (rounded so float noise in the last bits never matters). */
function snapshot(w: CollapseWorld): string {
  const r = (v: number): number => Math.round(v * 1000) / 1000;
  return JSON.stringify({
    t: w.t,
    chunks: w.chunks.map((c) => [c.id, r(c.x), r(c.y), r(c.a), c.sleeping]),
    particles: w.particles.map((q) => [q.kind, r(q.x), r(q.y), r(q.alpha)]),
  });
}

describe('collapse fracture (seeded)', () => {
  it('gives the same cells and cracks for the same seed, and different ones for another', () => {
    const p = COLLAPSE_PROFILES.medieval;
    const make = (seed: number) => fracture({ rect: RECT, mask: null, seed, cells: p.cells, stumpLu: p.stumpLu, aspect: p.aspect, topple: p.topple });
    const a = make(77);
    const b = make(77);
    const c = make(78);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    expect(JSON.stringify(a.cells.map((x) => x.poly))).not.toEqual(JSON.stringify(c.cells.map((x) => x.poly)));
  });

  it('tiles the frame without gaps or overlaps, with a stump, toppling towers and spreading cracks', () => {
    for (const age of AGES) {
      const p = COLLAPSE_PROFILES[age];
      const fr = fracture({ rect: RECT, mask: null, seed: 5, cells: p.cells, stumpLu: p.stumpLu, aspect: p.aspect, topple: p.topple });
      const area = fr.cells.reduce((s, c) => s + Math.abs(polyArea(c.poly)), 0);
      // the zig-zag edges are shared by two cells, so the outlines still add up to the frame
      expect(Math.abs(area - RECT.w * RECT.h) / (RECT.w * RECT.h), age).toBeLessThan(0.002);
      const kinds = new Set(fr.cells.map((c) => c.kind));
      expect(kinds.has('stump'), age).toBe(true);
      expect(kinds.has('topple'), age).toBe(true);
      for (const c of fr.cells) if (c.kind === 'stump') expect(c.cy, age).toBeGreaterThanOrEqual(-p.stumpLu);
      expect(fr.groups.length, age).toBeGreaterThan(0);
      for (const g of fr.groups) {
        // the hinge stands at the tower's foot, under its mass
        expect(g.hinge.y).toBeGreaterThan(g.cy);
        expect(g.cells.length).toBeGreaterThan(0);
      }
      expect(fr.cracks.length, age).toBeGreaterThan(20);
      for (const k of fr.cracks) {
        expect(k.t0).toBeGreaterThanOrEqual(0);
        expect(k.t1).toBeLessThanOrEqual(1);
        expect(k.t1).toBeGreaterThan(k.t0);
      }
    }
  });
});

describe('collapse world (fixed steps)', () => {
  it('plays exactly the same collapse whatever the frame rate (replays look the same)', () => {
    const a = new CollapseWorld(options('industrial', 99));
    const b = new CollapseWorld(options('industrial', 99));
    // 60 fps against an uneven 30-144 fps mix of frame times; both total exactly 2,500 ms
    for (let i = 0; i < 150; i++) a.update(50 / 3);
    const uneven = [7, 33, 16, 21, 6.5, 12.5, 40, 4];
    let left = 2500;
    for (let i = 0; left > 0; i++) {
      const d = Math.min(left, uneven[i % uneven.length]!);
      b.update(d);
      left -= d;
    }
    expect(a.t).toBe(b.t);
    expect(snapshot(a)).toEqual(snapshot(b));
  });

  it('changes with the seed and keeps the step fixed', () => {
    const a = new CollapseWorld(options('stone', 1));
    const b = new CollapseWorld(options('stone', 2));
    a.runTo(1400);
    b.runTo(1400);
    expect(snapshot(a)).not.toEqual(snapshot(b));
    expect(a.t % STEP_MS).toBe(0);
  });

  it('trembles, breaks on the beat, topples toward the lane, and settles before the result shows', () => {
    for (const age of AGES) {
      const o = options(age, 31);
      const beats = collapseBeats(o);
      expect(beats.breakMs, age).toBe(BREAK_MS);
      // the biggest landing comes after the break and well inside the end sequence (the result shows
      // about 2.5 s after the end; slow motion stretches the first part)
      expect(beats.landMs, age).toBeGreaterThan(beats.breakMs + 250);
      expect(beats.landMs, age).toBeLessThan(beats.breakMs + 1100);
      const w = new CollapseWorld(o);
      w.runTo(beats.breakMs - STEP_MS);
      expect(w.broken).toBe(false);
      const pose = w.bodyPose();
      expect(Math.abs(pose.ox) + Math.abs(pose.oy), age).toBeGreaterThan(0.5);
      w.runTo(beats.breakMs + STEP_MS);
      expect(w.broken).toBe(true);
      const group = new Set(w.groups[0]?.cells ?? []);
      const x0 = w.chunks.filter((c) => group.has(c.id)).reduce((s, c) => s + c.x, 0) / Math.max(1, group.size);
      w.runTo(beats.breakMs + 1500);
      const x1 = w.chunks.filter((c) => group.has(c.id)).reduce((s, c) => s + c.x, 0) / Math.max(1, group.size);
      expect(x1, age).toBeGreaterThan(x0 + 40);
      w.runTo(beats.breakMs + 2400);
      const moving = w.chunks.filter((c) => !c.static && !c.sleeping).length;
      expect(moving, age).toBeLessThanOrEqual(2);
      // nothing flies off into the far lane, behind the world's end or below the ground (the stump's
      // foundation reaches below the ground line and stays where it is)
      for (const c of w.chunks) {
        if (c.static) continue;
        expect(c.x, age).toBeGreaterThan(-200);
        expect(c.x, age).toBeLessThan(480);
        expect(c.y, age).toBeLessThan(5);
      }
    }
  });

  it('keeps to its particle cap, and Lite to a smaller one', () => {
    for (const lite of [false, true]) {
      const w = new CollapseWorld(options('gunpowder', 4, { lite }));
      let most = 0;
      for (let t = 0; t < 4000; t += 16) {
        w.update(16);
        most = Math.max(most, w.particles.length);
      }
      expect(most).toBeLessThanOrEqual(lite ? 150 : 320);
      expect(most).toBeGreaterThan(lite ? 20 : 60);
    }
  });

  it('reduce motion: no tremble, no blast, no shards or sparks; the pieces subside into the dust', () => {
    const o = options('future', 8, { reduce: true });
    const w = new CollapseWorld(o);
    expect(collapseBeats(o).breakMs).toBe(BREAK_MS_REDUCED);
    for (let t = 0; t < BREAK_MS_REDUCED - 20; t += 16) {
      w.update(16);
      const p = w.bodyPose();
      expect(p.ox).toBe(0);
      expect(p.rot).toBe(0);
    }
    for (let t = 0; t < 3000; t += 16) {
      w.update(16);
      for (const c of w.chunks) {
        expect(c.vx).toBe(0);
        expect(c.w).toBe(0);
      }
    }
    const kinds = new Set(w.particles.map((q) => q.kind));
    for (const k of ['shard', 'spark', 'sparkHot', 'bolt', 'ring', 'ringThin', 'glow', 'timber', 'coin'] as const) expect(kinds.has(k), k).toBe(false);
    // the pebbles that trickle from the cracks drop straight, without spinning
    for (const q of w.particles) if (q.kind === 'kit' || q.kind === 'rock') expect(q.spin, q.kind).toBe(0);
    expect(w.settled).toBe(true);
  });
});

describe('collapse kits (manifest, files)', () => {
  it('lists a kit for every base sheet as the base entry clip, and the files exist with their clips', () => {
    expect([...WORLD_BASE_COLLAPSE_KITS].sort()).toEqual([...WORLD_BASE_SHEETS].sort());
    for (const age of WORLD_BASE_COLLAPSE_KITS) {
      const def = MANIFEST[`base.${age}`];
      expect(def?.clips['collapse'], age).toEqual({ kind: 'atlas', ref: baseCollapseSource(age), durationMs: BASE_COLLAPSE_MS, loop: false });
      const json = KITS[`/public/${baseCollapseSource(age)}`];
      if (!json) throw new Error(`no collapse kit for ${age}`);
      expect(json.meta.ageborn.kind).toBe('baseCollapseKit');
      expect(json.meta.ageborn.age).toBe(age);
      expect(json.animations['piece']?.length, age).toBe(8);
      expect(json.animations['heap']?.length, age).toBe(2);
      expect(json.animations['rag']?.length, age).toBe(1);
      expect(KIT_PNGS.has(`/public/art/bases/${json.meta.image}`), age).toBe(true);
      // the kit's frames never collide with the base sheet's names in Pixi's texture cache
      for (const names of Object.values(json.animations)) for (const n of names) expect(n.startsWith(`${age}_kit_`)).toBe(true);
    }
  });
});

describe('AtlasBaseView collapse', () => {
  const def: VisualDef = {
    kind: 'atlas',
    source: 'art/bases/stone.json',
    anchors: { feet: { x: 0, y: 0 }, head: { x: 0, y: -300 }, muzzle: { x: 0, y: -150 }, hitCenter: { x: -76, y: -135 } },
    heightLu: 300,
    team: { kind: 'mask', maskTextures: ['_team'] },
    clips: {},
    events: { attack: { impactAt: 0.1 } },
  };
  const frames = (n: number): Texture[] => Array.from({ length: n }, () => Texture.EMPTY);
  const sheet: WorldSheet = {
    animations: { body: frames(4), body_team: frames(4), treasury: frames(3), treasury_team: frames(3) },
    luPerUnit: 1,
    meta: { heightLu: 300, widthLu: 180, pxPerLu: 1, mountsLu: WORLD_BASE_MOUNTS_LU.map(([x, y]) => [x, y] as [number, number]), clips: {} },
  };
  const make = (side: 0 | 1, reduce = false): AtlasBaseView => {
    const world = new WorldAtlas(() => '', async () => sheet);
    world.register('art/bases/stone.json', sheet);
    const v = new AtlasBaseView({ age: 'stone', side, teamColor: 0x2f7df6, decor: new PartBaker({ pxPerLu: 1, canvasFactory: () => null }), seed: 3, world, sourceFor: () => 'art/bases/stone.json', def });
    v.setMotion({ reduce, lite: false });
    return v;
  };

  it('reports its beats, rides the turrets down with their pieces and is seeded by the caller', () => {
    const a = make(1);
    a.root.position.set(2000, 0);
    a.setCrumble(3);
    a.update(16);
    const beats = a.collapseWith({ seed: 1234 });
    expect(beats.material).toBe('stone');
    expect(beats.breakMs).toBe(BREAK_MS);
    expect(beats.landMs).toBeGreaterThan(beats.breakMs);
    // a second call returns the same collapse (the same live object)
    expect(a.collapseWith({ seed: 999 })).toBe(beats);
    const top0 = a.mountPose(3);
    // the landing beat is final after the first frames of the build-up (the dry run is deferred)
    a.update(16);
    a.update(16);
    const land = beats.landMs;
    expect(land).toBeGreaterThan(beats.breakMs + 250);
    expect(land).toBeLessThan(beats.breakMs + 1100);
    expect(top0).not.toBeNull();
    for (let t = 0; t < 3000; t += 16) a.update(16);
    expect(beats.landMs).toBe(land);
    const top1 = a.mountPose(3)!;
    // side 1 falls toward the lane: leftward in the world, down to the ground
    expect(top1.y).toBeGreaterThan(top0!.y + 60);
    expect(top1.landed).toBe(true);
    expect(a.debug.collapse?.broken).toBe(true);
    // the same seed collapses the same way in a second view
    const b = make(1);
    b.root.position.set(2000, 0);
    b.setCrumble(3);
    b.update(16);
    b.collapseWith({ seed: 1234 });
    for (let t = 0; t < 3000; t += 16) b.update(16);
    expect(b.mountPose(3)).toEqual(top1);
    a.destroy();
    b.destroy();
  });

  it('reduce motion keeps the body still in the build-up', () => {
    const v = make(0, true);
    v.update(16);
    v.collapseWith({ seed: 5 });
    const body = (v as unknown as { body: { x: number; rotation: number } }).body;
    const x0 = body.x;
    for (let t = 0; t < 400; t += 16) {
      v.update(16);
      expect(body.rotation).toBe(0);
      expect(body.x).toBeCloseTo(x0, 6);
    }
    v.destroy();
  });
});
