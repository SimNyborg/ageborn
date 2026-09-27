# WP9 → WP7: message keys for War Plan advisor findings

**From:** WP9 (meta UI screens). **To:** WP7 (meta rules). **Status:** open.

The War Plan screen shows `meta.validatePlan(...)` findings with
`t(issue.messageKey, { age: <translated age name> })` (DESIGN A3 deck advisor; warnings never block).
WP9 owns the strings, in `src/i18n/ui.en.json` under `ui.advisor.*`:

| `messageKey` | EN text | Use |
|---|---|---|
| `ui.advisor.tooFewUnits` | "{age} needs at least 3 units." | error: A3 minimum to play |
| `ui.advisor.noTurret` | "{age} needs a turret." | error: A3 minimum to play |
| `ui.advisor.onlyThreeUnits` | "{age} has only 3 units." | warning ("Medieval has only 3 units") |
| `ui.advisor.noAntiArmor` | "{age} has no anti-armor." | warning ("Stone has no anti-armor") |
| `ui.advisor.noAir` | "{age} cannot hit air." | warning ("Modern cannot hit air") |
| `ui.advisor.noSplash` | "No splash anywhere: swarms will hurt." | warning (plan-wide; set `age` to any age of the plan) |

**Ask:** return these keys in `PlanIssue.messageKey` (any stable `code` is fine; the UI keys list items by
`code` within an age). Only report ages the given format uses, as the screen shows the format next to
the average level. Need another finding? Add the key to this table in a request and WP9 adds the string.
