# Audio pipeline (sound effects and music)

Everything the game plays is composed and synthesized here, by our own scripts. Nothing is
downloaded: the only outside ingredient is the **FluidR3_GM** General MIDI soundfont (MIT licence,
Debian package `fluid-soundfont-gm`), whose instrument samples we play our own notes through. The
theme "Dawn March" (DESIGN A13) and every arrangement, fanfare and effect are original.

The output is:

| What | Where | Format |
|---|---|---|
| Sound effects | `public/audio/sfx/<group>.<hash>.ogg` | one mono Ogg Opus sprite sheet per sound group (40 kbps), starting with a sync burst |
| Music | `public/audio/music/<cue>.<hash>.ogg` | Ogg Opus, stereo 48 kbps (battle, menu, capsule), 56 kbps (stingers); layer stems mono 40 kbps |
| AAC copies | `public/audio/*/<name>.<hash>.m4a` | AAC-LC: music 56 kbps stereo, sheets 48 kbps mono, stems 40 kbps mono (for browsers without Ogg Opus; B16 music budget) |
| Runtime manifest | `src/audio/assets.gen.ts` | generated: sheets (with `alt` and `sync`), per-id variant offsets, music files (with `alt`) and loop windows |
| Narrator lines | `public/audio/voice/<key>.<hash>.ogg` and `.m4a`, manifest `src/audio/voice.gen.ts` | one mono Ogg Opus (64 kbps) and AAC (48 kbps) file per line, rendered with Kokoro (see "Narrator voice") |

The game (`src/audio/files.ts`, `service.ts`, `musicEngine.ts`) plays these files through Web Audio
with the existing buses, ducking and voice limits. Browsers that cannot play Ogg Opus get the AAC copy
first; elsewhere the AAC copy is the retry when an Ogg file fails to decode. The ZzFX definitions in
`src/audio/sounds.ts` and the sequenced scores in `src/audio/scores` stay as the last fallback: they
play while a file is loading and where neither file decodes.

## Running it

```sh
apt-get install -y fluidsynth fluid-soundfont-gm ffmpeg      # once
python3 -m venv /tmp/audio-venv && /tmp/audio-venv/bin/pip install -r tools/audio/requirements.txt
AUDIO_PYTHON=/tmp/audio-venv/bin/python tools/audio/render_all.sh          # everything, ~5 min on 4 cores
AUDIO_PYTHON=/tmp/audio-venv/bin/python tools/audio/render_all.sh sfx      # effects only
AUDIO_PYTHON=/tmp/audio-venv/bin/python tools/audio/render_all.sh music    # music only
```

Single pieces: `cd tools/audio/music && python render_music.py music.stone`, or
`cd tools/audio/sfx && python render_sfx.py hit_blunt coin_gain`, then `python tools/audio/build.py`.
FluidSynth renders are cached in `tools/audio/.cache/` (git-ignored), so re-runs are fast.

Then check the result in the browser: `npm run dev`, open `http://localhost:5173/?dev=1#soundboard`,
press "Render every id and cue offline" (decodes and measures every file) and click through the ids.

## Files

| File | Does |
|---|---|
| `lib/dsp.py` | Oscillators (band-limited), noise, filters (static and swept), EQ, compressor, look-ahead limiter, synthetic room reverb, layering |
| `lib/gm.py` | Writes MIDI with `mido` and renders it with FluidSynth (reverb and chorus off: we add our own) |
| `lib/loud.py` | BS.1770 loudness (integrated and loudest 200 ms window), true peak, band balance, 2-5 kHz harshness |
| `music/theme.py` | "Dawn March" as note data (the same 16 bars as `src/audio/scores/dawnMarch.ts`) |
| `music/arrangements.py` | The arrangements: menu, capsule, Stone, Medieval, Gunpowder, Modern, Future, the stingers and the layer stems |
| `music/render_music.py` | Renders each instrument to its own stem, balances, mixes, adds reverb, masters and cuts seamless loops |
| `sfx/kit.py` | Effect building blocks: transients, pitched thumps, bells, plucks, whooshes, debris, crackle, GM layers |
| `sfx/sounds.py` | Every sound id of DESIGN A13/A14 as a layered design, with its loudness target and variant count |
| `sfx/sounds_combat.py` | The combat sound pass (queue item 38, A7): kill accent, material layers, body falls, huge bodies' deaths, the clash, the leap landing and the battle ambience loop |
| `sfx/render_sfx.py` | Renders, cleans up, normalises and limits every variant |
| `build.py` | Packs the sprite sheets, encodes everything to Ogg Opus, writes `src/audio/assets.gen.ts`, deletes stale files; an input it encoded before with the same settings is not encoded again (`.cache/encoded/`), so a rebuild after one changed sheet takes under a minute |
| `analyze.py` | The numerical listening test (below) |
| `list-sounds.ts` | Prints the sound ids and groups from `src/audio/sounds.ts` for `build.py` |

