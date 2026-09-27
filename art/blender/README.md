# Pre-rendered 3D sprite pipeline (art spike)

This folder is a feasibility spike: it builds Ageborn units as simple 3D models in Blender
from Python code (no manual modelling, no downloaded assets), renders them with a
cel-shaded look to 2D sprite sheets, and packs PixiJS spritesheet atlases that the
`atlas` art tier (DESIGN B5) could load by data only. It is not wired into the game.

Everything is scripted: models, rigs, animation clips, materials, lighting, camera,
rendering, packing, previews and the lane mockup. Rerunning a script gives the same result.

## Install

Blender's Python module needs **Python 3.11** (bpy 5.0.1 wheels exist only for 3.11).

```sh
python3.11 -m venv .venv-blender
.venv-blender/bin/pip install bpy==5.0.1 pillow numpy
```

Only the **Cycles** engine is used (CPU; EEVEE needs a GPU context and does not work
headless). No GPU is needed.

## Run

From the repository root:

```sh
# every unit, all previews and the lane mockup (about 2 minutes on 2 CPU threads)
.venv-blender/bin/python art/blender/render_all.py --out /tmp/art-spike

# one unit, or a smaller sheet scale for size tests (default 2 = DPR 2)
.venv-blender/bin/python art/blender/render_all.py --out /tmp/art-spike --units bonker --scale 1.5

# fast look-dev: a few frames of one unit in one strip (2x on top, 1x blue/orange below)
.venv-blender/bin/python art/blender/preview.py bonker idle:0 attack:3 attack:5 --out strip.png

# rebuild only the lane mockup from existing atlases
.venv-blender/bin/python art/blender/mockup.py /tmp/art-spike
```

Outputs per unit (`<slug>` = `bonker`, `destrier_knight`, `pulse_trooper`):

| File | What |
|---|---|
| `<slug>.png` | shipping atlas: 256-colour palette PNG (base and team frames) |
| `<slug>.json` | PixiJS spritesheet JSON (frames, `animations`, `meta.scale`, clip metadata) |
| `<slug>.rgba.png`, `<slug>.webp`, `<slug>.q90.webp` | full RGBA master and WebP variants, for size comparison |
| `<slug>_<clip>_1x.gif`, `<slug>_<clip>_3x.gif` | previews at in-game size (56 px infantry) and 3x |
| `<slug>_contact.png` | every frame, blue and orange rows per clip |
| `<slug>_team_layer.png` | one frame as base (team holes), grey team layer, and composites in all 5 team colours |
| `<slug>.stats.json` | render time, sheet sizes, colour-rule result |
| `lane_mockup_1280.png`, `lane_mockup_2560.png`, `lane_mockup_zoom.png` | lane at true scale (DPR 1 and 2) and a 3x crop |
| `_frames/` | raw per-frame renders (not shipped) |

## How it works

```
art/blender/
  render_all.py        entry point: all units, then the mockup
  preview.py           look-dev strip for a few frames
  mockup.py            1280x720 lane mockup built from the packed atlases only
  ageborn_art/
    config.py          scale, camera, light, finishes, outline width, team colours
    colors.py          hex/linear conversion, darken and mix as DESIGN A11 defines them
    geometry.py        bmesh primitives in lu: blob (superellipsoid), capsule, lathe, star; hull
    materials.py       emission-only toon shading, outline, team layer switch
    rig.py             joints (empties) + parts (meshes), pose channels, render passes
    anim.py            keys with easing, loop waves, squash, Clip metadata (impactAt)
    fx.py              shared death effect: dust puffs and KO stars
    render.py          two passes per frame (base, team)
    sheet.py           trim, pack, Pixi JSON, PNG8/WebP, GIFs, contact sheet, colour rule
    pipeline.py        one unit end to end
  units/
    bonker.py          Stone Age infantry (club)
    destrier_knight.py Medieval heavy, rider rig (horse + knight, lance)
    pulse_trooper.py   Future ranged (plasma rifle)
```

**Space and scale.** 1 Blender unit = 1 lu. Characters face +X, up is +Z, +Y is away from
the camera. The camera is orthographic at `0.82 px/lu x RENDER_SCALE` (DESIGN A11 world
scale), tilted down 12 degrees; the root of every rig is yawed 32 degrees toward the camera
for a three-quarter view. The feet (origin) land on a fixed pixel, which becomes each
frame's `anchor`, so the game positions sprites exactly like the procedural rigs.

