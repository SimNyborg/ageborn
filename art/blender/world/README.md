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
| `base_skins_<age>.py` | the base skin models of each age (`base.<age>@<skin>`): the round 1-2 conversions and the round 3 models |
| `base_thumbs.py` | the base skin thumbnail atlas (`public/art/bases/skins/thumbs.{webp,json}`: every model on a strip of its age's classic scene, 128 px cells, at most 70 KB) and, with `--decorations`, the decorations' HD atlas; pure PIL |
| `decorations.py` | the 24 base decorations as props on the base pipeline (see Decorations) |
| `backdrop.py` | renders the backdrop scenes (layer format 2) and the arena grounds and installs them (see Backdrops and grounds) |
| `scenes/<age>.py` | each age's scenes: `SCENES = {"classic": Scene(...), "<id>": Scene(...)}` with their strip builders, props and sky |
| `scenes/kit.py` | shared scene builders: peaks, hills, ridges, lofts (glaciers, snowfields), buttes, kopjes, sweeps; buildings (castle, timber house, stepped-gable house, church, star fort, setback tower, warehouse, water tower, windmill tower, stone lighthouse, spire, sky arch); trees and palms (pine, spruce, birch, cypress, olive, acacia, baobab); `Parts` (geometry grouped by material) and `StaticRig` (a `fauna` model drawn as static geometry) |
| `scenes/fauna.py` | animals, vehicles, ships and aircraft for props (deer, sabretooth, birds, chariot, wooden horse, cogs, frigates, barges, trains, airships, patrol boats, windmill sails, turbine rotors, drones), with their poses; painted (numpy) props such as the dust devil |
| `scenes/common.py` | `Scene`, the stage and toon render, the finish (desaturate and haze, `LOOK`), the props atlas, the thumbnail and the `layers.json` writer |
| `scenes/grounds.py` | the arena grounds |
| `scenes/sizes.py`, `scenes/checks.json` | the size budget and colour-rule report of the installed scenes; `--write` records it for the unit test |

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

### Base `prop` loops (round 3)

A base or skin module can animate a part of itself with `base_module(props=[prop_loop(...)])`. Each loop is one clip
`<name>` (plus `<name>_team`, 1 x 1 when empty); the body, flag and treasury clips hide every prop joint, and
`meta.ageborn.props` lists `{clip, crumbleMin, crumbleMax, z, holdFrame, anchorLu, alpha?}`. The game draws back and
front prop pairs from a seeded phase by render time, holds `holdFrame` under Reduce motion, hides a loop outside its
crumble range and hands it to the collapse (it rides its chunk and fades out); the menus' portraits and
`base_thumbs.py` draw it at the held step.
- `prop_loop(name, joints, frames, pose, ms, crumble, z, hold, anchor, occlude, sequence, alpha, outline)`: `joints`
  are joints made under `root` in `build()`; `pose(f)` returns the pose of unique frame f; `ms` and `sequence` set the
  timing; `crumble` is the (min, max) stage range it shows in; `z` front or back of the body; `hold` the step shown
  under Reduce motion; `anchor` the character-space point it rides in the collapse.
- The clip renders the prop alone (the body hidden). For a loop that passes behind the body, `occlude=["body"]` renders
  those joints as a Cycles holdout (cut-out, no AO), so the frame can be drawn over the body; slivers the cut leaves
  are dropped before the outline.
- `outline` gives the clip its own outer outline (`"none"` for light or for small parts that keep only their part
  outlines); otherwise the base's.
- Keep every frame an exact loop (build repeated elements at the origin and place them with one rigid transform per
  step) and the prop clear of the turret boxes (each turret stands about 45 lu either side of its mount and 75 lu up).
- Examples: Crystal Spire's six orbiting shards and Nebula Ark's light streaks (12 x 130 ms), the round 3 models'
  torches, sails, chimes, gears, dish and turbines.

### The round 3 skin models

Thirteen new models live beside the conversions in `base_skins_<age>.py` (Mammoth Bone Lodge; Acropolis Temple,
Colossus Lighthouse; Wyrm-Coil Keep; Windmill Redoubt, Galleon Bastion; Rail Depot, Clocktower Works; Jungle Outpost,
Arctic Radar Station; Bio-Dome Arcology; Asteroid Citadel, Solar Sail Ark), each with its own collapse kit in
`base_collapse.py` (`SKIN_P`, `kit_<skin>`, `<skin>_extras`, `SKIN_KITS`). Render one with
`render_world.py --out <dir> --only base.<age>@<skin> --no-install --no-previews`, check it against the standard
base (footprint, height band, gate and dressing-anchor columns, team share at crumble 0 and 3, the orange share for
the blue side, mounts at every crumble stage), then install the sheet and `render_collapse.py --skins <skin>`, and
rebuild the thumbnail atlas (`base_thumbs.py`).
- **Footprint under the yaw.** Screen x is about 0.978 x + 0.208 y: a box's back corners land further right, its
  front corners further left. Keep the lane end of deep halls and hulls short (Clocktower Works' hall stops at x 10,
  Colossus Lighthouse's quay at x 12), far-side props and rocks inside x of about -165, and rubble piles inside the
  footprint; a part that tilts at 25% leans away from the gate (Rail Depot's tank), so the +20 lu column stays clear.
- **Orange check.** Hue 10-45 degrees with saturation and value of 45% or more reads as the orange team: keep brick,
  terracotta, bronze and gold in large areas under 45% saturation (Windmill Redoubt's brick, Solar Sail Ark's pale
  gold ribs, the `bronze` finish on Colossus Lighthouse's guardian); full gold only on small accents (a hoard, finials).
- **Team share.** A model must keep at least the standard's team share minus 3 points at crumble 0 and 3: give it
  large team areas that survive the damage (Solar Sail Ark's team petals and hull band, Asteroid Citadel's stump keeps
  a team band, a torn banner hangs at 0.8 of its size rather than vanishing).
- **A still prop.** A big detail that never changes across the crumble stages can be a one-frame prop
  (`prop_loop(name, [joint], 1, lambda f: {}, sequence=[0, 0, 0, 0], occlude=["body"])`): the sheet stores it once
  instead of in all four body frames, and the collapse fades it away (Wyrm-Coil Keep's dragon). Things in front of it
  in depth (the hoard in front of the tail) cut it through the holdout.
- **A placed aura.** A Legendary model whose white aura belongs to one spot sets `extra_meta["auraLu"]` (screen lu
  from the feet and a radius, `project()` of a character-space point): the lane draws a round halo there that
  flickers with its fire (Colossus Lighthouse's torch); `baseSkinAuraSpot` gives the screens the same spot (as
  fractions of the base picture, measured with `basePortraitSpot` on the installed sheet; a test holds them equal).
  The lane draws the aura and every ambient mote with normal blending (an additive one between the shadow and the
  body broke the base's draw batch; round 3 frame time).
- **Ambient kinds.** `ambient_lu` takes `birds` (gliding birds; a white `color` for gulls) and `rings` (smoke rings,
  the dragon's nostrils) besides the round-2 kinds. The game bakes each mote kind and colour once to a small sprite.
- **Phone framing.** In battle on a phone (844x390) the camera shows a base up to about z 280 lu and the HUD covers
  the corners above about z 235: keep what identifies a model below that (the crown is seen on desktop, VS, Home and
  in Customize; `docs/requests/item38-phone-base-headroom.md` asks item 38 for more headroom).

## Decorations (round 3)

`decorations.py` builds the 24 decorations as props on the base pipeline (toon light, colour-matched outline and rim,
about 55 lu tall; a `_team` twin where the design has team parts). `render_world.py --only 'decoration.*'` installs
`public/art/cosmetics/decorations/<id>.{png,json}` (2.9-9.3 KB a prop with its JSON, about 105 KB for all 24); `--deco-thumbs` (or
`base_thumbs.py --decorations <render out dir>`) builds the HD Customize atlas (2.46 px/lu, `thumbs.{webp,json}`, at
most 90 KB) from the HD sheets. Banners carry a 4-frame `loop` clip (its own outline via `LOOP_OUTLINE`); braziers
export a glow point (`meta.ageborn.glow`) for the code flicker. The game loads only the equipped props (three a
side), shows the SVG bake until a prop arrives and then cross-fades; every prop topples in the collapse.

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
# every scene and ground (30-70 s a scene on 2 threads), installed into public/art
<venv>/bin/python art/blender/world/backdrop.py --out /tmp/bd
# one scene (age.scene), or a whole age, or an arena id; no install (renders are byte-deterministic)
<venv>/bin/python art/blender/world/backdrop.py --out /tmp/bd --only stone.glacier_valley --no-install
# after an install: the size budget and colour rule of every installed scene, recorded for the unit test
python3 art/blender/world/scenes/sizes.py --write
```

A scene (PLAN 2b, layer format 2) is three strips rendered with the units' toon shader and light, each
with its own camera tilt: `back` (distant, 5 degrees, the haziest; its foot fades out), `far` (the
landmark, 8 degrees) and `mid` (the near bank, 12 degrees, with the 2D outline). After rendering the
strips are desaturated and hazed toward the scene's horizon colour (`LOOK`, or the scene's `look=`;
DESIGN A11 low contrast) and saved as WebP within the PLAN 2b budget: far 38 KB, mid 48 KB, back 14 KB,
props 14 KB, thumbnail 8 KB, `layers.json` 3 KB, 110 KB a scene. The colour rule allows at most 2% of a
strip's opaque pixels (3% of the thumbnail) in a team-hue band with saturation and value above 40%.

Ambient life is data in `layers.json`: blinks and emitters per strip, light points for night skies (at
most 16 a scene, glowing only under night skies) and the props atlas with its sprites (`loop`, `path`,
`bob`; at most 6 moving a half, 3 on Lite; still under reduced motion). The game owns all timing, so new
art never changes balance. A 320 x 180 thumbnail is composed from the strips under the scene's sky with
its props at rest (Customize). Files: `public/art/backdrops/<age>/<scene>/{layers.json, back.webp,
far.webp, mid.webp, props.webp, thumb.webp}` (each age's classic in `<age>/classic/`; round 3 re-rendered
the five format-1 classics, Stone's Smoke Mountain, Medieval's Castle Hills, Gunpowder's Star Fort Coast,
Modern's City Skyline and Future's Spire City, and retired layer format 1 in the reader and the writer;
`sizes.py` fails on a stray format-1 file) and `public/art/ground/<arena>.webp`. The game loads a scene's
files only when a match shows its age (`BackdropTextures`), draws code-painted layers until they arrive,
and releases them after an evolve wipe. Light skies grade the props atlas with the strips
(`themes.themeProps`), so props lighten under Winterfall and Blossom as their strips do.

Grounds are flat emissive planes (the toon rim light would tint a grazing plane) with shaded pebbles,
tar pools, bones, drifts and props on top, and a darker front lip.
