# WP11 → WP5: AI chip on the replay viewer's other-side HUD

**From:** WP11 (replay viewer, `src/app/screens/replay/ReplayScreen.tsx`). **To:** WP5 (`src/ui/hud/TopBar.tsx`).
**Status:** open (small; not blocking).

The replay viewer has a side toggle (A9 #14: "side toggle for which HUD to show"). When it shows
side 1's HUD (the AI General's view), the HUD's "foe" is the human player, but `TopBar` always draws
the robot icon and "AI" chip on the foe nameplate, so the player is labeled AI.

`HudModel.foe.isAI` is typed `true` in the frozen contract, so it cannot say otherwise. `Hud` already
receives `config`; please draw the chip only when the foe side is a bot:

```tsx
// TopBar, foe nameplate: foeSide = side === 0 ? 1 : 0
{config.sides[foeSide].isBot ? <span class="hud-ai-chip" data-testid="hud-ai-chip">…</span> : null}
```

In every live battle the foe is an AI (A7.1), so nothing changes there.
