/**
 * Base decorations (DESIGN A18.9.4; PLAN 2a "Decorations"): every released decoration has art, the SVG is
 * well formed, and the prop picture hook (the Blender props) falls back to the SVG until it is in. Owned
 * by Track B.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { cosmeticImageUrl, hasCosmeticArt } from '../cosmetics/art';
import { decorationArtUrl, decorationSvg, hasDecorationArt } from '../cosmetics/decorations';

const decorations = content.cosmetics.collections.items.filter((x) => x.collection === 'decoration' && x.released !== false);

describe('decorations', () => {
  it('draws every released decoration of the content', () => {
    expect(decorations.length).toBeGreaterThanOrEqual(20);
    for (const x of decorations) expect(hasDecorationArt(x.id) && hasCosmeticArt('decoration', x.id), x.id).toBe(true);
  });

  it('gives a well-formed SVG in the 48 x 64 box', () => {
    for (const x of decorations) expect(decorationSvg(x.id, { team: 0x2f7df6 }), x.id).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 48 64">/);
  });

  it('has no prop picture until the Blender props are in: the screens get the SVG', () => {
    expect(decorationArtUrl('fern')).toBeNull();
    expect(decorationArtUrl('fern', { hd: true })).toBeNull();
    expect(cosmeticImageUrl('decoration.fern', { hd: true })).toMatch(/^data:image\/svg\+xml/);
  });
});
