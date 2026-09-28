/**
 * The ArtProvider (DESIGN B5): routing by manifest kind, the placeholder fallback for stub tiers and
 * unknown ids, skins, the `?art=` override, and the view contracts of both working tiers. Runs in
 * Node: the procedural baker hands out empty textures with correct bounds when there is no DOM.
 */
import { describe, expect, it, vi } from 'vitest';
import type { ClipName, UnitPose, VisualDef } from '@/contracts/art';
import { PlaceholderAdapter } from '../adapters/placeholder';
import { MANIFEST, PROCEDURAL_MANIFEST } from '../manifest';
import { artOverrideFromUrl, createArtProvider } from '../provider';
import { WORLD } from '../style';

const pose = (o: Partial<UnitPose> = {}): UnitPose => ({ x: 100, y: 0, facing: 1, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1, levelTrim: 'none', roleGlyph: 'infantry', ...o });
const CLIPS: ClipName[] = ['spawn', 'idle', 'walk', 'attack', 'hit', 'stun', 'die', 'victory', 'ability'];

function quiet() {
  const warn = vi.fn();
  return { art: createArtProvider({ warn, dpr: 1 }), warn };
}

describe('routing', () => {
  it('reads ?art= overrides', () => {
    expect(artOverrideFromUrl('?art=placeholder')).toBe('placeholder');
    expect(artOverrideFromUrl('?dev=1&art=atlas')).toBe('atlas');
    expect(artOverrideFromUrl('?art=nonsense')).toBe(null);
    expect(artOverrideFromUrl('')).toBe(null);
  });

  it('draws procedural entries with the procedural tier', () => {
    const { art } = quiet();
    const u = art.createUnit({ visualId: 'unit.bonker', side: 0, teamPreset: 'default' });
    expect(u.root.label).toBe('unit.bonker');
    u.destroy();
  });

  it('falls back to placeholders for unknown ids, and to the puppet for a sheet that is not loaded', () => {
    const warn = vi.fn();
    const atlasDef: VisualDef = { ...(PROCEDURAL_MANIFEST['unit.bonker'] as VisualDef), kind: 'atlas', source: 'units/bonker' };
    const art = createArtProvider({ warn, manifest: { ...MANIFEST, 'unit.bonker': atlasDef } });
    const a = art.createUnit({ visualId: 'unit.bonker', side: 0, teamPreset: 'default' });
    expect(a.root.label).toBe('unit.bonker');
    const b = art.createUnit({ visualId: 'unit.nope', side: 1, teamPreset: 'default' });
    expect(b.root.label).toContain('placeholder');
    expect(warn).toHaveBeenCalledTimes(1);
    art.createUnit({ visualId: 'unit.nope', side: 1, teamPreset: 'default' });
    expect(warn).toHaveBeenCalledTimes(1);
    // a tier without a fallback puppet still draws a placeholder
    const odd: VisualDef = { ...atlasDef, kind: 'spine', source: 'x' };
    const art2 = createArtProvider({ warn, manifest: { ...MANIFEST, 'unit.bonker': odd } });
    expect(art2.createUnit({ visualId: 'unit.bonker', side: 0, teamPreset: 'default' }).root.label).toContain('placeholder');
  });

  it('forces a tier for every visual with ?art=placeholder', () => {
    const art = createArtProvider({ force: 'placeholder', warn: () => {} });
    expect(art.createUnit({ visualId: 'unit.bonker', side: 0, teamPreset: 'default' }).root.label).toContain('placeholder');
  });

  it('resolves skins, and falls back to the base visual for a missing skin', () => {
    const { art, warn } = quiet();
    expect(art.resolve('unit.bonker', 'pumpkin_head')?.key).toBe('unit.bonker@pumpkin_head');
    expect(art.resolve('unit.bonker', 'nope')?.key).toBe('unit.bonker');
    expect(warn).toHaveBeenCalledOnce();
    const v = art.createUnit({ visualId: 'unit.bonker', skin: 'pumpkin_head', side: 0, teamPreset: 'default' });
    expect(v.root.label).toBe('unit.bonker@pumpkin_head');
  });

  it('maps card ids to visual ids for portraits', () => {
    const { art } = quiet();
    expect(art.visualIdForCard('bonker')).toBe('unit.bonker');
    expect(art.visualIdForCard('rock_tosser')).toBe('turret.rock_tosser');
    expect(art.visualIdForCard('stampede')).toBe('power.stampede');
    expect(art.visualIdForCard('icon.horn')).toBe('icon.horn');
  });

  it('portraits resolve (empty without a DOM) and are cached by card, skin, size, plate and preset', async () => {
    const { art } = quiet();
    const a = art.portrait({ card: 'bonker', size: 64 });
    expect(art.portrait({ card: 'bonker', size: 64 })).toBe(a);
    expect(art.portrait({ card: 'bonker', size: 64, skin: 'pumpkin_head' })).not.toBe(a);
    expect(art.portrait({ card: 'bonker', size: 64, plate: false })).not.toBe(a);
    expect(await a).toBe('');
    // team areas follow the colourblind preset (A11); units with a sheet use the rendered card still
    const spy = vi.spyOn(art.atlas, 'portrait');
    art.setTeamPreset('highContrast');
    const b = art.portrait({ card: 'bonker', size: 64 });
    expect(b).not.toBe(a);
    await b;
    expect(spy.mock.calls[0]?.[0].teamPreset).toBe('highContrast');
  });

  it('a unit moved to sprite sheets keeps its procedural card portrait until that tier draws portraits', async () => {
    const atlasDef: VisualDef = { ...(PROCEDURAL_MANIFEST['unit.bonker'] as VisualDef), kind: 'atlas', source: 'art/units/bonker.json' };
    const art = createArtProvider({ warn: () => {}, manifest: { ...MANIFEST, 'unit.bonker': atlasDef } });
    const proc = vi.spyOn(art.procedural, 'portrait');
    const place = vi.spyOn(art.placeholder, 'portrait');
    await art.portrait({ card: 'bonker', size: 64 });
    expect(proc).toHaveBeenCalledOnce();
    expect(proc.mock.calls[0]?.[0].def.source).toBe('unit.bonker');
    expect(place).not.toHaveBeenCalled();
    // ?art=placeholder still forces the placeholder tier
    const forced = createArtProvider({ warn: () => {}, force: 'placeholder' });
    const forcedPlace = vi.spyOn(forced.placeholder, 'portrait');
    await forced.portrait({ card: 'bonker', size: 64 });
    expect(forcedPlace).toHaveBeenCalledOnce();
  });

  it('bakes the atlas for the largest world scale the screen can show (A2.1 camera, B16 memory)', async () => {
    const { screenWorldPxPerLu } = await import('../provider');
    expect(screenWorldPxPerLu(1280, 720)).toBeCloseTo(1280 / 1560, 6); // desktop 720p: 1:1
    expect(screenWorldPxPerLu(3840, 2160)).toBe(1.25); // capped: never larger than before
    expect(screenWorldPxPerLu(390, 844)).toBeCloseTo((844 / 1560) * 1.6, 6); // phone: landscape width, pinch zoom 1.6x
    expect(screenWorldPxPerLu(300, 200)).toBe(0.6);
    expect(screenWorldPxPerLu(0, 0)).toBe(1.25);
    expect(createArtProvider({ warn: () => {}, dpr: 2, worldPxPerLu: 0.9 }).procedural.baker.pxPerLu).toBeCloseTo(1.8, 6);
    expect(createArtProvider({ warn: () => {}, dpr: 3, quality: 'lite', worldPxPerLu: 0.9 }).procedural.baker.pxPerLu).toBeCloseTo(0.9, 6);
  });

  it('preloads every age and records the bake', async () => {
    const { art } = quiet();
    await art.preload(['stone', 'medieval']);
    await art.preload(['stone', 'medieval', 'gunpowder', 'modern', 'future']);
    const s = art.stats();
    expect(s.preloads.map((p) => p.ages)).toEqual([['stone', 'medieval'], ['gunpowder', 'modern', 'future']]);
  });
});

