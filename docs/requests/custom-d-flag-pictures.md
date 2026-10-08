# Request (Track D → Track C): route every national flag picture to the vendored art, and four test updates

**From:** Track D (national flags, Flag Atlas), round 1, 2026-10-08. **To:** Track C (owner of `src/visuals/cosmetics/art.ts`, the Customize screens and the tests named below).

Track D has landed the vendored flag-icons 7.5.0 designs (MIT) for all 200 national flags (the 195 and the five Other flags, Wales included), all released: `public/art/flags/svg/<code>.svg`, the atlases `atlas-64.webp` / `atlas-128.webp` with `atlas.json`, and the licence notice. `src/visuals/cosmetics/nationalFlags.ts` now answers:

| Call | Returns |
|---|---|
| `nationalFlagUrl(id, 'big')` | the SVG's URL, at once (`/ageborn/art/flags/svg/dk.svg`) |
| `nationalFlagUrl(id, 'tile')` | the atlas cell (a `blob:` URL) once the atlas is in; until then the SVG's URL (the same picture) |
| `nationalFlagUrl(id, 'tile', { cached: true })` | the atlas cell, or null while the atlas loads (for a grid that waits, the Flag Atlas) |
| `nationalFlagSvg(id)` | unchanged: the 50 hand-drawn designs only (markup fallback) |

## 1. The router (`art.ts cosmeticImageUrl`) — needed for VS, Customize, Profile and the ranked "player found"

Today the router asks `nationalFlagUrl` only when `o.size` is set, and drops `o.cached`. `CosmeticImage` (and so `LookFlags` on VS, the Customize mock-up and tiles, `ranked.tsx`) passes no size, so **the 150 new flags show an empty placeholder and the 50 old ones the old hand-drawn designs** (two different pictures of the same flag). Please route every national flag key, with or without a size:

```ts
// The vendored national flags (Track D): every picture, with or without a size
if (key.startsWith('nationalFlag.')) {
  const url = nationalFlagUrl(key.slice('nationalFlag.'.length), o.size ?? 'big', { cached: !!o.cached });
  if (url || o.cached) return url;
}
```

(`'big'` as the default keeps one request per flag shown; a grid of many flags should ask for `{ size: 'tile' }`.) Nothing else in the router changes; `drawFlag(ctx, 'nationalFlag', …)` keeps the hand-drawn fallback until Track B's dressing flies `nationalFlagTexture` (requested from B).

## 2. Tests in Track C's files that assumed the old data (they fail now)

- `src/visuals/test/cosmetics.test.ts` lines 86-87: with the vendored art, `cosmeticImageUrl('nationalFlag.dk', { size: 'tile' })` and `{ size: 'big' }` return `'/art/flags/svg/dk.svg'` in the unit tests (no DOM, so no atlas): expect that instead of `data:image/svg+xml`.
- `src/ui/screens/test/customize.test.tsx:33`: the fixture save owns 6 of **200** released national flags now: `'6/200 found'`.
- `src/meta/test/cosmetics.test.ts`, "the Flag Atlas rewards are earned": the real rewards exist now (`baseFlag.pennant_oceania` … `pennant_south_america`, `baseFlag.world_compass` at `flagsOwned: 195`, title `world_ambassador`), and Oceania has 14 flags (not 2), so `withItems(pennant, compass)` adds duplicate keys and the count-3 compass is earned early. Suggested: drop the two literals and use the real content with the World Compass count lowered, e.g.
  `const T = { ...C, cosmetics: { ...C.cosmetics, collections: { ...col, items: col.items.map((x) => (x.source.kind === 'flagsOwned' ? { ...x, source: { kind: 'flagsOwned', count: oceania.length + 1 } } : x)) } } };`
  (the same pattern as `worldAt()` in `src/meta/test/flagAtlas.test.ts`).
- `src/ui/screens/fixtures/services.ts` `flagAtlasProgress()`: optional; the screen accepts the result without the new optional `world` field (`FlagAtlasInfo.world?`), so the preview may add it later (`{ count: 195, reward: 'baseFlag.world_compass', rewardOwned, title: 'world_ambassador', titleOwned }`).

## 3. Customize › Flags (your open item) — suggestions

- The entry card into the Atlas (`router.go({ id: 'flagAtlas' })`, or `{ id: 'flagAtlas', flag: eq.nationalFlag }` to open on the flying flag): the Atlas shows the count, region progress, the price and the first-flag rule, so Customize can stay small.
- 200 national flag tiles in Customize is a long scroll; showing the owned ones (plus "none") and the Atlas card keeps one home per thing (ui-plan rule 3).
- Grids of flags: ask for `{ size: 'tile' }` (one atlas download for all of them).
- The first flag: the Atlas words it "Claim · Your first flag costs no Dust" (the copy review bans "free").

## 4. Seen in Customize after your entry card landed (screenshot `$S/trackD/cap/cust-flags-entry2-desk.png`)

- The entry card looks right and opens the Atlas. Until item 1 lands, **the Customize grid shows 150 blank tiles** (every flag added on 2026-10-08) and the old hand-drawn designs for the other 50; the mock-up's flag the same.
- The card reuses the test ids `atlas-count` and `atlas-first`, which the Atlas screen uses too (its header count and first-flag banner). Track D's e2e scopes them to `[data-screen="flagAtlas"]`, but distinct ids on the card (`open-flag-atlas-count`, `open-flag-atlas-first`) would avoid ambiguous `getByTestId` matches if both screens are ever in the DOM together.
- `art.ts` reads `REGION_PENNANT_TIER` from `nationalFlags.ts`: it is exported now (six `'epic'` pennants, `world_compass: 'legendary'`).

## 5. Also landed (FYI)

- The Atlas rewards are base flags drawn from `REGION_PENNANTS` through your `baseFlagDesign` (your finish and cut apply); ids `pennant_europe`, `pennant_asia`, `pennant_africa`, `pennant_north_america`, `pennant_south_america`, `pennant_oceania` (Epic) and `world_compass` (Legendary), names in `flags.en.json`. They use `cel()`, `polyPath()`, `star()`, `poly()`, `circle()`, `ring()`, `line()` and `rect()` from `shapes.ts`, and `BANNER_OUTLINE`, `FLAG_W`, `FLAG_H` from `flags.ts`: please keep those exports.
- The Settings credits line ("Flag artwork: flag-icons by Panayiotis Lipiridis (MIT)") is now true; the notice ships in `public/art/flags/LICENSE-flag-icons.txt`.
