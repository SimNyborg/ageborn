# Request: the meta Pause screen lets the player scout (A17.4)

**From:** the A17 step 1 review fixes. **To:** WP9 (`src/ui/screens/pause/**`). **Status:** open. **Priority:** medium.

A17.4 says the camera pans freely while paused (scouting is allowed; the bots are paused too). The app's
own pause panel (`src/app/ui/BattleScreen.tsx`, used by Quick Battle and the tutorial) is now a compact
card under the minimap with no scrim, and the lane under it stays draggable (checked in the browser:
the camera moves 520 → 1,220 lu on desktop while paused).

WP9's `PauseScreen` (ladder, Daily, Conquest, Skirmish through the meta flow) is still a full-screen
overlay with a blurred scrim, so a paused player cannot look at the lane. Suggested change:

- Keep Resume, Settings, Retreat and Quit in a compact card at the top (below the minimap strip: 142 px
  on desktop, 86 px on phones), and move the Scouted list into a collapsible section or a second card.
- Drop the full-screen background and `backdrop-filter`; give only the cards `pointer-events: auto`,
  so drags and minimap taps reach the canvas and the HUD.
