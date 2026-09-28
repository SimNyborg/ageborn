# HUD power targeting → WP11 (tutorial): teach the drag in the power hints

**From:** the HUD power-targeting agent (owner decision "Age Power targeting", docs/decisions.md). **To:**
WP11 (owner of `src/tutorial/scripts.ts`, `src/app/ui/TutorialBubble.tsx` and `src/i18n/tutorial.en.json`).
**Status:** open. **Priority:** medium.

## What changed in the HUD

Dragging the Age Power onto the field is now the primary interaction (`src/ui/hud/PowerButton.tsx`,
`src/ui/hud/powerAim.ts`):

- Drag from the button: a token follows the pointer and a world-scale ghost of the power's area follows it
  on the lane (enemy units it would hit are highlighted); drop to fire, drop on the HUD or press Escape
  to cancel. Powers that pick their own spot (Stampede, Paratroopers) show where they will act.
- A tap no longer fires blind: it enters an aiming mode (ghost at the enemy front, "Tap the battlefield to
  fire"); a tap on the field fires, a second tap on the button cancels. Space still auto-aims.
- The first time a player's power is ready (outside the onboarding matches, i.e. `callouts` on), the HUD
  shows "Drag onto the battlefield!" with an animated hand, once per profile (localStorage
  `ageborn.hud.powerDragHint`). It stays quiet while any tutorial bubble is on screen.

## Requests

1. **Adaptive hint `powerReady`** (`tutorial.hint.powerReady`, "Your power is ready."): please change the
   text to teach the gesture, for example "Drag your power onto the battlefield!", and give the hint the
   drag hand (`hand: 'powerDrag'`, today only beats carry a hand) so the hint and the HUD's first-time
   hint say the same thing.
2. **Match 1 beat `m1.arrowStorm`**: it already uses the drag hand. Its `done` is `powerTelegraph`, which
   still works (a tap now enters aiming mode first, then a field tap casts). If the beat text says "tap",
   please say "drag" instead.
3. **Drag hand geometry** (`TutorialBubble.tsx`, `ab-hand--drag`): it ends at 62% × 55% of the screen,
   which is the lane band, so it matches the new drop target. No change needed unless the hand should
   stop over the enemy front.