## Music

- **Form.** Every battle cue is the same 44 bars at 110 BPM (96 s): a 4-bar groove intro, the 16-bar
  theme, a 12-bar B-theme (the motif moved to vi and IV: Am F C G | Dm G Em Am | F G F G), an 8-bar
  breakdown (drums, bass and ostinato, no melody) and a 4-bar turnaround. Because all ages share the
  form and length, an evolve cross-fades (equal power) to the next age at the same point of the loop
  (`musicEngine.ts`), and the music goes on in the new instruments.
- **Theme.** "Dawn March" (`music/theme.py`, mirrored in `src/audio/scores/dawnMarch.ts`): the B
  section is Am | Dm | G | G7 and ends in a scale run up to the top C; bars 4, 7 and 13 vary the
  rhythm. The menu has its own relaxed tune ("Hearth Song", `MENU_MELODY`) so the battle theme stays
  fresh.
- **Evolve key lift (A13).** The files cannot be transposed live, so each age is recorded in its key:
  Stone C, Medieval D, Gunpowder E, Modern F, Future F# (+2, +2, +1, +1). The A17 ages are recorded in
  their keys on the eight-age chain (+2, +2, +1, +1, +1, +1, +1): Bronze D (+2), Industrial F# (+6),
  Cosmic A (+9, with the lead lines an octave down because the total passes +6).
- **Arrangements (A13 table).** Stone: taiko and hand drums, pan flute and shakuhachi, low strings,
  contrabass, log marimba. Medieval: horns, trumpet, trombones, recorder, lute, march snare,
  timpani. Gunpowder: fife and flute, field drums, tuba and trombones (oom-pah), trumpets, glockenspiel.
  Modern: brass section, trumpets, strings (melody and ostinato), synth bass, rock kit, timpani, muted
  guitar, choir. Future: saw lead, square arpeggio, warm pad and synth bass with side-chain pump, 808
  kit, strings, choir, brass, timpani, noise risers. Bronze (A17): reed pipe (oboe, a double-reed
  colour in the loud bars), horns and horn fifths, a rolling lyre (harp), hammered dulcimer, a
  tonic-fifth cello drone, contrabass, big frame drum (taiko pitched up) with a maqsum rhythm,
  frame drums, riq and finger cymbals, Chinese cymbal, timpani. Industrial (A17): colliery brass band
  (cornet lead, euphonium, trombone chords, tuba with walking pickups), accordion (melody in the
  bridge, off-beat chords), bells, march drums with a steam-engine kick on every beat, timpani, and a
  numpy "steam machine" (piston chuffs on the 8ths, a struck anvil on the backbeat, vent hisses at
  section starts; it leads the breakdown). Cosmic (A17): choir lead doubled by synth brass, string
  melody, brass, string ostinato, celesta bell arpeggios, a space-voice choir pad and a polysynth
  pad with side-chain pump, synth-bass sub pulse, timpani, taiko, orchestral kit, electronic hats and
  the noise risers. Menu: the slow version at 84 BPM (flute,
  clarinet, horn, harp, strings, celesta). Capsule room: celesta, music box, pizzicato, marimba, pad.
- **Layers (A14.3).** 4-bar mono stems that loop in step with the main loop and fade with the layer
  level. `intensity` (one per age, in the age's key): an 8th-note tonic-octave ostinato (a pedal point
  that sits under every chord) in strings or brass plus top-band percussion, high-passed at 150 Hz,
  -22 LUFS. `overdrive`: 16th hats and tambourine, 8th kick, a snare accent on beat 4 and a roll into
  every fourth bar. `siege`: heartbeat bass (synthesized). Stems are limited at -3 dBFS.
