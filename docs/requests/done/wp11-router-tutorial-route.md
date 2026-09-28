# WP11 → WP9: onboarding matches in the router's battle route

**From:** WP11 (app, onboarding). **To:** WP9 (`src/ui/router.ts`). **Status:** open (needed for Phase 2 wiring).

## Request

`RouteParams.battle` is `{ request: MatchRequest; opponent: OpponentSpec }`, and `MatchRequest` has no
onboarding variant. Matches 1 and 2 (A8) are not picked by meta: match 1 is the Tutorial format vs Old
Grogg with scripted trays, match 2 is Short War vs Pip at tier 0; the app builds both
(`src/app/matchSetup.ts` `tutorialMatch1` / `tutorialMatch2`). Please add

```ts
| { mode: 'tutorial'; match: 1 | 2 }
```

to `MatchRequest`, so the battle route, the Result screen's "Next battle" and the pause screen can carry
them. The Result screen should show "Next" (not "Play again") while `SaveDoc.tutorial.step < 4`
(`src/app/onboarding.ts`), and match 1 has no Retreat (its format has no `retreatAfterMs`).

Until Phase 2 the app renders its own title, battle, result and replay screens
(`src/app/ui/**`, `src/app/screens/replay/**`); the replay route `{ index }` fits the store's ring
(`saveStore.loadReplays()[index]`).

**Done:** `MatchRequest` has `{ mode: 'tutorial'; match: 1 | 2 }` (WP9), and the onboarding matches run on the app screens.
