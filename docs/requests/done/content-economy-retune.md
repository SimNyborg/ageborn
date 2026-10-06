# Request: re-tune capsule copies for the content waves (CONTENT_PLAN 8)

From: Medieval content wave (2026-10-03). To: content/meta owner (capsule tables, A6.4/A6.9).

With the Stone and Medieval waves released, the released capsule pool is C 52 / R 34 / E 22 / L 10 (was
40 / 24 / 16 / 8). `npx tsx tools/sim-cli.ts economy --seeds 30` (365 days): median card to max Common 140 /
Rare 146 / Epic 88 / Legendary 133 days against the targets 110 / 101 / 69 / 112 (± 20%).

Measured fix (not applied): copies per stack in `src/content/capsules.ts`, Common ×1.3, Rare ×1.42, Epic ×1.38,
Legendary unchanged:

| Tier | Common | Rare | Epic |
|---|---|---|---|
| clay | 4 → 5 | 1 | 1 |
| bronze | 5 → 7 | 2 → 3 | 2 → 3 |
| silver | 10 → 13 | 5 → 7 | 2 → 3 |
| jade | 24 → 31 | 10 → 14 | 5 → 7 |
| gold | 26 → 34 | 10 → 14 | 5 → 7 |
| platinum | 26 → 34 | 12 → 17 | 5 → 7 |
| aeon | 40 → 52 | 14 → 20 | 6 → 8 |

Result: 100 / 97 / 61 / 131 days, copy-Amber gap 20 days. It breaks the A6.9 "16 copies per bag capsule"
and "98 copies a day" targets (now 22 and 134) and the A6.4 table tests (`src/content/test/meta.test.ts`,
`src/meta/test/newSave.test.ts`), so DESIGN A6.4/A6.9 need the new table. Best done once after the Bronze
wave ships (pool C 58 / R 39 / E 25 / L 11), as CONTENT_PLAN 8 planned (option B adds a stack per tier).

**Update (W4 Gunpowder wave released, 2026-10-03):** with the Stone, Medieval and Gunpowder waves released (pool
C 58 / R 39 / E 25 / L 11 units and turrets, without the gated Bronze cards), `economy --seeds 30` gives Common 153 / Rare 169 /
Epic 103 / Legendary 147 days to max, all 8 Legendaries 20 days, whole collection 305 days, copy-Amber gap 90 days;
the per-capsule and per-day targets still pass and `drops --mode smoke` passes 17 of 17. The multipliers above were
measured for two waves; re-measure them once the Bronze wave ships.

**Update (W2 Bronze wave released, 2026-10-03):** with the Stone, Bronze, Medieval and Gunpowder waves released (the
Bronze wave adds 6 Commons, 5 Rares, 3 Epics and 1 Legendary to the capsule pool), `economy --seeds 30` gives Common
176 / Rare 194 / Epic 116 / Legendary 163 days to max (targets 110 / 101 / 69 / 112 ± 20%), all 8 Legendaries 21
days, focused War Plan at L7 135 days, whole collection 335 days, copy-Amber gap 94 days; copies a day (100) and
Amber a day (3,229) still pass, and `drops --mode smoke` passes 17 of 17. This is the pool CONTENT_PLAN 8 planned
the single re-tune for (option B: one more stack per tier, copies ×1.4 / 2.3 / 2.3 / 2.0, Amber ×1.8); the
multipliers above should be re-measured on it before the table changes.

**Update (W5 Industrial wave released, 2026-10-03):** with the Stone, Bronze, Medieval, Gunpowder and Industrial
waves released (Industrial adds 6 Commons, 5 Rares, 3 Epics and 1 Legendary to the capsule pool), `economy --seeds 30`
gives Common 203 / Rare 226 / Epic 132 / Legendary 177 days to max (targets 110 / 101 / 69 / 112 ± 20%), all 8
Legendaries 22 days, focused War Plan at L7 148 days, Amber for the whole collection 268 days (copies not reached in
365 days); copies a day (100) and Amber a day (3,234) and the per-capsule targets still pass. The re-tune is now due.

**Update (W6 Modern wave released, 2026-10-03):** Modern adds 6 Commons, 5 Rares, 3 Epics and 1 Legendary to the
capsule pool (Commando, Sandbag Carrier, SMG Squad, Rifle Grenadier, Assault Gun, Anti-Tank Gun; Mortar Team, Sticky
Bomber, Combat Medic, Bulldog Sergeant, Rocket Battery; Dive Bomber, Bulldozer, Ghillie Sniper; Sky Fortress). It was
measured together with the Future wave (next update): Common and Rare to max no longer finish in 365 days.

**Update (W7 Future wave released, 2026-10-03):** with every wave through Future released (Future adds 6 Commons, 5
Rares, 3 Epics and 1 Legendary to the capsule pool, 193 collection cards in all), `economy --seeds 30` gives Common and
Rare to max not reached in 365 days, Epic 165 / Legendary 206 days (targets 110 / 101 / 69 / 112 ± 20%), all 8
Legendaries 24 days, focused War Plan at L7 178 days, Amber for the whole collection 322 days (copies not reached);
copies a day (100), Amber a day (3,260) and the per-capsule targets still pass. The time-to-max targets now fail by
1.5-2.5x; the CONTENT_PLAN 8 re-tune (option B) is overdue and should land before the W8 Cosmic wave adds its 15 cards.

**Update (W8 Cosmic wave released, 2026-10-04):** with every wave released (Cosmic adds 6 Commons, 5 Rares, 3 Epics
and 1 Legendary to the capsule pool: Crystal Guard, Void Skimmer, Moonlings, Nova Thrower, Asteroid Golem, Shard
Spitter; Star Mortar, Antimatter Rifler, Bio-Weaver, Void Whisperer, Event Horizon; Star Fighter, Swarm Matron,
Gravity Sage; Star Leviathan; 208 collection cards in all), `economy --seeds 30` gives Common and Rare to max not
reached in 365 days, Epic 188 / Legendary 223 days (targets 110 / 101 / 69 / 112 ± 20%), all 8 Legendaries 25 days,
focused War Plan at L7 200 days, Amber for the whole collection 348 days (copies not reached); copies a day (100),
Amber a day (3,279) and the per-capsule targets still pass. All eight waves are in: the CONTENT_PLAN 8 re-tune
(option B) can now be measured on the final pool and should land next.

**Done (economy and collection lead, 2026-10-04):** the CONTENT_PLAN 8 option B re-tune landed as the **all-ages
table** (`capsules.allAges` in `src/content/capsules.ts`, read through `capsuleTierFor` in
`src/content/capsuleTiers.ts`): from Arena 3 every tier holds one more stack and the copies and Amber of option B
(Common ×0.95 and Amber ×0.96 of the plan's values after measuring on the real pool); Arenas 1-2 and the
onboarding script keep the old table, so the A6.4 table tests and the first days of a save are unchanged.
`economy --seeds 30`: Common / Rare / Epic / Legendary to max 105 / 97 / 62.25 / 106.5 days (was not reached /
not reached / 187.5 / 222.75), plan L7 94 (199.5), copies and Amber done 224.5 and 210 (gap 15), whole collection
224.5 days; `drops --mode smoke` 17 of 17. The A6.9 income targets are rebased in `tools/economy.ts` (38 copies
and 710 Amber per bag capsule, ~240 copies and ~5,150 Amber a day). DESIGN A6.4 and A6.9, `docs/decisions.md`
("Content re-tune: the all-ages capsule table and collection milestones").
