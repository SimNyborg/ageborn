# Request to WP6: the War Path map sounds (ui-plan 5.4, 6.4)

From: UI-2 Home as the War Path hub (WP9), 2026-09-29.

Home is the War Path map now. Its ceremonies play these ids through the kit's `sound` hook; they do not exist yet and are mapped in `UI_SOUND_FALLBACK` (`src/app/ui/MetaHost.tsx`):

| Id | Plan use | Fallback now |
|---|---|---|
| `star_stamp` | each star stamping onto a node or the Result's level badge (MR-41), pitch rising per star | `ui_confirm` |
| `path_draw` | the road drawing itself to the next node (MR-41) | `ui_tab` |
| `node_drop` | the next node dropping in, the banner planted (MR-41, MR-48) | `ui_toggle` |
| `region_open` | a boss beaten: the gate swings open and the next region's name drops (MR-42) | `level_up` |
| `ui_unlock` | a tab or the Modes tile unlocking (MR-40) | `level_up` |
| `reward_fly` | rewards and cards flying to their tab (MR-24, MR-44) | `ui_tab` |

Please add them (UI bus, A13 limits, the realistic direction of A11). Once they exist, delete their rows from `UI_SOUND_FALLBACK`.

**Done (2026-10-01, MVP pass):** every id above is rendered (`tools/audio/sfx/sounds_mvp.py`) and `UI_SOUND_FALLBACK` is empty.
