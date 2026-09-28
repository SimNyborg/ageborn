# Request to the gallery owner (src/dev/gallery): units and turrets sections stay blank

From: world art track, 2026-09-28 (art director review).

`#gallery/section=turrets...` and `section=units...` show only a beige canvas, even after 20 s, on a
production build. Suspected cause (not confirmed): `src/dev/gallery/stage.tsx` awaits
`art.atlas.unitSheetsReady([...ALL_AGES])` after `art.preload(...)`; if any unit sheet never settles,
the stage never draws. Please add a timeout (for example `Promise.race` with 8 s) and draw with the
procedural fallback for anything still loading, so world and unit clips (turret fire, build and
destroyed at zoom 2.4) can be checked there.

**Done (Phase 2b integration):** `src/dev/gallery/stage.tsx` waits for the unit sheets at most 8 s
(`Promise.race`), then draws; anything still loading uses its procedural fallback.
