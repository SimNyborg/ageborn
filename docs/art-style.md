# Ageborn art style guide

For anyone who draws, models or generates art for Ageborn: the look, the numbers and the conventions the
game relies on. The rules come from DESIGN A11 (art direction), A5.8 (skins), A14.1 (ids) and B5 (the
art swap contract). The code that implements them lives in `src/visuals`; every number below is a
constant there (`style.ts`, `palette.ts`), and the art gallery (`?dev=1#gallery`) checks them.

## 1. The look: chunky cartoon cutout

| Rule | Value | Where |
|---|---|---|
| Fills | flat, one colour per shape | |
| Cel shadow | the fill darkened 18% (every channel × 0.82), a crescent on the lower right | `STYLE.shadePct` |
| Highlight | one soft white shape per part, upper left, 32% opacity | `STYLE.highlightAlpha` |
| Outline | 3 px at 720p = **3.7 lu**, the fill darkened 45% (never black) | `STYLE.outlineLu`, `outlinePct` |
| Inner detail lines | 2.2 lu | `STYLE.detailLineLu` |
| Far limbs | darkened a further 14% for depth | `STYLE.backTonePct` |
| Shapes | rounded; heads about a third of body height; short legs | |
| Weapons | oversized and role-readable: bow = ranged, big shield = heavy, polearm = reach | |
| No blood | units pop into dust, KO stars and coins; hats, helmets and weapons drop and stay 6 s | |

"Darken by p" multiplies each channel by (1 − p), which keeps hue and saturation. A Pixi tint does the
same multiplication, so a team layer baked in grey and tinted with the team colour gives exactly the
team fill, its shadow and its outline in every preset.

## 2. Units of measure and scale

- Everything is authored in **lu** (lane units). The lane is 1,200 lu from gate to gate; the camera fits
  1,560 lu (lane plus both bases), so at 1,280 × 720 one lu is about **0.82 px**.
- Heights (feet to the top of the hat, plume or rotor):

  | Class | Height | Collision width | Max body width (1.4× + one outline) |
  |---|---|---|---|
  | Infantry, ranged, support (small) | ~68 lu (band 54-90) | 24 lu | 37.3 lu |
  | Anti-armor, Epics (medium) | ~70 lu | 32 lu | 48.5 lu |
  | Heavies (large) | 100-120 lu (band 90-125) | 48 lu | 70.9 lu |
  | Legendaries (huge) | 170-220 lu (band 150-225) | 80 lu | 115.7 lu |

- **Body width** is measured on the rest pose without weapons, held gear (shields, tools), arms,
  rotors, banners and pennants (slots marked `noWidth` or tagged `weapon`). Oversized weapons may stick
  out; the body may not.
- The visual's `heightLu` and head anchor are measured from the drawing (the top of the silhouette), so
  health bars sit just above the art.

## 3. Coordinates and pivots

- Origin at the **feet on the ground line**, **+x is the facing direction** (all art faces right; the
  view mirrors side 1), **+y is down**, rotations are degrees **clockwise on screen**.
- A part is SVG path data in lu with its **pivot at (0, 0)**: the joint for limbs (shoulder, elbow, hip,
  knee, neck), the grip for anything held. **Held items point up (−y) from the grip**; the rig rotates
  them into the hand.
- Paths use M L H V C S Q T Z only (no arcs; `svg.ts` has circle, ellipse, rrect, blob, limb, wedge,
  arcBand, star and ngon helpers). Every sub-path winds the same way, so overlaps union and never cut
  holes.

### Rigs (A11: seven shared rigs cover every card)

| Rig | Bones (parent > child) | Notes |
|---|---|---|
| biped | root (feet) > spin (body centre) > pelvis > torso > head > eyes; torso > armB/armF > foreB/foreF > handB/handF; pelvis > legB/legF > shinB/shinF | At 68 lu: hips at −16, shoulders at −35.6, neck at −39, skull centre 12.5 above the neck (radius ~12.6). F = near side (drawn in front), B = far side (darker). Everything scales with height; outlines stay 3.7 lu. |
| quadruped | root > spin > body > neck > snout > jaw, eyes, trunk; body > tail, saddle, legFN, legFF, legBN, legBF | Legs are one chunky segment from hip to sole: `legLen = bodyHeight − legY`. Far legs sit a few lu behind the near legs. |
| rider | a quadruped with the biped's pelvis on the `saddle` bone | The rider's far leg hides behind the mount; the near leg rests over it. Rider ids that collide with the mount's get a `rider.` prefix. |
| vehicle | root > spin > hull (at the ground) > wheel1..5, treadTeeth, turret > barrel > muzzle; log (ram) | Wheels spin with distance; `treadTeeth` scrolls 8 lu per tooth. |
| walker | hull > legF/legB > shinF/shinB > footF/footB; hull > armF/armB > foreF/foreB | Walker Mech, Chrono Titan (`clock` bone for Time Stop). |
| flyer | spin > body > rotor/rotorB/prop, gondola > hatch, emitter | Origin at the flyer's lowest point; the battle view lifts air units to flight altitude. Rotors are squashed in x to fake the spin. |
| turret | root (the mount point) > pivot (aims) > barrel (recoils along −x), arm, bucket, lid, muzzle | Aim limits per turret. |
| base | root (the gate on the ground) > body, flag1-2, torch1-2, smoke | Extends back to x ≈ −150, four turret mounts stacked bottom to top on the front face; slots can depend on the crumble stage (75/50/25%) and the Treasury level. |

