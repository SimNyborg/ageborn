export const meta = {
  name: 'ageborn-phase2-loop',
  description: 'Ageborn Phase 2b: wire the full meta loop (onboarding, capsules, War Plan, collection, road, quests, save, replays); multi-lens review with adversarial verification; fix; push',
  whenToUse: 'After Phase 2a; produces Checkpoint C (the full v1 loop)',
  phases: [
    { title: 'Wire', detail: 'parallel wiring agents with disjoint areas' },
    { title: 'Review', detail: 'multi-lens review of the whole game' },
    { title: 'Verify', detail: 'adversarial verification of each finding' },
    { title: 'Fix', detail: 'fix confirmed findings, then ship' },
  ],
}

const COMMON = `You are part of the team building Ageborn. The repo root is your current working directory.
Read CLAUDE.md, docs/PROGRESS.md and docs/BUILD_PLAN.md first. docs/DESIGN.md is the single source of truth: use Grep to find sections and Read with offset/limit.
Keep package boundaries and the B2 layering intact. Do not run git commit or git push unless your task says so.
Your final answer is a short plain-text report of what you did, what you verified (with commands), and what is still open.`

const WIRING = [
  { key: 'meta-ui', owns: 'src/ui/** (not hud), src/app/services.ts meta wiring', prompt: 'Wire every meta screen (WP9) to the real meta rules (WP7) and save store (WP8) through app/services: Home, mode select, VS, result with reward staging (tap to skip), War Plan builder with advisor and auto-fill, collection and card detail with upgrades and crafting, Trophy Road, Conquest, profile, settings (volumes, graphics, reduce motion, colourblind presets, export/import), pause. The Quick Battle start screen from Phase 2a is replaced by Home. Read A9, A3, A6, B9, B11.' },
  { key: 'capsules', owns: 'src/capsule/**, capsule parts of src/app/**', prompt: 'Wire the capsule and Wardrobe show (WP10) to meta.openCapsule and meta.openWardrobe. Results persist before the animation starts (reload mid-animation shows the same result). Odds sheet with bag state and pity counters. Open all. Equip now. Read A10, A6.4, A6.5, C5 items 24-37.' },
  { key: 'onboarding', owns: 'src/tutorial/**, tutorial parts of src/app/**', prompt: 'Make the A8 onboarding work end to end for a fresh profile: match 1 scripted vs Grogg reaching the Future age, hints (<= 8 words, each once), staged unlocks (stance in match 4, Last Stand in match 5), the scripted capsules 1-5 including the Matriarch walkout. Read A8, A6.5, C5 items 1-7.' },
  { key: 'modes-replays', owns: 'src/app/screens/replay/**, ladder/conquest/daily/skirmish wiring in src/app/**', prompt: 'Wire ladder with the format picker and trophies, Conquest, Skirmish (with standard levels) and the Daily Challenge with modifiers; opponent picking per A6.8 with AI labels everywhere (A7.1); replay recording of the last 20 matches and the replay viewer with identical outcomes. Read A6.3, A6.8, A6.10, A7.1, A9.1, B11.' },
]

const LENSES = [
  { key: 'rules-meta', prompt: 'Lens: META RULES. Compare the running game and src/meta against A6 and C5 items 24-37 (rewards, charges, bag odds, pity, foil, upgrades, Dust, quests, road, Conquest, MMR).' },
  { key: 'honesty', prompt: 'Lens: HONESTY AND SAFETY. No real money anywhere, odds and pity visible and correct, AI labels on every surface in A7.1, no dark patterns (fake timers, misleading odds, forced waits beyond the design), no external requests, no use of the name "Age of War".' },
  { key: 'first-session', prompt: 'Lens: FIRST SESSION UX. Play a fresh profile for the first 3 matches and 5 capsules with Playwright on desktop and phone landscape. Is it clear, fast (C5 item 1 timings), exciting, free of dead ends and confusing screens?' },
  { key: 'durability', prompt: 'Lens: DURABILITY AND DETERMINISM. Save survives reload, corrupt slot and export/import; replays reproduce outcomes; determinism across runs; no console errors across a 30-minute automated session.' },
]

const FINDINGS = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: {
  title: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
  evidence: { type: 'string' }, where: { type: 'string' }, designRef: { type: 'string' } },
  required: ['title', 'severity', 'evidence', 'where'] } } }, required: ['findings'] }
const VERDICT = { type: 'object', properties: { real: { type: 'boolean' }, reason: { type: 'string' } }, required: ['real', 'reason'] }

phase('Wire')
const wired = await parallel(WIRING.map((w) => () =>
  agent(`${COMMON}\n\nYOUR TASK (${w.key}): ${w.prompt}\nYou mainly own: ${w.owns}. Three other wiring agents work at the same time on other areas; re-read shared files (for example src/app/services.ts) right before editing and keep edits small there.\nFinish with npm run typecheck, lint and test green for your areas, and add e2e steps to tests/e2e where B13 lists them.`,
    { label: `wire:${w.key}`, phase: 'Wire' })))

const integrated = await agent(`${COMMON}\n\nYOUR TASK: integration pass after the four wiring agents. Make npm run typecheck, lint, test, test:e2e (Chromium at least) and build all pass for the whole tree. Resolve conflicts between the wiring agents' edits.\n\nReports:\n${wired.map((w, i) => `--- ${WIRING[i].key} ---\n${w ?? '(missing)'}`).join('\n\n')}`,
  { label: 'wire:integrate', phase: 'Wire' })

phase('Review')
const confirmed = []
await pipeline(
  LENSES,
  (l) => agent(`${COMMON}\n\nYOUR TASK: review the whole game. ${l.prompt}\nDo not fix anything. Return concrete findings with evidence (steps, screenshots paths, file:line) and the DESIGN reference.`,
    { label: `review:${l.key}`, phase: 'Review', schema: FINDINGS }),
  (res, l) => parallel((res?.findings ?? []).filter((f) => f.severity !== 'minor' || l.key === 'honesty').map((f) => () =>
    agent(`${COMMON}\n\nTry to REFUTE this finding. Reproduce it or check the code. If it is not real, not a deviation from DESIGN, or already fixed, answer real=false. Default to real=false when you cannot reproduce it.\n\nFinding: ${JSON.stringify(f)}`,
      { label: `verify:${l.key}`, phase: 'Verify', schema: VERDICT })
      .then((v) => { if (v?.real) confirmed.push({ ...f, lens: l.key }) }))),
)
log(`${confirmed.length} confirmed findings`)

phase('Fix')
const fixed = confirmed.length ? await agent(`${COMMON}\n\nYOUR TASK: fix every confirmed finding below, blockers first, each with a test where possible. Then run npm run typecheck, lint, test, test:e2e and build.\n\n${JSON.stringify(confirmed, null, 1)}`,
  { label: 'fix:findings', phase: 'Fix' }) : 'no confirmed findings'

const shipped = await agent(`${COMMON}\n\nYOUR TASK: ship Checkpoint C.\n1. Run all checks; fix failures.\n2. Update docs/PROGRESS.md.\n3. git add -A, commit "Phase 2b: full v1 loop" ending with the line Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>, push to origin main (or the current branch if main is not allowed; report which).\n4. Write a short Danish message for the owner: the play link https://simnyborg.github.io/ageborn/, what is new, what to try, and which feedback helps most.`,
  { label: 'ship:loop', phase: 'Fix' })

return { wired, integrated, confirmed, fixed, shipped }
