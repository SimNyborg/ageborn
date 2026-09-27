import { describe, expect, it } from 'vitest';
import { AssertionError, assert, assertDefined, assertInt, assertNever } from '../assert';
import { createIdCounter, parseSkinnedVisualId, rngId, skinnedVisualId } from '../ids';
import { RingBuffer } from '../ring';
import { seedSfc32 } from '../rng';

describe('RingBuffer', () => {
  it('returns items by delay, clamped to the oldest kept', () => {
    const r = new RingBuffer<number>(3);
    expect(r.at(0)).toBeUndefined();
    r.push(1);
    expect(r.at(0)).toBe(1);
    expect(r.at(5)).toBe(1);
    r.push(2);
    r.push(3);
    r.push(4);
    expect(r.length).toBe(3);
    expect(r.at(0)).toBe(4);
    expect(r.at(1)).toBe(3);
    expect(r.at(2)).toBe(2);
    expect(r.at(9)).toBe(2);
    expect(r.latest()).toBe(4);
    expect(r.toArray()).toEqual([2, 3, 4]);
    r.clear();
    expect(r.length).toBe(0);
    expect(r.toArray()).toEqual([]);
  });

  it('rejects a bad capacity', () => {
    expect(() => new RingBuffer(0)).toThrow(AssertionError);
  });
});

describe('assert', () => {
  it('throws AssertionError', () => {
    expect(() => assert(false, 'nope')).toThrow('nope');
    expect(() => assert(1)).not.toThrow();
    expect(assertDefined(0)).toBe(0);
    expect(() => assertDefined(null)).toThrow(AssertionError);
    expect(() => assertInt(1.5)).toThrow(AssertionError);
    expect(() => assertNever('x' as never)).toThrow(AssertionError);
  });
});

describe('ids', () => {
  it('counts up', () => {
    const c = createIdCounter();
    expect([c.next(), c.next(), c.peek()]).toEqual([1, 2, 3]);
  });

  it('joins and splits skinned visual ids', () => {
    expect(skinnedVisualId('unit.bonker', 'pumpkin_head')).toBe('unit.bonker@pumpkin_head');
    expect(skinnedVisualId('unit.bonker', null)).toBe('unit.bonker');
    expect(parseSkinnedVisualId('unit.bonker@pumpkin_head')).toEqual({ visualId: 'unit.bonker', skinId: 'pumpkin_head' });
    expect(parseSkinnedVisualId('unit.bonker')).toEqual({ visualId: 'unit.bonker', skinId: null });
  });

  it('rngId is reproducible', () => {
    const a = rngId(seedSfc32(1), 'cap');
    expect(a).toBe(rngId(seedSfc32(1), 'cap'));
    expect(a).toMatch(/^cap_[0-9a-z]{12}$/);
  });
});
