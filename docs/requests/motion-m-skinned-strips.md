# Request to the visuals owner: sprite strips that draw the troop's skin

From: FIX-M (queue item 37, Home's live island), 2026-10-18. Files: `src/visuals/provider.ts` (`portrait`,
`spriteStrip`), maybe `src/visuals/adapters/spriteStrip.ts`.

## Why

Home's still island (what shows until the live layer draws, and always under Reduce motion) draws each troop
as its idle clip from `portrait({ card: 'strip:idle:<card>', side, size, plate: false })`, fitted to the box the
live layer measured, so the hand-over to the live layer does not pop (review M S3). The live layer draws a
troop with its equipped skin (`createUnit({ visualId, skin })`; a skin without its own sheet is the procedural
puppet, as in battle), but `spriteStrip` ignores the skin. So a troop with a skin shows the card's own look in
the still and changes outfit when the live layer takes over (seen with Footman "Tin Can": the plumed helmet
becomes the bucket). The UI side is ready: the live layer reports each troop's box per card and skin, and
`STRIPS_DRAW_SKINS` in `src/ui/screens/home/Diorama.tsx` makes the still ask for the skin and fit it to the
skinned box. Set it to true together with this change (one line; until then the still keeps the card's own
look in the card's own box, since a puppet-drawn skin has other proportions).

## What

`portrait()` passes `o.skin` to `spriteStrip`, and `spriteStrip(card, clip, size, side, skin?)`:

1. resolves `this.resolve(visualId, skin)` and keys its cache by `skinnedVisualId(visualId, skin)`;
2. a skin with its own sheet (an atlas entry): that sheet's strip, as today;
3. a skin without a sheet (the procedural puppet): the skinned puppet as the lane draws it, full body, on a
   transparent background, in the side's team colour, as square cells of `size` px. Its idle clip's frames
   are best; its rest pose in a single cell is enough (the UI measures the drawn pixels and holds a one-frame
   strip still), for example `renderPortrait({ puppet, size, foil: 'none', teamColor, fit: 'full', plate: false })`.

A unit without a skin is unchanged. A skin the provider cannot draw as a strip should get the card's own strip
(as now), not `''`: an empty answer leaves that troop out of the still island until the live layer draws.

Smaller, optional: `ProceduralUnitView` could offer `extentLu({ clips })` as the atlas view does (the body's
reach over the clip, without the ground marks and a skin's aura). Home measures a puppet-drawn troop by its
view's drawn bounds meanwhile (`render/showcase/home.ts` `drawnBox`, as the card showcase does), which an
aura's glow widens.
