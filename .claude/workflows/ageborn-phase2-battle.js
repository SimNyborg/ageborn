export const meta = {
  name: 'ageborn-phase2-battle',
  description: 'Ageborn Phase 2a: integrate real sim, AI, content, visuals and audio into a playable battle; automated playtest and fix loop; push',
  whenToUse: 'After Phase 1 is committed; produces Checkpoint A/B (a playable battle on GitHub Pages)',
  phases: [
    { title: 'Integrate', detail: 'wire real services into BattleSession and BattleView; Quick Battle is the landing page for now' },
    { title: 'Playtest', detail: 'automated playtests from different angles, each fixing what it finds' },
    { title: 'Ship', detail: 'final checks, commit, push, owner play link' },
  ],
}

const COMMON = `You are part of the team building Ageborn. The repo root is your current working directory.
Read CLAUDE.md, docs/PROGRESS.md and docs/BUILD_PLAN.md first. docs/DESIGN.md is the single source of truth: use Grep to find sections and Read with offset/limit.
Phase 1 is done. You may edit any file, but keep package boundaries and the B2 layering intact, and keep contracts stable unless a change is truly needed (log it in docs/decisions.md).
Do not run git commit or git push unless your task says so.
Your final answer is a short plain-text report of what you did, what you verified (with commands), and what is still open.`

const INTEGRATE = `${COMMON}

YOUR TASK: Checkpoint A and B from DESIGN C3, the playable battle. Read C3, B6, B11, A2, A8 match 1, A9.2, A11 (evolve sequence), A12.
1. services.ts builds the REAL implementations: compiled content (WP1), createSim (WP2), bots (WP3), procedural ArtProvider (WP4), BattleView and HUD (WP5), AudioService (WP6).
2. BattleSession runs the fixed-step loop per B6: player commands from the HUD, bot commands from Observation only, pause, speed 1x/1.5x/2x, visibility pause, end of match.
3. For now the app opens on a simple start screen with "Quick Battle" (Short War vs a tier III AI general, AI label visible) plus a format picker for Standard and Full War, and a restart button at the end. The full meta flow comes in Phase 2b; do not block on it.
4. The full battle must work: all 5 ages, every unit, turret and power in the player's default War Plan, evolve with the full sequence and Vanguard, turrets with mounts and Modernise, Age Powers with drag targeting, stance, Last Stand, phases (Overdrive, Siege, Final Bell), win/lose screen. Music and SFX play after the first tap.
5. Desktop and landscape phone layouts both work (DESIGN A2.1); portrait shows the rotate overlay.
6. npm run typecheck, lint, test and build all pass. Run npm run build && npx vite preview and load the page with Playwright (install chromium with npx playwright install chromium if needed) to check it boots without console errors at base /ageborn/.`

const LENSES = [
  { key: 'rules', prompt: 'Lens: RULES. Play several matches through Playwright using the ?dev=1&autopilot=1 flag (add it if missing, per B13/WP12) or by scripting clicks. Compare what happens with DESIGN A2 and the C5 checklist items 8-23. Log every mismatch, then fix it with a unit test.' },
  { key: 'feel', prompt: 'Lens: FEEL AND READABILITY. Take screenshots at key moments (spawn, first clash, big fight, evolve, power, base damage, victory) on desktop 1280x720 and phone landscape 844x390. Judge them against A11, A12 and pillar 5 (readable chaos). Fix unreadable units, missing juice, bad layout, overlapping HUD, ugly placeholder art. The owner will judge the game by how it looks and feels in the first minute.' },
  { key: 'robustness', prompt: 'Lens: ROBUSTNESS AND PERFORMANCE. Run 20 bot-vs-bot Full Wars at 2x speed headless in the browser and check: no console errors, no stuck matches, no memory growth, frame time within B16 on the 80-unit sandbox, pause/resume and tab-hide work, restart works repeatedly. Fix what fails.' },
]

phase('Integrate')
const integrated = await agent(INTEGRATE, { label: 'integrate:battle', phase: 'Integrate' })

phase('Playtest')
const tests = await parallel(LENSES.map((l) => () =>
  agent(`${COMMON}\n\nYOUR TASK: automated playtest of the integrated battle. ${l.prompt}\nOther playtest agents with different lenses run at the same time and may edit files too: keep your fixes small and focused, re-read a file right before editing it, and rerun the tests you touch.\n\nIntegration report:\n${integrated ?? '(missing)'}`,
    { label: `playtest:${l.key}`, phase: 'Playtest' })))

phase('Ship')
const shipped = await agent(`${COMMON}

YOUR TASK: ship Checkpoint A/B.
1. Run npm run typecheck, npm run lint, npm test and npm run build. Fix any failure.
2. Update docs/PROGRESS.md (newest first): what works, known issues, and what the owner should try.
3. git add -A, commit "Phase 2a: playable battle" ending with the line Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>, push to origin main (or the current branch if main is not allowed; report which).
4. Write a short Danish message for the owner (5-10 lines, plain language): the play link https://simnyborg.github.io/ageborn/ (note the deploy takes a couple of minutes), what to try, and which feedback is most useful right now (is the battle fun, readable, too fast or slow).

Playtest reports:
${tests.map((t, i) => `--- ${LENSES[i].key} ---\n${t ?? '(missing)'}`).join('\n\n')}`, { label: 'ship:battle', phase: 'Ship' })

return { integrated, tests, shipped }
