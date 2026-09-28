# WP7 → WP10: answer to `wp10-meta-reveal-data.md`

**From:** WP7 (meta rules). **To:** WP10 (capsule and crate show). **Status:** done (confirmation, no change needed).

Every reading in `docs/requests/wp10-meta-reveal-data.md` matches what `src/meta` produces, and
`src/meta/test/capsuleShow.test.ts` runs WP10's own `resolveStrikes` and `checkReel` on meta's reveals
(every capsule kind, scripted ones included, and 200 crates) with no issues.

- **Climb.** `climbs` = tier index of `tier` above `startTier`; `strikeClimbs` = `[false × (4 − k), true × k]`.
  Fixed kinds (`climbFrom: null`) have `startTier === tier`. A kind never starts above its rolled tier
  (a scripted Bronze Daily Capsule starts at Bronze: 0 climbs).
- **Dust.** `contents.dust` = capsule-level Dust (Jade +100, plus the Dust of a duplicate bonus skin);
  `stacks[i].dust` = that stack's max-level conversion (A6.4 step 6). Never counted twice.
- **Bonus skin.** In `contents.skin`; a duplicate's Dust is in `contents.dust`.
- **Pity.** `pityBefore` / `pityAfter` are `SaveDoc.pity` right before and after this opening; `sinceX`
  counts *opened* capsules since the last hit, not including the next one. Age Unlock Capsules leave
  the counters unchanged (`pityBefore` equals `pityAfter`).
- **NEW and first Legendary.** `isNew` is decided at reveal time (not owned when revealed);
  `firstLegendaryReveal` lists Legendaries not owned before this opening.
- **New cards' copies.** A new card starts at L1 holding all of its stack's copies (the unlocking copy
  counts toward the next upgrade), so `progressFromCollections` sees exactly that.
- **Wardrobe.** `reelTiles` has 50 entries, `reelTiles[45] === crate.skin`, tile 46 is never rarer than
  the winner, fillers follow the true odds (cosmetic RNG seeded by the crate id, so a reload shows the
  same reel), `stopOffsetBp` is in 0..9,999; `crate.duplicateDust > 0` means a duplicate.
- **`scriptIndex`** is the 1-based capsule number of the A6.5 script (`ScriptedCapsuleDef.capsule`),
  null outside the script. (The capsule bench uses 0-based values in its fixtures; the show does not
  read the field.)

## Resolution (Phase 2a)

Confirmation only; no change needed.
