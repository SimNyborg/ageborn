/**
 * Fort pads, legality, safe pads, tower reach and the deny order (DESIGN A16.14.1-A16.14.2), and the
 * levy cap rank (A16.14.3, A2.9.5 amended): the pure helpers every layer shares.
 */
import { describe, expect, it } from 'vitest';
import type { EconomyRules } from '@/contracts';
import { fakeEconomy } from '@/contracts/fakes/content';
import {
  capCompare,
  coverLimitP,
  DEFAULT_FORT_ECONOMY,
  decayLoss,
  eligibleIds,
  fortDenyReason,
  fortEconomyOf,
  fortPadRules,
  legalPads,
  mostForwardSafePad,
  padDenyReason,
  padKind,
  padSafe,
  safePads,
  towerRangeOnPad,
  type FortDenyInput,
  type PadContext,
} from '../index';

const econ: EconomyRules = { ...fakeEconomy, fort: { ...DEFAULT_FORT_ECONOMY, pads: [...DEFAULT_FORT_ECONOMY.pads] } };
const r = fortPadRules(econ, 1);
if (!r) throw new Error('no fort rules');

function ctx(o: Partial<PadContext> = {}): PadContext {
  return { cardPads: 'home', size: 'large', taken: [], enemies: [], own: [], ...o };
}

describe('fort economy', () => {
  it('is null for content without forts and fills missing fields with the A16.14 values', () => {
    expect(fortEconomyOf(fakeEconomy)).toBeNull();
    expect(fortEconomyOf({ ...fakeEconomy, fort: { rechargeMs: 30000 } as never })).toMatchObject({ rechargeMs: 30000, scaffoldMs: 5000, pads: [160, 230, 300, 640, 820] });
  });

  it('builds the pad rules in lu or milli-lu; Engineers shorten the scaffold', () => {
    expect(r.pads).toEqual([160, 230, 300, 640, 820]);
    expect(r.scaffoldTicks).toBe(100);
    expect(r.halfLarge).toBe(24);
    expect(fortPadRules(econ)?.pads[2]).toBe(300000);
    expect(fortPadRules(econ, 1, 3000)?.scaffoldTicks).toBe(60);
    expect([0, 1, 2, 3, 4].map((i) => padKind(r, i))).toEqual(['home', 'home', 'home', 'field', 'field']);
  });

  it('rounds each decay step up (a fort never outlives its budget)', () => {
    expect(decayLoss(56000, 100)).toBe(560);
    expect(decayLoss(56001, 100)).toBe(561);
    expect(decayLoss(100, 200)).toBe(2);
    expect(decayLoss(0, 100)).toBe(0);
  });
});

