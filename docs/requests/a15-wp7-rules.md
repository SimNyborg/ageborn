# A15 → WP7: engagement meta rules

**From:** design merge of A15 and A16 (2026-09-28). **To:** WP7 (meta rules). **Status:** open, Phase 2b, after the WP0 amendment (`a15-wp0-contracts.md`) and the WP1 tables (`a15-wp1-content.md`).

| Rule | Summary | DESIGN |
|---|---|---|
| Charges | Bank up to 28; a new save still starts with 12 | A6.3, A15.4 |
| Supply Capsule | Allowance +1 at 04:00, banks 7. Every 3rd finished match (`matchesPlayed`, any mode but the tutorial, a Retreat included) turns one banked allowance into a Supply Capsule; none banked, nothing happens. First one right after capsule 2, no matches needed | A6.3, A15.4 |
| Quest queue | 3 new quests join a queue of up to 21 at 04:00; the first 3 are active; a claimed quest leaves, the next becomes active; the free reroll replaces one active quest; weighted draw | A6.7, A15.4 |
| War Chest | `QuestState.weekly.progress` counts counting wins; at 20 grant a Wardrobe Crate and an Age Capsule and restart at 0; `tickTimers` never resets it. Counting win: Ladder or Daily win; a Conquest win that earns a star or beats a General with tier ≥ skill tier − 2. Never Skirmish or tutorial | A6.7, A15.5 |
| Daily Challenge 2.0 | `dailySeed = xmur3('daily' + YYYYMMDD)` picks modifier, General and match seed; difficulties recruit II, veteran V, warlord VIII (default nearest the skill tier); `standardLevels`; Daily bank +1 a day up to 7 (new save 1); a win uses one and pays an Age Capsule, other wins 20 Amber; no charges, trophies or MMR | A9.1, A15.7 |
| Rewards by format | Read the per-format win table from 400 trophies | A15.8 |
| Skill tier | clamp(round((MMR − 870) / 100), 0, 10), internal only | A6.8, A15.9 |
| `winsByTier` | Ladder, Daily and Conquest wins only | A15.9 |
| Peak tier at even levels | A win raises "Highest AI tier beaten" only when the player's average level over the format's ages is at most 1 above the opponent's; the Daily always counts | A15.9, A16.7 |
| Feat tracker | Pure tracker fed each tick's `SimEvent`s by the session; found ids go into `MatchResultInput.feats`; `applyMatchResult` grants each new feat once (100 Dust, optional title), emits `{ kind: 'feat', featId }`, sets `flags['feat.<id>']` | A15.10 |
| Void matches | Nothing to apply: a match with no result never reaches `applyMatchResult` | A15.6 |
| Rookie disclosure | First 20 matches: add "Rookie AI: makes extra mistakes while you learn" to `OpponentSpec.disclosures` | A6.8, A15.3 |
| Stretch: foil crafting | `craft(s, 'foil:<card>:<foil>', c)` for L10 cards; pay the price difference to the owned foil | A15.11 |
| Stretch: Amber to Dust | Once no upgrade is left to buy, Amber from every source is paid as Dust at 10 Amber = 1 Dust | A15.11 |

**Tests** (A15.20): a 30-day absence changes nothing owned and each bank stops at its cap; Supply counts the 3rd finished match and not void or tutorial matches; the War Chest never resets and Skirmish never counts; the Daily gives the same opponent and seed for the same date and difficulty, and the bank gains +1 a day up to 7; each fixture event stream triggers exactly its feats, and each feat pays once.
