import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { CompiledContent, ReplayDoc } from '../../src/contracts';
import { content } from '../../src/content';
import { buildReplay, createSim, verifyReplay } from '../../src/sim';
import { HeadlessMatch } from '../lib/driver';
import { baselinePlan, sideConfig } from '../lib/plans';
import { createProxy } from '../proxies';
import { contentCandidates, replayFiles, runReplayVerify, verifyReplayDoc } from '../replayVerify';

const tmp = mkdtempSync(path.join(tmpdir(), 'ageborn-replay-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function record(seed: number, c: CompiledContent = content): ReplayDoc {
  const plan = baselinePlan(c);
  const sim = createSim({
    seed,
    format: 'short',
    content: c,
    sides: [sideConfig(c, plan, { level: 3, label: 'Proxy', isBot: false }), sideConfig(c, plan, { level: 3, label: 'Proxy 2', isBot: false })],
  });
  new HeadlessMatch(sim, [
    { side: 0, controller: createProxy('cheap_spam', c, 0, seed, 'short') },
    { side: 1, controller: createProxy('balanced', c, 1, seed, 'short') },
  ]).run();
  return buildReplay(sim);
}

const fixture = (): CompiledContent => (contentCandidates().find((x) => x.name === 'fixture') as { content: CompiledContent }).content;

describe('replay verification (DESIGN B3, B12)', () => {
  const doc = record(11);

  it('accepts an untouched replay on the game content', () => {
    const r = verifyReplayDoc('a.json', doc);
    expect(r).toMatchObject({ ok: true, content: 'game', firstMismatch: -1, error: null });
    expect(r.finalHash).toBe(doc.finalHash);
  });

  it('detects a changed command stream', () => {
    const cmds = doc.commands.filter((c, i) => !(c.t === 'train' && i > 3));
    const r = verifyReplayDoc('b.json', { ...doc, commands: cmds });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/differs/);
  });

  it('refuses a replay from other content ("from an older version")', () => {
    const r = verifyReplayDoc('c.json', { ...doc, contentHash: 'deadbeef' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/older version/);
    expect(verifyReplayDoc('d.json', { v: 2 }).error).toMatch(/not a ReplayDoc/);
  });

  it('accepts a replay recorded on the frozen fixture content', () => {
    expect(verifyReplayDoc('f.json', record(12, fixture()))).toMatchObject({ ok: true, content: 'fixture', error: null });
  });

  it('re-simulates the golden replays on the fixture content, with the verdict of the sim itself', () => {
    // Whether the golden replays still match is src/sim/test/golden.test.ts's job (WP2); the tool must
    // pick their content and report exactly what the sim reports.
    const files = replayFiles([path.resolve(import.meta.dirname, '../../src/sim/test/golden')]).slice(0, 2);
    expect(files).toHaveLength(2);
    const report = runReplayVerify(files);
    expect(report.data.results.map((x) => x.content)).toEqual(['fixture', 'fixture']);
    files.forEach((f, i) => {
      const sim = verifyReplay(JSON.parse(readFileSync(f, 'utf8')) as ReplayDoc, fixture());
      expect(report.data.results[i]?.ok, f).toBe(sim.ok);
      expect(report.checks[i]?.verdict, f).toBe(sim.ok ? 'pass' : 'fail');
    });
  }, 30_000);

  it('reports unreadable files as failures', () => {
    const bad = path.join(tmp, 'bad.json');
    writeFileSync(bad, '{not json');
    const good = path.join(tmp, 'good.json');
    writeFileSync(good, JSON.stringify(doc));
    const report = runReplayVerify([tmp]);
    expect(report.checks.map((c) => [path.basename(c.id), c.verdict])).toEqual([
      ['replay.bad.json', 'fail'],
      ['replay.good.json', 'pass'],
    ]);
  });
});