- **Stingers** are recorded in every age key (`stinger.victory`, `stinger.victory.k2` ... `.k6`,
  same for defeat); `musicEngine` plays the one for the key the battle ended in. For the eight-age
  chain there are also `.k7`, `.k8` and `.k9` (Modern G, Future G#, Cosmic A); from `.k7` on the
  victory lead plays an octave down.
- **Balance.** Each part declares its loudness relative to the lead line (`Part.rel`, in LU); the
  renderer measures every stem and sets the gain from that, so the balance does not depend on how loud
  a soundfont sample is.
- **Mastering.** High pass 30 Hz, -1.5 dB at 240 Hz (mud), an optional presence bell at 3.5 kHz and
  low shelf at 110 Hz per cue (`presence_db`, `low_db`), a high shelf at 9 kHz (`air_db`), 2:1 glue
  compression, loudness to -16 LUFS (menu -17, capsule -18, victory -15, defeat -17), look-ahead
  limiter at -1.5 dBFS. Pads and strings get -3 dB at 300 Hz; there is no presence cut on the leads
  (small speakers need it). Target: presence (2-5 kHz) at least -15 dB and brilliance (5-10 kHz) at
  least -22 dB of the total energy for every battle and menu cue.
- **Seamless loops.** One pass is rendered with its tail; the tail is folded back onto the start
  (exactly what the previous pass would ring into bar 1), tiled three times for the time-varying
  processing, and the file is cut from the middle copy with 0.3 s of wrap-around margin on both sides.
  The manifest gives `loopStart` and `loopLength`; any window of that length inside the file loops
  without a seam, so the decoder's start padding cannot cause a click.

## Sound effects

- Every sound is layered: a short **transient** (the click that makes it read at low volume), a
  **body** and a **tail** (air, debris, a small room). Impacts (hits, spawns, deaths, shots) carry a
  **mid-band layer** (800 Hz-4 kHz: `crack`, `knock`, recorded drums) with 40-60% of the energy, so
  they read on phone speakers; the sine punch (`thump`) is high-passed at 100 Hz (50 Hz for big booms).
- Recorded one-shots from FluidR3 (`kit.perc`, `kit.sample`) replace most synth timbres: woodblock and
  claves (UI clicks, toggles, emotes, arrow hits), orchestra-kit toms and rimshots (blunt hits, spawns,
  capsule thuds), power-kit snares (heavy hits, flak), the GM gunshot (rifle, MG, musket, cannon, and
  pitched down in every explosion), pizzicato (spawn pop), reverse cymbals (evolve riser). Unit deaths
  get a short formant "hup" grunt that starts at full level.
- Frequent sounds (hits, spawns, deaths, shots, steps, coins, ticks) have 3 variants; the service adds
  the A13 pitch ±8% and volume ±3 dB spread on top.
- **Loudness targets** (loudest 200 ms window, LUFS): UI ticks -31 to -34, UI clicks -25 to -29,
  combat hits -22/-23 (since the combat pass, A7; heavy hit -19.5), the swing whoosh -32, shots -21 to
  -28, spawns -26/-23, explosions -21/-19/-17, powers -19 to -21, fanfares and jingles -16 to -21.
- **The impact is the loudest beat of an attack** (A7, queue item 38): the hits sit about 10 LU over the
  swing whoosh that announces them and carry a body layer below 200 Hz (`hit_body`, a low punch a few ms
  after the crack so the peaks do not stack). Their peak ceiling is -6 dBFS (`sfx(..., ceiling=)`;
  everything else -1.5), about the master limiter's threshold (`src/audio/mixer.ts`: -10 dBFS after the
  0.7 master trim), so a single hit is barely limited and gets its loudness from body; stacked moments
  meet the limiter. The combat layers: `kill_accent` -24, `mat_armour`/`mat_wood` -28 (6 dB under a hit),
  `body_fall_s/m/l` -27/-24/-21, `die_bio_l`/`die_mech_l` -21/-20, `clash_crash` -19, `leap_land` -26.
