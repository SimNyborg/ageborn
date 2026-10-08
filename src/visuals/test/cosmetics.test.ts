/**
 * The cosmetic art router (DESIGN A18.9.4, A14.4 `cosmetic.<collection>.<id>`; PLAN 2f interface 2):
 * every released collection item in the content has art, the SVG output is well formed, emotes animate
 * unless told not to, unknown keys draw nothing, and each key routes to the module of the track that
 * draws it. Owned by Track C; each track's own art has its own file (`cosmetics.<area>.test.ts`).
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { COSMETIC_COLLECTIONS, cosmeticImageUrl, cosmeticSvg, hasCosmeticArt, parseCosmeticKey } from '../cosmetics/art';
import { decorationArtUrl } from '../cosmetics/decorations';
import { nationalFlagUrl } from '../cosmetics/nationalFlags';

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

  it("flags and props show Track D's and Track B's pictures when they have one, else their SVG", () => {
    for (const size of ['tile', 'big'] as const) {
      const own = nationalFlagUrl('dk', size);
      if (own) expect(cosmeticImageUrl('nationalFlag.dk', { size })).toBe(own);
      else expect(cosmeticImageUrl('nationalFlag.dk', { size })).toMatch(/^data:image\/svg\+xml/);
    }
    // every national flag picture is the vendored one, with or without a size (the big SVG by default),
    // so VS, Customize and the ranked "player found" never show a blank or a second design of a flag
    expect(nationalFlagUrl('dk', 'big')).toMatch(/art\/flags\/svg\/dk\.svg$/);
    expect(cosmeticImageUrl('nationalFlag.dk')).toBe(nationalFlagUrl('dk', 'big'));
    expect(cosmeticImageUrl('nationalFlag.br')).toBe(nationalFlagUrl('br', 'big'));
    // the hand-drawn design is only the markup fallback; an unknown flag has no picture
    expect(cosmeticSvg('nationalFlag.dk')).toMatch(/^<svg/);
    expect(cosmeticImageUrl('nationalFlag.nowhere')).toBeNull();
    const prop = decorationArtUrl('fern', { hd: true });
    if (prop) expect(cosmeticImageUrl('decoration.fern', { hd: true })).toBe(prop);
    else expect(cosmeticImageUrl('decoration.fern', { hd: true })).toMatch(/^data:image\/svg\+xml/);
  });

  it('base flags draw on their pole only when asked, and sweep the Legendary glint only with motion on', () => {
    expect(cosmeticSvg('baseFlag.ember', { pole: true })).not.toBe(cosmeticSvg('baseFlag.ember'));
    expect(cosmeticSvg('baseFlag.ember')).toMatch(/viewBox="-2 -2 64 44"/);
    expect(cosmeticSvg('baseFlag.wyvern')).toContain('<animateTransform');
    expect(cosmeticSvg('baseFlag.wyvern', { animate: false })).not.toContain('<animate');
    expect(cosmeticSvg('baseFlag.ember')).not.toContain('<animate');
    expect(cosmeticImageUrl('baseFlag.ember', { pole: true })).not.toBe(cosmeticImageUrl('baseFlag.ember'));
  });
});
