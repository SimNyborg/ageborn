/**
 * Cross-engine determinism (DESIGN B13, C4.3; risk table "golden replays on fixture content in Chromium
 * and WebKit from Phase 1"). The sim must give bit-identical results in every JavaScript engine, or
 * replays break and online play is blocked later.
 *
 * `determinism/entry.ts` is bundled once with Vite (the same build the game uses) and the very same code
 * runs in Node and in the browser under test; the golden replays must re-simulate to identical
 * per-second hashes, final hashes and results in both. With the WebKit project enabled
 * (docs/requests/wp12-ci.md) this compares V8 with JavaScriptCore.
 */
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { build, type Rolldown } from 'vite';
import { flowEnabled, requireFlow } from './helpers';

interface EngineRun {
  simVersion: string;
  results: { name: string; ticks: number; finalHash: number; hashes: number[]; outcome: unknown; matchesRecording: boolean; error: string | null }[];
}

const ROOT = path.resolve(import.meta.dirname, '../..');
const GLOBAL = 'AgebornDeterminism';

/** Bundles the entry into one IIFE script that defines `AgebornDeterminism`. */
async function bundle(): Promise<string> {
  const out = await build({
    configFile: false,
    root: ROOT,
    logLevel: 'warn',
    resolve: { alias: { '@': path.join(ROOT, 'src') } },
    build: {
      write: false,
      minify: false,
      sourcemap: false,
      target: 'es2022',
      lib: { entry: path.join(import.meta.dirname, 'determinism', 'entry.ts'), formats: ['iife'], name: GLOBAL, fileName: () => 'determinism.js' },
    },
  });
  const outputs = (Array.isArray(out) ? out : [out]) as Rolldown.RolldownOutput[];
  const chunk = outputs.flatMap((o) => o.output).find((c) => c.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('determinism bundle: no chunk');
  return chunk.code;
}

/** Runs the bundle in this Node process (the reference engine). */
function runInNode(code: string): EngineRun {
  const load = new Function(`${code}\n;return ${GLOBAL};`) as () => { runGolden(): EngineRun };
  return load().runGolden();
}

let code = '';
let node: EngineRun;

test.describe('determinism across engines', () => {
  test.beforeAll(async () => {
    if (!flowEnabled('determinism')) return;
    code = await bundle();
    node = runInNode(code);
  });

  test('the golden replays re-simulate identically in this browser and in Node', async ({ page, browserName }) => {
    requireFlow('determinism');
    test.setTimeout(120_000);
    expect(node.results.length, 'golden replays found').toBeGreaterThanOrEqual(10);
    expect(node.results.filter((r) => r.error !== null)).toEqual([]);
    await page.setContent('<!doctype html><html><head><title>Ageborn determinism</title></head><body></body></html>');
    await page.addScriptTag({ content: code });
    const inBrowser = await page.evaluate((name) => (window as unknown as Record<string, { runGolden(): unknown }>)[name]?.runGolden() ?? null, GLOBAL);
    expect(inBrowser, `${browserName} ran the bundle`).not.toBeNull();
    const b = inBrowser as EngineRun;
    for (const [i, r] of node.results.entries()) {
      expect(r.hashes.length, `${r.name}: per-second hashes in Node`).toBeGreaterThan(10);
      const other = b.results[i];
      expect(other?.name).toBe(r.name);
      expect(other?.hashes, `${r.name}: per-second hashes in ${browserName}`).toEqual(r.hashes);
      expect({ finalHash: other?.finalHash, ticks: other?.ticks, outcome: other?.outcome }, `${r.name} in ${browserName}`).toEqual({ finalHash: r.finalHash, ticks: r.ticks, outcome: r.outcome });
    }
    expect(b.simVersion).toBe(node.simVersion);
  });
});
