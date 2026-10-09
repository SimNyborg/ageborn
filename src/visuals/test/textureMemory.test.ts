/**
 * The decoded image memory the `?dev=1` hook and the e2e budget read (G7): uploaded textures count on the
 * GPU, live decoded resources on the CPU (a closed ImageBitmap counts nothing), a resource shared by a
 * texture and an art cache counts once, and the ledgers say what each cache holds.
 */
import { ImageSource } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { imageLedger, resourceBytes, textureMemory, trackSource } from '../textureMemory';

class FakeBitmap {
  constructor(
    public width: number,
    public height: number,
  ) {}
  close(): void {
    this.width = 0;
    this.height = 0;
  }
}
class FakeImage {
  complete = true;
  src = 'http://x/strip.webp';
  constructor(
    public naturalWidth: number,
    public naturalHeight: number,
  ) {}
}

const g = globalThis as unknown as { ImageBitmap?: unknown; HTMLImageElement?: unknown };
const had = { bitmap: g.ImageBitmap, image: g.HTMLImageElement };
beforeAll(() => {
  g.ImageBitmap = FakeBitmap;
  g.HTMLImageElement = FakeImage;
});
afterAll(() => {
  g.ImageBitmap = had.bitmap;
  g.HTMLImageElement = had.image;
});

describe('textureMemory (G7)', () => {
  it('counts GPU textures, live CPU copies once each, and nothing for a closed bitmap', () => {
    const uploaded = new ImageSource({ resource: new FakeBitmap(100, 50) as unknown as ImageBitmap, label: 'a' });
    const loaded = new ImageSource({ resource: new FakeBitmap(10, 10) as unknown as ImageBitmap, label: 'b' });
    const released = new ImageSource({ resource: new FakeBitmap(20, 20) as unknown as ImageBitmap, label: 'c' });
    (released.resource as unknown as FakeBitmap).close();
    trackSource(loaded);
    trackSource(released);
    // a scene strip both cached and drawn: one decoded copy
    const strip = new FakeImage(30, 10);
    imageLedger('test-cache').set('strip', strip as unknown as HTMLImageElement);
    const drawn = new ImageSource({ resource: strip as unknown as HTMLImageElement, label: 'd' });
    const renderer = { texture: { managedTextures: [uploaded, released, drawn, null] } };
    const m = textureMemory(renderer);
    expect(m.gpu).toBe(100 * 50 * 4 + 20 * 20 * 4 + 30 * 10 * 4);
    expect(m.cpu).toBe(100 * 50 * 4 + 10 * 10 * 4 + 30 * 10 * 4);
    expect(m.total).toBe(m.cpu + m.gpu);
    expect(m.caches['test-cache']).toEqual({ images: 1, bytes: 0 });
    // a destroyed source drops out
    loaded.destroy();
    expect(textureMemory(renderer).cpu).toBe(100 * 50 * 4 + 30 * 10 * 4);
    imageLedger('test-cache').delete('strip');
  });

  it('resourceBytes reads bitmaps, images, canvases and typed arrays', () => {
    expect(resourceBytes(new FakeBitmap(4, 4))).toBe(64);
    expect(resourceBytes(new FakeImage(2, 3))).toBe(24);
    expect(resourceBytes(new Uint8Array(10))).toBe(10);
    expect(resourceBytes(null)).toBe(0);
    expect(resourceBytes({ width: 5 })).toBe(0);
  });
});
