# WP7 → WP11: wiring the meta rules (Phase 2)

**From:** WP7 (meta rules, `src/meta`). **To:** WP11 (app integration; WP9 for the screens' services). **Status:** open (Phase 2).

The meta rules are built and tested (`npx vitest run src/meta`, `?dev=1#meta`). Everything below is
a suggestion for `src/app/**`; nothing in `src/meta` needs to change for it.

## 1. Loader and clock

```ts
// src/app/services.ts, LOADERS.meta
real: async () => (await import('@/meta')).meta,
```

`meta` is a `MetaRules` (the frozen `Meta` contract plus helpers, below), bound to the game content.
`openCapsule`, `openWardrobe` and `tickTimers` take no content in the contract, so they use the bound
content; pass the same `content` to the other methods.

Daily timers reset at **local** 04:00 (A6.3). Meta is pure (no `Date`), so the clock tells it the
time zone. Please give meta this clock (a plain `Clock` also works, but then days are UTC days):

```ts
import type { LocalClock } from '@/meta';
export const systemClock: LocalClock = {
  now: () => Date.now(),
  offsetMs: (t) => -new Date(t).getTimezoneOffset() * 60_000,
};
```

## 2. When to call what

| Moment | Call |
|---|---|
| First launch (no save) | `meta.newSave(content, clock, seed)` with any 32-bit seed (for example from `crypto.getRandomValues`); persist at once |
| Boot, Home shown, every minute on Home, before `pickOpponent` | `meta.tickTimers(save, clock)` (charges, Daily Capsule bank, quest and weekly resets, Daily Challenge day) |
| Mode select / VS | `meta.pickOpponent(save, mode, content, clock, { format, conquestGeneral, skirmish })`; it is deterministic in the save, so the Home preview equals the match |
| Match end | `meta.applyMatchResult(save, input, content, clock)` → `{ save, rewards }`; stage `rewards` on the Result screen; save immediately (capsules are rolled here, B8) |
| Capsule show | `meta.openCapsule(save, id)` → `{ save, reveal }`; save **before** playing `reveal` (B8), then `tickTimers` (the first Daily Capsule timer starts after capsule 2) |
| Capsule 1 summary (A8 "auto-equipped") and every "Equip now" | `meta.equipNow(save, card, content)` |
| Crate show | `meta.openWardrobe(save, id)` → `{ save, reveal }` |
| Upgrade / craft / road / plans | `meta.upgrade`, `meta.craft`, `meta.claimRoadNode`, `meta.validatePlan`, `meta.autoFill`, `meta.setWarPlan`, `meta.setActivePlan`, `meta.equipSkin` (all `Result<SaveDoc>` where they can fail; `reason` codes below) |
| Daily Capsule tray button | `meta.claimDailyCapsule(save, content, clock)` |
| Quests | `meta.claimQuest(save, slot | 'weekly', content, clock, { age })`, `meta.rerollQuest(save, slot, content)` |
| Collection NEW badge seen | `meta.markSeen(save, card)` |
| Conquest board | `meta.conquestBoard(save, content)` |
| Daily Challenge modifier | `meta.dailyModifier(content, clock)` |

Failure reasons (for toasts; WP9 already maps `amber`): `upgrade`: `unknownCard`, `notOwned`,
`maxLevel`, `copies`, `amber`. `craft`: `notCraftable`, `owned`, `maxLevel`, `dust`.
`claimRoadNode`: `unknownNode`, `locked`, `claimed`. `claimQuest`: `noQuest`, `claimed`, `notDone`.
`rerollQuest`: `noQuest`, `rerollUsed`, `done`, `noOtherQuest`. `claimDailyCapsule`: `noDailyCapsule`.
`setWarPlan` / `setActivePlan`: `badIndex`. `equipSkin`: `wrongTarget`, `notOwned`.

## 3. Onboarding (A8)

- Match 1 and match 2 results go through `applyMatchResult` with `mode: 'tutorial'`: each grants the
  next scripted capsule (win or lose, no charge, no trophies, no MMR) plus the ladder Amber for the
  result. `pickOpponent(save, 'tutorial', …)` gives Old Grogg for `matchesPlayed === 0` and Pip at tier
  0 on Short War after that, if you want meta's specs instead of `matchSetup.ts`'s.
- The first five counted capsules of a save follow the A6.5 script whatever their kind; capsule 1
  always holds a Bonker stack, so the forced "Bonker to L2" upgrade after capsule 2 is affordable
  (`meta.upgrade(save, 'bonker', content)`).
- The first ladder match is Captain Kettle (A8 match 3); meta remembers it in
  `flags['meta.ladderPlayed']`.

## 4. Opponents

- **Bot profile for a procedural AI Commander.** Its `generalId` is
  `commander:<personality General>:<favourite card>`. Build the bot with WP3's
  `botProfile(content, { generalId, tier, personalityOf, favoriteCard, mistakeBonusBp })`, using
  `commanderInfo(opponent.generalId)` from `@/meta` for `personalityOf` and `favoriteCard`
  (`matchSetup.ts` `botProfileFor` currently falls back to Balanced weights for these ids).
- **New-player mistake bonus** (A6.8): `newPlayerMistakeBonusBp(save, content)`.
- **Names.** For named Generals `displayName` and `side.label` are the string key
  (`general.<id>.name`, WP9's convention); Commanders carry their literal "AI · Name". The HUD label
  should go through `i18n.t` when it is a key.
- **Standard levels** (Skirmish toggle, A6.8): meta puts every bot card at L7; please set the player's
  `SideConfig.levels` to 7 for every card too when `skirmish.standardLevels` is on.
- **Age Capsule dialog** (A6.4 "age picked in a dialog when granted"): `claimQuest` takes `{ age }`.
  Match results that grant one (Daily Challenge first win, Conquest star 3) happen inside
  `applyMatchResult` and use the default age (the drop-pool age with the most cards not owned yet).

## 5. Persisting

Every function returns a new save and never mutates its input. Save immediately (`{ immediate: true }`)
after `applyMatchResult`, `grantCapsule`, `openCapsule`, `openWardrobe`, `claimRoadNode`,
`claimQuest`, `claimDailyCapsule` and `upgrade` (B8: capsule rolls and upgrades flush at once).
