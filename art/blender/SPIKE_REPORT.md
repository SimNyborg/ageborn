# 3D sprite pipeline spike: report (2026-09-27)

Renders from this spike were kept outside the repo; rerun `render_all.py` to reproduce them.

## 1. What the pipeline does
- **One command, no manual steps:** `render_all.py --out <dir> [--scale 1.5]` renders the 2 shared effects and 3 units, then all previews, mockups and review sheets. That takes 98 s at 2x and 74 s at 1.5x on 2 threads.
- **Models and rigs:** Blender 5.0.1 as a Python module, Cycles on CPU. Units are built from rounded shapes on a joint tree.
- **Shading:** cel shading computed from surface normals and output as flat colour. There are no lamps, so 12 samples are enough.
- **Per frame:** a base render (team surfaces are holes), a grey team render (the game tints it underneath), and a separate smear render on the smear frame. Then comes the 2D outer outline.
- **Checks** in each unit's stats file: the A11 colour rule, team coverage of at least 18% per frame, and frames that touch the canvas edge.
- **Output:** a PixiJS sprite sheet as a 256-colour PNG. Frames are listed in playback order. The JSON carries clips (order, durations, impact timing, smear frame), per-frame anchor points (muzzle, lance tip, club head), the walk's stride and natural speed, and the death effect hand-off.
- **Previews:** built from the packed sheets alone, which also checks the JSON.

## 2. Critique status
All ten points are done (see the summary above), with one exception: the horse's mane has no follow-through, because it lies along the neck and needs a bending mesh. The outline darkness and shadow depth (points 1 and 2) differ from DESIGN A11. They need `docs/requests/` entries, which are drafted in the README.

## 3. How the units look now
**What works:**
- Strong readability at 56 px, including in greyscale; units are recognisable at 32 px.
- Silhouettes pass the black-fill test: Bonker's club is now its own shape in idle and walk.
- Team colour reads on both sides and in all 5 presets.
- Motion has weight: held wind-ups and impacts, the smear frame, follow-through, visible idle breathing, and a proper death pop.
- At DPR 2 it looks like a polished casual mobile game.

**What falls short:**
- No sculpting, bending meshes or painted texture.
- Faces are 1–3 px at DPR 1, so they mostly vanish there.
- Bonker's face is partly covered by his arm in some walk frames.
- The shield chevron reads as an abstract mark.
- The poof's last frames look like round balls, and the stars look slightly tan in the GIFs.
- There is no hit flash in the frames; the game must do it.

## 4. Measurements (2 threads, 12 samples; shipping format is the 256-colour PNG)

| Unit | Unique frames | Render time 2x | Full pipeline 2x | PNG 2x | v1 PNG 2x (38 frames) | PNG 1.5x |
|---|---|---|---|---|---|---|
| Bonker | 26 | 12.7 s | 19.8 s | 113 KB | 125 KB | 76 KB |
| Destrier Knight | 26 | ~26 s | ~50 s | 294 KB | 279 KB | 197 KB |
| Pulse Trooper | 26 | 11.3 s | 18.8 s | 121 KB | 120 KB | 82 KB |
| Shared poof + stars | 5 + 3 | ~1.3 s | ~5 s | 18 KB | | 13 KB |

- **Why the sheets barely shrank:** frames dropped 32%, but each frame grew. The outline adds 12 px to width and height, and the poses reach further (club held out, level lance, longer horse, bigger rider, longer gun).
- **Colour rule:** worst frames are 2.6%, 2.9% and 0.01% (limit 10%).
- **No frame touches the canvas edge.**
- **Walk speed match** (natural speed / sim speed → playback rate): Bonker 60 / 70 → ×1.17; trooper 64 / 65 → ×1.02; knight 76 / 60 → ×0.79.

**Size savings, measured at 1.5x:**

| Change | Bonker | Knight | Trooper | Saving |
|---|---|---|---|---|
| As rendered | 76 KB | 197 KB | 82 KB | – |
| Hit reaction done at runtime | 68 KB | 173 KB | 71 KB | 11–13% |
| Plus die as 2 frames | 66 KB | 165 KB | 69 KB | 13–16% |
| 128 colours instead of 256 | 74 KB | 182 KB | 74 KB | 3–10% (small quality risk) |

WebP was not smaller than the 256-colour PNG.

## 5. Size budget for 35 units plus 10 skins (limit: 8 MB total)

| Setting | Total |
|---|---|
| 2x as rendered | ~12 MB (over) |
| 1.5x as rendered | ~6.9 MB |
| 1.5x, hit at runtime, die 2 frames, legendaries at 1.25x | ~5.8 MB |
| Same, legendaries at 1x | ~5.2 MB |

- The best case leaves about 2.2–2.8 MB for the code and everything else. That only works if turrets, bases, projectiles and backdrops stay code-drawn.
- Load sheets per age and per match to keep the first download small.
- **More headroom if needed:** runtime recolour skins (up to 1.25 MB), a 6-frame walk (~8%), better packing (~5%), a stronger PNG compressor in CI (~10%, not measured here).
- **Graphics memory at 1.5x:** 1.4 MB for a small unit, 5.4 MB for the knight; about 25–35 MB for a match with around 12 unit types.

## 6. Cost for the full roster
- **Render time:** about 30 min at 2x or 25 min at 1.5x for 35 units plus 10 skins, fully scripted and re-runnable.
- **Agent effort (estimate, not measured):** about 1–2 agent hours per unit on an existing rig. The quadruped, vehicle, walker and flyer rigs each need about half a day first. With one agent per age in parallel plus review and fixes, that is roughly 5–7 sessions the size of this one, plus 1–2 more.
- **Game-side work still missing:** a sprite-sheet renderer in the game (the `atlas` tier in DESIGN B5) that handles the tinted team layer, per-frame durations, walk speed scaling, attack time-scaling to the sim's impact tick, the muzzle anchors, the death effect hand-off, and the runtime hit flash and recoil. That is about one work package.

## 7. Risks
1. **Size:** it only fits under the rules above. Long weapons and legendaries dominate.
2. **Consistency across 35 units:** shading and outlines are automatic. Silhouettes are checked by eye on a review sheet, not by a test.
3. **Hit flash:** Pixi's tint cannot brighten a sprite to white. Use a short filter during the 80 ms flash, or add white frames at a size cost.
4. **Design approval:** this changes DESIGN A11 (outline, shadow) and moves the sheet-based art tier into v1. The code-drawn puppet tier stays as placeholder and Lite fallback.
5. **Rigid parts:** capes, manes and similar soft shapes can only swing, not bend.
6. **Tooling:** the Blender module needs Python 3.11 and CPU-only Cycles. Commit the rendered sheets rather than rendering in CI.
7. **Two sprites per unit:** they come from one texture, so they batch well within the draw-call budget.

## 8. Recommendation
Same as above: a hybrid with 3D units and code-drawn everything else, then the one-age test in the real game before fanning out.

## 9. Output locations
Everything is under `/tmp/claude-0/-home-user-ageborn/e9e6071d-3409-58a6-a28d-0aba492052fd/scratchpad/art-spike/`:
- the `review/` folder;
- `lane_anim.gif` and the `lane_mockup_*` files;
- per unit: sheet PNG and JSON, stats, clip GIFs at 1x and 3x, contact sheet, team-layer sheet;
- `scale-1.5x/` (the same sheets at the budget scale);
- `stats.json`;
- `_v1/` (the previous version's outputs).
