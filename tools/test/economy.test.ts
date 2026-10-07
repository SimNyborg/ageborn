import { describe, expect, it } from 'vitest';
import type { CardId, Meta, SaveDoc } from '../../src/contracts';
import { content, isReleased } from '../../src/content';
import { seedSfc32 } from '../../src/core/rng';
import { amberBacklog, ECONOMY_TARGETS, economyChecks, economyDefaults, EconomyRecorder, medianMeasures, planChecks, questApi, runEconomy, simulateEconomy, syntheticStats, type EconomyMeasures } from '../economy';
import { loadMeta } from '../lib/modules';

// The collectable cards the recorder counts: released ones only (an unreleased card never drops).
const cards = [
  ...Object.values(content.units)
    .filter((u) => !u.hidden && isReleased(content, u.id))
    .map((u) => ({ id: u.id, rarity: u.rarity })),
  ...Object.values(content.turrets)
    .filter((t) => isReleased(content, t.id))
    .map((t) => ({ id: t.id, rarity: t.rarity })),
];
const NEED = { common: 153, rare: 130, epic: 44, legendary: 11 } as const;

describe('EconomyRecorder (A6.9 measures)', () => {
  it('measures bag capsules, daily income and finish dates', () => {
    const rec = new EconomyRecorder(content);
    const finish: Record<string, number> = { common: 20, rare: 15, epic: 10, legendary: 25 };
    for (let day = 0; day < 30; day += 1) {
      // Every card gets its copies spread evenly up to its rarity's finish day.
      const stacks = cards.map((card) => {
        const need = NEED[card.rarity];
        const end = finish[card.rarity] as number;
        const upTo = (d: number): number => Math.floor((need * Math.min(d, end)) / end);
        return { card: card.id, copies: upTo(day + 1) - upTo(day) };
      });
      rec.capsule(day, 'road', false, stacks, 0);
      for (let i = 0; i < 4; i += 1) rec.capsule(day, 'win', true, [{ card: 'bonker', copies: 0 }], 200);
      rec.capsule(day, 'daily', false, [], 0);
      for (let i = 0; i < 3; i += 1) rec.quest(day);
      rec.amber(day, 16_000);
      const levels = new Map<CardId, number>(cards.map((card) => [card.id, card.rarity === 'legendary' ? (day >= 5 ? 1 : 0) : day >= 12 ? 7 : 1]));
      rec.snapshot(day, levels, ['bonker', 'pebbler'], content.economy.maxLevel);
    }
    const m = rec.measures([0, 9]);
    expect(m.amberPerBagCapsule).toBe(200);
    expect(m.perDay.win).toBe(4);
    expect(m.perDay.daily).toBe(1);
    expect(m.perDay.clay).toBe(0);
    expect(m.perDay.amber).toBe(16_000);
    expect(m.perDay.quests).toBe(3);
    expect(m.perDay.dust).toBe(0);
    expect(m.maxDay).toEqual({ common: 19, rare: 14, epic: 9, legendary: 24 });
    expect(m.copiesDoneDay).toBe(24);
    // Every collectable card × 20,020 Amber (the years-long curve, 2026-10-07; 4,970 before) at 16,000 a
    // day: past the 30 recorded days, so the finish is projected at the last 60 days' income (16,000).
    const perCard = content.rarities.upgradeAmber.reduce((a, b) => a + b, 0);
    expect(perCard).toBe(20020);
    const amberDay = Math.ceil((cards.length * perCard) / 16_000) - 1;
    expect(m.amberDoneDay).toBe(amberDay < 30 ? amberDay : null);
    expect(m.amberDoneProjected).toBe(amberDay < 30 ? amberDay : 29 + Math.ceil((cards.length * perCard - 30 * 16_000) / 16_000));
    // The copies finish on day 24, so the collection is projected to max when the Amber does.
    expect(m.collectionMaxedProjected).toBe(m.amberDoneProjected);
    expect(m.allLegendariesDay).toBe(5);
    // Every card but the Legendaries is owned on day 0 here, the Legendaries on day 5; none reaches the cap.
    expect(m.cards100Day).toBe(0);
    expect(m.albumCompleteDay).toBe(5);
    expect(m.maxed50Day).toBeNull();
    expect(m.planL7Day).toBe(12);
    expect(m.collectionMaxedDay).toBeNull();
  });
});

