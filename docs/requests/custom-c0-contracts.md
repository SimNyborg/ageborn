# Record (Customize build, C0): additive contract change for scenes, per-age base skins and the diorama

**Status: approved by the orchestrator 2026-10-08** (the change listed in the build plan, §2e "Save migration v14", before any track started).
**From:** Track C's agent doing C0, the foundation of the Customize build (owner queue items 18, 19/19b, 20 and 21). **To:** the integration lead (contracts).

Every change is additive: every caller that compiled before still compiles, and nothing a player sees changes until a track ships its items.

## `src/contracts/save.ts`

- `CosmeticLoadout.scenes: Partial<Record<AgeId, CosmeticKey>>`: the scene per age (`scene.<id>`); an age without an entry shows its classic scene. Required from save v14 (the migration writes `{}`).
- Doc only: `CosmeticLoadout.backdrop` is shown as the "Sky" from save v14 (one for every age; it re-grades whichever scene shows). The key and its values are unchanged.

## `src/contracts/ids.ts`

- `SideLook.scenes?: Partial<Record<AgeId, CosmeticKey>>`: a side's scene per age in a match. Optional, so replays recorded before (no field) keep validating and show the classic scenes.

## `src/contracts/art.ts`

- `ArtProvider.createBase` option `skins?: Partial<Record<AgeId, SkinId>>`: the base skin per age as art skin ids (`frost_cave`, `crystal_spire`), resolved as `base.<age>@<skin>`; `skins[age]` wins over the older `skin`, which keeps its meaning (applied to whichever age has an entry).
- `ArtProvider.createBackdrop` option `scenes?: { left?: Partial<Record<AgeId, CosmeticKey>>; right?: Partial<Record<AgeId, CosmeticKey>> }`: each half's scene per age, left = side 0.
- New types beside `ShowcaseMount`: `DioramaRequest` (`age`, `side`, `look`, the try-on overrides `scene` and `sky`, `baseSkins`, `crumble`, `teamPreset`, `reduceMotion`, `lite`), `DioramaHandle` (`ready`, `update`, `setVisible`, `destroy`) and `DioramaMount = (host, req) => DioramaHandle`. The plan's `sceneOf` is the `scene` field.

## Fakes and versions

- `src/contracts/fakes/saveStore.ts`: the fake fresh save writes `v: 14` with `scenes: {}` (the schema validates the current version only, as the v12 and v13 steps did).
- `src/contracts/fakes/art.ts`: `createBase` and `createBackdrop` accept the new options (they record the call as before).
- Save v14: `src/save/migrations/v14.ts`, the schema (`CosmeticLoadoutSchema.scenes`), the replay schema (`look.scenes`), the frozen `fixtures/v14.json`; `src/meta/rules.ts` `SAVE_VERSION = 14`.

## Readers

- `scenes`: `meta/cosmetics.ts` (`equipCosmetic` slot `scene`, `sideLook`, `botLook`), `render/battleView.ts` (to `createBackdrop`), the provider (to the backdrop view, Track A).
- `skins` on `createBase`: `render/battleView.ts` (`baseSkinsOf`: the troop-system skin of a base, else the side's cosmetic base skin of that age) and the provider's per-age resolution (Track B).
- Diorama types: `ui/components/diorama.ts` (`DioramaContext`), `render/showcase/diorama.ts` (`dioramaMount`, Track B), provided in `app/ui/AppRoot.tsx`.

**Resolved (round 1, 2026-10-08):** approved and landed in C0 (`85bf2a6`); every interface above is in use by the tracks.
