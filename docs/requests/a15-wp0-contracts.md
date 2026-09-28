# A15 → WP0 (lead): Phase 2b contract amendment

**From:** design merge of A15 (2026-09-28). **To:** WP0, the integration lead. **Status:** open. Do it at the start of Phase 2b, before the other A15 requests.

One amendment, in one change, with the fakes in `src/contracts/fakes` and the v1 save fixture updated at the same time. Item 1 changes a field; items 2-6 are optional additions, so code already written still compiles. Full list: DESIGN B15.1 and A15.18.

| # | Contract | Change | For |
|---|---|---|---|
| 1 | `SaveDoc.daily` | `{ dayKey: string; won: boolean }` becomes `{ dayKey: string; bank: number }` | Daily reward bank (A15.7) |
| 2 | `Meta.pickOpponent` options | + `daily?: { difficulty: 'recruit' \| 'veteran' \| 'warlord' }` | A15.7 |
| 3 | `OpponentSpec` | + `standardLevels?: boolean` (Daily and Skirmish; `BattleSession` puts the player's side at L7) | A15.7, A16.7 |
| 4 | `MatchResultInput` | + `feats?: string[]` | A15.10 |
| 5 | `RewardStep` | + `{ kind: 'feat'; featId: string }` | A15.10 |
| 6 | `Settings` | + `breakReminder?: boolean` (default true), `quickReveal?: boolean` (default false) | A15.6 |

**JSDoc for meaning changes with no type change** (and one `docs/decisions.md` entry):

- `capsules.charges`: bank maximum 28.
- `capsules.dailyBank`: the Supply allowance, maximum 7. `PendingCapsule.kind 'daily'` is shown as "Supply Capsule".
- `QuestState.daily`: a queue of up to 21; the first 3 are active.
- `QuestState.weekly`: War Chest progress (0-19), never reset; `weekKey` is unused. `PendingCrate.source` stays `weekly`.
- `ProfileStats.winsByTier`: Ladder, Daily Challenge and Conquest only.
- `WardrobeReveal.reelTiles`: may be empty (no reel).
- `Settings.vibrate`: default false.
- `flags['feat.<id>']` and `flags['featHint.<id>']`.
- `Meta.tickTimers`: never resets the War Chest.

Batch the pending `MatchStats.ageTimesMs` (`wp9-match-stats-age-times.md`) and `Observation.foe.lastEmote` (`wp3-observation-emotes.md`) requests into the same change. Also record engagement rule 10 in `docs/decisions.md` if it is not there: "MMR and bot tuning target win rate only, never session length, return rate or retention" (A15.1).

SaveDoc stays at version 1: everything lands before the Checkpoint C push (B8).
