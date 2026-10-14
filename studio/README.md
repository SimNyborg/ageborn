# Ageborn studio

A small video production base that turns the game's own battles, art, music and sound effects into
Instagram Reels (1080x1920), carousel slides (1080x1350), Stories (1080x1920) and profile pictures.
Everything is rendered from the game itself: real battles on the game's deterministic sim, filmed frame
by frame through the game's dev capture page, then edited, mixed and encoded here.

Nothing in this folder belongs in the game repo. The only thing the game repo has is a generic,
dev-only capture page (`?dev=1#capture`, `src/dev/capture/`).

## From a fresh clone

The studio is a plain folder (not part of any repo). It needs a checkout of the game that contains
the dev capture page (`src/dev/capture/`), Node 22, Python 3 with numpy and Pillow, ffmpeg 6 and a
Chromium for Playwright (revision 1194: `chromium-1194` films, `chromium_headless_shell-1194` renders;
on a machine without them, `npx playwright@1.56.1 install chromium chromium-headless-shell`).

```bash
# 1. the game (read only for the studio; its dev server serves the capture page)
git clone https://github.com/simnyborg/ageborn.git /home/user/ageborn && (cd /home/user/ageborn && npm install)
# 2. the studio
cd <studio> && npm install                    # Playwright core, Remotion 4, React 19, fonts (~550 MB)
pip install numpy pillow                       # the mixer and the cut-out tool
export AGEBORN_REPO=/home/user/ageborn         # defaults shown; only set what differs
export AGEBORN_PORT=7951                       # the game's dev server (Remotion uses a free port in 7952-7959)
export CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
export HEADLESS_SHELL=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
export RENDER_CONCURRENCY=3                    # Remotion tabs per render (2 while a recording runs)
# 3. game data and art (once, and after balance or art changes)
(cd $AGEBORN_REPO && npx tsx <studio>/tools/export-game-data.ts > <studio>/assets/game.json)
node scripts/server.mjs &                      # prints "game dev server (no hot reload) on ...:7951"
node scripts/grab-wordmark.mjs                 # the wordmark and emblem SVG from the title screen
python3 tools/cutout.py ursa_paladin attack 6 2f7df6 public/art/cut/ursa_paladin-attack.png
# 4. a reel: film, then edit + mix + render + encode
node scripts/record.mjs r1                     # -> public/clips/r1/*.mp4 + *.json
node scripts/make.mjs r1                       # -> out/reels/<name>.mp4, <name>-cover.jpg, out/sheets/<name>.jpg
node scripts/peek.mjs r1 0 120 400             # optional: a few frames as PNG to check text before a full render
# 5. stills
node scripts/record.mjs stills && node scripts/stills.mjs carousel   # also: story, profile
node scripts/inventory.mjs                     # the deliverables table (length, size, format)
pkill -f scripts/server.mjs                    # stop the game server when done
```

**Runtime on 4 CPU cores without a GPU** (WebGL in software): filming a 1080x1920 battle frame takes
0.45-0.7 s alone and 1.0-1.2 s while a render runs; a 1920x1080 capsule frame 1.5-2.5 s. Filming one
reel's clips alone took 4-11 min (R4 4.4, R3 4.6, R5 7.2, R1 10.6 min), twice that beside a render. A
render takes about 20 s per second of reel alone (R1, 27.5 s: 9.3 min at `RENDER_CONCURRENCY=3`) and
45-60 s per second beside a recording (R4 14 min, R5 17.6 min); the final encode takes under a minute.
So one reel is about 15-25 min from shot script to MP4 on an idle machine. Disk: about 15 MB per
recorded clip; `make.mjs` deletes its silent intermediate render after the final encode (`--keep`
keeps it).

## The pipeline in short

