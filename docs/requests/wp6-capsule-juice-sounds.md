# Request to WP6 (audio): sounds for the capsule opening beats

From: WP10 capsule show polish, 2026-09-28 (owner: "the capsule opening animation must be much more satisfying").

The show now layers existing ids (`step_heavy`, `hit_heavy`, `evolve_riser`, `explosion_m/l`, `flare_pop`, `xp_tick`, `upgrade_slam`) on the A13 capsule sounds. They work, but dedicated sounds would fit better. Please add (ZzFX is fine) to the `capsule` group and list them in `sounds.ts`; WP10 swaps the cue ids in `src/capsule/plan.ts` once they exist:

1. `cap_crack` (capsule): a dry stone crack with a glassy ring, 150-250 ms, layered under every strike (climb or not) at 90 ms. The plan pitches it up per strike (+900 bp each), so keep it neutral in pitch. It replaces `hit_heavy` there.
2. `cap_build` (capsule): the burst build, a rising charge (whine plus rumble) whose length fits 200-820 ms; the plan plays it at 0 of the burst step with a pitch per tier. It replaces `cap_riser` / `evolve_riser` there.
3. `cap_pop` (capsule): the explosion body under `cap_burst`, 70 ms after it (after the freeze frame): a deep boom with glass and sparkle tail, 600-900 ms. It replaces `explosion_m` / `explosion_l`.
4. `card_snap` (capsule): the card face landing: a crisp paper snap plus a short bright chime, 120-200 ms, played at the end of every Rare+ flip (Common uses `card_flip` only). It replaces `flare_pop`.
5. `card_count` (capsule): one soft tick for the copies count-up (up to 4 per card, pitched up by the plan). It replaces `xp_tick`.
6. `name_slam` (capsule): the Legendary name banner landing: a heavy metallic slam with a short cymbal, 400-600 ms. It replaces `upgrade_slam`.

Loudness: under the rarity stingers and `walkout_bass`; none may be a "penalty" sound (A10: a non-climb strike never sounds like a loss).
