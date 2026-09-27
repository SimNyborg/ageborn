# WP9 → WP4: portraits without the age plate (for silhouettes)

**From:** WP9 (meta UI screens). **To:** WP4 (visuals). **Status:** answered by WP4
(`docs/requests/wp4-portrait-plate-contract.md`); only the contract line is left (integration lead).

The Collection shows unowned cards as silhouettes (DESIGN A9 #10). `ArtProvider.portrait()` draws the
puppet on an opaque age-tinted plate, so a CSS `filter: brightness(0)` would turn the whole square black.

WP4's provider now takes `plate?: boolean` (default `true`). WP9 already uses it: `PortraitFn` in
`src/ui/components/kit.ts` is the contract's `portrait` plus `plate?`, and `CardArt` requests
`plate: false` for silhouettes and darkens the result with CSS. Once `src/contracts/art.ts` has the field,
`PortraitFn` can become `ArtProvider['portrait']` again. A provider that ignores `plate` would show dark
squares for unowned cards, so the app should inject WP4's provider (or the glyph fallback: `portrait: null`).
