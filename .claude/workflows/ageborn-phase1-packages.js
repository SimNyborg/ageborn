export const meta = {
  name: 'ageborn-phase1-packages',
  description: 'Ageborn Phase 1: build WP1-WP12 in parallel, review each against DESIGN, integrate, commit and push',
  whenToUse: 'After Phase 0 is committed; builds all work packages against the frozen contracts',
  phases: [
    { title: 'Build', detail: 'one agent per work package, same tree, disjoint paths' },
    { title: 'Review', detail: 'independent spec-conformance review per package, fixing within that package' },
    { title: 'Integrate', detail: 'make the whole tree green, apply docs/requests, commit and push' },
  ],
}

const COMMON = `You are part of the team building Ageborn. The repo root is your current working directory.
Read CLAUDE.md first. docs/DESIGN.md is the single source of truth (about 2,800 lines): use Grep to find sections and Read with offset/limit. Read the contracts in src/contracts (frozen after Phase 0) and code strictly against them; test against the fakes in src/contracts/fakes where the real implementation belongs to another package.
About 12 agents work in the same tree at the same time, one per work package (WP). Rules:
- Edit ONLY the paths your WP owns (listed below and in DESIGN C2). Never delete, move or reformat other files.
- Need a change in another WP's files or in src/contracts? Write docs/requests/<your-wp>-<topic>.md with the exact change and continue with a local workaround.
- Do not touch package.json or the lockfile. Do not run git commit or git push.
- typecheck/lint: run npx tsc --noEmit -p tsconfig.json and npx eslint on your own paths; ignore errors in files you do not own.
- Ambiguity in DESIGN: pick the simplest reading that satisfies it and append the decision to docs/decisions.md under a heading for your WP (append only; other agents append too, so re-read the file right before appending).
- Quality bar: this is the foundation the owner will iterate on for years. Clean module boundaries, readable code, tests for every rule you implement. Meet your WP's Definition of Done in DESIGN C2 completely.
Your final answer is a short plain-text report: what you built, the DoD items and whether each passes (with the command you ran), and any open issues or requests you filed.`

const WPS = [
  { id: 'WP1', title: 'Content schema, compiler, strings, counters', owns: 'src/content/** except src/content/raw/**, src/i18n/content.en.json, tools/counters.ts',
    read: 'C2/WP1, B4, B15 (content.ts), A2.5-A2.11, A3, A5 (all), A6 (capsule tables, arenas, Trophy Road, quests, Conquest), A7.4, A9.1, A14' },
  { id: 'WP2', title: 'Simulation (critical path)', owns: 'src/sim/**, src/dev/sandbox/simPanel.tsx',
    read: 'C2/WP2, B3, B13 (Sim), B15 (commands, events, sim, observation), A2 (all), A3, A5 (all abilities), A2.9 and A5.7 (powers), A14.2. Use src/content/raw through a local compile shim until WP1\'s compiler exists, as C2/WP2 says' },
  { id: 'WP3', title: 'AI generals', owns: 'src/ai/**, src/dev/botViewer/**',
    read: 'C2/WP3, A7 (all), B10, B13 (AI), B15 (observation, bot, commands). The real sim is being written in parallel: build against the contracts and the fake sim, and write the tier-ordering tests so they run against the real sim once it exists (skip with a clear message if createSim is not available yet)' },
  { id: 'WP4', title: 'Visuals and art provider', owns: 'src/visuals/**, src/dev/gallery/**, docs/art-style.md',
    read: 'C2/WP4, B5, B16, A11 (all), A14.1, A14.2, A5 (every unit and turret, for silhouettes), A5.8 (skins). Deliver the placeholder adapter first, then the full procedural adapter. The swap contract (ArtProvider plus manifest) is the most important long-term asset: make it clean so sprite sheets or Spine can replace procedural art by changing the manifest only' },
  { id: 'WP5', title: 'Battle view, feel layer, HUD', owns: 'src/render/**, src/ui/hud/**, src/i18n/hud.en.json, src/dev/feel/**, src/dev/sandbox/page.tsx, src/dev/sandbox/view*.tsx',
    read: 'C2/WP5, B6, B16, A2.1 (camera, layout, depth), A9.2 (HUD), A11 (evolve sequence, split-age backdrop), A12 (all juice). Phase 1 DoD only: build against the fake sim, fake art and fake audio' },
  { id: 'WP6', title: 'Audio', owns: 'src/audio/**, src/dev/soundboard/**',
    read: 'C2/WP6, B7, A13 (all), A14.3. Vendor the ZzFX source (MIT, include its licence header) into src/audio/vendor/zzfx.ts yourself; no npm dependency' },
  { id: 'WP7', title: 'Meta rules', owns: 'src/meta/**',
    read: 'C2/WP7, B9, B13 (Meta), B15 (meta, save), A3, A6 (all), A6.8, A7.3, A9.1. Pure and deterministic with an injected Clock' },
  { id: 'WP8', title: 'Save system', owns: 'src/save/**',
    read: 'C2/WP8, B8, B13 (Save, Schemas), B15 (save.ts)' },
  { id: 'WP9', title: 'Meta UI screens', owns: 'src/ui/router.ts, src/ui/theme.css, src/ui/components/**, src/ui/screens/** (not hud), src/i18n/ui.en.json',
    read: 'C2/WP9, A9 (all screens and flow), A3 (War Plan builder rules), A6 (what each screen shows), A6.5 (odds sheet), A7.1 (AI labels). Phase 1 DoD: every screen renders with the fake save in the states new player, mid-game and maxed. Make it look like a polished modern mobile game, not a web form' },
  { id: 'WP10', title: 'Capsule and crate show', owns: 'src/capsule/**, src/i18n/capsule.en.json, src/dev/capsuleBench/**',
    read: 'C2/WP10, A10 (full storyboard), A10.1 (Wardrobe reel), A6.4, A6.5, A12 (juice), B15 (CapsuleReveal, WardrobeReveal). This is the excitement moment of the game: anticipation, rarity pre-signal, climbs, burst, walkouts. Consume only the reveal data' },
  { id: 'WP11', title: 'App integration scaffold, session, onboarding, platform, replay viewer', owns: 'src/app/**, src/platform/**, src/tutorial/**, src/i18n/tutorial.en.json',
    read: 'C2/WP11, B6 (session loop), B11, A8 (onboarding), A7.1 (labels), B15 (session, platform). Phase 1: scaffolding against fakes (boot, services.ts that can build real or fake implementations, BattleSession loop, tutorial director and scripts, replay player, visibility pause). Also a "Quick Battle" route that starts a battle via services.ts, so Phase 2 can switch it to real implementations' },
  { id: 'WP12', title: 'Tools, integrity tests, CI, e2e skeleton', owns: 'tools/** except tools/counters.ts, tests/** except tests/fixtures/content/**, .github/workflows/ci.yml',
    read: 'C2/WP12, B12, B13 (Integrity, E2E), A2.14 (balance targets). Phase 1: tool skeletons that run against the contracts, integrity tests (IDs, string keys, layer graph, hard-coded strings) and the Playwright smoke skeleton. Tests that need packages still being built must skip with a clear reason rather than fail' },
]

