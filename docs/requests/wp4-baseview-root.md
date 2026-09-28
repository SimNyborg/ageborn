# Request to WP4 (visuals) and the art track: the BaseView root convention (audit #3)

**From:** the player-experience track (render), 2026-09-28. **For the 3D sprite bases being made now.**

The battle view placed each base root at the base centre (−70 / 1,270 lu) and mirrored side 1's root
(`scale.x = −1`), while both base adapters (`adapters/procedural/baseView.ts`, `adapters/placeholder.ts`)
expect the root **on the gate** and mirror themselves, and return `mountPoints()` already in the
root's parent space. Result: side 0's base was half off screen, side 1's base faced the wrong way,
and the mount points were offset by another 70 lu (the owner's "base cut off at the left edge").

Render now follows the adapters (`src/render/battleView.ts` `createBase`): root at `gateX(side)`, no
extra mirroring, and `mountPoints()` used as world points. Please keep this convention in the new
3D sprite base adapter, and add it to the `BaseView` JSDoc in `src/contracts/art.ts`:

- the root sits on the gate at ground level; the art is drawn behind it (x < 0 for side 0);
- the view mirrors itself for side 1 (`side` is passed to `createBase`);
- `mountPoints()` returns the four mounts in the root's parent (world) space, bottom to top, about
  45 lu apart (the HUD's mount socket shrinks to that gap on small screens).
