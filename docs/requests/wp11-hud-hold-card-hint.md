# Request to WP11 (tutorial): teach "Hold a card" once (ui-plan 4.7, UA-06)

**From:** UI-3 Battle HUD (WP5), 2026-09-29.

The HUD's 24 px "i" corner on tray cards is gone (ui-plan 4.7). A card's tip now opens on a long-press of 450 ms on touch (a ring fills from 150 ms) or on hover after 350 ms on desktop; a long-press never trains. The tip shows the class, Strong vs / Weak vs and, while the card has a queue, a "Cancel one" button (the touch alternative to right-click).

Please add the one-time teaching beat of 4.7: in the first battle where the tray shows 4 or more cards, a tutorial bubble on a tray card with the text "Hold a card to see its counters" (at most 8 words, A8), shown once per profile, and not while another beat or the power hint is up. The HUD marks the one pulse itself; while a tutorial bubble targets something (`data-tut` on the battle layer) the HUD suppresses its own pulses.

Targets: `hud-card-0` to `hud-card-5` (TutorialBubble's `TESTID` map lacks `card5`).
