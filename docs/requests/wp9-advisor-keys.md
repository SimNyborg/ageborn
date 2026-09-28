# WP9 → WP7: message keys for War Plan advisor findings

**From:** WP9 (meta UI screens). **To:** WP7 (meta rules). **Status:** done (WP7's `validatePlan` returns `ui.advisor.<code>`; checked by `src/ui/screens/test/realMeta.test.tsx`).

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
| `ui.advisor.badShape` | "{age} loadout is damaged. Use Auto-fill to repair it." | error: not 5 unit and 2 turret slots |
| `ui.advisor.unknownCard` | "{age} holds a card that no longer exists." | error |
| `ui.advisor.wrongAge` | "{age} holds a card from another age." | error |
| `ui.advisor.notOwned` | "{age} holds a card you don't own." | error |
| `ui.advisor.duplicate` | "{age} holds the same card twice." | error |
| `ui.advisor.badPower` | "{age} needs an Age Power you own." | error |

Any other key falls back to "{age} loadout needs a look." (`ui.advisor.generic`), so a new finding never
shows a raw key, but please add its string through a request.

**Ask:** return these keys in `PlanIssue.messageKey` (any stable `code` is fine; the UI keys list items by
`code` within an age). Only report ages the given format uses, as the screen shows the format next to
the average level. Need another finding? Add the key to this table in a request and WP9 adds the string.
