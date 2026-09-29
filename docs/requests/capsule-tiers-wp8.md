# Request to WP8 (save): the capsule ladder migration

From: the lead designer, 2026-09-29 (owner request "more capsule tiers"; spec in DESIGN A6.4, B8, B15 and `docs/decisions.md`). Needs `capsule-tiers-wp0.md` first.

## 1. Version

The next save version after the newest one in `src/save/migrations` when you start (v6 if nothing lands first; the War Path migration may take v6, and then this is v7). Re-read `migrations/index.ts` right before adding it, append it to `SAVE_VERSIONS`, and never edit an older step or fixture.

## 2. `schema.ts`

- `TIER` picklist: `['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon']`.
- `capsules.bagSize`: an integer ≥ 0.

## 3. `migrations/vN.ts`, `up(doc)` (pure; receives a deep copy)

1. **Bag:** `bag = bag.map(i => (i === 4 ? 6 : i)).sort((a, b) => a - b)`. Indices 0-3 do not move; the sort gives the canonical form (the v5 fixture's bag is unsorted). `bagSize = bag.length > 0 ? 100 : 0`. The bag in progress finishes its old mix, and its Aeon slots are the new Aeon.
2. **Pending capsules** with `tier === 'aeon'`: `tier = 'gold'`; `startTier = 'gold'` where it was `'aeon'` (a Win Aeon keeps `startTier: 'clay'`); `contents.dust += 100`. Nothing else changes: no re-roll, no removal, including a pending scripted capsule 5.
3. **Legacy skill Aeons:** `flags['capsule.legacySkillAeon'] = true`. WP7's `tickTimers` grants the Aeons and deletes the flag (`capsule-tiers-wp7.md` section 7).
4. **Notice:** `flags['notice.capsuleLadder'] = true` when `pity.opened > 5`, or step 2 relabelled a capsule, or `trophies.roadClaimed` includes 4000, or `conquest.milestonesClaimed` includes 27. Otherwise leave it unset (a save still in the onboarding script learns the ladder as it is).
5. `v = N`. Pity, `rng`, `scriptStep`, charges and banks are unchanged. Export and import run the same chain.

`summary`: "Capsule ladder: Gold and Platinum tiers; the Win Capsule bag keeps its old mix (index 4 → 6); unopened Aeons become Gold with +100 Dust."

## 4. Fixtures and tests

- A **separate named fixture** outside the `fixtures/v*.json` glob (the glob in `test/helpers.ts` keys fixtures by the version number, so `v5-capsule-ladder.json` would break it): `src/save/test/fixtures/capsule-ladder-pre.json`, a doc of version N−1 with:
  - a half-drawn, unsorted bag holding 4s, for example `[4, 0, 1, 3, 4, 2, 0, 1]`;
  - a pending Win capsule with `tier: 'aeon'`, `startTier: 'clay'`;
  - a pending road capsule with `tier: 'aeon'`, `startTier: 'aeon'`;
  - a pending scripted capsule 5 of kind `win` (`scriptIndex: 5`, `tier: 'aeon'`, `startTier: 'clay'`);
  - `trophies.roadClaimed` including 4000 and `pity.opened` 30.
- Checks after `up`: the bag is `[0, 0, 1, 1, 2, 3, 6, 6]` (4 → 6, sorted); `bagSize` 100; all three capsules are `gold` with `contents.dust` + 100 and the road one has `startTier: 'gold'`; both flags set; schema-valid.
- With WP7: one `tickTimers` grants exactly one new Aeon of kind `road` and deletes `capsule.legacySkillAeon`; a second call grants nothing.
- A normal frozen `src/save/test/fixtures/vN.json` (a realistic version-N doc, with `bagSize`), and `currentFixture()` in `test/helpers.ts` points at it. `v5.json` is never edited.
- A save round trip and an export/import code from version N−1 migrate the same way.
- An empty-bag save migrates to `bagSize: 0`; the next Win Capsule starts a 200 bag.
