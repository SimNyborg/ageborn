# Realistic style: the shipping pipeline for units, turrets, bases and backdrops

The owner chose an ultra-realistic look (docs/decisions.md, A18.9.5). This folder is the scripted
Blender pipeline that restyles the game art in that look while keeping the game's sheet contract
exactly (same files, slugs, clip names, frame naming, anchors, trackers and the team tint layer), so
the game loads the new art unchanged and the simulation's timing (and so balance) never changes.
The Stone Age is done here and is the reference for the other ages.

Everything is code: meshes, rigs, materials, lighting, poses, clips, rendering, outlines, packing,
previews and review sheets. Rerunning a script gives the same result.

## Install and run

Python 3.11 venv with `bpy==5.0.1 pillow numpy` (see `art/blender/README.md`). Cycles on CPU only.
Use at most 2 Blender processes at once (each renders with 2 threads, `core.THREADS`).

```sh
PY=<venv>/bin/python
R=art/blender/styles/realistic/render.py
OUT=/tmp/realistic                      # scratch output (frames, sheets, GIFs, stats)

$PY $R preview bonker attack:3 attack:4 die:6 --out $OUT       # look-dev strip: 2x grid + 1x blue/orange
$PY $R unit bonker --out $OUT [--install]                       # one unit end to end
$PY $R unit turret:rock_tosser --out $OUT [--install]           # one turret (turrets/<age>.py)
$PY $R unit base:stone --out $OUT [--install]                   # the base (bases/<age>.py)
$PY $R refinish bonker --out $OUT [--install]                   # sheets/GIFs again from rendered frames
$PY $R age stone --out $OUT --parallel 2 --install              # a whole age (+ manifest summary, portraits)
$PY $R backdrop stone --out $OUT [--install]                    # far/mid backdrop layers
$PY $R ground tar_pits --out $OUT [--install]                   # an arena ground (backdrops/<arena>.py)
$PY $R install bonker,turret:rock_tosser --out $OUT             # copy finished sheets into public/art
$PY $R post stone --out $OUT                                    # regenerate unit manifest + card portraits
$PY $R contact stone --out $OUT                                 # contact sheet from the installed sheets
```

`--install` copies `<slug>.png/.json` and `<slug>.hd.png/.hd.json` into `public/art/units/<age>/`
(turrets: `public/art/turrets/<age>/`, bases: `public/art/bases/`, 1x only); `age --install` and
`post` then run `node art/blender/gen_unit_manifest.mjs` (the unit summary the manifest reads) and
`art/blender/gen_portraits.py` (card stills from the first idle frame). Check with
`npx vitest run src/visuals` and a battle screenshot.

Timing on this container (4 shared CPUs, 2 threads per process, 14 samples): 5-10 s per unit
frame when the machine is idle, 30-50 s when other jobs load it; an infantry unit has 39 frames
(3-8 min), a turret 17 (1.5 min), the Mammoth 36 big frames (9 min). The whole Stone Age (8 units,
4 turrets, base, backdrop, ground) is about 1 hour of rendering on 2 processes.

## Files

