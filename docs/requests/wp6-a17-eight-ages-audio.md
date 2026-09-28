# Request: sounds and music for the three new ages (A17.12, A17.8)

**From:** the A17 step 2 wiring task. **To:** WP6 (`src/audio`, `tools/audio`).

The new cards reference the A17.12 sound ids, and the new ages the music cues `music.bronze`,
`music.industrial`, `music.cosmic`. None of them is in the sound or music manifest yet, so
`src/audio/test/sounds.test.ts` ("every unit, turret, power and skin sound exists"),
`tests/integrity/ids.test.ts` (sound and music ids) and `src/render/test/realSim.test.ts`
(`evolve_fanfare_bronze`) fail. `tools/audio/generated/assets.gen.a17.ts` looks like a prepared render.

Needed:

- The 27 sound ids of A17.12 (`shot_javelin` ... `alert_base`) and `evolve_fanfare_bronze`,
  `evolve_fanfare_industrial`, `evolve_fanfare_cosmic`. `src/audio/sounds.ts` `FANFARE_VOICES` already
  has first-guess voices for the three ages (lyre and frame drum, cornet and anvil, choir pad and bells),
  added only so the tree typechecks; `SOUND_GROUPS` does not list the new ages yet.
- The three arrangements and music cues (A17.12 table), and the A17.8 key-change rule for seven evolves:
  +2, +2, +1, +1, +1, +1, +1 semitones, the lead dropping an octave once the total passes +6.
- `src/dev/soundboard/page.tsx` got titles for the three new sound groups.
