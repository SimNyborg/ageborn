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

## Resolution (A17 asset registration)

Done by WP6. `src/audio/assets.gen.ts` is the A17 render (`tools/audio/generated/assets.gen.a17.ts`): the
`bronze`, `industrial` and `cosmic` effect sheets, `alert_base` in `battle`, the three music cues with their
intensity stems, and the stingers up to `.k9`. `sounds.ts` lists all 27 A17.12 ids with ZzFX fallbacks
(groups follow the recorded sheets; `SOUND_GROUPS` has the eight ages, boot groups UI, battle, Stone,
Bronze), `pending_sounds.json` is deleted. `music.ts` has the three sequenced arrangements (lyre, frame
drum, reed pipe; cornet, tuba, anvil, pistons; choir, sub pulse, bells) as fallbacks, `AGE_CUES` in eight-age
order, `EVOLVE_TRANSPOSE_STEPS` `[2, 2, 1, 1, 1, 1, 1]`, `STINGER_KEYS` up to 9, and the sequencer drops lead
lines an octave above +6 (`transposedMidi`). Render still sends the old steps (`wp5-a17-new-age-fx.md`).
Open in WP6: the Medieval, Gunpowder, Modern and Future music files are still recorded in their five-age
keys (D, E, F, F#), not the eight-age chain (E, F, G, G#); see PROGRESS.
