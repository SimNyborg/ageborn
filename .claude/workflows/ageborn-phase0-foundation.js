export const meta = {
  name: 'ageborn-phase0-foundation',
  description: 'Ageborn Phase 0 (WP0): scaffold, contracts, fakes, core, i18n, raw content; verify; commit and push',
  whenToUse: 'First build step for Ageborn, run once from the repo root before Phase 1',
  phases: [
    { title: 'Build', detail: 'scaffold/core/i18n, contracts/fakes and raw content in parallel' },
    { title: 'Verify', detail: 'independent DoD check and cross-check against DESIGN, fixing what fails' },
    { title: 'Ship', detail: 'commit and push so GitHub Pages deploys the shell' },
  ],
}

const COMMON = `You are part of the team building Ageborn. The repo root is your current working directory.
Read CLAUDE.md first. docs/DESIGN.md is the single source of truth (about 2,800 lines): use Grep to find sections and Read with offset/limit.
Where DESIGN is ambiguous, pick the simplest reading that satisfies it and append the decision to docs/decisions.md under "## WP0".
Other agents work in the same tree at the same time. Only edit the paths assigned to you below. Do not run git commit or git push.
When you typecheck or lint, errors in files you do not own may come from agents that are still working: filter to your own paths.
Your final answer is a short plain-text report: what you built, the checks you ran and their results, and anything left open.`

const SCAFFOLD = `${COMMON}

YOUR TASK: WP0 part 1, the project scaffold (DESIGN B1, B2, B13, B14, B16, C2/WP0 tasks 2, 3, 6, 7 and the DoD).
You own: package.json, package-lock.json, tsconfig*.json, vite.config.ts, vitest.config.ts, eslint.config.js, playwright.config.ts, index.html, public/**, .github/workflows/ci.yml, .github/workflows/pages.yml, src/core/**, src/i18n/index.ts, src/dev/router.tsx, src/app/main.tsx (stub), and empty placeholder folders from B14.
Do NOT write src/contracts/** or src/content/raw/** (two other agents are writing them right now).

1. Check current versions with npm view. Use the newest majors where the toolchain supports them (see DESIGN B1 version note), else the B1 versions. Pin exact versions.
   Install EVERY dependency any later work package will need, so nobody touches package.json after Phase 0: pixi.js, preact, @preact/signals, valibot, fflate; dev: vite, @preact/preset-vite, typescript, vitest, fast-check, @playwright/test, eslint, typescript-eslint, tsx, @types/node, and anything else B1/B12/B13 need (for example @vitest/coverage-v8 is optional).
2. tsconfig: strict, noUncheckedIndexedAccess, path alias "@/*" -> "src/*", jsx for Preact. Vite: preact preset, same alias, base "/ageborn/" for production builds (dev may use "/").
3. ESLint flat config with the B2 layer rules (no-restricted-imports per folder) and determinism rules for sim, ai, meta, core, content.
4. Scripts: dev, build, preview, play (build + preview), typecheck, lint, test, test:e2e, bench. Vitest in node env.
5. src/core per B14 (fixed.ts rng.ts hash.ts ids.ts assert.ts ring.ts): sfc32 + xmur3, mulberry32, FNV-1a, bp/fixed-point helpers, integer-only trig approximations or lookup tables if the sim needs them per B3, ring buffer, assert. Known-answer tests.
6. src/i18n/index.ts loader with EN fallback, matching the I18n contract shape in DESIGN B15 (i18n.ts). Import the type from "@/contracts" once that file exists; if it does not exist yet when you finish, define a local type and leave a TODO note in docs/requests/wp0-i18n-type.md.
7. index.html, src/app/main.tsx stub that mounts a Preact shell over a PixiJS 8 canvas showing the Ageborn title and a lane, and src/dev/router.tsx that lists dev pages found with import.meta.glob('./*/page.tsx') when the URL has ?dev=1.
8. .github/workflows/ci.yml: typecheck, lint, unit tests, build, bundle-size gate (initial chunk <= 3 MB gzip). Update .github/workflows/pages.yml so it always runs npm ci and npm run build (drop the placeholder branch) and deploys dist. Keep its branch triggers.
9. Run npm install, npm run typecheck (filtered), npm run lint (your files), npm test, npm run build. Everything you own must pass.`

