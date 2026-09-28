# WP2 (A17 step 1, sim) → WP5: take the lane length from core

**From:** the A17 step 1 sim and content agent. **To:** WP5 (render), for the A17 step 1 camera work.
**Status:** open. **Priority:** high (the battle view draws the 2,000 lu lane on a 1,200 lu world until done).

## What changed

`LANE_MLU` in `src/core/fixed.ts` is now 2,000,000 (DESIGN A17.2, A17.15 rule 1). The sim, AI,
content (`battle.laneLength` 2,000, `midLane` 1,000, `powerZoneClamp` [150, 1,850]), the tutorial view
helpers and the bot viewer already follow it; a content schema check asserts that `battle.laneLength`
matches core.

## Request

- `src/render/layout.ts`: derive `LANE_LU` from core (`LANE_MLU / 1000`) instead of the literal 1,200, so
  `WORLD_WIDTH_LU` becomes 2,360 and the gates, `pToX` and `xToP` follow (A17.15: "Render derives its lane
  from core instead of its own `LANE_LU`"). The one-line change is ready in the sim agent's notes:

  ```ts
  import { LANE_MLU } from '@/core';
  /** The lane from core (A17.15: 2,000 lu); the world width and gates follow it. */
  export const LANE_LU = LANE_MLU / 1000;
  ```

- With it, these WP5 tests assume the old lane and need the new numbers (measured with the change applied):
  `src/render/test/geometry.test.ts` (world width 1,560 → 2,360; `pToX(20, 1)` 1,180 → 1,980; the seam's
  empty-lane midpoint 600 → 1,000; the "very wide, short screen" case now fills the width) and
  `src/render/test/realSim.test.ts` (1,818 poses out of the old bounds).
- The seam (`seam.ts`, A17.3: x = 1,000, clamp [700, 1,300], 300 lu blend, drift ≤ 30 lu/s), the
  camera, the minimap and the rest of A17.4-A17.7 are WP5's step 1 work.

The change was not made in WP5's files by the sim agent, to avoid clashing with the camera work.
