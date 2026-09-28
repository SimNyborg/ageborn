# Progress

Newest entry first. Each session appends what it finished, what is next, and anything the owner must do.

## 2026-09-28: A17 art and sound registered for Bronze, Industrial and Cosmic (cloud session)

**What works**

- The 21 new units, 12 turrets and 3 bases draw with their 3D sprite sheets; each also has a procedural puppet in the house style as fallback and card art. All 8 ages load per age (Stone and Bronze baked at boot: 59 ms of the 400 ms budget).
- Code-painted backdrops: Bronze (temples, colonnade, olive hills, volcano), Industrial (chimneys, gas holders, viaduct with a train, smog), Cosmic (nebulae, ringed planet, crystal spires, asteroids). The split-age seam blends them with the old ages.
- Effects: 7 projectiles, 6 beams, 4 ability and 6 power effects; age icons for all 8 ages, the 6 power icons, the 3 camera icons; 4 new signature animations (Colossus stomp, Warp Stalker blink, Starwarden beacon, Harpoon reel).
- Sound: the recorded Bronze, Industrial and Cosmic effect sheets, music and intensity layers, stingers in every key; ZzFX and sequenced fallbacks for all of them; key changes follow +2, +2, +1, +1, +1, +1, +1 with the lead dropping an octave past +6.
- Checks: typecheck and build pass; initial download 446 KB. Visuals (1,105) and audio (152) tests pass except the unit-sheet summary whenever the art task re-renders a unit (rerun the generator). The in-browser art checks pass (136 visuals, 66 effects), and a live bot match shows Bronze and the seam with no console errors.

**Still open**

- Other packages: power and ability effects and the eight-age key steps in the battle view (`docs/requests/wp5-a17-new-age-fx.md`), the app's boot ages (`docs/requests/wp11-a17-boot-ages.md`), the art pipeline's age lists, Riveter and Sapper card stills and a pre-rendered backdrop for the new ages (`docs/requests/art-a17-pipeline-ages.md`), and the DESIGN merge of A17 for `tests/integrity/ids.test.ts`. Lint fails on one unused import in `src/ui/hud/model.ts` (HUD work in progress).
- Audio: the Medieval, Gunpowder, Modern and Future music files are recorded in their old five-age keys, so in an 8-age match the music does not rise at the Medieval evolve and drops a semitone at Modern. They need a re-render in E, F, G and G# (`tools/audio`).
- The gallery's world view shows the backdrop only over the first ~1,460 lu of the long lane (pre-existing since the long lane).

## 2026-09-28: A17 step 2, eight ages as data (cloud session)

**What works**

- Bronze, Industrial and Cosmic are real ages: 56 units, 32 turrets, 16 Age Powers. Short War plays Stone to Gunpowder (4 ages), Standard War Stone to Modern (6), Full War all 8. Conquest plays Standard War (owner decision). The tutorial keeps its five ages.
- Content, strings, schema, counter matrix, the eight Generals' War Plans (The Warden brings all eight Legendaries), arenas and drop pools, Trophy Road, quests, titles and feats follow A17.13. Capsules carry about 1.75 times more copies and Amber so a card takes as long to max as before (owner decision).
- Save version 2: old saves get Bronze, Industrial and Cosmic starter loadouts and cards; nothing owned is lost.
- Sim: every new ability combination has a test; the Harpoon Gunner's Reel In needed a fix. `SIM_VERSION` 2.1.0, golden replays re-recorded (hashes unchanged).
- Checks: typecheck and lint pass. Content, sim, AI, meta, save, tools, UI screens, app, capsule and tutorial tests pass except the known retime test.

**Measured** (tier VII Balanced mirror, 200 per format; proxies 100 per format)

