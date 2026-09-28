import { BufferImageSource, Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { ProceduralBackdropView, type BackdropTextures } from '../adapters/procedural/backdropView';
import { PartBaker } from '../bake';

describe('procedural backdrop teardown', () => {
  it('releases its strip textures from the cached layer sources on destroy (no leak per battle)', () => {
    // The layer canvases are cached across battles; the strip textures of one view must not stay
    // registered on them (Phase 2a soak: ~320 sprites and textures leaked per battle).
    const source = new BufferImageSource({ resource: new Uint8Array(64 * 4), width: 64, height: 1 });
    const painted = { tex: new Texture({ source }), ambient: [] };
    const textures = { layer: () => painted, ground: () => ({ tex: Texture.EMPTY, ambient: [] }), prefetch: () => undefined, version: 0 } as unknown as BackdropTextures;
    const before = source.listenerCount('resize');
    for (let i = 0; i < 3; i++) {
      const view = new ProceduralBackdropView({
        left: 'stone',
        right: 'medieval',
        arena: 'tar_pits',
        textures,
        baker: new PartBaker({ pxPerLu: 1, canvasFactory: () => null }),
        quality: 'high',
        seed: 1,
      });
      view.update(16);
      expect(source.listenerCount('resize')).toBeGreaterThan(before);
      view.destroy();
      expect(source.listenerCount('resize')).toBe(before);
    }
  });
});