- **Loops in a sheet.** `sfx(..., loop=(start, length))` marks a seamless window inside a sound (the
  battle ambience: its events sit on a circle, it is rendered three times with its reverb and the middle
  copy is cut with 0.25 s of wrap-around margin on both sides); `build.py` writes it to the manifest as
  `loop`, and `WebAudioService.setBattleAmbience` loops that window of the decoded sheet.
- **Phone speakers.** The renderer measures every variant through a phone-speaker model (4th-order
  band pass 350 Hz-12 kHz). When it loses more than 4 LU against full range (6 for explosions, cannon,
  base and walkout), it adds saturated upper harmonics of the lows and then lowers the lows in 3 dB
  steps until it passes. The designs themselves already pass for almost every id.
- **Harshness.** For noisy sounds, a 1/3 octave in 2-5 kHz that sticks out more than 6 dB above the
  median is dipped by the excess.
- **Timed sounds** keep their exact length from the first sample: `evolve_riser` 2.5 s (unpitched,
  so it fits the music in any key),
  `power_telegraph` 1.0 s, `last_stand_charge` 1.0 s, `cap_riser` 1.5 s.
- **Musical sounds** are in C (chimes, rarity reveals, capsule climbs C-E-G-C, level up); the evolve
  fanfares play the motif in the key of the age they lead to.
- **Mix.** Battle music plays 12 dB under its master (`FILE_GAIN_DB` in `src/audio/music.ts`) through
  the music bus (0.55); effects play through the effects bus at 1.0. A single `hit_blunt` (loudest
  200 ms) then sits about 11 LU above the battle music's median momentary loudness (about 7 LU before
  the combat pass), and the battle ambience at full level about 4 LU under the music.

## The numerical listening test

`python tools/audio/analyze.py [music|sfx|encoded|all]` prints, per file: loudness, sample and true
peak, energy per band (sub < 100 Hz, low 100-300, mid 300-2k, presence 2-5k, air 5-10k, top), the
presence peak and, for effects, the phone-speaker loudness gap; for loops, the seam error (the audio
one loop apart must match: below -30 dB passes). Lines that break a target start with `!`.

## Sounds rendered before the game registers them (A17)

`build.py` takes the ids and groups from `src/audio/sounds.ts` (through `list-sounds.ts`). Sounds
designed here before `sounds.ts` lists them go into `pending_sounds.json` (id, group, bus, and which
group each new group follows); `build.py` adds any pending id that `sounds.ts` does not list yet, at
the end of its group, so existing sheets keep their offsets. Delete the file once `sounds.ts` lists
every id. To publish files without touching `src/`:

```sh
python tools/audio/build.py --no-prune --manifest-out tools/audio/generated/assets.gen.a17.ts
```

`--manifest-out` writes the manifest elsewhere; `--no-prune` keeps the files the current
`src/audio/assets.gen.ts` still references. `tools/audio/generated/assets.gen.a17.ts` is the drop-in
replacement for `src/audio/assets.gen.ts` with the A17 files (new sheets `bronze`, `industrial`,
`cosmic`; `alert_base` appended to `battle`; `music.bronze`, `music.industrial`, `music.cosmic`,
their `layer.intensity.<age>` stems and the `.k7`-`.k9` stingers). A plain `build.py` run after
`sounds.ts` registers the ids produces the same files and prunes the old `battle` sheet.

## Adding or changing a sound

1. Add the id to `src/audio/sounds.ts` (with a ZzFX fallback) as before.
2. Add an `@sfx("<id>", target, variants)` design in `sfx/sounds.py`.
3. `render_all.sh sfx`, check `analyze.py sfx`, listen on the soundboard.
4. `npm test` checks that every id has a file and every variant lies inside its sheet.

## Narrator voice (queue item 39)

The narrator reads the tutorial's lines and a few first-time moments aloud in the voice the owner chose
("Lewis", docs/owner-queue.md item 39). The lines are rendered offline with **Kokoro v1.0** (int8 ONNX,
Apache 2.0, through `kokoro-onnx` 0.6.1) and shipped as small files; nothing runs at play time.

