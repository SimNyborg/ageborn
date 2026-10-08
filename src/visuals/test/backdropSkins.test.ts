/**
 * Backdrop skins (DESIGN A18.9.4 "Backdrops", owner request 2026-09-30): every content item has a
 * theme and a manifest entry per age, the themes keep the A11 backdrop rules (desaturated large areas,
 * no saturated team hues), each half carries its own skin through the seam and an evolve wipe, the
 * provider resolves skins through the manifest, and the weather respects Reduce motion.
 */
import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { AGES } from '../ages';
import { ageRegions, composePieces, themedSkyLift } from '../adapters/procedural/backdropView';
import { BackdropWeatherLayer } from '../adapters/procedural/backdropWeather';
import type { PartBaker } from '../bake';
import { BACKDROP_THEMES, backdropTheme } from '../backdrops/themes';
import { backdropIconSvg, backdropWeatherSvg } from '../cosmetics/backdropPreview';
import { hasCosmeticArt } from '../cosmetics/art';
import { MANIFEST } from '../manifest';
import { hueInTeamBand, rgbToHsv } from '../palette';
import { createArtProvider } from '../provider';
import { WORLD } from '../style';

const items = content.cosmetics.collections.items.filter((x) => x.collection === 'backdrop');

describe('backdrop skins: art for every item', () => {
  it('has at least 8 themes, one per content item, with a manifest entry for every age', () => {
    expect(items.length).toBeGreaterThanOrEqual(8);
    for (const x of items) {
      expect(hasCosmeticArt('backdrop', x.id), x.id).toBe(true);
      expect(backdropTheme(`backdrop.${x.id}`), x.id).not.toBeNull();
      for (const age of AGES) expect(MANIFEST[`backdrop.${age}@${x.id}`], `${age}@${x.id}`).toBeDefined();
    }
    expect(Object.keys(BACKDROP_THEMES).sort()).toEqual(items.map((x) => x.id).sort());
    expect(backdropTheme(null)).toBeNull();
    expect(backdropTheme('backdrop.nope')).toBeNull();
  });

  it('keeps large areas desaturated: no saturated team hue in a sky, grade, glow or cloud (A11)', () => {
    for (const [id, th] of Object.entries(BACKDROP_THEMES)) {
      for (const key of ['skyTop', 'skyBottom', 'grade', 'glow', 'cloudTint'] as const) {
        const { h, s, v } = rgbToHsv(th[key]);
        // a dark night colour reads as dark, not as a team colour
        if (hueInTeamBand(h)) expect(s <= 0.4 || v <= 0.4, `${id}.${key} h${Math.round(h)} s${s.toFixed(2)} v${v.toFixed(2)}`).toBe(true);
      }
      expect(th.skyMix).toBeLessThanOrEqual(1);
      expect(th.gradeMix * Math.max(1, th.midGradeScale)).toBeLessThanOrEqual(0.6);
    }
  });

  it('draws an emblem for every theme and the classic sky, and animated weather unless motion is off', () => {
    for (const id of ['classic', ...Object.keys(BACKDROP_THEMES)]) expect(backdropIconSvg(id), id).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 40">/);
    expect(backdropIconSvg('nope')).toBeNull();
    expect(backdropWeatherSvg(null, true)).toBeNull();
    expect(backdropWeatherSvg('backdrop.winterfall', true)).toContain('<animateTransform');
    expect(backdropWeatherSvg('backdrop.winterfall', false)).not.toContain('<animate');
    expect(backdropWeatherSvg('backdrop.thunderstorm', true)).toContain('<animate attributeName="opacity"');
    expect(backdropWeatherSvg('backdrop.thunderstorm', false)).not.toContain('<animate');
  });
});

