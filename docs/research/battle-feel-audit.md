# Battle feel audit (UI-5b, ui-plan 6.7b), 2026-09-29

A live audit of the battle world's moments against the motion catalogue's group K (MR-100 to MR-111) and the realistic-motion rules of ui-plan 5.8, most-seen first. It was run on a real Quick Battle (Short War, the player's Stone Age army in the realistic atlas art against an AI that reached Bronze, which is still in the procedural cartoon style) at 844 × 340 and 1280 × 720, with the page clock slowed (every screenshot is a 30-50 ms slice of game time), so each moment is a burst from anticipation to settle.

Grades: **ok** (meets its row), **weak** (reads, but flat, stiff or cartoon), **missing**.

## Findings, most-seen first

| Row | Moment | Before | Grade | What changed in UI-5b | Still open (owner) |
|---|---|---|---|---|---|
| MR-100 | Spawn arrival | The body popped from 5% to 115% and back in 180 ms with a non-uniform squash; a white dust burst | weak (a squash on a rigid body, 5.8) | A short drop (10-14 lu) that accelerates, then the body takes its weight with one small settle below the stance, heavier bodies longer and lower (200 / 240 / 300 ms); it fades in over the first 60 ms; a ground-toned dust ring at the feet | The unit appears in front of the gate instead of stepping out of it; the gate glow and the banner shake at the gate (WP4 base view, WP5 event) |
| MR-101 | Walk and march | Sheet walk cycles played at the sim speed (no foot sliding), idle phases seeded per unit | ok | none | Heavy units' forward lean and the weapon sway lag are sheet poses (art pipeline) |
| MR-102 | Attack | Wind-up and strike are in the sheets; the contact frame is warped onto the sim impact tick | ok | none | No smear frame or motion trail on melee strikes (art pipeline) |
| MR-103 | Hit reaction | A 60-80 ms whole-body white flash and a 1-2 px hitstop jitter, the same for every body | weak (no reaction by mass) | The body flinches back by mass (light 5 lu, medium 2.5, heavy 1) and returns with one small overshoot in 140-200 ms; never a scale change | Head turn and shoulder dip are poses (art pipeline); sparks instead of dust on mechanical bodies when later ages are restyled |
| MR-104 | Knockback | Sim-driven slides | ok | none | none |
| MR-105 | Death | The fall clip, then the body vanished at the clip's end behind a bright dust cloud; any KO stars popped like a cartoon | weak (the body "pops" out) | The body lies 600 ms after the fall, then sinks 3 lu and fades over 300 ms with a ground-toned dust puff; KO stars are replaced by dust; the death linger is 1.7 s | Heavies dropping to a knee first and mechs stalling are sheet poses |
| MR-106 | Projectiles | Arcs follow the sim; pebbles and spears read | ok | none | Scorch and crater decals (WP4 effects) |
| MR-107 | Turret fire | Barrel kick 3.2 lu held two frames, one-frame muzzle flash, plus a 6% body squash on every shot; a 5-28% landing squash on build | weak (squash over the 3% prop limit) | Recoil shudder and landing settle are 3%; the barrel kick carries the recoil | none |
| MR-108 | Base damage stages | Crumble stages at 75 / 50 / 25% with debris and a shake per hit | ok | none | Fires and smoke residue by stage on the restyled bases (art pipeline) |
| MR-109 | Age Power impact | Telegraph ring, global hitstop, trauma, flash | ok | none | Units in the area react through MR-103's flinch now; a stronger reaction for powers is a follow-up |
| MR-110 | Last Stand | Not reached in the audit match | not graded | none | Re-grade in the next audit |
| MR-111 | Enemy age up | Their pillar and banner | ok | none | none |
| MR-80 | Your evolve | Push-in only when the base was in view; a white 85% screen flash | weak | Frames the base from anywhere (pan and push, at most 3 s, any camera input ends it), warm white at 35% for 120 ms | Picture-in-picture inset (not built; the minimap flash stands in) |

## Cross-cutting notes

- **Mixed styles.** Only the Stone Age is restyled; an AI that reaches Bronze fields cartoon hoplites with outlines beside realistic Stone units. This is the largest remaining gap in the look of a busy lane and is the art restyle's schedule (A18.8.3), not a code fix.
- **Hit dust.** The shared dust sprite is a light beige cloud at full opacity; over realistic art it reads as a cartoon puff. The atlas units now multiply it toward the ground's tone at about 60%; the shared hit and splash recipes (`src/visuals/effects/recipes.ts`) still use the bright version (WP4 follow-up).
- **Impact frames.** The sheets' `impactAt` warp keeps strikes on the sim tick; no case of an early or late hit was seen in the bursts.
- **Readability at 32 px.** At 844 × 340 the lane is framed between the HUD chrome (ui-plan 3.1), so the camera zooms out about 12%; Stone units stay readable (team ring, colour), the Bronze procedural units are busier.

## How to re-run

`hudstates.mjs`, `hudburst.mjs` and `feelaudit.mjs` in the session scratchpad drive a live battle with the page clock slowed (`performance.now` and `requestAnimationFrame` scaled) and write contact sheets; the unit tests `src/visuals/test/weight.test.ts` pin the MR-100 and MR-103 curves and `src/visuals/test/unitSheets.test.ts` the MR-105 timing.
