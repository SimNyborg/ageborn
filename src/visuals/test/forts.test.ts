/**
 * Fort and levy visuals (DESIGN A16.14.8): the visual lists match the content, every installed fort
 * sheet carries the clips the fort view plays, the manifest routes forts to their sheets and levies to
 * their Infantry Common's sheet at 0.85, and the fort view draws (stand-in first, then the sheet) without
 * a GPU.
 */
import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import type { FortView } from '@/contracts/art';
import { portraitStillBase } from '../adapters/atlasPortrait';
import { WorldAtlas, type WorldSheet } from '../adapters/worldAtlas';
import { AtlasFortView, fortCrumbleStage } from '../fortViews/atlasFortView';
import { FORT_SHEETS, FORT_VISUALS, fortSheetSource, fortSource, LEVY_SCALE, LEVY_VISUALS } from '../forts';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';
import { PAUSED_WAVE_IDS } from '../../../tests/fixtures/pausedWave';

interface FortJson {
  animations: Record<string, string[]>;
  meta: { scale: string; ageborn: { pxPerLu: number; heightLu: number; kind?: string; fortKind?: string; material?: string; crew?: { visualId: string; scale: number }; muzzleLu?: number[]; anchorsLu: Record<string, number[]> } };
}
const SHEETS = import.meta.glob<FortJson>(['/public/art/forts/*/*.json'], { eager: true, import: 'default' });
const FILES = new Set(Object.keys(import.meta.glob('/public/art/forts/*/*.png', { query: '?url', import: 'default' })));

describe('fort visuals match the content (A16.14.4)', () => {
  it('lists every fort card with its age and kind', () => {
    // the paused content wave's forts have no art yet (tests/fixtures/pausedWave.ts)
    const want = Object.values(content.forts)
      .filter((f) => !PAUSED_WAVE_IDS.has(f.id))
      .map((f) => `${f.id}:${f.age}:${f.fortKind}`)
      .sort();
    expect(FORT_VISUALS.map((f) => `${f.id}:${f.age}:${f.kind}`).sort()).toEqual(want);
    for (const f of Object.values(content.forts)) expect(f.visualId).toBe(`fort.${f.id}`);
  });

  it('lists every levy with its age and the Common it is drawn from', () => {
    const levies = Object.values(content.units).filter((u) => u.levy);
    expect(LEVY_VISUALS.map((l) => l.id).sort()).toEqual(levies.map((u) => u.id).sort());
    for (const l of LEVY_VISUALS) {
      const inf = content.units[l.infantry];
      // the Infantry Common, or the ranged or brute Common of a camp variant's `levyFrom` (X0, CONTENT_PLAN 5.2)
      expect(['infantry', 'ranged', 'heavy'], l.id).toContain(inf?.group);
      if (inf?.group !== 'infantry') expect(content.units[l.id]?.attacks[0]?.projectile !== undefined, l.id).toBe(inf?.group === 'ranged');
      expect(inf?.rarity, l.id).toBe('common');
      expect(inf?.age, l.id).toBe(l.age);
      expect(content.units[l.id]?.age).toBe(l.age);
    }
  });
});

