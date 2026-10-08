/**
 * The cosmetic art router (DESIGN A18.9.4, A14.4 `cosmetic.<collection>.<id>`; PLAN 2f interface 2):
 * every released collection item in the content has art, the SVG output is well formed, emotes animate
 * unless told not to, unknown keys draw nothing, and each key routes to the module of the track that
 * draws it. Owned by Track C; each track's own art has its own file (`cosmetics.<area>.test.ts`).
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { COSMETIC_COLLECTIONS, cosmeticImageUrl, cosmeticSvg, hasCosmeticArt, parseCosmeticKey } from '../cosmetics/art';

// The General's wardrobe (collection `avatar`) is drawn by the UI's avatar renderer, not by the visuals.
const released = content.cosmetics.collections.items.filter((x) => x.collection !== 'avatar' && x.released !== false);
/** Collections drawn as SVG only (no picture tier yet): every item must give one. */
const SVG_ONLY = new Set(['emote', 'quote', 'baseFlag', 'backdrop']);

/** Tag balance of a small SVG string (no DOM in Node). */
function balanced(svg: string): boolean {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, close, name, self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name!);
  }
  return stack.length === 0;
}

describe('cosmetic art', () => {
  it('knows every content collection', () => {
    for (const x of content.cosmetics.collections.items) expect(COSMETIC_COLLECTIONS as readonly string[], x.collection).toContain(x.collection);
  });

  it('draws every released collection item in the content', () => {
    const missing = released.filter((x) => !hasCosmeticArt(x.collection, x.id)).map((x) => x.art);
    expect(missing).toEqual([]);
  });

  it('gives every SVG-drawn item a well-formed SVG', () => {
    for (const x of released) {
      const svg = cosmeticSvg(`${x.collection}.${x.id}`);
      if (SVG_ONLY.has(x.collection)) expect(svg, x.art).not.toBeNull();
      if (svg === null) continue;
      expect(svg, x.art).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-\d. ]+"/);
      expect(balanced(svg), x.art).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });

  it('animates emotes unless motion is off, and never otherwise', () => {
    const key = 'emote.supernova';
    expect(cosmeticSvg(key)).toContain('<animateTransform');
    expect(cosmeticSvg(key, { animate: false })).not.toContain('<animate');
    expect(cosmeticSvg('nationalFlag.dk')).not.toContain('<animate');
  });

  it('returns null for unknown keys and caches image URLs', () => {
    expect(cosmeticSvg('nationalFlag.nowhere')).toBeNull();
    expect(cosmeticSvg('banana.split')).toBeNull();
    expect(parseCosmeticKey('nationalFlag.gb_eng')).toEqual({ collection: 'nationalFlag', id: 'gb_eng' });
    expect(parseCosmeticKey('scene.glacier_valley')).toEqual({ collection: 'scene', id: 'glacier_valley' });
    const a = cosmeticImageUrl('decoration.fern');
    expect(a).toMatch(/^data:image\/svg\+xml/);
    expect(cosmeticImageUrl('decoration.fern')).toBe(a);
  });
});

describe('routing (PLAN 2f interface 2)', () => {
  it('scenes and skies over scenes are pictures from Track A (none without a DOM)', () => {
    expect(cosmeticSvg('scene.classic')).toBeNull();
    expect(cosmeticImageUrl('scene.classic', { age: 'stone', thumb: true })).toBeNull();
    expect(cosmeticImageUrl('scene.classic', { age: 'medieval', sky: 'backdrop.winterfall', cached: true })).toBeNull();
    // a sky over a scene without art: no still, and the sky's emblem stands in where a still may be painted
    expect(cosmeticImageUrl('backdrop.winterfall', { age: 'stone', scene: 'scene.nowhere', cached: true })).toBeNull();
    expect(cosmeticImageUrl('backdrop.winterfall', { age: 'stone', scene: 'scene.nowhere' })).toMatch(/^data:image\/svg\+xml/);
    expect(hasCosmeticArt('scene', 'classic')).toBe(true);
  });

  it('a base skin model thumbnail comes from Track B (none yet), never as SVG', () => {
    expect(cosmeticSvg('baseSkin.frost_cave', { layer: 'thumb' })).toBeNull();
    expect(cosmeticImageUrl('baseSkin.frost_cave', { layer: 'thumb' })).toBeNull();
    expect(cosmeticImageUrl('decoration.fern', { layer: 'thumb' })).toBeNull();
  });

  it('flags and props fall back to their SVG while the vendored art and the Blender props are not in', () => {
    expect(cosmeticImageUrl('nationalFlag.dk', { size: 'tile' })).toMatch(/^data:image\/svg\+xml/);
    expect(cosmeticImageUrl('nationalFlag.dk', { size: 'big' })).toMatch(/^data:image\/svg\+xml/);
    expect(cosmeticImageUrl('decoration.fern', { hd: true })).toMatch(/^data:image\/svg\+xml/);
  });
});