const buildPrompt = (wp) => `${COMMON}

YOUR WORK PACKAGE: ${wp.id}, ${wp.title}.
You own: ${wp.owns}.
Read in DESIGN: ${wp.read}.
Implement the package completely per DESIGN C2/${wp.id}, including its tests and dev page, and meet its Phase 1 Definition of Done.`

const reviewPrompt = (wp, report) => `${COMMON}

YOUR ROLE: independent reviewer for ${wp.id} (${wp.title}). Another agent just built it. You own the same paths it did: ${wp.owns}.
Read in DESIGN: ${wp.read}.
1. Check the implementation against DESIGN rule by rule and number by number. Look for missing rules, wrong numbers, contract violations, determinism leaks (sim/ai/meta/core/content), layer violations, hard-coded UI strings, and untested rules.
2. Run the package's tests, typecheck and lint (filtered to these paths).
3. Fix every real problem you find, inside these paths. Add missing tests.
Be skeptical: assume there are gaps until you have checked. Report what you verified, what you fixed, and anything you could not fix.

Builder's report:
${report ?? '(the build agent failed or was skipped: build the package yourself)'}`

phase('Build')
const results = await pipeline(
  WPS,
  (wp) => agent(buildPrompt(wp), { label: `build:${wp.id}`, phase: 'Build' }),
  (report, wp) => agent(reviewPrompt(wp, report), { label: `review:${wp.id}`, phase: 'Review' })
    .then((review) => ({ id: wp.id, report, review })),
)

phase('Integrate')
const summary = results.map((r, i) => `=== ${WPS[i].id} ===\nBUILD: ${r?.report ?? 'missing'}\nREVIEW: ${r?.review ?? 'missing'}`).join('\n\n')
const integrated = await agent(`${COMMON.split('About 12 agents')[0]}
YOUR ROLE: integration lead for the end of Phase 1. All work packages are done. You may now edit any file.
1. Apply every request in docs/requests/ (contract changes included: you are the integration lead), then move handled requests to docs/requests/done/.
2. Run npm run typecheck, npm run lint, npm test and npm run build for the whole tree. Fix every failure, preferring minimal fixes in the owning package.
3. Check that the dev pages (?dev=1) load: sandbox, gallery, soundboard, feel, capsuleBench, botViewer.
4. Update docs/PROGRESS.md (newest first) with Phase 1 results, open issues and next steps.
5. git add -A and commit "Phase 1: work packages WP1-WP12" ending with the line Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>, then push to origin main (or the current branch if main is not allowed; report which).
Report what you fixed, the final check results, and the commit hash.

Package reports:
${summary}`, { label: 'integrate:phase1', phase: 'Integrate' })

return { results, integrated }
