# Item 47 art audit: findings, detail standard, pipeline lifts and the combined art round

> Kept in the repo on 2026-11-01. The art director's audit of 2026-10-26 (queue items 47, 46, 40, 44 and 38 Phase B)
> was written in the orchestrating session's scratch folder, which a container reset deleted on 2026-10-27 together
> with its captures, contact sheets, score table (`scores.csv`) and proof-of-concept code. This file restores sections
> 4 to 8 from the orchestrator's copy; sections 1 to 3 (the capture method, the per-item scores and the worst-first
> list) are lost and are summarised in one paragraph below. Paths to `sheets/`, `data/` and `poc/` name files that no
> longer exist. Appendix A records what the first attempt at wave W0 established before it was lost too.

## Sections 1 to 3 (summary; the detail is lost)

Every item was captured at game scale at DPR 2 on a phone (844 x 390) and a desktop (1280 x 720), in battle framing
next to other units, plus a x3 zoom: the 167 troops (idle, walk, attack, hit and death frames), the turrets, the forts,
the eight standard bases and the base skins, the 24 decorations, the 35 troop skins and the scenes. Each item was
scored 1 to 5 on secondary shapes, material breakup and wear, shading and rim light, outline clarity, readability at
62 px and, where it applies, motion quality, and ranked worst first, weighted by how often a player sees it (Stone and
Bronze units and the default bases first). The starter turrets of Stone and Bronze (Rock Tosser, Angry Beehive, Sun
Mirror, Archer Tower) were four of the top twelve priorities; motion scored highest and material breakup lowest in every
class.

## 4. Findings

**F1. Surfaces are flat everywhere.** Material breakup is the lowest criterion in every class (troops 1.08 to 1.67,
turrets 1.50, forts 1.65, decorations 1.08). The toon materials give each material one colour with a lit and a
shadow tone, so hide, cloth, wood, bronze and stone differ only in hue. On average 23% (ranged) to 40% (beasts) of
a troop's interior is perfectly flat at game scale (`flat_share`).

**F2. Secondary shapes are modelled but do not survive game scale.** Example: the Bonker's script models hair tufts,
stitches and a bone necklace, but they are under 2 lu and the same value as their neighbours, so at 1.83 px/lu
they are 2 to 3 device px of nearly the same colour and vanish. Readable detail needs about 2.5 lu (4.6 device px)
on its short side and a clear value step (section 5).

**F3. The outline is soft and hides the rim light.** The unit outline (`UNIT_OUTLINE_V3 = (2.5, 0.55, 0.50)`) is
coloured at fill x 0.55 with an HSV value cap of 0.50, plus an inner cover (`OUTER_OUTLINE_INNER_PX_1X = 0.9`) that
paints over the outermost band of the silhouette, exactly where the view-grazing rim light lands. At game scale it
reads as a brown halo, and the rim is mostly gone. In the proof of concept the thinner, darker outline is the single
most visible improvement. (The audit wrote its widths in units of the 1x sheet, 1.23 px per lu; in the pipeline's own
lu the v3 line is 3.05 lu wide and the v4 line 2.8 lu, as the first W0 attempt measured.)

**F4. Nearly half of every unit is one flat team tint.** The team layer covers on average 45% of the silhouette
(median 45%, range 23% to 71%). It is one grey shade times the team colour, so it is the largest flat area on most
units. The rule asks for at least 18%; detail must be designed into the team zones too.

**F5. The most-seen age is the flattest.** Stone has the lowest edge density (0.41), the highest flat share (0.33)
and the fewest highlights (0.032) of all ages, against Industrial's 0.50, 0.25 and 0.060. Beasts and mounts are the
flattest class ("a smooth horse", "grey plastic fur", "legs are plain cylinders"): flat share 0.39 to 0.40.

**F6. World sheets are upscaled at DPR 2.** Bases (1.025 px/lu) are drawn at 1.79x and turrets and decorations
(1.23 px/lu) at 1.49x, next to HD troops drawn at 0.74x. Bases are the softest art on screen, and the starter
turrets of Stone and Bronze are four of the top twelve.

**F7. Troop skins are flat puppets (item 46 confirmed).** All 35 skins are procedural vector puppets with a palette
swap; mean 1.96, readability 1.77. Eight of them change the unit's silhouette and size grossly. In battle a skinned unit
looks like it belongs to another game, and its motion is simpler than the Blender unit's.

