import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { playedResults, playJobSafely, type MatchJob } from '../lib/jobs';
import { loadBots } from '../lib/modules';
import { crashCheck } from '../report';
import { baselinePlan } from '../lib/plans';
import { runJobs } from '../lib/runner';

function jobs(): MatchJob[] {
  const plan = baselinePlan(content);
  return [5, 6, 7].map((seed, i) => ({
    id: i,
    tag: `t${i}`,
    seed,
    format: 'short',
    level: 7,
    plans: [plan, plan],
    seats: [
      { kind: 'proxy', proxy: 'balanced' },
      { kind: 'proxy', proxy: i === 1 ? 'cheap_spam' : 'balanced' },
    ],
    subject: 0,
    maxTicks: 600,
  }));
}

describe('runJobs (DESIGN B12 worker_threads)', () => {
  it('returns results in job order in process', async () => {
    const r = await runJobs(jobs(), { workers: 0 });
    expect(r.results.map((x) => x.id)).toEqual([0, 1, 2]);
    expect(r.results.every((x) => x.summary.ticks === 600)).toBe(true);
    expect(r.botSource).toMatch(/src\/ai|fallback/);
  });

  it('gives identical summaries on a worker pool', async () => {
    const inline = await runJobs(jobs(), { workers: 0 });
    let progress = 0;
    const pooled = await runJobs(jobs(), { workers: 2, onProgress: (d) => (progress = d) });
    expect(progress).toBe(3);
    expect(pooled.results.map((x) => x.summary)).toEqual(inline.results.map((x) => x.summary));
    expect(pooled.botSource).toBe(inline.botSource);
  }, 60_000);

  it('turns a crashing match into a reported error instead of aborting the run', async () => {
    const bots = await loadBots();
    const broken = { ...(jobs()[0] as MatchJob), format: 'nope' as never };
    const r = playJobSafely(broken, bots);
    expect(r.error).toBeDefined();
    expect(playedResults([r])).toEqual([]);
    const check = crashCheck('run.crashes', [r]);
    expect(check.verdict).toBe('fail');
    expect(check.value).toBe('1 of 1');
  });

  it('handles an empty batch', async () => {
    expect((await runJobs([], { workers: 4 })).results).toEqual([]);
  });
});
