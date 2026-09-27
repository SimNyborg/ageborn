import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  chanceBp,
  cloneSfc32,
  mulberry32,
  pick,
  pickWeighted,
  randInt,
  randRange,
  seedSfc32,
  sfc32Next,
  shuffle,
  xmur3,
  type Sfc32State,
} from '../rng';

// Known answers from an independent transcription of PractRand sfc32 and bryc's xmur3/mulberry32.
describe('xmur3', () => {
  it('matches known answers', () => {
    const h = xmur3('42');
    expect([h(), h(), h(), h()]).toEqual([2309403825, 1206695092, 3789162703, 695014445]);
    const e = xmur3('');
    expect([e(), e(), e(), e()]).toEqual([167010153, 2610615433, 1495386444, 1351578270]);
  });
});

describe('sfc32', () => {
  it('zero state produces the PractRand sequence', () => {
    const s: Sfc32State = [0, 0, 0, 0];
    expect([sfc32Next(s), sfc32Next(s), sfc32Next(s), sfc32Next(s)]).toEqual([0, 1, 2, 12]);
  });

  it('seeded via xmur3 of "${seed}" matches known answers', () => {
    const s = seedSfc32(42);
    expect(s).toEqual([2309403825, 1206695092, 3789162703, 695014445]);
    expect(seedSfc32('42')).toEqual(s);
    const out = Array.from({ length: 6 }, () => sfc32Next(s));
    expect(out).toEqual([4211113362, 1642505827, 3609308666, 1153210446, 3525591251, 3839212432]);
  });

  it('keeps state as uint32 and survives a JSON round trip', () => {
    const s = seedSfc32('match-7');
    for (let i = 0; i < 100; i += 1) sfc32Next(s);
    for (const w of s) expect(w >>> 0).toBe(w);
    const copy = JSON.parse(JSON.stringify(s)) as Sfc32State;
    expect(sfc32Next(copy)).toBe(sfc32Next(s));
  });

  it('clone forks an identical independent stream', () => {
    const a = seedSfc32(1);
    const b = cloneSfc32(a);
    expect(sfc32Next(a)).toBe(sfc32Next(b));
    sfc32Next(a);
    expect(a).not.toEqual(b);
  });
});

describe('draw helpers', () => {
  it('randInt stays in range and is deterministic', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e6 }), fc.integer({ min: 1, max: 1e9 }), (seed, n) => {
        const a = seedSfc32(seed);
        const b = seedSfc32(seed);
        const x = randInt(a, n);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(n);
        expect(Number.isInteger(x)).toBe(true);
        expect(randInt(b, n)).toBe(x);
      }),
    );
  });

  it('randInt is roughly uniform', () => {
    const s = seedSfc32('uniform');
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60000; i += 1) counts[randInt(s, 6)]! += 1;
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(500);
  });

  it('randRange is inclusive', () => {
    const s = seedSfc32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i += 1) seen.add(randRange(s, -2, 2));
    expect([...seen].sort((x, y) => x - y)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('chanceBp respects the edges', () => {
    const s = seedSfc32(4);
    expect(chanceBp(s, 0)).toBe(false);
    expect(chanceBp(s, 10000)).toBe(true);
    let hits = 0;
    for (let i = 0; i < 20000; i += 1) if (chanceBp(s, 2500)) hits += 1;
    expect(Math.abs(hits - 5000)).toBeLessThan(400);
  });

  it('pickWeighted never picks a zero weight', () => {
    const s = seedSfc32(5);
    for (let i = 0; i < 1000; i += 1) expect([0, 2]).toContain(pickWeighted(s, [1, 0, 3]));
    expect(pickWeighted(s, [0, 0])).toBe(-1);
  });

  it('pick and shuffle are deterministic permutations', () => {
    const a = shuffle(seedSfc32(6), [1, 2, 3, 4, 5, 6, 7, 8]);
    const b = shuffle(seedSfc32(6), [1, 2, 3, 4, 5, 6, 7, 8]);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(['x', 'y']).toContain(pick(seedSfc32(7), ['x', 'y']));
    expect(() => pick(seedSfc32(7), [])).toThrow();
  });
});

describe('mulberry32', () => {
  it('matches known answers', () => {
    const r = mulberry32(1);
    expect(Array.from({ length: 5 }, () => r.nextU32())).toEqual([
      2693262067, 11749833, 2265367787, 4213581821, 4159151403,
    ]);
    const z = mulberry32(0);
    expect(Array.from({ length: 3 }, () => z.nextU32())).toEqual([1144304738, 1416247, 958946056]);
  });

  it('next() is in [0, 1)', () => {
    const r = mulberry32(99);
    for (let i = 0; i < 1000; i += 1) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const k = r.int(10);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThan(10);
    }
  });
});
