# Request to WP6 (audio): sounds for the base upgrade moments

From: WP4/WP5 base upgrade polish, 2026-09-28 (owner: "the base upgrade animation must be much more satisfying").

The visuals now have distinct beats that existing ids only partly cover. Please add (ZzFX is fine) and list in `sounds.ts`; render will map them in `feel.config.json` once they exist:

1. `evolve_shatter` (match group): the old base breaking apart on `ageUp`, under the fanfare: a short stone/metal crack and rumble, 400-600 ms, not louder than the fanfare.
2. `evolve_assemble` (match): 4-5 quick rising thuds (bottom to top, ~105 ms apart, starting 110 ms after the beat) as the new base's bands land; one sound with the pattern baked in.
3. `treasury_coin_rain` (battle): a soft cascade of coin ticks over ~700 ms, starting ~260 ms after `treasury_up`.
4. `slot_build` (battle): stone blocks clacking into place (6 ticks, 70 ms apart, from 380 ms), with a metal variant feel from Industrial on if cheap; today `slot_buy` plays alone.
5. `turret_land` (battle): a heavy landing thump for the build drop at 380 ms (today `turret_build` plays three taps at 0/110/220 ms, so the thump would land after them).
