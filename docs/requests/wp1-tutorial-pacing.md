# Request to WP1 (content): slow the training match down (usability audit #6)

**From:** the player-experience track (tutorial, HUD, app shell), 2026-09-28.

**Problem.** The owner's first match (training vs Old Grogg) runs through four evolves in under
1:40 (`src/tutorial/scripts.ts` `MATCH1_TIMING`: Medieval at 0:36, Future at 1:27, Grogg falls at
1:54). Units from four ages are on the field at once and a new player learns nothing about any
age. DESIGN A8 plans about 3:00.

**Ask (content numbers only, no rule change):**

1. The Tutorial format stops at Medieval: `formats.tutorial.ages = ['stone', 'medieval']` (at most
   one evolve in match 1), or, if Stone to Future must stay (A8 text), raise
   `formats.tutorial.xpToNextOverride` so Medieval lands at about 0:55 and the next age not before
   about 2:00.
2. Grogg should fall at about 2:30: lower the XP and gold he gives per % of base, or raise
   `training.enemyBaseStartBp` from 5000 toward 6000.

**After WP1 lands it,** the tutorial track retimes `MATCH1_TIMING` with `src/tutorial/test/retime.test.ts`
and drops the Gunpowder/Modern/Future beats if the format stops at Medieval. This needs an owner
decision because A8 names "Stone to Future" for match 1.
