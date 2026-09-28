# Art pass → WP5 (render / HUD): unit size, crowding and heavy-impact nudge

**From:** 3D unit sheet pass after the art director review (2026-09-28). **To:** WP5 (`src/render`, `src/ui/hud`). **Status:** open.

The unit sheets are now rendered at 2.46 px/lu (`<slug>.hd.json`, picked automatically on high-density
screens) and 1.23 px/lu (`<slug>.json`), with longer hit (5 frames, ~310 ms) and die clips
(10 frames, ~700 ms; heavies 12 frames, ~950 ms). These items are outside `src/visuals`:

1. **Units are small and the bottom ~30% of the screen is empty ground** (review fix 2). Lower the lane
   line to about 62-65% of the screen height, or zoom the battle camera to about 1.15x, so infantry
   are about 70 px tall at 1280x720 (now about 55 px). If the camera zooms, pass the zoomed CSS px/lu
   as `worldPxPerLu` to `createArtProvider` so the HD sheets are chosen on 1440p+ and DPR 2 screens
   (`wantsHdSheets` in `src/visuals/adapters/atlas.ts`, threshold 1.3 device px/lu).
2. **Crowds stack into one blob** (review fix 3). `depthRows` already spreads units in y; add a small
   seeded x offset (±4 lu, view only) and scale the shadow with the row. Hide full-HP health bars,
   or stack overlapping bars with a 3 px step.
3. **Heavy melee impact** (review fix 5): the heavy units' attack clips now hold the impact for 3 frames
   (`destrier_knight`, `cuirassier`, `mammoth_matriarch`, `tuskback`, `ursa_paladin`, `walker_mech`,
   `chrono_titan`, `battering_ram`). A 2-3 px camera nudge on their impact tick would sell
   the weight.
4. **Muzzle flash and impact puff per age** (review fix 11): a 2-frame muzzle flash sprite at the
   unit's `muzzle` anchor on the fire frame, and a small per-age impact puff where shots land (A12).
5. **Die clip length**: the death hand-off (`die.fx`, `hideUnitAtMs`) is read from the sheet, so no
   change is needed if the view keeps the unit alive until the view reports its death done.
6. **Phones at DPR 3 are soft everywhere** (the review's main blur complaint): `BattleView.resolution`
   and `pixiHost` cap the render resolution at 2, so on a DPR 3 phone the browser upscales the whole
   canvas 1.5x and units, bases and backdrop all blur, whatever the sheet density. Measured
   2026-09-28 at 844x390 DPR 3: the HD sheets load, but the lane is still soft. Suggest allowing
   `min(dpr, 3)` on High quality when the canvas is small (for example CSS width x height below
   1,000,000 px, so a 844x390 phone renders 2532x1170, about the pixel count of a 1280x720 DPR 2
   desktop), keeping 2 elsewhere and 1 in Lite (B16). The art provider should then get the same
   `dpr` so `wantsHdSheets` sees it.