describe('the Amber gate (owner feedback 2026-10-07)', () => {
  it('counts the Amber of every upgrade the copies allow, climbing as far as the copies reach', () => {
    const save = {
      collection: {
        // Common L1 with 6 copies: L2 (2 copies, 20 Amber) and L3 (3 copies, 50 Amber); 1 copy left.
        bonker: { level: 1, copies: 6 },
        // Legendary L9 with 2 copies: L10 (2 copies, 12,000 Amber; 1,700 before the years-long curve).
        [cards.find((c) => c.rarity === 'legendary')?.id ?? '']: { level: 9, copies: 2 },
        // Not owned, and an unknown id: never counted.
        pebbler: { level: 0, copies: 40 },
        nope: { level: 1, copies: 99 },
      },
    } as unknown as SaveDoc;
    expect(amberBacklog(save, content)).toBe(20 + 50 + 12_000);
    expect(amberBacklog(save, content, new Set(['bonker']))).toBe(70);
  });

  it('measures blocked days, the backlog in days of income, the bank and the first week', () => {
    const rec = new EconomyRecorder(content);
    rec.starter(['bonker', 'pebbler']);
    for (let day = 0; day <= 30; day += 1) {
      rec.amber(day, 1000);
      // Amber binds from day 3; the backlog grows by 500 a day.
      rec.gate(day, day < 3 ? 2000 : 100, day < 3 ? 0 : (day - 2) * 500);
      rec.snapshot(day, new Map([['bonker', day >= 7 ? 4 : 1], ['pebbler', day >= 7 ? 2 : 1]]), ['bonker'], content.economy.maxLevel);
    }
    const m = rec.measures([0, 30]);
    expect(m.amberGate.blockedShareWeek1).toBeCloseTo(4 / 7, 6);
    expect(m.amberGate.blockedShare).toBeCloseTo(28 / 31, 6);
    // Days 10-364, clipped to the 31 recorded days: 10-30 are all blocked.
    expect(m.amberGate.blockedShareYear).toBe(1);
    expect(m.amberGate.backlogDays.d7).toBeCloseTo(2.5, 6);
    expect(m.amberGate.backlogDays.d30).toBeCloseTo(14, 6);
    expect(m.amberGate.backlogDays.d90).toBeNaN();
    expect(m.amberGate.bankDays).toBeCloseTo(0.1, 6);
    expect(m.starter).toEqual({ level7: 3, plan7: 4, maxed7: 0, maxed30: 0, planMaxDay: null });
    expect(m.planMaxDay).toBeNull();
    expect(m.upgradeCost.maxDays).toBeNaN();
  });

  it('measures each upgrade in days of income when bought and the day the active War Plan is maxed', () => {
    const rec = new EconomyRecorder(content);
    const cap = content.economy.maxLevel;
    for (let day = 0; day <= 20; day += 1) {
      rec.amber(day, 1000);
      if (day === 5) rec.upgrade(day, 7, 800);
      if (day === 10) rec.upgrade(day, cap, 3000);
      if (day === 15) rec.upgrade(day, cap, 5000);
      // The plan changes on day 12 (a turret joins it); the whole active plan is at the cap from day 18.
      const plan = day < 12 ? ['bonker'] : ['bonker', 'pebbler'];
      rec.snapshot(day, new Map([['bonker', day >= 8 ? cap : 1], ['pebbler', day >= 18 ? cap : 1]]), plan, cap);
    }
    const m = rec.measures([0, 20]);
    expect(m.upgradeCost).toEqual({ maxDays: 5, topMedianDays: 4, topMaxDays: 5 });
    expect(m.planMaxDay).toBe(8);
    // The first War Plan (day 0: bonker) is all at the cap on day 8 too.
    expect(m.starter.planMaxDay).toBe(8);
  });
});

