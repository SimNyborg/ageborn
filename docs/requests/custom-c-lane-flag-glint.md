# Request (Track C → Track B): the Legendary base flag's glint in the lane

**From:** Track C (Customize item detail), round 1, 2026-10-08. **To:** Track B (owner of `src/visuals/cosmetics/dressing.ts`).

Track C redrew the 15 base flags this round (PLAN 2a "Base flags", AUDIT §3): bigger emblems (55-75% of the cloth height), cel shading with an outline in the team colour's dark, a weave, fold bands and a stitched hem, and a finish per rarity. The lane already shows all of it, because `dressing.ts` bakes the cloth with `drawFlag(ctx, 'baseFlag', id, paints, px)`, whose signature, margin (2 units around the 60 x 40 field) and `FLAG_W` / `FLAG_H` are unchanged.

What the lane bake contains per rarity:

| Rarity | In the texture |
|---|---|
| Common | plain stitched hem |
| Rare | a contrast border |
| Epic | a gold border and a tassel fringe on the fly end (inside the 2-unit margin) |
| Legendary | a gold border, a gold fringe on the lower edge (inside the margin) and the embroidered emblem |

## 1. Please add: the Legendary glint (PLAN 2a: "Legendary: gold fringe, embroidered emblem, star finial, aura and glint")

In Customize the Legendary flags (Wyvern, Phoenix, and Track D's World Compass) sweep a soft white glint across the cloth every 5 s; under Reduce motion it never runs. The lane texture is static, so the glint needs a small overlay in the dressing:

- **Shape:** `FLAG_GLINT` from `src/visuals/cosmetics/flags.ts` (a slanted band in view-box units, the same one the SVG uses), clipped to `BANNER_OUTLINE`, white at alpha 0.4.
- **Timing (same as Customize):** translate x from -8 to 86 view-box units over the first 30% of a 5 s loop, then rest for the remaining 70%. Desync the two sides (start the loop at a random-free fixed offset, for example side 1 half a loop later) so both Legendary flags never flash together.
- **Which flags:** `baseFlagTier(id) === 'legendary'` (exported from `flags.ts`), and `world_compass` (Track D's reward; its tier is in `REGION_PENNANT_TIER` in `nationalFlags.ts`). `baseFlagDesign(id).tier` in `art.ts` answers both in one call.
- **Reduce motion:** no glint at all (the flag still ripples as today, or not, as your current rule says).
- **Quality Low:** fine to skip.

## 2. Not for the lane

- The pole finials (wooden knob, brass ball, spear tip, star) are Customize-only (`cosmeticSvg(key, { pole: true })` and the mock-up). The lane keeps your base model's own pole; please do not add them.
- National flags: Track D's `nationalFlagTexture` request (`custom-d-lane-flag.md`) is separate.

Nothing in Track C's files depends on this; the flags look right in the lane without it, only the Legendary sparkle is missing there.

**Resolved (round 1 final agent, 2026-10-08):** item 1 is in `src/visuals/cosmetics/dressing.ts`: the `FLAG_GLINT` band swept from -8 to 86 view-box units over the first 30% of a 5 s loop (`glintOffset`), drawn as three nested bands (alpha 0.16 each, about 0.4 at the centre) on the cloth's own mesh points and clipped to the flag's silhouette (`BANNER_OUTLINE`), for `baseFlagDesign(id).tier === 'legendary'` (the Wyvern, the Phoenix and the World Compass); side 1 runs half a loop later; off under Reduce motion, Lite and once the base collapses. Item 2 needed no change.
