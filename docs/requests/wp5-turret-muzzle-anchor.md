# Request to WP5 (render): turret shots from the sheet's muzzle anchor

From: quality pass, world art track (turrets and bases as 3D sheets).

`battleView.projectileOrigin` starts turret projectiles at the mount point plus a fixed offset
(`x + facing * 10, y - 6`). The turret sheets now carry a per-frame muzzle anchor for the fire clip
(`meta.ageborn.clips.fire.anchorsLu.muzzle`, screen lu from the feet, y up, at aim 0), and the
turret view already places its muzzle flash there, rotated with the aim.

Proposal: add an optional `muzzlePoint(): Pt | null` to `TurretView` (contracts, integration lead),
returning the current muzzle in the view's parent space, and let `projectileOrigin` use it when
present. Until then shots leave a little below the barrel on tall turrets (Trebuchet, Rock Tosser,
Arc Coil), which is visible but harmless.

## Update (world art review pass)

`AtlasTurretView` now has a public `muzzlePoint(): { x: number; y: number }` that returns the live
muzzle in the view root's parent space (world lu): the fire clip's per-frame anchor, turned with the
aim and following the recoil kick. Turrets are also 1.6-1.8x larger now, so the fixed
`x + facing * 10, y - 6` origin in `battleView.projectileOrigin` is visibly wrong for tall turrets
(Trebuchet, Arc Coil, Rock Tosser: the shot leaves from the platform, not the arm or orb).

Proposed change (render + contracts):
1. `TurretView` gets an optional `muzzlePoint?(): Pt` (contracts, JSDoc: "world point where a shot
   leaves on the current frame"; the procedural view can return its rig's muzzle anchor).
2. `projectileOrigin` for a turret source: `const mp = entry.view.muzzlePoint?.(); if (mp) return mp;`
   before the fixed offset fallback.