describe('economyChecks', () => {
  const T = ECONOMY_TARGETS;
  const onTarget: EconomyMeasures = {
    days: 365,
    copiesPerBagCapsule: T.copiesPerBagCapsule,
    amberPerBagCapsule: T.amberPerBagCapsule,
    perDay: { win: T.sundialCapsulesPerDay, daily: 0, clay: T.clayCapsulesPerDay, copies: T.copiesPerDay, amber: T.amberPerDay, dust: 40, quests: 3 },
    dustTotal: 30_000,
    maxDay: { common: 110, rare: 101, epic: 69, legendary: 112 },
    allLegendariesDay: 21,
    cards100Day: 7,
    albumCompleteDay: 25,
    maxed50Day: 80,
    planL7Day: 42,
    levelMaxDay: { common: 230, rare: 255, epic: 265, legendary: 257 },
    amberGate: { blockedShare: 1, blockedShareWeek1: 0.7, blockedShareYear: 1, backlogDays: { d7: 5.5, d30: 88, d90: 760 }, bankDays: 0.05 },
    starter: { level7: 3.5, plan7: 3.65, maxed7: 0, maxed30: 0, planMaxDay: null },
    planMaxDay: null,
    upgradeCost: { maxDays: 2.3, topMedianDays: Number.NaN, topMaxDays: Number.NaN },
    copiesDoneDay: 220,
    amberDoneDay: null,
    collectionMaxedDay: null,
    amberDoneProjected: 1300,
    collectionMaxedProjected: 1300,
  };
  // The War-Plan-only player on target (owner decision 2026-10-07).
  const planOnTarget: EconomyMeasures = {
    ...onTarget,
    days: 548,
    amberGate: { ...onTarget.amberGate, blockedShare: 0.78, blockedShareWeek1: 0, blockedShareYear: 0.94, bankDays: 0.8 },
    planMaxDay: 410,
    upgradeCost: { maxDays: 5.8, topMedianDays: 4, topMaxDays: 5.8 },
  };

  it('passes the A6.9 table itself', () => {
    expect(economyChecks(onTarget).filter((c) => c.verdict !== 'pass' && c.verdict !== 'info')).toEqual([]);
    expect(economyChecks(onTarget).find((c) => c.id === 'economy.questsPerDay')).toMatchObject({ verdict: 'info', value: '3.00 /day' });
    expect(economyChecks(onTarget).find((c) => c.id === 'economy.dust')).toMatchObject({ verdict: 'info' });
  });

  it('fails outside ±20%, Amber finishing too close to the copies, milestones never reached and a loose Amber gate', () => {
    const bad = economyChecks({ ...onTarget, perDay: { ...onTarget.perDay, amber: 6300 }, copiesDoneDay: 240, amberDoneDay: 250, amberDoneProjected: 250, planL7Day: null });
    const failed = bad.filter((c) => c.verdict === 'fail').map((c) => c.id);
    expect(failed).toEqual(['economy.amberPerDay', 'economy.planL7', 'economy.amberDone', 'economy.amberLag']);
    // A collection that maxes within a year fails the years-long target (owner decision 2026-10-07).
    const fast = economyChecks({ ...onTarget, collectionMaxedDay: 313, collectionMaxedProjected: 313, amberDoneDay: 313, amberDoneProjected: 313 });
    expect(fast.filter((c) => c.verdict === 'fail').map((c) => c.id)).toEqual(['economy.amberDone', 'economy.collectionMaxed']);
    expect(fast.find((c) => c.id === 'economy.collectionMaxed')?.metric).not.toMatch(/projected/);
    expect(economyChecks(onTarget).find((c) => c.id === 'economy.collectionMaxed')?.metric).toMatch(/projected/);
    // The Amber gate (owner feedback 2026-10-07): Amber must bind on most days, the first week stays
    // generous (a day-7 backlog of 1-7 days of income) and the first War Plan keeps its pace.
    const loose = economyChecks({ ...onTarget, amberGate: { ...onTarget.amberGate, blockedShare: 0.5, backlogDays: { d7: 0, d30: 2, d90: 5 } }, starter: { ...onTarget.starter, plan7: 3.0 } });
    expect(loose.filter((c) => c.verdict === 'fail').map((c) => c.id)).toEqual(['economy.amberBlocked', 'economy.week1Backlog', 'economy.week1Plan']);
    const stingy = economyChecks({ ...onTarget, amberGate: { ...onTarget.amberGate, backlogDays: { d7: 9, d30: 60, d90: 200 } } });
    expect(stingy.filter((c) => c.verdict === 'fail').map((c) => c.id)).toEqual(['economy.week1Backlog']);
    expect(bad.find((c) => c.id === 'economy.amberGate')?.verdict).toBe('info');
  });

  it('gates the War-Plan-only player: save up on most days, L10 takes days, no level out of reach, the plan in 12-18 months', () => {
    const ok = planChecks(planOnTarget);
    expect(ok.filter((c) => c.verdict !== 'pass' && c.verdict !== 'info')).toEqual([]);
    // Before the years-long curve: never Amber-blocked, L10 half a day of income, the plan maxed in 7 months.
    const loose = planChecks({ ...planOnTarget, amberGate: { ...planOnTarget.amberGate, blockedShareYear: 0 }, upgradeCost: { maxDays: 0.8, topMedianDays: 0.5, topMaxDays: 0.8 }, planMaxDay: 214 });
    expect(loose.filter((c) => c.verdict === 'fail').map((c) => c.id)).toEqual(['economy.plan.blocked', 'economy.plan.topUpgrade', 'economy.plan.maxed']);
    // Too stingy: an upgrade costing three weeks of income, the plan not maxed in 18 months.
    const stingy = planChecks({ ...planOnTarget, upgradeCost: { maxDays: 21, topMedianDays: 15, topMaxDays: 21 }, planMaxDay: null });
    expect(stingy.filter((c) => c.verdict === 'fail').map((c) => c.id)).toEqual(['economy.plan.maxUpgrade', 'economy.plan.maxed']);
  });
});

