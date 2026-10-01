import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import type { JobResult } from '../lib/jobs';
import { matchTickCap } from '../lib/jobs';
import type { MatchSummary } from '../lib/metrics';
import { LBS_PROXIES, endStep, lbsDefaults, lbsJobs, lengthStats, runLbs, stepTicks } from '../lbs';
import { STRATEGIES } from '../proxies';

function result(ticks: number, winner: 0 | 1 | null, o: { reason?: MatchSummary['reason']; subject?: 0 | 1 | null; seed?: number } = {}): JobResult {
  const summary = { seed: o.seed ?? 1, format: 'last', winner, reason: o.reason ?? (winner === null ? 'bothDestroyed' : 'baseDestroyed'), ticks } as MatchSummary;
  return { id: 0, tag: 'mirror', subject: o.subject ?? null, summary, ms: 100 };
}

describe('sim-cli lbs (A2.10.1)', () => {
  const ticks = stepTicks(content, 'last');

  it('reads the schedule in ticks and caps matches at endByMs + 2:00', () => {
    expect(ticks).toEqual([17400, 20400, 23400, 26400, 29400]);
    expect(stepTicks(content, 'full')).toEqual([]);
    expect(matchTickCap(content, 'last')).toBe(31900 + 2400);
    expect(matchTickCap(content, 'full')).toBe(24000);
  });

  it('names the step a war ended in', () => {
    expect([0, 17399, 17400, 20400, 26399, 26400, 31000].map((t) => endStep(ticks, t))).toEqual([0, 0, 1, 2, 3, 4, 5]);
  });

  it('summarises lengths: quantiles, wars past endByMs, draws, Crumble share, side wins', () => {
    const rs = [result(12000, 0), result(24000, 1), result(27000, null), result(30000, 0), result(34300, null, { reason: 'timeout' })];
    const l = lengthStats(rs, ticks, 31900, 4);
    expect(l.matches).toBe(5);
    expect(l.unfinished).toBe(1);
    expect(l.pastEndBy).toBe(1);
    expect(l.draws).toBe(1);
    expect(l.endedIn).toEqual([1, 0, 0, 1, 1, 2]);
    expect(l.crumblePct).toBe(40);
    expect(l.sideWins).toEqual([2, 1]);
    expect(l.maxSec).toBe(34300 / 20);
    expect(l.longest?.reason).toBe('timeout');
  });

  it('builds a mirror and paired proxy rows; idle plays tier 0', () => {
    const o = { ...lbsDefaults('smoke'), mirrorMatches: 4, proxyMatches: 2, proxies: ['turret_turtle', 'idle'] as const, workers: 0 };
    const jobs = lbsJobs(content, { ...o, proxies: [...o.proxies] });
    expect(jobs.filter((j) => j.tag === 'mirror')).toHaveLength(4);
    const idle = jobs.filter((j) => j.tag === 'proxy.idle');
    expect(idle.map((j) => j.subject)).toEqual([0, 1]);
    expect(idle.every((j) => j.seats.some((s) => s.kind === 'bot' && s.tier === 0))).toBe(true);
    expect(jobs.every((j) => j.format === 'last')).toBe(true);
    for (const p of LBS_PROXIES) expect(STRATEGIES[p], p).toBeDefined();
  });

  it('plays a real tier VII mirror war to a fallen base before endByMs', async () => {
    const r = await runLbs({ ...lbsDefaults('smoke'), mirrorMatches: 1, proxyMatches: 0, proxies: [], workers: 0 });
    const m = r.data.mirror;
    expect(m?.matches).toBe(1);
    expect(m?.unfinished).toBe(0);
    expect(m?.pastEndBy).toBe(0);
    expect(r.checks.find((c) => c.id === 'lbs.crashes')?.verdict).toBe('pass');
  }, 60_000);
});
