# Ageborn: instructions for Claude

Ageborn is a browser-first, one-lane tug-of-war battler (inspired by the classic Flash genre, but our own IP) with a Clash Royale-style meta: a War Plan with one loadout per age, a card collection with rarities, Time Capsules with an honest and exciting reveal, upgrades, skins and AI opponents. v1 is offline and runs entirely in the browser.

## The owner

- The owner is Danish. Talk to the owner in Danish, in plain language, and keep status updates short. Code, comments, commit messages and docs in the repo are in English.
- The owner is not a developer. When the owner must do something (log in, approve, test), give exact steps.

## Where things are

| What | Where |
|---|---|
| Single source of truth for rules, numbers, architecture and build plan | `docs/DESIGN.md` (~2,800 lines; read the sections you need with offsets) |
| How the build is orchestrated, phase by phase | `docs/BUILD_PLAN.md` |
| Current status, what is done, what is next | `docs/PROGRESS.md` (update it at the end of every session) |
| Design decisions made while building (append only, per WP) | `docs/decisions.md` |
| Change requests to another work package's files | `docs/requests/<wp>-<topic>.md` |
| Background research (genre, players, meta, feel, tech, portals) | `docs/research/` |
| Earlier proposals and critiques behind the design | `docs/design-history/` |
| Saved orchestration workflows | `.claude/workflows/` |

## Hard rules

- **No real money, ever.** No store, no payment code, no ads SDK in v1. All currencies are earned.
- **Bots and the online preview** (owner decision 2026-10-07, replacing the earlier "never present a bot as a human" rule): until real online play exists, the Battle flow simulates online matchmaking (search, "player found" with a generated name, avatar and trophies, a Player chip on VS) and the match is played against an AI. The War Path, Conquest, Daily, Skirmish and training opponents stay labelled AI. When real online play ships, real players replace the simulated ones.
- **Our own IP.** Never use the name "Age of War" (or its art, sounds or unit names) in the game, tags, store text or code identifiers.
- **Free tiers only.** GitHub free, GitHub Pages, Actions on a public repo. No paid services or APIs. Cloud sessions run on the owner's promotional credit and, once that is used, on the owner's regular Max plan usage (paid usage credits are off, so nothing may ever cost extra money). Work efficiently: plan before fanning out, do not rerun expensive steps without a reason.
- **Determinism.** `sim`, `ai`, `meta`, `core` and `content` are pure and deterministic (DESIGN B2/B3): integer math, seeded RNG, no `Math.random`, `Date`, floats in stat math, DOM or rendering imports.
- **Art is swappable.** Everything visual goes through the `ArtProvider` interface and the visual manifest (DESIGN B5). The simulation owns all timing, so replacing art can never change balance. Never hard-code visuals in sim or UI logic.
- **Beautiful and well animated.** The owner cares a great deal that the game looks good and moves well. Visual and animation quality is a top priority for every visual package (visuals, render/feel, HUD, UI screens, capsule show), not a later polish item. Aim for the look of a polished commercial mobile game within the A11 style: consistent shapes and palette, cel shading and highlights, lively idle/walk/attack/hit/death motion with anticipation, squash and stretch and follow-through, smooth easing on every UI transition, layered backdrops with depth and ambient motion, and effects that follow A12. Check your work with Playwright screenshots and improve what looks flat, stiff or placeholder-like before you report done.
- **Intuitive UI and satisfying motion.** The owner requires an interface that is clear, intuitive and user-friendly, built on established UI principles (visual hierarchy, one obvious primary action per screen, immediate feedback on every tap, recognition over recall, consistency, large touch targets, readable text and contrast, progressive disclosure), and animations that feel satisfying across the whole game (anticipation, impact, follow-through, easing, sound). Follow `docs/ui-principles-short.md` and `docs/ui-plan.md` once they exist, and review every UI change with Playwright screenshots on phone landscape (844x390) and desktop (1280x720) before reporting done.
- **Content is data.** Units, turrets, powers, skins, economy and capsule tables live in `src/content`. Balance changes touch numbers, not rules.
- **Layering** is enforced by lint and an import-graph test (DESIGN B2). Respect it.
- **Strings** go through i18n (`src/i18n`); no hard-coded UI text. English now, Danish in v1.1.

## Commands

(Available once Phase 0 has scaffolded the project.)

- `npm install`: install dependencies
- `npm run dev`: dev server at http://localhost:5173 (`?dev=1` shows the dev page list)
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`
- `npm run play`: production build plus preview

## Git and deploy

- `main` is the deployed branch. Every push to `main` builds and deploys to GitHub Pages: https://simnyborg.github.io/ageborn/
- Vite `base` must be `/ageborn/` for the Pages build.
- Commit after each completed phase or meaningful, green step. Keep `main` playable: do not push a build that fails to start.
- If the environment only allows pushing to a `claude/*` branch, push there; the Pages workflow also deploys from `claude/**` branches. Then tell the owner the branch name.

## Parallel work

DESIGN Part C assigns every path to exactly one work package (WP0-WP12). When several agents work in the same tree at once:

- Edit only the paths your WP owns. Request changes to other paths in `docs/requests/`.
- Do not commit; the orchestrator commits once the phase is green.
- Do not change `package.json` or the lockfile outside Phase 0 without a request.
- Typecheck and lint may show errors in other agents' unfinished files; filter to your own paths.