describe('medianMeasures (the 30-seed gate)', () => {
  const base: EconomyMeasures = {
    days: 365,
    copiesPerBagCapsule: 16,
    amberPerBagCapsule: 411,
    perDay: { win: 4.8, daily: 0, clay: 1.1, copies: 98, amber: 3030, dust: 40, quests: 3 },
    dustTotal: 30_000,
    maxDay: { common: 110, rare: 101, epic: 69, legendary: 112 },
    allLegendariesDay: 9,
    cards100Day: 7,
    albumCompleteDay: 25,
    maxed50Day: 80,
    planL7Day: 78,
    levelMaxDay: { common: 160, rare: 170, epic: 175, legendary: 170 },
    amberGate: { blockedShare: 1, blockedShareWeek1: 0.14, blockedShareYear: 1, backlogDays: { d7: 0.4, d30: 14, d90: 62 }, bankDays: 0.07 },
    starter: { level7: 3.5, plan7: 3.65, maxed7: 0, maxed30: 0, planMaxDay: 224 },
    planMaxDay: 224,
    upgradeCost: { maxDays: 1, topMedianDays: 0.5, topMaxDays: 1 },
    copiesDoneDay: 190,
    amberDoneDay: 143,
    collectionMaxedDay: 200,
    amberDoneProjected: 143,
    collectionMaxedProjected: 200,
  };

  it('takes the median of every measure; a milestone missed by half the runs is not reached', () => {
    const runs = [
      { ...base, copiesPerBagCapsule: 15, maxDay: { ...base.maxDay, legendary: 100 }, collectionMaxedDay: null },
      { ...base, copiesPerBagCapsule: 17, maxDay: { ...base.maxDay, legendary: 130 }, collectionMaxedDay: null },
      { ...base, copiesPerBagCapsule: 16, maxDay: { ...base.maxDay, legendary: null }, collectionMaxedDay: 210 },
    ];
    const m = medianMeasures(runs);
    expect(m.copiesPerBagCapsule).toBe(16);
    expect(m.maxDay.legendary).toBe(130);
    expect(m.collectionMaxedDay).toBeNull();
    expect(economyDefaults().seeds).toBe(30);
    // The Sundial player (2026-09-30, A6.9): 7 finished ladder matches a day.
    expect(economyDefaults().matchesPerDay).toBe(7);
    // The War-Plan-only player runs 18 months beside the collector (owner decision 2026-10-07).
    expect(economyDefaults().planDays).toBe(548);
  });
});