```bash
node scripts/server.mjs &          # the game's dev server on :7951, no hot reload (a capture runs for minutes)
node scripts/record.mjs r1         # film the clips of shots/r1.mjs into public/clips/r1/ (video + JSON sidecar each)
node scripts/make.mjs r1           # edit, mix, render, encode: out/reels/<name>.mp4, a cover and out/sheets/<name>.jpg
node scripts/stills.mjs            # carousel slides, Stories and profile pictures (after `record.mjs stills`)
```

`bash scripts/record-batch.sh r2 r3:paladin r4` films several shot scripts (or one clip of a shot,
`shot:clip`) one after another and retries a failed one once; `WAIT_PID=<pid>` makes it start when another
job ends. Do not edit `record-batch.sh` while a batch runs (bash reads scripts as it goes).
Stop the server when done (`pkill -f scripts/server.mjs`).

## How it works

1. **Capture (game repo, dev only).** `?dev=1#capture` runs a real battle on the game's sim and draws one
   fixed frame per `window.__capture.step()` call: no ticker, no wall clock, so no frame is ever dropped,
   however slow the software WebGL is (0.35-0.6 s a frame at 1080x1920 here). It has a scripted camera
   (follow the fight, frame a range, track a unit, frame a base, cut, ease or spring), slow motion
   (`setTimeScale`), any starting age per side, staging helpers (spawn armies, evolve, base health,
   stances) and records every sound call and sim event with its frame. URL options and the API are
   documented at the top of `src/dev/capture/page.tsx`.
