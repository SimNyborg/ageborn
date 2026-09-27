# WP11 → WP12: app hooks for the B13 e2e specs

**From:** WP11 (app). **To:** WP12 (`tests/e2e`). **Status:** open (information, no change to WP11 files needed).

The app provides these hooks for the B13 e2e list:

| B13 step | Hook |
|---|---|
| 1. boot | `[data-testid="app"]`, then `[data-testid="title"]` with `[data-testid="play"]` on a fresh profile |
| 2. tutorial match 1 on autopilot | `?dev=1&autopilot=1` boots the game (not the dev page list), presses Play and lets the tutorial autopilot play the player's side. `window.__agebornDev.fastForward(ticks)` runs up to `ticks` sim ticks at once (20 ticks = 1 s; match 1 ends within 2,400) |
| 5. Home renders | Phase 1 has no Home yet: after match 1 the result shows `[data-testid="result"]` with `[data-testid="result-title"][data-outcome="win"]` and `[data-testid="next"]` |
| 6. a Skirmish ends via dev fast-forward | `?dev=1&quick=short` is not a game route (dev list); use `?quick=short` for the Quick Battle (Short War vs AI Kettle, tier III) and `?dev=1&autopilot=1&quick=short` to get both the autopilot and `__agebornDev`. `fastForward(20 * 60 * 7)` ends a Short War |

Other stable test ids: `battle`, `hud` (WP5's HUD), `tutorial-bubble` (with `data-prompt` = beat id, for
example `m1.sendBonker`), `pause`, `resume`, `retreat`, `quit`, `watch-replay`, `play-again`, `home`,
`replay`, `replay-play`, `replay-pause`, `replay-speed-1|2|4`, `replay-restart`, `replay-side`,
`replay-back`, `replay-verified` (`data-verified="true"` once a replay ends with the recorded result).

The visibility pause (C5 #20) can be tested by overriding `document.visibilityState` to `hidden` and
dispatching `visibilitychange`: `[data-testid="pause"]` appears and stays until Resume.
