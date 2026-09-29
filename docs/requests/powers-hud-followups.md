# Request: follow-ups to the power dock and the Army power slots (P2)

From: the HUD and Army builder of the Age Power rework (WP5 and WP9 paths), 2026-09-29. Built: the two-button power dock, the reach band and pips, the enemy rings, the Army's Home and Field slots and the power card detail (DESIGN A2.9.10). These items belong to other packages.

## 1. Meta (WP7): turn the Field slot on in battle

The HUD now draws the Field button, the X key casts it, and the Army shows the Field slot (with a padlock until `flags['power.field']`). The last P2 step is meta's:

- `src/meta/rules.ts`: `FIELD_SLOT_IN_BATTLE = false` → `true`.

Then `applyPowerMatchRule` sends each side's Field power by the unlock flag (and always in the Daily). Do it together with the AI calibration (`src/ai/test/tierOrder` is still failing) and after the owner has heard the P0/P1 numbers: it changes every battle of every save that has played a match.

## 2. Meta (WP7): advisor lines for powers (A2.9.10 "Advisor")

`src/meta/advisor.ts` checks only that a power slot holds a legal power (`badPower`). Please add, as warnings (never blockers), with their `ui.advisor.*` strings:

- `emptyPowerSlot`: "Empty power slot" (a Home slot, or an open Field slot, left empty);
- `noHomePower`: "No Home power in {age}";
- the existing "nothing hits air" check should count powers that hit air (`barrage.hitsAir`, `sweep`/`field`/`strike` with `hitsAir`, clouds).

The Army already shows the first advisor line; nothing else is needed on the screen.

## 3. Audio (WP6): the power sounds of A2.9.10

- `power_cast`: a short rising whoosh with a coin clink, played on a committed cast (MR-70b). The dock plays `ui_confirm` meanwhile (`src/ui/hud/PowerButton.tsx`, the `fire` effect). Once it exists, swap the id there.
- `power_lock`: the strike lock ping (the telegraph's lock ring is drawn; no sound yet).
- `turret_jammed`: when a mount is silenced (the `turretSilenced` event now maps to a `jam` view action in `src/render/eventMapper.ts`; add the sound rule there or in `feel.config.json`).
- `power_ready` now plays from the HUD when a slot first becomes castable (reloaded and affordable), at most once per 3 s; the sim's `powerReady` no longer plays it (a reloaded power may still be short of gold). The `power.ready` feel rule is unused.

## 4. Visuals (WP4, P3): polish over the placeholders

The render draws readable placeholders; the art pass may replace them through the manifest:

- `fx.target_lock`: the strike lock ring (drawn in `ZoneOverlay.drawStrike` and `drawLockTelegraph`);
- `fx.turret_jammed`: the jam mark (drawn in `ZoneOverlay.drawJam`: a pulsing ring during the Suppress telegraph, a crossed disc with sparks while silenced);
- `fx.reach_band`, `fx.target_pip`: the band wash, edge line, chevrons, label plate and numbered pips (`ZoneOverlay.drawBand`, `drawPips`).

## 5. Tutorial and app (WP11)

- The MR-40 Field slot ceremony ("A second power: Field!") and the NEW dot on Army are not built. The Army reads the unlock from `flags['power.field']`.
- `src/app/ui/TutorialBubble.tsx` points at `hud-power`, which is still the Home button; the Field button is `hud-power-field`.