```
render.py              the command line (above)
lib/core.py            scene reset, light rig, camera, PBR material factory, mesh builders
                       (metaball blobs, lathe, tube sweeps, boxes), armature rig and skin weights,
                       screen projection (screen_lu, place), trackers (Rig.world_point)
lib/mats.py            material library: skin, hair, fur, coat, leather, rawhide, wood, bark, flint,
                       stone, moss, bone, ivory, horn, hoof, straw, burlap, rope, clay, feather, ochre,
                       glow and the team surfaces (team_hide, team_cloth, team_paint, team_feather)
lib/biped.py           realistic human: skeleton, anatomical metaball body, FK/IK pose solver,
                       Catmull-Rom key interpolation (keyed), planted-foot walk, far_grip, abs_to_hand
lib/quad.py            generic quadruped (any 5-point leg chains): bones, foot IK, gait steps
lib/horse.py           the study's horse (a Quad-like rig kept for the medieval knight study)
lib/motion.py          shared clip timing of the game sheets, breathing idle, walk torso, arm
                       swing, knockback hit, heavy fall, dust frames, the biped clip list
lib/props.py           the stone club and volumetric dust (study)
lib/pipe.py            render passes (beauty, team mask), team/base layer split, downsample,
                       thin dark outline, 2D dust, shelf packer, PNG8
lib/game.py            the game contract: Clip, render (+ per-frame trackers, 2D weapon smears),
                       finish, sheets + JSON (units: hd + 1x; world: 1x), GIF previews, contact
                       strip, stats (team coverage, colour rule, clipped frames), install
lib/world.py           turret and base clip contracts, visibility groups, BASE_MOUNTS
lib/review.py          age contact sheet built from the installed sheets
units/<age>/<slug>.py  one unit each (the stone age: bonker, pebbler, spear_hunter, drum_shaman,
                       training_dummy, sabertooth, tuskback, mammoth_matriarch; the medieval age: footman,
                       pikeman, longbowman, friar, destrier_knight, battering_ram, ursa_paladin)
lib/medieval.py        the medieval kit: steel, mail, wool and team materials, hauberk, tabard, coif,
                       helmets, plate harness, heater shield, pavise, arming sword, and pleated drapes
                       (`drape`, `drape_hem`, `fringe`: caparisons and trappers that read as heavy wool)
turrets/<age>.py       the age's four turrets (TURRETS)
bases/<age>.py         the age's base (MODULE)
backdrops/<age>.py     the age's far and mid backdrop layers; backdrops/<arena>.py an arena ground
units/future/pulse_trooper.py, units/stone/bonker_study.py
                       the original style study (study clip timing, `pipe.Clip`); convert them to
                       the game contract like units/stone/bonker.py before shipping them
```

## The look (keep it consistent across ages)

The art director's rulebook for every age (proportions, materials, palettes, light, outline,
animation timing, review checklist) is `STYLE_GUIDE.md` next to this README.

- **Scale.** 1 Blender unit = 1 lu. Characters face +X, up is +Z, +Y is away from the camera. The
  orthographic camera is tilted down 12 degrees (`core.ELEV_DEG`); bipeds are yawed -24 degrees,
  quadrupeds, turrets and bases -12 degrees. Frames render at 2x the 1x sheet density
  (`core.RENDER_MULT = 2`: 2.46 px/lu for units, 2.05 for the huge ones) and are box-downsampled
  to 1x (1.23 / 1.025 px/lu), which are exactly the densities of the shipped sheets.
- **Light.** One warm key light from above and in front with no side component (mirrored opponents
  are lit identically), two symmetric cool back rims, a sky/earth gradient world for ambient and
  bounce, soft shadows onto a shadow catcher (a contact shadow under the feet). AgX Punchy.
- **Materials.** Principled BSDF with procedural colour and roughness variation and a fine bump
  (`core.mat`); use the presets in `lib/mats.py`. Large animals want a fine grain (`coat`,
  `fur(nscale=...)` 2-4) or they read blotchy. Skin, wood and fur are desaturated browns: keep
  non-team areas under 40% saturation in the team hue bands (the colour rule; stats report it).
- **Team colour.** Team surfaces use a `team_*` material and `C.team(obj)`. They render into a
  grey layer that the game tints (`<frame>_team`, drawn under `<frame>` whose team areas are
  holes). Put team colour on large parts: vests, kilts, cloaks, sashes, pelts, caparisons,
  blankets, banners, pennants. Aim for 15-30% of the silhouette (stats: `teamCoverageMin`).
  The grey layer is `(lum / lref) ** pipe.TEAM_GAMMA` (2.0; a unit may set `TEAM_GAMMA`), so the
  dye keeps its folds and shading instead of reading as flat plastic paint. Give every team drape
  a crafted edge: a dark leather hem just proud of its free edges (`mats.hem_axes`) and, where it
  suits, fringe or beads; keep drapes thin, never a puffy pillow.
- **Outline.** A thin dark line (0.85 px at 1x, 1.35 px at 2x) around the whole silhouette,
  added in 2D, so units read against any backdrop.
- **Faces.** Heads are about 1/7.5 of the height; keep the chin slightly down (`head` a few
  degrees negative) or the profile reads as looking up.
- **Size.** Pixels under 6% alpha are dropped before packing (`game.ALPHA_FLOOR`, about -25% PNG
  size). Measured on the Stone Age: infantry sheets are 20-40% smaller than the old cartoon ones;
  fur-heavy Legendaries are larger, so a unit may ship below the nominal density with
  `SHEET_FACTOR` (the Mammoth uses 0.82: 0.84 / 1.68 px/lu; `meta.pxPerLu` records it, so the game
  sizes it correctly). Age totals: unit sheets 2.86 MB hd + 1.11 MB 1x (old 2.78 + 1.09).

