# Ageborn realistic style guide (art director rules for every age)

The owner wants the game to look ULTRA REALISTIC (docs/decisions.md, A18.9.5): real proportions,
physically based materials, soft realistic light and weighty, natural motion, and it must still read
at in-game size (infantry about 62 px tall on an 844x390 phone). The Stone Age
(`art/blender/styles/realistic/`) is the reference implementation; the pipeline README there says
how to run it. This guide is the rulebook: follow it exactly, and check every rule on the review
sheets before you install anything.

Everything here was checked on the Stone Age review (units, turrets, base, staged battles at
844x390 and 1280x720). "AD fix" marks a rule that exists because the Stone Age broke it once.

---

## 1. The contract (never change)

- Same files, slugs, clip names, frame names (`<slug>_<clip>_<nn>`, `<slug>_<clip>_<nn>_team`),
  frame counts, `durationsMs`, `impactFrame` / `impactAt`, `smearFrame`, `hideUnitAtMs`, tracker
  names, anchors (`head`, `hitCenter`), feet anchor and `heightLu` as the old sheet. The sim owns
  timing; art can never change balance. Copy clip timing from `lib/motion.py` or the old JSON.
- Densities: units 1.23 px/lu at 1x (`meta.scale` 1.5) and 2.46 px/lu hd (`scale` 3); huge units
  1.025 / 2.05 (`scale` 1.25 / 2.5); turrets 1.23 (1.5); bases 1.025 (1.25). A unit that must ship
  smaller (fur-heavy Legendaries) uses `SHEET_FACTOR` and records it in `meta.pxPerLu`.
