# Request to the HUD, Army and render owners: two power slots, reach bands and the target cap

From: the lead designer, 2026-09-29. Owner request: powers cost gold and reload, there are many more of them, and some land only in your own half (DESIGN A2.9, especially A2.9.10; roster A5.7; decision record in `docs/decisions.md`, "Owner request 2026-09-29: powers cost gold, reload, more powers, own-half limits").

Apply in build phase P2, after the P1 contract bump (`SIM_VERSION` 4.0.0) has landed `HudModel.me.powers` / `foe.powers`, the `slot` on the `power` command and `src/core/powerReach.ts`. Until then the HUD keeps the single button, fed by the P1 adapter that maps the Home slot onto it (`docs/requests/powers-p1-compat.md`). P2 ends by turning the Field slot on in the match config. The UI rebuild in flight (ui-plan 4.2, 4.7) should keep room for this: the reserved Fort space in the tray is what the second button uses until forts ship.

## 1. Battle HUD (`src/ui/hud`: `PowerButton.tsx`, `powerAim.ts`, `Tray.tsx`, `TopBar.tsx`, `model.ts`, `bridge.ts`)

- **Dock:** two round buttons, Home (left, shield frame) and Field (right, banner frame). Phones 64 px each with a 6 px gap; desktop 96 px. Keep ≥ 16 px slack everywhere. Tray width at 844 × 390: 100 + 8 + 402 + 6 + 56 + 8 + 134 = 714 ≤ 750 (the reserved Fort 62 + 6 goes to the dock); below 820 px: 92 + 6 + 361 + 6 + 56 + 6 + 117 = 644 ≤ 686. When forts ship, at 844: cards 58 × 78 with 4 px gaps (368), Fort 58, stance 56, two 58 px buttons + 6: 100 + 8 + 368 + 6 + 58 + 6 + 56 + 6 + 122 = 730; below 820 px: cards 52 × 70 with 4 px gaps (332), Fort 52, stance 48, two 52 px buttons + 5: 92 + 6 + 332 + 6 + 52 + 6 + 48 + 6 + 109 = 657 ≤ 686. **Last Stand** floats above the **Home** button while armed.
- **Anatomy per button:** icon; 5 px reload arc (linear); seconds left in the centre while reloading (12 px bold tabular, icon at 40%; from `secondsLeft`, the sim's own formula); cost chip top-left (coin + the effective cost, the unit card grammar), red with a thin gold underline filling toward the cost while unaffordable; reach glyph 18 px bottom-right: house (Home), flag (Front and charges), crosshair (strike), banner (Army buffs), parachute (drops).
- **States:** reloading; reloaded but gold short (ring closed and dim, no sweep, no chime); castable (MR-69 sweep, lift 4 px, glow, grab arrow; breathes only if it holds the one pulse: tutorial, Evolve, the first castable slot with Home before Field, then a mount; `power_ready` plays when a slot first becomes castable after its last cast); a lockout (the lever, `lockoutUntil`) dims the icon with a thin lock arc; a locked Field slot (`slotLocked`) is not drawn (an empty gap, so nothing jumps when it arrives, with an MR-25 pop the first time).
- **Deny reasons** (MR-03, map the sim codes through `simDenyReason`): `powerReloading` "Ready in {s} s", `noGold` "Need {n} gold", `powerNoTarget` "No target there" (also for Space or X with nothing to hit: denied before payment), `powerOutOfReach` "Get closer to their turrets", `powerLockout` "Wait {s} s", `noPower`.
- **Keys:** Space = Home, X = Field (auto-aim, `{ t: 'power', slot }` without `p`); Enter on a focused button. Key badges on desktop only; add `hud.key.x`.
- **Tip** (long-press 450 ms or hover): name, family, reach, cost, reload, "Hits up to N", the per-unit line.
- **`powerAim.ts`:** the state machine gains the slot; the aim target is clamped with `reachBand` from `src/core/powerReach.ts` (the same helper the sim uses). Past the band the ghost sticks to the edge for up to 120 lu of overshoot (valid; a 1.04 → 1 bump, 80 ms `back`, and a tick haptic on first contact); beyond that the aim is invalid and a release returns the power (220 ms, `ui_toggle`) with nothing sent. Drop-anywhere powers (charges, drops, buffs, Suppress) keep the built behaviour.
- **Top band (enemy block):** two 22 px mini-rings inside the enemy block, between the age icon and the bars (bars 140 → 112), replacing the single ring's own slot; with the A18.5.7 research icon the band is 734 of 750 at 844 px and 654 of 686 below 820 px (emote in Pause, Scouted as a 44 icon). Each ring: reload arc, "?" until that power is scouted then its icon, a steady orange rim when reloaded (never a pulse), a 200 ms drain on their cast; long-press shows name, cost, reach, seconds left.

## 2. Render overlays (`src/render`, through the manifest ids of DESIGN A2.9.10)

- **Band** (`fx.reach_band`): on pick-up (150 ms `out`) the legal area is washed in team colour at 18% with a 2 px edge line, three chevrons and a label plate ("Your half" / "Near your army"); the rest of the lane dims 15%; a Front band's edge follows the own front live; the minimap shows the same tint.
- **Targets** (`fx.target_pip`): the eligible enemies (`eligibleTargets` from `core`: the first N nearest your gate in the reach area, wherever the zone is) carry number pips 1..N from your side; those the zone covers get the built highlight ring; other enemies in the zone a faint "not hit" outline; the token reads "Hits 4 of 5 · −100" (covered of eligible). The pips are a prediction (units move). A blast radius is drawn clipped at the Home line. A strike's ghost is a crosshair with `fx.target_lock` on the eligible unit nearest the aim (`strikePick` from `core`), or "No target".
- **Invalid:** a red outline with diagonal hatching (never colour alone) and the label "Only in your half" / "Only near your army".
- **Telegraphs:** the strike lock ring (`fx.target_lock`) on its target and Suppress jam marks (`fx.turret_jammed`) on the enemy mounts during the telegraph; field zones persist as `fx.field_zone` for their duration; buffs shimmer on the 8 affected units only. The off-screen "power incoming" badge counts down the power's own `telegraphMs` (0.5-2.0 s).
- **Feel by family** (A12; inside the 150 ms per 3 s freeze budget): Home bombard and sweep 120 ms global hitstop, trauma +0.5, a 30% one-frame flash (20% with reduce motion), 6 dB duck; charge and front barrage 60 ms, +0.3, 3 dB; strike victim-local 70 ms, +0.15; field and Flak +0.1, stuns freeze their targets locally; buffs a shimmer; drops a landing thud; Suppress sparks and a jammed icon.
- **MR-70b (new):** on a committed cast the ghost contracts to 0.9 (80, `anticipate`); the gold counter floats "−100" and counts down; the ring drains with a bright tail (200, `out`); the icon dips to 0.94 and back (70 / 140, `back`); `power_cast` plays instead of `ui_confirm`.
- **Reduce motion:** no shake, flashes ≤ 20%, the band fades in without chevron motion, no snap bump; rings still fill.

## 3. Army screen (`src/ui/screens/warplan/**`, ui-plan 4.2)

- Each age shows a **Home** and a **Field** power slot (house and flag watermarks). The Field slot shows a padlock and "War Path Stone 5 or 150 trophies" until `flags['power.field']` is set.
- Default layout at 844 × 340: a 5 × 2 slot grid (row 1: four troops and Home; row 2: two troops, two turrets and Field), the Fort keeping the side column, the card grid at 5 columns. The ui-plan owner may choose another layout inside the 4.2 budget as long as both power slots are visible at once and every target is ≥ 48 px.
- **Power tile** (sm 62 × 84): icon, name (2 lines), rarity frame, cost chip top-left, reach glyph top-right (where units show their class), "⟳ 40 s" at the bottom.
- A power only fits its own slot; a drop on the other slot bounces back with "Home powers go in the Home slot" (`army.powerSlot.wrong`). The two slots never swap with each other.
- **Filters:** the Power chip opens Home / Field chips.
- **Card detail for a power:** a small lane diagram (both gates, the mid line, the reach band tinted, the zone to scale), cost, reload, "Hits up to N", the per-unit line ("Kills Stone Infantry · dents Heavies"), ground/air icons, the source ("War Path · Bronze 7", "Trophy Road 200").
- **Advisor:** "Empty power slot"; the "cannot hit air" check counts powers; "No Home power in <age>".
- **Auto-fill** puts the age's two starters in (the Field one only once unlocked); "Equip now" on a new power fills its slot if empty, else offers a swap.

## 4. Tutorial and onboarding (`src/tutorial`, `src/app`, WP11)

- Match 1: the Arrow Storm beat stays; the script's `setPowerPpm` becomes `{ slot: 'home', ppm: 1,000,000 }` plus `grantGold: 100` at the same tick; retime `MATCH1_POWER_TICK` after the P1 sim lands.
- The autopilot and hints read `me.powers.home`.
- The Field slot unlock ceremony (MR-40, "A second power: Field!") plays once after the first clear of War Path Stone L5 or on reaching 150 trophies, with a NEW dot on Army.

## 5. Screenshots

Review with Playwright at 844 × 390 (and 844 × 340) and 1280 × 720: both buttons in every state (reloading, gold short, castable, locked), a Home drag with the band and pips, a Front drag with a live edge, an invalid drop, a strike lock, the enemy mini-rings, reduce-motion bursts, and the Army screen with both power slots, a locked Field slot and a power card detail.
