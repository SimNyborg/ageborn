# Request to the HUD, render, app, War Plan, tutorial, meta, visuals and audio owners: P1 compatibility for the power contract bump

From: the lead designer, 2026-09-29. Owner request: powers cost gold and reload, there are many more of them, and some land only in your own half (DESIGN A2.9, build plan A2.9.13; decision record in `docs/decisions.md`, "Owner request 2026-09-29: powers cost gold, reload, more powers, own-half limits" and "Power rework: review fixes").

Build phase P1 makes one WP0 contract bump (`SIM_VERSION` 4.0.0): `Loadout.power` becomes `powers: { home, field }`, `Observation.me.power` / `me.powerPpm` / `foe.powerPpm` become `me.powers` / `foe.powers`, `CompiledTicks.powerCharge` goes away, the `power` command gains `slot`, and `powerTelegraph` gains `slot`, `cost`, `targetId` and `telegraphMs`. `main` must stay playable, so P1 ships with the small adapters below and **one button** (the Home slot) until P2 builds the dock.

**Timing.** P1 starts only after build phase P0 passes and after the UI rebuild's in-flight edits to the battle HUD and the War Plan (`src/ui/hud/**`, `src/ui/screens/model/plan.ts`, `src/ui/screens/warplan/**`) are committed. Please keep these adapters in mind in the rebuild; they are small and read one field.

## 1. Match config (WP7, `src/app/matchSetup.ts`, `src/meta`)

- Build `powers: { home, field }` for every loadout.
- **Until P2, send `field: null` for both sides in every match** (the HUD has no Field button yet; the match rule keeps both sides equal). P2 switches this to the Field slot flag, with both slots in the Daily.
- `src/meta/{tables,warplan,advisor,feats,matchmaking}.ts`: read `powers.home` / `powers.field`; starters by `source: 'starter'` plus `slot`, never `slot === 'default'`.
- `src/app/fallbackBot.ts` and `src/app/capsules/CapsuleHost.tsx`: read `powers`.

## 2. Battle HUD and render (WP5)

- `src/render/hudModel.ts`: until P2, map the Home slot onto today's single-button fields (`me.power` = `powers.home.card`, `me.powerPpm` = its ppm; the enemy ring = the enemy's Home slot), plus the effective cost so the button can show it.
- `src/ui/hud/{PowerButton,Hud,TopBar,model}.tsx`: unchanged behaviour, reading the adapter; Space sends `{ t: 'power', slot: 'home' }`; map the new reject codes (`powerReloading`, `powerNoTarget`, `noGold`) to the existing deny line.
- `src/render/eventMapper.ts` and `src/render/battleView.ts`: read `powers.home` for the ghost; take the telegraph length from the event's `telegraphMs`.

## 3. War Plan (WP9, UI rebuild)

- `src/ui/screens/model/plan.ts` and `src/ui/screens/warplan/WarPlanScreen.tsx`: until P2, the one power slot edits `powers.home` and lists Home powers only. P2 adds the Field slot (`docs/requests/powers-hud-army.md`).
- `src/ui/screens/fixtures/*`: build `powers`; starters by `source`.

## 4. Tutorial (WP11)

- `src/tutorial/scripts.ts`: `setPowerPpm` becomes `{ slot: 'home', ppm: 1,000,000 }`; the starter by `source`; the match 1 beat keeps the Medieval Arrow Storm (a Home power).
- `src/tutorial/{director,autopilot,hints}.ts`: read `me.powers.home`.

## 5. Visuals (WP4) and audio (WP6)

- `src/visuals/manifest.ts`: placeholder entries, built from the family recipes, for the 8 new starters: `power.rockslide`, `power.chariot_rush`, `power.knights_charge`, `power.volley_fire`, `power.gun_line`, `power.strafing_run`, `power.drone_swarm`, `power.comet_run`, and `fx.rockslide`, `fx.chariot_rush`, `fx.knights_charge`, `fx.volley_fire`, `fx.gun_line`, `fx.strafing_run`, `fx.drone_swarm`, `fx.comet_run`. P3 polishes them. Without them `tests/integrity/ids.test.ts` fails.
- `src/audio/sounds.ts`: template entries `pw_rockslide`, `pw_chariots`, `pw_knights`, `pw_volley`, `pw_gunline`, `pw_strafe`, `pw_drones`, `pw_comet`.

## 6. Dev pages and tools

- `src/dev/{botViewer,feel,sandbox,walls}/**`: read `powers`; starters by `source`.
- `tools/lib/plans.ts`: the baseline loadout takes both starters (`source: 'starter'`, one per slot).

## 7. Checks

- `npm run typecheck`, `npm run lint`, `npm test` green; the ids integrity test passes.
- A Playwright smoke at 844 × 390 and 1280 × 720: a Stone match plays Rockslide from the one button, the enemy ring fills, a cast pays its gold, a denied press says why.
