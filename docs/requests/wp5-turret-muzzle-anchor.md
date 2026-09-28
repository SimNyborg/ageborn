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