Anchors (`feet`, `head`, `muzzle`, `hitCenter`) are in puppet space: projectiles leave from `muzzle`, hit
sparks land on `hitCenter`, health bars sit over `head`.

## 4. Colour

### Teams and presets (A11)

| Preset | You (side 0, left) | Opponent (side 1, right) |
|---|---|---|
| Default | blue `#2F7DF6` | orange `#F28A1E` |
| Blue/Yellow | `#2F7DF6` | `#F2C21E` |
| High contrast | `#1F5FD6` | `#FF6A00`, plus diagonal stripes on the opponent's banner-type team areas |

Team colour goes on **large readable parts**: tabards, shield faces, plumes, pennants, caparisons,
roundels, armbands. Every unit shows at least 7% of its silhouette in team colour. Redundant cues:
facing, a ground ring (circle for you, diamond for the enemy) with a 12 px role glyph, pennants on
heavies, and the health bar colour.

Zones named `team` (full team colour) and `team2` (a darker team shade) are baked in grey and tinted at
runtime. Team layers must be contiguous inside a part (the bake splits each part into under, team and
over).

### Age palettes (A11)

| Age | Large-area colours | Accent (≤ 10% of a silhouette) |
|---|---|---|
| Stone | stone brown `#8C7B68`, moss `#6E8B3D`, bone `#EDE3C8` | ochre `#C98A3D` |
| Medieval | slate `#6B7682`, wine `#8E2A4A`, parchment `#E8DFC8` | gold `#D4A437` |
| Gunpowder | bottle green `#2E5E4E`, cream `#EFE6CF`, dark wood `#4A3B2E` | brass `#C9A227` |
| Modern | olive `#62664A`, khaki `#B8A67A`, gunmetal `#3A3F45` | signal red-violet `#B0306A` |
| Future | charcoal `#23262E`, magenta `#F03AA8`, mint `#3AF0B4`, white | cyan `#29E3F5` |

The zone names every age uses (`skin`, `hair`, `cloth`, `cloth2`, `cloth3`, `leather`, `metal`, `metal2`,
`wood`, `wood2`, `stone`, `fur`, `bone`, `accent`, …) are in `palette.ts` (`AGE_ZONES`); each puppet
adds its own (`robe`, `bronze`, `glass`, …). Skin tones stay at or below 38% saturation so faces never
count against the colour rule. Large bronze and brass areas use muted, aged tones (`#9A8A62`); the
bright metal is kept to bands and buttons. Backdrops stay desaturated and low contrast.

### The colour rule (A11, MUST)

Non-team parts of units, turrets, projectiles and lane effects may not use a hue within ±35° of any
team hue in any preset — the bands **350°-81° and 182°-254°** — at HSV saturation above **40%** for more
than **10% of the silhouette**. Level trims, Legendary auras and effect flashes follow it too. Outlines
keep the fill's saturation, so a saturated accent counts with its outline. Bases and screen or UI cues
(the overdrive frame, the siege vignette, coins, XP sparkles) are exempt. Magenta and mint are outside
the bands, which is why Future energy uses them; cyan is inside, so it stays an accent.

## 5. Animation (A11 clip contract)

Every unit implements `spawn`, `idle`, `walk`, `attack`, `hit`, `stun`, `die`, `victory` and `ability`:

| Clip | Treatment |
|---|---|
| spawn | scale 0 → 1.15 → 1 over 180 ms (ease-out-back) plus a dust puff |
| idle | 1.2 s breathing bob of 2 px, blinks, a weapon twirl every 6-10 s |
| walk | legs ±25°, 3 px bob, 0.5 s cycle; the cycle follows ground distance, so feet do not slide |
| attack | wind-up squash 0.9/1.1 over 60% of the wind-up, strike at `impactAt`, short recovery |
| hit | 80 ms white flash, 4 px recoil |
| stun | dizzy stars (a clock ripple when frozen) |
| die | fling and spin, dust, coins; hats, helmets and weapons drop and stay 6 s (pool of 40) |
| victory | cheer hop, raised weapon |
| ability | card-specific: charge lean, hook throw, shield raise, pounce, stomp, roar, ram swing, recoil, bomb drop, rotor tilt, radio call, repair beam, EMP, Time Stop |

**The simulation owns timing.** The view gets the sim's impact time and warps the attack clip so its
authored `impactAt` (a 0..1 point of the clip) lands exactly on that tick; the recovery keeps its
authored length. Art can therefore never change balance. Clips are keyframes on bone rotation, offset
and scale (`clips/`), mixed with procedural helpers (walk cycles, bobs, wheels, rotors).