describe('installed fort sheets (art/blender/styles/realistic/forts)', () => {
  const listed = FORT_VISUALS.filter((f) => FORT_SHEETS[f.age].includes(f.id));

  it('has every fort sheet the list names, at both densities, with its card still', () => {
    expect(listed.length).toBeGreaterThanOrEqual(4);
    for (const f of listed) {
      const src = `/public/${fortSheetSource(f.age, f.id)}`;
      expect(SHEETS[src], src).toBeDefined();
      expect(SHEETS[src.replace(/\.json$/, '.hd.json')], src).toBeDefined();
      expect(FILES.has(src.replace(/\.json$/, '.png')), src).toBe(true);
      expect(FILES.has(src.replace(/\.json$/, '.hd.png')), src).toBe(true);
      expect(FILES.has(src.replace(/\.json$/, '.portrait.png')), src).toBe(true);
      expect(FILES.has(src.replace(/\.json$/, '.portrait_team.png')), src).toBe(true);
    }
  });

  it('carries the clips the fort view plays, each with its team layer', () => {
    for (const f of listed) {
      const j = SHEETS[`/public/${fortSheetSource(f.age, f.id)}`];
      if (!j) continue;
      const m = j.meta.ageborn;
      expect(m.kind, f.id).toBe('fort');
      expect(m.fortKind, f.id).toBe(f.kind);
      expect(['wood', 'stone', 'metal', 'energy'], f.id).toContain(m.material);
      const need = f.kind === 'trap' ? ['trap'] : ['body', 'scaffold', 'rubble', 'flag'];
      if (f.kind === 'camp') need.push('door');
      for (const c of need) {
        expect(j.animations[c]?.length, `${f.id}.${c}`).toBeGreaterThan(0);
        expect(j.animations[`${c}_team`]?.length, `${f.id}.${c}_team`).toBe(j.animations[c]?.length);
      }
      if (f.kind !== 'trap') expect(j.animations['body']?.length, f.id).toBe(4);
      if (f.kind === 'trap') expect(j.animations['trap']?.length, f.id).toBe(4);
      // a tower shoots from a crew (the age's Ranged Common, drawn from its own sheet) or from a muzzle
      if (f.kind === 'tower') {
        expect(m.crew !== undefined || m.muzzleLu !== undefined, f.id).toBe(true);
        if (m.crew) {
          const crew = MANIFEST[m.crew.visualId];
          expect(crew?.kind, m.crew.visualId).toBe('atlas');
          expect(j.animations['front']?.length, `${f.id}.front`).toBe(4);
          const card = content.units[m.crew.visualId.replace(/^unit\./, '')];
          expect(card?.group, f.id).toBe('ranged');
          expect(card?.age, f.id).toBe(f.age);
        }
      }
    }
  });

  it('routes listed forts to their sheet and the rest to the stand-in', () => {
    for (const f of FORT_VISUALS) {
      const def = MANIFEST[`fort.${f.id}`];
      expect(def, f.id).toBeDefined();
      if (FORT_SHEETS[f.age].includes(f.id)) {
        expect(def?.kind, f.id).toBe('atlas');
        expect(fortSource(def?.source ?? ''), f.id).toEqual({ age: f.age, slug: f.id });
        expect(portraitStillBase(def?.source ?? ''), f.id).toBe(`art/forts/${f.age}/${f.id}.portrait`);
      }
    }
  });
});

describe('levies (A16.14.8)', () => {
  it('draw from their Infantry Common sheet at 0.85 scale', () => {
    for (const l of LEVY_VISUALS) {
      const def = MANIFEST[`unit.${l.id}`];
      const inf = MANIFEST[`unit.${l.infantry}`];
      expect(def?.kind, l.id).toBe(inf?.kind);
      if (inf?.kind !== 'atlas') continue;
      expect(def?.source, l.id).toBe(inf.source);
      expect(def?.heightLu, l.id).toBeCloseTo(inf.heightLu * LEVY_SCALE, 0);
      expect(def?.anchors.head.y, l.id).toBeCloseTo(inf.anchors.head.y * LEVY_SCALE, 3);
    }
  });
});

