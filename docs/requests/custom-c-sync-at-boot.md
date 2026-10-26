# Track C → app owner (or the round-3 final): grant earned collection items when the game loads (round 3b, 2026-10-25)

Status: **done** (2026-10-26, orchestrator, ships with R3b): `boot()` runs `syncCosmetics` right after `tickTimers`,
duck-typed like the controller's other `MetaRules` calls, and writes the save only when something was granted. Test:
`src/app/test/boot.test.ts` ("grants collection items earned before their release when the game loads"), which fails on
the old boot (a save with the 2,600, 3,900 and 4,800 nodes claimed gets the three skins, owned and NEW; a second load
writes nothing).

## What is wrong

`meta.syncEarnedCosmetics` grants the collection items a save has earned by its state (a claimed Trophy Road
node, a feat, a War Path boss, a title, a Flag Atlas region). It runs after a match result and after a road claim
(`src/meta/index.ts`: `applyMatchResult`, `claimRoadNode`), but never when the game loads.

Release R3b ships road items at nodes that many players have already claimed: Galleon Bastion (2,600), Solar
Sail Ark (3,900), Wyrm-Coil Keep (4,800), and later Siege of the Bronze City (2,300) and Zeppelin Docks (3,300).
A player past those nodes opens Customize after the update and sees these skins **locked**, with the chip
"Trophy Road 2,600", although they claimed that node long ago. The items arrive only after their next battle, and
only then get the NEW pip and the tab dot. PLAN 2e says "`syncEarnedCosmetics` grants on `roadClaimed`, so no
road table edit is needed". That holds only if something runs the sync once the items are released.

## The fix (`src/app/boot.ts`, `boot()`, step 1, right after `tickTimers`)

```ts
    const ticked = services.meta.tickTimers(save, services.clock);
    if (ticked !== save) void services.saveStore.save((save = ticked));
    // Items earned before they were released (a road node claimed before its skin shipped) land now, NEW.
    const synced = services.meta.syncCosmetics(save, services.content);
    if (synced !== save) void services.saveStore.save((save = synced));
```

`syncEarnedCosmetics` returns the same save object when it grants nothing, so the save is written only when
something new arrives. The granted items join `cosmetics.fresh` (`withFresh`), so they get Customize's NEW pip
and tab dot, and the Bases tab opens on the newest item's age (`freshAge`). This needs no contract or save change:
`MetaRules.syncCosmetics` already exists.

## Check

1. Make a save that claimed the 2,600, 3,900 and 4,800 road nodes but does not own `baseSkin.galleon_bastion`,
   `baseSkin.solar_sail_ark` or `baseSkin.wyrm_coil_keep`. The tester profile made before the R3b release is one.
2. Load the game.
3. The Customize tab shows the Bases dot. Bases opens on the newest item's age, and the three skins are owned with NEW.
4. A unit test in `src/app/test/boot*.test.ts` can hold this with a fake store.
