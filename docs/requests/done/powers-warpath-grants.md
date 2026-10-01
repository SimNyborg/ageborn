# Request to the War Path owner: pay the War Path power grants on first clears

From: the power rework fixer, 2026-09-30. Follows `docs/requests/powers-sources.md` section 4, which is still open: after the save migration, a live first clear of a War Path level 5, 7 or 9 grants no power, and the first clear of Stone L5 does not open the Field power slot (DESIGN A2.9.1, A2.9.8). Today only the v7 migration and 150 trophies (`src/meta/trophies.ts`) set `flags['power.field']`.

`src/meta/warPath.ts` belongs to the War Path work, so this change is requested rather than made. The logic is ready and tested in `src/meta/powers.ts`:

- `warPathPowerOf(t, region, level)`: the power with `source: 'warPath'`, that region's age and that `warPathLevel` (the content already carries all 24), or null.
- `grantWarPathPower(s, t, region, level)`: adds the power to `powersOwned`, or pays `POWER_OWNED_AMBER` (60) when the save already owns it; on `wp.stone.l05` it also sets `flags['power.field']`. It returns `{ save, steps }`; the power reads as a `card` step with `copies: 0` (`RewardStep` has no `power` kind; a contract change can add one later).
- Tests: `src/meta/test/powers.test.ts`.

## The edit

In `applyWarPathResult` (`src/meta/warPath.ts`), inside `if (win && had === 0) { ... }`, after the `r.card` grant and before the capsule:

```ts
    // A2.9.8: the level's War Path power (60 Amber if owned); Stone L5 opens the Field slot (A2.9.1).
    const pw = grantWarPathPower(save, t, level.region, level.index);
    save = pw.save;
    steps.push(...pw.steps);
```

with `import { grantWarPathPower } from './powers';` at the top.

## Also

- The node and the Level preview should show the power reward before the fight (A18.7.8), the way they show card rewards: icon, name, "New power", or "Owned: 60 Amber" when owned. `warPathPowerOf` gives the id for a level.
- The MR-40 unlock ceremony ("A second power: Field!") plays once when the flag turns on; it belongs to P2 with the HUD dock (`FIELD_SLOT_IN_BATTLE`).
- Until this lands, `botMayUsePower` lets a ladder bot use a War Path power only when the player has cleared its level **and** owns it, so bots never field a power the player cannot hold.
- A test in `src/meta/test/warPath.test.ts`: a first win on `wp.stone.l05` grants `sticky_tar` and sets `flags['power.field']`; a first win on a level whose power is owned pays 60 Amber; a replay of a cleared level grants nothing.

**Done (MVP fixer, 2026-10-01):** the edit is in `applyWarPath` (`src/meta/warPath.ts`), with the test in `src/meta/test/warPath.test.ts`. The Field slot is live in battle (`FIELD_SLOT_IN_BATTLE = true`).
