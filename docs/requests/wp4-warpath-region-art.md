# Request to WP4: War Path region art (ui-plan 3.7, 4.1, 6.4)

From: UI-2 Home as the War Path hub (WP9), 2026-09-29.

The War Path map (`src/ui/screens/warPath/`) draws one landscape per age with a CSS/SVG fallback (`regionArt.tsx`: sky, ridges, a landmark per age, ground props beside the road). ui-plan 3.7 asks for painted layers through the art service:

- Manifest ids `ui.warpath.region.<ageId>.far|mid|near` for the 8 ages (13 later), wide strips that tile or run about 1,600 px per region at phone scale, transparent above the horizon for `mid` and `near`.
- `ui.warpath.marker`: the banner-bearer (idle, a 4-frame walk, plant), in the player's team colour layer.
- Node, star and crown art (`ui.warpath.node.*`) is optional; the CSS nodes read well at 56 / 72 px.

The UI would take them through an injected `regionArt(age, layer): string | null` on the UI environment (as `portrait` is today) and keep the SVG fallback until an image loads, so nothing waits for art. The road must stay clear: keep props out of a 40 px band around the road line, which the UI can pass as a path if needed.