describe('pad legality (A16.14.2 rules 1-4)', () => {
  it('walls, towers and traps use Home pads only; camps any pad', () => {
    expect(padDenyReason(r, 3, ctx())).toBe('fortPadKind');
    expect(padDenyReason(r, 2, ctx())).toBeNull();
    expect(padDenyReason(r, 3, ctx({ cardPads: 'any' }))).toBe('fortPadField');
  });

  it('a pad holds one fort; no enemy ground unit within 120 lu (air and burrowed never count)', () => {
    expect(padDenyReason(r, 1, ctx({ taken: [1] }))).toBe('fortPadTaken');
    const near = { id: 1, p: 230 + 120, half: 12, air: false, speed: 70 };
    expect(padDenyReason(r, 1, ctx({ enemies: [near] }))).toBe('fortPadEnemy');
    expect(padDenyReason(r, 1, ctx({ enemies: [{ ...near, p: 230 + 121 }] }))).toBeNull();
    expect(padDenyReason(r, 1, ctx({ enemies: [{ ...near, air: true }] }))).toBeNull();
    expect(padDenyReason(r, 1, ctx({ enemies: [{ ...near, burrowed: true }] }))).toBeNull();
  });

  it('a Field pad needs the second frontmost trained ground unit 100 lu past it', () => {
    const own = (p: number, o: object = {}) => ({ id: p, p, air: false, summoned: false, ...o });
    const camp = (list: PadContext['own']) => padDenyReason(r, 3, ctx({ cardPads: 'any', own: list }));
    expect(camp([own(900)])).toBe('fortPadField');
    expect(camp([own(900), own(739)])).toBe('fortPadField');
    expect(camp([own(900), own(740)])).toBeNull();
    expect(camp([own(900), own(900, { summoned: true })])).toBe('fortPadField');
    expect(camp([own(900), own(900, { structure: true })])).toBe('fortPadField');
    expect(camp([own(900), own(900, { air: true })])).toBe('fortPadField');
    expect(legalPads(r, ctx({ cardPads: 'any', own: [own(1000), own(1000)] }))).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('safe pads (AI and Key D, A16.14.2)', () => {
  it('a pad is safe when every enemy needs scaffold time + 1 s to reach the fort, and a Home pad lies in cover', () => {
    // 6 s at 70 lu/s = 420 lu from the fort's edge (24) to the enemy's (12).
    const e = { id: 1, p: 300 + 24 + 12 + 420, half: 12, air: false, speed: 70 };
    expect(padSafe(r, 2, ctx({ enemies: [e] }), 400)).toBe(true);
    expect(padSafe(r, 2, ctx({ enemies: [{ ...e, p: e.p - 1 }] }), 400)).toBe(false);
    // Outside cover: the longest turret range − 24 − 12.
    expect(coverLimitP(r, 360)).toBe(324);
    expect(padSafe(r, 2, ctx(), coverLimitP(r, 360))).toBe(true);
    expect(padSafe(r, 2, ctx(), coverLimitP(r, 320))).toBe(false);
    // With no turret only the first pad counts.
    expect(safePads(r, ctx(), null)).toEqual([0]);
  });

  it('Key D takes the most forward safe pad, else the most rearward legal pad, else none', () => {
    expect(mostForwardSafePad(r, ctx(), 400)).toBe(2);
    const e = { id: 1, p: 600, half: 12, air: false, speed: 100 };
    expect(mostForwardSafePad(r, ctx({ enemies: [e] }), 400)).toBe(0);
    const everywhere = [160, 230, 300].map((p, i) => ({ id: i, p, half: 12, air: false, speed: 70 }));
    expect(mostForwardSafePad(r, ctx({ enemies: everywhere }), 400)).toBeNull();
  });
});

describe('tower reach (the cover invariant, A16.14.1)', () => {
  it('never reaches past own-frame p 560: min(card range, 560 − pad − 16)', () => {
    for (const range of [200, 210, 230, 240, 250, 260, 270]) {
      expect(towerRangeOnPad(range, 160, 16, 560)).toBe(range);
      expect(towerRangeOnPad(range, 230, 16, 560)).toBe(range);
      expect(towerRangeOnPad(range, 300, 16, 560)).toBe(Math.min(range, 244));
      for (const pad of [160, 230, 300]) expect(pad + 16 + towerRangeOnPad(range, pad, 16, 560)).toBeLessThanOrEqual(560);
    }
    expect(towerRangeOnPad(260, 640, 16, 560)).toBe(0);
  });
});

describe('the deny order (A16.14.2)', () => {
  const base: FortDenyInput = {
    pad: 0,
    hasCard: true,
    siege: false,
    readyTicks: 0,
    kind: 'wall',
    aliveForts: 0,
    aliveTowers: 0,
    campAlive: false,
    pop: 0,
    fortPop: 6,
    popCap: 60,
    gold: 1000,
    cost: 125,
    ctx: ctx(),
  };
  it('badCommand, noFort, fortSiege, fortRecharge, fortMax, fortCampMax, pad reasons, popFull, noGold', () => {
    const all: FortDenyInput = { ...base, hasCard: true, siege: true, readyTicks: 5, aliveForts: 2, kind: 'camp', campAlive: true, pop: 60, gold: 0 };
    expect(fortDenyReason(r, { ...all, pad: 7 })).toBe('badCommand');
    expect(fortDenyReason(null, all)).toBe('noFort');
    expect(fortDenyReason(r, { ...all, hasCard: false })).toBe('noFort');
    expect(fortDenyReason(r, all)).toBe('fortSiege');
    expect(fortDenyReason(r, { ...all, siege: false })).toBe('fortRecharge');
    expect(fortDenyReason(r, { ...all, siege: false, readyTicks: 0 })).toBe('fortMax');
    expect(fortDenyReason(r, { ...all, siege: false, readyTicks: 0, aliveForts: 1 })).toBe('fortCampMax');
    expect(fortDenyReason(r, { ...base, pad: 3 })).toBe('fortPadKind');
    expect(fortDenyReason(r, { ...base, pop: 55 })).toBe('popFull');
    expect(fortDenyReason(r, { ...base, gold: 124 })).toBe('noGold');
    expect(fortDenyReason(r, base)).toBeNull();
    expect(fortDenyReason({ ...r, maxTowers: 1 }, { ...base, kind: 'tower', aliveTowers: 1, aliveForts: 1 })).toBe('fortMax');
  });
});

describe('levies rank last in power caps (A2.9.5 amended, A16.14.3)', () => {
  it('capRank sorts before p; a levy never takes a slot while another unit qualifies', () => {
    const levies = [0, 1, 2].map((i) => ({ id: 10 + i, p: 100 + i, capRank: 1 }));
    const units = [0, 1, 2, 3].map((i) => ({ id: 20 + i, p: 500 + i }));
    const sorted = [...levies, ...units].sort(capCompare).map((c) => c.id);
    expect(sorted).toEqual([20, 21, 22, 23, 10, 11, 12]);
    expect([...eligibleIds([...levies, ...units], 4, [])].sort()).toEqual([20, 21, 22, 23]);
    expect(eligibleIds([...levies, ...units], 5, []).has(10)).toBe(true);
    // A drop (a summon that is not a levy) keeps its place by p.
    expect(eligibleIds([{ id: 1, p: 50 }, ...units], 1, []).has(1)).toBe(true);
  });
});
