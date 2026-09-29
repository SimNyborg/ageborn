# Request to the War Path owner: boss capsules on the new capsule ladder

From: the lead designer, 2026-09-29. Owner request: more capsule tiers, so the top capsules become truly rare and coveted. DESIGN A6.4 now has 7 tiers: Clay, Bronze, Silver, Jade, **Gold**, **Platinum**, **Aeon**. Gold is the old Aeon's contents plus 100 Dust. Platinum holds 2 Legendaries. The new Aeon holds 3 Legendaries (the first Holo), a skin and an Aeon Collection item. The full spec is in `docs/decisions.md` ("Owner request 2026-09-29: more capsule tiers").

Please apply this once the capsule-tier work has landed `'gold'` and `'platinum'` in `CapsuleTier` (`src/contracts/ids.ts`) and in the content schema's `TIER` picklist. Before that, `'gold'` does not typecheck.

## 1. `src/content/raw/warPath.ts` (one value)

The region with `age: 'future'`: change `bossCapsule: 'jade'` to `bossCapsule: 'gold'`.

The boss capsules then climb Bronze, Silver, Silver, Silver, Jade, Jade, **Gold**, **Aeon**.

- The Cosmic boss keeps `bossCapsule: 'aeon'` with no edit. It now grants the new, top-tier Aeon, so the War Path finale is one of the three skill-earned Aeons (with Trophy Road 4,000 and Conquest's 27 stars).
- Nothing else in the file changes.

## 2. `src/meta/warPath.ts`

No change. It passes the node's tier to `grantCapsuleAt(save, 'warPath', t, now, { tier: r.capsule, age })`, which handles every tier.

## 3. Tests and previews

- Any War Path content test that pins the boss tiers (for example a list of `bossCapsule` values) must expect `gold` for the Future region.
- The node preview and the level sheet show the capsule through `CapsuleIcon` and `capsuleTier.gold.name` ("Gold Capsule"), which the capsule-tier work adds. No War Path string changes.

## 4. The War Path save migration

It does not need to know about capsule tiers. The capsule-tier migration is its own save version, added after whatever version is newest when it lands. It remaps the Win Capsule bag (tier index 4 → 6), adds `capsules.bagSize`, and relabels pending `aeon` capsules to `gold` with +100 Dust. A pending War Path boss capsule that was an old Aeon becomes Gold by that same rule.

## Why

- A Gold at the Future boss gives the path a guaranteed Legendary capsule before the finale.
- The finale stays the rarest capsule, so the ladder of boss rewards rises all the way.
- One-time value: +3,585 Dust-equivalent and +1,240 Amber at the Future boss, and +7,116 and +960 at the Cosmic boss (the new Aeon).
- These are first-clear rewards shown before the fight (A18.7.8), so nothing is hidden.