2. **Record (`lib/capture.mjs`, `shots/*.mjs`).** A shot script opens the page in Chromium (540x960 CSS at
   device scale 2, so the game picks its HD unit sheets and the output is 1080x1920), stages the battle,
   moves the camera and records clips. Frames go as PNG straight into ffmpeg (H.264 4:4:4 CRF 10, no frame
   files on disk). Each clip gets a JSON sidecar: the state after every frame (camera, base health, ages,
   unit counts, watched units' health), the sim events and the game's sound calls with their clip time,
   and named markers (`s.mark('impact')`) for the edit. `skip(ms)` runs the battle on without drawing,
   so jump cuts cost nothing. Battles are deterministic: the same script films the same battle.
   `tools/scout.ts` runs the same setup headlessly in Node to find matchups worth filming first
   (`cd <repo> && npx tsx <studio>/tools/scout.ts clash '<json>'`).
   Screens that are not the battle (the Time Capsule show) are filmed under a virtual clock
   (`lib/vtime.mjs`): `performance.now`, `Date.now`, `requestAnimationFrame`, timers and every CSS animation
   run on a clock that only the recorder advances, one frame per screenshot (`shots/r6.mjs`, the game's
   dev capsule bench with perfect hammer taps). The show's sound cues come from its own plan.
3. **Edit (`reels/*.mjs`, `lib/edit.mjs`).** An edit picks pieces of clips by their markers and writes an
   edit decision list (`work/<id>/edl.json`) and the matching audio mix spec (`work/<id>/mix.json`), so
   picture and sound always line up. Overlays: slam titles, word-timed captions, a fighting-game health
   bar, counters, rarity badges, an age track, flashes, a vignette, a vote stage, cut-out images and the
   end card. Video segments can push in, shake, freeze, cut in with a flash, a punch or a whip, sit in a
   framed window or panel, or blur as a background.
4. **Mix (`lib/mix.py`).** The game's own audio files from `public/audio` of the repo: the battle music
   (looped on its loop window; every age's track is 110 BPM in the same form, so the edit cuts on bar
   lines and can change age tracks in time, see `MUSIC` in `lib/edit.mjs`), every recorded sound effect at
   its frame from the game's sprite sheets with the game's mix settings (gain trims, 4 voices and a 40 ms
   gap per sound, pitch and volume spread), hand-placed accents for titles, ducking under loud effects,
   then mastering to -14 LUFS with a look-ahead limiter (peaks at -2 dBFS).
5. **Render (`remotion/`, `lib/render.mjs`).** One Remotion composition, `Reel`, renders any EDL with the
   local headless shell; the final encode (`finalEncode`) follows research-tools.md and Meta's Reels spec:
   1080x1920, H.264 High yuv420p, 30 fps, GOP 60, max 20 Mbps, AAC 48 kHz 128 kbps stereo, `+faststart`.
6. **Review (`lib/sheets.mjs`).** A contact sheet of 24 stamped frames per reel in `out/sheets/`.

## Layouts and safe zones

Text stays inside x 60-960 and y 250-1520 of the 1080x1920 frame (Instagram covers the top 250 px,
the bottom 400 px and the right 120 px with its UI); titles and captions are centred on x 510. The
gameplay is filmed full-bleed and tall: the camera shows about 380-570 lu of the lane (the HD unit
sheets are drawn at about 2.45 px per lu, so this is their native sharpness), the ground line sits at
about 75% of the height, so the battle fills the middle band, the sky carries the titles and the ground
carries the captions. The director narrows any framing that would show above the backdrop's sky
(about 780 lu above the ground). Landscape footage (the capsule show, whose stage is 16:9) runs across
the middle of the frame with `wide` (1.8x the frame width, top and bottom feathered into a blurred copy
of itself), or sits in a framed `window`; `panel` places several clips at once.

## Stills

- `node scripts/record.mjs stills` films battle stills of six Legendaries in their own age scenes
  (`public/stills/<name>-<slide|story>-<k>.png`, several candidates each).
- `tools/cutout.py` cuts a unit out of its HD sheet with the team colour applied the way the game does
  (grey team layer multiplied by the colour, under the base frame): `public/art/cut/`.
- `scripts/stills.mjs` renders the `Slide`, `Story` and `Profile` compositions (`remotion/stills/`).
- `scripts/grab-wordmark.mjs` takes the game's wordmark and emblem SVG from its title screen.

## Narration and captions (ready, waiting for a voice)

TTS models and stock media are blocked in this container for now. The hooks are in place:

- **Voice:** `Timeline.write({ narration: { file, at, gainDb } })` puts a voice file into the mix; the
  mixer ducks the music about 9 dB under it.
- **Word-timed captions:** `lib/captions.mjs` turns word timestamps (from a TTS engine that reports them,
  or from faster-whisper / whisperX on the voice track: `wordsFromWhisper`) into caption overlays; each
  caption page lights up its current word.
- **A free voice that works here:** `pip install kokoro-onnx soundfile` with the model files
  `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin` from
  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/ (offline, CPU). Pick a
  deep original narrator voice (no sound-alike of a real person); faster-whisper (CPU, int8) on the
  voice file gives the word times for `lib/captions.mjs`.

## Publishing (not part of this folder)

The Instagram Login API takes media only by public URL (no file upload): the finished files are pushed
to the public repo's social-media branch and Meta fetches them from raw.githubusercontent.com. The
encodes in `out/reels/` already meet the Reels spec (H.264 High, yuv420p, 30 fps, AAC 48 kHz, faststart,
under 25 MB each).

## Folder layout

```
lib/            capture client, edit helpers, mixer, render and encode, captions, contact sheets, config
shots/          recording scripts (one per reel, plus stills)
reels/          edits (one per reel)
remotion/       compositions: Reel, Slide, Story, Profile; components; theme (the game's palette and type)
scripts/        record, make, stills, server, batch, wordmark grab, probes
tools/          game data export, scouting, unit cut-outs, music profiling
assets/         game.json (unit names and stats, audio catalogue), the grabbed wordmark
public/         what Remotion reads: clips, mixes, fonts, art (wordmark, cut-outs), stills
work/           intermediates (renders, EDLs, logs)
out/            deliverables: reels/, carousel/, stories/, profile/, sheets/
```

`assets/game.json` comes from the game repo (read only): `cd /home/user/ageborn && npx tsx
<studio>/tools/export-game-data.ts > <studio>/assets/game.json`.
