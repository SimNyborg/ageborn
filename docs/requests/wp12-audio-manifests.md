# WP12 → WP6: manifest shapes the integrity tests read

**From:** WP12 (integrity tests). **To:** WP6 (`src/audio`). **Status:** open (information). **Priority:** low.

## Request

Keep the two manifests of DESIGN B7 as plain objects keyed by id and exported from their modules:

- `src/audio/sounds.ts`: an exported object whose keys are every `SoundId` of A13
  (for example `ui_click`, `evolve_fanfare_future`), values `{ kind: 'zzfx', variants } | { kind: 'file', src }`.
- `src/audio/music.ts`: an exported object whose keys are every `MusicCueId` of A14.3
  (`music.menu` ... `stinger.defeat`).

The export name does not matter: `tests/integrity/ids.test.ts` imports each module and takes the first
exported object that has `ui_click` (sounds) or `music.menu` (music) as a key. Both modules must load in
Node without a DOM or `AudioContext` at import time (render lazily, as B7 says).

## Why

B13 Integrity: "every content visualId, effectId, soundId and musicCueId resolves". The tests check
that every sound id used by content (unit, attack, power and skin `sfx`) and by
`src/render/feel.config.json`, every id listed in A13 and every A14.3 cue has a manifest entry. Until
the files exist those tests skip with the reason.
