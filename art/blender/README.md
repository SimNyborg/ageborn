# Pre-rendered 3D sprite pipeline (art spike, v2)

> **Cartoon style ships (owner decision 2026-09-30):** this cartoon pipeline is the shipping look,
> raised with the cartoon kit v2 below. The realistic restyle in [`styles/realistic/`](styles/realistic/README.md)
> was rejected by the owner and is parked; do not use its look.

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

## Cartoon kit v2 (art director plan 2026-09-30)

Units opt in with `NO_RETIME = True` and author their final clips with `ageborn_art/moves.py`
(Stone Age done first; see `units/bonker.py` as the reference):

| Module | What |
|---|---|
| `moves.py` | timing tables that keep every shipped `durationMs`, attack `impactAt` and die `fx` time (`SMALL_MELEE_MS`, `HEAVY_MELEE_MS`, `HIT_MS`, `DIE_MS[_HEAVY]`, `die_meta`), `clip()`, `check_contract()`, `body_about()` (spin and squash about the belly, not the feet), `walk_v2`, `idle_v2`, `hit_light`, `hit_beast`, death styles `die_d1` (fling and spin), `die_d3` (dizzy sit), `die_d4` (legs-up flop; `roll=-0.62` topples a heavy onto its side) |
| `face.py` | expression decals laid on the head by camera ray casts: `eye_marks` (lids, squeeze, X, spiral) and `mouths` (grit, yell, O, KO tongue); `expr("yell", "squeeze")` in a pose shows them |
| `smear2.py` | 2D smears and accents painted over the finished frame: `arc` (crescent or ring), `claw`, `streak`, `dust`, `burst`, `rings`; a clip opts in with `moves.clip(..., overlays={frame: [spec]})`; a spec's `pose_from` (a pose dict) replaces the start frame, e.g. the smear frame's own pose with only the body yaw turned back, for a clean spin ring (Photon Knight) |
| `kit_gunpowder.py` | Gunpowder helpers (its own module; `rigs_gunpowder.py` is also imported by the Scorpion, War Chariot and Land Dreadnought, so its API stays unchanged): `anchor` (the cream anchor emblem decal), `stripes`, `head_geos` (an unparted head for the face kit), `horse_leg` (knee, hock, fetlock, hoof), `smoke_cloud` (a big two-tone powder cloud on a hidden joint) |
| `kit_medieval.py` | Medieval helpers (its own module, so the `rigs_medieval.py` API the Bronze rigs import stays unchanged): `face2` (eyes, pupils, brow and mouth joints plus the face kit in one call), `scr` (screen position of a 3D point, for decals), `paw` (the parchment bear-paw emblem), `hit_armoured` (a dip behind the shield, the helmet clanks down), `die_d2` (plank topple, face first or `back=True`), `d3_sit` (the dizzy-sit legs, torso and arms) |
| `kit_future.py` | Future helpers (own module; `rigs_future.py` is also used by the Cosmic rigs and the Bronze Colossus, so its API stays unchanged): `visor_face` (emissive robot-eye glyphs laid on a dark visor as decals, one joint per expression: `eyes`, `g_angry`, `g_squint`, `g_hurt`, `eyes_x`, `g_spiral`, `g_wide`, `g_blink`, `g_happy`; `glyph(name)` shows one), `hexmark` (the pale Future hex emblem decal), `strip` (emissive light strips), `rivets`, `hit_mech` (a hard jolt with no squash) |
| `kit_industrial.py` | Industrial helpers: `head_face` (round head plus the whole face kit), `cog` (the cream cog emblem decal), `stripes` (hazard bands), `loose` and `hat_pop` (a hat or tool flying off in a D1 death and landing behind the head), `gauge` (a brass pressure gauge with a needle joint), `aim_arm` (arm channels from world angles) |
| `kit_modern.py` | Modern helpers (its own module; `rigs_modern.py` is re-exported by the Industrial rigs, so its API stays unchanged): `chevron` (the cream rank-chevron emblem decal), `brodie` and `round_helmet` (netting, rivets, an optional team helmet cover), `grenade`, `canteen`, `pouches`, `mud` (flat weathering patches), `two_hand` (a two-handed prop from world angles with the far hand by IK), `crew_head` (a small crew head with the face kit), `crew_runner` and `run_pose` (a standalone crewman with legs for vehicle bail-outs) |
| `kit_cosmic.py` | Cosmic helpers (its own module; `rigs_cosmic.py` keeps its API): `visor` (a dark visor cut from a shell over a helmet or hood, carrying the `kit_future.visor_face` glyph eyes in light violet or mint), `starmark` (the pale Cosmic star emblem decal), `specks` (four-point star specks for starry linings), `seam` (emissive panel seams), `hit_flyer` (a tilt and a 4 lu drop, a wobble back up) |

