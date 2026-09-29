# Request to the War Path and Trophy Road owners: sources for the 24 War Path powers

From: the lead designer, 2026-09-29. Owner request: powers cost gold and reload, there are many more of them, and some land only in your own half (DESIGN A2.9, roster A5.7; decision record in `docs/decisions.md`, "Owner request 2026-09-29: powers cost gold, reload, more powers, own-half limits").

The rework adds 32 powers: 8 new starters (owned from the first launch, no source needed) and 24 **War Path powers**, three per region, granted on the first clears of levels 5, 7 and 9, with a Trophy Road fallback for players who mostly play the ladder. **Powers never go into capsules**: no change to `src/content/capsules.ts`, `src/meta/capsules/*`, `tools/economy.ts` or `tools/drops.ts`.

Apply this in build phase P4 (DESIGN A2.9.13), together with the P4 content that adds the 24 War Path powers to `content.powers` (P1 adds only the 8 new starters); before that the ids do not exist and the integrity tests fail. Sections 6 (the 150-trophy flag), 7 (the bot filter and the match rule) and 8 (the save migration) are needed earlier, in P1 and P2, as noted there.

## 1. The reward table

| Region | L5 (Rare, Home) | L7 (Epic) | L9 (Epic) |
|---|---|---|---|
| stone | `sticky_tar` | `hunt_cry` | `hunters_spear` |
| bronze | `zeus_bolts` | `apollo_arrow` | `medusa_gaze` |
| medieval | `caltrops` | `undermine` | `boiling_oil` |
| gunpowder | `boarding_nets` | `horse_artillery` | `sharpshooter` |
| industrial | `barbed_wire` | `railway_gun` | `field_hospital` |
| modern | `aa_screen` | `tank_rush` | `sniper_team` |
| future | `point_defense` | `emp_blackout` | `stasis_field` |
| cosmic | `singularity` | `ion_cannon` | `solar_flare` |

## 2. `src/content/types.ts` (WP1)

- `WarPathReward` gains `power: CardId | null` ("an Age Power granted on first clear; an owned power pays `powerOwnedAmber` instead").
- `WarPathTables` gains `powerOwnedAmber: number` (60).

## 3. `src/content/raw/warPath.ts`

- `RegionRow` gains `powers: readonly [CardId, CardId, CardId]` (the L5, L7 and L9 rewards), filled per region from the table in 1.
- In `buildLevels`, `reward` gains `power: index === 5 ? r.powers[0] : index === 7 ? r.powers[1] : index === 9 ? r.powers[2] : null`.
- `warPath` gains `powerOwnedAmber: 60`.
- Nothing else changes (Amber, capsules and card rewards stay as they are).

## 4. `src/meta/warPath.ts`

- In the first-clear block of the result function (next to the `r.card` grant): if `r.power` is set and exists in `t.powers`, add it to `save.powersOwned` and push a reward step `{ kind: 'power', card }`; if the save already owns it, add `t.warPath.powerOwnedAmber` Amber instead and push the Amber step.
- On the first clear of `wp.stone.l05`, set the Field power slot flag `flags['power.field'] = true` (the same flag the Trophy Road sets at 150 trophies, section 6) and push an unlock step (`unlock.powerField`, the MR-40 ceremony).
- The node and Level preview show the power reward (icon, name, "New power"; "Owned: 60 Amber" when owned), as they show card rewards (A18.7.8: every reward is shown before the fight).

## 5. `src/content/trophyRoad.ts`

Add one extra `power(...)` item to each of these nodes (the existing items stay; "no reward is lost"):

| Node | Power | Node | Power | Node | Power |
|---|---|---|---|---|---|
| 550 | `sticky_tar` | 1,100 | `boarding_nets` | 1,650 | `point_defense` |
| 600 | `hunt_cry` | 1,150 | `horse_artillery` | 1,700 | `emp_blackout` |
| 650 | `hunters_spear` | 1,200 | `sharpshooter` | 1,750 | `stasis_field` |
| 700 | `zeus_bolts` | 1,250 | `barbed_wire` | 1,800 | `singularity` |
| 750 | `apollo_arrow` | 1,350 | `railway_gun` | 1,850 | `ion_cannon` |
| 850 | `medusa_gaze` | 1,400 | `field_hospital` | 1,950 | `solar_flare` |
| 900 | `caltrops` | 1,450 | `aa_screen` | | |
| 950 | `undermine` | 1,550 | `tank_rush` | | |
| 1,050 | `boiling_oil` | 1,600 | `sniper_team` | | |

Gates (800, 1,300, 1,900), Wardrobe nodes (1,000, 2,000) and the Jade node 1,500 get none.

## 6. `src/meta/trophies.ts`

- `payRoad` case `'power'`: when the power is already owned, pay 60 Amber (`t.warPath.powerOwnedAmber`) instead of nothing, and show "Owned: 60 Amber" on the node (`road.ownedAmber`).
- Reaching 150 trophies (the Gate 2 node) also sets `flags['power.field'] = true` if it is not set yet (needed from P2, when the Field slot turns on).

## 7. Bots and the match config (the opponent builder and match setup in `src/meta`, WP7)

- Bot War Plans may only use powers a player at that point could own **by either source**: starters; Road powers (the 8 alternates and the 24 fallback items) whose node is ≤ the player's best trophies + 100; War Path powers whose granting level the player has first-cleared. A power a General's plan lists but may not use is replaced by the age's starter of the same slot. War Path level bots may use their own region's War Path powers.
- **The sim knows no unlock.** While the player's Field slot is locked, meta sends `field: null` in the player's `SideConfig` and in every bot's (DESIGN A2.9.1, the match rule). In P1 (before the HUD has a Field button) meta sends `field: null` for both sides in every match; P2 switches to the flag.
- **Daily Challenge:** always both slots. A player whose Field slot is still locked gets each age's Field starter in that slot for Daily matches only, so everyone plays the same match (A9.1).

## 8. Save migration (WP8, its own next version, **in P1** with the contract bump)

The power save migration (DESIGN A2.9.8):

- moves each loadout's `power` into the slot its card belongs to and fills the other slot with the age's starter;
- sets `flags['power.field']` for every save with `matchesPlayed` ≥ 1, or that cleared `wp.stone.l05`, or has best trophies ≥ 150 (eight built powers move to the Field slot, so a player who has played keeps the power they know);
- grants the 8 new starters and every War Path power whose level the save has already first-cleared;
- grants the new power item of every **already claimed** Trophy Road node ≥ 550 directly: `trophies.roadClaimed` stores whole node values, so a claimed node would never offer its new item through the claim flow. Idempotent; a power granted by both sources pays 60 Amber once for the second grant.

Fixtures: fresh; default power equipped; a Road alternate equipped; "Stampede equipped, 50 trophies"; War Path Stone L7 cleared; "road claimed to 1,000"; 160 trophies. Re-read `src/save/migrations` right before editing and add the next version after the newest.

## 9. Tests

- Every `reward.power` id exists in `content.powers`, has `source: 'warPath'` and the region's age; each region grants three distinct powers; no power is both a starter and a reward.
- Every road `power` item from 550 up exists and is one of the 24 War Path powers, each exactly once.
- Granting a power twice (War Path, then road, or the other way round) pays 60 Amber the second time and never duplicates `powersOwned`.
- The Field slot flag is set by the first of the two sources.
- The migration grants the items of already claimed nodes ≥ 550 exactly once and is idempotent.
- Bot plans never hold a power the player could not own by either source; while the Field slot is locked every bot's Field slot is empty, except in the Daily.
