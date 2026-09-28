# Request: visuals for the three new ages (A17 step 2, then step 3)

**From:** the A17 step 2 wiring task. **To:** WP4 (`src/visuals`), with the art task that renders
`art/**` and `public/art/**`.

Bronze, Industrial and Cosmic are now real content: 21 units, 12 turrets and 6 powers in
`content.units`, `content.turrets` and `content.powers`, and `base.<age>`, `backdrop.<age>`,
`palette.<age>` on the three new `AgeDef`s. Until visuals exist, the provider draws its placeholder for
them ("a match never crashes on missing art"), so every battle still plays.

Done in this step, only so the tree typechecks (please replace):

- `src/visuals/palette.ts`: `AGE_PALETTES`, `AGE_ZONES`, `BACKDROP_PALETTES` entries for the three ages
  from the A17.12 colours.
- `src/visuals/puppets/index.ts`: empty puppet sets (`units: [], turrets: [], base: null`).
- `src/visuals/manifest.world.ts`: `WORLD_TURRET_SHEETS` entries `[]` for the three ages.
- `src/visuals/backdrops/sky.ts` (`SUN`, `CLOUD_TINT`) and `src/visuals/adapters/world/atlasBaseView.ts`
  (`RUBBLE_COLORS`, `DUST_COLORS`, `LIGHT_COLORS`): first-guess entries.
- `src/capsule/palette.ts` `AGE_COLORS`, `src/ui/components/Avatar.tsx` `AGE_PLATE`,
  `src/ui/components/icons.tsx` `AGE_COLOR`, `src/contracts/fakes/art.ts`: A17.12 colours.

Still needed (these tests fail until then):

- `src/visuals/ages.ts` `AGES` (still five), the manifest entries `unit.<slug>`, `turret.<slug>`,
  `power.<slug>`, `base.<age>`, `backdrop.<age>`, `icon.age.<age>`, the projectiles and effects of
  A17.12 (`proj.javelin`, `proj.scorpion_bolt`, `proj.harpoon`, `proj.flare`, `proj.ion`,
  `proj.starburst`, `proj.star_shard`, `fx.sun_beam`, `fx.gorgon_gaze`, `fx.tesla_arc`, `fx.beam_void`,
  `fx.beam_ion`, `fx.beam_tachyon`, ability and power effects), and procedural puppets for the new cards:
  `src/visuals/test/manifest.test.ts` (46 tests) and `tests/integrity/ids.test.ts` (visual ids).
- Wiring the rendered Bronze sheets (`docs/requests/wp4-bronze-art-wiring.md`):
  `src/visuals/test/unitSheets.test.ts` (22 tests) fails because `public/art/units/bronze/*.json` exist
  but `art/blender/gen_unit_manifest.mjs` does not list `bronze` yet.
- A17.17: the procedural bake at boot should become Stone and Bronze (`src/visuals/adapters/procedural.ts`
  `BOOT_AGES`; the app preloads the other seven ages when idle, `src/app/boot.ts` `LATER_AGES`).
