/**
 * Scene pictures for the screens (PLAN 2b, 2f interface 2). Owned by Track A.
 *
 * `cosmeticImageUrl` (`cosmetics/art.ts`) routes here:
 * - `scene.<id>` with `{ age, thumb: true }`: the scene's pre-rendered thumbnail (`thumb.webp`, 320 x 180,
 *   rendered with the scene by art/blender/world/backdrop.py; a static file the browser loads lazily);
 * - `scene.<id>` with `{ age, sky }`: a still of the player's half with the sky (`backdrop.<id>`, or null for
 *   none) applied, composed from the scene's Blender strips (`cosmetics/backdropPreview.ts`);
 * - `backdrop.<id>` with `{ age, scene }`: the same still, the sky over that scene.
 * `scene.classic` (or a null key) is the age's classic scene, which is not an item. A scene without art
 * returns null and the screens keep their placeholder. Same `cachedOnly` rule as the backdrop stills:
 * only a still already composed, else null. Without a DOM (tests) everything is null.
 */
import type { AgeId } from '@/contracts/ids';
import { backdropPreviewUrl } from '../cosmetics/backdropPreview';
import { SCENE_ART, sceneFormat, sceneThumbPath } from './scenes';

/** What a scene picture is: a tile thumbnail, or a still with a sky applied. */
export interface ScenePictureOptions {
  /** The small picture for a collection tile. */
  thumb?: boolean;
  /** The sky that grades the still (`backdrop.<id>`); null or absent is the scene's own daylight. */
  sky?: string | null;
  /** Only a still already painted, else null (the screens paint one per frame). */
  cachedOnly?: boolean;
}

/** The scene id of a `scene.<id>` key (`classic` for a null key or `scene.classic`), or null for another key. */
export function sceneIdOf(key: string | null): string | null {
  if (key === null) return 'classic';
  return key.startsWith('scene.') ? key.slice('scene.'.length) : null;
}

/** True when the visuals can draw `scene.<id>` in some age (`classic` is every age's classic scene). */
export function hasSceneArt(id: string): boolean {
  return Object.values(SCENE_ART).some((m) => m[id] !== undefined);
}

function appBaseUrl(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

/** A scene's picture for `age`'s half of the lane (see the module note), or null when there is none yet. */
export function scenePreviewUrl(key: string | null, age: AgeId, o: ScenePictureOptions = {}): string | null {
  const id = sceneIdOf(key);
  if (id === null || typeof document === 'undefined' || !sceneFormat(age, id)) return null;
  if (o.thumb && !o.sky) {
    const path = sceneThumbPath(age, id);
    return path ? appBaseUrl() + path : null;
  }
  return backdropPreviewUrl(o.sky ?? null, age, { thumb: !!o.thumb, cachedOnly: !!o.cachedOnly, scene: id });
}
