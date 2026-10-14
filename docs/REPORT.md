# Studio report (first build, 2026-10-14)

Run instructions (fresh clone, commands, environment variables, ports, measured runtimes) are in `studio/README.md`.

## Game repo files (branch main-ipy06f)

`src/dev/capture/page.tsx`, `director.ts`, `scenario.ts`, `recorder.ts`, `test/director.test.ts`, plus one entry in `docs/decisions.md` (the dev capture page). Typecheck, lint, their 9 unit tests and the 67 integrity tests pass. Nothing in the game repo mentions the social account.

## What was built

- **Capture mode (dev only):** `?dev=1#capture` renders a real battle one frame per `window.__capture.step(n)`, so no frame is dropped even with software WebGL. Options: ages per side, decks, seed, scene and sky, HUD hidden or minimal, a scripted camera with easing, slow motion and an edge setting. Every sound and event is stamped with its frame. The sim is untouched.
- **Studio pipeline:** Playwright records frames and a JSON sidecar per clip; the capsule show is filmed under a virtual clock; the audio mix uses the game's own music and sound effects, mastered to about -14 LUFS; Remotion composes Reels, carousels, Stories and profile images with text in the safe zones; the final encode follows the research settings. Hooks for narration and word-timed captions are ready. Helpers: `peek.mjs` renders single frames to check text before a full render; `inventory.mjs` lists outputs.

## Outputs (now in `queue/`)

All Reels are 1080x1920, H.264 High yuv420p, 30 fps, AAC 48 kHz, faststart, each with a `-cover.jpg`.

| File | Length | Size | Description |
|---|---|---|---|
| r1-40-cavemen-vs-1-cosmic-tank.mp4 | 27.5 s | 21.8 MB | 40 Stone Age cavemen charge one Cosmic hover tank (live HP bar and counter); the tank survives on 4%, then 6 Spear Hunters beat it: "Counters beat numbers" |
| r2-most-satisfying-base-collapse.mp4 | 16.0 s | 15.0 MB | Medieval Keep, Iron Factory and Cosmic Spire break apart in slow motion, then "Which one? 1, 2 or 3" |
| r3-ursa-paladin-legendary.mp4 | 12.7 s | 10.9 MB | The Ursa Paladin, a knight on a war bear: reveal, roar shields allies, cleaves 2 at once, 2,150 HP |
| r4-stone-age-to-cosmic-age.mp4 | 20.6 s | 18.3 MB | One base evolves through all 8 ages, one bar of each age's music, age track on top (used once as a test Story on 2026-10-14) |
| r5-pick-one-legendary.mp4 | 17.8 s | 13.7 MB | Mammoth Matriarch, Lindworm and Star Leviathan each in a real fight with a one-line pitch, then a vote |
| r6-legendary-capsule-pull.mp4 | 13.6 s | 13.4 MB | A Time Capsule climbs Common, Rare, Epic to a Legendary walkout |
| carousel-rank-the-legends/01-07.jpg | | ~1 MB each | 1080x1350: cover, 5 Legendaries from 5 ages with stats, "Your ranking?" |
| stories/poll-stone-or-cosmic.jpg | | | Stone vs Cosmic poll frame (poll sticker only in the app) |
| stories/teaser-40-cavemen.mp4 | 5 s | 3.7 MB | Teaser pointing to R1 (silent) |
| profile/*.jpg | | | 3 profile picture proposals (emblem blue, emblem night, bear knight) |

Captions for every post and three bio proposals: `studio/captions.md`.

## Honest weaknesses

- Three Reels are earlier cuts; the fixes are in the scripts but not rendered:
  - R1 uses the old camera (empty ground in the lower third) and runs 27.5 s; a tighter ~23 s edit is ready: `node scripts/make.mjs r1` (about 10 min).
  - R4: the base is partly cut off at the left edge in every age: `node scripts/record.mjs r4 && node scripts/make.mjs r4` (about 20 min).
  - R5: captions sit on the beasts' feet and the vote cut-outs are small: `node scripts/make.mjs r5` (about 10 min).
- Audio checked by meters only (-14.1 to -14.3 LUFS; true peak -0.6 to -1.9 dBTP; R2's -0.6 is hotter than the -1 target).
- R6 shows the 16:9 capsule show across the middle of the vertical frame and leaves out the hammer strikes.
- Bases look soft in close-ups (their art has less than half the resolution of the unit art). Tall battle shots leave roughly the bottom 20-25% as plain ground.
- One Reel takes 15-25 min on an idle 4-core machine without a GPU, about double when jobs overlap. Large installs in parallel can fill the disk and kill a recording.
- All Reels use the game's own tracks, which share tempo and form.
- On-screen stats go out of date after balance changes; re-export the game data and re-render.
