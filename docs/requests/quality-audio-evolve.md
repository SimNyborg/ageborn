# Audio quality → render (eventMapper): a clean evolve transition

**From:** audio quality pass (WP6, `src/audio`), 2026-09-28. **To:** the owner of `src/render/eventMapper.ts` (WP5). **Status:** open.

## Why

Today an own evolve switches the music with `musicCue` and `fadeMs: 600` at `ageUp`
(`eventMapper.ts` around line 509), on whatever beat the evolve lands. For those 600 ms the old age's
file and the new age's file (a different key: C → D → E → F → F#) play together, which sounds like a
clash. The evolve riser (`evolve_riser`, 2.5 s, `ascendMs`) also plays on top of the full-level music.

Audio has already done its part:

- `evolve_riser` is now unpitched (reverse cymbals, snare roll, noise sweep, rumble), so it fits any key.
- Music crossfades are now equal power (no 3 dB dip in the middle).
- The battle loops of all ages have the same 44-bar form and length, so the new age still continues
  at the same point of the loop.

## What to change (two small edits, no contract change)

1. **Duck the music under the riser.** At `ascending` for the own side (where `evolve.start.own` plays
   `evolve_riser`), push `{ a: 'duck', db: -8, ms: ascendMs }` (2.5 s; `AudioService.music.duck`).
   The duck releases right when the fanfare hits.
2. **Switch the cue fast, exactly on the fanfare.** At `ageUp` for the own side, keep the order
   (fanfare sound, then `musicCue`, then `musicTranspose`) but change the cue's `fadeMs` from `600` to
   `150`. The fanfare covers the switch, and the two keys overlap for only 150 ms.

The enemy's evolve does not change our music, so nothing changes there.

## Test

`src/render/test/eventMapper.test.ts`: the own `ascending` event emits a `duck` of -8 dB for
`ascendMs`; the own `ageUp` emits `musicCue` with `fadeMs: 150`.
