# Progress

Newest entry first. Each session appends what it finished, what is next, and anything the owner must do.

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
