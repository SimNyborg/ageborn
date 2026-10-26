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

**Done (queue item 44, Track W, 2026-10-26).** Without a contract change: `battleView.projectileOrigin` takes a turret
shot from the view's `muzzlePoint()` when the view has one (duck-typed, like the atlas views' other hooks) and falls
back to the mount point otherwise; `trackTurretTarget` also turns the barrel toward the current target every frame,
so repeat shots leave a barrel that points at the body they fly to. The first shot at a new target still leaves
before the barrel turns (the sim names the target only when it fires); the battle view calls a duck-typed
`snapAim()` for it, which `docs/requests/done/item44-turret-aim-point.md` asks the turret views for.
