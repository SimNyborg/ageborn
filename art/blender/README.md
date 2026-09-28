# Pre-rendered 3D sprite pipeline (art spike, v2)

This folder is a feasibility spike: it builds Ageborn units as simple 3D models in Blender
from Python code (no manual modelling, no downloaded assets), renders them with a
cel-shaded look to 2D sprite sheets, and packs PixiJS spritesheet atlases that the
`atlas` art tier (DESIGN B5) could load by data only. It is not wired into the game.

Everything is scripted: models, rigs, animation clips, materials, lighting, camera,
rendering, outlines, packing, previews, the lane mockups and the review sheets. Rerunning a
script gives the same result.

v2 applies the art director's critique of v1: a thick dark outer outline added in 2D,
lighting that survives mirroring with a visible shadow band, faces, silhouette fixes,
at least 18% team colour on every frame, a flatter camera yaw, real idle/walk amplitude,
attacks with holds, a smear frame and follow-through, a level fire frame with a per-frame
muzzle anchor, and a 3-frame death that hands off to shared `fx.dust_poof` / `fx.ko_stars`.

## Shipping sheets (v3, after the art director review)

The game's unit sheets are made with `--v3`, which renders at 2.46 px/lu, retimes the clips
(`ageborn_art/retime.py`: idle 8, hit 5, die 10/12 frames, per-role attack timing), uses the
colour-matched outline (`config.UNIT_OUTLINE_V3`) and the closer-to-profile biped yaw, and writes
two sheets per unit: `<slug>.hd.json/.png` (2.46 px/lu) and `<slug>.json/.png` (1.23 px/lu,
downsampled from the same frames). Bases and turrets (`world/`) do not use v3.

```sh
# every unit, then install into public/art/units/<age>/ and regenerate the summary and portraits
.venv-blender/bin/python art/blender/render_all.py --out /tmp/v3 --units all --no-fx --no-mockup --v3 --no-previews --install
.venv-blender/bin/python art/blender/gen_portraits.py /tmp/v3
node art/blender/gen_unit_manifest.mjs
```

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
# shared FX, every unit, previews, lane mockups and review sheets (about 1.5 min, 2 threads)
.venv-blender/bin/python art/blender/render_all.py --out /tmp/art-spike

# one unit, reusing the FX already rendered, at the size-budget scale
.venv-blender/bin/python art/blender/render_all.py --out /tmp/art-spike --units bonker --no-fx --scale 1.5

# fast look-dev: a few frames of one unit (2x on top, 1x blue/orange, black silhouette)
.venv-blender/bin/python art/blender/preview.py bonker idle:0 attack:2 attack:4 --out strip.png

