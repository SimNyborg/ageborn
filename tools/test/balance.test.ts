import { describe, expect, it } from 'vitest';
import { content } from '../../src/content';
import { balanceDefaults, balanceJobs, damagePerGold, mirrorChecks, mirrorStats, pairScores, runBalance, selectTests } from '../balance';
import type { JobResult } from '../lib/jobs';
import type { MatchSummary, SideStats } from '../lib/metrics';

function side(o: Partial<SideStats> = {}): SideStats {
  return {
    evolveTicks: [],
    ageUpTicks: {},
    kills: { unit: 0, turret: 0, power: 0, lastStand: 0, ability: 0, decay: 0, other: 0 },
    lost: 0,
    trained: {},
    spent: {},
    damage: {},
    baseDamage: 0,
    powers: {},
    rejected: {},
    treasury: 0,
    research: [],
    researchGold: 0,
    researchDone: 0,
    goldEarned: 0,
    stanceChanges: 0,
    lastStandFired: false,
    maxUnitsAlive: 0,
    ...o,
  };
}

function summary(o: Partial<MatchSummary> = {}): MatchSummary {
  return { seed: 1, format: 'full', winner: 0, reason: 'baseDestroyed', ticks: 8400, finalBell: false, baseHpBp: [5000, 0], hash: 1, sides: [side(), side()], firstClashTick: 260, contact: { samples: 0, middle: 0 }, ...o };
}

const SHORT_CHECKS = ['mirror.short.median', 'mirror.short.window', 'mirror.short.finalBell', 'mirror.short.firstClash', 'info.short.contactMiddle', 'mirror.short.researchShare', 'info.short.researchItems'];

describe('balance jobs (A2.14)', () => {
  const o = { ...balanceDefaults('smoke'), pairsPerCard: 3, mirrorMatches: 2, workers: 0 };
  const tests = selectTests(content, ['sabertooth', 'bonker']);
  const jobs = balanceJobs(content, o, tests);

  it('uses the smoke and full sizes of A2.14', () => {
    expect(balanceDefaults('full')).toMatchObject({ pairsPerCard: 1000, bound: 3, tier: 5, level: 7 });
    expect(balanceDefaults('smoke')).toMatchObject({ pairsPerCard: 200, bound: 6 });
  });

  it('plays the Balanced mirror in Short and Standard War (Full at gates) and mirrored pairs per non-baseline card', () => {
    // A18.3.4: Short and Standard on every run, Full War only at gates
    expect(balanceDefaults('full').mirrorFormats).toEqual(['short', 'standard', 'full']);
    expect(jobs.filter((j) => j.tag === 'mirror.full')).toHaveLength(0);
    expect(jobs.filter((j) => j.tag === 'mirror.standard')).toHaveLength(2);
    expect(jobs.filter((j) => j.tag === 'mirror.short').every((j) => j.format === 'short')).toBe(true);
    expect(jobs.filter((j) => j.tag === 'card.bonker')).toHaveLength(0);
    const card = jobs.filter((j) => j.tag === 'card.sabertooth');
    expect(card).toHaveLength(6);
    for (const seed of [1, 2, 3]) {
      const pair = card.filter((j) => j.seed === seed);
      expect(pair.map((j) => j.subject).sort()).toEqual([0, 1]);
      for (const j of pair) expect(j.plans[j.subject as 0 | 1].stone?.units).toContain('sabertooth');
    }
    expect(jobs.every((j) => j.level === 7 && j.seats.every((s) => s.kind === 'bot' && s.tier === 5))).toBe(true);
    expect(jobs.map((j) => j.id)).toEqual(jobs.map((_, i) => i));
  });
});