describe('procedural unit views', () => {
  const units = Object.keys(MANIFEST).filter((k) => k.startsWith('unit.'));
  it.each(units)('%s plays every clip on both sides without throwing', (key) => {
    const { art } = quiet();
    const [visualId, skin] = key.split('@') as [string, string | undefined];
    for (const side of [0, 1] as const) {
      const v = art.createUnit({ visualId, skin, side, teamPreset: side === 0 ? 'default' : 'highContrast' });
      v.setPose(pose({ facing: side === 0 ? 1 : -1, levelTrim: 'gold', roleGlyph: 'heavy', shieldBp: 5000 }));
      for (const clip of CLIPS) {
        if (clip === 'die') continue;
        v.play(clip, clip === 'attack' ? { impactAtMs: 300 } : undefined);
        v.update(120);
      }
      v.setPose(pose({ stunned: true, frozen: true }));
      v.update(50);
      v.freeze(60);
      v.flash(80, 0xffe0a0);
      v.update(100);
      v.play('die');
      for (let i = 0; i < 30; i++) v.update(50);
      expect(v.anchors.head.y).toBeLessThan(0);
      v.destroy();
      v.destroy();
    }
  });

  it('the view follows facing and alpha from the pose', () => {
    const { art } = quiet();
    const v = art.createUnit({ visualId: 'unit.footman', side: 1, teamPreset: 'default' });
    v.setPose(pose({ x: 321, y: 8, facing: -1, alpha: 0.5 }));
    expect(v.root.x).toBe(321);
    expect(v.root.y).toBe(8);
    expect(v.root.alpha).toBe(0.5);
  });
});

