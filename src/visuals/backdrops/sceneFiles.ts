/**
 * One download per backdrop scene file (review 1). The Customize and VS stills
 * (`cosmetics/backdropPreview.ts`) and the lane's textures (`adapters/procedural/backdropView.ts`) read a
 * scene's `layers.json`, strips, props atlas and the arena grounds through these caches, so a still and a
 * battle (or VS's warm-up of the battle next to VS's own still) never fetch the same file twice, not even
 * while both are in flight. A failed file is forgotten, so the next ask tries again. Images decode off the
 * main thread where the browser can (`decode()`), before anything draws them.
 */
import { imageLedger } from '../textureMemory';

const jsons = new Map<string, Promise<unknown>>();
const images = new Map<string, Promise<HTMLImageElement>>();
/** The decoded scene images this cache holds (the memory hook, `textureMemory.ts`). */
const ledger = imageLedger('sceneImages');

/** A scene's JSON file (`layers.json`), fetched once. */
export function sceneJson(url: string): Promise<unknown> {
  let p = jsons.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json() as Promise<unknown>;
    });
    jsons.set(url, p);
    p.catch(() => jsons.delete(url));
  }
  return p;
}

/** A scene's image (a strip, the props atlas, a ground), loaded and decoded once. */
export function sceneImage(url: string): Promise<HTMLImageElement> {
  let p = images.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => {
        const decoded = typeof im.decode === 'function' ? im.decode().catch(() => undefined) : Promise.resolve();
        void decoded.then(() => {
          ledger.set(url, im);
          resolve(im);
        });
      };
      im.onerror = () => reject(new Error(`image ${url} failed to load`));
      im.src = url;
    });
    images.set(url, p);
    p.catch(() => images.delete(url));
  }
  return p;
}
