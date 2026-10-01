/**
 * The 3D-rendered unit sheets (art/blender → public/art/units/<age>/<slug>.json) are wired into the
 * manifest (B5 swap point): every unit has an atlas entry for its own age, the summary is up to date,
 * the puppet stays as fallback, and the atlas view keeps the feet planted and hands off its death.
 */
import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { AtlasAdapter, atlasWalkDurationMs, walkSpeedFromDuration, type AtlasData } from '../adapters/atlas';
import { portraitStillBase, UNITS_WITHOUT_STILLS } from '../adapters/atlasPortrait';
import { MANIFEST, PROCEDURAL_MANIFEST } from '../manifest';
import { unitSheetAge } from '../manifest.units';
import { UNIT_SHEETS } from '../unitSheets.gen';
import { createArtProvider } from '../provider';

interface SheetJson {
  animations: Record<string, string[]>;
  meta: { image: string; ageborn: { heightLu: number; clips: Record<string, { durationMs?: number; impactAt?: number }> } };
}
/** The installed sheets, read at test time (never bundled into the game). */
const SHEETS = import.meta.glob<SheetJson>(['/public/art/units/*/*.json', '!/public/art/units/*/*.hd.json'], { eager: true, import: 'default' });
/** HD sheets (2.46 px/lu), one per plain sheet. */
const HD_SHEETS = import.meta.glob<SheetJson>('/public/art/units/*/*.hd.json', { eager: true, import: 'default' });
const PNGS = new Set(Object.keys(import.meta.glob('/public/art/units/*/*.png', { query: '?url', import: 'default' })));
const PORTRAITS = import.meta.glob('/public/art/portraits/*.png', { query: '?url', import: 'default' });

describe('HD unit sheets', () => {
  it('every HD sheet matches its plain sheet frame for frame', () => {
    for (const [path, hd] of Object.entries(HD_SHEETS)) {
      const plain = SHEETS[path.replace(/\.hd\.json$/, '.json')];
      expect(plain, path).toBeDefined();
      expect(PNGS.has(path.replace(/\.json$/, '.png')), path).toBe(true);
      expect(Object.keys(hd.animations).sort(), path).toEqual(Object.keys(plain?.animations ?? {}).sort());
      for (const [clip, frames] of Object.entries(hd.animations)) expect(frames, `${path} ${clip}`).toEqual(plain?.animations[clip]);
    }
  });
});

describe('unit sprite sheets in the manifest', () => {
  it('the generated summary matches the installed sheets (else run node art/blender/gen_unit_manifest.mjs)', () => {
    expect(UNIT_SHEETS.map((s) => `/public/art/units/${s.age}/${s.slug}.json`).sort()).toEqual(Object.keys(SHEETS).sort());
    for (const s of UNIT_SHEETS) {
      const j = SHEETS[`/public/art/units/${s.age}/${s.slug}.json`];
      expect(j?.meta.ageborn.heightLu, s.slug).toBe(s.heightLu);
      for (const [name, c] of Object.entries(j?.meta.ageborn.clips ?? {})) {
        expect(s.clips[name]?.durationMs, `${s.slug}.${name}`).toBe(c.durationMs);
        if (c.impactAt !== undefined) expect(s.clips[name]?.impactAt).toBeCloseTo(c.impactAt, 3);
      }
      for (const c of ['idle', 'walk', 'attack', 'hit', 'die']) {
        expect(j?.animations[c]?.length, `${s.slug}.${c}`).toBeGreaterThan(0);
        expect(j?.animations[`${c}_team`]?.length, `${s.slug}.${c}_team`).toBe(j?.animations[c]?.length);
      }
    }
  });

  // Fort twins and levies draw from placeholder puppets until their art ships (A16.14.8, F3).
  it.each(Object.values(content.units).filter((u) => !u.fort && !u.levy).map((u) => [u.id, u] as const))('%s draws from its own age sheet, with the puppet as fallback', (_id, u) => {
    const def = MANIFEST[u.visualId];
    expect(def?.kind).toBe('atlas');
    if (!def) return;
    expect(unitSheetAge(def.source)).toBe(u.age);
    expect(SHEETS[`/public/${def.source}`]).toBeDefined();
    expect(PNGS.has(`/public/${def.source.replace(/\.json$/, '.png')}`)).toBe(true);
    const proc = PROCEDURAL_MANIFEST[u.visualId];
    expect(proc?.kind).toBe('procedural');
    // same scale class as the puppet (flyers are drawn from their lowest point, so they may be taller)
    const ratio = def.heightLu / (proc?.heightLu ?? 1);
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(u.tags.includes('air') ? 1.7 : 1.2);
    expect(def.events.attack.impactAt).toBeGreaterThan(0);
    expect(def.events.attack.impactAt).toBeLessThan(1);
    expect(def.anchors.head.y).toBeLessThan(def.anchors.hitCenter.y);
    for (const c of ['idle', 'walk', 'attack', 'hit', 'die', 'spawn', 'stun', 'victory', 'ability']) expect(def.clips[c], c).toBeDefined();
    // shots leave in front of the unit
    if (u.attacks.some((a) => a.projectile !== undefined)) expect(def.anchors.muzzle.x).toBeGreaterThanOrEqual(0);
  });

  it('every sheet unit has a card still, or is listed as not rendered yet (no requests for missing files)', () => {
    const stills = new Set(Object.keys(PORTRAITS));
    for (const u of Object.values(content.units)) {
      const def = MANIFEST[u.visualId];
      // fort twins keep their stills next to their sheets (src/visuals/test/forts.test.ts)
      if (def?.kind !== 'atlas' || u.fort) continue;
      // levies draw (and show) their Infantry Common's sheet and still (A16.14.8)
      const slug = /\/([a-z0-9_]+)\.json$/.exec(def.source)?.[1] ?? u.id;
      const has = stills.has(`/public/art/portraits/${slug}.png`) && stills.has(`/public/art/portraits/${slug}_team.png`);
      expect(portraitStillBase(def.source) !== null, u.id).toBe(has);
      expect(UNITS_WITHOUT_STILLS.has(slug), u.id).toBe(!has);
    }
  });

  it('skins without a sheet keep their procedural entry', () => {
    for (const s of Object.values(content.skins)) {
      if (!s.visualId.startsWith('unit.')) continue;
      expect(MANIFEST[s.visualId]?.kind, s.visualId).toBe('procedural');
    }
  });
});

