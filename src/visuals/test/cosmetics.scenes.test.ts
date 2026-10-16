/**
 * Scenes in the visuals (PLAN 2b; `backdrops/scenePreview.ts`): every released scene has art, `scene.classic`
 * is every age's classic scene, and the screens' pictures route here. Owned by Track A.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { hasSceneArt, sceneIdOf, scenePreviewUrl } from '../backdrops/scenePreview';
import { cosmeticImageUrl, hasCosmeticArt, isSpaceScene, skyTileAge } from '../cosmetics/art';

const scenes = content.cosmetics.collections.items.filter((x) => x.collection === 'scene' && x.released !== false);

describe('scenes', () => {
  it('draws every released scene of the content, and the classic scene of every age', () => {
    for (const x of scenes) expect(hasSceneArt(x.id) && hasCosmeticArt('scene', x.id), x.id).toBe(true);
    expect(hasSceneArt('classic')).toBe(true);
  });

  it('reads scene keys', () => {
    expect(sceneIdOf(null)).toBe('classic');
    expect(sceneIdOf('scene.classic')).toBe('classic');
    expect(sceneIdOf('scene.glacier_valley')).toBe('glacier_valley');
    expect(sceneIdOf('backdrop.winterfall')).toBeNull();
  });

  it('paints nothing without a DOM (the screens show their placeholder)', () => {
    for (const age of content.order.ages) {
      expect(scenePreviewUrl(null, age, { thumb: true })).toBeNull();
      expect(cosmeticImageUrl('scene.classic', { age, sky: 'backdrop.winterfall' })).toBeNull();
    }
    expect(scenePreviewUrl('scene.not_a_scene', 'stone')).toBeNull();
  });
});

describe('sky tiles over a space scene (review 2)', () => {
  it('show the sky over the nearest earlier age with a sky of its own (Cosmic keeps its own sky)', () => {
    expect(isSpaceScene('cosmic', null)).toBe(true);
    expect(isSpaceScene('cosmic', 'scene.ringed_giant')).toBe(true);
    expect(skyTileAge('cosmic')).toBe('future');
    expect(isSpaceScene('future', null)).toBe(false);
    expect(skyTileAge('stone')).toBe('stone');
  });
});
