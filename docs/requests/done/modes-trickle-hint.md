# Modes/AI → WP11 (tutorial hints): the in-battle "Save gold, then send them together." hint

**From:** Phase 2b modes/replays/AI agent. **To:** WP11 (`src/tutorial/hints.ts`, `scripts.ts`). **Status:** open.

A16.6 asks for the trickle detector's in-battle hint in onboarding matches only (A8 adaptive hint list:
"Save gold, then send them together."). The detector itself is built and wired:

- `src/app/trickle.ts`: `TrickleDetector` (6+ own non-summoned spawns in 30 s, none within 2 s of each
  other, enemy army value ≥ 1.5 × yours) and `lossTipKey()` for the Result tip.
- `src/app/battle.ts`: every battle has `battle.trickle`; the loss tip is on both Result screens.

Please add an adaptive hint `trickle` to `AdaptiveHints` (same pattern, or call into `TrickleDetector`
with the tick input), shown only in onboarding matches, with the string in `tutorial.en.json`.

**Done (2026-09-28, onboarding-daily track):** `trickle` is an adaptive hint (`tutorial.hint.trickle`, target the gold counter). `battle.ts` calls `director.reportPattern(trickle)` when the detector fires; like every adaptive hint it shows only in the onboarding matches 1-5 (`STAGES.hintsUntilMatch`), once per match and at most 3 times per profile.
