import { describe, expect, it } from 'vitest';
import { dbToGain, pickVariant, rollVariation, VoicePolicy, type Voice } from '../voices';

const LIMITS = { maxVoices: 4, gapMs: 40 };

function start(p: VoicePolicy<number>, id: string, priority: number, at: number, len = 1, handle = Math.random()): Voice<number> | null {
  const a = p.admit(id, priority, at, LIMITS);
  if (!a.ok) return null;
  for (const v of a.steal) p.ended(v.handle);
  const v = { id, priority, start: at, end: at + len, handle };
  p.started(v);
  return v;
}

/** A seeded random source for repeatable statistics. */
function lcg(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('voice policy (A13 Mixer)', () => {
  it('allows at most 4 voices per sound id', () => {
    const p = new VoicePolicy<number>();
    for (let k = 0; k < 4; k++) expect(start(p, 'hit_blunt', 0, k * 0.05)).not.toBeNull();
    expect(p.count(0.2, 'hit_blunt')).toBe(4);
    // A fifth voice of equal priority steals the oldest one.
    const a = p.admit('hit_blunt', 0, 0.25, LIMITS);
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.steal.map((v) => v.start)).toEqual([0]);
  });

  it('keeps a 40 ms minimum gap between starts of the same id', () => {
    const p = new VoicePolicy<number>();
    expect(start(p, 'coin_gain', 0, 1.0)).not.toBeNull();
    expect(p.admit('coin_gain', 0, 1.02, LIMITS)).toEqual({ ok: false, reason: 'gap' });
    expect(p.admit('coin_gain', 0, 1.039, LIMITS)).toEqual({ ok: false, reason: 'gap' });
    expect(p.admit('coin_gain', 0, 1.041, LIMITS).ok).toBe(true);
    // Other ids are not affected.
    expect(p.admit('hit_blunt', 0, 1.01, LIMITS).ok).toBe(true);
  });

  it('lets a higher-priority (player-caused) sound through the gap', () => {
    const p = new VoicePolicy<number>();
    start(p, 'shot_bow', 0, 1.0);
    expect(p.admit('shot_bow', 1, 1.01, LIMITS).ok).toBe(true);
    expect(p.admit('shot_bow', 0, 1.01, LIMITS).ok).toBe(false);
  });

  it('never steals a higher-priority voice; drops the newcomer instead', () => {
    const p = new VoicePolicy<number>();
    for (let k = 0; k < 4; k++) start(p, 'hit_slash', 1, k * 0.05);
    expect(p.admit('hit_slash', 0, 0.3, LIMITS)).toEqual({ ok: false, reason: 'idCap' });
    const a = p.admit('hit_slash', 1, 0.3, LIMITS);
    expect(a.ok).toBe(true);
  });

  it('steals the lowest priority first, then the oldest', () => {
    const p = new VoicePolicy<number>();
    start(p, 'x', 1, 0.0, 5, 1);
    start(p, 'x', 0, 0.1, 5, 2);
    start(p, 'x', 0, 0.2, 5, 3);
    start(p, 'x', 1, 0.3, 5, 4);
    const a = p.admit('x', 1, 0.4, LIMITS);
    expect(a.ok && a.steal.map((v) => v.handle)).toEqual([2]);
  });

  it('enforces the global voice cap across ids', () => {
    const p = new VoicePolicy<number>(3);
    start(p, 'a', 0, 0);
    start(p, 'b', 0, 0.001);
    start(p, 'c', 2, 0.002);
    const a = p.admit('d', 0, 0.01, LIMITS);
    expect(a.ok && a.steal.map((v) => v.id)).toEqual(['a']);
    const p2 = new VoicePolicy<number>(2);
    start(p2, 'a', 2, 0);
    start(p2, 'b', 2, 0);
    expect(p2.admit('c', 0, 0.01, LIMITS)).toEqual({ ok: false, reason: 'totalCap' });
  });

  it('frees voices when they end', () => {
    const p = new VoicePolicy<number>();
    start(p, 'a', 0, 0, 0.1, 7);
    expect(p.count(0.05)).toBe(1);
    expect(p.count(0.1)).toBe(0);
    start(p, 'b', 0, 1, 1, 8);
    p.ended(8);
    expect(p.count(1.1)).toBe(0);
  });

  it('turns 40 simultaneous hits of 8 hit sounds into at most 8 voices', () => {
    const p = new VoicePolicy<number>();
    const ids = ['hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser', 'hit_heavy', 'hit_effective', 'explosion_s'];
    let played = 0;
    for (let k = 0; k < 40; k++) if (start(p, ids[k % ids.length]!, 0, 2.0)) played++;
    expect(played).toBe(8);
  });
});

describe('per-play variation (A13)', () => {
  it('stays within pitch ±8% and volume ±3 dB and covers the range', () => {
    const r = lcg(7);
    let minRate = 2;
    let maxRate = 0;
    let minDb = 10;
    let maxDb = -10;
    for (let k = 0; k < 5000; k++) {
      const v = rollVariation(r, 800, 3);
      minRate = Math.min(minRate, v.rate);
      maxRate = Math.max(maxRate, v.rate);
      minDb = Math.min(minDb, v.gainDb);
      maxDb = Math.max(maxDb, v.gainDb);
    }
    expect(minRate).toBeGreaterThanOrEqual(0.92);
    expect(maxRate).toBeLessThanOrEqual(1.08);
    expect(minRate).toBeLessThan(0.925);
    expect(maxRate).toBeGreaterThan(1.075);
    expect(minDb).toBeGreaterThanOrEqual(-3);
    expect(maxDb).toBeLessThanOrEqual(3);
    expect(maxDb - minDb).toBeGreaterThan(5.8);
  });

  it('does not vary musical sounds when their spread is 0', () => {
    expect(rollVariation(() => 0.99, 0, 0)).toEqual({ rate: 1, gainDb: 0 });
  });

  it('picks every variant and never the same one twice in a row', () => {
    const r = lcg(3);
    const seen = new Set<number>();
    let prev: number | undefined;
    for (let k = 0; k < 400; k++) {
      const v = pickVariant(r, 4, prev);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4);
      expect(v).not.toBe(prev);
      seen.add(v);
      prev = v;
    }
    expect(seen.size).toBe(4);
    expect(pickVariant(() => 0.999, 1, 0)).toBe(0);
    expect(pickVariant(() => 0.999, 3, undefined)).toBe(2);
  });

  it('converts dB to gain', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(dbToGain(20)).toBeCloseTo(10, 9);
  });
});