# rebuild only the lane mockups (and lane_anim.gif), or only the review sheets
.venv-blender/bin/python art/blender/mockup.py /tmp/art-spike
.venv-blender/bin/python art/blender/review.py /tmp/art-spike [--before <v1 dir>]
```

Outputs per unit (`<slug>` = `bonker`, `destrier_knight`, `pulse_trooper`) and per shared
effect (`fx_dust_poof`, `fx_ko_stars`):

| File | What |
|---|---|
| `<slug>.png` | shipping atlas: 256-colour palette PNG (base and team frames) |
| `<slug>.json` | PixiJS spritesheet JSON (frames, `animations` in playback order, `meta.scale`, `meta.ageborn`) |
| `<slug>.rgba.png`, `<slug>.webp`, `<slug>.q90.webp` | RGBA master and WebP variants, for size comparison |
| `<slug>_<clip>_1x.gif`, `<slug>_<clip>_3x.gif` | previews at in-game size and 3x, with real frame timing; the die GIF includes the shared poof and stars |
| `<slug>_contact.png` | every unique frame, blue and orange rows per clip |
| `<slug>_team_layer.png` | one frame as base (team holes), grey team layer, and composites in all 5 team colours |
| `<slug>.stats.json` | render time, sheet size, colour rule, team coverage, clipped frames |
| `lane_mockup_1280.png`, `lane_mockup_2560.png` | the lane at true scale, DPR 1 and DPR 2 |
| `lane_mockup_zoom.png`, `lane_mockup_dpr2_crop.png` | a 3x nearest-neighbour crop of the fight at DPR 1, and a DPR 2 crop |
| `lane_anim.gif` | the lane animated for 3 s at DPR 1 (walkers move, a unit dies every 1.6 s) |
| `review/` | `silhouettes.png`, `mock_grey.png`, `size32.png`, `showcase.gif`, `before_after.png` |
| `_frames/<slug>/` | raw renders; `final/` holds the outlined frames that are packed (not shipped) |

## How it works

```
art/blender/
  render_all.py        entry point: FX, units, mockups, review sheets
  preview.py           look-dev strip for a few frames
  mockup.py            lane mockups and lane_anim.gif, built from the packed atlases only
  review.py            art-direction review sheets, built from the packed atlases only
  ageborn_art/
    config.py          scale, camera, light, finishes, outlines, springs, team colours
    colors.py          hex/linear conversion, darken, mix, warm shadow shift
    geometry.py        bmesh primitives in lu: blob, capsule, lathe, star, slab, clip; hull; ribbon
    materials.py       emission-only toon shading, interior lines, team layer switch
    rig.py             joints (empties) + parts (meshes), rest scale, secondary joints, trackers
    anim.py            keys, per-frame tables, Clip (sequence + durations), follow-through spring
    fx.py              standard clip timing and the death hand-off metadata
    render.py          follow-through pass, smear ribbon, base/team/smear render passes
    sheet.py           outer outline, checks, trim/pack, Pixi JSON, PNG8/WebP, GIFs, contact sheet
    pipeline.py        one unit or effect end to end
  units/
    bonker.py          Stone Age infantry (club)
    destrier_knight.py Medieval heavy, rider rig (horse + knight, shield, lance)
    pulse_trooper.py   Future ranged (plasma rifle)
    fx_dust_poof.py    shared fx.dust_poof (5 frames)
    fx_ko_stars.py     shared fx.ko_stars (3-frame loop)
