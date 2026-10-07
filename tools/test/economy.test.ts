import { describe, expect, it } from 'vitest';
import type { CardId, Meta } from '../../src/contracts';
import { content, isReleased } from '../../src/content';
import { seedSfc32 } from '../../src/core/rng';
import { ECONOMY_TARGETS, economyChecks, economyDefaults, EconomyRecorder, medianMeasures, questApi, runEconomy, simulateEconomy, syntheticStats, type EconomyMeasures } from '../economy';
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
    // Every collectable card × 4,970 Amber (88 cards = 437,360, A17.13) at 16,000 a day: 88 cards finish on
    // day index 27; a content wave's extra cards push it past the 30 recorded days (null).
    const perCard = content.rarities.upgradeAmber.reduce((a, b) => a + b, 0);
    expect(perCard).toBe(4970);
    const amberDay = Math.ceil((cards.length * perCard) / 16_000) - 1;
    expect(m.amberDoneDay).toBe(amberDay < 30 ? amberDay : null);
    expect(m.allLegendariesDay).toBe(5);
    // Every card but the Legendaries is owned on day 0 here, the Legendaries on day 5; none reaches the cap.
    expect(m.cards100Day).toBe(0);
    expect(m.albumCompleteDay).toBe(5);
    expect(m.maxed50Day).toBeNull();
    expect(m.planL7Day).toBe(12);
    expect(m.collectionMaxedDay).toBeNull();
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
    copiesDoneDay: 220,
    amberDoneDay: 213,
    collectionMaxedDay: 220,
  };

  it('passes the A6.9 table itself', () => {
    expect(economyChecks(onTarget).filter((c) => c.verdict !== 'pass' && c.verdict !== 'info')).toEqual([]);
    expect(economyChecks(onTarget).find((c) => c.id === 'economy.questsPerDay')).toMatchObject({ verdict: 'info', value: '3.00 /day' });
    expect(economyChecks(onTarget).find((c) => c.id === 'economy.dust')).toMatchObject({ verdict: 'info' });
  });

  it('fails outside ±20%, a finish gap of 30 days or more, and milestones never reached', () => {
    const bad = economyChecks({ ...onTarget, perDay: { ...onTarget.perDay, amber: 6300 }, copiesDoneDay: 240, amberDoneDay: 205, planL7Day: null });
    const failed = bad.filter((c) => c.verdict === 'fail').map((c) => c.id);
    expect(failed).toEqual(['economy.amberPerDay', 'economy.planL7', 'economy.finishGap']);
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
    copiesDoneDay: 190,
    amberDoneDay: 143,
    collectionMaxedDay: 200,
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
  }, 120_000);

  it('claims the daily quests of the A6.9 player when src/meta can', async (ctx) => {
    const { meta } = await loadMeta();
    ctx.skip(!meta || !questApi(meta), 'src/meta does not exist yet or exports no claimQuest');
    const m = simulateEconomy(meta as Meta, content, { ...economyDefaults(), days: 6 }).measures([1, 5]);
    expect(m.perDay.quests).toBeGreaterThanOrEqual(2);
  }, 120_000);
});
