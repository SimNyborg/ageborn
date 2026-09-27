/**
 * Benchmark (DESIGN B13, B3 Performance): a headless Full War must run in ≤ 400 ms on desktop Node.
 * Run with `npm run bench -- src/sim`.
 *
 * The game ships the sim bundled, so the benchmark bundles `src/sim` with esbuild and measures that
 * module. Loading the sources through Vitest's module runner instead wraps every cross-module call in
 * an export getter, which inflates this hot loop several times (see docs/decisions.md, WP2).
 * Vitest 5: `bench` comes from the test context and runs only in the benchmark project.
 */
import { build } from 'esbuild';
import { beforeAll, describe, expect, test } from 'vitest';
import type { ReplayDoc } from '@/contracts';
import type * as Entry from './benchEntry';
import { recordStress, stressConfig } from './stress';

const BUDGET_MS = 400;

function report(name: string, r: { latency: { mean: number; p99?: number } }): void {
  console.log(`${name}: mean ${r.latency.mean.toFixed(1)} ms (budget ${BUDGET_MS} ms)`);
}
const golden = import.meta.glob<ReplayDoc>('./golden/01-full-balanced-vs-rush.json', { eager: true, import: 'default' });

let sim: typeof Entry;

beforeAll(async () => {
  const src = new URL('.', import.meta.url).pathname;
  const out = await build({
    entryPoints: [`${src}benchEntry.ts`],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    alias: { '@': `${src}../..` },
    logLevel: 'silent',
  });
  const code = out.outputFiles[0]?.text ?? '';
  sim = (await import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(code)}`)) as typeof Entry;
});

describe('headless Full War (budget 400 ms)', () => {
  test('worst case: large armies for 11,400 ticks', async ({ bench }) => {
    const doc = recordStress();
    const content = sim.compileForSim(sim.fixtureRaw);
    const r = await bench('replay worst-case Full War', () => {
      sim.replayMatch(doc, content);
    }).run();
    report('worst-case Full War', r);
    expect(r.latency.mean).toBeLessThan(BUDGET_MS);
  });

  test('golden 01: a full-length Full War', async ({ bench }) => {
    const doc = Object.values(golden)[0];
    if (!doc) throw new Error('golden 01 missing');
    const content = sim.compileForSim(sim.fixtureRaw);
    const r = await bench('replay golden 01', () => {
      sim.replayMatch(doc, content);
    }).run();
    report('golden 01 Full War', r);
    expect(r.latency.mean).toBeLessThan(BUDGET_MS);
  });

  test('idle Full War: the fixed per-tick cost', async ({ bench }) => {
    const content = sim.compileForSim(sim.fixtureRaw);
    const cfg = { ...stressConfig(), content };
    const r = await bench('idle Full War', () => {
      const s = sim.createSim(cfg);
      while (!s.state.outcome) s.step([]);
    }).run();
    report('idle Full War', r);
    expect(r.latency.mean).toBeLessThan(BUDGET_MS);
  });
});