**F8. Motion is the strength.** The animation standard shows: infantry 3.93, beasts 3.85, cavalry 3.69, ranged
3.67. Weaker: war machines 3.25 (little recoil and settle, wheels and tracks with little life), flyers 3.00, forts
2.00 (static), troop skins 2.00.

**F9. Scenes are the best-scored set (3.06) but have known weak spots:**
- Gunpowder classic: about 55% of the backdrop above the lane is empty sky, the sea is a flat band with a few dashes,
  the star fort is small and pale.
- Modern classic: the skyline is an even pale wall with no value steps and no dark landmark.
- Birds read as fish in Stone, Medieval and Modern: a side-on body with a fan tail and a wing like a fin.
- Sabre Savanna (Epic): pale and washed out, the signature dust devil does not read (repainted in round 3b). Desert
  Airbase (Rare): the mesas read as drums or cake tiers.
- On desktop (16:9) the sky is half the frame in every age, so the sky's design matters more there than on a phone.

**F10. Decorations are small, beige and many.** Each is rarely chosen, but a battle shows up to six, so as a class
they are as visible as two starter units. Mean 2.30, material 1.08, the lion statue a beige blob.

**F11. Bases read, but as smooth piles.** The Stone base is a stack of smooth boulders with grass caps (2.50);
Wyrm-Coil Keep's dragon scales read up close, but at game size its silhouette is the standard keep's.

## 5. Detail standard per class (for the Blender build scripts)

### 5.1 Rules for every class

Numbers are at game scale (1.83 device px per lu) unless noted.

1. **Size.** A secondary shape that must read as a shape is at least **2.5 lu** on its short side (4.6 device px).
   Between 1.2 and 2.5 lu it reads only as texture: use it for breakup, never to carry meaning. Lines inside the
   silhouette are 1.0 to 1.2 lu, at fill x 0.60, and only on part boundaries.
2. **Value.** A secondary shape differs from what surrounds it by at least **15 levels of luminance** (0 to 255),
   or is separated by a line. Each material has three tones (light, mid, core shadow) plus at most one highlight.
3. **Silhouette.** 2 to 4 silhouette breakers per unit (headgear, weapon, shoulder piece, cape, pack, tail, mane)
   of at least 4 lu. The weapon keeps its full length and is at least 2.5 lu thick at its business end.
4. **Materials.** Every material gets a kind in the script (`MATERIAL_KINDS = {hex: kind}`): cloth, leather, hide,
   fur, wood, stone, bone, bronze, iron, gold, ceramic, glass, polymer, energy. Each kind has its breakup in object
   space (stable across frames: no crawling), posterized to the toon tones, amplitude 4% to 8% of value; metal adds
   one hot spec of at least 1.5 lu and edge wear (0.5 to 0.8 lu lighter on raised edges); wood adds grain along its
   length; stone adds chips and strata; hide and fur add clumps of 2 to 3 lu in two tones; dirt darkens the lower
   third by 5% to 10%. **Breakup changes value only on warm hues and keeps saturation at or under 0.38 on non-team
   materials**, so the colour rule holds (section 6.4).
5. **Team zone.** 20% to 40% of the silhouette in every frame (never under 18% fill, measured before the outline),
   designed in two tones: a trim, stripe, panel or emblem of at least 2.5 lu in a team-dark or neutral tone, so the
   team area is not one flat field. Detail placed over a team zone counts against this budget.
6. **Shading and rim.** Cavity darkening (about 1.2 lu, strength 0.4) and an edge highlight on raised edges (about
   0.7 lu); a top rim at least 0.4 lu wide still visible after the outline on head, shoulders and upper edges.
7. **Outline (v4).** Thinner and darker than v3: colour fill x 0.46 with an HSV value cap of 0.42, inner cover at most
   0.35 lu (so the rim shows). Do not thin it further without growing the parts: the proof of concept's thinnest line
   lost 5% to 7% of silhouette area.
8. **Normals.** Weighted normals and auto-smooth on organic and rounded parts; hard edges only where a crease is
   meant. Edge highlights otherwise expose polygon facets (seen on the War Chariot horse's legs in the PoC).
9. **Motion.** The existing animation standard applies unchanged (holds, smears, variants, planted feet with at most
   1 lu drift per frame). New straps, pouches, tassels, manes and tails follow through one or two frames late. No new
   part may jitter.
10. **Data the pipeline writes with every render** (so each model is opened once): damage spots and torso and head
    trackers (item 40), `aimDeg` and `release` per attack clip (item 44), and the skin variants (item 46, section 7).
11. **Pixel size is fixed.** HD 2.46 px/lu and 1x 1.23 px/lu for troops (Legendaries 2.05 and 1.03), so decoded
    memory does not grow (section 6.5).
12. **Measured floors** (idle 0 at game scale; a guide for the reviewer, not a target to game): see the table.
    Today's best humanoids (Modern's Trench Raider 0.165 flat, 4.67 micro, 0.57 edge; Rifleman 0.20, 4.32, 0.52) are
    the floor for humanoids.

