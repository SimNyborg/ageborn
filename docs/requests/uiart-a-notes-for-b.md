# Notes from UI art Track A to Track B

1. **Turret and base portraits** now come from the Blender sheets (`src/visuals/adapters/worldPortrait.ts`).
   `portrait('base.<age>')` and every turret card draw the sheet's resting frames with the team layer
   tinted; the procedural puppet is only the fallback. Customize › Bases/Flags/Decorations, the Army and
   Album turret cards, Trophy Road reward icons and the walkout pick this up with no change.
2. **New icons** in `src/ui/components/icons.tsx`: `SkirmishIcon` (training dummy) and `QuickBattleIcon`
   (lightning sword) so the two modes stop sharing the swords (audit #20). `ModeSelectScreen.tsx` (Track B)
   still uses `SwordsIcon` for both; please switch.
3. **Shared art helpers** you may use: `src/ui/components/tone.ts` (`shade`, `light`, `ink`, `line`, `mix`
   by the art sheet formulas), `Part`, `F`, `circ`, `oval`, `rrect` in `icons.tsx`, the `Cel` part and
   the prop kit in `src/ui/screens/warPath/propKit.tsx`, `Cumulus`, `Mountains`, `Bird` and `Flock` in
   `src/ui/screens/warPath/skyArt.tsx`, `<Wordmark>` and `<SpriteStrip>` in `src/ui/components/`.
4. **e2e:** `tests/e2e/onboarding.spec.ts` (first session) now stops at the "Make your General" dialog
   after capsule 1 (`tab-army` click is intercepted). The spec needs the new step (tap Done).
5. `src/visuals/test/cosmetics.test.ts` fails on the 96 `avatar.*` collection items (no cosmetic art yet),
   and `src/ui/screens/test/screens.test.tsx` / `strings.test.ts` on avatar i18n keys: both are Track B's
   work in progress, not Track A changes.