```

**Space and scale.** 1 Blender unit = 1 lu. Characters face +X, up is +Z, +Y is away from
the camera. The camera is orthographic at `0.82 px/lu x RENDER_SCALE` (DESIGN A11 world
scale), tilted down 16 degrees; bipeds are yawed 18 degrees toward the camera, rider,
quadruped and vehicle rigs 10 degrees (`YAW_DEG`), so the horse reads long and facing
direction stays a clear team cue. The feet land on a fixed pixel, which becomes each frame's
`anchor`, so the game positions sprites exactly like the procedural rigs.

**Toon look in Cycles.** Cycles has no Shader-to-RGB, so shading is computed from normals
in the node tree and output as emission. The light comes from above and in front with **no
side component**, so mirrored opponent sprites are lit exactly like the player's. The lit
band ends at `dot(N, L) = 0.30`, which puts undersides, chins, under-arms, inner legs and
bellies in shadow; the shadow colour is fill x 0.74 (matte) or x 0.65 (metal), and warm
materials turn 8 degrees toward red in shadow. Inside each band there is only a slight
gradient (8%) and a light 3 lu ambient occlusion, so the shading reads as two clean tones
plus one highlight. Hair and fur get a small brown-tinted highlight instead of a white
streak. No lamps: 12 samples antialias the edges and no denoiser is needed.

**Polished bronze.** The Bronze Age accents (helmets, greaves, shield rims, bosses, blades) use
the `bronze` finish: polished bronze #B8863B with a big warm specular (a cream highlight over the
upper half of a part) and a desaturated shadow band (it reflects the surroundings). That keeps
the metal reading as polished bronze while the A11 colour rule (<= 10% saturated orange) holds;
`bronze_rich` has a tighter highlight for units whose accents are a small share of the silhouette
(the Bronze Colossus).

**Custom death clips.** A unit may author its own die clip with more than 3 poses (a `sequence`
and `durationsMs` of its own); `retime` then leaves it alone. The Bronze Colossus (burst), War
Chariot and Scorpion (wrecks), Land Dreadnought (crew bails out), Mothership (crash) and Warp
Stalker (blink-out, no dust poof: `fx: []`, `blinkOut: true`) do this.

**Outlines.** Two kinds:

1. *Outer outline (2D, after rendering).* `sheet.outline` widens the combined silhouette of
   the base and team frames by 3 px at 1x (6 px at 2x) with an antialiased disk and also
   covers the silhouette's own outer 0.9 px, so the line's inner edge is crisp. Each line
   pixel takes the nearest fill colour, propagated from pixels a few px inside the
   silhouette, x 0.40, with HSV value capped at 0.38. Line pixels next to team surfaces go
   into the `_team` frame as grey 0.40 instead, so the tint gives team colour x 0.40.
   Shared FX use a thin line (fill x 0.85 for dust).
2. *Interior lines (3D).* Inverted hulls 1.2 lu thick at fill x 0.60 separate parts inside
   the silhouette.

**Rigs and clips.** Joints are empties parented in a tree; parts are meshes parented to
joints (the A11 cutout rigs, in 3D). A pose is `{joint: {r, rx, rz, x, y, z, s, sx, sy, sz,
alpha, show, hide}}`; `r` is the side-plane angle, counter-clockwise on screen. A clip has
`frames` unique poses played in `sequence` order with per-step `durationsMs`, so holds and
ping-pong loops cost no atlas space:

| Clip | Unique frames | Playback |
|---|---|---|
| idle | 4 | 0-1-2-3-2-1 at 200 ms = 1.2 s; hips bob 2.4 lu, squash +-4%, head and weapon one pose behind |
| walk | 8 | 62/63 ms = 0.5 s cycle; lowest on contact frames 0 and 4, highest on passing frames 2 and 6 |
| attack (melee) | 8 | 83, 83, 167 (held extreme), 42 (smear), 125 (held impact, squash 0.85/1.15), 83 x 3 |
| attack (trooper) | 8 | raise, brace, charge, charge (125), fire (gun level), recoil, vent puff, settle (125) |
| hit | 3 | 83 ms each |
| die | 3 | fling with a 20 degree spin, squash, hand-off to the shared poof and stars |

`Clip.meta()` writes `impactAt` from time (start of the impact frame / clip length), which
the game uses to time-scale the attack so the contact lands on the sim's impact tick (B5).

**Follow-through.** Plume, pennant, tail, hair tufts, the skirt hem and the antenna are
*secondary joints*. Before a clip is rendered, the rig is posed through its playback and a
damped spring per joint (2.2 Hz, damping 0.42, about 20% overshoot) reacts to its parent's
turning and to the pivot's changes of speed; the result is added to each frame's pose.
Loops are simulated three times so they stay seamless.

**Smear.** On a melee attack's smear frame, a flat ribbon follows the weapon head's path from
the previous frame (weapon colour mixed 50% with white, no outline), and the weapon head is
stretched along the motion. It is rendered as a separate pass and composited under the unit.

**Per-frame anchors.** Trackers are points on joints whose screen position is exported per
frame as `meta.ageborn.clips.<clip>.anchorsLu` (screen-plane lu from the feet, y up):
`muzzle` for the trooper (the projectile spawns there on the fire frame), `lanceTip`,
`clubHead`. The walk clip also gets `strideLu` and `naturalSpeedLuPerS` (from a foot
tracker): the game plays the walk at `unit speed / naturalSpeedLuPerS` so feet do not slide.

**Death.** Each unit's die clip is 3 frames; its metadata lists the shared effects to spawn
(`fx`: id, `atMs`, `offsetLu`, `scale` = unit width / 80 lu, `loops`) and `hideUnitAtMs`.
`fx.dust_poof` (5 frames): frame 0 is the biggest, one round cloud about 1.2x the unit's
width with a white flash core; frames 1-4 grow to 1.3x, rise 6 lu and break into 6 puffs
that shrink (never fade: fades band in a 256-colour PNG). `fx.ko_stars`: 3 pale-yellow stars
circling, a seamless 3-frame loop.

**Team colour: tint underlay.** Each frame is rendered twice:

1. *Base pass*: everything, but team surfaces are a Holdout (a transparent hole) plus a
   faint white highlight and rim.
2. *Team pass*: only team surfaces are visible to the camera, shaded in grey
   (1.0 lit, 0.74 shadow, 0.60 interior line; the outer line adds grey 0.40).

The game draws `<frame>_team` with `sprite.tint = teamColour`, then `<frame>` on top in the
same container. Multiplying grey by the team colour gives exactly fill, shadow and outline
for blue/orange and both colourblind presets from one atlas. Both frames share
`sourceSize` and `anchor`, so they line up in Pixi.

```ts
const sheet = await Assets.load('bonker.json');           // meta.scale = 2 -> resolution 2
const clip = sheet.data.meta.ageborn.clips.walk;          // sequence + durationsMs
const frames = (name: string) => sheet.animations[name].map((texture, i) =>
  ({ texture, time: clip.durationsMs[i] }));