describe('per-age loading', () => {
  it('waits for Stone at boot and streams the other ages', async () => {
    const loaded: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const fake = (): AtlasData => ({ animations: {}, luPerUnit: 1, clips: {} });
    const defs = Object.values(MANIFEST);
    const a = new AtlasAdapter({
      entries: () => defs,
      decor: createArtProvider({ warn: () => {} }).procedural.baker,
      load: async (url) => {
        if (!url.includes('/stone/')) await gate;
        loaded.push(url);
        return fake();
      },
      baseUrl: '/ageborn/',
    });
    a.world.preload = async () => {};
    await a.preload(['stone', 'medieval']);
    expect(loaded.length).toBe(8);
    expect(loaded.every((u) => u.startsWith('/ageborn/art/units/stone/'))).toBe(true);
    const knight = MANIFEST['unit.destrier_knight'];
    expect(knight && a.canDraw('unit', knight)).toBe(false);
    release();
    await a.unitSheetsReady(['medieval']);
    expect(knight && a.canDraw('unit', knight)).toBe(true);
    // Gunpowder was never asked for: it loads on first use
    const corsair = MANIFEST['unit.corsair'];
    expect(corsair && a.canDraw('unit', corsair)).toBe(false);
    await a.unitSheetsReady(['gunpowder']);
    expect(corsair && a.canDraw('unit', corsair)).toBe(true);
  });
});

describe('atlas unit view', () => {
  it('plays the walk so the feet do not slide (sheet natural speed vs sim speed)', () => {
    // the battle view sizes walks by the procedural convention: 500 ms at 80 lu/s
    expect(walkSpeedFromDuration(500)).toBe(80);
    expect(walkSpeedFromDuration(1000)).toBe(40);
    // a 500 ms cycle authored for 60 lu/s, played for a 60 lu/s unit: unchanged
    expect(atlasWalkDurationMs(500, 60, (500 * 80) / 60)).toBeCloseTo(500);
    // slower unit, longer cycle; clamped to 0.5x-2x
    expect(atlasWalkDurationMs(500, 60, (500 * 80) / 45)).toBeCloseTo(666.7, 0);
    expect(atlasWalkDurationMs(500, 60, (500 * 80) / 10)).toBe(1000);
    expect(atlasWalkDurationMs(500, undefined, 800)).toBe(500);
  });

  it('lets the body lie after its fall, then sink with dust; an earlier hand-off still hides it (MR-105)', () => {
    const tex = (n: number): Texture[] => Array.from({ length: n }, () => new Texture());
    const make = (hideUnitAtMs: number) => {
      const data: AtlasData = {
        luPerUnit: 1,
        animations: { idle: tex(2), walk: tex(8), attack: tex(4), die: tex(3), die_team: tex(3) },
        clips: {
          idle: { durationsMs: [500, 500], loop: true },
          walk: { durationsMs: Array(8).fill(62.5) as number[], loop: true, naturalSpeedLuPerS: 60 },
          attack: { durationsMs: [100, 100, 100, 100], impactAt: 0.5 },
          die: { durationsMs: [83, 83, 83], hideUnitAtMs, fx: [{ id: 'fx.dust_poof', atMs: 166, offsetLu: [0, 26], scale: 0.5 }, { id: 'fx.ko_stars', atMs: 249, offsetLu: [0, 40], loops: 2 }] },
        },
      };
      const def = MANIFEST['unit.bonker'];
      if (!def) throw new Error('no bonker');
      const art = createArtProvider({ warn: () => {} });
      art.atlas.register(def.source, data);
      const v = art.createUnit({ visualId: 'unit.bonker', side: 1, teamPreset: 'default' });
      expect(v.root.label).toBe(def.source);
      return v;
    };
    // The sheet hides at the end of its fall: the body stays, lies, then sinks with a dust puff.
    const v = make(249);
    v.play('walk', { loop: true, durationMs: Math.round((500 * 80) / 45) });
    v.update(100);
    v.play('die');
    const body = v.root.children[1] as { visible: boolean; y: number };
    const overlay = v.root.children[2];
    v.update(200);
    expect(body.visible).toBe(true);
    expect(overlay?.children.length).toBeGreaterThan(0);
    v.update(100);
    expect(body.visible).toBe(true);
    v.update(500);
    expect(body.y).toBe(0);
    v.update(100);
    // lying done: the sink dust is out
    expect(overlay?.children.length ?? 0).toBeGreaterThan(0);
    v.update(250);
    expect(body.visible).toBe(true);
    expect(body.y).toBeGreaterThan(1);
    v.destroy();
    // A body that bursts earlier than its clip's end still hides at the hand-off.
    const w = make(166);
    w.play('die');
    w.update(200);
    expect((w.root.children[1] as { visible: boolean }).visible).toBe(false);
    w.destroy();
  });
});
