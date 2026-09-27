# Ageborn v1: build orchestration

How the v1 build in DESIGN Part C is run by an orchestrating Claude session with parallel subagents. The saved workflow scripts live in `.claude/workflows/` and can be started by name with the Workflow tool. If the Workflow tool is unavailable, run the same steps with the Agent tool, using the prompts in the scripts.

## Goals, in order

1. The owner can **play a real battle in the browser** as early as possible (Checkpoint A, then B).
2. The **full v1 loop** works (Checkpoint C): onboarding, capsules, War Plan, collection, upgrades, Trophy Road, Conquest, quests, save/export, replays.
3. **Balanced and polished** (Checkpoint D): A2.14 targets pass, C5 checklist passes.

## Phases

| Phase | Workflow | What happens | Ends with |
|---|---|---|---|
| 0 | `ageborn-phase0-foundation` | Scaffold (Vite, TS, Preact, Pixi, ESLint, Vitest, Playwright, CI, Pages), contracts (B15) and fakes, `core`, i18n loader, raw content tables. Then an independent verify-and-fix pass | Commit + push. Pages shows the shell |
| 1 | `ageborn-phase1-packages` | WP1-WP12 in parallel in the same tree, each followed by an independent spec-conformance review that fixes its own WP. Then one integration pass that makes the whole tree green and applies `docs/requests/` | Commit + push |
| 2a | `ageborn-phase2-battle` | Wire real sim, AI, content, visuals, audio into `BattleSession` and `BattleView`. Quick Battle route. Automated playtest with Playwright (autopilot bot vs bot, screenshots, console errors), fix loop | Commit + push. **Tell the owner the battle is playable** |
| 2b | `ageborn-phase2-loop` | Wire meta UI, capsule show, save, onboarding (A8), results flow, replays, Conquest, Daily. Multi-lens review (rules, determinism, honesty, UX, perf) with adversarial verification, then fixes | Commit + push. Tell the owner the full loop is playable |
| 3 | `ageborn-phase3-polish` | Balance tuning loop against A2.14 with the headless sim (numbers only), polish against A12 and C5, bug bash | Commit + push. v1 release candidate |

After every phase: update `docs/PROGRESS.md`, commit, push to `main` (Pages deploys automatically), and give the owner a short Danish status with the play link https://simnyborg.github.io/ageborn/.

## Working rules for parallel agents

- File ownership follows DESIGN C2. One owner per path.
- Agents do not commit. The orchestrator commits after each phase, once `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass.
- Dependencies are all installed in Phase 0. Later agents do not touch `package.json`.
- Ambiguities: choose the simplest reading that satisfies DESIGN, and append the decision to `docs/decisions.md` under the WP heading.
- Change requests to another WP's files go to `docs/requests/<wp>-<topic>.md`. The integration pass applies them.

## Checkpoint gate

Checkpoint A is the fun gate (DESIGN C3). If the owner's feedback says the core battle does not feel good, tune feel and rules before more meta work.
