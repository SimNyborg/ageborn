# Audio pipeline (sound effects and music)

Everything the game plays is composed and synthesized here, by our own scripts. Nothing is
downloaded: the only outside ingredient is the **FluidR3_GM** General MIDI soundfont (MIT licence,
Debian package `fluid-soundfont-gm`), whose instrument samples we play our own notes through. The
theme "Dawn March" (DESIGN A13) and every arrangement, fanfare and effect are original.

The output is:

| What | Where | Format |
|---|---|---|
| Sound effects | `public/audio/sfx/<group>.<hash>.ogg` | one mono Ogg Opus sprite sheet per sound group (40 kbps) |
| Music | `public/audio/music/<cue>.<hash>.ogg` | Ogg Opus, stereo 56 kbps (battle), 48 kbps (menu, capsule), 56 kbps (stingers); layer stems mono 32 kbps |
| Runtime manifest | `src/audio/assets.gen.ts` | generated: sheets, per-id variant offsets, music files and loop windows |

The game (`src/audio/files.ts`, `service.ts`, `musicEngine.ts`) plays these files through Web Audio
with the existing buses, ducking and voice limits. The ZzFX definitions in `src/audio/sounds.ts` and
the sequenced scores in `src/audio/scores` stay as the fallback: they play while a file is loading
and on a browser that cannot decode Ogg Opus.

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
| `sfx/render_sfx.py` | Renders, cleans up, normalises and limits every variant |
| `build.py` | Packs the sprite sheets, encodes everything to Ogg Opus, writes `src/audio/assets.gen.ts`, deletes stale files |
| `analyze.py` | The numerical listening test (below) |
| `list-sounds.ts` | Prints the sound ids and groups from `src/audio/sounds.ts` for `build.py` |

## Music

- **Form.** Every battle cue is the same 24 bars at 110 BPM (52.4 s): a 4-bar groove intro, the
  16-bar theme, a 4-bar turnaround. Because all ages share the form and length, an evolve
  cross-fades to the next age at the same point of the loop (`musicEngine.ts`), and the melody goes on
  in the new instruments.
- **Evolve key lift (A13).** The files cannot be transposed live, so each age is recorded in its key:
  Stone C, Medieval D, Gunpowder E, Modern F, Future F# (+2, +2, +1, +1).
- **Arrangements (A13 table).** Stone: taiko and hand drums, pan flute and shakuhachi, low strings,
  contrabass, log marimba. Medieval: horns, trumpet, trombones, recorder, lute, march snare,
  timpani. Gunpowder: fife and flute, field drums, tuba and trombones (oom-pah), trumpets, glockenspiel.
  Modern: brass section, trumpets, strings (melody and ostinato), synth bass, rock kit, timpani, muted
  guitar, choir. Future: saw lead, square arpeggio, warm pad and synth bass with side-chain pump, 808
  kit, strings, choir, brass, timpani, noise risers. Menu: the slow version at 84 BPM (flute,
  clarinet, horn, harp, strings, celesta). Capsule room: celesta, music box, pizzicato, marimba, pad.
- **Layers (A14.3).** `intensity` (one per age, percussion), `overdrive` (double-time percussion) and
  `siege` (heartbeat bass, synthesized) are 4-bar mono stems, unpitched so they fit every key. They
  loop in step with the main loop and fade with the layer level.
- **Balance.** Each part declares its loudness relative to the lead line (`Part.rel`, in LU); the
  renderer measures every stem and sets the gain from that, so the balance does not depend on how loud
  a soundfont sample is.
- **Mastering.** High pass 30 Hz, -1.5 dB at 240 Hz (mud), -1 dB at 3.3 kHz (harshness), a small
  high shelf, 2:1 glue compression, loudness to -16 LUFS (menu -17, capsule -18, victory -15,
  defeat -17), look-ahead limiter at -1.5 dBFS.
- **Seamless loops.** One pass is rendered with its tail; the tail is folded back onto the start
  (exactly what the previous pass would ring into bar 1), tiled three times for the time-varying
  processing, and the file is cut from the middle copy with 0.3 s of wrap-around margin on both sides.
  The manifest gives `loopStart` and `loopLength`; any window of that length inside the file loops
  without a seam, so the decoder's start padding cannot cause a click.

## Sound effects

- Every sound is layered: a short **transient** (the click that makes it read at low volume), a
  **body** (the pitch and weight: pitched-down sine punches, FM bells, plucked strings, GM
  instruments such as timpani, taiko, brass, glockenspiel, choir, tubular bells, gunshot) and a
  **tail** (air, debris, a small room).
- Frequent sounds (hits, spawns, deaths, shots, steps, coins, ticks) have 3 variants; the service adds
  the A13 pitch ±8% and volume ±3 dB spread on top.
- **Loudness targets** (loudest 200 ms window, LUFS): UI ticks -31 to -34, UI clicks -25 to -29,
  combat hits -26/-27, heavy hit -23, shots -21 to -28, spawns -26/-23, explosions -21/-19/-17, powers
  -19 to -21, fanfares and jingles -16 to -21. They sit close to the old ZzFX levels, so the mix
  balance tuned in the game still holds, but they are now consistent inside each category.
- **Phone speakers.** A sound whose weight sits below 300 Hz would vanish on a phone. The renderer
  measures the loudness through a 300 Hz high pass and, when it is more than 8 LU below the full
  range (11 for big booms), adds saturated upper harmonics of the lows (the ear hears the missing
  fundamental) and trims the deep sub.
- **Harshness.** For noisy sounds, a 1/3 octave in 2-5 kHz that sticks out more than 6 dB above the
  median is dipped by the excess.
- **Timed sounds** keep their exact length from the first sample: `evolve_riser` 2.5 s,
  `power_telegraph` 1.0 s, `last_stand_charge` 1.0 s, `cap_riser` 1.5 s.
- **Musical sounds** are in C (chimes, rarity reveals, capsule climbs C-E-G-C, level up); the evolve
  fanfares play the motif in the key of the age they lead to.

## The numerical listening test

`python tools/audio/analyze.py [music|sfx|encoded|all]` prints, per file: loudness, sample and true
peak, energy per band (sub < 100 Hz, low 100-300, mid 300-2k, presence 2-5k, air 5-10k, top), the
presence peak and, for effects, the phone-speaker loudness gap; for loops, the seam error (the audio
one loop apart must match: below -30 dB passes). Lines that break a target start with `!`.

## Adding or changing a sound

1. Add the id to `src/audio/sounds.ts` (with a ZzFX fallback) as before.
2. Add an `@sfx("<id>", target, variants)` design in `sfx/sounds.py`.
3. `render_all.sh sfx`, check `analyze.py sfx`, listen on the soundboard.
4. `npm test` checks that every id has a file and every variant lies inside its sheet.

## Browser support

Ogg Opus decodes in Chrome, Edge, Firefox and current Safari. Where a sheet or music file cannot be
fetched or decoded, the service warns once in the console and keeps playing the synthesized ZzFX
effects and sequenced music, so the game is never silent.
