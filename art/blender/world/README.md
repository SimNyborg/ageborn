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

Sheets use the unit v3 settings (same outline width and colour, pixel filter, light and shadow
step as the units): frames render at 2.46 px/lu and are downsampled 2:1 to the shipped 1.23 px/lu
sheet. Turrets render 1.7x their authored size (capped at about 72 lu tall, `TURRET_SCALE`). Installed files:
`public/art/turrets/<age>/<slug>.{png,json}` and `public/art/bases/<age>.{png,json}`
(about 0.95 MB in total). The game's entries are in `src/visuals/manifest.world.ts`.

## Files

| File | What |
|---|---|
| `common.py` | geometry helpers (bevelled cylinders, rounded boxes, lumpy rocks, rope, crenels), the waving flag, cracks, rubble, torches, windows, `place()` / `project()` (inverse camera projection), and the turret and base module factories |
| `turrets_<age>.py` | four turrets each (`TURRETS`) |
| `base_<age>.py` | the base (`MODULE`): Cave Hold, Keep, Star Fort, Bunker, Spire |
| `render_world.py` | renders, packs and installs |
| `base_collapse.py`, `render_collapse.py` | the bases' collapse kits (debris, heaps, banner scrap) and their render and install |
| `compose.py` | review sheets built from the atlases |
| `backdrop.py` | pre-rendered backdrop layers per age (`public/art/backdrops/<age>/{far,mid}.webp` + `layers.json` with ambient specs) and arena grounds (`public/art/ground/<arena>.webp`) |

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

`mountsLu` are `BASE_MOUNTS` (common.py; the same four points in every age, mirrored in
`WORLD_BASE_MOUNTS_LU` in `src/visuals/manifest.world.ts`): a zig-zag over the base's full height,
about 80 lu apart. Every base models a real platform there (`platform()`: rock shelves, corbelled
balconies, timber hoardings, bastion gun platforms, sandbag pits, hover discs) with `place()` so the
top lands exactly on the point; each body frame exports `mount0..3` trackers that a unit test
compares, and `AtlasBaseView.mountPoints()` returns `mountsLu`. `lightsLu` (torch and window glow), `smokeLu`
(damage smoke from a crumble stage) and `hornLu` drive code motion in `AtlasBaseView`.

## Collapse kits (DESIGN A11 Base collapse, B5)

```sh
# all 8 ages (a few seconds each on 2 threads), installs public/art/bases/<age>.collapse.{png,json}
<venv>/bin/python art/blender/world/render_collapse.py --out /tmp/collapse-kits [--only stone,medieval] [--no-install]
```

A destroyed base is cut into its big tumbling pieces at runtime from its own frame
(`src/visuals/adapters/world/collapse`), so skins and crumble stages collapse as themselves. The kit
adds what a frame cannot: small solid debris with real shading, two rubble heaps for the ruin and a
team-coloured banner scrap, in the age's materials (`base_collapse.py`; same look, light and
1.23 px/lu sheet as the bases, about 15 KB per age). Frame names start with `<age>_kit_` so they
never collide with the base sheet in Pixi's texture cache, and `meta.ageborn.kind` is
`baseCollapseKit`.

| Clip | Frames | Content |
|---|---|---|
| `piece` | 8 | one debris piece each, centred on the anchor (the game spins them about it) |
| `heap` | 2 | a wide and a narrow rubble heap (the game seats the bottom edge on the ground) |
| `rag` (+ `rag_team`) | 1 | a torn banner scrap; the team layer is tinted |

The kit is the `collapse` clip of each `base.<age>` manifest entry (`baseCollapseSource`,
`WORLD_BASE_COLLAPSE_KITS`) and loads once that base reaches crumble stage 2; code-drawn rocks stand
in until it arrives.

## Colours

Turrets follow the A11 colour rule except the team layer; saturated accents (brass, bees, beaks,
magenta energy) stay small. Bases are exempt (A11) and carry large team areas: banners, roofs,
domes, stripes and flags.

## Backdrops and grounds

```sh
<venv>/bin/python art/blender/world/backdrop.py --out /tmp/bd [--only stone,tar_pits] [--no-install]
```

Far and mid strips use the toon shader with a flatter camera (8 and 12 degrees), then are
desaturated and hazed toward the age's horizon colour (`LOOK`, far more than mid; DESIGN A11 low
contrast). Grounds are flat emissive planes (the toon rim light would tint a grazing plane) with
shaded pebbles, tar pools, bones, drifts and props on top, and a darker front lip. The game loads them
in `BackdropTextures` and draws the code-painted layers until they arrive (about 0.6 MB in total).
