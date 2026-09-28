# A15 → WP11: session, stopping cues and platform value

**From:** design merge of A15 (2026-09-28). **To:** WP11 (app, session, tutorial, platform). **Status:** open, Phase 2b.

- **Platform:** `NonePlatform.features.reelReveal` is `false` (A15.3, B11).
- **Session counters** (A15.6), in memory, never saved: a session begins at boot, or when the tab becomes visible after at least 20 minutes hidden. Active play is time with the tab visible while a battle runs unpaused, or while the player gave input in the last 60 s.
- **Result cards** (A15.6): at most one per Result, priority tilt, break, wrap, after the staged rewards, never in battle, Home as the primary button.
  - Wrap: once per session, on the Result of the ladder win that used the last charge, or the first Result after 30 min of active play with at least 3 finished matches.
  - Tilt: once per session, on the Result of the 3rd ladder loss in a row.
  - Break: if `settings.breakReminder` (default true), the first Result after each 60 min of active play.
  - Night line: a match ending between 22:00 and 06:00 local time adds "It's late. Everything you've earned is saved." and makes Home primary.
- **Void rule:** a match that never reaches its end (reload, tab closed, crash) calls no meta at all. Retreat still counts as a loss.
- **Standard levels:** when `OpponentSpec.standardLevels` is set, put every card on the player's side at L7 (Daily, Skirmish toggle).
- **Feats:** feed each tick's `SimEvent`s to the WP7 feat tracker and pass the found ids in `MatchResultInput.feats`. Do not buffer the whole event stream.
- **Clipboard:** the Daily Copy result line (WP9 builds it; the session provides the date, modifier, difficulty, time and base %).
- **Trickle detector and hint** (A16.6): in the last 30 s the player spawned at least 6 units, no two within 2 s, while the enemy army value was at least 1.5 × the player's. Onboarding matches show "Save gold, then send them together."; after onboarding it only feeds the loss tip. The A8 failure-pattern detectors keep running after onboarding for result tips (A15.12, stretch).
- **Event log:** add the healthy-play signals (A15.20): sessions over 90 min, sessions after 22:00, sessions ending right after 3 losses, sessions ending on a wrap, tilt or break card. Local only.
- Also see A16's own WP11 items (Quick Battle `&tier=` and `&mods=` flags, A16.25) in `wp11-depth-session.md` once written.

**Done (2026-09-28):** `NonePlatform.features.reelReveal` is false; session counters and the tilt/break/wrap cards in `src/app/stopping.ts` (`StoppingCues`, `attachActivity`, wired by `metaUi.ts` and `AppRoot.tsx`); void rule: a match with no result never calls meta (unchanged); Standard levels through `matchSetupFor` from `OpponentSpec.standardLevels`; feats: `BattleSessionImpl` feeds `createFeatTracker` each tick and passes `MatchResultInput.feats`; the Daily result line data comes with the Result info (`metaUi.ts`), WP9 copies it; trickle detector and hint (`src/app/trickle.ts`, `tutorial/hints.ts`); healthy-play `health` entries in the event log.
