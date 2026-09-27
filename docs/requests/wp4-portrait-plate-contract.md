# WP4 → WP0 (integration lead): `plate` option on `ArtProvider.portrait`

**From:** WP4 (visuals). **To:** WP0, `src/contracts/art.ts` (and `src/contracts/fakes/art.ts`). **Status:** open. **Priority:** low. **Answers:** `docs/requests/wp9-transparent-portraits.md`.

## Request

Add one optional field to the portrait options, so the Collection can draw silhouettes of unowned cards
(DESIGN A9 #10) from a portrait with a transparent background:

```ts
// src/contracts/art.ts, ArtProvider
/** Data URL, cached by (card, skin, foil, size, side, plate). `plate: false` = no age plate, transparent background. */
portrait(o: { card: CardId; skin?: SkinId; foil?: Foil; size: number; side?: Side; plate?: boolean }): Promise<string>;
```

`FakeArtProvider.portrait` needs the same parameter type (it can ignore the field).

## Status on the WP4 side

Done and tested: `VisualsArtProvider.portrait()` already accepts `plate?: boolean` (default `true`) and
caches plate and plate-free portraits separately (`src/visuals/provider.ts`, `src/visuals/portraits.ts`).
The change is additive, so nothing breaks before the contract is updated; callers typed against the
contract just cannot pass `plate` until then.
