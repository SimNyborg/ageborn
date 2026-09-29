# Request to the War Path owner: boss capsules on the new capsule ladder

From: the lead designer, 2026-09-29 (revised after review). Owner request: more capsule tiers, so the top capsules become truly rare and coveted. DESIGN A6.4 now has 7 tiers: Clay, Bronze, Silver, Jade, **Gold**, **Platinum**, **Aeon**. Gold is the old Aeon's contents plus 100 Dust. Platinum holds 2 Legendaries and a sure skin. The new Aeon holds 3 Legendaries, an Epic-or-better skin and an Aeon Collection item. The spec: DESIGN A6.4 and A10, `docs/decisions.md` ("Owner request 2026-09-29: more capsule tiers") and the sibling requests `docs/requests/capsule-tiers-*.md`.

Please apply this once the capsule-tier work has landed `'gold'` and `'platinum'` in `CapsuleTier` (`src/contracts/ids.ts`) and in the content schema's `TIER` picklist (`capsule-tiers-wp0.md`, `capsule-tiers-wp1.md`). Before that, `'gold'` does not typecheck.

**Status (rules build, 2026-09-29):** `'gold'` and `'platinum'` have landed in `CapsuleTier`, the content `TIER` picklist and the save schema, so this change can be applied now. The legacy grant (`src/meta/legacyAeons.ts`) finds the finale as the War Path level whose `reward.capsule` is the top tier (`aeon`) and reads `isBeaten`; it needs no War Path edit.

## 1. `src/content/raw/warPath.ts` (one value)

The region with `age: 'future'`: change `bossCapsule: 'jade'` to `bossCapsule: 'gold'`.

The boss capsules then climb Bronze, Silver, Silver, Silver, Jade, Jade, **Gold**, **Aeon**.

- The Cosmic boss keeps `bossCapsule: 'aeon'` with no edit. It now grants the new, top-tier Aeon, so the War Path finale is one of the three skill-earned Aeons (with Trophy Road 4,000 and Conquest's 27 stars).
- Nothing else in the file changes.

## 2. `src/meta/warPath.ts`

No change. It passes the node's tier to `grantCapsuleAt(save, 'warPath', t, now, { tier: r.capsule, age })`, which handles every tier.

The capsule-tier work (WP7, `capsule-tiers-wp7.md`) reads the existing export `isBeaten(s, id)` for the Cosmic region's boss level, read only, to grant a legacy skill Aeon to saves that beat that boss before the ladder update. Please keep `isBeaten` exported with its current meaning.

## 3. Tests and previews

- Any War Path content test that pins the boss tiers (for example a list of `bossCapsule` values) must expect `gold` for the Future region.
- The node preview and the level sheet show the boss capsule through `CapsuleIcon` and `capsuleTier.gold.name` ("Gold Capsule"), which the capsule-tier work adds. Boss capsules have a fixed tier, so showing the tier and its Legendary crests before the fight is correct (A9, A10). No War Path string changes.

## 4. The War Path save migration

It does not need to know about capsule tiers. The capsule-tier migration is its own save version, added after whatever version is newest when it lands (so if the War Path migration takes v6, the capsule ladder takes v7). It remaps the Win Capsule bag (tier index 4 → 6), adds `capsules.bagSize`, relabels pending `aeon` capsules to `gold` with +100 Dust, and sets the flags `capsule.legacySkillAeon` and `notice.capsuleLadder`. A pending War Path boss capsule that was an old Aeon becomes Gold by that same rule.

## Why

- A Gold at the Future boss gives the path a guaranteed Legendary capsule before the finale.
- The finale stays the rarest capsule, so the ladder of boss rewards rises all the way.
- One-time value against today: +3,035 Dust-equivalent and +1,240 Amber at the Future boss (Gold instead of Jade), and +7,892 and +960 at the Cosmic boss (the new Aeon instead of the old one).
- These are first-clear rewards shown before the fight (A18.7.8), so nothing is hidden.
