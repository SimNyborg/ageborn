import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../src/contracts';
import { fakeContent } from '../../src/contracts/fakes/content';
import { cannedBattleEvents } from '../../src/contracts/fakes/sim';
import { MatchTally, scoreOf, totalKills } from '../lib/metrics';

function tally(events: readonly SimEvent[]) {
  const t = new MatchTally(fakeContent);
  t.push(events);
  const end = events.find((e): e is SimEvent & { e: 'matchEnded' } => e.e === 'matchEnded');
  return t.summary({ seed: 1, format: 'short', outcome: end?.result ?? null, ticks: end?.tick ?? 0, hash: 7 });
}

describe('MatchTally on the canned fake stream', () => {
  const m = tally(cannedBattleEvents);
  const [a, b] = m.sides;

  it('reads the outcome', () => {
    expect(m.winner).toBe(0);
    expect(m.reason).toBe('retreat');
    expect(m.finalBell).toBe(false);
    expect(m.hash).toBe(7);
  });

  it('counts trained units and gold per card, summons excluded', () => {
    expect(a.trained).toEqual({ bonker: 1 });
    expect(b.trained).toEqual({ pebbler: 1 });
    expect(a.spent).toEqual({ bonker: 50 });
    expect(b.spent).toEqual({ pebbler: 75, rock_tosser: 150 });
  });

  it('attributes damage to the attacker, powers and base hits included', () => {
    expect(a.damage).toEqual({ bonker: 2000 + 2000, stampede: 5000 });
    expect(b.damage).toEqual({ pebbler: 1800 });
    expect(a.baseDamage).toBe(2000);
  });

  it('counts kills by killer kind and power hits per cast', () => {
    expect(a.kills.power).toBe(1);
    expect(totalKills(m).power).toBe(1);
    expect(b.lost).toBe(1);
    expect(a.powers).toEqual({ stampede: { casts: 1, unitsHit: 1 } });
  });

  it('records evolve timings', () => {
    expect(a.evolveTicks).toEqual([120]);
    expect(a.ageUpTicks).toEqual({ medieval: 170 });
    expect(b.evolveTicks).toEqual([]);
  });
});

describe('MatchTally details', () => {
  it('nets modernise credit and sell refunds into turret spending', () => {
    const ev: SimEvent[] = [
      { tick: 1, e: 'turretBuildStart', side: 0, mount: 0, card: 'rock_tosser' },
      { tick: 50, e: 'turretReplaced', side: 0, mount: 0, card: 'crossbow_nest' },
      { tick: 90, e: 'turretSold', side: 0, mount: 0, card: 'crossbow_nest' },
    ];
    const s = tally(ev).sides[0];
    // 150 build; modernise 150 − 75 credit; sale refunds 75.
    expect(s.spent).toEqual({ rock_tosser: 150, crossbow_nest: 0 });
  });

  it('ignores Siege decay and counts distinct units per cast', () => {
    const ev: SimEvent[] = [
      { tick: 1, e: 'unitSpawned', id: 1, side: 1, card: 'bonker', x: 0, summoned: false, level: 1 },
      { tick: 1, e: 'unitSpawned', id: 2, side: 1, card: 'bonker', x: 0, summoned: false, level: 1 },
      { tick: 2, e: 'powerTelegraph', side: 0, slot: 'field', power: 'stampede', castId: 9, x: 0, zone: 500_000, cost: 100, targetId: -1, telegraphMs: 1000 },
      ...[1, 1, 2].map((id): SimEvent => ({
        tick: 3, e: 'hit', targetId: id, sourceId: -1, sourceCard: 'stampede', castId: 9, sourceKind: 'power',
        damage: 100, shieldAbsorbed: 0, heavy: false, modBp: 10000, x: 0, dmgType: 'blunt',
      })),
      { tick: 4, e: 'baseDamaged', side: 0, sourceId: null, damage: 500, hp: 1, maxHp: 2 },
      { tick: 5, e: 'commandRejected', side: 1, t: 'train', reason: 'noGold' },
    ];
    const m = tally(ev);
    expect(m.sides[0].powers.stampede).toEqual({ casts: 1, unitsHit: 2 });
    expect(m.sides[1].baseDamage).toBe(0);
    expect(m.sides[1].rejected).toEqual({ noGold: 1 });
    expect(m.sides[1].maxUnitsAlive).toBe(2);
    expect(m.reason).toBe('timeout');
  });

  it('scores wins, losses and draws', () => {
    expect(scoreOf({ winner: 0 }, 0)).toBe(1);
    expect(scoreOf({ winner: 0 }, 1)).toBe(0);
    expect(scoreOf({ winner: null }, 1)).toBe(0.5);
  });
});

describe('first clash and contact point (A17.14)', () => {
  it('samples the midpoint of the ground fronts and counts it in the middle between the turret covers', () => {
    const t = new MatchTally(fakeContent);
    const L = 2_000_000;
    const cover = 480_000;
    t.sampleContact([{ side: 0, x: 900_000, hp: 1, air: false }, { side: 1, x: 1_100_000, hp: 1, air: false }], L, cover);
    // Contact at 300 lu from side 0's gate: inside its turret cover.
    t.sampleContact([{ side: 0, x: 250_000, hp: 1, air: false }, { side: 1, x: 350_000, hp: 1, air: false }], L, cover);
    // Air units and the dead are not fronts; one side alone gives no contact point.
    t.sampleContact([{ side: 0, x: 900_000, hp: 1, air: false }, { side: 1, x: 1_000_000, hp: 1, air: true }, { side: 1, x: 1_100_000, hp: 0, air: false }], L, cover);
    const s = t.summary({ seed: 1, format: 'full', outcome: null, ticks: 100, hash: 0 });
    expect(s.contact).toEqual({ samples: 2, middle: 1 });
    expect(s.firstClashTick).toBeNull();
  });
});