- Full War median 9:07 (target 8:30), 51% in 6:45-10:15 (target 80%), Final Bell 17.5% (gate 5%); Short War median 5:06, Final Bell 9.0%; first clash 0:13.
- Evolves 1:12, 2:08, 2:57, 3:28, 4:06, 4:54, 5:43 (targets 0:52 ... 6:30): early evolves are slow and late ones fast.
- New Legendaries are too strong in the per-card test: Bronze Colossus +14.5, Land Dreadnought +14.0, Mothership +15.0 points; Warp Strike -9.5. Base time to kill 104-128 s (target 40-60 s).
- Exploit proxies: random spam 29.5% / 18.0% and mono Heavy 38.5% / 26.0% (Short / Full); the turtle 29% / 11% with 76% / 99% at the Bell.
- Economy: median card to max 119 / 108 / 68 / 109 days (before A17: 114 / 114 / 71 / 109). Drop tool: 10 of 10 pass.

**Known issues**

- No art or sound for the new ages yet: their units, turrets, bases and backdrops draw placeholders, and the visuals manifest, sound and id tests fail (requests for WP4 and WP6). The DESIGN merge of A17 (A13, A14.1, A14.3 lists) is also needed for `tests/integrity/ids.test.ts`.
- The HUD and battle view read the wrong age in the tutorial, which now skips ages (request `docs/requests/wp5-a17-eight-ages.md`), and their tests still expect the old thresholds.
- Balance for eight ages (A17.16 step 4) is Phase 3 work: the numbers above.

**Next:** WP4, WP5 and WP6 requests, merge A17 into DESIGN, then Phase 3 balance.

## 2026-09-28: Phase 2b meta loop, review fixes (cloud session)

**What works**

