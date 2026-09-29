# Request to WP0 (contracts): the capsule ladder

From: the lead designer, 2026-09-29 (owner request "more capsule tiers"; spec in DESIGN A6.4, A10, B15 and `docs/decisions.md`). Land this first: every other `capsule-tiers-*.md` request builds on it.

## 1. `src/contracts/ids.ts`

```ts
export type CapsuleTier = 'clay' | 'bronze' | 'silver' | 'jade' | 'gold' | 'platinum' | 'aeon';
```

Order matters: it is the ladder, lowest first (index 0-6). Jade stays index 3; `aeon` moves from index 4 to 6.

## 2. `src/contracts/save.ts`

- `SaveDoc.capsules` gains `bagSize: number` (after `bag`), with JSDoc: "The size of the Win Capsule bag that `bag` belongs to: 100 for a bag filled before the 2026-09-29 ladder, 200 after; 0 when `bag` is empty (DESIGN A6.4)." Also document `bag` as "sorted tier indices left in the current bag".
- `CapsuleReveal` gains `firstOfTier: boolean` with JSDoc: "True when this is the first Gold, Platinum or Aeon Capsule the save opens (flag `capsule.first.<tier>`); drives the skippable first-of-tier step (A10 step 4b)."
- JSDoc on the existing fields, no shape change:
  - `climbs`: "Tiers climbed in total: the climbs of the 4 main strikes plus the summit strikes above `capsules.summitAbove` (Platinum 1, Aeon 2)."
  - `strikeClimbs`: "The 4 main strikes only, back-loaded (a climb is never followed by a non-climb). Summit strikes = `climbs` − the number of `true` entries."
- `flags` stays `Record<string, boolean>`. New keys used by meta and the app (document them in the `flags` JSDoc): `capsule.first.<tier>`, `capsule.legacySkillAeon`, `notice.capsuleLadder`.
- `PendingCrate.source` keeps `'aeon'` for stability (unused by the ladder).

## 3. Why

- `bagSize` keeps "N of 100 left" true for a bag filled before the update (the new bag is 200).
- `firstOfTier` lets the show play the first-of-tier moment without reading flags.
- The save shape changes, so WP8 adds a migration (`capsule-tiers-wp8.md`).
