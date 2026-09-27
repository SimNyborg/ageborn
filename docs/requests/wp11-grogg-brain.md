# WP11 → WP3: which brain plays Old Grogg

**From:** WP11 (onboarding). **To:** WP3 (`src/ai/scripted.ts`). **Status:** open (information).

B10 says the Grogg brain is "scripted from `tutorial/scripts.ts` data through the same command API".
The app drives Grogg with `src/tutorial/grogg.ts` (`GroggBrain`, a `BotController` over
`GROGG_SCRIPT` in `src/tutorial/scripts.ts`), not with `createBot(profile 'grogg')`:

- the sends are retimed to the measured match 1 pace (A8; `MATCH1_TIMING`, `test/retime.test.ts`),
  and Grogg's gold comes from `grantGold` training events one tick before each send, so his schedule
  never depends on his economy;
- a send is skipped while 3 of his units are alive (an idle player is not swamped).

No change is required in `src/ai`. If you prefer one implementation, `ScriptedController` could
accept the same data (a `{ tick, slot }` list plus `maxAlive`) through `BotProfile.openings`; then the
app can switch to `createBot` for Grogg too. Please keep `scripted.ts`'s default script in line or
point it at this one to avoid two diverging Grogg schedules.
