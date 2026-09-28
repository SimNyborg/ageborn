# WP10 → WP7: what the capsule show reads from `CapsuleReveal` and `WardrobeReveal`

**From:** WP10 (capsule and crate show). **To:** WP7 (meta rules, `openCapsule` / `openWardrobe`). **Status:** done (Phase 2b, capsules agent, 2026-09-28).

The show (`src/capsule`) consumes the reveal data only and never re-rolls. These are the readings it
relies on; each is covered by WP10 tests with hand-built reveals, so a different meaning in WP7 only
needs a small change in `src/capsule/summaryModel.ts` or `tiers.ts`.

## Climb

- The climb is derived from `capsule.startTier` and `capsule.tier` (k = tier index above the start).
  `climbs` and `strikeClimbs` are cross-checked; please emit exactly `k` and the back-loaded pattern
  `[false × (4 − k), true × k]` (DESIGN A10 step 3). A mismatch is logged in dev and never shown.
- Fixed-tier kinds (`climbFrom: null` in `content.capsules.kinds`) start at the burst; please set
  `startTier === tier` for them.

## Dust

- `contents.dust` = capsule-level Dust (the Jade +100). Each `stacks[i].dust` = the Dust that stack's
  copies converted into at max level (A6.4 step 6). The summary shows `contents.dust + Σ stack.dust`,
  so please do not include the stack Dust in `contents.dust` as well.

## Bonus skin (Aeon, 30%)

- `contents.skin` is shown as its own card with a "SKIN" stamp. The reveal does not say whether it
  was a duplicate, so the show never stamps it NEW. If it was converted to Dust, that Dust is in
  `contents.dust`.

## Pity counters

- `pityBefore` / `pityAfter` are shown as "within N" lines with N = `rule − since` (at least 1):
  `epicEvery − sinceEpic`, `legendaryGuaranteeAt − sinceLegendary`, `newCardEvery − sinceNewCard`
  (A6.5). This assumes `sinceX` counts opened capsules since the last hit, not including the next one.
- `firstLegendaryReveal` lists the Legendaries revealed for the first time ever (full 9 s walkout,
  not skippable); every other Legendary gets the 3 s walkout.

## Wardrobe

- `reelTiles` has 50 entries, `reelTiles[45] === crate.skin`, and tile 46 is never rarer than the
  winner (A10.1). `checkReel` in `src/capsule/reelMath.ts` verifies this and is cheap enough to
  call from a WP7 test. `crate.duplicateDust > 0` shows the crate as a duplicate (Dust, no NEW).
- Wardrobe pity is not in `WardrobeReveal`; the screen takes the save's `pity` as a prop.
