# Request to WP6 (audio): capsule ladder sounds

From: the lead designer, 2026-09-29 (owner request "more capsule tiers"; spec in DESIGN A10 and A13). File: `src/audio/sounds.ts` (synth first; A13 limits: 4 voices per id, 40 ms retrigger).

| Id | Status | Sound |
|---|---|---|
| `cap_climb_1` .. `cap_climb_4` | kept | the note of the tier reached: 1 Bronze, 2 Silver, 3 Jade, 4 Gold (4 was Aeon's; the pitch is unchanged) |
| `cap_climb_5` | new | Platinum: the next step up the arpeggio, plus a short glass-bell partial (inharmonic ×2.76) |
| `cap_climb_6` | new | Aeon: richer and lower, not shriller; a choir pad (detuned saws, lowpass 2.4 kHz) and a clock tick at +60 ms |
| `cap_summit_rise` | new | a summit gem rising out of the capsule's cap: a stone grind under a rising glass chime, 400 ms |
| `cap_burst_platinum` | new | Platinum stinger: a struck glass-bell chord with a long tail, over `cap_burst` |
| `cap_burst_aeon` | new | Aeon stinger: a deep bell, a choir chord and a clock chime, with a 2 s star-glitter tail |

Rules (A10):

- Gold uses `cap_climb_4` as its stinger (today's Aeon rule in `plan.ts`).
- Music ducks −6 dB during Platinum and Aeon bursts (the duck itself is WP10's cue).
- No penalty sound. No sound before strike 4's result may hint at a summit strike: `cap_summit_rise` plays only when a summit gem really rises.
- No casino colour: no coin cascades, slot "dings" or jackpot fanfares. The palette is time, bells, stone and choir.
- Add the new ids to the soundboard and to `src/audio/test/sounds.test.ts`'s id list.
