# Request (Track B, UI art pass): the six starter emote faces

**From:** UI art Track B. **To:** the owner of `src/ui/hud/icons.tsx` (`EmoteGlyph`; the battle HUD).

Audit #15: emotes read as generic yellow emoji. Track B cel-shaded the 24 collected emotes
(`src/visuals/cosmetics/emotes.ts`: every face now has the art sheet's lower shadow band, a highlight and the
outline drawn last). The six starter emotes (laugh, salute, cry, angry, thumbs up, GG) are drawn by
`EmoteGlyph` in the HUD icons, which Track B does not own, so they still look flat next to the collected ones
in Customize › Emotes and in the battle wheel.

**Asked:** give `EmoteGlyph`'s face the same three layers as `face()` in `emotes.ts` (fill, a lower crescent
`M2.75 12.9A9.3 9.3 0 0 0 21.25 12.9A9.3 7.2 0 0 1 2.75 12.9Z` in `#b5650f` at 26% opacity, a white
highlight ellipse at (8.6, 7.6) 2.6 × 1.4 at 55%, then the outline), so both sets match. Ids and timing stay.

**Resolved (UI art fixer, 2026-10-07):** done as asked; see `docs/decisions.md` ("UI art pass: review fixes and release check").
