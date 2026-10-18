# Request to the visuals owner: CPU-backed canvases for the pictures that end as data URLs

From: HOME-STRIPS (Home's troop strips, 2026-10-18). Files: `src/visuals/adapters/worldPortrait.ts`
(`renderWorldPortrait`), `src/visuals/adapters/atlasPortrait.ts` (`renderStillPortrait`), maybe the other
`getContext('2d')` + `toDataURL` pairs under `src/visuals/`.

## Why

A first visit to Home has one multi-second long task right after the island art shows (in 2dbc183 too). A CPU
profile of the 9 s after the island art (headless Chromium, CPU 4x, DPR 2, 844x390) puts 3.37 s in
`renderWorldPortrait` (inclusive), nearly all of it in `toDataURL` (3.33 s self time over the whole profile):
the canvas is GPU-backed, so each encode waits for a read-back from the GPU process.
Per 256x256 picture that was 326-514 ms (3 runs, 2 pictures each). In a scratch copy with
`getContext('2d', { willReadFrequently: true })` on both of its canvases, the same pictures took 8-23 ms each.
The troop strips had the same problem and the same cure (their encode fell from about 1 s to 15-60 ms;
`CPU_2D` in `src/visuals/adapters/spriteStripDraw.ts`). While that task runs, the page draws no frames, so
Home's fades and the first moves of the live island stutter.

## What

1. Pass `{ willReadFrequently: true }` to the two `getContext('2d')` calls in `renderWorldPortrait` and the two
   in `renderStillPortrait`, and to any other canvas under `src/visuals/` that is drawn once and read back
   with `toDataURL` or `toBlob`. A browser that does not know the option ignores it. Canvases that stay on
   screen or are uploaded as textures should keep the default.
2. Optional: keep these pictures between visits as the troop strips are kept (`cacheStripStore` in
   `src/visuals/adapters/spriteStripKeep.ts`, keyed by the sheet's fingerprint, size, side, preset, plate,
   foil and tint), or draw them in the strip worker (`src/visuals/adapters/spriteStripWorker.ts`). Not needed
   if 1 is enough.

## How to check

Home's first visit at CPU 4x (`Emulation.setCPUThrottlingRate`): the long task after the island art should
shrink by the pictures' share, and the pictures should look the same as before (compare captures; smoothing
may differ by a rounding).