describe('backdrop skins in the lane', () => {
  it('each half carries its own skin, also through an evolve wipe', () => {
    const skins = { left: 'backdrop.winterfall', right: null };
    const regions = ageRegions({ left: 'stone', right: 'medieval', seam: 1000, wipe: { side: 0, age: 'bronze', front: 300 }, skins });
    const left = regions.filter((r) => r.x1 <= 1000 + 1e-6);
    const right = regions.filter((r) => r.x0 >= 1000 - 1e-6);
    expect(left.length).toBe(2);
    for (const r of left) expect(r.skin).toBe('backdrop.winterfall');
    for (const r of right) expect(r.skin).toBeUndefined();
  });

  it('cross-fades at the seam between two looks of the same age (your skin, their classic sky)', () => {
    const seam = 1000;
    const pieces = composePieces(ageRegions({ left: 'stone', right: 'stone', seam, wipe: null, skins: { left: 'backdrop.eclipse' } }), seam);
    const unders = pieces.filter((p) => p.under);
    expect(unders.length).toBeGreaterThan(0);
    for (const u of unders) {
      expect(u.skin).toBe('backdrop.eclipse');
      const over = pieces.find((p) => !p.under && p.x0 === u.x0 && p.x1 === u.x1);
      expect(over?.skin).toBeUndefined();
      expect(u.x0).toBeGreaterThanOrEqual(seam - WORLD.seamBlendLu / 2 - 1e-6);
    }
    // the same age and no skins on either side: one solid run, no cross-fade
    expect(composePieces(ageRegions({ left: 'stone', right: 'stone', seam, wipe: null }), seam).some((p) => p.under)).toBe(false);
    // ... drawn as a single piece per layer (review 1, frame time: no 50 seam strips to re-cut whenever
    // the camera moves), and the same with one sky on both halves
    expect(composePieces(ageRegions({ left: 'stone', right: 'stone', seam, wipe: null }), seam)).toEqual([{ age: 'stone', x0: WORLD.worldLeftLu - 100, x1: WORLD.worldRightLu + 100, alpha: 1 }]);
    const both = composePieces(ageRegions({ left: 'stone', right: 'stone', seam, wipe: null, skins: { left: 'backdrop.eclipse', right: 'backdrop.eclipse' } }), seam);
    expect(both).toHaveLength(1);
    expect(both[0]?.skin).toBe('backdrop.eclipse');
    // an evolve wipe still cross-fades its edge, and the halves around it stay apart
    const wiping = composePieces(ageRegions({ left: 'stone', right: 'stone', seam, wipe: { side: 0, age: 'bronze', front: 300 } }), seam);
    expect(wiping.some((p) => p.under && p.age === 'bronze')).toBe(true);
    expect(wiping.filter((p) => p.alpha === 1 && !p.under).map((p) => p.age)).toEqual(['bronze', 'stone']);
  });

  it('a themed sky slides down on a phone so its sun, moon or aurora sits under the HUD, never on desktop (review 4)', () => {
    // a phone shows about 290 lu over the ground line: the features (painted about 250 lu up) move to about 58% of it
    const phone = themedSkyLift(290);
    expect(250 - phone).toBeGreaterThan(290 * 0.5);
    expect(250 - phone).toBeLessThan(290 * 0.65);
    // a desktop view shows plenty of sky: nothing moves
    expect(themedSkyLift(520)).toBe(0);
    // never so far that the top of the 780 lu tall sky could show
    expect(themedSkyLift(40)).toBeLessThanOrEqual(120);
  });

  it('the provider resolves a skin through the manifest; an unknown one warns once and stays classic', () => {
    const warns: string[] = [];
    const art = createArtProvider({ warn: (m) => warns.push(m), dpr: 1 });
    const state = (d: unknown) => (d as { state: { skins: { left?: string; right?: string } } }).state;
    const a = art.createBackdrop({ left: 'stone', right: 'future', arena: 'tar_pits', skins: { left: 'backdrop.winterfall', right: null } });
    expect(state(a).skins).toEqual({ left: 'backdrop.winterfall' });
    const b = art.createBackdrop({ left: 'stone', right: 'future', arena: 'tar_pits', skins: { left: 'backdrop.nope' } });
    expect(state(b).skins).toEqual({});
    expect(warns.filter((w) => w.includes('backdrop skin "nope"'))).toHaveLength(1);
    // a provider without skins (the contract's optional field) still draws the classic backdrop
    expect(state(art.createBackdrop({ left: 'stone', right: 'future', arena: 'tar_pits' })).skins).toEqual({});
    a.destroy();
    b.destroy();
  });

  it('distant lightning never flashes with Reduce motion', () => {
    const art = createArtProvider({ warn: () => {}, dpr: 1 });
    const run = (reduce: boolean): number => {
      const w = new BackdropWeatherLayer(art.procedural.baker, 'high', { next: () => 0.5 });
      w.setTheme(0, BACKDROP_THEMES['thunderstorm']!);
      w.setMotion({ reduce, lite: false });
      let most = 0;
      for (let i = 0; i < 400; i++) {
        w.update(50, { left: 0, width: 1400, above: 500, seam: 1000 });
        most = Math.max(most, w.flashCount);
      }
      w.destroy();
      return most;
    };
    expect(run(false)).toBeGreaterThan(0);
    expect(run(true)).toBe(0);
  });

  it('a drop that runs out waits in the layer for the next one, so the backdrop keeps its structure (review 1)', () => {
    // adding or removing a child makes the backdrop's render group rebuild its instruction set
    // (a baker that always has a picture: without a canvas the real one bakes none, and no drop spawns)
    const baker = { get: () => ({ main: Texture.WHITE, origin: { x: -8, y: -8 } }), flush: () => undefined } as unknown as PartBaker;
    const w = new BackdropWeatherLayer(baker, 'high', { next: () => 0.5 });
    w.setTheme(0, BACKDROP_THEMES['winterfall']!);
    const view = { left: 0, width: 1400, above: 500, seam: 1000 };
    // 20 s: the first flakes have run their life and come back as new ones
    for (let i = 0; i < 400; i++) w.update(50, view);
    expect(w.count).toBeGreaterThan(0);
    expect(w.spareCount).toBeGreaterThan(0);
    let changed = 0;
    w.root.on('childAdded', () => changed++);
    w.root.on('childRemoved', () => changed++);
    for (let i = 0; i < 200; i++) w.update(50, view);
    expect(changed).toBe(0);
    expect(w.root.children.length).toBe(w.count + w.spareCount);
    expect(w.root.children.length).toBeLessThanOrEqual(90);
    w.destroy();
  });
});
