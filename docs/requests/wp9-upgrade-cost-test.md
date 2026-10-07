# Request: update the A6.6 upgrade-cost test in `src/ui/screens/test/model.test.ts`

- **From:** economy lead (the years-long Amber curve, owner decision 2026-10-07; `docs/decisions.md`, DESIGN A6.6).
- **Why:** `src/content/rarities.ts` now has `upgradeAmber: [20, 50, 100, 200, 350, 800, 1700, 4800, 12000]`
  (was 550 / 800 / 1,200 / 1,700 for L7-L10). The test `cards (A6.6 upgrades, A5.1 level scaling) > upgrade costs
  follow the A6.6 table` still hard-codes the old Amber and fails. The UI reads the costs from content, so only the
  test changes.
- **Change** (lines 40, 42 and 43):

```ts
expect(upgradeCost(content, 'common', 9)).toEqual({ copies: 45, amber: 12000 });
expect(upgradeCost(content, 'epic', 6)).toEqual({ copies: 5, amber: 800 });
expect(upgradeCost(content, 'legendary', 9)).toEqual({ copies: 2, amber: 12000 });
```

- **Also worth a look (no change required):** Amber labels for L9-L10 now reach 4,800 and 12,000, so any upgrade
  button or cost chip should be checked at phone width (844x390) for five-digit Amber.