describe('procedural turret, base, backdrop and effect views', () => {
  it('turrets run every clip, aim within limits, and show the outdated arrow', () => {
    const { art } = quiet();
    for (const key of Object.keys(MANIFEST).filter((k) => k.startsWith('turret.'))) {
      const t = art.createTurret({ visualId: key, side: 1, teamPreset: 'blueYellow' });
      for (const c of ['build', 'idle', 'fire', 'modernise', 'sell'] as const) {
        t.play(c);
        t.aimAt(-400);
        t.update(200);
      }
      t.setOutdated(true);
      t.update(16);
      t.destroy();
    }
  });

  it('bases stack four mounts bottom to top and mirror for side 1', () => {
    const { art } = quiet();
    for (const age of ['stone', 'medieval', 'gunpowder', 'modern', 'future'] as const) {
      const left = art.createBase({ age, side: 0, teamPreset: 'default' });
      const right = art.createBase({ age, side: 1, teamPreset: 'default' });
      right.root.position.set(WORLD.laneLu, 0);
      const m0 = left.mountPoints();
      const m1 = right.mountPoints();
      expect(m0.length).toBe(4);
      for (let i = 1; i < 4; i++) expect((m0[i]?.y ?? 0) < (m0[i - 1]?.y ?? 0)).toBe(true);
      for (let i = 0; i < 4; i++) {
        expect(m0[i]?.x ?? 1).toBeLessThanOrEqual(0);
        expect(m1[i]?.x ?? 0).toBeGreaterThanOrEqual(WORLD.laneLu);
        expect((m1[i]?.x ?? 0) - WORLD.laneLu).toBeCloseTo(-(m0[i]?.x ?? 0));
      }
      left.setCrumble(3);
      left.setTreasury(3);
      left.lastStandGlow(true);
      left.hit();
      left.morphTo(age === 'future' ? 'stone' : 'future', 1800);
      for (let i = 0; i < 40; i++) left.update(50);
      left.collapse();
      for (let i = 0; i < 30; i++) left.update(50);
      left.destroy();
      right.destroy();
    }
  });

  it('draws a base skin on the age it belongs to, including after evolving into that age', () => {
    const { art, warn } = quiet();
    const direct = art.createBase({ age: 'future', skin: 'crystal_spire', side: 0, teamPreset: 'default' });
    expect(direct.root.label).toBe('base.future@crystal_spire');
    direct.destroy();
    // A match starts in the Stone Age: the Crystal Spire skin is carried along and appears on evolve.
    const b = art.createBase({ age: 'stone', skin: 'crystal_spire', side: 1, teamPreset: 'default' });
    expect(b.root.label).toBe('base.stone');
    b.morphTo('medieval', 1800);
    for (let t = 0; t < 1900; t += 50) b.update(50);
    expect(b.root.label).toBe('base.medieval');
    b.morphTo('future', 1800);
    for (let t = 0; t < 1900; t += 50) b.update(50);
    expect(b.root.label).toBe('base.future@crystal_spire');
    b.destroy();
    expect(warn).not.toHaveBeenCalled();
    art.createBase({ age: 'stone', skin: 'no_such_skin', side: 0, teamPreset: 'default' }).destroy();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('turrets show a one-frame muzzle flash per shot (A11)', () => {
    const { art } = quiet();
    const t = art.createTurret({ visualId: 'turret.swivel_gun', side: 0, teamPreset: 'default' }) as unknown as { play(c: 'fire'): void; update(dt: number): void; debug: { muzzleFlash: boolean } };
    t.update(16);
    expect(t.debug.muzzleFlash).toBe(false);
    t.play('fire');
    t.update(16);
    expect(t.debug.muzzleFlash).toBe(true);
    t.update(16);
    expect(t.debug.muzzleFlash).toBe(false);
  });

  it('backdrops clamp and drift the seam at 20 lu/s, and wipe a side to a new age', () => {
    const { art } = quiet();
    const d = art.createBackdrop({ left: 'stone', right: 'future', arena: 'chrono_rift' }) as unknown as {
      setSeam(x: number): void;
      wipe(side: 0 | 1, age: 'modern', ms: number): void;
      update(dt: number): void;
      state: { seam: number; target: number; left: string; right: string; wiping: boolean };
    };
    expect(d.state.seam).toBe(WORLD.seamHomeLu);
    d.setSeam(2000);
    expect(d.state.target).toBe(WORLD.seamMaxLu);
    d.update(1000);
    expect(d.state.seam).toBeCloseTo(WORLD.seamHomeLu + WORLD.seamDriftLuPerSec, 3);
    for (let i = 0; i < 20; i++) d.update(1000);
    expect(d.state.seam).toBeCloseTo(WORLD.seamMaxLu, 3);
    d.setSeam(0);
    expect(d.state.target).toBe(WORLD.seamMinLu);
    d.wipe(0, 'modern', WORLD.evolveWipeMs);
    expect(d.state.wiping).toBe(true);
    d.update(WORLD.evolveWipeMs + 50);
    expect(d.state.wiping).toBe(false);
    expect(d.state.left).toBe('modern');
  });

  it('the seam cross-fades in thin strips (an opaque under-piece per pair) with a soft 30% haze', async () => {
    const { ageRegions, composePieces, hazeAlpha } = await import('../adapters/procedural/backdropView');
    const seam = 640;
    const pieces = composePieces(ageRegions({ left: 'stone', right: 'future', seam, wipe: null }), seam);
    const strips = pieces.filter((p) => p.alpha < 1 || p.under);
    // pairs: the left age under the right age, alphas summing to 1, within 240 lu of the seam
    const unders = strips.filter((p) => p.under);
    expect(unders.length).toBeGreaterThanOrEqual(WORLD.seamBlendLu / 12);
    for (const u of unders) {
      expect(u.age).toBe('stone');
      const over = strips.find((p) => !p.under && p.x0 === u.x0 && p.x1 === u.x1);
      expect(over?.age).toBe('future');
      expect((over?.alpha ?? 0) + u.alpha).toBeCloseTo(1, 6);
      expect(u.x0).toBeGreaterThanOrEqual(seam - WORLD.seamBlendLu / 2 - 1e-6);
      expect(u.x1).toBeLessThanOrEqual(seam + WORLD.seamBlendLu / 2 + 1e-6);
      expect(pieces.indexOf(u)).toBeLessThan(pieces.indexOf(over as (typeof pieces)[number]));
    }
    // the fade is monotonic from the left age to the right age
    const overs = strips.filter((p) => !p.under).sort((a, b) => a.x0 - b.x0);
    for (let i = 1; i < overs.length; i++) expect(overs[i]?.alpha ?? 0).toBeGreaterThanOrEqual(overs[i - 1]?.alpha ?? 0);
    // haze: 0 at the seam edges, 30% in the middle (A11 "30% desaturation"), no hard edge
    expect(hazeAlpha(0)).toBe(0);
    expect(hazeAlpha(1)).toBe(0);
    expect(hazeAlpha(0.5)).toBeCloseTo(WORLD.seamDesaturate, 6);
    expect(hazeAlpha(0.02)).toBeLessThan(0.02);
  });

  it('the enemy evolve pillar is smaller (`small: 1`, A12), and a pooled view resets on reuse', () => {
    const { art } = quiet();
    const e = art.createEffect('fx.evolve_pillar');
    const layer = e.root.children[0];
    e.playAt({ x: 0, y: 0 }, { small: 1 });
    expect(layer?.scale.x).toBeCloseTo(0.6, 6);
    e.playAt({ x: 0, y: 0 }, { scale: 1.5 });
    expect(layer?.scale.x).toBeCloseTo(1.5, 6);
    e.playAt({ x: 0, y: 0 });
    expect(layer?.scale.x).toBe(1);
    e.destroy();
  });

  it('every effect and projectile plays to completion', () => {
    const { art } = quiet();
    for (const key of Object.keys(MANIFEST).filter((k) => k.startsWith('fx.') || k.startsWith('proj.'))) {
      const e = key.startsWith('proj.') ? art.createProjectile(key, 0) : art.createEffect(key, { side: 1, radius: 40, zone: 300, durationMs: 600, toX: 200, toY: 0 });
      if (key.startsWith('proj.')) e.fly({ x: 0, y: -40 }, { x: 300, y: -20 }, 500, true);
      else e.playAt({ x: 100, y: 0 });
      let t = 0;
      while (!e.done && t < 10000) {
        e.update(50);
        t += 50;
      }
      expect(e.done, key).toBe(true);
      e.destroy();
    }
  });
});

describe('placeholder tier (day one)', () => {
  it('implements every view with role-shaped capsules in team colour', () => {
    const p = new PlaceholderAdapter();
    const def = MANIFEST['unit.bonker'] as VisualDef;
    const u = p.createUnit({ key: 'unit.bonker', def, side: 0, teamPreset: 'default', seed: 1 });
    for (const g of ['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary'] as const) {
      u.setPose(pose({ roleGlyph: g }));
      u.update(16);
    }
    u.play('attack', { impactAtMs: 200 });
    u.update(300);
    u.play('die');
    u.update(700);
    u.destroy();
    const t = p.createTurret({ key: 'turret.rock_tosser', def, side: 1, teamPreset: 'default', seed: 1 });
    t.aimAt(0);
    t.play('fire');
    t.update(60);
    t.destroy();
    const b = p.createBase({ key: 'base.stone', def, side: 0, teamPreset: 'default', seed: 1, age: 'stone', resolveAge: () => undefined });
    expect(b.mountPoints().length).toBe(4);
    b.morphTo('future', 100);
    b.destroy();
    const e = p.createEffect({ key: 'fx.blast', def, side: 0, options: {}, seed: 1, teamPreset: 'default' });
    e.playAt({ x: 0, y: 0 });
    e.update(400);
    expect(e.done).toBe(true);
  });
});

describe('atlas tier (sprite sheets swap in by manifest entry)', () => {
  const json = {
    animations: { idle: ['i0', 'i1'], idle_team: ['t0', 't1'], attack: ['a0', 'a1', 'a2', 'a3'], attack_team: ['b0', 'b1', 'b2', 'b3'], die: ['d0', 'd1'] },
    meta: {
      scale: '2',
      ageborn: {
        heightLu: 68,
        pxPerLu: 1.64,
        anchorsLu: { head: [2, 66] as const, hitCenter: [0, 32] as const },
        clips: {
          idle: { durationsMs: [500, 500], loop: true },
          attack: { durationsMs: [100, 200, 100, 200], impactAt: 0.5 },
          die: { durationsMs: [300, 300] },
        },
        team: { mode: 'tint-underlay', frameSuffix: '_team' },
      },
    },
  };

  it('builds a manifest entry from the sheet meta (anchors y-down, clip fallbacks)', async () => {
    const { atlasVisualDef } = await import('../adapters/atlas');
    const def = atlasVisualDef(json, 'art/units/bonker.json');
    expect(def.kind).toBe('atlas');
    expect(def.anchors.head).toEqual({ x: 2, y: -66 });
    expect(def.events.attack.impactAt).toBe(0.5);
    expect(def.clips['ability']?.ref).toBe('attack');
    expect(def.clips['spawn']?.ref).toBe('idle');
    expect(def.clips['idle']?.durationMs).toBe(1000);
  });

  it('lands the contact frame on the sim impact time and mixes with procedural visuals', async () => {
    const { Texture } = await import('pixi.js');
    const { atlasVisualDef, frameAt } = await import('../adapters/atlas');
    const def = atlasVisualDef(json, 'art/units/bonker.json');
    const tex = (n: number): InstanceType<typeof Texture>[] => Array.from({ length: n }, () => new Texture());
    const data = { luPerUnit: 2 / 1.64, clips: json.meta.ageborn.clips, animations: { idle: tex(2), idle_team: tex(2), attack: tex(4), attack_team: tex(4), die: tex(2) } };
    const art = createArtProvider({ warn: () => {}, manifest: { ...MANIFEST, 'unit.bonker': def } });
    art.atlas.register(def.source, data);
    const a = art.createUnit({ visualId: 'unit.bonker', side: 0, teamPreset: 'default' });
    const p = art.createUnit({ visualId: 'unit.footman', side: 1, teamPreset: 'default' });
    expect(a.root.label).toBe('art/units/bonker.json');
    expect(p.root.label).toBe('unit.footman');
    // attack authored 600 ms with the contact frame (index 2) at 0.5; the sim says impact in 900 ms
    const steps = [100, 200, 100, 200];
    expect(frameAt({ t: 899, durationMs: 1200, impactAtMs: 900, loop: false, impactAt: 0.5, steps })).toBe(1);
    expect(frameAt({ t: 900, durationMs: 1200, impactAtMs: 900, loop: false, impactAt: 0.5, steps })).toBe(2);
    a.setPose(pose({ roleGlyph: 'infantry', levelTrim: 'silver' }));
    a.play('spawn');
    a.play('attack', { impactAtMs: 900 });
    for (let t = 0; t < 1300; t += 50) a.update(50);
    a.play('die');
    a.update(1000);
    a.destroy();
  });

  it('draws units and turrets whose sheet failed as their puppet, and unsupported entries as placeholders', async () => {
    const { atlasVisualDef } = await import('../adapters/atlas');
    const def = atlasVisualDef(json, 'art/units/missing.json');
    const warn = vi.fn();
    const art = createArtProvider({ warn, manifest: { ...MANIFEST, 'unit.bonker': def, 'turret.rock_tosser': { ...def, source: 'x.json' } } });
    await art.preload(['stone']);
    expect(art.createUnit({ visualId: 'unit.bonker', side: 0, teamPreset: 'default' }).root.label).toBe('unit.bonker');
    expect(art.createTurret({ visualId: 'turret.rock_tosser', side: 0, teamPreset: 'default' }).root.label).toBe('turret.rock_tosser');
    const odd = createArtProvider({ warn, manifest: { ...MANIFEST, 'turret.rock_tosser': { ...def, kind: 'spine', source: 'x.json' } } });
    expect(odd.createTurret({ visualId: 'turret.rock_tosser', side: 0, teamPreset: 'default' }).root).toBeDefined();
    expect(warn).toHaveBeenCalled();
  });
});
