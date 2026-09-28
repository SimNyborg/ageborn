# Request: the art pipeline's age lists for the eight ages

**From:** WP4 (the A17 asset registration). **To:** the art task (`art/blender/**`, `public/art/**`).

The A17 sheets are wired into the game (`src/visuals`), but some pipeline scripts still list five ages.
WP4 was asked not to edit `art/**` while the art task works there, so these are left to you:

1. **`art/blender/gen_unit_manifest.mjs`**: `AGES` must be
   `['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic']`.
   WP4 generated `src/visuals/unitSheets.gen.ts` from a scratch copy with that list. Running the script
   as it is now drops all 21 A17 units from the summary (the game would draw them procedurally, and
   `src/visuals/test/unitSheets.test.ts` fails). After every re-render, rerun it with the new list.
2. **Pre-rendered backdrops** (`art/blender/world/backdrop.py`, `compose.py`, `render_world.py`
   `AGES`): Bronze, Industrial and Cosmic have code-painted far and mid layers (A17.12 skylines in
   `src/visuals/backdrops`). When you render `public/art/backdrops/<age>/{far,mid}.webp` + `layers.json`
   for them, add the ages to `PRERENDERED_BACKDROP_AGES` in
   `src/visuals/adapters/procedural/backdropView.ts` (WP4 file; the list keeps the game from requesting
   files that do not exist).
3. **Card stills**: `public/art/portraits/riveter{,_team}.png` and `sapper{,_team}.png` are missing
   (`gen_portraits.py`). Until they exist the two cards use their procedural portrait; they are listed
   in `UNITS_WITHOUT_STILLS` (`src/visuals/adapters/atlasPortrait.ts`). The unit sheet test fails as soon
   as a still appears, as a reminder to remove the slug from that list.
4. **Mortar Pit height**: `public/art/turrets/industrial/mortar_pit.json` is 47.6 lu tall; the world art
   test's floor ("at least about 48 lu", art review) was relaxed to 47.5 for it. A render at 48 lu or
   more lets the floor go back to 48.