const team = new AnimatedSprite(frames('walk_team'));
const base = new AnimatedSprite(frames('walk'));
team.tint = 0x2f7df6;                                      // or 0xf28a1e, 0xf2c21e, ...
unit.addChild(team, base);                                 // flip unit.scale.x for side 1
```

`VisualDef.team` would be `{ kind: 'mask', maskTextures: ['<slug>_<clip>_<nn>_team', ...] }`.

**Atlas.** Frames are trimmed to their alpha bounds, shelf-packed with a 2 px gutter, and
written as a PixiJS spritesheet hash (`frame`, `spriteSourceSize`, `sourceSize`, `anchor`),
with `animations` per clip in playback order (`idle`, `idle_team`, ...) and `meta.scale` =
render scale. `meta.ageborn` carries `visualId`, `heightLu`, `widthLu`, `pxPerLu`,
`feetPx`, static `anchorsLu`, per-clip `frames/sequence/durationsMs/loop/impactAt/
smearFrame/anchorsLu/fx`, and the team scheme. `mockup.py` and `review.py` rebuild every
sprite from the PNG and JSON alone, which checks the atlas.

**Checks** (in each `<slug>.stats.json`):

- *Colour rule* (DESIGN A11 MUST, limit 10%): share of the silhouette where non-team pixels
  fall in the team hue bands (350-81 and 182-254 degrees) above 40% saturation.
- *Team coverage* (limit 18% on every frame): share of the silhouette whose visible surface
  is team-coloured, before the outer outline (`minFillPct`) and after (`minWithOutlinePct`).
- *Clipped frames*: frames whose silhouette touches the canvas edge (canvas too small).

## Deviations from DESIGN A11 (need a note in `docs/requests/` before this ships)

This spike may only write under `art/blender/`, so the requests are not filed. Proposed:

1. **Outline darkness**: A11 says "fill colour darkened 45%". The pre-rendered route uses a
   3 px outer line at fill x 0.40 capped at HSV value 0.38 (pale parts would otherwise get
   mid-grey lines that vanish against the backdrop), and thin interior lines at fill x 0.60.
2. **Shadow depth**: A11 says "shadow = fill darkened 18%". The pre-rendered route uses 26%
   (x 0.74; metal x 0.65) with an 8 degree warm hue shift, because an 18% band does not
   survive down-scaling to 56 px.

## Measured (this container, CPU, 2 render threads, 12 samples)

See `REPORT.md` in the spike output for the current table (render time, sheet sizes at 2x
and 1.5x, colour rule and team coverage per unit) and the size budget for 35 units.

## Adding a unit

Create `units/<slug>.py` with `SLUG`, `NAME`, `HEIGHT_LU`, `CANVAS` and `FEET` (px at 2x),
`ANCHORS`, `build(rig)` and `clips()` (use the timings in `ageborn_art/fx.py`); copy an
existing unit as a template, add the slug to `UNITS` in `render_all.py`, and iterate with
`preview.py` (watch the black silhouette row and the printed team share). Palette colours
come from the DESIGN A11 age table; keep large non-team areas under 40% saturation in the
team hue bands. If `stats.json` lists clipped frames, enlarge `CANVAS`/`FEET`.
