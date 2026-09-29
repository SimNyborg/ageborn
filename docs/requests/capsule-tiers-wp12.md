# Request to WP12 (tools, integrity tests): the capsule ladder

From: the lead designer, 2026-09-29 (owner request "more capsule tiers"; spec in DESIGN A6.4, A6.9, A10, B13, C5 and `docs/decisions.md`). Needs `capsule-tiers-wp1.md` and `-wp7.md`.

## 1. `tools/drops.ts`

- Bag check: group size = the content bag size (sum of `capsules.bag`, 200); every group exact.
- Supply χ² over the 6 Supply tiers.
- Skin checks keyed on data: a χ² for tiers with 0 < `skinChanceBp` < 10,000 (Gold 30%), and a zero-violation check for tiers at 10,000 (Platinum, Aeon), including the rarity floor (`skinMinRarity`: Aeon never below Epic).
- Foil χ² over every stack (no floors exist).
- Guarantee checks from data: Legendary stacks ≥ the `guaranteed` Legendary count, all distinct cards; extra guaranteed Legendary stacks hold `extraLegendaryCopies`.
- Capsule skins leave the Wardrobe pity counters unchanged.
- The honest-climb invariants for every start and final pair (with WP10's `resolveStrikes` and WP7's `open.ts`): no non-climb after a climb, summit strikes included; summit strikes only above `summitAbove`; the sums match.
- No check may name `'aeon'` or `'jade'` (today line ~113 does): key everything on data.
- The full-mode run (1,000,000 openings) is the release gate, because the Supply Aeon is 15 bp.

## 2. `tools/economy.ts`

- `ECONOMY_TARGETS` rebased on today's measured 100-seed medians (the owner's "keep today's time to max a card"): `copiesPerBagCapsule` 16.0, `amberPerBagCapsule` 411, `copiesPerDay` 98, `amberPerDay` 3030, `commonMaxDays` 110, `rareMaxDays` 101, `epicMaxDays` 69, `legendaryMaxDays` 112 (tolerance stays ± 20%). The old month-based values (4.5 / 4.3 / 3 / 4.5 months) are stale: today's own Rare median (101) is below the old band.
- Gate on the median of 30 seeds (about 25 s), not one seed.
- Leave `allLegendariesDays`, `planL7Days`, `copiesDoneDays`, `collectionMaxedDays` and `maxGapDays` as they are: they miss today too and are Phase 3 items (A6.9 marks them open).
- The model uses the 7-tier table, the 200 bag, the new Supply odds and the catch-up rule through the real meta code (no copy of the rules).

## 3. Integrity tests

- **Hidden tier:** render the Home tray, the Capsules tab, the Result and the odds panel with a save holding a pending Win Capsule whose rolled tier is Aeon and one Supply Capsule whose rolled tier is Platinum. No DOM text or aria label contains the rolled tier's name (`capsuleTier.aeon.*`, `capsuleTier.platinum.*`), no icon gets that tier's colour or crests, and the order equals the order by visible tier and `createdAt`.
- **Copy scan** (C5 item 89): in `capsule.*`, `capsuleTier.*`, `ui.odds.*`, `ui.capsules.*`, `ui.notice.capsuleLadder.*` and `cosmetic.set.aeon.*`, no "jackpot", "ultra rare", "rarest", "so close", "almost", "nearly", "lucky", "limited", "don't miss", "only {n} left", and no countdown wording.
- The import-graph test is unaffected.
