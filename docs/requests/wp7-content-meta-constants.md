# WP7 → WP1: meta constants that belong in content

**From:** WP7 (meta rules). **To:** WP1 (content). **Status:** open (low priority; meta works today with local constants).

"Content is data" (CLAUDE.md): these numbers and ids are decisions WP7 had to make (see
`docs/decisions.md`, WP7) and currently live in `src/meta/rules.ts`. Please add them to the content
tables; WP7 then reads them from there (a two-line change per item).

| Constant (`src/meta/rules.ts`) | Value | Suggested content field | DESIGN |
|---|---|---|---|
| `GENERAL_SHARE_BP` | 3,000 | `arenas.ladder.generalShareBp`: share of ladder and Daily opponents that are named Generals; the rest are procedural AI Commanders | A7.4 "Commanders fill the ladder between Generals" |
| `AGE_UNLOCK_TIER` | `'silver'` | `capsules.ageUnlock.tier`: the drum tier an Age Unlock Capsule shows | A6.3 gives none |
| `SCRIPT_EXTRA_CARDS` | `{ 1: ['bonker'] }` | `ScriptedCapsuleDef.extraCards: CardId[]`: non-new stacks the script adds (capsule 1: a Bonker stack, so A8's forced Bonker upgrade after capsule 2 is always affordable) | A6.5, A8 |
| `FIRST_LADDER_GENERAL` | `'kettle'` | `generals.onboarding.firstLadder` | A8 match 3 |
| `TUTORIAL_MATCH2` | Pip, tier 0, Short | `generals.onboarding.match2` | A8 match 2 |

No change to the frozen contracts is needed.
