# Contracts map

The contracts in `src/contracts` are the frozen interfaces between work packages (DESIGN B15). WP0 owns them. After Phase 0, changes go through the integration lead as a request in `docs/requests/` (DESIGN C1).

Rules:

- `contracts` imports nothing but itself (DESIGN B2). Every module is type-only at runtime; `index.ts` re-exports all of them with `export type *`.
- Pixi and signals types appear only as type-level `import('pixi.js')` / `import('@preact/signals')`.
- Import from `@/contracts` (the barrel) or from a single module, always with `import type`.
- Build decisions about the contracts are logged in `docs/decisions.md` under WP0.

## Modules

| Module | Main types | Implemented by | Consumed by | DESIGN |
|---|---|---|---|---|
| `ids.ts` | `Side`, `AgeId`, `Rarity`, `CardId`, `VisualId`, `SoundId`, `Tag`, `Role`, `RoleGroup`, `DmgType`, `Pt`, `Result<T>` | (primitives) | everyone | B15, A2, A14 |
| `content.ts` | `UnitDef`, `TurretDef`, `PowerDef`, `AttackDef`, `AbilityDef`, `AgeDef`, `FormatDef`, `EconomyRules`, `SkinDef`, `CompiledContent` | WP0 (`content/raw`), WP1 (`content/compile.ts`, schema, counters) | sim, ai, meta, ui, visuals, tools | A5, B4 |
| `commands.ts` | `Command`, `TimedCommand` | produced by ui/hud input (WP5, WP9), bots (WP3), tutorial (WP11) | sim (WP2) | A2.12, B3 |
| `events.ts` | `SimEvent`, `KillerKind`, `MatchOutcome` | WP2 (sim) | render event mapper (WP5), audio cues via render, `sim/stats.ts`, replay viewer (WP11) | B3, B6 |
| `sim.ts` | `MatchConfig`, `SideConfig`, `Loadout`, `SimState` and parts, `ReplayDoc`, `Sim`, `CreateSim`, `ReplayMatch` | WP2 (`src/sim`) | session (WP11), render (WP5), tools (WP12), save replays (WP8) | B3 |
| `observation.ts` | `Observation` | WP2 (`sim.observe`) | ai (WP3) through the delayed ring in the session | A7.1, B10 |
| `bot.ts` | `BotProfile`, `BotController`, `CreateBot` | WP3 (`src/ai`) | session (WP11), tools (WP12), dev bot viewer | A7, B10 |
| `art.ts` | `ArtProvider`, `UnitView`, `TurretView`, `BaseView`, `BackdropView`, `EffectView`, `VisualDef`, `UnitPose` | WP4 (`src/visuals`) | render (WP5), capsule (WP10), ui portraits via app injection | B5, A11 |
| `audio.ts` | `AudioService`, `Bus`, `MusicLayer` | WP6 (`src/audio`, `WebAudioService`) | render (WP5), capsule (WP10), app (WP11) | B7, A13 |
| `hud.ts` | `HudModel`, `HudCard`, `CardState` | WP5 (`render/hudModel.ts`) | ui/hud (WP5), session signal (WP11) | A9.2, B6 |
| `feel.ts` | `FeelConfig`, `FeelRule` | WP5 (`render/feel.config.json`, feel layer) | render event mapper, dev feel page | A12, B6 |
| `i18n.ts` | `I18n`, `Locale` | WP0 (`src/i18n/index.ts`) | ui, capsule, tutorial | B4 Strings |
| `save.ts` | `SaveDoc`, `SaveStore`, `Settings`, `PendingCapsule`, `PendingCrate`, `CapsuleReveal`, `WardrobeReveal`, `Migration` | WP8 (`src/save`) for the store and migrations; WP7 writes the doc contents | app (WP11), meta (WP7), ui (WP9), capsule (WP10) | B8, A6, A10 |
| `meta.ts` | `Meta`, `Clock`, `MatchStats`, `OpponentSpec`, `MatchResultInput`, `RewardStep`, `PlanIssue`, `SkirmishOptions` | WP7 (`src/meta`); `MatchStats` is produced by WP2 `sim/stats.ts` | app (WP11), ui (WP9), tools economy/drops (WP12) | B9, A6, A7.1 |
| `session.ts` | `BattleSession` | WP11 (`src/app/session.ts`) | app screens, ui battle screen, tutorial | B6 loop, B11 |
| `platform.ts` | `PlatformAdapter` | WP11 (`src/platform/none.ts`) | app boot, capsule (reel gate) | B11, A10.1 |

## Fakes (`src/contracts/fakes`)

Test and dev helpers so every WP can build against the contracts before the real implementations exist (C2/WP0 task 5). Production code must not import them.

| File | Provides | Stands in for |
|---|---|---|
| `fakes/content.ts` | `fakeContent` (2 ages × 3 units, 1 turret and 1 power per age, frozen), `fakeLoadouts`, `fakeSideConfig`, `fakeEconomy`, `FAKE_AGES` | WP1 compiled content |
| `fakes/art.ts` | `FakeArtProvider`: coloured Pixi `Graphics` rectangles, records every call in `calls` | WP4 visuals |
| `fakes/audio.ts` | `FakeAudio`: records every call in `calls`, `played()` helper | WP6 audio |
| `fakes/saveStore.ts` | `InMemorySaveStore`, `fakeSaveDoc()` | WP8 store, WP7 `newSave` |
| `fakes/clock.ts` | `FixedClock` (`now`, `set`, `advance`), `FAKE_EPOCH_MS` | the app's real clock |
| `fakes/sim.ts` | `FakeSim` replaying `cannedBattleEvents` tick by tick, `createFakeSim`, `drainFakeSim`, `fakeMatchConfig` | WP2 sim |

The fake content uses table units (lu, ms, whole HP) and is for wiring tests only, never balance. The fake sim's events use the B3 integer units (milli-lu, centi-HP, milli-gold).

`src/contracts/contracts.test.ts` checks that every contract module loads with no runtime exports and exercises each fake.
