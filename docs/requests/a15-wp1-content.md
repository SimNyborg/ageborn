# A15 → WP1: engagement content tables and strings

**From:** design merge of A15 (2026-09-28). **To:** WP1 (content). **Status:** open, Phase 2b. Needs the WP0 amendment (`a15-wp0-contracts.md`) only for the feat reward step.

Tables are typed on `Content`, not on the frozen `CompiledContent`. Meta tables sit outside `contentHash`, so replays are not affected (A15.18).

| Table | Change | DESIGN |
|---|---|---|
| `arenas.ladder.win` | Keyed by format from 400 trophies: Short +26 trophies, 20 (40) Amber; Standard +30, 25 (50); Full +34, 30 (60). Below 400 every format pays +30 and 20 (40). Loss rules unchanged | A15.8 |
| `dailyModifiers.challenge` | `bankMax` 7; `difficulties` recruit 2, veteran 5, warlord 8; `standardLevel` 7; the opponent pool (the 8 ladder Generals from Pip Quickstep to Madame Tempest) | A15.7 |
| Capsules and economy | `chargesMax` 28; `supply` with `matchesPerCapsule` 3 and `allowanceMax` 7, replacing the Daily Capsule's bank of 3; Supply odds as the old Daily Capsule | A15.4 |
| `quests` | `queueMax` 21; a `weight` per quest (Play 3 battles, Train 30 units, Upgrade 2 cards weight 1; the rest weight 2); `warChest` with `winsPerChest` 20, replacing `weekly_win_15` | A15.4, A15.5 |
| New `feats` table | 12 rows (A15.10 table): predicate kind and parameters, 100 Dust reward, optional title, string keys (name, riddle, plain condition). Predicate kinds are a closed typed list with only what these 12 need. Add to `MetaTables` | A15.10 |
| Stretch | Foil crafting prices (A15.11 table), `amberToDustRatio` 10, result-tip thresholds (A15.12) | A15.11, A15.12 |

**Strings** (content strings are WP1's; WP9, WP10 and WP11 own their UI strings): the A15.3 honesty pack, feat names, riddles and hints, the 4 feat titles, Daily difficulty names, and the trickle loss tip "Tip: units sent one by one fall one by one. Bank gold, then send a wave." (A16.6). Keep the forbidden copy out (A15.3 rule 4).

`winsPerChest` and the Standard War reward row are tuned in Phase 3 (A15.5, A15.8).

**Progress (2026-09-28, onboarding-daily track):** done: `arenas.ladder.winByFormat` (A15.8), `dailyModifiers.challenge` (`bankMax` 7, `bankStart` 1, `standardLevel` 7, `difficulties`, `generals`), `quests.queueMax` 21, a `weight` per quest, `quests.weekly` = War Chest (`war_chest`, `countingWins`, 20), the `feats` table (`src/content/feats.ts`, in `MetaTables`, schema-checked) with the four feat titles, and the feat names, riddles, hints and titles in `content.en.json`. Open for the banks track: `chargesMax` 28 and the `supply` table (`supplyRules` has defaults until then); the stretch rows.