### 5.2 Per class

| Class | Silhouette | Secondary shapes (each at least 2.5 lu unless noted) | Materials and wear | Team zone | Motion | Floor: flat / micro / edge / highlight |
|---|---|---|---|---|---|---|
| **Infantry** (44) | headgear, weapon and one more breaker | at least 6 across head, torso and legs: belt with buckle (belt 3 lu tall), pouch or sheath, a strap across the torso or a shoulder piece, boot tops or wraps, a hem trim, a helmet or hair feature; plus 4 to 8 micro details (rivets, studs, stitches) as texture | at least 4 kinds per unit; cloth folds; leather darker at edges; metal with a hot spec and edge wear | two-tone tunic or shield face; emblem 4 lu | as today; new parts follow through | ≤ 0.20 / ≥ 4.3 / ≥ 0.52 / 0.06 to 0.10 |
| **Ranged** (60) | the weapon and its ammunition are the read | as infantry, plus quiver, pouch or bandolier readable from the side; the bow, sling or gun at least 2.5 lu thick; the muzzle or release anchor on the tip | as infantry; wood grain on bows and stocks; metal fittings | as infantry | level, about 45 and 70 degrees up for units that hit air; down-aimed for tall shooters and fast-firing flyers (item 44); `aimDeg` and `release` per attack clip | as infantry |
| **Cavalry** (13) | rider plus mount; mane, tail, plume, lance | mount: mane and tail in 3 to 5 clumps of at least 3 lu, two tones; muscle planes (shoulder, haunch) as soft value steps; harness straps with 3 or more studs or buckles; saddle cloth with a trim and pattern; darker hoof bands; leg wraps or feathering. Rider as infantry, simpler below the waist | coat breakup (hide kind), dappling or markings at 3 lu or more | the saddle cloth or caparison, two-tone | mane and tail follow through; hooves plant | ≤ 0.28 / ≥ 3.6 / ≥ 0.45 / ≥ 0.05 |
| **Beasts** (13) | at least 3 breakers in fur or hide (scruff, tail, belly fringe, horns, spines) at 3 to 6 lu | markings (stripes, spots, scars) at 3 lu or more; claws, teeth and horns with a lighter tip; a collar or harness if tamed | fur or hide in clumps, two tones; wet or horn sheen where it fits | the harness, collar or war paint | fur and tail follow through | ≤ 0.28 / ≥ 3.6 / ≥ 0.45 / ≥ 0.04 |
| **War machines** (28) | big shapes already work; keep the crew visible | panel lines (1.0 to 1.2 lu) every 6 to 12 lu, rivet rows (1.5 to 2 lu, as texture), hatches, wheels with spokes and hub at 2.5 lu, tracks with two-tone links, pistons; crew with faces | edge wear on corners, grime gradient towards the ground, wood grain on wooden machines, scorch and soot around muzzles and exhausts | painted panels, numbers or pennants | recoil and settle on every shot; wheels and tracks turn at ground speed; exhaust, steam or sparks at emit spots (item 40) | ≤ 0.30 / ≥ 3.4 / ≥ 0.45 / ≥ 0.06 |
| **Flyers** (9) | seen against the sky: a clear profile | the underside faces the lane: bomb bay, struts, engines or a belly pattern at 2.5 lu | light top, darker belly (a 15 to 20 level value step); propeller or rotor blur | wing or envelope panels | bank, bob and lean; down-aimed fire for the fast-firing flyers (item 44) | ≤ 0.28 / ≥ 3.6 / ≥ 0.48 / ≥ 0.05 |
| **Turrets** (48) | the aiming part reads separate from its base | a plinth with blocks of 4 to 6 lu or construction detail; the mechanism (lashings, counterweight, gears, sling); a crew or, for creature turrets, a face of at least 6 lu | as war machines; the plinth with chips and moss or soot | a pennant or painted band | idle (a crew breathes, a creature blinks), aim (already done), fire with anticipation, recoil and follow-through | at the turret's sheet density; optional HD tier (section 6.5) |
| **Forts** (48) | the material reads at a glance | planks with grain and lashings; bolts; sandbags with seams; blocks with chips; the crumble stages (66%, 33%, 12%) add breaks, not just tilt | wood, stone, sand, metal kinds | flags or pennants | a cloth wave on flags; debris on each stage (already) | as today's density |
| **Bases** (8) and **base skins** (24) | a distinct silhouette per base and skin: a skin that shares the standard base's outline gets a silhouette breaker of at least 15 lu above the roofline (Wyrm-Coil Keep: the coiled wyrm) | masonry or rock strata of 3 to 6 lu, trims, framed windows, banners with emblems, props at the foot (crates, braziers, tools) | wear, moss or soot, chipped edges; the Stone base: chips, strata, hide and bone dressing on its boulders | banners and the flag | lights, flags and smoke as today | at the base's sheet density; optional HD tier (section 6.5) |
| **Decorations** (24) | a readable profile at 20 to 60 lu | at least 3 secondary shapes of at least 3 lu; no single-colour blobs (the lion statue: mane clumps, a carved plinth) | two-tone material, a clear top rim | none required | a small idle where it fits (flame, banner, water) | at the decoration's sheet density |
| **Scenes** (24) | one mid-ground landmark per scene with at least 20 levels of value contrast against the sky | the sky's top half designed for desktop (cloud banks in 2 or 3 layers, distant silhouettes); birds as birds (a V or gull-wing silhouette of at least 6 lu span, 2 to 4 flap frames); water with highlights and shoreline foam; regular patterns (house rows, crevasse bands) varied by at least 20% in size and spacing | layered depth with haze steps | none | ambient motion as today | round 3 notes in section 7 |

