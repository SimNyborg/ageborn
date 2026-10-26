# Queue item 44 → the turret views (WP4 visuals): aim a turret at a point, so its barrel can point up at a flyer (2026-10-26)

Status: **open** (`src/visuals/adapters/world/atlasTurretView.ts` and `src/visuals/adapters/procedural/turretView.ts`
are outside Track W's paths; the battle view already calls the hook when a view has it).

## Why

Owner, queue item 44: "the gun, bow, cannon or other weapon of everyone who shoots does not point in the right
direction compared with what they shoot at and the projectile's direction". `TurretView.aimAt(x)` (contract) aims a
turret at the ground under x: both turret views compute `atan2(-(root.y + pivot.y), x - root.x)`, which is always
level or below. So against a flyer (26 turrets hit air: the Archer Tower, Crossbow Nest, Swivel Gun, Gatling Gun, MG
Nest, Flak Gun, the Future and Cosmic beams...) the barrel turned down at the flyer's shadow while the shot climbed to
it, up to about 70 degrees apart.

What item 44 changed in the battle view (`render/battleView.ts`): turret shots now leave the view's live
`muzzlePoint()` (docs/requests/wp5-turret-muzzle-anchor.md, done for the battle), the barrel follows its current
target every frame (so it points there when it fires, instead of being told at the shot and turning at 360 deg/s),
and, for a view without the hook below, a ground target is aimed at through the ground point on the line from the
live muzzle to the target's hit centre (so the barrel points at the body, not the feet) and a flyer is aimed level
(the closest `aimAt` comes to it).

## The change

Add a duck-typed method to both turret views (no contract change; the battle view calls it through `?.` when present):

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
```

The battle view passes the target's hit centre as drawn (`render/battleView.ts` `trackTurretTarget`), so a ground target
is aimed at its body from the barrel's own pivot (the ground-point workaround uses the muzzle's height, a degree or two
off) and a flyer is aimed at within the limits (`aimLimits` default [-55, 40]: up to 55 degrees up). Check: the fire clip's muzzle flash follows the aim
already (`muzzle()` turns the per-frame anchor), so the flash and the shot leave the raised barrel together; the
throwing engines (Rock Tosser, Onager, Trebuchet: arms, not barrels) may want `aimLimits` [0, 0] if a raised arm reads
oddly. Test: a view aimed at a point above its pivot reports a negative aim, clamped at the lower limit.
