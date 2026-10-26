# Queue item 44 → the turret views (WP4 visuals): aim a turret at a point, and turn to a new target at once (2026-10-26)

Status: **done** (2026-10-26, orchestrator, with item 44's release). Both turret views have `aimAtPoint(x, y)` (the atlas
view aims from its head's pivot in the parent space, scale and recoil squash included; the procedural view from its
puppet's hit centre, and its `aimAt(x)` is now `aimAtPoint(x, 0)`) and `snapAim()` (the head or barrel takes its aim
target at once and is placed again in the same frame). Tests in `src/visuals/test/turretAim.test.ts`.

## Why

Owner, queue item 44: "the gun, bow, cannon or other weapon of everyone who shoots does not point in the right
direction compared with what they shoot at and the projectile's direction". Two things are left on the turrets:

1. `TurretView.aimAt(x)` (contract) aims a turret at the ground under x: both turret views compute
   `atan2(-(root.y + pivot.y), x - root.x)`, which is always level or below. So against a flyer (26 turrets hit air:
   the Archer Tower, Crossbow Nest, Swivel Gun, Gatling Gun, MG Nest, Flak Gun, the Future and Cosmic beams...) the
   barrel cannot point up at the flyer while the shot climbs to it, up to about 70 degrees apart.
2. The sim names a turret's target only when it fires (`src/sim/systems/turrets.ts` sets `attack.targetId` at the
   shot), so the first shot at a new target leaves while the barrel still points at the old one and turns at
   360 deg/s (review of item 44, N1: the Crossbow Nest fires at 0 degrees and reaches 30 degrees three frames later).

What item 44 changed in the battle view (`render/battleView.ts`): turret shots leave the view's live `muzzlePoint()`
(docs/requests/done/wp5-turret-muzzle-anchor.md), the barrel follows its current target every frame (so repeat shots
leave a barrel that points at the body they fly to), and, for a view without `aimAtPoint`, a ground target is aimed at
through the ground point on the line from the live muzzle to the target's hit centre (so the barrel points at the body,
not the feet) and a flyer is aimed level (the closest `aimAt` comes to it).

## The change

Add two duck-typed methods to both turret views (no contract change; the battle view calls them through `?.`):

```ts
/** Aims at a point in the root's parent space (lu, y down): the barrel turns toward it within `aimLimits`. */
aimAtPoint(x: number, y: number): void {
  this.sinceAimMs = 0; // atlas view only (keeps the idle scan off while it has a target)
  const dx = (x - this.root.x) * this.facing;
  const dy = y - (this.root.y + this.pivot.y); // procedural view: this.o.puppet.anchors.hitCenter.y for the pivot
  const deg = (Math.atan2(dy, Math.max(1, dx)) * 180) / Math.PI;
  const [lo, hi] = this.aimLimits;
  this.aimTarget = Math.max(lo, Math.min(hi, deg));
}

/** Turns the barrel to its aim target at once (the battle view calls it on a new target's first shot, before the shot reads `muzzlePoint()`). */
snapAim(): void {
  if (this.aimTarget !== null) this.aimDeg = this.aimTarget; // then re-place the head (atlas: `moveHead(0)`; procedural: re-apply the pose)
}
```

The battle view passes the target's hit centre as drawn (`render/battleView.ts` `trackTurretTarget`), so a ground target
is aimed at its body from the barrel's own pivot (the ground-point workaround uses the muzzle's height, a degree or two
off; it goes once `aimAtPoint` lands) and a flyer is aimed at within the limits (`aimLimits` default [-55, 40]: up to
55 degrees up). On a turret's `fire` with a target other than its last one, the battle view calls `snapAim()` before
the projectile takes `muzzlePoint()`, so the first shot leaves the barrel already turned. Check: the fire clip's muzzle
flash follows the aim already (`muzzle()` turns the per-frame anchor), so the flash and the shot leave the raised
barrel together; the throwing engines (Rock Tosser, Onager, Trebuchet: arms, not barrels) may want `aimLimits` [0, 0]
if a raised arm reads oddly. Tests: a view aimed at a point above its pivot reports a negative aim, clamped at the
lower limit; `snapAim()` puts the muzzle on the new aim in the same frame.
