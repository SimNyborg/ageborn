/**
 * World art sheets (turrets and bases from art/blender/world): every manifest entry has its files,
 * the sheet contract holds, and every base sheet exports the shared mount points that its modelled
 * platforms were built on (the battle view's turrets and tap targets follow `mountPoints()`).
 */
import { describe, expect, it } from 'vitest';
import { Texture } from 'pixi.js';
import { AGES } from '../ages';
import { MANIFEST } from '../manifest';
import { WORLD_BASE_MOUNTS_LU, WORLD_OVERRIDES } from '../manifest.world';
import { frameIndex, WorldAtlas, worldSourceAge, type WorldMeta, type WorldSheet } from '../adapters/worldAtlas';

const JSONS = import.meta.glob<SheetFile>(['/public/art/turrets/*/*.json', '/public/art/bases/*.json'], { eager: true, import: 'default' });
const PNGS = new Set(Object.keys(import.meta.glob(['/public/art/turrets/*/*.png', '/public/art/bases/*.png'], { query: '?url', import: 'default' })));

interface SheetFile {
  animations: Record<string, string[]>;
  frames: Record<string, unknown>;
  meta: { image: string; scale: string; ageborn: WorldMeta & { visualId: string } };
}

function sheet(source: string): SheetFile {
  const s = JSONS[`/public/${source}`];
  if (!s) throw new Error(`missing ${source}`);
  return s;
}

describe('world art manifest', () => {
  const entries = Object.entries(WORLD_OVERRIDES);

  it('covers all 44 turrets (32 plus the Stone, Bronze, Medieval, Gunpowder, Modern and Future waves) and 8 bases, merged into the main manifest', () => {
    expect(entries.filter(([id]) => id.startsWith('turret.'))).toHaveLength(44);
    expect(entries.filter(([id]) => id.startsWith('base.'))).toHaveLength(8);
    for (const [id, def] of entries) expect(MANIFEST[id]?.source, id).toBe(def.source);
  });

  it.each(entries)('%s: sheet files exist and name the visual', (id, def) => {
    expect(def.kind).toBe('atlas');
    const s = sheet(def.source);
    expect(PNGS.has(`/public/${def.source.replace(/[^/]+$/, '')}${s.meta.image}`), s.meta.image).toBe(true);
    expect(s.meta.ageborn.visualId).toBe(id);
    expect(Number(s.meta.scale)).toBeGreaterThan(0);
    for (const names of Object.values(s.animations)) for (const n of names) expect(s.frames[n], n).toBeDefined();
  });

  it.each(entries.filter(([id]) => id.startsWith('turret.')))('%s: turret clips, pivot and per-frame muzzle', (_id, def) => {
    const s = sheet(def.source);
    for (const c of ['mount', 'idle', 'fire', 'build', 'destroyed']) expect(s.animations[c]?.length, c).toBeGreaterThan(0);
    const m = s.meta.ageborn;
    expect(m.pivotLu).toHaveLength(2);
    const fire = m.clips['fire'];
    expect(fire?.anchorsLu?.['muzzle']?.length).toBe(5);
    // turrets read next to 56 px infantry (art review: at least about 48 lu tall; the Mortar Pit's
    // squat sandbag ring renders at 47.6)
    expect(m.heightLu).toBeGreaterThanOrEqual(47.5);
  });

  it.each(AGES.map((a) => [a] as const))('base.%s: crumble stages, Treasury levels, flags and the shared mounts', (age) => {
    const def = WORLD_OVERRIDES[`base.${age}`];
    if (!def) throw new Error('missing');
    const s = sheet(def.source);
    expect(s.animations['body']).toHaveLength(4);
    expect(s.animations['body_team']).toHaveLength(4);
    expect(s.animations['treasury']).toHaveLength(3);
    const m = s.meta.ageborn;
    for (const f of m.flags ?? []) expect(s.animations[f.clip]?.length, f.clip).toBeGreaterThan(1);
    expect(m.mountsLu).toEqual(WORLD_BASE_MOUNTS_LU.map(([x, y]) => [x, y]));
    // the rendered mount trackers (on the modelled platforms) land on the exported points
    const tracked = (m.clips['body'] as { anchorsLu?: Record<string, [number, number][]> }).anchorsLu ?? {};
    WORLD_BASE_MOUNTS_LU.forEach(([x, y], i) => {
      const t = tracked[`mount${i}`]?.[0];
      expect(t?.[0]).toBeCloseTo(x, 0);
      expect(t?.[1]).toBeCloseTo(y, 0);
    });
    // mounts spread over the base: consecutive mounts at least 70 lu apart (1.4x a turret)
    for (let i = 1; i < WORLD_BASE_MOUNTS_LU.length; i++) {
      const a = WORLD_BASE_MOUNTS_LU[i - 1] ?? [0, 0];
      const b = WORLD_BASE_MOUNTS_LU[i] ?? [0, 0];
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeGreaterThanOrEqual(70);
    }
  });
});

describe('WorldAtlas', () => {
  it('reads the age from a sheet path', () => {
    expect(worldSourceAge('art/turrets/modern/howitzer.json')).toBe('modern');
    expect(worldSourceAge('art/bases/future.json')).toBe('future');
    expect(worldSourceAge('art/units/stone/bonker.json')).toBeNull();
  });

  it('preloads only the requested ages and loads each sheet once', async () => {
    const loads: string[] = [];
    const fake: WorldSheet = { animations: { idle: [Texture.EMPTY] }, luPerUnit: 1, meta: { heightLu: 40, pxPerLu: 1, clips: {} } };
    const w = new WorldAtlas((s) => `/x/${s}`, async (url) => {
      loads.push(url);
      return fake;
    });
    const defs = Object.values(WORLD_OVERRIDES);
    await w.preload(['stone'], defs);
    expect(loads).toHaveLength(7);
    expect(loads.every((u) => u.includes('stone'))).toBe(true);
    await w.preload(['stone', 'medieval'], defs);
    expect(loads).toHaveLength(14);
    expect(w.get('art/bases/medieval.json')).toBe(fake);
  });

  it('steps through per-frame durations (looping and one-shot)', () => {
    expect(frameIndex([100, 50, 100], 0, false)).toBe(0);
    expect(frameIndex([100, 50, 100], 120, false)).toBe(1);
    expect(frameIndex([100, 50, 100], 999, false)).toBe(2);
    expect(frameIndex([100, 50, 100], 260, true)).toBe(0);
  });
});
