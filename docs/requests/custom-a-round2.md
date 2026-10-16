# Requests (Track A → Track C, final agent): round 2 scenes are released

**From:** Track A (backdrops), round 2, 2026-10-09. **To:** Track C (owner of `src/meta/test/cosmetics.test.ts`, `src/visuals/cosmetics/art.ts`, `src/ui/components/cosmeticArt.tsx`) and the round 2 final agent.

What landed on Track A's side: the first new scene of every age, each in layer format 2 with its own sky, back, far and mid strips, a props atlas with moving props, night lights, a tuned `skyGrade` and a thumbnail, all within the 110 KB budget and the colour rule (`art/blender/world/scenes/checks.json`). They are **released** in `src/content/raw/scenes.ts` (`released: true`): Glacier Valley (Stone), Aegean Harbour (Bronze), Misty Moor (Medieval), Treasure Cove (Gunpowder), Viaduct Gorge (Industrial), Desert Airbase (Modern), Skyway Metropolis (Future) and Ringed Giant (Cosmic; `celestial: 'own'`, `weather: 'space'`). All eight are Rare Time Capsule items, so the capsule pool's Rare count grows by 8 (31 → 39); the rates are unchanged. The other eight scenes stay `released: false` until round 3.

## 1. Track C: `src/meta/test/cosmetics.test.ts:363-364` (fails since the release)

**Status: done (Track C, round 2).** The test now compares with what has shipped: the held-back scenes add nothing to `collectionProgress` or `collectionItems`, and none of their keys is listed (an equivalent of the suggestion below).

`the release gate (PLAN 2e) › never grants, crafts, equips, counts or shows one` adds three unreleased test scenes to the real content (`T = withItems(...hidden)`) and expects

```ts
expect(collectionProgress(owning, T).scene).toEqual({ owned: 0, total: 0 });
expect(collectionItems(T, 'scene')).toEqual([]);
```

which assumed the real content had no released scene. With the eight released scenes it reads `{ owned: 0, total: 8 }`. The point of the test (the held-back items add nothing) still holds; suggested:

```ts
expect(collectionProgress(owning, T).scene).toEqual(collectionProgress(owning, C).scene);
expect(collectionItems(T, 'scene')).toEqual(collectionItems(C, 'scene'));
expect(collectionItems(T, 'scene').some((x) => keys.includes(cosmeticKey(x)))).toBe(false);
```

## 2. Track C: the Customize weather preview over space scenes (your round 2 item 3)

**Status: done (Track C, round 2).** `art.ts` `isSpaceScene` now reads Track A's table (`backdrops/scenePreview` `isSpaceScene`) and the `fx` layer of a sky is `backdropWeatherSvg(key, animate, { space })`; Track C's own space motes are gone. Test: `src/visuals/test/cosmetics.test.ts` (routing).

`backdropWeatherSvg(key, animate, o?: { space?: boolean })` (`src/visuals/cosmetics/backdropPreview.ts`) now turns a sky's weather into the lane's space weather when `o.space` is true (snow → ice motes, rain → rare streaks without the lightning flash, petals and leaves → sparkles), so the preview never snows over space. Whether a scene is in space is known at once, before any file loads: `isSpaceScene(age, sceneKey)` (`src/visuals/backdrops/scenes.ts`, re-exported from `backdrops/scenePreview.ts`; `scene.<id>`, a bare id or null for the classic; a unit test holds its table to the shipped `layers.json` hints). Today that is Cosmic's classic and Ringed Giant (and any Cosmic scene without art, which draws the classic).

Suggested wiring in `art.ts` (any equivalent is fine):

```ts
import { hasSceneArt, isSpaceScene, scenePreviewUrl } from '../backdrops/scenePreview';
// in cosmeticSvg():
if (o.layer === 'fx' && k.collection === 'backdrop') return backdropWeatherSvg(key, o.animate ?? true, { space: o.age ? isSpaceScene(o.age, o.scene ?? null) : false });
```

(`CosmeticSvgOptions` would need `age` and `scene` there, as `CosmeticImageOptions` has; the Backdrops tab passes the age it shows and that age's equipped scene.)

## 3. Final agent: gates to rerun

**Status: done (round 2 final, 2026-10-16).** Rerun on the final tree, where six of the eight round 2 scenes ship (Glacier Valley and Desert Airbase wait for round 3, so the Rare pool grows by 6): `sim:drops --mode smoke` 17 pass, 0 fail; `sim:economy` 23 pass, 1 fail (the Focused War Plan at L7 row, open since before this build), Dust 483 a day (gate 470 ± 20%).

The release changes the capsule pool (Rare +8), so `npm run sim:drops -- --mode smoke --out <scratch>` and `npm run sim:economy` (Dust a day) should be rerun on the final tree; nothing else in the rates or tables changed.
