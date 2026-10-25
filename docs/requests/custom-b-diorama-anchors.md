# Track B → Track C: the diorama's anchors and the Legendary aura list (round 3, 2026-10-25)

Status: **done** (in the tree; C may build on it now).

## 1. Where the decoration spots and the flag pole are on the live stage

The handle that `dioramaMount(art)(host, req)` returns (`src/render/showcase/diorama.ts`, `DioramaStage`) has two
duck-typed extras beside the `DioramaHandle` contract (no contract change; the UI checks for them):

```ts
/** CSS px in the host: left, top, width, height. */
interface DioramaAnchorPx { x: number; y: number; w: number; h: number }

anchorsPx(): DioramaAnchorPx[];               // [spot 0, spot 1, spot 2, pole]
onAnchorsChange(cb: () => void): () => void;  // returns the unsubscribe
```

- **Order.** The three decoration spots in anchor order (`cosmetics.equipped.decorations[0..2]`), then the pole.
- **Where.** Spots at −150, −104 and +20 lu from the gate, the pole at +44 lu (the lane dressing's
  `DRESSING_ANCHORS`; mirrored for side 1, so spot 0 is always the one furthest from the lane). A test holds the
  diorama's copy (`DIORAMA_SPOTS_LU`, `DIORAMA_POLE_LU`) equal to the dressing's.
- **Boxes.** A spot's box is a prop's footprint and height (50 x 66 lu, its bottom on the ground line, centred on
  the anchor). The pole's box runs from 10 lu behind the pole to 58 lu in front of it (the flags fly toward +x on
  both sides, the lane's one wind) and up to its cap (186 lu). At 844 x 390 the stage is small (about 0.3 px per
  lu), so the boxes are 15-20 px wide: grow the tap targets to 44 px about each box's centre (the two back spots
  are 46 lu apart, so their targets overlap at phone size: split the overlap at the midpoint between their centres,
  or stack them).
- **Coordinates.** CSS px relative to the host's padding box (the stage's canvas fills the host,
  `position: absolute; inset: 0`). They are valid from the mount on, before `ready` resolves, so the targets can sit
  over the still picture too (the still must then draw the base at the same framing; `dioramaFraming` in the same
  file is the rule: the ground line at 83% of the height, about 440 lu above it, the world's left edge at the
  stage's left edge for side 0).
- **Changes.** `onAnchorsChange` fires when the stage goes live and on every resize that changes the stage's size
  (its own `ResizeObserver`). An age, skin, scene or crumble change never moves them (every base keeps the
  footprint).
- Pure helper for tests or a still that wants the same numbers: `dioramaAnchors(width, height, side)` (exported).

## 2. Which base models wear the Legendary aura

`WORLD_BASE_SKIN_AURA: readonly string[]` in `src/visuals/manifest.world.ts`, next to `WORLD_BASE_SKIN_KITS`:
`['crystal_spire', 'nebula_ark']` today. A test holds it equal to the sheets' own `meta.ageborn.aura: 'legendary'`
(what the battle reads) and checks that every entry is a Legendary skin. Colossus Lighthouse joins when its model
ships (round 3b; in battle its aura sits on the raised torch).

The lane's aura, for matching it on the base pictures: an additive pale lilac-white (`#F6F0FF`) radial halo
centred on the body's middle, about 1.55 x the body's width and 1.3 x its height, peak alpha 0.3, breathing
±16% on a slow sine (still under Reduce motion), dimmer by 16% per crumble stage, behind the body (after the
contact shadow). B's fx layer (`baseSkinLayerSvg`: Crystal Spire's shard glints, Nebula Ark's nebula wisps) draws
on top of the picture, so the aura goes under both.

## 3. What C does with it (C's paths, not B's)

- Customize's PreviewStage: the three spots as tap targets over the live stage at `anchorsPx()` (picked state,
  "+" on an empty spot), the pole marked on the Flags tab.
- BaseLook: the aura under the models in `WORLD_BASE_SKIN_AURA` (read through the router, for example a
  `layer: 'aura'` picture that is null for other skins).