describe('fort view (A16.14.8)', () => {
  function sheet(): WorldSheet {
    const t = Texture.WHITE;
    const frames = (n: number): Texture[] => Array.from({ length: n }, () => t);
    return {
      animations: { body: frames(4), body_team: frames(4), scaffold: frames(1), scaffold_team: frames(1), rubble: frames(1), rubble_team: frames(1), flag: frames(6), flag_team: frames(6), door: frames(3), door_team: frames(3) },
      luPerUnit: 1,
      meta: { heightLu: 86, pxPerLu: 1.23, clips: {}, ...({ kind: 'fort', fortKind: 'camp', material: 'wood', footLu: 30, flag: { crumbleMax: 2 }, door: { crumbleMax: 2 }, anchorsLu: { head: [0, 86], hitCenter: [0, 26] } } as object) },
    };
  }

  function view(withSheet: boolean): { v: AtlasFortView; atlas: WorldAtlas } {
    const atlas = new WorldAtlas((s) => s, () => Promise.reject(new Error('no fetch in tests')));
    if (withSheet) atlas.register('art/forts/stone/war_camp.json', sheet());
    const art = createArtProvider({ dpr: 1, worldPxPerLu: 1 });
    const v = new AtlasFortView({
      def: MANIFEST['fort.war_camp'] ?? MANIFEST['fort.palisade']!,
      side: 1,
      kind: 'camp',
      teamColor: 0xf28a1e,
      decor: art.procedural.baker,
      seed: 3,
      sheets: atlas,
      crewSheet: () => undefined,
      age: 'stone',
      source: withSheet ? 'art/forts/stone/war_camp.json' : null,
    });
    return { v, atlas };
  }

  it('crumbles at 66%, 33% and 12% HP', () => {
    expect([10000, 6700, 6600, 3400, 3300, 1300, 1200, 0].map(fortCrumbleStage)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('plays a whole life from the sheet without throwing: place, scaffold, build, spawn, hits, crumble, decay, collapse', () => {
    const { v } = view(true);
    const f: FortView = v;
    let t = 0;
    const step = (ms: number, pose: Partial<Parameters<FortView['setPose']>[0]> = {}): void => {
      for (let k = 0; k < ms; k += 16) {
        t += 16;
        f.setPose({ x: 1500, y: -6, hpBp: 10000, scaffoldBp: 10000, decayBp: 0, crumbleStage: 0, silenced: false, ...pose });
        f.update(16);
      }
    };
    step(400, { scaffoldBp: 500, hpBp: 5000 });
    step(800, { scaffoldBp: 6000, hpBp: 5000 });
    step(600);
    f.play('spawn');
    f.play('hit');
    step(700, { hpBp: 6000, crumbleStage: 1 });
    step(700, { hpBp: 3000, crumbleStage: 2, decayBp: 4000 });
    f.play('collapse');
    step(1500, { hpBp: 0, crumbleStage: 3 });
    expect(t).toBeGreaterThan(4000);
    expect(f.root.destroyed).toBe(false);
    f.destroy();
    expect(f.root.destroyed).toBe(true);
  });

  it('draws a stand-in while no sheet is installed', () => {
    const { v } = view(false);
    v.setPose({ x: 0, y: 0, hpBp: 10000, scaffoldBp: 10000, decayBp: 0, crumbleStage: 0, silenced: false });
    v.update(16);
    expect(v.root.children.length).toBeGreaterThan(0);
    v.destroy();
  });

  it('a trap shows armed, sprung and spent states', () => {
    const atlas = new WorldAtlas((s) => s, () => Promise.reject(new Error('no fetch in tests')));
    const t = Texture.WHITE;
    atlas.register('trap.json', { animations: { trap: [t, t, t, t], trap_team: [t, t, t, t] }, luPerUnit: 1, meta: { heightLu: 24, pxPerLu: 1.23, clips: {} } });
    const art = createArtProvider({ dpr: 1, worldPxPerLu: 1 });
    const v = new AtlasFortView({ def: MANIFEST['fort.spike_pit']!, side: 0, kind: 'trap', teamColor: 0x2f7df6, decor: art.procedural.baker, seed: 1, sheets: atlas, crewSheet: () => undefined, age: 'stone', source: 'trap.json' });
    v.setPose({ x: 0, y: 0, hpBp: 10000, scaffoldBp: 4000, decayBp: 0, crumbleStage: 0, charges: 3, silenced: false });
    v.update(16);
    v.setPose({ x: 0, y: 0, hpBp: 10000, scaffoldBp: 10000, decayBp: 0, crumbleStage: 0, charges: 3, silenced: false });
    v.play('trigger');
    for (let i = 0; i < 60; i++) v.update(16);
    v.play('spent');
    for (let i = 0; i < 80; i++) v.update(16);
    expect(v.root.alpha).toBeLessThan(0.2);
    v.destroy();
  });
});
