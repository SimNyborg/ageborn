/**
 * Fort gates (DESIGN A16.14.9): the plans keep the Fort slot, the row set pairs every row with its base,
 * a forced fort job really places forts, and the paired analysis reads Bell and score differences.
 */
import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { analyzeForts, cardFormats, fortChecks, fortJobs, fortRows, fortsDefaults } from '../forts';
import { fortCardOf, planWithForts, playFortJob, type FortResult } from '../lib/fortMatch';
import { baselinePlan, clonePlan, sideConfig } from '../lib/plans';

describe('fort plans', () => {
  it('cloneLoadout and sideConfig keep the Fort slot', () => {
    const plan = planWithForts(content, baselinePlan(content), 'camp');
    expect(clonePlan(plan).stone?.fort).toBe(fortCardOf(content, 'stone', 'camp'));
    expect(sideConfig(content, plan, { level: 7, label: 'AI', isBot: true }).loadouts.cosmic?.fort).toBe(fortCardOf(content, 'cosmic', 'camp'));
    expect(planWithForts(content, baselinePlan(content), 'none').stone?.fort).toBeNull();
  });
});

describe('fort rows (A16.14.9)', () => {
  it('every gated row has its paired base, and the card rows play every one-age window', () => {
    const rows = fortRows({ ...fortsDefaults('smoke'), groups: ['placebo', 'mirror', 'forced', 'turtle', 'hold', 'runner', 'card'] });
    const tags = new Set(rows.map((r) => r.tag));
    for (const r of rows) if (r.base) expect(tags.has(r.base), r.tag).toBe(true);
    expect(cardFormats(content)).toHaveLength(8);
    const jobs = fortJobs({ ...fortsDefaults('smoke'), groups: ['card'], kinds: ['camp'], cardMatches: 2, workers: 1 }, content);
    // wall and camp rows, 8 windows, 1 seed in both seat orders
    expect(jobs).toHaveLength(2 * 8 * 2);
  });

  it('a forced fort job places forts and reports them', () => {
    const r = playFortJob(
      { id: 0, tag: 'forced.wall@short', seed: 3, format: 'short', level: 7, seats: [{ kind: 'bot', tier: 7, generalId: 'echo', rules: ['rule:fortForce:safe'] }, { kind: 'bot', tier: 7, generalId: 'echo' }], forts: ['wall', 'none'], subject: 0 },
      content,
    );
    expect(r.error).toBeUndefined();
    expect(r.sides[0].placed).toBeGreaterThan(0);
    expect(r.sides[0].gold).toBeGreaterThan(0);
    expect(r.sides[1].placed).toBe(0);
  }, 60_000);

  it('reads paired Bell and score differences and gates them', () => {
    const res = (tag: string, seed: number, bell: boolean, winner: 0 | 1 | null): FortResult => ({ id: 0, tag, seed, subject: null, winner, bell, ticks: bell ? 10000 : 8000, ms: 0, sides: [0, 1].map(() => ({ placed: 1, gold: 125, destroyed: 0, decayed: 0, levies: 0, bountyGiven: 0, kills: 1, fortKills: 0 })) as FortResult['sides'] });
    const base = [1, 2, 3, 4].map((s) => res('mirror.none@short', s, false, 0));
    const wall = [1, 2, 3, 4].map((s) => res('forced.wall@short', s, s === 1, 0));
    const data = analyzeForts([...base, ...wall]);
    const d = data.deltas.find((x) => x.tag === 'forced.wall@short');
    expect(d?.dBell.value).toBe(25);
    expect(d?.dMeanSec).toBe(25);
    const checks = fortChecks(data);
    expect(checks.find((c) => c.id === 'forts.forced.wall.short.bell')?.verdict).toBe('fail');
  });
});
