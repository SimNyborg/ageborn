/**
 * Scene pictures for the screens (PLAN 2b, 2f interface 2). Owned by Track A.
 *
 * `cosmeticImageUrl` (`cosmetics/art.ts`) routes here:
 * - `scene.<id>` with `{ age, thumb: true }`: the scene's thumbnail (`public/art/backdrops/<age>/<id>/thumb.webp`);
 * - `scene.<id>` with `{ age, sky }`: a still of the player's half with the sky (`backdrop.<id>`, or null for
 *   none) applied, from the scene's Blender images;
 * - `backdrop.<id>` with `{ age, scene }`: the same still, the sky over that scene.
 * `scene.classic` (or a null key) is the age's classic scene, which is not an item.
 *
 * C0 (2026-10-08) landed these signatures with the classic scene only: today's painted classic still
 * with the sky applied (`backdropPreviewUrl`, the same picture Customize shows now). A scene without art
 * returns null and the screens keep their placeholder. Track A replaces the body with the scene stills
 * and thumbnails (and the switch from the code painters to the Blender images in `backdropPreview`).
 * Same `cachedOnly` rule as the backdrop stills: only a still already painted, else null.
 */
import type { AgeId } from '@/contracts/ids';
import { backdropPreviewUrl } from '../cosmetics/backdropPreview';

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

/** True when the visuals can draw `scene.<id>` (`classic` is every age's classic scene). */
export function hasSceneArt(id: string): boolean {
  return id === 'classic';
}

/** A scene's picture for `age`'s half of the lane (see the module note), or null when there is none yet. */
export function scenePreviewUrl(key: string | null, age: AgeId, o: ScenePictureOptions = {}): string | null {
  if (sceneIdOf(key) !== 'classic') return null;
  return backdropPreviewUrl(o.sky ?? null, age, { thumb: !!o.thumb, cachedOnly: !!o.cachedOnly });
}
