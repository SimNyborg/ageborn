# WP12 → WP0: npm scripts for the headless tools (DESIGN B12)

**From:** WP12 (tools). **To:** WP0 (`package.json`). **Status:** open. **Priority:** medium.

## Request

Add to `package.json` `scripts` (the B12 command names; no new dependencies):

```json
"sim": "tsx tools/sim-cli.ts",
"sim:balance": "tsx tools/sim-cli.ts balance",
"sim:exploits": "tsx tools/sim-cli.ts exploits",
"sim:economy": "tsx tools/sim-cli.ts economy",
"sim:drops": "tsx tools/sim-cli.ts drops",
"sim:match": "tsx tools/sim-cli.ts match",
"replay:verify": "tsx tools/sim-cli.ts replay-verify",
"content:csv": "tsx tools/sim-cli.ts csv",
"test:integrity": "vitest run tests/integrity",
"test:tools": "vitest run tools"
```

(`content:counters` is WP1's request in `docs/requests/wp1-package-scripts.md`.)

## Why

DESIGN B12 documents `npm run sim:balance`, `sim:exploits`, `sim:economy`, `sim:drops`,
`replay:verify <file>` and `content:csv -- export|import`, and the CI request
(`docs/requests/wp12-ci.md`) calls them. Until they exist, run the same thing with
`npx tsx tools/sim-cli.ts <command> [flags]` (`npx tsx tools/sim-cli.ts help` lists everything).

## Resolution (Phase 2a)

Applied: the B12 scripts are in `package.json`.
