# WP3 → WP11 (session, match setup) and WP12 (tools): using the AI Generals

**From:** WP3 (AI Generals, `src/ai`). **To:** WP11 (`src/app`), WP12 (`tools/`).
**Status:** open (integration notes; nothing here blocks Phase 1).

`src/ai` is complete for Phase 1. Everything is exported from `@/ai`.

## WP11: battle session and match setup

1. **Profiles.** `botProfileFor` (`src/app/matchSetup.ts`) may keep building the profile itself; an empty
   `openings` list makes the bot use its personality's opening (A7.2). `botProfile(content, o)` from `@/ai`
   does the same and adds three options the session knows about:
   - `personalityOf`: the ladder General a procedural AI Commander copies (A7.4); the profile then
     carries that General's weights and rules (`generalId` is set to it; the display name stays yours).
   - `favoriteCard`: a Commander's favourite card (small train bonus, A7.4).
   - `stanceLocked` / `autoLastStand`: pass them when `MatchConfig.training.stanceEnabled[botSide]` or
     `manualLastStand[botSide]` is false. Without them the bot learns it from the first command that has
     no effect, which costs one `commandRejected` (matches 1-4 keep both on for the bot side today, so
     nothing is needed now).
2. **Emotes.** Relay player emotes to the bot: after each `sim.step`, for every `emote` event of the other
   side, call `(bot as AiBotController).hearEmote(e.emote, e.tick)` when the controller has it (see
   `BotMatch.tick` in `src/ai/harness.ts`). Bots use only GG, Salute and Thumbs up; the `mutedEmotes`
   setting should hide them (A7.2 "All bot emotes are muteable"). A contract field that would make the relay
   unnecessary is requested in `docs/requests/wp3-observation-emotes.md`.
3. **Old Grogg.** No change: the app keeps `tutorial/grogg.ts`. `createBot` with `generalId: 'grogg'`
   returns `ScriptedController`, whose default script (`GROGG_SCRIPT` in `src/ai/scripted.ts`) mirrors
   your retimed `tutorial/scripts.ts` schedule (0:02, 0:12, Tuskback 0:19, a Dummy every 8 s, dropped while
   3 of his units are alive). If the schedule changes, either update that list or pass your lines as
   `openings` in the `parseScript` language (`at <ms> train <card>`, `every <ms> from <ms> until <ms> ...`,
   `max-alive <n> <card>`).
4. **Delay.** The session's ring already hands the bot `ring.at(snapshotDelayTicks)` (the oldest
   observation while the ring fills), which is exactly what the controller expects.

## WP12: headless tools (B12)

- `runHeadless(sim, seats, { maxTicks, onEvents })` and `BotMatch` drive bot-vs-bot matches with the
  session's observation ring and stamping, on any `Sim` you create.
- The Balanced brain of A2.14 is `botProfile(content, { generalId: BALANCED_BRAIN_ID, tier: 5 })`.
- `src/ai/test/runs.ts` shows reproducible tier and fuzz series (`AI_FULL=1` for the DoD sizes).

## Observations for Phase 3 (balance)

A tier V Balanced mirror at L7 on the current content (30 Full Wars): median length ≈ 8:30-9:00,
Final Bell ≈ 45%, first evolve ≈ 97 s, turret kill share ≈ 4%. A2.14 wants 7:00, < 3%, 60 ± 10 s and
20-35%. Defenders at their gate (turrets plus a short walk) are hard to crack in a one-lane, two-wide
front, armies near the pop cap queue up behind the front, and the bots' push-gate discipline (bank
instead of feeding the turrets, A7.2) plus early Treasury make the opening minutes quiet. A variant
without the quiet-lane Treasury goal gave Final Bell ≈ 8% and first evolve ≈ 77 s but cost the tier
ordering (VII vs III ≈ 60%), so the rule stays and the trade-off is noted here for Phase 3. The AI's own tuning
knobs are the constants at the top of `src/ai/brain.ts` and the tier table in `src/ai/tiers.ts`.

## Resolution (Phase 2a)

Applied: the session relays emotes to `hearEmote`; `battle.ts` adds `rule:noStance` / `rule:autoLastStand` to bot profiles when `MatchConfig.training` locks stance or manual Last Stand for that side; the dev autopilot uses WP3's Balanced brain at tier V outside the tutorial.
