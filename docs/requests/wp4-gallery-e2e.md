# WP4 → WP12: e2e checks on the art gallery

**From:** WP4 (visuals). **To:** WP12 (`tests/e2e`). **Status:** open. **Priority:** medium.

The art gallery (`?dev=1#gallery`, `src/dev/gallery`) runs the WP4 DoD checks in the browser and publishes
the results on `window.__galleryInfo` for automation (DESIGN B5: "the review sheet and the screenshot-test
target"). Please add a Chromium spec that:

1. **Art checks.** Open `?dev=1#gallery/section=checks`, wait until `window.__galleryInfo?.checks?.done`
   (about 30 s in headless software rendering), and assert `checks.pass === true` (colour rule, skin
   silhouette IoU ≥ 0.85, body width, scale and structure for 93 visuals and 50 effects; `failures` lists
   ids otherwise).
2. **Bake budget (B16).** Open `?dev=1#gallery/section=bake`, wait for `window.__galleryInfo?.bake`, and
   assert `bake.pass === true` (`bootMs` ≤ 400 for ages 0-1). Measured locally: 96-150 ms.
3. **Screenshot targets** (optional, as visual baselines): `section=units&age=all&clip=idle&t=400`,
   `section=turrets&age=all&clip=idle&t=400`, `section=world&left=stone&right=future&t=800`,
   `section=effects&t=260`. The canvas host gets `data-ready="1"` once the frozen frame is rendered.
   No console errors should appear on any section.

Everything the page needs is in the dev bundle; nothing in `public/` is required.