**Toon look in Cycles.** Cycles has no Shader-to-RGB, so the shading is computed from
normals in the node tree and output as emission: a lit and a shadow band (shadow = fill
darkened 18%, DESIGN A11), a soft in-band gradient, one highlight shape, a thin rim light and
short-range ambient occlusion between parts. There are no lamps, so 12 samples are enough
and no denoiser is needed. Outlines are inverted hulls (the part mesh pushed out 3 lu along
its normals, faces flipped, back faces only) coloured fill darkened 45% (DESIGN A11); hulls
are invisible to AO rays. Finishes: `matte` follows A11 exactly; `gloss` and `metal` get a
bigger highlight (metal also a deeper shadow) so armour and plastic read as such.

**Rigs and clips.** Joints are empties parented in a tree; parts are meshes parented to
joints (the A11 cutout rigs, in 3D). A pose is `{joint: {r, rx, rz, x, y, z, s, sx, sy, sz,
alpha, show}}`; `r` is the side-plane angle, counter-clockwise on screen. Clips are pose
functions of the frame index built from eased keys and loop waves: idle 8, walk 8, attack
9-10 (anticipation, contact frame, follow-through), hit 4 and die 8 frames at 12 fps.
`Clip.meta()` writes `impactAt` (start of the contact frame as a 0..1 fraction), which the
game uses to time-scale the attack so the contact lands on the sim's impact tick (B5).

**Team colour: tint underlay (chosen over pre-coloured variants).** Each frame is rendered
twice:

1. *Base pass*: everything, but team surfaces are a Holdout (a transparent hole) plus a
   faint white highlight and rim.
2. *Team pass*: only team surfaces are visible to the camera, shaded in grey
   (1.0 lit, 0.82 shadow, 0.55 outline). Other parts stay in the scene for AO.

The game draws `<frame>_team` with `sprite.tint = teamColour`, then `<frame>` on top in the
same container. Multiplying grey by the team colour gives exactly fill, shadow and outline per
A11, for blue/orange and both colourblind presets, from one atlas. Pre-rendered variants would
need 2 full sheets per unit (6 with the presets); the team layer adds only about 10-20% to
a sheet. Both frames share `sourceSize` and `anchor`, so they line up in Pixi.

```ts
const sheet = await Assets.load('bonker.json');           // meta.scale = 2 -> resolution 2
const team = new AnimatedSprite(sheet.animations['walk_team']);
const base = new AnimatedSprite(sheet.animations['walk']);
team.tint = 0x2f7df6;                                      // or 0xf28a1e, 0xf2c21e, ...
unit.addChild(team, base);                                 // flip unit.scale.x for side 1
```

`VisualDef.team` would be `{ kind: 'mask', maskTextures: ['<slug>_<clip>_<nn>_team', ...] }`.

**Atlas.** Frames are trimmed to their alpha bounds, shelf-packed with a 2 px gutter, and
written as a PixiJS spritesheet hash (`frame`, `spriteSourceSize`, `sourceSize`, `anchor`),
with `animations` per clip (`idle`, `idle_team`, ...) and `meta.scale` = render scale.
`meta.ageborn` carries `visualId`, `heightLu`, `pxPerLu`, `feetPx`, `anchorsLu` (head,
muzzle, hitCenter), per-clip `frames/fps/loop/durationMs/impactAt` and the team scheme.
`mockup.py` rebuilds every sprite from the PNG and JSON alone, which checks the atlas.

**Colour rule.** `sheet.colour_rule` measures, per frame, the share of the silhouette where
non-team pixels fall in the team hue bands (350-81 and 182-254 degrees) above 40%
saturation (DESIGN A11 MUST rule, limit 10%) and writes the worst frame to the stats.

## Measured (this container, CPU, 2 render threads, 12 samples)

| Unit | Frames | Render | Total incl. packing | Sheet (2x) | PNG8 | WebP q90 | WebP lossless | PNG32 | PNG8 at 1.5x |
|---|---|---|---|---|---|---|---|---|---|
| bonker | 38 | 16 s | 31 s | 768x844 | 125 KB | 158 KB | 331 KB | 587 KB | 84 KB |
| destrier_knight | 38 | 31 s | 50 s | 1280x1476 | 279 KB | 343 KB | 740 KB | 1385 KB | 185 KB |
| pulse_trooper | 37 | 14 s | 27 s | 896x680 | 120 KB | 154 KB | 289 KB | 544 KB | 82 KB |

Each frame is two Cycles renders (base and team) of 0.1-0.45 s. The JSON is ~28 KB
(~2 KB gzipped). Team frames are 22-36% of the atlas area; death frames 2-7 are 5-11%.

## Adding a unit

Create `units/<slug>.py` with `SLUG`, `NAME`, `HEIGHT_LU`, `CANVAS` and `FEET` (px at 2x),
`ANCHORS`, `build(rig)` and `clips()`; copy an existing unit as a template, add the slug to
`UNITS` in `render_all.py`, and iterate with `preview.py`. Palette colours come from the
DESIGN A11 age table; keep large non-team areas under 40% saturation in the team hue bands.