- The only src/** files an art pass may touch are the generated art data (`unitSheets.gen.ts` via
  `art/blender/gen_unit_manifest.mjs`, portraits). Check that the generator lists every age before you
  run it (it once dropped bronze, industrial and cosmic).

## 2. Scale and proportions

| Class | Height (lu) | Notes |
|---|---|---|
| Infantry / ranged / support | 64-72 (bonker 68) | adult proportions, head = 1/7.5 of height |
| Epic cavalry / big cats | 60-75 at the shoulder line + head | body length 1.6-1.9 x shoulder height |
| Heavies (boar, rhino, war machine) | 100-120 | |
| Legendaries (mammoth, titans) | 170-220 | may ship at `SHEET_FACTOR` 0.82 |
| Turrets | fit the base shelf, about 50-70 lu tall | head clips pivot at `pivotLu` |
| Base | 300 lu tall, 190 wide | exactly `BASE_MOUNTS` shelves |

- Humans: head 1/7.5 of height, shoulders 2 heads wide, hands reach mid-thigh, feet one head long.
  Chin a few degrees down (a level head reads as looking up in this camera). Women and men both
  appear across a roster; vary build (lean hunter, heavy bonker) rather than size.
- Animals: model them from real anatomy, not from a toy. AD fix (sabertooth): a round cranium,
  big round ears, uniform pale plush coat and short tube legs read as a teddy bear. Big cats need a
  low long skull, small swept-back ears, a pale muzzle/throat/chest/belly (countershading), dark
  markings, heavy shoulders and slimmer lower legs. Boars need a wedge head, a bristle crest and a
  tail that grows out of the rump (AD fix: the tuskback tail started 5 lu behind the body and read
  as a floating stick).
- Every appendage must visibly connect to the body in every frame at 1x: tails, tusks, weapons in
  hands, straps. Check the silhouette, not just the beauty.
- The ground is a holdout: anything posed below z = 0 is cut away. A head, leg or weapon that sinks
  through the ground leaves its tips (tusks, hooves, claws) as detached specks in front of the body.
  Death poses rest ON the ground: the head lies on its side, legs fold under the chest (AD fix:
  tuskback death).
- Scale between units: compare every new unit side by side with bonker (68 lu) and the age's
  heavy on one strip before rendering the full sheet.

## 3. Camera and light (shared, do not tune per unit)

- Orthographic, tilted down 12 degrees (`core.ELEV_DEG`). Yaw: bipeds -24, quadrupeds, turrets and
  bases -12. Characters face +X; the game mirrors the opponent.
- Light rig (`core._lights`, `core._world`), identical for every visual so everything on screen
  shares one sun: a warm key from above-front (energy 5.6, colour 1.0/0.95/0.88, 7 degree soft
  shadow, NO side component so mirrored sprites match), two symmetric cool back rims (3.4 each),
  a sky/earth gradient world at 0.38 for ambient and bounce, a shadow-catcher ground for the
  contact shadow. AgX, look "AgX - Punchy", exposure 0.15, 14 samples + OIDN denoise.
- Never add a per-unit light, fill or exposure tweak. If a unit looks flat, fix its materials
  (darker base colour, countershading, higher-contrast albedo), not the light.

## 4. Materials (PBR, procedural detail, colour rule)

Use the presets in `lib/mats.py`; each is a Principled BSDF with procedural colour and roughness
variation and a fine bump.

| Surface | Preset | Guidance |
|---|---|---|
| Skin | `skin` | tones #7a5a48-#b08a70, rough 0.5, tiny bump |
| Hair / beards | `hair` | near-black to dark brown, high bump |
| Long fur (mammoth, pelts) | `fur` | nscale 2-4 on big animals or it reads blotchy |
| Short coat (cats, horses, boar hide) | `coat` | sleek coats: `bump=0.15, sheen=0.2`. AD fix: bump 0.45 + sheen 0.5 reads as velvet / plush toy |
| Leather, rawhide | `leather`, `rawhide` | dark browns; use for straps, hems, fringe |
| Wood, bark | `wood`, `bark` | stripes along the grain |
| Stone | `stone` + strata (see bases/stone.py `_limestone`) | moss only on up-facing surfaces |
| Metal (later ages) | `C.mat(metal=1.0, rough 0.25-0.45)` | steel #9AA0A8, bronze #8a6a3e, iron #5a5856; add a dirt/roughness noise, never mirror-clean |
| Bone, ivory, horn, hoof | presets | ivory warm #e2d6bb; keep highlights small |

- Colour rule (stats `colourRuleMax`, keep < 0.02 on units): non-team areas stay under 40% HSV
  saturation in the team hue bands (350-81 and 182-254 degrees). Browns: check `#846a52` (0.38) not
  `#8f6c4a` (0.48). Saturated accents (plasma, glow, visor) stay small.
- Value structure matters more than texture at 62 px: every unit needs a clear light / mid / dark
  split (pale face or muzzle, mid body, dark hair, belts, hooves, far limbs). Far legs of animals use
  a darker variant of the coat (about 20% darker) so near and far legs separate at 1x.

## 5. Team colour (the tint layer)

- Team surfaces use a `team_*` material (grey #999) and `C.team(obj)`. The pipeline renders them
  into `<frame>_team` (grey, tinted by multiplication at runtime) under `<frame>` (holes there).
- Coverage 15-30% of the silhouette (stats `teamCoverageMin`); on big units put it on large
  crafted parts: tunics, kilts, cloaks, caparisons, blankets, pelts, banners, pennants, shields.
- Tone curve (AD fix): the grey layer is `(lum / lref) ** TEAM_GAMMA` with `TEAM_GAMMA = 2.0`
  (`lib/pipe.py`). The linear mapping left dyed surfaces at 0.7-0.97 grey and the tint read as flat
  plastic paint with no folds. Do not lower it below 1.8; a unit may raise it (`TEAM_GAMMA = 2.4`)
  if its team part is still flat.
- Every team drape needs a crafted edge (AD fix: the Stone Age animals' team cloth read as a flat
  painted blob): a dark leather hem just proud of the free edges (`M.hem_axes(axes, grow, along)`;
  grow only along the free edges, never across a junction between drape pieces or the trim shows as
  a band across the middle), plus fringe, beads, lacing or stitched patches where it suits the age.
  Drapes are thin (thin semi-axis 1.3-3 lu on units), never a puffy pillow.
  For a thick wrap (a caparison around a mammoth's barrel) do not grow the blob: copy the wrap's
  elements, shift them DOWN 2-3 lu and pull the sides in by more than the cloth's displacement
  strength (1.5 lu for a 1.2 lu displace). AD fix: a grown hem swallowed the mammoth caparison and
  the team colour only showed through as speckles.
- Banners and pennants are cloth with follow-through bones, never a flat square sign. A big team
  emblem on a base is a real object (a stretched dyed pelt with leg lobes on a lashed branch frame,
  a painted shield wall, a heraldic banner with a fringe), with a small non-team clan mark on it.

## 6. Outline and readability

- A thin dark outline (0.85 px at 1x, 1.35 px at 2x, colour #13100e at 90%) around the whole
  silhouette, added in 2D (`pipe.finish`). Never thicker: this is a realistic style, not a cartoon.
- Test on the real backdrops: the unit must separate from the far mountains, the mid trees and the
  ground at 62 px. If it does not, change its value structure (section 4), not the outline.
- Faces are 5-7 px at 1x: rely on hair / beard mass, a pale face plane and head shape, not features.

## 7. Animation (weight, timing, no jitter)

Bodies never squash or stretch. Weight comes from timing, arcs, overlap and contact.

| Clip | Frames x ms (infantry) | Must show |
|---|---|---|
| idle | 8 x 115 | breathing (chest 1-2 degrees), weight on one leg, weapon settles, hair/cloth lag |
| walk | 8 x 62.5 | planted feet (no sliding: `strideLu` = what the feet travel), pelvis drop on the passing pose, counter-rotating shoulders, head stable |
| attack | 65/70/120/35/140/80/80/90, impact frame 4 | anticipation held (frame 2 is the longest wind-up), a 35 ms smear frame, held impact with a small recoil, a longer recovery |
| hit | 45/75/60/60/70 | knockback pose: head and chest snap back 8-15 degrees, 3-6 lu offset, settle |
| die | 45/60/70/60/50/60/70/90/90/100 | buckle, fall, one bounce, settle; dust in front; the unit lies still for the last 3-4 frames |

Heavies: idle 6 x 150, attack 9 frames in 13 steps, die 8 frames in 12 steps (`lib/motion.py`).

- Walk speed: `naturalSpeedLuPerS` is measured from the feet; the game plays walks at
  unit speed / natural speed, so a wrong stride makes feet skate in game.
- Strikes: tag weapons `o["weapon"] = 1` and give the strike frame a `blur`; the smear is a 2D
  trail in a pale dusty colour (`SMEAR_COLOR` about #b8aa98-#cbbca4, alpha 0.7). No smear on
  unarmed or ranged units except the throwing arm.
- Deaths: bipeds fall on their back, quadrupeds collapse onto the chest and roll a little onto the
  side. Dust (`pipe.dust2d`) is 2D, in front, low to the ground, warm grey (0.74/0.69/0.60) with a
  narrow value range (0.72-1.12), alpha at most 0.85, noise-broken puff edges, never covering more
  than half the body. AD fix: the old dust (value range 0.4-1.2, alpha 0.92, round puffs) read as
  dark camouflage blotches and as detached dirt clods at the cloud's edge. Size it to the body:
  infantry `size` 9.5 / `spread` 22, medium animals 9 / 28, heavies 8.5 / 36, Legendaries 17 / 48.
  The clip hands off to `fx.dust_poof`; no cartoon KO stars.
- Big-to-small pops: no pose may change more than ~35% of the body height between two consecutive
  frames except the smear frame and the first fall frame of a death. Check the die 3 -> 4 step.
- Follow-through: hair, feathers, cloaks, pennants and banners are extra bones with a phase lag of
  1-2 frames behind the body.
- Turrets: mount (base only), idle (head only, a slow scan or breathing), fire (anticipation,
  release at the `muzzle` tracker, recoil), build (drops in with dust), destroyed (collapse, dust).

## 8. Palette per age

Team colours are always the runtime tint (#2F7DF6 you, #F28A1E opponent, or a preset); never paint
them into non-team materials.

| Age | Key materials | Palette (sRGB) |
|---|---|---|
| Stone | hide, fur, flint, bone, limestone, bark, ochre | skin #9c7862, fur #76624f, coat #846a52, leather #4b3b30, bone #d8cdb5, limestone #9c907f, moss #5d7036, ochre #8a5a3a |
| Bronze | linen, bronze, painted wood, reed, mud brick | linen #c8bba0, bronze #8a6a3e (metal 1, rough 0.35, green patina noise #5f7a62 in crevices), cedar #6b4e36, mud brick #a08466 |
| Medieval | mail, plate, wool, leather, oak, limestone | steel #9aa0a8, mail #6e7278, wool #7a6e5e, oak #6b5847, bay coat #4a3a31, limestone #b0a794 |
| Gunpowder | wool coats, brass, iron, powder smoke, canvas | brass #a08850, iron #4a4a4c, canvas #b8ad94, walnut #5a4030, smoke #c8c4bc |
| Industrial | riveted iron, soot, brick, canvas, rubber | iron #5a5856, soot #2e2c2a, brick #8a5a48, khaki #8a8466, rubber #2a2826 |
| Modern | camo cloth, gunmetal, concrete, polymer | gunmetal #3c4047, olive #5e604a, sand #a89a7a, concrete #9a9690 |
| Future | suit polymer, brushed alloy, emissive visor | suit #3b3e45, alloy #9aa0a8, visor #3af0b4 (emissive, small), plasma #f03aa8 (FX only) |
| Cosmic | ceramic armour, dark alloy, glow cores | ceramic #d8d6d0, dark alloy #2a2c34, core glow #7af0ff (small) |

Each age keeps its non-team palette within the colour rule, uses the same light rig, and puts the
team colour on the age's natural large surfaces (Stone: dyed hides and pelts; Medieval: tabards and
caparisons; Modern: armbands, helmet covers, vehicle panels; Future: armour plates).

## 9. Review checklist (before install)

1. `preview` a few key frames (idle 0, walk 2/5, attack 3/4, hit 1, die 4/9) and look at the 2x grid
   and the 1x rows at in-game size.
2. Full `unit` render; open `<slug>.stats.json`: `clipped` empty, `teamCoverageMin` 0.15-0.30 on
   every clip (turret mounts excepted), `colourRuleMax` < 0.02.
3. Build an all-frames strip of the hd sheet (blue and orange) and check: no detached parts, no
   popping between frames, no clipping through props, feet on the anchor line, the tail and
   weapons attached, deaths settle.
4. Install, `npm run build`, and take a staged battle screenshot at 844x390 (DPR 2) and 1280x720
   with both armies in view (spawn with `devSpawn` from `src/sim/debug.ts`, lane positions in lu:
   side 0 at 420 - 30 i, side 1 at 1520 - 30 i). Compare scale and light with the rest of the age.
5. Sheet size: at or below the old per-age total; PNG8, pixels under 6% alpha dropped.