Turrets: build drop-in, idle scan, aim, fire recoil (120 ms squash and a one-frame muzzle flash),
modernise (sink), sell poof, the outdated arrow. Bases: flags wave, torches flicker, hit shake with
debris, crumble stages, the 1.8 s evolve morph, the Last Stand horn and glow, the collapse.

## 6. Skins (A5.8)

A skin is its own manifest entry `<visual id>@<skin>` and **never changes silhouette, size, weapon
type, team zones, facing or stats**. It may change the palette outside team zones, add overlays, swap
the idle flourish or the death prop, change effect colours and the projectile visual (same size),
make the body translucent down to 70%, and override sounds. Replacement parts keep the outline of the
part they replace. The silhouette test requires IoU ≥ 0.85 against the base, at rest and at the attack
impact. Skins are declared in `skins.ts` (`SkinSpec`: palette, replace, add, bones, alpha, aura,
twirlBone, projectile); their parts are in `parts/skins.ts`.

## 7. Replacing the procedural art (the swap contract, B5)

Gameplay only knows visual ids. `src/visuals/manifest.ts` maps each id to a `VisualDef` whose `kind`
picks the tier; tiers can mix in one match, one unit at a time.

1. **New drawings on the same rigs.** Open the gallery's *handoff* tab: one SVG sheet per visual with
   the assembled rest pose and anchors, every zone with its colour, and every part at its pivot. Redraw
   parts keeping the pivots and rough outlines, replace the path data in `parts/<age>.ts`, and the
   rigs, clips and timing stay as they are. (Painted or generated bitmaps need a defringe step for
   alpha halos.)
2. **Sprite sheets** (the `art/blender` pipeline, or AssetPack). Put the sheet somewhere the app
   serves, then add one entry to `OVERRIDES`:

   ```ts
   import bonker from '…/bonker.json';
   'unit.bonker': atlasVisualDef(bonker, 'art/units/bonker.json'),
   ```

   The sheet is a PixiJS spritesheet whose frames are anchored at the feet, with `animations[<clip>]`
   and `animations[<clip>_team]` (grey team surfaces drawn tinted under the base frame, whose team
   surfaces are holes) and `meta.ageborn` (`pxPerLu`, `anchorsLu` with y up, per-clip `durationsMs`,
   `loop` and `impactAt`). Missing clips fall back (spawn, stun and victory use idle frames with code
   motion; ability uses attack). Rings, glyphs, trims and status overlays stay the shared procedural
   ones, so every tier shows the same team cues. To compare tiers in the gallery, add
   `&atlas=unit.bonker:/path/to/bonker.json` to a units URL.
3. **Spine** (`adapters/spine.ts`, a stub with the final interface): `team_*` slots take the team tint,
   and `play('attack', { impactAtMs })` must set the track's time scale so the impact event lands at
   `impactAtMs`.

`?art=placeholder|procedural|atlas|spine` forces one tier for every visual. An entry whose tier cannot
draw it (not built yet, or its sheet failed to load) draws as a placeholder and logs once.

## 8. Checking your work

- `?dev=1#gallery` — *units* and *turrets*: every visual × clip × skin × side × colourblind preset
  (`clip=cycle` plays the whole contract; `t=<ms>` freezes for screenshots); *world*: split-age
  backdrops, arena grounds, bases with crumble, Treasury, horn, evolve and collapse, turrets on mounts;
  *effects*: every effect and projectile; *portraits*: DOM portraits with foils, and icons; *checks*:
  the colour rule, skin IoU, body width, scale and structure on the same SVG data; *bake*: bake times
  against the budget and the atlas pages.
- `npx vitest run src/visuals` runs the same checks in Node.
- Bake budget (B16): ages 0-1 bake at boot within 400 ms, ages 2-4 lazily in idle slices. Measured in
  headless Chromium on the build machine: 150 ms (DPR 1), 113 ms (DPR 2), 96 ms (Lite).

## 9. File map

| Path | What |
|---|---|
| `style.ts`, `palette.ts` | the numbers and colours above |
| `svg.ts`, `draw.ts`, `raster.ts`, `targets.ts` | path data, the painter (cel shade, highlight, outline), the rasteriser, canvas/SVG targets |
| `parts/<age>.ts`, `parts/shared.ts`, `parts/icons.ts`, `parts/skins.ts` | the SVG part libraries |
| `rigs/` | the seven rigs plus the base rig |
| `puppets/<age>.ts` | every unit, turret and base of an age |
| `skins.ts` | the 12 skins |
| `clips/`, `animator.ts` | keyframe clips, procedural helpers, playback with the impact warp |
| `effects/` | effect recipes and projectile recipes, effect sprites |
| `backdrops/` | skies, silhouettes, mid-grounds, arena grounds |
| `bake.ts`, `portraits.ts`, `handoff.ts`, `checks.ts` | the atlas bake, DOM portraits, artist sheets, art checks |
| `manifest.ts`, `provider.ts`, `adapters/` | the swap contract and the four tiers |
