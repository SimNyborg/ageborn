# Request to WP7 (meta rules): the capsule ladder

From: the lead designer, 2026-09-29 (owner request "more capsule tiers"; spec in DESIGN A6.3, A6.4, A6.5, A10, B8 and `docs/decisions.md`). Needs `capsule-tiers-wp0.md` and `capsule-tiers-wp1.md` first. Everything stays pure and deterministic: integer math, the save's sfc32 streams, no `Math.random` or `Date`.

## 1. `meta/tables.ts`

`TIER_ORDER` and `TIER_INDEX` come from `content.capsules.tierOrder` (7 tiers), not a hard-coded list.

## 2. `meta/capsules/bag.ts`

- The bag size is the sum of `capsules.bag` (200). `drawFromBag` refills with that mix when `bag` is empty and returns the new `bagSize` (200 after a refill; 0 once it runs empty). `bag` stays sorted tier indices.
- `bagLeft` returns counts for all 7 tiers and reads `save.capsules.bagSize || contentBagSize` as the total ("N of 100 left" for a migrated bag, "200 of 200" for an empty one).
- `newSave` sets `bagSize: 0`.

## 3. `meta/capsules/roll.ts` (A6.4 roll algorithm, MUST be exact)

1. Remove step 1.3 (the Jade conversion); `rareToLegendaryBp` stays readable but is 0 everywhere.
2. Step 3: the 2nd and later *guaranteed* Legendary stacks hold `extraLegendaryCopies`; pity and random Legendary stacks hold `copies.legendary`.
3. Step 4: the no-duplicate rule counts cards already picked in this capsule as owned: `pickCard` tests `pool.byRarity.legendary.some(c => !owned.has(c) && !used.has(c))`. A 2nd or 3rd Legendary stack never falls back to Epic while the pool has a Legendary not used in this capsule.
4. Step 4, catch-up (`legendaryCatchUp`): a Legendary pick uses it whenever every Legendary in the pool is owned, promised by an unopened capsule (`cardsForRoll`) or already picked in this capsule. Each candidate weighs 1 + the copies it still needs to reach L10 after its unopened capsules (a maxed card weighs 1). Integer weights, `pickWeighted`, same stream. The rarity odds never change.
5. Step 5, foils: unchanged; no floor on any tier.

## 4. `meta/capsules/grant.ts`

- Pass the new fields into the roll spec.
- Skin (replaces `bonusSkin`'s fixed Wardrobe odds): chance `skinChanceBp`, then a rarity by Wardrobe odds limited to `skinMinRarity` and up (renormalised: Platinum Rare 78 / Epic 18 / Legendary 4; Aeon Epic 82 / Legendary 18), no duplicate until every crate skin of that rarity is owned. Capsule skins never read or advance `pity.wardrobeSince*` (pass no pity, as today).
- Aeon item (`exclusiveItems`), on `rng.cosmetic` so card rolls never change: while the player lacks an item of source `{ kind: 'capsuleTier', tier }` that no unopened capsule holds, the capsule's collection item is one of those, picked uniformly; it replaces the normal collection roll. Otherwise the normal capsule collection roll applies (10,000 bp) and `contents.dust += exclusiveCompleteDust` (500). If no such items exist in content yet, roll the normal pool with no Dust.
- Tier sources: Win from the bag, Supply from `dailyOddsBp` (7 tiers), fixed kinds by the given tier. The climb start stays `lowerTier(climbFrom, tier)`.

## 5. `meta/capsules/open.ts`

- Main and summit strikes: k_main = clamp(min(tier, `summitAbove`) − start, 0, 4); `strikeClimbs` = 4 − k_main `false` then k_main `true`; summit = max(0, tier − `summitAbove`); `climbs` = k_main + summit. Must match `capsule/tiers.ts`'s `resolveStrikes` (WP10) for every start and final pair.
- First of a tier: for a capsule whose tier's `guaranteed` holds a Legendary (Gold, Platinum, Aeon), set `firstOfTier = !flags['capsule.first.<tier>']` and set the flag.
- Max-level Dust conversion stays at reveal time.

## 6. `meta/cosmetics.ts`

- `craftCosmetic` accepts an item with source `capsuleTier` once `flags['capsule.first.<tier>']` is set, at `capsules.exclusiveCraftDust` (3,000), not the rarity's `craftDust`. Before that it fails with a new reason `locked` (the UI says "Craftable after your first Aeon Capsule").
- Collection progress and odds include the Aeon set ("owned / 4").

## 7. Legacy skill Aeons (the save migration sets the flag, `capsule-tiers-wp8.md`)

New pure function `grantLegacySkillAeons(s, t, now)`, called from `tickTimersAt` (which the app runs on every load) while `flags['capsule.legacySkillAeon']` is true:

- Count the skill sources the save has claimed: 4000 in `trophies.roadClaimed` (kind `road`), 27 in `conquest.milestonesClaimed` (kind `conquest`), and the Cosmic region's boss level beaten per `isBeaten(s, id)` from `meta/warPath.ts` (kind `warPath`; read only, do not edit that file).
- Grant one Aeon per claimed source through the normal grant path (`grantCapsuleAt(s, kind, t, now, { tier: 'aeon' })`), then delete the flag. A second call grants nothing.
- Export a pure `legacySkillAeonCount(s, t)` (the same three checks) so the notice card can say how many were granted.

## 8. `meta/economy.ts` and `script.ts`

- `expectedCopiesX10k` uses `extraLegendaryCopies` for the 2nd and later guaranteed Legendary stacks and no Jade conversion (Jade 4980, Platinum 7790, Aeon 8640 centi).
- Script capsule 5 reads its tier from content (`gold`); nothing is hard-coded.

## 9. Unit tests

- The 2nd and 3rd Legendary stacks pick owned Legendaries, never Epic, when no unowned one is left.
- Catch-up weights apply to the 2nd stack after the 1st took the last unowned Legendary, and count copies in unopened capsules.
- Platinum always holds 2 and Aeon 3 distinct Legendaries; Platinum and Aeon always hold a skin, Aeon's Epic or better.
- A capsule skin leaves `pity.wardrobeSinceEpic` and `wardrobeSinceLegendary` unchanged.
- The Aeon item never duplicates one owned or held by an unopened capsule; after the set, +500 Dust.
- Crafting an Aeon item fails before the first Aeon and costs 3,000 after it.
- `open.ts` and `resolveStrikes` agree for all 7 × 7 start and final pairs; `firstOfTier` is true once per tier.
- The legacy grant: one Aeon per claimed source, once.
- No `'aeon'` or `'jade'` literal in rule code: tests pass with a content fixture whose top tier has another id.
