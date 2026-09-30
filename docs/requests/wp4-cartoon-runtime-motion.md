# Request to WP4: cartoon runtime motion for the atlas units

- From: the cartoon art pass (art director plan 2026-09-30, Stone Age first; owner decision
  "Owner decision 2026-09-30" in `docs/decisions.md`: keep the cartoon style).
- To: WP4 (`src/visuals/adapters/atlas.ts`).
- Status: open.

## Why

The unit sheets are cartoon again (squash and stretch, smears, KO faces, dust puffs are baked
into the frames). `atlas.ts` still applies the rules written for the parked realistic restyle
(docs/ui-plan.md 5.8, MR-100, MR-103, MR-105, lines 86-112 and 651-750):

- "bodies are rigid, so weight shows through timing and a few lu of offset, never a scale squash";
- MR-100 spawn: a drop-in by `dropLu` with no scale;
- MR-103 hit: a flinch offset only, no squash;
- MR-105 death: the body lies for `DEATH_LIE_MS`, then sinks and fades.

The new cartoon die clips already end in a readable KO pose (X or spiral eyes, tongue out) and
hand off to `fx.dust_poof` and `fx.ko_stars` at the sheet's `die.fx` times, with the body hidden
at `hideUnitAtMs`. Lying on and sinking after that fights the poof and makes the KO pose look
like a corpse, which is the realistic look the owner rejected.

## What we ask

1. **Spawn pop (A11):** scale 0 -> 1.15 -> 1 over about 220 ms with the ease-out-back curve,
   plus the dust ring at the feet (the current `spawnDust()`), instead of the drop-in. Keep
   the per-mass timing (heavies slower, overshoot 1.08).
2. **Hit squash:** on a victim flash, a short squash of the whole sprite container (0.9/1.1 for
   light, 0.94/1.06 for medium, 0.97/1.03 for heavy; about 90 ms out, 120 ms back) on top of
   the current flinch offset. The baked hit clip already has the eye squeeze and recoil.
3. **Death hand-off:** honour `die.hideUnitAtMs` as the end of the body (no extra lie time, no
   sink, no fade), and spawn the sheet's `die.fx` (poof, KO stars) at their `atMs`, as the
   procedural tier does.
4. Drop the "rigid body" comment and the MR-100/103/105 constants for atlas units, or put them
   behind the art style so a future realistic style can switch them back on.

## Contract kept by the art (nothing to change in the sim)

Clip names, `durationMs`, attack `impactAt`, die `fx` times and `hideUnitAtMs`, anchors,
`strideLu` and `naturalSpeedLuPerS` are the same as before. The attack is still time-warped
by `track()` (pre-impact part to the sim wind-up, post-impact part kept).

## Check

Playwright battle shots at 844x390 and 1280x720: a spawned Bonker pops in, a hit Pebbler
squashes and squeezes its eyes, a Tuskback shows its legs-up KO pose and then the poof and KO
stars, with no lying-and-sinking body afterwards.
