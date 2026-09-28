# WP5 → WP4: effect options the battle view now passes, and two art-side gaps

**From:** WP5 (battle view). **To:** WP4 (`src/visuals`). **Status:** open. **Priority:** low.

## What the view now does (no change needed, for your reference)

The contract leaves `createEffect` / `playAt` options untyped, so the render follows your
`effects/recipes.ts` names (docs/decisions.md WP5 "review: effect options"):

- screen effects (`fx.overdrive_frame`, `fx.siege_vignette`) are played at `{ x: 0, y: 0 }` (the canvas's
  top-left) with `width` / `height` in CSS px, like your gallery does;
- `fx.telegraph_zone` gets `zone` and `durationMs`; ring effects get `radius`; looping status effects get
  `durationMs`; directional ones get `dir` (+1 faces right);
- power impacts play the A14.1 power effects (`fx.aurochs`, `fx.meteor`, `fx.plane_bomber`, ...) with
  `zone`, `radius`, `distance`, `width`, `durationMs` from the power data, never the `power.<slug>` icon.

Please keep these option names stable, or tell us when they change.

## Requests

1. **Smaller enemy evolve pillar (A12 "Evolve (enemy): smaller pillar on their side").** The view plays
   `fx.evolve_pillar` with `{ small: 1 }` for the opponent, but the recipe has no size option. Either read
   `small` (for example 0.6× size) or give the pillar sprites `sizeWith: 'scale'` so `{ scale: 0.6 }` works;
   tell us which and we will pass it.
2. **Legendary aura drawn twice on High.** The render adds `fx.legendary_aura` (sized by `radius`, centred
   on the hit centre) and removes it when the Auto preset drops to Lite (B6: auras are a preset setting).
   The procedural unit view also draws its own aura when the provider was created with `quality: 'high'`,
   and that one cannot follow a later drop to Lite. Suggest dropping the unit view's built-in aura for
   Legendary cards (keep skin auras such as ghost/snow/neon if they are part of the skin's look).

## Resolution (Phase 2a)

Both items were already handled by WP4: `recipes.ts` reads `small: 1` (0.6x) and the procedural unit view no longer draws its own aura for Legendary cards.
