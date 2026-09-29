# Request to WP10 (capsule show): reveal cosmetic collection items

From: cosmetic collections (A18.9.4), 2026-09-29.

Time Capsules and Wardrobe Crates can now hold one cosmetic collection item, rolled at grant like everything else (B8):

- `PendingCapsule.contents.cosmetic?: string | null` and `PendingCrate.cosmetic?: string | null`, a collection key such as `nationalFlag.dk`, `emote.supernova` or `decoration.golden_cup`.
- `meta.openCapsule` / `meta.openWardrobe` already grant it (a duplicate pays Dust, which `contents.dust` of the reveal includes for capsules).

Today the app shows a toast after the show ("Also found: Denmark (National flags)"). Please reveal it in the show itself:

1. One extra card after the stacks (and after the crate's skin), with the item's art. The art is code-drawn: `cosmeticImageUrl(key)` from `src/visuals/cosmetics/art.ts` gives a data URL (SVG; emotes animate). Inject it through the catalog as the skins are, since `capsule` may not import `visuals`.
2. The name: `cosmetic.<collection>.<id>.name`; the collection: `cosmetic.collection.<collection>` (keys in `src/i18n/cosmetics.en.json`, helpers in `src/content/keys.ts`); the rarity colour of the item's rarity (`content.cosmetics.collections.items`).
3. The summary lists it with an "Equip" action that opens Customize on the right tab (`{ id: 'customize', tab: 'flags' | 'decorations' | 'emotes' | 'quotes' | 'bases' }`).
4. The odds panel: `oddsModel(..., content.cosmetics.collections)` now fills `OddsModel.cosmetics`; the shared `OddsSheet` already renders it.

When this lands, remove the toast in `src/app/ui/AppRoot.tsx` (`foundCosmetics`).
