# WP9 → WP11: mounting the meta screens (Phase 2 wiring)

**From:** WP9 (meta UI screens). **To:** WP11 (app integration). **Status:** open (Phase 2).

WP9's screens are built and tested against fixtures (`?dev=1#screens`). They never import meta, save
or visuals (DESIGN B2); the app injects everything through one object.

## Mount

```tsx
import { ScreenHost, createRouter, type UiServices } from '@/ui/screens';
import { i18n } from '@/i18n';

const router = createRouter({ id: 'home' });           // or { id: 'boot' } with a boot slot
const env = {
  save,                     // Signal<SaveDoc>: the app's save signal (B9); screens re-render on writes
  content,                  // the typed Content from '@/content'
  t: (k, p) => i18n.t(k, p),
  locale: 'en',
  now: () => Date.now(),    // countdowns (charges, Daily Capsule)
  router,
  services,                 // UiServices, below
  portrait: art.portrait.bind(art),   // ArtProvider.portrait (B5); null draws role-glyph fallbacks
};
render(
  <ScreenHost
    env={env}
    slots={{
      battle: (r) => <BattleScreen request={r.request} opponent={r.opponent} />,   // WP11 + WP5 HUD
      capsule: (r) => <CapsuleScreen ... />,                                       // WP10
      replay: (r) => <ReplayViewer index={r.index} />,                             // WP11
      boot: () => <Boot />,
    }}
  />,
  host,
);
```

The host covers its parent (`position: absolute; inset: 0`) and draws the portrait rotate overlay.
Pixi's canvas stays underneath; screens are opaque except Pause (an overlay over the battle).

## Flow

- **Home → Mode select → VS → battle.** The UI calls `services.prepareMatch(req)` (→
  `meta.pickOpponent`), shows VS for 2 s (skippable), then `services.beginBattle(req, opponent)`: the
  app starts the session and routes `router.reset({ id: 'home' }); router.go({ id: 'battle', ... })` (or
  `replace`).
- **Pause.** When the HUD pause button or the visibility pause fires, pause the session and push
  `router.go({ id: 'pause', info })` (opens as an overlay; `info` is a `PauseInfo` snapshot from the
  HUD model: mode, scouted cards, clock, `canRetreat`, `retreatAfterMs` from the format, null for the
  Tutorial format). The UI pops the overlay itself and then calls `services.resume()`,
  `services.retreat()` or `services.quitSkirmish()`. Settings opens as a second overlay.
- **Result.** After `meta.applyMatchResult`, route `router.reset({ id: 'home' }); router.go({ id:
  'result', info: { input, rewards, replayIndex, request } })`. `request` is what "Next battle" starts
  (the same request, or match 2's `{ mode: 'tutorial', match: 2 }` after match 1). "Open capsule" calls
  `services.openCapsule(id)`; route to `{ id: 'capsule', ids }` from there.
- **Onboarding.** `MatchRequest` now has `{ mode: 'tutorial'; match: 1 | 2 }`
  (docs/requests/wp11-router-tutorial-route.md, done). The Home Battle button always opens Mode select;
  War Plan and Skirmish show as locked until `matchesPlayed >= 3`, Conquest until Arena 3.

## `UiServices` (src/ui/screens/services.ts)

Queries (pure, called during render): `previewOpponent` (Home preview; return a cached spec so it is
the one `prepareMatch` will give), `dailyModifier`, `validatePlan` (→ `meta.validatePlan`), `autoFill`
(→ `meta.autoFill`, not saved until `setWarPlan`), `matchHistory` (→ `saveStore.loadReplays()`, newest
first; the index is passed back to `watchReplay`).

Actions: `openCapsule`, `openAllCapsules`, `openWardrobe`, `claimDailyCapsule`, `upgrade`, `craft`
(card id or skin id), `setWarPlan(index, plan)` (the UI only passes an index up to the current number of
presets, as `meta.setWarPlan` requires), `setActivePlan`, `markSeen(card)` (→ `meta.markSeen`, called
when the card detail of a NEW card opens), `equipSkin(target, skin | null)`, `claimRoadNode`,
`claimQuest(slot | 'weekly')`, `rerollQuest`, `setProfile`, `updateSettings`, `exportCode`,
`downloadSave`, `importCode`, `resetSave`, `exportEventLog`. Each updates the save signal and persists
(B8: immediately after upgrades). Results with `ok: false` show a toast: `reason: 'amber'` shows "Not
enough Amber", `reason: 'dust'` "Not enough Dust", anything else a generic line.

The quest claim, reroll and Daily Capsule claim are not in the frozen `Meta` contract, but WP7's
`MetaRules` (`@/meta`) has them: `claimQuest`, `rerollQuest`, `claimDailyCapsule`, plus `setWarPlan`,
`setActivePlan`, `equipSkin`, `markSeen` and `dailyModifier`. `src/ui/screens/test/realMeta.test.tsx`
shows the query side (`previewOpponent`, `dailyModifier`, `validatePlan`, `autoFill`, `prepareMatch`)
answered by `createMeta(content)`.

Before VS, the screens check the active War Plan against the request's format with
`validatePlan` and refuse to call `prepareMatch` while it has `error` findings (A3 minimum to play), so
`beginBattle` never receives an unplayable plan from the meta screens.

`fixtures/services.ts` (`createPreviewServices`) is a working reference implementation over a local
save signal, used by the dev page and tests.
