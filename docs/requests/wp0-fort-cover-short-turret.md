# Request: a short-range turret must not make every Home pad unsafe (WP3 → WP0/WP2; forts phase 6)

**From:** WP3 (AI), forts F1 AI work, 2026-09-30.
**To:** the owner of `src/core/fortPads.ts` (`coverLimitP`) and `src/sim/systems/forts.ts` (`fortPadSafe`).
**When:** before F2 turns `FORT_SLOT_IN_BATTLE` on (Key D uses the same rule).

## What is wrong

A16.14.2: "A Home pad is also safe only if it lies inside own cover (`coverLimitP` = the longest range
among own built turrets − 24 − 12; with no turret, only pad 160 counts)."

`coverLimitP` returns `range − 36` whenever a turret is built. With only a short-range Common built
(Pitch Cauldron 130 lu → limit 94) no Home pad is inside cover, so **no pad is ever safe**: the AI never
places a fort and Key D always falls back to the most rearward legal pad. A side with a short turret is
worse off than a side with no turret at all, where pad 160 counts.

Measured (tier VII, the baseline plan, Short War): in Medieval the bot often builds the Pitch Cauldron
first, and every decision in which a wave met the fort value rule then saw `legal, not safe` on all three
Home pads with the enemy 900+ lu away.

## Proposed fix

```ts
export function coverLimitP(r: FortPadRules, longestTurretRange: number | null): number | null {
  if (longestTurretRange === null || longestTurretRange <= 0) return null;
  const limit = longestTurretRange - r.halfLarge - r.coverMargin;
  // A built turret never covers less than no turret: pad 160 always counts (A16.14.2).
  return limit < (r.pads[0] ?? 0) ? null : limit;
}
```

Plus a `core/test/fortPads.test.ts` case: with only a 130 lu turret, pad 0 is safe when no enemy can
arrive in scaffold + 1 s. This changes the observation's `safe` flags only (the AI and Key D read them);
placement legality and the sim outcome of a given command stream do not change, so no `SIM_VERSION` bump
is needed unless a golden records the observation.

## Until then

`src/ai/forts.ts` (`rearPadFallback`) reads pad 160 the same way when the cover rule alone leaves no Home
pad safe, from public numbers only (enemy positions and card speeds). It can be removed once the fix lands.
