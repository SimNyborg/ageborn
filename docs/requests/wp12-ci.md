# WP12 → WP0: CI stages for tools, e2e and balance

**From:** WP12 (tools, integrity, CI, e2e). **To:** WP0 / integration lead (`.github/workflows/ci.yml` is fixed for agents). **Status:** open. **Priority:** high for `e2e`, medium for the balance jobs.

## Request

Replace `.github/workflows/ci.yml` with the version below (DESIGN C2/WP12: "smoke balance on push; full
balance and exploits via nightly or manual `workflow_dispatch`"; C4.1: `npm run test:e2e` passes in CI).
It uses the npm scripts from `docs/requests/wp12-package-scripts.md`; until those exist, replace
`npm run sim:<x> --` with `npx tsx tools/sim-cli.ts <x>`.

```yaml
name: CI

on:
  push:
    branches: [main, 'claude/**']
  pull_request:
  schedule:
    # Nightly full balance matrix and exploit proxies (DESIGN B12, about 2.5 h on 4 cores).
    - cron: '17 2 * * *'
  workflow_dispatch:
    inputs:
      full_balance:
        description: 'Run the full A2.14 balance matrix, exploits, economy and drops'
        type: boolean
        default: false

jobs:
  check:
    if: github.event_name != 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test            # includes tests/integrity and tools/test
      - run: npm run build
      - name: Bundle size gate
        run: npm run size

  e2e:
    if: github.event_name != 'schedule'
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps chromium webkit
      - run: npm run test:e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7

  # Smoke balance (400 matches per card, ±6; 100 per exploit proxy) on every push. Report-only until
  # Phase 3 tuning makes the A2.14 targets pass: then remove `continue-on-error`.
  balance-smoke:
    if: github.event_name == 'push' || github.event_name == 'pull_request'
    needs: check
    runs-on: ubuntu-latest
    timeout-minutes: 90
    continue-on-error: true
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: npm run sim:balance -- --mode smoke --workers 4
      - if: always()
        run: npm run sim:exploits -- --mode smoke --workers 4
      - if: always()
        run: npm run sim:drops -- --mode smoke
      - if: always()
        run: npm run sim:economy
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: balance-smoke-reports
          path: reports/
          retention-days: 14

  balance-full:
    if: github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.full_balance)
    runs-on: ubuntu-latest
    timeout-minutes: 350
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: npm run sim:balance -- --mode full --workers 4
      - if: always()
        run: npm run sim:exploits -- --mode full --workers 4
      - if: always()
        run: npm run sim:drops -- --mode full
      - if: always()
        run: npm run sim:economy
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: balance-full-reports
          path: reports/
          retention-days: 30
```

### Also: a WebKit project in `playwright.config.ts` (added by the WP12 review)

DESIGN B13 runs the e2e specs in Chromium **and WebKit**, and C4.3 requires "determinism holds across
Chromium and WebKit e2e" (risk table: golden replays in both engines from Phase 1). The root
`playwright.config.ts` (WP0) only has a Chromium project. Please add a WebKit project that is on in CI
and opt-in locally (the cloud session has no WebKit build and must not run `playwright install`):

```ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: /* unchanged */ } },
  ...(process.env['CI'] !== undefined || process.env['PW_WEBKIT'] === '1'
    ? [{ name: 'webkit', use: { ...devices['Desktop Safari'] } }]
    : []),
],
```

`tests/e2e/determinism.spec.ts` bundles the sim with Vite and re-simulates the 10 golden replays in Node
and in each browser; with the WebKit project it compares V8 with JavaScriptCore hash for hash.

## Why

- `npm test` already runs the integrity tests (`tests/integrity`) and the tool tests (`tools/test`);
  they need no extra step.
- The e2e job installs Chromium and WebKit itself (CI runners have no browsers; the cloud session does and must
  not run `playwright install`). The root `playwright.config.ts` builds and previews at `/ageborn/`.
- The balance jobs write `reports/*.md` and `*.json` (git-ignored) and upload them as artifacts.
  Every tool exits non-zero when an A2.14 / A6.9 target fails; the smoke job is non-blocking until
  Phase 3, because the untuned Phase 1 numbers fail most targets by design (see `reports/balance.md`).
- The `schedule` trigger only runs `balance-full`; public-repo Actions minutes are free (CLAUDE.md).
- Use the current major of `actions/upload-artifact` (v4 when this was written), like the other actions.
