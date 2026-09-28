import { describe, expect, it } from 'vitest';
import type { CardId, Meta } from '../../src/contracts';
import { content } from '../../src/content';
import { seedSfc32 } from '../../src/core/rng';
import { ECONOMY_TARGETS, economyChecks, economyDefaults, EconomyRecorder, questApi, runEconomy, simulateEconomy, syntheticStats, type EconomyMeasures } from '../economy';
import { loadMeta } from '../lib/modules';

const cards = [
  ...Object.values(content.units)
    .filter((u) => !u.hidden)
    .map((u) => ({ id: u.id, rarity: u.rarity })),
  ...Object.values(content.turrets).map((t) => ({ id: t.id, rarity: t.rarity })),
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
    expect(m.maxDay).toEqual({ common: 19, rare: 14, epic: 9, legendary: 24 });
    expect(m.copiesDoneDay).toBe(24);
    // 88 cards × 4,970 Amber = 437,360 (A17.13): reached on the 28th day (index 27) at 16,000 a day.
    expect(m.amberDoneDay).toBe(27);
    expect(m.allLegendariesDay).toBe(5);
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
    perDay: { win: 4, daily: 1, clay: 0.9, copies: 84, amber: 2975, quests: 3 },
    maxDay: { common: 137, rare: 131, epic: 91, legendary: 137 },
    allLegendariesDay: 14,
    planL7Day: 42,
    copiesDoneDay: 135,
    amberDoneDay: 160,
    collectionMaxedDay: 160,
  };

  it('passes the A6.9 table itself', () => {
    expect(economyChecks(onTarget).filter((c) => c.verdict !== 'pass' && c.verdict !== 'info')).toEqual([]);
    expect(economyChecks(onTarget).find((c) => c.id === 'economy.questsPerDay')).toMatchObject({ verdict: 'info', value: '3.00 /day' });
  });

  it('fails outside ±20%, a finish gap of 30 days or more, and milestones never reached', () => {
    const bad = economyChecks({ ...onTarget, perDay: { ...onTarget.perDay, amber: 3700 }, copiesDoneDay: 130, amberDoneDay: 160, planL7Day: null });
    const failed = bad.filter((c) => c.verdict === 'fail').map((c) => c.id);
    expect(failed).toEqual(['economy.amberPerDay', 'economy.planL7', 'economy.finishGap']);
  });
});

describe('the engaged player model (A6.7, A6.9)', () => {
  it('plays each format with its evolves and A2.4 final-age time', () => {
    const rng = seedSfc32('stats');
    const short = syntheticStats(content, 'short', true, rng, null);
    const full = syntheticStats(content, 'full', false, rng, 'bonker');
    // A17.8: Short War evolves 3 times (Gunpowder at ~2:25), Full War 7 times (Cosmic at ~6:30); A17.2 medians
    expect(short).toMatchObject({ evolves: 3, reachedFinalAgeAtMs: 145_000, durationMs: 285_000 });
    expect(full).toMatchObject({ evolves: 7, reachedFinalAgeAtMs: 390_000, durationMs: 510_000, usedLastStand: true, mvpCard: 'bonker' });
    // A third of the matches skip the Treasury, so "Win without buying Treasury" can be done.
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
    const r = await runEconomy({ ...economyDefaults(), days: 3 });
    if (!meta) {
      expect(r.checks.map((x) => x.verdict)).toEqual(['skipped']);
      expect(r.checks[0]?.note).toMatch(/src\/meta/);
      return;
    }
    expect(r.checks.find((x) => x.id === 'economy.run')).toBeUndefined();
    expect(r.data.measures?.days).toBe(3);
  }, 120_000);

  it('claims the daily quests of the A6.9 player when src/meta can', async (ctx) => {
    const { meta } = await loadMeta();
    ctx.skip(!meta || !questApi(meta), 'src/meta does not exist yet or exports no claimQuest');
    const m = simulateEconomy(meta as Meta, content, { ...economyDefaults(), days: 6 }).measures([1, 5]);
    expect(m.perDay.quests).toBeGreaterThanOrEqual(2);
  }, 120_000);
});