## Animation standard (ANIM_SPEC 2026-10-02; Stone pilot done)

Units re-rendered to the standard walk at the sim's ground speed (card speed x 1.25) with planted
feet, and get 2-3 attack variants. Tools:

| Module / file | What |
|---|---|
| `gait.py` | `Leg` (two-bone IK chain, optional `foot` joint and toe/heel roll pivots), `solve()` (IK from the posed rig, so trunk pitch, hip bob and body rest scale are included), `Gait` (per-foot stance/swing trajectories: a planted foot moves back at exactly the speed; toe-off roll, `drag` toe trail, heel kick, lift), `biped_feet`, `quad_feet`, `TROT`, `WALK4`, `quad_walk()` |
| `moves.walk_v3` / `walk_clip` | G1 bounce jog (8 frames, flight on UP) and G2 brisk walk: hip bob and torso squash by key pose (`JOG_BOB`, `BRISK_BOB`), lean, twist, head counter-nod, arm pump with bent elbows, a carry pose hook (`extra`), legs by IK; `walk_clip` writes the cycle and `gait` meta |
| `rig.rest_offset` | a constant offset on a joint (the upper body sits higher so longer legs show without moving every part) |
| `rigs_stone.CaveBody(thigh_z=, foot_joint=, far_shade=)` | longer legs, `foot_r/l` joints for planted feet, the far leg 20% darker |
| `rigs_bronze.skeleton_v3`, `sandal_legs_v3`, `walk_legs_v3`, `jog_gait`, `plant` | the Bronze biped with walk-v3 legs (foot joints, sole trackers, darker far leg, lifted upper body), its G1 jog, and IK-planted feet for attack poses (`plant(rig, pose, legs, r=(x, lift, angle), l=...)`: a wide stance lowers the body by at most 4 lu, then the back foot drags) |
| `moves.clip(..., reuse={frame: (clip, frame)})` | a variant frame that is an A frame: not rendered again, the atlas names the core frame (no pixels) |
| `moves.check_variants` | B and C have A's `durationMs`, `impactAt` and pre-impact sum |
| pipeline | `naturalSpeedLuPerS` from the planted frames of every `_foot*` tracker (`walk_metrics`), `plantedDriftLu`, `contacts`, `gait`; `holdStep` (longest pre-impact step unless given), `holdLoop`, the impact-frame `muzzle` per attack clip (`noMuzzle` for melee units with a rider tracker); `attack_b`, `attack_c`, `attack_alt` go to the extras sheet `<slug>.x.json` / `.x.hd.json` |
| `check_walk.py` | phone-scale walk gate per gait (step, natural speed vs ground speed, drift, bob, feet apart and contact gap, vehicle motion energy) |
| `lane_gif.py` | phone-scale lane GIF and time-lapse strip at ground speed with the R2 frame lock (and `--before` an old sheet played the old way) |
| `check_timing.mjs` | the walk is exempt (its length follows from the gait); variants must match A; every sheet's impact step (`impactStep`, else `impactFrame` through `sequence`) must start at `impactAt`, and `holdStep` / `holdLoop` must be steps before it |

Walk recipe (see `units/bonker.py`, `units/tuskback.py`): define `LEGS` and a `Gait` at the
ground speed (cycle 520-660 ms for small bipeds, stance about 0.38 so the UP frame is airborne,
`drag=0.3` so the back toe still reads on the contact frame), a carry pose (club on the shoulder,
spear sloped back, sling low), then `M.walk_v3(...)` or `G.quad_walk(...)`, and check the IK
report (`gait.solve(report=[])`): a planted foot must never fall short. Lower the hips at the
contact frames (or the trunk with `base_z`) until it does not. Variants reuse A's read and settle
frames; second attackers (riders) get `attack_alt` with the body in idle pose 0.

