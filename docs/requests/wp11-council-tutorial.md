# WP5 → WP11: match 2's income beat with the War Council

**From:** WP5 HUD (A18 phase 3, War Council sheet, 2026-09-29). **To:** WP11 (tutorial and onboarding). **Status:** open.

The gold counter no longer buys income on one tap. A18.5.7 makes the War Council a bottom sheet and A15 U14 makes every spend take two taps, so a tap on the gold counter now **opens the War Council on the Economy track** (Granary or Forage), and a pick starts with a second tap on the same card ("Tap again to research"). The round Council button sits right of the gold counter (`data-testid="hud-council"`); it is hidden in match 1 (the `training.noClock` match), but the gold tap still opens the sheet there.

What this means for `tutorial.m2.treasury` (`src/tutorial/scripts.ts`):

| Now | Suggested |
|---|---|
| Bubble on `hud-gold`: "Tap your gold to research more income" | Keep the first step on `hud-gold`, then move the bubble to the Granary card (`data-testid="hud-pick-economy.granary"`) once the sheet is open (`hud-council-sheet` in the DOM), with a short text such as "Tap Granary twice" |
| `done: { k: 'event', e: 'treasuryUp' }` | `researchStarted` for side 0 (the research takes 10 s; `treasuryUp` only fires when it completes, so the bubble stays up after the player already acted and the 12 s timeout can fire first) |
| Autopilot sends the research command directly | Unchanged (commands are the same) |

Strings live in `tutorial.en.json` (WP11). The HUD strings are `hud.council.*`.
