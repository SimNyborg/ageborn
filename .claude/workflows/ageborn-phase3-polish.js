export const meta = {
  name: 'ageborn-phase3-polish',
  description: 'Ageborn Phase 3: balance tuning loop with the headless sim, polish pass, C5 checklist bug bash; push the v1 release candidate',
  whenToUse: 'After Phase 2b; produces Checkpoint D (v1 release candidate)',
  phases: [
    { title: 'Balance', detail: 'numbers-only tuning loop until A2.14 targets pass' },
    { title: 'Polish', detail: 'visual, feel and audio polish in parallel' },
    { title: 'Bug bash', detail: 'C5 checklist, verify, fix, ship' },
  ],
}

const COMMON = `You are part of the team building Ageborn. The repo root is your current working directory.
Read CLAUDE.md, docs/PROGRESS.md and docs/BUILD_PLAN.md first. docs/DESIGN.md is the single source of truth: use Grep to find sections and Read with offset/limit.
Do not run git commit or git push unless your task says so.
Your final answer is a short plain-text report of what you did, what you verified (with commands), and what is still open.`

const MAX_ROUNDS = 4

phase('Balance')
const rounds = []
for (let i = 0; i < MAX_ROUNDS; i++) {
  const r = await agent(`${COMMON}\n\nYOUR TASK: balance tuning round ${i + 1} of at most ${MAX_ROUNDS} (DESIGN Phase 3, A2.14, B12). You own the numbers in src/content/raw/** and economy only: change numbers, never rules, and never tests/fixtures/content.
1. Run the full balance matrix and the exploit proxies with the tools from WP12 (npx tsx tools/sim-cli.ts ... see tools/ and docs). Use enough matches for stable results but keep a round under ~20 minutes of compute.
2. Compare with every A2.14 target. If all pass, change nothing and answer starting with ALL_TARGETS_PASS.
3. Otherwise change the fewest numbers that move the failing targets, rerun, and log each change with before and after metrics in docs/balance-log.md.
Previous rounds:\n${rounds.map((x, k) => `--- round ${k + 1} ---\n${x}`).join('\n') || '(none)'}`,
    { label: `balance:round${i + 1}`, phase: 'Balance' })
  rounds.push(r ?? '(missing)')
  if (typeof r === 'string' && r.startsWith('ALL_TARGETS_PASS')) break
}
if (!rounds.some((r) => r.startsWith('ALL_TARGETS_PASS'))) log(`Balance targets not all met after ${MAX_ROUNDS} rounds; remaining gaps are in docs/balance-log.md`)

phase('Polish')
const POLISH = [
  { key: 'visuals', prompt: 'Visual polish of units, bases, backdrops, projectiles and effects against A11 and the silhouette/colour rules. Make the procedural art look as good as code-drawn art can: consistent style, outlines, lighting, idle/walk/attack/death clips with anticipation and follow-through. Owns src/visuals/**.' },
  { key: 'feel', prompt: 'Game feel polish against every item of the A12 checklist: hitstop, shake, flash, numbers, particles, evolve sequence, power impacts, base damage, victory. Owns src/render/** and src/ui/hud/**.' },
  { key: 'audio', prompt: 'Audio polish against A13: every sound present and pleasant, mix balance, ducking, music arrangements per age, key lift on evolve. Owns src/audio/**.' },
  { key: 'ui', prompt: 'UI polish of all meta screens and the capsule show: spacing, typography, transitions, empty states, touch targets >= 48 px, phone landscape at 844x390. Owns src/ui/** (not hud) and src/capsule/**.' },
]
const polished = await parallel(POLISH.map((p) => () =>
  agent(`${COMMON}\n\nYOUR TASK: ${p.prompt}\nOther polish agents run at the same time in other folders; stay in yours. Take before/after screenshots with Playwright to check your work. Keep tests green.`,
    { label: `polish:${p.key}`, phase: 'Polish' })))

phase('Bug bash')
const bash = await agent(`${COMMON}\n\nYOUR TASK: run the full DESIGN C5 manual test checklist (items 1-44) as far as it can be automated with Playwright, plus C4 definition of done. For each item record pass/fail with evidence in docs/release-checklist.md. Fix every failure you can, with tests. Items that need a real phone or Safari: mark "needs owner test" with exact steps.`,
  { label: 'bugbash:c5', phase: 'Bug bash' })

const shipped = await agent(`${COMMON}\n\nYOUR TASK: ship the v1 release candidate.\n1. Run npm run typecheck, lint, test, test:e2e and build; fix failures.\n2. Update docs/PROGRESS.md and README.md status.\n3. git add -A, commit "Phase 3: v1 release candidate" ending with the line Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>, push to origin main (or the current branch if main is not allowed; report which).\n4. Write a short Danish message for the owner: the play link, what is new, the items in docs/release-checklist.md that need the owner to test on a phone, and suggested next steps from DESIGN D1.`,
  { label: 'ship:rc', phase: 'Bug bash' })

return { rounds, polished, bash, shipped }
