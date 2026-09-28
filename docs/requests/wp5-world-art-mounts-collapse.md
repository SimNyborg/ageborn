# Request to WP5 (render): world art review follow-ups (mounts, collapse debris, turret mirroring)

From: world art track (turrets, bases, backdrops, effects), 2026-09-28.

1. **Mount points and tap targets.** Every 3D base now models four real turret platforms and exports
   them as `meta.ageborn.mountsLu`; `AtlasBaseView.mountPoints()` returns them. They are the same in
   every age (`WORLD_BASE_MOUNTS_LU` in `src/visuals/manifest.world.ts`: (-6, 46), (-50, 112),
   (-8, 178), (-56, 246) lu from the gate, y up), zig-zagging over the base's full height, about
   80 lu apart instead of about 45. Render already caches `mountPoints()` in `createBase` and on
   `baseMorph`, so turrets and tap targets follow automatically. Please check: the HUD mount sockets
   and hit areas (`mounts.ts`) can now use the larger gap (bigger tap targets on phones), and the
   `base` anchor `top` (min mount y - 24) now sits about 70 lu higher.
2. **Base collapse debris.** `feel.config.json` `base.destroyed` emits `fx.debris` x120, which drew
   hundreds of identical dots. The recipe now has `maxInstances: 18` (the rest finish at once) and
   bigger rounded chunks, and `AtlasBaseView.collapse()` throws 16 large chunks in the base's own
   palette plus four dust billows. Suggest lowering the count to 18 so the pool budget is not spent
   on empty instances.
3. **Turret mirroring (please verify).** `turretEntry` sets `view.root.scale.x = -1` for side 1, while
   both turret views (`ProceduralTurretView`, `AtlasTurretView`) already mirror their own body by
   `side`. If both apply, side 1 turrets face away from the lane. The base views follow the
   "view mirrors itself" convention (wp4-baseview-root.md); turrets probably should too (drop the
   root flip in render). `AtlasTurretView.muzzlePoint()` accounts for either.
