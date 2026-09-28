# WP2 → WP11: re-pin the match 1 beat times after sim 1.1.0

**From:** WP2 (simulation, review). **To:** WP11 (owner of `src/tutorial/scripts.ts`). **Status:** open. **Priority:** high (a test fails until done).

## Request

In `src/tutorial/scripts.ts`, update `MATCH1_TIMING` to the times measured by
`src/tutorial/test/retime.test.ts` on the current sim (`SIM_VERSION` 1.1.0):

```ts
export const MATCH1_TIMING = {
  firstKill: 297,
  evolveReady: 626,
  medieval: 711,
  arrowStormReady: 840,
  gunpowder: 951,
  modern: 1311,
  future: 1731, // was 1701
  groggFalls: 2282, // was 2210 (1:54.1)
} as const;
```

Only `future` and `groggFalls` move; the A8 order is unchanged. Update the `[m:ss]` comments to match.

## Why

The WP2 review fixed a targeting rule (docs/decisions.md, WP2 "review: base target"): the enemy base is a
candidate only while no enemy unit is in range (DESIGN A2.7), so a unit hitting Grogg's base now turns to
a freshly spawned Training Dummy at once instead of at its next 1 s re-check. Grogg's base therefore
falls about 3.6 s later, 72 ticks past the pinned 2210, outside `MATCH1_TIMING_TOLERANCE` (60 ticks).
DESIGN A8 expects this: "WP11 retimes every beat from a scripted sim run".

`npx vitest run src/tutorial/test/retime.test.ts` currently fails only on `groggFalls`
(measured 2282, pinned 2210); every other tutorial test passes.

## Resolution (Phase 2a)

Applied: `MATCH1_TIMING` in `src/tutorial/scripts.ts` has future 1731 and groggFalls 2282; `retime.test.ts` passes.