A level horizontal swing (Footman's cleave, the Ursa Paladin's hammer) keeps the arm level (`a = 0`)
and turns it about the vertical axis with the arm joint's `rz` (180 back, 90 away, 0 forward);
tilt the swing plane a little (arm `a` +20 on the wind-up) or the smear reads as a thin line, and aim
the impact frame at a world yaw of about 0 (arm `rz` = minus the torso's `rz`), because a level
weapon pointing toward the camera reads as pointing down.

Review rules from the Stone pilot (apply to every age):

- Pick the attack a viewer expects from the body and weapon (the owner addendum in the plan wins
  over the plan table): beasts bite, gore, pounce or trample; clubs swing overhead; spears thrust.
- The held extreme (longest pre-impact frame) must read as a black silhouette at 1x, weapon clear
  of the head and body.
- A full-turn `arc` smear whose inner point is the hand needs `band` 0.3-0.45 (a hollow ring;
  without it the whirl paints a solid disc).
- A D4 side topple must not keep a frame between rx -70 and -100 (edge-on, renders as a flat pill);
  choose the kept steps (Mammoth `DIE_KEEP`).
- D3 sits must change the silhouette: hips about -12 lu, thighs 80-85 forward, torso back 28, arms wide.
- Small riders get `rig.rest_scale[joint] = 1.2`; a rider with a sim attack throws in its own
  `attack_alt` (ANIM_SPEC R3), never on the body's impact beat; one without never throws.

Index words (pilot review B2): a **step** indexes `durationsMs`, `sequence` and the atlas animation
list; a **frame** indexes the unique poses (`frames`, per-frame `anchorsLu`). `Clip(impact=...)` takes a
frame; the meta writes it as `impactFrame` and also writes `impactStep` (where that frame plays). A
variant that repeats frames before the impact (`sequence=[0, 1, 0, 1, ...]`) has a later impact step
than its frame index. `holdStep` and `holdLoop` are steps; `muzzle` comes from the impact frame. The
runtime times the impact from `impactAt`, so a wrong index can only show the wrong pose; the timing
check catches it.

### Recipe: bring another age to the standard (after the Stone pilot review, 2026-10-02)

Do one age at a time; keep raw frames for that age only (`--out` under the scratchpad, delete
`_frames/` once installed). At most 2 Blender processes with 2 threads each (`config.THREADS = 2`).

1. **Read** ANIM_SPEC (section 2 for the unit's gait, appendix B for its A/B/C) and the age's unit
   files. Units that already opt into the cartoon kit (`NO_RETIME = True`) only need the steps below.
2. **Rig** (only for legged units): longer legs and planted feet, as Stone does: `CaveBody(thigh_z=,
   foot_joint=True, far_shade=True)` or the age's own body builder with `foot_r/l` joints, a 20% darker
   far leg and `rig.track("_foot_r"/"_foot_l", ...)` trackers on the soles (`pipeline.walk_metrics`
   needs them). Hems at least 9 lu above the soles, feet at most 9 lu long. Keep `heightLu` within 2 lu.
3. **Walk**: `LEGS` + `G.Gait(frames, cycle_ms, ground_speed, feet, stance, ...)` at ground speed =
   card speed x 1.25 (cycle 520-660 ms small bipeds, 480-640 robed, 850-1300 heavies; trot 560-800,
   bound 480-640, 4-beat 1200-1600 with 12 frames). A **carry pose** that differs from the idle guard
   (weapon on the shoulder, spear sloped back). Then `M.walk_clip("walk", RIG, _walk, GAIT, "<gait>")`
   or `G.quad_walk(...)`. Read the IK report: a planted foot must never fall short. Wheels, treads,
   hover and fly follow ANIM_SPEC G6-G8 (no planted feet: the runtime does not frame-lock them).
4. **Attacks**: keep A. Add B (every attacker) and C (every melee unit) with `moves.clip(...,
   reuse={...})` so read and settle frames are A's. Same `durationMs`, `impactAt` and pre-impact sum as
   A (`M.check_variants`). The held extreme is the longest pre-impact step (written as `holdStep`); a
   ranged or artillery attack whose sim wind-up is more than 2x the authored pre-impact time gets a
   two-step `holdLoop` right after the hold.
5. **Make the variants read differently at 62 px** (pilot review N1). Before rendering, preview the A,
   B and C hold and impact frames side by side and look at the black silhouette row:
   `preview.py <slug> attack:<hold> attack:<imp> attack_b:<hold> attack_b:<imp> ... --v3`. Each pair
   of holds must differ by a body level (standing, crouched, kneeling, reared), a weapon angle of 60
   degrees or more, or a hit direction. What failed in Stone and how it was fixed:
   - Pebbler B (hip whirl in front of the belly) hid inside the body: the arm now swings straight
     back so the ring sticks out behind the hip, and the release is upright with a knee kick.
   - Drum Shaman B (drum at head height, arm up) read like A: the drum now goes high over the head
     (a tall column, no stick sticking out) and the impact drops to a kneel.
   - Tuskback C read like A's low coil: C rears (forehand up, front legs folded) and hooks down.
   - Sabertooth C reared like A: C stalks low with the paw cocked at the chest.
   A held weapon must clear the head and body in the silhouette; a ring smear must not sit on the body.
6. **Projectiles**: the impact-frame `muzzle` of every variant is where the hand or cup really is.
   Keep it within 8 lu of A's when the release is the same kind of throw; a deliberately different
   release (Pebbler B's upright underhand) may move it up to 25 lu. The runtime starts the projectile
   from the playing variant's muzzle, so it always leaves the hand.
7. **Second attackers** (riders, sponsons, an MG): `attack_alt` with the body in idle pose 0 and only
   the second attacker acting, on its own `durationMs` / `impactAt`; never let it act in A, B or C.
7b. **Hold loops without a twitch** (Bronze): when a ranged attack needs a `holdLoop`, insert a
   partner frame right after the hold (javelin pump, dart twirl, aim jiggle) and re-split the
   pre-impact steps (e.g. `[30, 40, 40, 102, 30, 30, 18 | ...]`), keeping `durationMs`, `impactAt` and
   the hold >= 35% of the pre-impact time; looping the hold with the smear frame flashes the smear.
   Wheels: pick the spoke count so 2 spoke spacings per cycle match the ground speed (War Chariot: 4
   spokes, 576 ms), or paint every other spoke to halve the repeat (Scorpion: 3 team spokes, 120 deg).
8. **No spawn, stun or victory clips are needed**: the runtime pops the unit in code (it never holds
   the idle frames as a spawn), and a walk <-> idle or walk <-> attack switch cross-dissolves for
   110 ms, so the carry pose may differ from the guard. Do not add a spawn clip to "fix" a glide.
9. **Render and install**: `render_all.py --out <scratch> --units a,b --no-fx --no-mockup --v3
   --no-previews --install` (two processes in parallel, two units each), then
   `node art/blender/gen_unit_manifest.mjs`, `gen_portraits.py` if idle frames changed (it needs the
   raw frames, so run it before deleting `_frames/`), and `node art/blender/check_timing.mjs`.
10. **Check** each unit: `check_walk.py` for its gait, the colour rule and team coverage in the render
    log (`failingFrames` empty), the extras sheet within the budget (ANIM_SPEC 5), the A/B/C hold and
    impact strip (`extremes.py`), and a real match: an AI vs autoplayer sandbox battle
    (`?dev=1&stage=1&source=real&opponent=ai&autoplay=1#sandbox`, NOT dev spawns, which skip the
    `unitSpawned` event) at 844 x 390 and 1280 x 720, where moving units must show `walk` on at least
    95% of frames (e2e `tests/e2e/unitMotion.spec.ts` checks 75% on the shipped ages).

**Medieval pass (2026-10-02).** `kit_medieval.skeleton_v3` / `legs_v3` / `legs_ik` / `jog_gait` /
`ArmChain` give the `rigs_medieval` bipeds the walk v3 body without touching that module's API (the
Bronze rigs import it): thighs at 19.5 lu, knees 11.5, `foot_r/l` joints at the ankle with 8.8 lu
boots, the far leg 20% darker, `_foot` / `_foot_l` sole trackers and the upper body lifted 2 lu
(`rest_offset`; lift the hem or skirt secondary by the same amount). Rider and beast legs use
`G.Leg(upper, lower, hoof_bottom, bend=+1 front / -1 hind)` plus a `_foot_<leg>` tracker per sole
and `G.quad_walk(..., trunk="horse"|"bear")`; read the IK report and lower `base_z` until no planted
hoof falls short. Wheels (Battering Ram, G6): pick the spoke count so 2 spoke spacings per cycle
match the ground speed, keep the old `_foot` odometer tracker (no `_foot_*` trackers, no `walk_clip`)
so the natural speed comes from its x range, and set `GAIT_NAME = "wheeled"`. `check_walk.py`'s
vehicle energy is silhouette-only, so a turning wheel does not count; crew legs that step outside
the wheels (the Ram's rear pusher) and rear-wheel dust do.

**Industrial pass (2026-10-02).** The Industrial bipeds use the Medieval walk-v3 body unchanged
(`kit_industrial.skeleton_v3` / `legs_ik` / `jog_gait` / `ArmChain` re-export `kit_medieval`'s, the
two biped layouts match) plus `kit_industrial.legs_v3` (work trousers or team overalls, gaiters, cuffs,
8.8 lu hobnail boots on the foot joints, slim shins so the two legs stay apart at 62 px, the far leg
20% darker, sole trackers). `rigs_industrial.overalls` / `jacket` / `long_coat` take `hem_z` (and
`skirt_z`) so the hems clear the longer legs; keep hanging props (hammers, rags, map cases, coat tails)
at least 9 lu above the soles or they bridge the feet in the sole band. Two pose helpers keep the
shipped attack tables: `kit_industrial.ground_feet(rig, pose, LEGS)` re-plants the feet of an FK pose
authored for the old short legs (feet within 2.5 lu of the ground are planted where they are, higher
ones keep their kick) and `kneel(rig, pose, LEGS, drop=14)` puts a unit on one knee by IK (Carbineer
and Harpoon Gunner B). The Steam Golem (G7) walks with `gait.Gait` on its own walker legs (10 frames,
900 ms, the hips 3 lu lower than the old idle so planted feet reach); the Land Dreadnought (G6
tracked) keeps its grouser phase copies and only changes the step time so 2 grouser spacings per
640 ms cycle match 43.75 lu/s, writes `mgMuzzle` for the sponson gunners and an `attack_alt` with
`noMuzzle` (its bullets then leave the current frame's `mgMuzzle`, not the main gun). Industrial is
not in `render_all.AGE_OF`; render with `units/render_industrial.py --out <dir> --units a,b` (it
installs the extras sheets too).

**Gunpowder pass (2026-10-02).** The Gunpowder bipeds (Corsair, Fusilier, Grenadier, Field Surgeon)
use `kit_medieval.skeleton_v3` / `legs_ik` / `jog_gait` / `ArmChain` (the `rigs_gunpowder` biped has
the same joint layout; its API is unchanged because the Scorpion, War Chariot and Land Dreadnought
import it) plus `kit_gunpowder.legs_v3` (breeches with a knee band, stockings or gaiters with brass
buttons, or tall cuffed boots; 8 lu buckled shoes on the foot joints, the far leg 20% darker, sole
trackers) and `kit_gunpowder.plant` (IK-planted feet for new attack poses, `rigs_bronze.plant`). Coat
tails, aprons, sashes and the doctor's bag are secondaries lifted with `rest_offset` so their hems end
at least 9 lu above the soles (lower, they bridge the feet in the sole band); the jog is 656 ms at
card speed x 1.25 with stance 0.36 (a 600-616 ms cycle gave a contact gap under 5 px with these coat
tails), the default hip bob, and a carry pose per unit (musket sloped back on the shoulder with the
far hand let go: the far fist on the fore-stock is its own `gunhand` joint; cutlass resting back on the
shoulder; bomb tucked at the belly; pistol held up barrel to the sky). Where a longer, more profile
jog dropped team coverage under 18% the sash (Corsair) or the bag (Surgeon) became team-coloured. The
Cuirassier trots like the Destrier (`G.horse_leg` legs with `_foot_<leg>` trackers, `quad_walk`,
740 ms). The Bronze Cannon (G6) keeps its 8-spoke wheels and rolls 2 spoke spacings per 475 ms cycle
(56.2 lu/s), with an `odo` joint carrying the `_foot` odometer tracker (no `walk_clip`, so the natural
speed comes from its x range) and the gunner's legs planted by `gait.solve` on a `Gait` at the same
cycle. The Balloon Admiral (G8 `fly`) leans 6 degrees nose down, breathes the envelope a beat late,
trails the sandbags and flickers a new burner flame (`flame` joint, `FLICKER`); the hover bob itself
stays in code (R8). Hold loops reuse an existing partner step where it is not a smear (Fusilier pan
fizz, Cannon crouch, Balloon bomb sinking); the Grenadier's whip frame is a smear, so its A gained a
fuse-fizz partner frame and re-split pre-impact steps. A dev server started with `watch: null` keeps
the public-file list it saw at start: restart it after installing new `.x.json` extras, or the game
falls back to attack A for those units.

**Modern pass (2026-10-02).** The Modern bipeds use `kit_modern.skeleton_v3` (= `kit_industrial`'s) and
`kit_modern.legs_v3` (olive trousers, khaki puttees on slim shins, 8.8 lu boots on the foot joints, the far leg
20% darker, sole trackers, `mud=True` for caked toes); `rigs_modern.tunic(hem_z=13.0)` lifts the hem (the default
stays 11 for every older caller). The tanks (G6 tracked) keep one grouser phase copy per walk step and change only
the step time so 2 grouser spacings per cycle match the ground speed of the scaled track (Tankette 57.5 ms,
Behemoth 92 ms); `GAIT_NAME = "tracked"`, the `odo` tracker gives the natural speed. The Gyrocopter
(`GAIT_NAME = "fly"`) shows one blade phase over three alternating pale blur arcs (`blur0-2`, thick capsules, no
part outline). Turret traverse variants turn the turret joint with `rz` (negative = toward the camera); the
foreshortened barrel moves the impact muzzle, which the runtime follows.

**Future pass (2026-10-02).** The Future bipeds (Photon Knight, Pulse Trooper, Rail Gunner, EMP
Saboteur) use `kit_future.skeleton_v3` (= `kit_medieval`'s with the Future arm layout; `rigs_future.py`
keeps its API for the Cosmic rigs and the Bronze Colossus) and `kit_future.legs_v3` (charcoal suit legs,
white knee pads, 8.8 lu glossy white boots with a dark sole on the foot joints, far leg 20% darker,
optional `team_thigh` / `team_greave`, sole trackers); `kit_future.legs_ik`, `jog_gait` and `ArmChain`
re-export `kit_medieval`'s. Kept A tables are re-planted with `kit_industrial.ground_feet`, kneels use
`kit_industrial.kneel`. The Walker Mech (G7) walks with `gait.Gait` on its reverse-knee legs
(`Leg(bend=-1)`, 10 frames / 1000 ms); the Chrono Titan (G3) on its humanoid walker legs with 12 frames
in 1560 ms (130 ms each), because at 43.75 lu/s a 1300 ms cycle keeps its boots overlapping; the boots
are 26 lu long. The Repair Drone (G8 `fly`) keeps its odometer at the ground speed and pulses its jets
on a 2-frame beat. A full-turn or over-the-top `arc` smear between a straight-back and a straight-forward
pose sweeps over the top: a punch uses a `streak` (Walker Mech B). A held weapon that ends behind the
head or hull vanishes in the silhouette (EMP C cocked over the far shoulder, Walker B with the fist
tucked behind the hull): cock it low behind the hip or straight back past the hull instead.

**Cosmic pass (2026-10-02).** The Cosmic bipeds (Star Legionnaire, Ion Ranger, Graviton Halberdier,
Starwarden, Warp Stalker) use `kit_cosmic.skeleton_v3` (= `kit_future`'s) and `kit_cosmic.legs_v3` (void
undersuit legs on slim shins, 8.8 lu glossy violet boots with a star-white toe cap and a dark sole on the
foot joints, star-white knee guards or team greaves, the far leg 20% darker, sole trackers);
`kit_cosmic.legs_ik`, `jog_gait` and `ArmChain` re-export `kit_future`'s, and `rigs_cosmic.py` keeps its
API. Hems were lifted to 9-11 lu above the soles (Legionnaire pteruges, Halberdier tabard, Starwarden robe
and lantern). The Warp Stalker sprints at 125 lu/s: a 512 ms cycle with stance 0.32, the feet centred
3.5 lu ahead of the hips (`x_mid`) and the hips 7-8 lu low (a hunched sprint); a stance of 0.34 or more,
or a centred foot, leaves the back foot short in the IK report. The Starwarden is a G2 brisk waddle like
the Friar (560 ms, stance 0.44, the shortened robe kicking with the knees); with less robe its team share
fell to 17.9% on one frame, so its greaves are team-coloured. The Hover Tank (`GAIT_NAME = "hover"`) and
the Mothership (`"fly"`) keep their `odo` odometer at the ground speed, lean 6 degrees nose down and
pulse their thrust cones / tractor ring on a 2-frame beat; the bob stays in code (R8).

`world/common.turret_module(..., idle_frames=6, overlays=...)` gives a turret a 6-frame idle
loop in the same 1020 ms and 2D accents. `node art/blender/check_timing.mjs [ref]` fails if any
clip duration or attack `impactAt` in `src/visuals/unitSheets.gen.ts` differs from the git ref.

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