## Motion rules (docs/ui-plan.md 5.8)

- Bodies never squash or stretch. Weight comes from timing: held anticipation, a fast strike, a
  held impact, a longer recovery. Knockback on hit is a pose and a few lu of offset.
- Sign convention: positive `hips`/`spine`/`chest`/`neck`/`head` angles lean BACK (look up);
  forward leans are negative (`motion.flip_torso` converts keys written the other way).
- Poses are dicts of joint angles and IK targets; `biped.keyed` interpolates keyed poses with
  Catmull-Rom in milliseconds on the clip timeline. A clip's frame i is posed at the start of its
  first step (`Clip.times`; override `times=` to pose the smear frame mid-swing).
- Strikes: tag weapon objects `o["weapon"] = 1` and give the strike frame a `blur={frame: ms}`;
  the weapon is rendered at many sub-times over that span into a 2D smear under the crisp frame
  (`SMEAR_COLOR`, `SMEAR_ALPHA`, `SMEAR_N` per unit). Units without weapons stay crisp.
- Follow-through: hair tails, feathers, cloaks, pennants and banners are extra bones driven
  with a phase lag (`EXTRA_BONES`, `bones={...}` in the pose).
- Death: a heavy fall (bipeds on their back, animals collapse onto the chest), a bounce, and 2D
  dust composited in front (`motion.dust_frames`); the die clip's `fx` hands off to the shared
  `fx.dust_poof` near the end (no cartoon KO stars) and `hideUnitAtMs` = the clip length.

## The contract (do not change)

- Files: `public/art/units/<age>/<slug>(.hd).json/.png`, `public/art/turrets/<age>/<slug>.json/.png`,
  `public/art/bases/<age>.json/.png`, `public/art/backdrops/<age>/{far,mid}.webp + layers.json`.
- Frames: `<slug>_<clip>_<nn>` and `<slug>_<clip>_<nn>_team`, anchored at the feet; `animations`
  in playback order; `meta.scale` 1.5 (1x) / 3 (hd) for units (1.25 / 2.5 for 1.025 px/lu units),
  1.5 for turrets, 1.25 for bases; `meta.ageborn` with `pxPerLu`, `heightLu` (keep the old value),
  `anchorsLu.head/hitCenter`, per-clip `sequence`, `durationsMs`, `impactFrame`, `impactAt`,
  `smearFrame`, per-frame `anchorsLu` (trackers such as `muzzle`, `clubHead`), walk `strideLu` and
  `naturalSpeedLuPerS`, die `fx` and `hideUnitAtMs`.
- Clip lengths: copy the old sheet's frame counts and `durationsMs` (`lib/motion.py` has the two
  standard sets); the game warps attacks so `impactAt` lands on the sim's impact tick, and plays
  walks at `unit speed / naturalSpeedLuPerS`.
- World: turret clips `mount/idle/fire/build/destroyed` (head-only idle and fire, `pivotLu`,
  per-frame fire `muzzle`); base clips `body` (4 crumble stages, `mount0..3` trackers on the
  shelves, exactly `BASE_MOUNTS`), `flagA`, `flagB`, `treasury` (3).

## Restyling another age

1. Read the age's old scripts (`art/blender/units/<slug>.py`, `art/blender/world/*_<age>.py`) for
   the design brief, and the installed JSON for the clip frame counts, durations, anchors and
   tracker names (`python3 -c "import json; ..."`, see how `units/stone/*.py` mirror them).
2. Copy the closest stone script (biped: `bonker.py`, two-handed weapon: `spear_hunter.py`,
   thrown/ranged: `pebbler.py`, `drum_shaman.py`; quadruped: `sabertooth.py`, `tuskback.py`;
   mount with riders: `mammoth_matriarch.py`; turrets and base: `turrets/stone.py`,
   `bases/stone.py`) into `units/<age>/`, `turrets/<age>.py`, `bases/<age>.py`.
3. Iterate with `preview` on a few frames at a time (look at the 2x grid and the 1x rows at
   in-game size), then `unit`, check `<slug>.stats.json` (clipped frames, team coverage, colour
   rule) and the GIFs, then `age <age> --install`, `contact`, and a battle screenshot.
