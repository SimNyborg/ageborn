# World art: turrets and bases (3D sprite sheets)

The same pipeline as the units (`../README.md`, `ageborn_art`), applied to the 20 turrets
(DESIGN A5) and the 5 age bases (A11). Nothing in `ageborn_art` was changed; `common.py` adds the
world-specific helpers and contracts on top.

## Run

From the repository root, with the bpy venv (Python 3.11, bpy 5.0.1):

```sh
# everything (about 4 min on 2 threads), installs PNG + JSON into public/art
<venv>/bin/python art/blender/world/render_world.py --out /tmp/world-art

# a few visuals, no install, no GIF previews
<venv>/bin/python art/blender/world/render_world.py --out /tmp/world-art \
    --only base.stone,turret.rock_tosser --no-install --no-previews

# review sheet from the packed atlases only: every base at crumble 0-3 with Treasury 0-3,
# flags and the age's turrets standing on the four mounts (red dots), plus a mirrored copy
<venv>/bin/python art/blender/world/compose.py /tmp/world-art /tmp/world-art/review.png
```

Sheets render at 1.5x (the unit budget scale). Installed files:
`public/art/turrets/<age>/<slug>.{png,json}` and `public/art/bases/<age>.{png,json}`
(about 0.95 MB in total). The game's entries are in `src/visuals/manifest.world.ts`.

## Files

| File | What |
|---|---|
| `common.py` | geometry helpers (bevelled cylinders, rounded boxes, lumpy rocks, rope, crenels), the waving flag, cracks, rubble, torches, windows, `place()` / `project()` (inverse camera projection), and the turret and base module factories |
| `turrets_<age>.py` | four turrets each (`TURRETS`) |
| `base_<age>.py` | the base (`MODULE`): Cave Hold, Keep, Star Fort, Bunker, Spire |
| `render_world.py` | renders, packs and installs |
| `compose.py` | review sheets built from the atlases |

## Turret contract

Joints `all` > `mount` (static footing) and `head` (at the pivot; rotating parts). Clips:

| Clip | Frames | Content |
|---|---|---|
| `mount` | 1 | the footing only (head hidden) |
| `idle` | 4, ping-pong | the head only |
| `fire` | 5 | the head only; frame 1 is the shot (flash shown); `anchorsLu.muzzle` per frame |
| `build` | 4 | whole turret: falling stretch, landing squash, rebound, settle |
| `destroyed` | 3 | whole turret: the head tips off, the footing sags |

`meta.ageborn.pivotLu` is the head's pivot in screen lu (y up); `aimLimits` are the aim range.
The game draws `mount`, then the head rotated about the pivot (`AtlasTurretView`).

## Base contract

| Clip | Frames | Content |
|---|---|---|
| `body` | 4 | the base at crumble stage 0-3 (flags and Treasury hidden) |
| `flagA`, `flagB` | 4, loop | one waving flag each (`meta.ageborn.flags`: `crumbleMax`, `z` front or back) |
| `treasury` | 3 | Treasury props for levels 1-3 (cumulative) |

`mountsLu` are the procedural base puppets' mounts (`src/visuals/puppets/<age>.ts`); the ledges
are placed with `place()` so their projected tops land exactly there, and each body frame exports
`mount0..3` trackers that a unit test compares. `lightsLu` (torch and window glow), `smokeLu`
(damage smoke from a crumble stage) and `hornLu` drive code motion in `AtlasBaseView`.

## Colours

Turrets follow the A11 colour rule except the team layer; saturated accents (brass, bees, beaks,
magenta energy) stay small. Bases are exempt (A11) and carry large team areas: banners, roofs,
domes, stripes and flags.