| File | Does |
|---|---|
| `voice/lines.json` | The line list as data: i18n keys (`each` renders one line per filling of a placeholder, e.g. the Anti-heavy hint per card), and `respell`: how to spell a name for the voice where Kokoro reads it wrong |
| `voice/list-lines.ts` | Prints the lines with their English text from `src/i18n/*.en.json` (`npx tsx tools/audio/voice/list-lines.ts`) |
| `voice/render.py` | Renders, masters and encodes every line and writes `src/audio/voice.gen.ts` |

- **Recipe.** Style 0.7 × `bm_lewis` + 0.3 × `am_onyx`, en-gb, speed 0.88, then item 39's ffmpeg chain
  unchanged (pitch down 4.5 % at the same tempo, +2.5 dB at 130 Hz, +1.5 dB at 3.2 kHz, 3:1 compression, two
  early echoes, single-pass loudnorm to -16 LUFS / -1.5 dBTP). Each line runs through the chain behind the
  same primer (the first approved sample line), so the loudness stage has settled as it had in the approved
  samples, and is cut out at its onset: every line lands at about -16 LUFS. The model files are checked by
  SHA-256.
- **Pronunciation.** Kokoro reads through espeak-ng (en-gb), which gets a few names wrong ("Grenadier"
  stressed on the first syllable, "Phalangite" with a hard g). `respell` in `lines.json` changes, whole word,
  only what the voice is given ("Grenadeer", "Falanjite"); the subtitle and the manifest keep the real
  spelling. The render prints the phonemes Kokoro is fed for such a line, so the reading can be checked.
- **Output.** `public/audio/voice/<key>.<hash>.ogg` (mono Ogg Opus, 64 kbps: at 32-48 kbps Opus loses 2-3 dB
  of the voice's presence at 3-9 kHz) and `.m4a` (AAC-LC, 48 kbps), encoded by `build.py`'s `encode` like
  every other file; the manifest lists each line's files, length, sizes, English text and input hash.
- **AAC peaks.** The AAC encoder overshoots (up to +3 dB at 48 kbps), so an AAC copy whose decoded true peak
  would pass -1 dBTP is encoded again from the master turned down until it decodes at -1.2 dBTP or under. The
  manifest records that gain (`altGain`, dB) and the narrator turns the copy back up, so it plays within
  0.2 dB of its Ogg file and no decoder that stops at full scale clips it.
- **Re-running.** A line whose text and recipe are unchanged (same hash), whose files exist and whose AAC
  copy decodes under the cap is kept, so a re-run reproduces the same files; a changed string re-renders only
  its line and its old files are deleted. A respelling counts in the hash only where it changes a line. The
  render is deterministic as well (Kokoro on one CPU thread, ffmpeg bit-exact): `--force` writes the same
  bytes. `--check` lists stale lines and why, without rendering (no model needed); `npm test` also fails while
  a line's text differs from its string.
- **At play time** (`src/audio/narrator.ts`, `src/app/narration`): a line plays only while its string still
  reads the rendered text in the current language, so a new string or the Danish pass shows its subtitle
  silently until it is rendered (Danish needs a TTS with Danish voices).

```sh
python3 -m venv /tmp/kokoro && /tmp/kokoro/bin/pip install kokoro-onnx==0.6.1 soundfile scipy
# kokoro-v1.0.int8.onnx and voices-v1.0.bin from the kokoro-onnx releases, in one folder:
KOKORO_MODELS=/path/to/models /tmp/kokoro/bin/python tools/audio/voice/render.py
/tmp/kokoro/bin/python tools/audio/voice/render.py --check
```

Add a line: put its i18n key in `lines.json`, render, and have the screen call the narrator (`voice` in the
UI env, or the app's `narration`).

## Browser support

Ogg Opus decodes in Chrome, Edge, Firefox and current Safari. Where `canPlayType('audio/ogg;
codecs="opus"')` says no (older Safari and iOS), the service loads the AAC copy first; everywhere else
it retries with the AAC copy when an Ogg file fails to decode. AAC decoders may keep the encoder
priming (1024-2112 samples) at the start: every effect sheet starts with a 3 ms sync burst at a known
time (`sync` in the manifest), and `SfxFileBank` measures where it landed after decoding and shifts
the clip offsets by the difference. Loops are safe anyway (the 0.3 s wrap-around margin). Where no
file can be fetched or decoded, the service warns once in the console and keeps playing the
synthesized ZzFX effects and sequenced music, so the game is never silent.
