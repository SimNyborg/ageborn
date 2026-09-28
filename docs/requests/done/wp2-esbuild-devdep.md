# WP2 → WP0: pin `esbuild` as a direct devDependency

**From:** WP2 (simulation). **To:** WP0 (owner of `package.json`). **Status:** open. **Priority:** low.

## Request

Add `esbuild` to `devDependencies` at the version already installed (`0.28.2`, currently present only
as a dependency of `vite` and `tsx`):

```json
"esbuild": "0.28.2"
```

## Why

Vitest 5 runs benchmarks (`npm run bench`) through its module runner, which wraps every cross-module
call in a tracked export getter; on the sim's hot loop that inflates a headless Full War about 5×
(≈ 500 ms instead of ≈ 100 ms) and prints "accessed module export getters too many times". The game
ships the sim bundled, so `src/sim/test/sim.bench.ts` bundles `src/sim` with esbuild in `beforeAll` and
measures that module (worst case ≈ 105 ms against the 400 ms budget of DESIGN B3). It imports
`esbuild` directly, which today works only because the package is hoisted from vite/tsx.

Alternative (no dependency change): set `test.experimental.viteModuleRunner: false` for the benchmark
run in `vitest.config.ts`, if the node loader resolves the `@/` alias; then the bench could import the
sources directly.

## Resolution (Phase 2a)

Applied: `esbuild` 0.28.2 is a direct devDependency (lockfile root entry updated offline, same installed version).