const CONTRACTS = `${COMMON}

YOUR TASK: WP0 part 2, the contracts and fakes (DESIGN B15 in full, plus C2/WP0 tasks 4 and 5).
You own: src/contracts/** (including src/contracts/fakes/**) and docs/contracts.md.
Another agent is scaffolding package.json/tsconfig right now; if tsc is not available yet, write the files first and typecheck at the end (retry npx tsc --noEmit after a few minutes).

1. Write every contract in DESIGN B15 as TypeScript files per B14 (ids.ts content.ts commands.ts events.ts sim.ts observation.ts bot.ts art.ts audio.ts hud.ts save.ts meta.ts session.ts platform.ts feel.ts i18n.ts index.ts), with JSDoc that cites the DESIGN section for each rule.
   Copy the TypeScript from B15 faithfully; fix only real errors (missing types, typos) and log each fix in docs/decisions.md.
2. Write the fakes in src/contracts/fakes: a mini content set with 2 ages x 3 units, a fake ArtProvider that draws coloured rectangles with Pixi Graphics, a recording FakeAudio, an in-memory SaveStore, a fixed Clock, and a fake sim that replays a canned SimEvent stream.
3. docs/contracts.md: a one-page map of the contracts and which WP implements each.
4. Typecheck src/contracts with the project tsconfig and add a small vitest that imports every contract module and every fake.`

const RAW_CONTENT = `${COMMON}

YOUR TASK: WP0 part 3, the raw content tables (C2/WP0 task 8).
You own: src/content/raw/** and tests/fixtures/content/**.
Encode the Part A tables exactly: economy and battle numbers (A2.2-A2.11), every unit, turret and ability per age (A5.1-A5.6), the Age Powers (A5.7), and the per-card attack mapping (A14.2), as src/content/raw/{stone,medieval,gunpowder,modern,future,powers,economy}.ts.
The content types are defined in src/contracts/content.ts, which another agent is writing right now from DESIGN B15. Read DESIGN B15's content.ts section yourself and shape your data to it; before you finish, open the real src/contracts/content.ts and make the raw files typecheck against it.
Numbers are data: no logic in raw files. Keep units in the DESIGN's units (lu, ms, gold, bp); the WP1 compiler converts to ticks and milli-units later.
Then freeze a copy as tests/fixtures/content (the golden replays use it, so tuning never breaks them), and add a table-driven vitest that checks a sample of at least 15 cards across all ages against the DESIGN tables.`

const VERIFY = `${COMMON}

YOUR TASK: independent verification of Phase 0 (WP0 DoD in DESIGN C2). Three agents just built the scaffold, the contracts and the raw content in parallel. You may now edit any Phase 0 file to fix problems.
1. Run npm install, npm run typecheck, npm run lint, npm test and npm run build. Fix every failure.
2. Cross-check src/contracts against DESIGN B15 line by line: every type and interface present, names and fields matching. Fix gaps.
3. Cross-check src/content/raw against A5 and A2 tables: every card present, stats matching. Fix mismatches.
4. Check the layer and determinism lint rules actually trigger: add a tiny test or lint fixture proving that importing pixi.js from src/sim is an error.
5. Check that npm run dev serves a page with the Pixi canvas and the Preact shell, and that ?dev=1 lists dev pages (use a quick Playwright or node script if browsers are available; otherwise check the built HTML and the module graph).
6. Check vite build output uses base /ageborn/.
7. Resolve anything in docs/requests/ that belongs to Phase 0.
Report precisely what you fixed.`

const SHIP = `${COMMON}

YOUR TASK: ship Phase 0.
1. Run npm run typecheck, npm run lint, npm test and npm run build one final time. If anything fails, fix it first.
2. Update docs/PROGRESS.md with a short entry for Phase 0 (newest first).
3. git add -A, then commit with a message like "Phase 0: scaffold, contracts, core, raw content". End the commit message with the line: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
4. Push to origin main. If pushing to main is not allowed in this environment, push the current branch and report its name.
Report the commit hash and where it was pushed.`

phase('Build')
const built = await parallel([
  () => agent(SCAFFOLD, { label: 'wp0:scaffold', phase: 'Build' }),
  () => agent(CONTRACTS, { label: 'wp0:contracts', phase: 'Build' }),
  () => agent(RAW_CONTENT, { label: 'wp0:raw-content', phase: 'Build' }),
])

phase('Verify')
const verified = await agent(`${VERIFY}\n\nReports from the three build agents:\n\n${built.map((r, i) => `--- report ${i + 1} ---\n${r ?? '(agent failed or was skipped)'}`).join('\n\n')}`,
  { label: 'wp0:verify', phase: 'Verify' })

phase('Ship')
const shipped = await agent(SHIP, { label: 'wp0:ship', phase: 'Ship' })

return { built, verified, shipped }
