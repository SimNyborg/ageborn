# Headless tools (DESIGN B12)

Node tools that play the real simulation without a browser. They run with `tsx`:

```sh
npx tsx tools/sim-cli.ts help
```

| Command | Does | Targets |
|---|---|---|
| `balance [--mode smoke\|full]` | Balanced mirror in Full, Standard and Short War (length and window per format, Final Bell ≤ 10% Short / ≤ 5% Full, Standard reported, evolves, first-mover, first clash 0:11-0:16, contact between the turret covers), then mirrored-seed matches of every non-baseline card's test plan vs the baseline plan (tier V Balanced, L7), plus the base time-to-kill and power-damage scenarios | A2.14, A16.5, A17.14 |
| `exploits [--mode smoke\|full] [--formats short,full]` | The scripted exploit proxies (`proxies.ts`: the eight B12 ones plus random spam and mono Heavy spam; `mono_ranged` and `mono_antiair` on request) vs the tier VII Balanced bot at L7, in Short and Full War, with the Final Bell share per row. Gates: cheapest spam ≤ 20%, random spam ≤ 15%, mono ≤ 35%, turtle 35-45% and ≤ 50% at the Bell, others ≤ 55% | A2.14, A16.5 |
| `economy` | 365-day engaged-player model through the meta rules (ladder at 60%, Daily Capsule, road, quests claimed through the meta package's `claimQuest`) | A6.9 |
| `drops [--mode smoke\|full]` | Capsule openings through the meta rules: bag totals, chi-square of the published odds, pity boundaries | A6.4, A6.5, C4.5 |
| `replay-verify <file\|dir>...` | Re-simulates replays and compares hashes (the golden replays live in `src/sim/test/golden`) | B3 |
| `csv export\|import [--dry-run]` | Unit, turret and power numbers as CSV in `reports/csv/`; import writes changed numbers back into `src/content/raw` | B4 |
| `match [--p0 bot:echo:5] [--p1 proxy:turret_turtle] [--replay out.json]` | One match with a printed summary, for debugging | - |
| `tools/counters.ts` (WP1) | Regenerates the counter matrix | B4 |

- **Reports.** Every command writes `reports/<tool>.md` (read this) and `reports/<tool>.json`
  (`--out <dir>` to change). `balance` also writes `reports/balance-cards.csv`. `reports/` is git-ignored.
- **Gate.** A command exits 1 when a DESIGN target fails, 0 otherwise (`--no-gate` always exits 0).
  Statistical checks (medians, rates, CIs, evolve and Future times) need at least 30 samples to pass,
  so quick debug runs never look green. Unknown flags are refused, so a typo never starts a
  default-sized run.
- **Sizes.** `--mode smoke` is the CI size (400 matches per card, CI within ±6); `--mode full` is the
  A2.14 size (2,000 per card, ±3; about 2-3 hours on 4 cores). `--matches`, `--mirror`, `--cards a,b`
  and `--proxies a,b` narrow a run.
- **Patches.** `--patch file.json` (balance, exploits) deep-merges a JSON object over the compiled content
  for data-only experiments (A16.4 step 1), for example `{"economy":{"siege":{"ropeDecayBpPerSec":100}}}`.
  Workers inherit it through `AGEBORN_PATCH`; the report's `contentHash` ends in `+<file name>` so a patched
  run never passes for the game.
- **Workers.** Matches run on `worker_threads` (`--workers N`, default cores - 1). Results do not depend on
  the worker count.
- **Packages.** The tools use the contracts only. Without `src/ai` a scripted stand-in bot plays (the
  report says so); without `src/meta`, `economy` and `drops` report "skipped".
- **Browsers.** `tests/e2e/determinism.spec.ts` re-simulates the golden replays in each Playwright
  browser and in Node from one Vite bundle and compares every hash (C4.3: Chromium and WebKit).

Library code lives in `tools/lib/` and tests in `tools/test/` (run with `npx vitest run tools`).
