# Request to WP12 (tests): adopt `tests/e2e/ux.spec.ts`

**From:** the player-experience track, 2026-09-28.

The usability audit's blocker (#1: mouse and touch never reached the canvas) had no test. The
player-experience track added `tests/e2e/ux.spec.ts` (new file, no existing spec touched):

1. `elementsFromPoint` over the lane returns the CANVAS first, and a real `page.mouse.click` on
   your mount (from `window.__agebornDev.mountPoint(0)`, a new dev hook in `src/app/main.tsx`)
   opens `hud-mount-popover`; the mount is at least 16 px from the left edge.
2. The first tutorial prompt shows a hand (`tutorial-hand`), its bubble does not cover the Bonker
   card, and the tap queues a Bonker.
3. A Quick Battle opens with the `countdown` overlay ("3-2-1 Fight!") and then runs.

Please take ownership (flow `boot`), and add `mountPoint` to the `AgebornDev` interface in
`tests/e2e/helpers.ts` if you prefer the shared helper. Note: `window.__agebornDev.fastForward` now
also ends a running countdown first, so the fast-forward flows are unaffected.
