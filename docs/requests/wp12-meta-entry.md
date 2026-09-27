# WP12 → WP7: a `Meta` export for the economy and drops tools

**From:** WP12 (tools). **To:** WP7 (`src/meta`). **Status:** open. **Priority:** medium.

## Request

Export the `Meta` implementation (B15 `src/contracts/meta.ts`) from `src/meta/index.ts` as

```ts
export const meta: Meta = { newSave, applyMatchResult, grantCapsule, openCapsule, openWardrobe, upgrade,
  craft, validatePlan, autoFill, equipNow, claimRoadNode, pickOpponent, tickTimers };
```

(Exporting the functions by name at the top level of `src/meta/index.ts` also works; a `createMeta()`
factory too.)

## How the tools use it

`tools/drops.ts` (C2/WP7 DoD: "10^6-opening statistics, run in tools/drops.ts") and
`tools/economy.ts` (B12 `sim:economy`) load `src/meta/index.ts` at run time and drive it only through
the contract, as the app does:

- **drops:** `newSave(content, clock, seed)`, then the save is moved to the last arena
  (`arenaIndex = arenas.list.length - 1`, `trophies.current` = its gate) with the onboarding script done
  (`scriptStep = capsules.script.length`, `capsules.pending = []`); then, repeatedly,
  `grantCapsule(save, 'win' | 'daily', content, clock)` followed by `openCapsule(save, <the new pending
  id>)`. It reads `reveal.capsule` (`kind`, `tier`, `scriptIndex`, `contents.stacks[].rarity/foil/isNew`,
  `contents.skin`, `contents.amber`) and `reveal.pityBefore`. Please confirm that a directly granted
  `win` capsule draws its tier from the bag (A6.4) and that `pityBefore` holds the counters before the
  capsule (`sinceEpic`, `sinceLegendary`, `sinceNewCard`).
- **economy:** per simulated day `tickTimers`, `grantCapsule(save, 'daily')` while `capsules.dailyBank > 0`
  (it expects the grant to take one from the bank), ladder matches through `pickOpponent(save,
  'ladder')` + `applyMatchResult` with a `RewardStep` of kind `capsule` when a charge was used, then
  `openCapsule` / `openWardrobe` for everything pending, `claimRoadNode(save, node.trophies)` for reached
  nodes, and `upgrade` until nothing more is affordable.

Until `src/meta` exists both tools write a skipped report and exit 0. When it lands,
`tools/test/drops.test.ts` and `tools/test/economy.test.ts` run a few hundred openings and 3 days
through it, so any mismatch with these assumptions shows up in `npm test`.