describe('the engaged player model (A6.7, A6.9)', () => {
  it('plays each format with its evolves and A2.4 final-age time', () => {
    const rng = seedSfc32('stats');
    const short = syntheticStats(content, 'short', true, rng, null);
    const full = syntheticStats(content, 'full', false, rng, 'bonker');
    // A18.3.4: Short War evolves twice (its third age at ~2:55), Full War 6 times (Future at ~10:49); A18 medians
    expect(short).toMatchObject({ evolves: 2, reachedFinalAgeAtMs: 175_000, durationMs: 420_000 });
    expect(full).toMatchObject({ evolves: 6, reachedFinalAgeAtMs: 649_000, durationMs: 900_000, usedLastStand: true, mvpCard: 'bonker' });
    // A third of the matches skip Economy research, so "Win without Economy research" can be done.
    const skipped = Array.from({ length: 300 }, () => syntheticStats(content, 'full', true, rng, null)).filter((s) => !s.usedTreasury).length;
    expect(skipped).toBeGreaterThan(70);
    expect(skipped).toBeLessThan(130);
  });

  it('claims quests through the meta package when it offers claimQuest, and not otherwise', () => {
    const plain = { newSave: () => null } as unknown as Meta;
    expect(questApi(plain)).toBeNull();
    const withQuests = { ...plain, claimQuest: () => ({ ok: false, reason: 'x' }) } as unknown as Meta;
    expect(questApi(withQuests)?.rerollQuest).toBeNull();
  });
});

describe('runEconomy', () => {
  it('skips with a reason until src/meta exists, and otherwise runs through the Meta contract', async () => {
    const { meta } = await loadMeta();
    const r = await runEconomy({ ...economyDefaults(), days: 3, seeds: 1 });
    if (!meta) {
      expect(r.checks.map((x) => x.verdict)).toEqual(['skipped']);
      expect(r.checks[0]?.note).toMatch(/src\/meta/);
      return;
    }
    expect(r.checks.find((x) => x.id === 'economy.run')).toBeUndefined();
    expect(r.data.measures?.days).toBe(3);
    // The casual player (3 matches a day) is reported, never gated.
    expect(r.data.casual?.days).toBe(3);
    expect(r.checks.find((x) => x.id === 'economy.casual')?.verdict).toBe('info');
    // The War-Plan-only player runs (as long as the run, here) and is gated; its casual twin is reported.
    expect(r.data.plan?.days).toBe(3);
    expect(r.checks.find((x) => x.id === 'economy.plan.maxed')).toBeDefined();
    expect(r.checks.find((x) => x.id === 'economy.casualPlan')?.verdict).toBe('info');
  }, 120_000);

  it('claims the daily quests of the A6.9 player when src/meta can', async (ctx) => {
    const { meta } = await loadMeta();
    ctx.skip(!meta || !questApi(meta), 'src/meta does not exist yet or exports no claimQuest');
    const m = simulateEconomy(meta as Meta, content, { ...economyDefaults(), days: 6 }).measures([1, 5]);
    expect(m.perDay.quests).toBeGreaterThanOrEqual(2);
  }, 120_000);
});
