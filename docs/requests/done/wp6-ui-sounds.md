# Request to WP6: the UI sound ids of ui-plan 5.4

From: UI-0 Foundations (WP9), 2026-09-29.

The shared Button, tabs, sheets and toasts now play UI sounds through the kit's `sound` hook (`src/ui/components/kit.ts`); the app passes `audio.play` (`src/app/ui/MetaHost.tsx`). These ids from ui-plan 5.4 do not exist yet and are mapped to the nearest existing sound meanwhile (`UI_SOUND_FALLBACK` in MetaHost):

| Id | Plan use | Fallback now |
|---|---|---|
| `ui_sheet` | panel and sheet open and close (MR-14), a short cloth swish | `ui_toggle` |
| `ui_pop` | first-seen captions, chips (MR-28) | `ui_toggle` |
| `ui_whoosh` | screen transitions (MR-12, MR-13) | `ui_tab` |
| `ui_stamp` | claim stamps (MR-23, MR-45) | `ui_confirm` |
| `card_lift` | card select or drag start (MR-30) | `ui_toggle` |
| `card_place` | card placed in a slot (MR-32) | `ui_confirm` |

Please add them (ZzFX first, UI bus, A13 limits). Once they exist, delete their rows from `UI_SOUND_FALLBACK`. Ids already used as they are: `ui_click` (press release), `ui_deny` (denied press, MR-03), `ui_tab`, `ui_toggle` (confirm arm, segmented), `level_up` and `upgrade_slam` (the card upgrade ceremony, MR-39).

**Done (2026-10-01, MVP pass):** every id above is rendered (`tools/audio/sfx/sounds_mvp.py`) and `UI_SOUND_FALLBACK` is empty.
