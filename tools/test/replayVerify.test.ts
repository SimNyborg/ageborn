import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { ReplayDoc } from '../../src/contracts';
import { content } from '../../src/content';
import { buildReplay, createSim } from '../../src/sim';
import { HeadlessMatch } from '../lib/driver';
import { baselinePlan, sideConfig } from '../lib/plans';
import { createProxy } from '../proxies';
import { replayFiles, runReplayVerify, verifyReplayDoc } from '../replayVerify';

const tmp = mkdtempSync(path.join(tmpdir(), 'ageborn-replay-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function record(seed: number): ReplayDoc {
  const plan = baselinePlan(content);
  const sim = createSim({
    seed,
    format: 'short',
    content,
    sides: [sideConfig(content, plan, { level: 3, label: 'Proxy', isBot: false }), sideConfig(content, plan, { level: 3, label: 'Proxy 2', isBot: false })],
  });
  new HeadlessMatch(sim, [
    { side: 0, controller: createProxy('cheap_spam', content, 0, seed, 'short') },
    { side: 1, controller: createProxy('balanced', content, 1, seed, 'short') },
  ]).run();
  return buildReplay(sim);
}

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

  it('verifies the golden replays on the frozen fixture content', () => {
    const files = replayFiles([path.resolve(import.meta.dirname, '../../src/sim/test/golden')]);
    expect(files.length).toBeGreaterThanOrEqual(10);
    const report = runReplayVerify(files.slice(0, 2));
    expect(report.data.results.map((x) => [x.ok, x.content])).toEqual([
      [true, 'fixture'],
      [true, 'fixture'],
    ]);
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
