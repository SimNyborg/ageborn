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
