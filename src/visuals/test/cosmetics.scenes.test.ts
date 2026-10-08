/**
 * Scenes in the visuals (PLAN 2b; `backdrops/scenePreview.ts`): every released scene has art, `scene.classic`
 * is every age's classic scene, and the screens' pictures route here. Owned by Track A.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { hasSceneArt, sceneIdOf, scenePreviewUrl } from '../backdrops/scenePreview';
import { cosmeticImageUrl, hasCosmeticArt } from '../cosmetics/art';

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
