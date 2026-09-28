# WP2 (A17 step 1, sim) → WP11: re-pin match 1 after SIM_VERSION 2.0.0

**From:** the A17 step 1 sim and content agent. **To:** WP11 (owner of `src/tutorial/scripts.ts` and the
match 1 beats). **Status:** open. **Priority:** high (`src/tutorial/test/retime.test.ts` fails until done).

## What changed in the sim

`SIM_VERSION` 2.0.0 (docs/decisions.md, "A17 step 1"): the lane is 2,000 lu (A17.2), units walk ×1.25,
Siege adds a forced march ×1.2 and a siege crowd at the enemy gate, and the front is three units wide
(A16.4 lever L4). The tutorial format has no phases, so only the lane, the walking speed and the
three-wide front touch match 1.

## Measured on the current tree (`runMatch1(30)`, the retiming run of `retime.test.ts`)

```ts
export const MATCH1_TIMING = {
  firstKill: 366, // 0:18.3 (was 297)
  evolveReady: 1038, // unchanged
  medieval: 1101, // unchanged
  arrowStormReady: 1280, // unchanged
  gunpowder: 1821, // 1:31.1 (was 1911)
  modern: 2301, // 1:55.1 (was 2541)
  future: 2841, // 2:22.1 (was 3201)
  groggFalls: 2981, // 2:29.1 (was 3577; A8 draft 3:00)
} as const;
```

The run still ends with Grogg falling, the player in the Future and Grogg in the Stone Age.

## Also failing

`shows every beat once, in order, with no drop-offs`: one of the ten A8 beats is no longer shown. In the
director log `m1.killsEarnGold` and `m1.pebbler` both complete at tick 466 (the first kill now lands
later, at 366, closer to the Pebbler prompt), so one beat is done before it is shown. WP11 decides whether
to retime the beat triggers or accept the new order.

## Also for WP11 (A17.6, step 1)

- A beat that points at something off-screen (a mount, a power zone, the enemy base) first moves the camera
  there (350 ms) and pauses auto-follow until the beat ends, once WP5's camera exists.
- Grogg now falls at about 2:29 instead of 3:00 (A8's "~6 min as today" for the whole tutorial). If the
  owner wants the old length back, Grogg's script or the tutorial XP overrides
  (`formats.tutorial.xpToNextOverride`, WP1 data) can stretch it.