- The full meta loop is wired: Home, capsules and the capsule show, Supply Capsule, War Chest, onboarding, Daily Challenge 2.0, feats, stopping cards, ladder, Conquest, Skirmish, replays and AI anti-spam.
- The Phase 2b review found 20 problems. All are fixed, each with a test where possible:
  - Result screen: a War Chest grant shows its bar full, and every extra capsule (Supply, the chest's Age Capsule, a Conquest milestone), the Wardrobe Crate and Clay pips show in the "Also earned" row. The reward list has a new `crate` reward step.
  - Age Capsules: a dialog now asks which age to pick when a match or a quest grants an Age Capsule (Daily first win, Conquest star 3, full War Chest, the Daily quest).
  - Honest copy: the Supply Capsule is never called "Daily Capsule". Every odds panel uses the A15.3 honesty line. Echo of You has its exact AI label. The Warden's Legendaries are disclosed at Standard levels too. The claims "free" and "offline" are gone. The Legendary line reads "Next capsule you earn" and counts capsules already in the tray. A lost Daily copies as "Lost at 6:10". Stale comments about the reel are corrected.
  - First session: the title shows only one Play button until onboarding is done. Every title opponent shows its tier and the Rookie AI line. A Settings gear on the title opens Settings (import, For parents, break reminder) during onboarding. An unreadable save shows a banner with an Import button. "Your army, your plan" appears once after match 3. The "Blocked at their gate" callout is off in scripted matches and uses at most 8 words. The onboarding Result offers only Next or Retry, and its other buttons have text labels. The Daily VS screen shows both sides at Lv 7.
  - Durability: a capsule show saved by another build, or one this build cannot play, is dropped instead of blanking the app. The save already holds the result, so only the animation is lost.
- Checks: `npm run typecheck`, `npm run lint`, `npm run build` and `npm run size` (421 KB initial gzip) pass. Unit tests and e2e pass for everything this step touched; see the known issues for the failures from work in progress.

**Known issues**

- Other agents are changing the sim, content counters, audio and art while this step runs. Their unfinished work makes these tests fail for now (9 unit tests out of 2,919, plus the e2e golden-replay determinism check): the match 1 retime, the wall prototype, the real-sim render map, the fake sim stream, the unit sprite sheet summary and the balance window. The orchestrator must get them green before the phase is committed as done.
- The onboarding Result still looks different from the Ladder Result, although its buttons are fixed. The two should be unified in Phase 3.
- The pause panel in the onboarding battles has no Settings entry; Settings is reachable from the title.
- If the tab is closed while the Age Capsule dialog is open, that match's result is lost (the result is saved once the age is picked).
- The total download (lazy art and audio) is about 55 MB, above the 16 MB budget (B16). This is only a warning from the size check.

**What the owner should try** (once this is pushed and deployed)

1. Open the game in a private window and play the two tutorial matches. The title should show only one Play button and a gear icon in the corner.
2. Tap the gear: Settings should open. Press Back to return.
3. After match 3, look for "Your army, your plan" on Home.
4. Win a Daily Challenge: a window asks which age the Age Capsule should come from.
5. Tell us if anything looks wrong or confusing.

**Next:** get the in-progress sim, content and audio work green, then Phase 3 (`ageborn-phase3-polish`).

## 2026-09-28: Phase 2a playable battle, Checkpoint A/B (cloud session)

**What works**

- A full battle in the browser: the real sim, AI generals, procedural visuals, feel layer, HUD and audio all run together. Quick Battle (Short, Standard and Full War) against an AI-labelled General works from the title screen, as does tutorial match 1.
- Three automated playtests (rules, feel, robustness) played real matches in headless Chromium and fixed what they found:
  - Rules: tapping a card marked ARMY FULL now queues another copy, as the sim allows (C5 #10, A2.7). The HUD now applies Daily Challenge modifiers (XP threshold, prices, income, Siege time); the modifier rules moved to `src/core/modifiers.ts` so render can use them (B2), and `src/sim/modifiers.ts` re-exports them. Golden replays are unchanged. Logged in `docs/decisions.md`.
  - Feel: new Tar Pits ground (uneven glossy tar pools, pebbles, bones, grass, depth scaling) and a new result screen (outcome tint, sunburst on a win, staged recap; reduce-motion respected).
  - Robustness: 10 bot-vs-bot Full Wars at 2x with pause, tab-hide, restart and Play again; no console errors, no stuck matches. Fixed a memory leak of about 0.75 MB per match (backdrop strip textures kept every battle alive); new test `src/visuals/test/backdropDestroy.test.ts`. JS per frame is well within budget (p95 about 11 ms, at most 5 draw calls).
- Checks C5 #8-23 were checked in the browser (phase times, bounties, XP cap, evolve, pop/queue/Legendary limits, turrets, Hold line, Last Stand, keys, pause and speed, auto-pause on tab hide).
- Final gate: `npm run typecheck`, `npm run lint`, `npm test` (2,617 passed, 1 skipped), `npm run build`, `npm run size` (440 KB gzip initial, limit 3 MB) and `npm run test:e2e` (11 passed, 4 skipped until Phase 2b; includes booting at `/ageborn/` and a Quick Battle with no console errors) all pass.

**Known issues**

- Matches drag on: about half of Full War mirror matches end at the Final Bell, often 40%/40%. At the gate only about 3 units can reach the enemy base, so base time-to-kill is 128-167 s against a 40-60 s target (`reports/balance.md`). Phase 3 must decide whether the movement rule or the target changes.
- Units are small on a phone (about 35-40 px tall in landscape), because the whole lane fits on screen (A2.1). Design decision pending.
- Art details: pale blotches on skin at battle size; the pumpkin-head skin hides the blue team colour; the mount price label shows on the title screen.
- The result screen covers the battle instead of showing its last frame.
- Speed resets to 1x on Restart and Play again.
- 60 fps is not confirmed: this machine renders WebGL in software. It needs a check on a real phone.
- About 0.3 MB of heap growth per match remains (looks bounded).
- Quick Battle shows the stance flag and Last Stand button on a fresh profile; the real onboarding flow (Phase 2b) must hide them until matches 4 and 5.
- The AI ignores Daily Challenge modifiers; Daily Challenge itself is not wired yet.
- Congreve Rack rockets can land about 521 lu from the gate (designed scatter) while C5 #14 says 480.

**What the owner should try** (once this is pushed and the Pages deploy has finished)

1. Open https://simnyborg.github.io/ageborn/ on your PC and on your phone (turn the phone sideways).
2. On the title screen pick Short War and press Quick Battle.
3. Tap unit cards to train units, press Evolve when it lights up, try a power, build a turret on your base.
4. Try pause, the speed buttons, and switching to another tab and back (the game should pause).
5. Play to the end and look at the result screen, then press Play again.
6. Tell us: does it look good, does it feel fast enough, and is anything confusing or broken? On the phone: are the units big enough?

**Next:** Phase 2b (`ageborn-phase2-loop`): the full meta loop (onboarding, capsules, War Plan, collection, road, quests, save, replays).

## 2026-09-28: Phase 1 work packages (cloud session)

- All 12 work packages built and each independently reviewed against DESIGN (run as three parallel tracks): content compiler (WP1), simulation with golden replays (WP2), AI generals (WP3), procedural visuals plus a working sprite-sheet tier (WP4), battle view, feel layer and HUD (WP5), audio (WP6), meta rules (WP7), save system (WP8), meta UI screens (WP9), capsule show (WP10), app scaffold, session, onboarding and replay (WP11), tools, integrity tests and e2e skeleton (WP12).
- Whole tree green: typecheck, lint, 2,609 unit tests, build. The production build boots at `/ageborn/` with no console errors; `?dev=1` lists 11 dev pages.
- Design work done alongside: engagement research and addendum `docs/design-engagement.md` (A15), depth and variety research and addendum `docs/design-depth.md` (A16), and a 3D sprite pipeline spike in `art/blender/` (report in `art/blender/SPIKE_REPORT.md`). A15 and A16 are merged into DESIGN.md after the owner's decisions.
- 40 change requests in `docs/requests/`, mostly app wiring; they are applied in Phase 2a (battle) and Phase 2b (meta loop).

**Next:** Phase 2a (`ageborn-phase2-battle`): wire the real sim, AI, visuals, audio and HUD into a playable battle.

## 2026-09-27: Phase 0 foundation (cloud session)

- Scaffold: Vite 8 + TypeScript 6 + Preact + PixiJS 8 with exact pins, ESLint layer and determinism rules, Vitest, Playwright (Chromium), size gate. `npm run dev` shows a Pixi canvas with a Preact shell; `?dev=1` lists dev pages. The build uses base `/ageborn/`.
- All B15 contracts in `src/contracts` (checked type-for-type against DESIGN), fakes for tests and dev pages, `docs/contracts.md`.
- `src/core` (sfc32, xmur3, mulberry32, FNV-1a, bp math, ring buffer, assert) with known-answer tests; i18n loader with EN fallback.
- All Part A tables in `src/content/raw` (35 units, the hidden Training Dummy, 20 turrets, 10 powers, economy, formats), cross-checked against A2, A5 and A14.2; frozen copy in `tests/fixtures/content`.
- Independent verification: typecheck, lint, 171 unit tests, build and size gate (about 134 KB gzip initial) all pass; headless Chromium showed no console errors on dev or on the `/ageborn/` preview. A lint test proves `pixi.js` in `src/sim` is rejected.

**Open:** no e2e specs yet (WP12); WebKit e2e not configured (only Chromium is available here); `emoteCooldownMs` is a placeholder 3 s (WP1 decides).

**Next:** Phase 1 (`ageborn-phase1-packages`).

**Resuming elsewhere (for example on the owner's PC when the cloud credit runs out):** the cloud session works on branch `main-ipy06f` (draft PR #1) and fast-forwards `main` after each green phase. Commits named `WIP ...` are mid-phase snapshots. To resume: `git pull`, check out `main-ipy06f` if it is ahead of `main`, run `npm ci`, then continue with the next workflow named above.

## 2026-09-27: research and design (local session)

- Researched the genre (Age of War 1+2, Stick War, Battle Cats, Clash Royale meta, case-opening presentation, game feel, tech stack, web portals). Reports in `docs/research/`.
- Three design proposals, a synthesis, three critiques (player, builder, balance) and a revision produced `docs/DESIGN.md` v1.1.
- Created the public repo `SimNyborg/ageborn` and a GitHub Pages workflow that shows a placeholder page until the game builds.
- Wrote `CLAUDE.md`, `docs/BUILD_PLAN.md` and the saved workflows in `.claude/workflows/`.

**Next:** Phase 0 (`ageborn-phase0-foundation`), then Phase 1, then Phase 2a so the owner can play a battle. The build is meant to run in a Claude Code cloud session (the owner has promotional cloud credit that expires 2026-11-05).
