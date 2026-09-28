# Request: wire the Bronze Age sprite sheets (A17.12)

**From:** the Bronze Age art task (assets only). **To:** WP4 (visuals) and whoever lands `AgeId` `'bronze'` (A17.15).

The Bronze Age art is rendered and installed, but nothing in `src/` points at it yet:

- `public/art/units/bronze/<slug>.{json,png}` and `<slug>.hd.{json,png}` for `hoplite`, `javelineer`,
  `war_chariot`, `phalangite`, `standard_bearer`, `scorpion`, `bronze_colossus` (v3 sheets, same contract as
  the other ages: idle, walk, attack, hit, die, each with `_team`; per-frame `muzzle` on the ranged units).
- `public/art/turrets/bronze/{archer_tower,sun_mirror,onager,gorgon_bust}.{json,png}` (turret contract:
  mount, idle, fire, build, destroyed; `pivotLu`, `aimLimits`, per-frame `muzzle`).
- `public/art/bases/bronze.{json,png}` (`base.bronze`, the Ziggurat: body 0-3, flagA, flagB, treasury 1-3,
  `mountsLu` equal to `WORLD_BASE_MOUNTS_LU`, lights, smoke, horn).
- `public/art/portraits/<slug>.png` and `<slug>_team.png` for the seven units.

Needed changes (not made by the art task):

1. `art/blender/gen_unit_manifest.mjs`: add `'bronze'` to `AGES` (after `'stone'`), then run
   `node art/blender/gen_unit_manifest.mjs` to regenerate `src/visuals/unitSheets.gen.ts`. Until then
   `src/visuals/test/unitSheets.test.ts` ("the generated summary matches the installed sheets") fails,
   because its glob sees the new `public/art/units/bronze/*.json`.
2. `src/visuals/manifest.world.ts`: add `bronze` turrets (`archer_tower`, `sun_mirror`, `onager`,
   `gorgon_bust`) and `'bronze'` in `WORLD_BASE_SHEETS`; the world art test counts (20 turrets, 5 bases)
   need raising.
3. Unit manifest entries for `unit.<slug>` once the bronze content is in `content.units`.

Rebuild: `art/blender/world/render_bronze.py units|world --out <dir>` (see its docstring).