## 6. Pipeline lifts and the proof of concept

### 6.1 What was built

A scratch copy of `art/blender` rendered three units at their shipping sizes: the Bonker (common Stone infantry), the
Javelineer (Bronze ranged) and the War Chariot (war machine). The in-game comparison served the scratch sheets in place
of the shipped ones through Playwright request routing. The scratch copy reproduced the shipped sheets exactly (idle 0
composited: mean and max difference 0 for all three), so every difference came from the lifts.

- **Lift 1, pipeline only** (no change to any model):
  - L1 material kinds per colour (`MATERIAL_KINDS`) and object-space breakup per kind, posterized to the toon tones
    (stone with voronoi cracks);
  - L2 cavity darkening (1.2 lu, 0.42) and a bevel edge highlight (0.7 lu);
  - L3 a top rim (light from above, on the silhouette's upper edges) and a team rim;
  - L4 supersampling: render at 2x the HD density with 6 samples, outline at 2x, premultiplied 2:1 downsample and a
    masked unsharp pass (radius 1.1 px, 55%, threshold 1);
  - L5 outline v4 (fill x 0.46, value cap 0.42, a thinner inner cover).
- **Lift 1 without supersampling:** L1, L2, L3 and L5 only, Bonker and Javelineer.
- **Lift 2, pipeline plus model detail:** stronger breakup and rim; on the Bonker a belt band, a bone buckle, a hip
  pouch with a flap, cord cross-stitches, light fur tufts, club grain grooves that follow the club's lathe profile and a
  cord band at the grip; the chariot's horse coat as hide.

### 6.2 Before and after (game-scale metrics, idle 0)

Before → lift 1 without supersampling → lift 1 → lift 2:

| Unit | flat_share | micro | edge_density | highlight_share | silhouette area |
|---|---|---|---|---|---|
| Bonker | 0.303 → 0.253 → 0.248 → 0.199 | 3.46 → 3.80 → 4.01 → 4.45 | 0.425 → 0.469 → 0.491 → 0.534 | 0.039 → 0.043 → 0.049 → 0.068 | 100% → 93% → 94% → 93% |
| Javelineer | 0.227 → 0.227 → 0.216 → 0.207 | 4.12 → 4.32 → 4.60 → 4.68 | 0.524 → 0.541 → 0.551 → 0.558 | 0.067 → 0.075 → 0.089 → 0.099 | 100% → 94% → 95% → 94% |
| War Chariot | 0.339 → (not rendered) → 0.242 → 0.269 | 3.04 → 3.95 → 3.72 | 0.410 → 0.449 → 0.460 | 0.033 → 0.052 → 0.060 | 100% → 95% → 94% |

**The honest verdict at game scale.** Side by side, lift 1 is visibly crisper: the brown halo becomes a clean dark
line, hair and fur get some texture, metal and wood get small highlights, and the horse gets a top light. It is a real
but small step: nobody would call it a new level of detail, and in a moving battle most of it is the outline. Lift 1
without supersampling is nearly indistinguishable from lift 1 at game scale (the HD sheet is drawn at 0.74x, so the
GPU already averages it); supersampling adds a little more texture in hair and crisper thin lines, visible at x3. Lift
2's belt and pouch are visible in game; the Bonker still reads as the same simple figure, with a little more costume.
**The pipeline lifts are necessary and cheap, but not sufficient: the step the owner asks for comes from model detail
designed to the standard in section 5, and on Stone and Bronze it has to go further than lift 2.**

### 6.3 Cost

Measured on the shared 4-core machine with 2 render threads.

| Unit | Variant | Render, total s | Sheet px (HD) | Decoded HD MB | PNG8 HD KB | PNG8 1x KB | Colour rule worst % (limit 10) | Team fill min % (limit 18) |
|---|---|---|---|---|---|---|---|---|
| Bonker | shipped / baseline | 83 | 1536 x 1540 | 9.02 | 339 | 131 | 4.6 | 18.8 |
| | lift 1 without supersampling | 114 | 1536 x 1520 | 8.91 | 364 | 138 | 3.5 | 19.2 |
| | lift 1 | 266 | 1536 x 1528 | 8.95 | 387 | 142 | 6.6 | 19.3 |
| | lift 2 | 352 | 1536 x 1520 | 8.91 | 416 | 147 | 7.8 | **16.7 (fails)** |
| Javelineer | shipped / baseline | 83 | 1280 x 1588 | 7.75 | 322 | 127 | 8.2 | 21.7 |
| | lift 1 without supersampling | 109 | 1280 x 1564 | 7.64 | 347 | 132 | 7.1 | 22.5 |
| | lift 1 | 236 | 1280 x 1584 | 7.73 | 368 | 135 | 6.1 | 22.5 |
| | lift 2 | 301 | 1280 x 1552 | 7.58 | 380 | 137 | 6.8 | 22.4 |
| War Chariot | shipped / baseline | 247 | 4096 x 1896 | 29.62 | 731 | 278 | 4.9 | 20.5 |
| | lift 1 | 927 | 3584 x 2144 | 29.31 | 873 | 308 | **12.0 (fails)** | 20.4 |
| | lift 2 | 778 | 3584 x 2148 | 29.37 | 874 | 307 | **11.7 (fails)** | 20.4 |

- **Render time:** the lifted materials and outline cost about 10%. Supersampling multiplies the time by 2.6 to 3.8.
- **Memory:** decoded size is unchanged (minus 1% to plus 0%), because the sheets keep their pixel density.
- **Download:** PNG8 plus 7% to 23%. WebP q90 is 1 to 4 dB better at plus 18% to 31% bytes; WebP lossless about 3
  times PNG8. Floyd-Steinberg dithering costs 11% to 20% more bytes and is worse: keep PNG8 without dither.

### 6.4 Problems the proof of concept found (and the fixes the standard includes)

1. **Sharpening broke the colour rule on the War Chariot** (11.5% of the silhouette in the team hue bands above 40%
   saturation on the RGBA frames, limit 10%; the PNG8 palette hid most of it). Fix: sharpen luminance only, clamp
   saturation of non-team warm materials to 0.38, run the colour rule on both the RGBA frames and the shipped encoding.
2. **Detail can eat the team zone** (lift 2's Bonker fell to 16.7% team fill). Fix: the team budget in rule 5; the
   pipeline check fails it.
3. **A thinner outline shrinks the silhouette by 5% to 7%.** Fix: rule 7 and the readability check at 62 px.
4. **Edge highlights expose facets** on low-poly parts. Fix: rule 8.
5. **Dithering does not help this art.**

### 6.5 The iPhone limit

- Troop sheets keep their pixel size (HD 2.46 px/lu, 1x 1.23), so the governor's 320 MB unit budget and the 600 MB
  decoded limit at DPR 2 are untouched by the lifts and by model detail. Each wave regenerates the governor's sheet
  table and runs the memory e2e.
- Items that do add pixels: aimed clips (about 35 units up, 13 down; 4 to 6 unique frames per angle, about 1.5 to 2 MB
  per unit, a few MB in a battle, in the extras sheet), and skins as sheets (a skin's sheet replaces its unit's sheet;
  only when a skinned and a plain copy of the same card are both on the lane are both held).
- **World HD tier (an owner decision, deferred).** Bases at 2.05 px/lu and turrets and decorations at 2.46 would
  remove the 1.79x and 1.49x upscale: a base from about 2.3-2.6 MB to 9-10.5 MB decoded, a turret from about 0.95 to
  3.8 MB, a decoration to 0.4-1.6 MB, about 20-40 MB more in one battle; and passed ages' bases stay loaded today, so a
  long war could hold about 100 MB more unless passed bases drop to their 1x copy. Without the tier, bases and turrets
  still gain from model detail, but stay soft.

## 7. The combined art round

### 7.1 Principle: one ticket per model, opened and rendered once

Every unit gets one ticket that does all of this in one sitting, then one render and one review:

1. detail to the standard (section 5), with `MATERIAL_KINDS` and the lifts (L1, L2, L3, L5; supersampling off by
   default);
2. **item 40:** damage spots and torso and head trackers in the script, written by the render;
3. **item 38 Phase B:** if the unit is on B1′'s list (about 10 to 15 units whose impact frame is not the contact, for
   example the Bonker's `attack_b`), its clip fix goes into the same render;
4. **item 44:** if the unit hits air, attack clips aimed up about 45 and 70 degrees (bows included; 35 units: Discus
   Thrower, Javelineer, Standard Bearer, Longbowman, Crossbowman, Friar, Siege Belfry alt, Blunderbuss, Field Surgeon,
   Fusilier, Mesmerist, Voltigeurs, Armoured Car, Carbineer, Flare Spotter, Harpoon Gunner, Spark Scientist, Bazooka
   Trooper, Combat Medic, Ghillie Sniper, Radio Operator, Rifleman, SMG Squad, Attack Drone, Holo Projector, Needle
   Gunner, Overclock Engineer, Pulse Trooper, Rail Gunner, Bio Weaver, Gravity Sage, Ion Ranger, Moonlings, Swarm
   Matron, Mammoth Matriarch alt); down-aimed clips for the Dragoon, the second gunners (Armoured Train, Land
   Dreadnought, Sky Fortress, Star Leviathan), the fast-firing flyers (Gyrocopter, Jetpack Trooper, Star Fighter,
   Attack Drone), the Drone Carrier, Particle Cannon, Armoured Car and Hover Tank; a level hip-fire pose for the
   Fusilier and Wall Gunner; `aimDeg` and `release` written into every attack clip;
5. **item 46:** the unit's skins as Blender variants of the same script (same armature, actions and anchors, so
   every clip matches the base frame for frame), with the skin's materials, patterns and replacement parts at the
   standard's detail; normal and HD sheets and portraits from the same render; loaded lazily in place of the base
   sheet.

Turrets, forts, bases, base skins and decorations get the same ticket without items 38, 44 and 46.

### 7.2 Waves (most-seen first)

| Wave | Content | Agent-days |
|---|---|---|
| **W0 Foundations and pilot** | Lifts L1, L2, L3, L5 in the shipping pipeline with the colour-rule-safe breakup and luma-only sharpening behind a flag; checks on RGBA and on PNG8 (3). The game-scale review kit (1). Item 40 P0: spot API, anchors-only mode, preview tool, damage kit (4) and P1: runtime marks, tint, emitters, sounds (6). Item 38 B0: trackers in the staging (2). Item 44: `aimDeg` and `release` in the pipeline, the runtime picks the aimed clip by angle, the table retires (2). Item 46: skin variants in the pipeline, manifest and lazy loading, the governor counts skin sheets, the A5.8 parity tool (3.5). World HD tier, only if approved (2). **Pilot:** Bonker, Javelineer and War Chariot to the full standard with spots, aim clips and their skins (Pumpkin Head, Sun Chariot) (2). | **25.5** (23.5 without the world tier) |
| **W1 Stone and Bronze** | 42 troops, 9 skins, 12 turrets, 12 forts, 2 bases, 6 base skins, **all 24 decorations**, birds that read as birds in every scene that has them, Glacier Valley's bands | **17.5** |
| **W2 Medieval and Gunpowder** | 41 troops, 10 skins, 12 turrets, 12 forts, 2 bases, 6 base skins (Wyrm-Coil Keep's silhouette), Gunpowder classic's sky (cloud banks, a distant headland, gulls; the star fort larger with more contrast), Castle Hills' Winterfall roofs | **16** |
| **W3 Industrial and Modern** | 41 troops, 8 skins, 12 turrets, 12 forts, 2 bases, 6 base skins, the Modern skyline (three depth bands with value steps, darker landmarks), Desert Airbase's mesas | **16** |
| **W4 Future and Cosmic** | 43 troops, 8 skins, 12 turrets, 12 forts, 2 bases, 6 base skins; Cosmic's purple troop parts against the purple lane get a value split | **16.5** |
| **W5 Finish** | Phase B B1′ clips not done inside the waves, item 40 P4 verification, a cross-age consistency pass and final review, re-render contingency | **8 to 10** |
| **Total** | | **about 100 (range 85 to 115)**; optional Phase B B2′ and B3′ 6 to 9 more |

Per-ticket estimates: small troop 70 min, large troop 125 min, aim clips 20 min per listed unit, skin variant 90 min,
turret 48 min, fort 30 min, base 150 min, base skin 90 min, decoration 30 min, each round 3 scene note half a day to a
day. Without supersampling a lifted small troop renders in about 2 minutes and a large one in about 5 to 6 on two
render threads; the Blender slots are not the bottleneck, agent time and the review loop are.

### 7.3 Checks on every wave

1. **Pipeline checks, every frame:** the colour rule at or under 10% on the RGBA frames and on the shipped encoding
   (and on item 40's composited stage-3 frames); team fill at least 18% before the outline; planted-foot drift at
   most 1 lu; no clipped frames; spots self-check (tips within 0.3 lu, boxes within 2 lu); `aimDeg` and `release`
   present on every listed unit, and the drawn weapon within 5 degrees of `aimDeg` at the release frame.
2. **Skins, A5.8 clarity parity:** silhouette IoU at least 0.85 against the base unit per frame, team zones present,
   weapon type and size unchanged; the same seeds in battle next to the plain unit at DPR 2.
3. **Animation standard:** the motion contact sheet of every clip, new parts following through, no jitter; aimed
   clips play at the right angle in battle.
4. **Frame time, inside the quiet lock:** the 80-unit stress battle, 844 x 390, CPU 4x, High, paired 60 s runs:
   within +1 ms mean and median; the first-contact window not more than 1 ms worse; draw calls at or under 80 (High)
   and 40 (Lite); particle peaks within their caps.
5. **Memory:** `tests/e2e/memory.spec.ts` at DPR 2 (both wars) under 600 MB; the governor's sheet table regenerated;
   unit sheet pixels within +2% of the shipped sheet per unit; skin sheets counted.
6. **WebKit:** the CI job green, long wars inside their time budgets.

### 7.4 Review gate per wave

A wave ships only when the automated checks are green; the art director has looked at every item of the wave at game
scale (phone DPR 2 and desktop) and x3, scored it with the rubric and compared it with captures of `main` on the same
seeds: **no item below 3 in secondary shapes, material, shading, outline or readability, and the wave's mean at least
3.5** (the pilot and Stone at least 3.8); frame time and memory are inside their budgets; and the owner has seen a
short before/after video (same seeds, 844 x 390 and 1280 x 720) after the W0 pilot and after W1. Later waves the owner
sees in the release.

### 7.5 Risks

| Risk | Mitigation |
|---|---|
| Detail that vanishes at game scale again | the size and value rules (5.1, rules 1 and 2) and the game-scale review |
| Breakup that crawls or shimmers in motion | object-space breakup only; every wave judged on video, not only stills |
| The colour rule breaks on warm materials | luma-only sharpening, the saturation clamp, the check on RGBA and the shipped encoding |
| Detail eats the team zone | the team budget (rule 5); the check fails the render |
| A thinner outline shrinks silhouettes | rule 7; readability at 62 px in the review |
| Edge highlights expose facets | weighted normals and auto-smooth (rule 8) |
| A script no longer reproduces its shipped frames | the anchors-only self-check; fix the script before the detail work |
| Supersampling triples render time | off by default; on only where the review asks for it |
| Memory: skins doubling a card's sheet; aimed clips; the world tier | the governor counts skins and aim frames; the world tier only with passed bases released |
| A visible step at the evolve while early ages are lifted and later ones are not | waves go by whole ages in reach order |
| Scope: about 100 agent-days | each wave leaves a consistent game, so the round can stop after any wave; the cut list |
| Work lost in a container reset (it happened on 2026-10-27) | each track's progress is merged into `main-ipy06f` and pushed at every milestone |

### 7.6 Cut list (cut from the top)

1. **Supersampling** (L4).
2. **The world HD tier.**
3. **Item 38 B2′ and B3′** (the optional re-renders).
4. **Base skins beyond their silhouette fixes.**
5. **Model detail for the non-starter units of Future and Cosmic:** lifts and spots only (saves about 6 to 8 days).
6. **Scenes beyond the round 3 notes.**
7. **Forts beyond the starter walls.**

Never cut: Stone and Bronze to the full standard, every age's starters and starter turrets, the troop skins as
Blender variants (the owner's request), and the checks.

## 8. Kort resumé til ejeren

**Hvad er svagest.** Overfladerne. Næsten alt i spillet har én flad farve pr. materiale, så skind, stof, træ og
bronze ligner hinanden. Mange små detaljer findes i modellerne, men de er for små eller har samme lysstyrke som det
ved siden af, så de forsvinder i spillets størrelse. Den bløde kontur ligner en brun glorie og skjuler lyset i
kanten. Det mest sete er også blandt det fladeste: stenalderens og bronzealderens første tropper, de første tårne
og stenalderens base. Troppernes skins er flade tegninger med en anden form og enklere bevægelse end selve tropperne,
og dekorationerne er små beige klatter. Bevægelserne er til gengæld spillets styrke.

**Hvad runden ændrer.** Hver model åbnes og renderes én gang og får det hele på én gang: flere og tydeligere
detaljer, materialer med slid, skarpere kontur og kantlys, skademærker der vises når enheden mister liv, våben der
sigter op mod flyvende fjender, og skins der bliver rigtige 3D-versioner af tropperne med de samme bevægelser.

**Hvor lang tid.** Cirka 100 agentdage i seks trin, først fundamentet og en prøve med tre tropper, som ejeren ser på
video, derefter alderne to og to.

## Appendix A. The first W0 attempt (2026-10-26, lost in the reset): what it established

Four tracks ran for a few hours in separate worktrees before the reset deleted their unpushed branches. Their designs
held up and are the starting point for the second attempt:

- **Look (lifts and pilot).** Opt-in per unit with `DETAIL_STANDARD = True` and `MATERIAL_KINDS = {hex: kind}` in the
  unit script, the lifts in a new `ageborn_art/look.py`, small hooks in `pipeline.run_unit` (begin, attach, after
  build, outline spec, downsample, sheet checks; `run_unit(..., skin=None)`) and an opt-in MaxRects packer for
  opted-in units (kept the Bonker's HD sheet at +0.8% pixels). A unit without the flag re-rendered byte for byte
  (Pebbler, Hoplite, Footman). The pilot's Bonker reached flat 0.11, micro 5.46 and edge 0.60 at game scale (from
  0.30, 3.46 and 0.43). Skin variants rendered through `rig.skin` with a parity tool; the Pumpkin Head scored silhouette
  IoU 0.93 mean and 0.92 worst against the Bonker.
- **Data.** `rig.damage_spot(name, joint, pos, radius, mat, kind="mark", normal=(0, -1, 0), team=False, on=None)`,
  `rig.damage_spot_at(name, joint, x, z, radius, mat, kind=..., team=...)` and `rig.body_trackers(torso, head)`; an
  anchors-only mode (`art/blender/anchors_only.py --units all --bundles --aim`) whose self-check passed on all 168
  sheets; bundles at `public/art/damage/<age>.json` (not in the sheet folders, which three scanners read as unit sheets),
  about 2 KB a unit and 5.8-10.7 KB with spots; aim data on 88 sheets and 182 shot clips (`aimDeg`, `release {frame,
  atLu}`, `omni: true` on 56 emitter clips) as a reversible JSON-only rewrite; 60 of those clips differed by more than 5
  degrees from item 44's measured table, and the drawn weapons followed the new values. Vocabulary: family = soldier,
  armoured, beast, rider, vehicle, flyer, mech, energy; mark and strip materials = cloth, hide, metal, wood, stone,
  glass, energy; emit media = smoke, steam, spark, breath, motes; a spot frame is `[x, y, rotDeg, scalePct, visPct]`.
- **Damage runtime.** Item 38 Phase A's first-contact hitch is one-time initialisation, not a per-frame cost: the
  first kill's frame paid for the floating numbers' first `BitmapFont.install` (18 ms at 1x), its GPU text set-up and
  font-page upload and a garbage collection; warming the number font in idle time at battle start removes most of it.
- **Skins at runtime.** Skin sheets named `<slug>@<skinId>[.x][.hd].{png,json}` with `skinOf`, collected by the
  generator into their own table, loaded in place of the base sheet (both only when both copies are on the lane), used
  by menus and showcases, and shown on the battle HUD's card when the skin has a still.
