# Headless tools (DESIGN B12)

Node tools that play the real simulation without a browser. They run with `tsx`:

```sh
npx tsx tools/sim-cli.ts help
```

| Command | Does | Targets |
|---|---|---|
| `balance [--mode smoke\|full]` | Balanced mirror in Full, Standard and Short War (length and window per format, Final Bell ≤ 10% Short / ≤ 5% Full, Standard reported, evolves, first-mover, first clash 0:11-0:16, contact between the turret covers), then mirrored-seed matches of every non-baseline card's test plan vs the baseline plan (tier V Balanced, L7), plus the base time-to-kill and power-damage scenarios. Power rework: per format the power share of gold (8-16%) and of enemy value killed (5-12%), the per-cast army share (p50 ≤ 40% of an army worth ≥ 750), the largest cast (p99 ≤ 350), casts per age (median 1.5-3.5), value per gold, the static family budgets (`powerBudget`), and situational setups for Flak (vs an air Epic plan) and Suppress (vs `turret_turtle`) | A2.14, A16.5, A17.14, A2.9.12 |
| `exploits [--mode smoke\|full] [--formats short,full]` | The scripted exploit proxies (`proxies.ts`: the eight B12 ones plus random spam and mono Heavy spam; `mono_ranged` and `mono_antiair` on request) vs the tier VII Balanced bot at L7, in Short and Full War, with the Final Bell share per row. Gates: cheapest spam ≤ 20%, random spam ≤ 15%, mono ≤ 35%, turtle 35-45% and ≤ 50% at the Bell, others ≤ 55% | A2.14, A16.5 |
| `exploits` power rows (power rework, A2.9.12) | Also plays the power proxies: `power_hoarder` (holds both slots for a big clump; ≤ 40%, ≤ 20% at the Bell), `home_turtle` (turtles behind its Home power; turtle band), `power_spam`, `drop_spam`, `runner_reach` (≤ 45%), and the paired rows `no_power` vs a Balanced player (loses 60-80%), `bait_wave` minus `plain_wave` vs `power_hoarder` (+5 to +20 points) and vs tiers V and VII (reported), and `gate_sniper` (reported). `--no-power-rows` skips the paired rows | A2.9.12 |
| `exploits` per-age lane gate (Heavy counter review, 2026-09-30) | In every one-age window `w1.<age>`: `mono_heavy` wins ≤ 35% vs tier VII and `mono_antiheavy` wins ≥ 70% vs `mono_heavy` (40 matches per row and age in smoke, 80 in full). The aggregate rows and the counter-matrix duels passed while Industrial failed on the lane, so the lane is gated per age. `--no-lane` skips it, `--lane-matches N` sizes it | A2.6, A7.2 |
| `strength [--mode smoke\|full] [--tiers 2,4,6,8,10] [--proxies a,b] [--pairs N]` | AI tiers vs the human-like scripted strategies (cheapest spam, a few soldiers then evolve, balanced, turtle, rush, and the skilled Save-and-counter) in Short, Standard and Full War, plus adjacent tiers head to head. Gates: tiers VIII+ beat every simple strategy ≥ 80%, tier II loses to Save-and-counter, the mean rises with every tier, the higher tier of each pair wins ≥ 60% | owner feedback 2026-09-28 |
| `economy [--formats mixed\|short,full,...] [--plan-days 548]` | 365-day engaged-player model through the meta rules (7 ladder matches a day at 60%, each claiming a ready Sundial Capsule; a casual 3-match player reported; road, quests claimed through the meta package's `claimQuest`). The Amber gate (2026-10-07): at the end of each day, the Amber every copy-ready upgrade would cost; gates the share of Amber-blocked days, the day-7 backlog, the first War Plan's day-7 level, the whole collection at about 3.5 years (projected past the run from the last 60 days of income) and Amber finishing at least 30 days after the copies. The years-long curve (2026-10-07) adds a War-Plan-only player (levels only its War Plan, 548 days; `--plan-days N`, 0 skips): Amber-blocked on at least 75% of days 10-364, an upgrade to L10 at least 3 days of income, no upgrade above 14 days, the whole War Plan at L10 in 12-18 months; its casual twin is reported. `--formats mixed` cycles 3 Short, 2 Standard, 1 Long and 1 No clock a day | A6.9 |
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
