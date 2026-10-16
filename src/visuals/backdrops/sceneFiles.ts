/**
 * One download per backdrop scene file (review 1). The Customize and VS stills
 * (`cosmetics/backdropPreview.ts`) and the lane's textures (`adapters/procedural/backdropView.ts`) read a
 * scene's `layers.json`, strips, props atlas and the arena grounds through these caches, so a still and a
 * battle (or VS's warm-up of the battle next to VS's own still) never fetch the same file twice, not even
 * while both are in flight. A failed file is forgotten, so the next ask tries again. Images decode off the
 * main thread where the browser can (`decode()`), before anything draws them.
 *
 * The decoded images are let go of when a match starts (review 2, Safari memory: browsing every age in
 * Customize left about 140 MB of strips and grounds decoded for the rest of the session, and a battle
 * right after went over the iPhone budget): `forgetSceneImages` drops what the match does not open with,
 * and a forgotten file downloads (from the HTTP cache) and decodes again when something asks for it.
 */
import { imageLedger } from '../textureMemory';

const jsons = new Map<string, Promise<unknown>>();
const images = new Map<string, Promise<HTMLImageElement>>();
/** The decoded scene images this cache holds (the memory hook, `textureMemory.ts`). */
const ledger = imageLedger('sceneImages');
const forgetListeners = new Set<(urls: ReadonlySet<string>) => void>();

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
  const hit = images.get(url);
  if (hit) return hit;
  const load = new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      const decoded = typeof im.decode === 'function' ? im.decode().catch(() => undefined) : Promise.resolve();
      void decoded.then(() => {
        // counted while this cache keeps it: a load `forgetSceneImages` dropped mid-flight still resolves
        // for whoever awaits it, but nothing here holds it any more
        if (images.get(url) === load) ledger.set(url, im);
        resolve(im);
      });
    };
    im.onerror = () => reject(new Error(`image ${url} failed to load`));
    im.src = url;
  });
  images.set(url, load);
  load.catch(() => {
    if (images.get(url) === load) images.delete(url);
  });
  return load;
}

/** The scene images this cache holds or is loading (tests, the dev overlay). */
export function sceneImageUrls(): string[] {
  return [...images.keys()];
}

/**
 * Lets go of every scene image `keep` does not want (review 2): the cache forgets it and its decoded
 * copy goes with the last reference. A load still in flight resolves for whoever awaits it, unkept.
 * Listeners (`onSceneImagesForgotten`) drop what they built on the forgotten images. Returns the URLs
 * forgotten.
 */
export function forgetSceneImages(keep: (url: string) => boolean): ReadonlySet<string> {
  const gone = new Set<string>();
  for (const url of [...images.keys()]) {
    if (keep(url)) continue;
    images.delete(url);
    ledger.delete(url);
    gone.add(url);
  }
  if (gone.size > 0) for (const cb of [...forgetListeners]) cb(gone);
  return gone;
}

/** Calls `cb` with the URLs each `forgetSceneImages` dropped. Returns the unsubscribe function. */
export function onSceneImagesForgotten(cb: (urls: ReadonlySet<string>) => void): () => void {
  forgetListeners.add(cb);
  return () => forgetListeners.delete(cb);
}

/**
 * True when `url` is a file directly in the scene folder `dir` (both base-relative or both absolute). A
 * classic scene's folder can be its age's folder (`art/backdrops/stone/`), which holds the other scenes'
 * folders, so a prefix alone is not enough.
 */
export function inSceneDir(url: string, dir: string): boolean {
  return url.startsWith(dir) && !url.slice(dir.length).includes('/');
}
