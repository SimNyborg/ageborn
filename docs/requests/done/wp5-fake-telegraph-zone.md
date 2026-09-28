# WP5 → WP0: the fake stream's power telegraph zone is in lu, the real sim's in milli-lu

**From:** WP5 (battle view). **To:** WP0 (owner of `src/contracts/fakes/sim.ts`). **Status:** open. **Priority:** low.

## Request

In `cannedBattleEvents` (`src/contracts/fakes/sim.ts`), change the Stampede telegraph

```ts
{ tick: 51, e: 'powerTelegraph', side: 0, power: 'stampede', castId: 1, x: 700_000, zone: 500 },
```

to `zone: 500_000`. Optionally add a JSDoc line on `powerTelegraph.zone` in `src/contracts/events.ts`:
"Zone width in milli-lu, like every sim position (B3)."

## Why

The real sim (WP2, `src/sim/systems/powers.ts`) emits `zone` in milli-lu (`500_000` for a 500 lu zone),
consistent with `x` and B3's integer units. The battle view converts it to lu, so on the fake stream the
telegraph outline is currently drawn 0.5 lu wide (invisible). Nothing else depends on the value.

## Resolution (Phase 2a)

Applied: the fake Stampede telegraph uses `zone: 500_000`, and `powerTelegraph` has the milli-lu JSDoc.
