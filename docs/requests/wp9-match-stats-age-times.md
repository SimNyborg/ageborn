# WP9 → integration lead (WP0) and WP2: time per age in `MatchStats`

**From:** WP9 (meta UI screens). **To:** integration lead (contracts) and WP2 (`sim/stats.ts`).
**Status:** open, low priority.

A9 #7 lists "time per age" in the Result recap. `MatchStats` (`src/contracts/meta.ts`) has
`reachedFinalAgeAtMs` but no per-age times, so the recap shows time, units trained, units defeated,
turret kills, base damage, evolves and the MVP card.

**Ask:** an additive field, for example `ageTimesMs: number[]` (ms spent in each age the player reached,
in age order), filled by the stats reducer from `ageUp` events. The Result screen will then show a
small age timeline (one segment per age in the age accent colour). No other screen depends on it.
