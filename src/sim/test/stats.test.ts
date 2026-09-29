import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@/contracts';
import { computeMatchStats, createStatsTracker } from '../stats';
import { STRATEGIES, fixture, matchConfig, ofKind, runMatch, scriptedPlayer } from './helpers';

const cfg = { format: 'short' as const, content: fixture };

const stream: SimEvent[] = [
  { tick: 10, e: 'unitSpawned', id: 1, side: 0, card: 'spear_hunter', x: 20000, summoned: false, level: 1 },
  { tick: 10, e: 'unitSpawned', id: 2, side: 1, card: 'tuskback', x: 1180000, summoned: false, level: 1 },
  { tick: 11, e: 'unitSpawned', id: 3, side: 0, card: 'footman', x: 20000, summoned: true, level: 1 },
  { tick: 12, e: 'unitSpawned', id: 4, side: 1, card: 'bonker', x: 1180000, summoned: false, level: 1 },
  { tick: 12, e: 'unitSpawned', id: 5, side: 1, card: 'bonker', x: 1180000, summoned: false, level: 1 },
  { tick: 13, e: 'researchStarted', side: 0, pick: 'economy.granary', cost: 150000, endTick: 213 },
  { tick: 20, e: 'powerTelegraph', side: 0, slot: 'field', power: 'stampede', castId: 9, x: 500000, zone: 500000, cost: 100, targetId: -1, telegraphMs: 1000 },
  ...[2, 4, 5, 4].map(
    (id): SimEvent => ({
      tick: 40, e: 'hit', targetId: id, sourceId: -1, sourceCard: 'stampede', castId: 9, sourceKind: 'power',
      damage: 5000, shieldAbsorbed: 0, heavy: false, modBp: 10000, x: 500000, dmgType: 'blunt',
    }),
  ),
  {
    tick: 50, e: 'hit', targetId: 2, sourceId: 1, sourceCard: 'spear_hunter', castId: null, sourceKind: 'unit',
    damage: 5200, shieldAbsorbed: 0, heavy: false, modBp: 20000, x: 500000, dmgType: 'pierce',
  },
  {
    tick: 51, e: 'hit', targetId: 4, sourceId: -10, sourceCard: 'rock_tosser', castId: null, sourceKind: 'turret',
    damage: 3000, shieldAbsorbed: 0, heavy: false, modBp: 10000, x: 500000, dmgType: 'blunt',
  },
  {
    tick: 60, e: 'died', id: 2, side: 1, card: 'tuskback', killerId: 1, killerCard: 'spear_hunter', killerKind: 'unit',
    killerSide: 0, bountyGold: 90000, bountyXp: 150000, x: 500000,
  },
  {
    tick: 61, e: 'died', id: 4, side: 1, card: 'bonker', killerId: -10, killerCard: 'rock_tosser', killerKind: 'turret',
    killerSide: 0, bountyGold: 30000, bountyXp: 50000, x: 500000,
  },
  {
    tick: 62, e: 'died', id: 3, side: 0, card: 'footman', killerId: 5, killerCard: 'bonker', killerKind: 'unit',
    killerSide: 1, bountyGold: 0, bountyXp: 0, x: 500000,
  },
  { tick: 70, e: 'baseDamaged', side: 1, sourceId: 1, damage: 2600, hp: 997400, maxHp: 1000000 },
  { tick: 71, e: 'baseDamaged', side: 1, sourceId: null, damage: 5000, hp: 992400, maxHp: 1000000 },
  { tick: 80, e: 'ageUp', side: 0, age: 'medieval' },
  { tick: 90, e: 'ageUp', side: 0, age: 'gunpowder' },
  { tick: 95, e: 'lastStandFire', side: 1 },
  { tick: 100, e: 'matchEnded', result: { winner: 0, reason: 'baseDestroyed', tick: 100, baseHpBp: [8000, 0] } },
];

describe('MatchStats reducer (B3)', () => {
  it('reduces an event stream to one side’s stats', () => {
    expect(computeMatchStats(stream, cfg, 0)).toEqual({
      trained: 1,
      kills: 2,
      turretKills: 1,
      evolves: 2,
      reachedFinalAgeAtMs: 4500,
      powerMaxHits: 3,
      powerGoldSpent: 100,
      powerCasts: [0, 1],
      baseDamage: 26,
      heavyKillsByAA: 1,
      usedTreasury: true,
      usedLastStand: false,
      ownBaseHpBpAtEnd: 8000,
      durationMs: 5000,
      mvpCard: 'spear_hunter',
    });
    const foe = computeMatchStats(stream, cfg, 1);
    expect(foe).toMatchObject({ trained: 3, kills: 1, usedLastStand: true, ownBaseHpBpAtEnd: 0, mvpCard: null, powerMaxHits: 0, powerGoldSpent: 0, powerCasts: [0, 0] });
  });

  it('is incremental: pushing in chunks gives the same result', () => {
    const t = createStatsTracker(cfg, 0);
    for (const e of stream) t.push([e]);
    expect(t.result()).toEqual(computeMatchStats(stream, cfg, 0));
  });

  it('matches a real match: trained = non-summoned spawns of the side', () => {
    const mc = matchConfig({ seed: 3, format: 'short' });
    const res = runMatch(mc, [scriptedPlayer(fixture, 0, 1, STRATEGIES.balanced!), scriptedPlayer(fixture, 1, 2, STRATEGIES.greedy!)], {
      keepEvents: true,
    });
    const stats = computeMatchStats(res.events, mc, 0);
    expect(stats.trained).toBe(ofKind(res.events, 'unitSpawned').filter((u) => u.side === 0 && !u.summoned).length);
    expect(stats.durationMs).toBe(res.ticks * 50);
  });
});
