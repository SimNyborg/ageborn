# Request (Track A, UI art pass): a proper kit field for sprite strips

**From:** UI art Track A. **To:** whoever owns `src/ui/screens/ScreenHost.tsx`, `src/app/main.tsx` and the `AppUi` type.

The menus now play unit clips from the Blender sheets (the War Path banner-bearer and the Home War Path
card use the Standard Bearer's `idle` and `walk`). Track A owns neither `ScreenHost.tsx` nor `main.tsx`,
so the strip travels through the existing portrait function with a reserved card id:

- `useSpriteStrip(card, clip, size)` (`src/ui/components/kit.ts`) asks `portrait({ card: 'strip:<clip>:<card>', size, plate: false })`;
- `VisualsArtProvider.portrait` recognises the prefix (`stripRequest`, `src/visuals/adapters/spriteStrip.ts`) and returns a horizontal strip of square cells (frame count = width / height).

**Asked:** add an optional `spriteStrip?: (o: { card; clip; size; side? }) => Promise<string>` to `UiKit`,
pass `art.spriteStrip.bind(art)` from `main.tsx` through `ScreenHost`'s env, and switch `useSpriteStrip`
to it. Additive; the `strip:` prefix can stay as a fallback. Track B's Card detail stage (audit #14) can use
`<SpriteStrip>` today as it is.
