# Requests (Track A → Track C, orchestrator): scene pictures, one test, a sandbox switch

**From:** Track A (backdrops), round 1, 2026-10-08. **To:** Track C (owner of `src/visuals/cosmetics/art.ts`, `src/ui/components/cosmeticArt.tsx`, `src/meta/test/cosmetics.test.ts`) and the orchestrator (owner of `src/dev/sandbox/viewBattle.tsx`).

What landed on Track A's side this round (PLAN 2b):

- Layer format v2 (`src/visuals/backdrops/scenes.ts`, `sceneSprites.ts`) with format 1 still read. Blender classics in format 2 for Bronze ("Hill Temples"), Industrial ("Iron Valley") and Cosmic ("Crystal Moon Base") under `public/art/backdrops/<age>/classic/`; the other five ages keep their format 1 classic until round 3.
- A `thumb.webp` (320 x 180) for every age's classic scene: `cosmeticImageUrl('scene.classic', { age, thumb: true })` is now a static URL (`art/backdrops/<age>[/classic]/thumb.webp`), never a canvas.
- Customize stills (`backdrop.<id>` with `{ age, scene? }`, `scene.<id>` with `{ age, sky }`) are composed from the Blender strips the lane draws, not from the code painters, so the preview matches the lane.
- `src/content/raw/scenes.ts`: the 16 scene rows (2 per age), all `released: false` until round 2, with names in `scenes.en.json`.

## 1. Track C: ask again when a still gets better (`art.ts`, `cosmeticArt.tsx`)

The strips stream in on first use (PLAN 2b "browsed in Customize"). Until they arrive, a still for a scene age is the age's code-painted stand-in (classic) or null (another scene), and `backdropPreview.ts` re-composes it in the background once the images land, one per frame. `useBackdropStill` keeps its first answer until something else re-renders, so the first time a player opens Backdrops on Bronze, Industrial or Cosmic, the big preview shows the old painted look instead of the lane.

`backdropPreview.ts` exports `onBackdropPicturesChanged(cb): () => void` (unsubscribe). It fires after each re-composed still; `cosmeticImageUrl(key, { ...opts, cached: true })` then returns the final picture.

Checked on the dev screens page (`#screens/customize-backdrops/mid/1280x720`): the first visit to Bronze or Cosmic shows the old painted look (a stepped pyramid for Bronze, plain spires for Cosmic) in the big preview and in every sky tile; after any re-render (switch to another age and back) the same preview and tiles show the Blender scene the lane draws (the acropolis, the volcano and the sun for Bronze). Only the re-render is missing.

Suggested change (any equivalent is fine):

```ts
// src/visuals/cosmetics/art.ts
export { onBackdropPicturesChanged as onCosmeticPicturesChanged } from './backdropPreview';
```

```tsx
// src/ui/components/cosmeticArt.tsx
export type CosmeticPicturesChanged = (cb: () => void) => () => void;
export const CosmeticPicturesContext = createContext<CosmeticPicturesChanged | null>(null);

function useBackdropStill(fn, key, age, thumb, keepLast) {
  const onChange = useContext(CosmeticPicturesContext);
  const [, bump] = useState(0);
  useEffect(() => (onChange ? onChange(() => bump((n) => n + 1)) : undefined), [onChange]);
  // ...unchanged: `ready = fn(key, { ...opts, cached: true })` now picks up the final still on the bump
}
```

Then provide it next to `CosmeticArtContext` in `src/app/ui/AppRoot.tsx` and `src/dev/screens/page.tsx`: `<CosmeticPicturesContext.Provider value={onCosmeticPicturesChanged}>`.

Tile stills are painted one per frame by your queue as today; the callback only re-renders mounted stills, and the re-composition is already spread one per frame on my side.

## 2. Track C: `src/meta/test/cosmetics.test.ts:307`

`'rejects unknown keys and other collections'` uses `scene.glacier_valley` against the real content (`C`) as a key outside the content. Since the 16 rows are in (`released: false`), `equipCosmetic` answers `'unreleased'` there, so the test fails. Please use an id that does not exist (`'scene.atlantis'` is already used with `T`), or expect `{ ok: false, reason: 'unreleased' }` until round 2 releases the scenes.

## 3. Orchestrator: `&scene=<id>` in the battle sandbox (`src/dev/sandbox/viewBattle.tsx`)

For the round 2 review of the 16 scenes in a real battle (half, seam, evolve wipe, three skies), the sandbox needs a scene switch like `&backdrop=`. Suggested, next to the `bd` wrapper at line 168:

```ts
// `&scene=<id>` puts a scene (PLAN 2b) on your half for screenshots: `&scene=aegean_harbour`
const sc = new URLSearchParams(window.location.search).get('scene');
const sceneAge = sc ? content.cosmetics.collections.items.find((x) => x.collection === 'scene' && x.id === sc)?.age : undefined;
// in the createBackdrop wrapper:
//   scenes: { left: sceneAge ? { ...(b.scenes?.left ?? {}), [sceneAge]: `scene.${sc}` } : b.scenes?.left, right: b.scenes?.right }
```

(Both `&backdrop=` and `&scene=` can share one wrapper. Unreleased scenes are fine here: the sandbox is dev only.)

## 4. Optional, round 2 (orchestrator or Track B): warm the scene strips during VS

A battle loads the starting age's scene strips when the lane is built (about 70-90 KB per Blender scene, lazily; the painted layers show until they arrive and the strips fade in over 300 ms). VS lasts about 3 s, so a prefetch then would make the first frame already show the scene. `ProceduralBackdropView`'s textures already have `prefetch(ages, arenas, scenes)`; exposing it needs a small provider entry (B owns `provider.ts`). Not needed for round 1.
