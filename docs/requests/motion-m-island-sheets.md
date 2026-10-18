# Request to the visuals owner: a 1x sheet lease for small menu stages

> **Deferred 2026-10-18, see review M** (`The request docs/requests/motion-m-island-sheets.md (1x lease): not now`):
> the menu context goes at once when a match starts, so the war's memory peak is unchanged, and Home's live
> island (about 117 MB at DPR 2) is far below the 600 MB budget. Revisit if Home's memory shows up on a real
> iPhone (tab reloads on Home); review M lists how to do it then.

From: Track M (queue item 37, Home's live island), 2026-10-17.

## Why

Home's island now plays the troops' real battle clips on a small Pixi layer (`src/render/showcase/home.ts`)
that draws on the menus' shared WebGL app (the Customize diorama's, `SharedApp` in
`src/render/showcase/diorama.ts`). It leases its four troops' sheets through `showcaseLease`.

On a phone at DPR 2 the battle's own sheet set (`main` in `src/visuals/adapters/atlas.ts`) is the HD one,
so `showcaseLease` hands the island the HD sheets (2.46 px per lu) even though it asks for `hd: false`. On a
phone the island draws its troops at about 0.57 CSS px per lu (1.1 device px per lu at 844x390), so three
quarters of those pixels are never seen, and because the island draws on a second WebGL context the lease
also keeps each sheet's decoded CPU copy (`cpu: true`, G7):

| Home at 844x390, DPR 2 (Chromium, `__agebornDev.memory()` + the menu context's textures) | MB |
|---|---|
| Still island (Reduce motion) | 38 |
| Live island (today: HD sheets, CPU copies plus the menu context's GPU copies) | 117 (72 + 45) |

That is inside the 600 MB Safari budget (a Standard War after a live Home peaks at 506 MB, and the menu
context is released at once when a match starts), but about 60 MB of the 79 MB extra is HD detail the island
cannot show. The minified HD frames also alias a little more than a 1x frame would.

## What we ask

A way to lease (and draw from) the 1x copy of a unit sheet even when the battle's set is HD, for stages that
draw troops small:

1. `AtlasTier.lease(source, { lo: true, ... })`: when `this.main.hd` is true, load the 1x sheet into a
   third, showcase-only set (`loOnly`, mirroring `hdOnly`: unloaded `leaseLingerMs` after its last lease);
   when the main set is already 1x, `lo` is the main set (no copy). The returned lease says which it gave
   (`lo: boolean`, like `hd`).
2. `showcaseLease({ visuals, lo: true })` in `src/visuals/provider.ts` passes it through and reports `lo`.
3. `createUnit({ ..., lo: true })` (duck-typed like `hd`) draws from the `loOnly` copy when it is loaded
   (`canDrawLo(def)`, like `canDrawHd`).

## What changes on our side once it lands

`HomeStage.leaseTroops` and `syncPreload` would ask for `lo: true` when the island draws under
`HD_PX_PER_LU` (1.3 device px per lu) at 1x, and `spawnActor` would pass `lo` to `createUnit`; nothing
else changes. Expected Home live cost at DPR 2: about 20 MB over the still island instead of 79 MB.
The Customize diorama (same shared app, troops drawn at a similar size) could use it too.

No contract, sim, balance or timing change: it only picks which copy of the same art is drawn.
