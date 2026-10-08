# Record (Track B): small edits outside Track B's own files, round 1

**From:** Track B (base skins as real models), 2026-10-08. **To:** the orchestrator. Each edit is additive and covered by tests. Please review them when you merge round 1.

## `src/visuals/adapters/worldAtlas.ts` (shared world sheet loader)

- `isBaseSkinSource(source)`: true for `art/bases/skins/<skin>.json`. `isWorldSource` also accepts these, so a skin model's sheet and kit load through the same `WorldAtlas` as the age sheets. `worldSourceAge()` stays `null` for them, so they never join an age's preload: they load only when a base shows that skin.
- `WorldMeta` gains the optional skin model keys exported by `art/blender/world/common.py` `base_module(skin=..., extra_meta=...)`: `skin`, `topple`, `collapseMaterial`, `rubbleColors`, `dustColor` and `ambientLu`.

## `src/visuals/test/worldArt.test.ts` (shared art test)

- Its globs include `public/art/bases/skins/*.json|png`, so the sheet checks (frame names, sizes, PNG budget) cover the skin models too.
- The base count check skips skin entries (`!id.includes('@')`), so it still counts the eight age bases.

## `src/ui/screens/home/HomeScreen.tsx` (Home)

- Track D asked for this and the coordinator approved it: your base on Home flies your equipped flags. HomeScreen passes `myFlags` (your equipped base flag and national flag, each only if you own it) to `Diorama`. `Diorama` (Track B) then draws the lane's flag pole beside your base: the base flag on top in your team colour, the national flag under it with the lane cloth's finish, waving, and still under Reduce motion. With neither flag equipped, the old team banner stays.

## Also done for Track D (`docs/requests/custom-d-lane-flag.md`)

- Lane: the dressing flies `nationalFlagTexture(id)` (D's cloth) and swaps it in when the bake is ready (`src/visuals/cosmetics/dressing.ts`).
- Collapse: a pole that flies a national flag is lowered intact (it leans a little, sinks and fades). It never snaps over. A pole with only a base flag still snaps (test in `cosmetics.bases.test.ts`).

**Resolved (round 1 final agent, for the orchestrator, 2026-10-08):** the three edits were read and kept as they are. One follow-up in `worldAtlas.ts`: base skin sheets now load through the shared `loadWorldSheet` cache (`loadSharedSheet`), so the portrait loader and the battle each get the same sheet from one download.
