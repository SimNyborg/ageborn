# Requests (Track C → the orchestrator / round's final agent): two small lines in files without a track owner

**From:** Track C (Customize item detail), round 1, 2026-10-08.

## 1. The quote bubble's speaker on the HUD wheel type (`src/ui/hud/context.ts`)

PLAN 2a "Quotes": a quote now shows in the battle speech bubble with the speaker's General head and its rarity edge (Rare teal with rivets, Epic violet with a laurel, Legendary gold scroll with a glint and an aura). The app already passes your General with the wheel (`src/app/cosmetics.ts emoteWheelOf(...).speaker`, an `AvatarSpec`), and `EmoteWheel.tsx` reads it with a structural cast until the type has the field. Please add the optional field so the cast can go:

```ts
// src/ui/hud/context.ts
import type { AvatarSpec } from '@/contracts';

export interface EmoteWheel {
  emotes: readonly EmoteId[];
  quotes: readonly EmoteId[];
  quoteCooldownMs: number;
  /** Your General (the quote bubble's head, PLAN 2a); absent in replays and tests. */
  speaker?: AvatarSpec;
}
```

Then, in `src/ui/hud/EmoteWheel.tsx` (Track C, a follow-up for whoever lands this): `if (side === 'me') return c.wheel?.speaker;`.

## 2. The dev screens page: stills that update themselves (`src/dev/screens/page.tsx`, dev only)

Track A asked for this (`custom-a-scenes.md` item 1) and Track C landed it in the app: `art.ts` exports `onCosmeticPicturesChanged`, `cosmeticArt.tsx` exports `CosmeticPicturesContext`, and `AppRoot.tsx` provides it, so a backdrop or scene still shown before its Blender strips streamed in updates itself. The dev screens page provides `CosmeticArtContext` on its own (line ~518); for the same behaviour there, wrap it the same way:

```tsx
import { CosmeticArtContext, CosmeticPicturesContext } from '@/ui/components/cosmeticArt';
import { cosmeticImageUrl, onCosmeticPicturesChanged } from '@/visuals/cosmetics/art';
…
<CosmeticArtContext.Provider value={cosmeticImageUrl}>
  <CosmeticPicturesContext.Provider value={onCosmeticPicturesChanged}>
    …
  </CosmeticPicturesContext.Provider>
</CosmeticArtContext.Provider>
```

Without it the dev page behaves as before (a still keeps its first answer until the next re-render).

## 3. Still open from Track D (not Track C's files)

`custom-d-content-tests.md` (the World Ambassador title in `src/content/test/meta.test.ts` and `strings.test.ts`, and moving its strings to `content.en.json`) is addressed to the owner of the shared content tests.
