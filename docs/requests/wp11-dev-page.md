# WP11 → integration lead: register WP11's dev page

**From:** WP11 (app, session, onboarding, replays). **To:** integration lead (`src/dev/**` has no WP11 path). **Status:** open.

## Request

B14 lists `src/dev/replayDebug/` and A9 #16 a "replay debugger", but C2 gives WP11 no path under
`src/dev`. The page is written and working at `src/app/dev/ReplayDebugPage.tsx`. Please either

1. move it to `src/dev/replayDebug/page.tsx` (fix the relative imports: `../eventLog` → `@/app/eventLog`,
   and so on), or
2. add a one-line wrapper `src/dev/replayDebug/page.tsx`:

```ts
export { default, title } from '@/app/dev/ReplayDebugPage';
```

and give WP11 `src/dev/replayDebug/**` in C2.

Then remove the `APP_DEV_PAGES` entry in `src/app/main.tsx` (it opens the page at `?dev=1#replayDebug`
until the dev router can find it) and, for option 2, make sure the hard-coded-string integrity test
treats `src/app/dev/**` like `src/dev/**` (dev pages are exempt from i18n, decisions WP0).

## What the page does

`?dev=1#replayDebug`: runs 22 bot-vs-bot matches through the real `BattleSession` (AI Kettle tier III
vs the fallback bot), keeps the last 20 replays and re-simulates each with the `ReplayPlayer`
(verified = same outcome and final hash); runs the match 1 retiming run and compares every A8 beat
with `MATCH1_TIMING`; shows and exports the onboarding event log.