describe('balance analysis', () => {
  it('scores mirrored pairs per seed', () => {
    const r = (seed: number, subject: 0 | 1, winner: 0 | 1 | null): JobResult => ({ id: 0, tag: 'c', subject, ms: 1, summary: summary({ seed, winner }) });
    expect(pairScores([r(1, 0, 0), r(1, 1, 0), r(2, 0, null), r(2, 1, 1)])).toEqual([0.5, 0.75]);
  });

  it('summarises a mirror: lengths, Final Bell, evolves, first mover and turret share', () => {
    const kills = (turret: number, unit: number) => ({ unit, turret, power: 0, lastStand: 0, ability: 0, decay: 0, other: 0 });
    const ms = [
      summary({ ticks: 20 * 800, winner: 0, sides: [side({ evolveTicks: [1200, 2500], kills: kills(3, 7) }), side({ evolveTicks: [1300] })] }),
      summary({ ticks: 20 * 1100, winner: null, finalBell: true, reason: 'finalBell', sides: [side({ evolveTicks: [1000] }), side({ kills: kills(1, 9) })] }),
    ];
    const s = mirrorStats('full', ms);
    expect(s.medianSec).toBe(950);
    expect(s.finalBellPct).toBe(50);
    // A18.3.4: the Full War band is 12:00-17:00
    expect(s.withinWindowPct).toBe(50);
    expect(s.evolveMedianSec[0]).toBe(60);
    expect(s.evolveMedianSec[1]).toBe(125);
    // A18.3.1 stays: 0:00 → 1st evolve, then evolve to evolve
    expect(s.stayMedianSec[0]).toBe(60);
    expect(s.stayMedianSec[1]).toBe(65);
    expect(s.firstMover.value).toBe(75);
    expect(s.turretSharePct).toBe(20);
  });

  it('a mirror of too few matches or evolves cannot pass a target (A2.14 gating)', () => {
    // On-target numbers in 5 matches: every check is a statistic, so none may pass.
    // A18.3.1 / A18.12: 15:00 and the six stays 1:08, 1:38, 1:42, 1:48, 1:52, 1:58 (evolves pooled)
    const evolveTicks = [68, 166, 268, 376, 488, 606].map((x) => 20 * x);
    const side0 = side({ evolveTicks, researchGold: 2_000_000, goldEarned: 10_000_000 });
    const onTarget = (): MatchSummary => summary({ ticks: 20 * 900, sides: [side0, side0] });
    const few = mirrorChecks(mirrorStats('full', Array.from({ length: 5 }, onTarget)));
    const gated = ['mirror.full.median', 'mirror.full.window', 'mirror.full.finalBell', 'mirror.full.researchShare', 'mirror.full.evolveLead',
      ...[1, 2, 3, 4, 5, 6].map((n) => `mirror.full.stay${n}`), ...[2, 3, 4, 5, 6].map((n) => `mirror.full.stay${n}.min`)];
    for (const id of gated) expect(few.find((c) => c.id === id)).toMatchObject({ verdict: 'fail', note: expect.stringMatching(/samples/) });
    const many = mirrorChecks(mirrorStats('full', Array.from({ length: 30 }, onTarget)));
    for (const id of gated) expect(many.find((c) => c.id === id)?.verdict, id).toBe('pass');
  });

  it('every format has its own band (A18.3.4: 5:30-8:30, 8:30-12:30, 12:00-17:00)', () => {
    expect(mirrorStats('short', [summary({ ticks: 20 * 270 })]).withinWindowPct).toBe(0);
    expect(mirrorStats('short', [summary({ ticks: 20 * 400 })]).withinWindowPct).toBe(100);
    expect(mirrorStats('standard.bronze', [summary({ ticks: 20 * 600 })]).withinWindowPct).toBe(100);
    expect(mirrorChecks(mirrorStats('short', [summary()])).map((c) => c.id)).toEqual(SHORT_CHECKS);
  });

  it('gates the Final Bell per format (A16.5) and the first clash (A17.14), and reports the contact point', () => {
    const bell = (n: number, format: 'short' | 'full'): MatchSummary[] =>
      Array.from({ length: 40 }, (_, i) => summary({ format, finalBell: i < n, firstClashTick: 20 * 13, contact: { samples: 10, middle: 4 } }));
    const verdict = (ms: MatchSummary[], id: string) => mirrorChecks(mirrorStats(ms[0]?.format ?? 'short', ms)).find((c) => c.id === id);
    expect(verdict(bell(4, 'short'), 'mirror.short.finalBell')?.verdict).toBe('pass');
    expect(verdict(bell(5, 'short'), 'mirror.short.finalBell')?.verdict).toBe('fail');
    expect(verdict(bell(2, 'full'), 'mirror.full.finalBell')?.verdict).toBe('pass');
    expect(verdict(bell(3, 'full'), 'mirror.full.finalBell')?.verdict).toBe('fail');
    expect(verdict(bell(0, 'short'), 'mirror.short.firstClash')?.verdict).toBe('pass');
    expect(mirrorStats('short', bell(0, 'short')).contactMiddlePct).toBe(40);
  });

  it('computes damage per gold per card', () => {
    const ms = [summary({ sides: [side({ damage: { bonker: 10_000 }, spent: { bonker: 50 } }), side({ damage: { bonker: 5_000 }, spent: { bonker: 50 } })] })];
    expect(damagePerGold(content, ms)).toEqual([{ card: 'bonker', age: 'stone', damage: 150, gold: 100, perGold: 1.5 }]);
  });
});

describe('runBalance', () => {
  it('produces a complete report on a tiny run', async () => {
    const r = await runBalance({ ...balanceDefaults('smoke'), cards: ['meteor_shower', 'pebbler'], pairsPerCard: 1, mirrorMatches: 1, scenarios: false, workers: 0 });
    const ids = r.checks.map((c) => c.id);
    expect(ids).not.toContain('mirror.full.median');
    expect(ids).toContain('mirror.short.finalBell');
    expect(ids).toContain('mirror.standard.median');
    expect(ids).toContain('mirror.standard.finalBell');
    expect(ids).toContain('card.meteor_shower');
    expect(ids).not.toContain('card.pebbler');
    expect(r.checks.find((c) => c.id === 'card.meteor_shower')?.verdict).toBe('fail');
    expect(r.data.cards.find((c) => c.card === 'pebbler')?.inBaseline).toBe(true);
    // One mirror match each in Short and Standard War (Full only at gates), plus the card's two.
    expect(r.data.matches).toBe(4);
    expect(r.data.mirrors).toHaveLength(2);
    expect(r.tool).toBe('balance');
  }, 60_000);
});
