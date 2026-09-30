import { describe, expect, it } from 'vitest';
import { cardBook } from '../book';
import { counterScore, counterTargets, fCounter, PREDICT_BLEND_BP, sampleOfAge, sampleOfMemory, type CounterSample } from '../counters';
import { weightBp } from '../personalities';
import { fPressure, fPush, fRole, fSpare, mulBp } from '../scoring';
import type { SeenUnit } from '../view';
import { content } from './helpers';

const book = cardBook(content);

describe('A7.2 scoring terms (bp)', () => {
  it('m = 0.5 + w / 100', () => {
    expect(weightBp(0)).toBe(5000);
    expect(weightBp(50)).toBe(10000);
    expect(weightBp(90)).toBe(14000);
    expect(weightBp(100)).toBe(15000);
    expect(weightBp(150)).toBe(15000);
  });

  it('f_push = 0.5 + (my − foe) / (2 × max(my, foe, 300)), clamped', () => {
    expect(fPush(0, 0)).toBe(5000);
    expect(fPush(300, 0)).toBe(10000);
    expect(fPush(0, 300)).toBe(0);
    expect(fPush(150, 0)).toBe(7500);
    expect(fPush(1000, 500)).toBe(7500);
    expect(fPush(500, 1000)).toBe(2500);
  });

  it('f_role = 1 / (1 + own units in the group)', () => {
    expect(fRole(0)).toBe(10000);
    expect(fRole(1)).toBe(5000);
    expect(fRole(3)).toBe(2500);
  });

  it('f_pressure = value within 480 lu of the gate / 400, clamped', () => {
    expect(fPressure(0)).toBe(0);
    expect(fPressure(100)).toBe(2500);
    expect(fPressure(400)).toBe(10000);
    expect(fPressure(900)).toBe(10000);
  });

  it('f_spare = (gold − cost) / 300, clamped', () => {
    expect(fSpare(150000, 150000)).toBe(0);
    expect(fSpare(300000, 150000)).toBe(5000);
    expect(fSpare(900000, 150000)).toBe(10000);
    expect(fSpare(100000, 150000)).toBe(0);
  });

  it('multiplies bp with truncation', () => {
    expect(mulBp(6000, 15000)).toBe(9000);
    expect(mulBp(3333, 3333)).toBe(1110);
  });
});

describe('f_counter (A7.2, B4 matrix)', () => {
  const seen = (card: string, pLu: number, id: number): SeenUnit => ({ id, card, def: book.units[card], value: book.units[card]?.value ?? 0, p: pLu * 1000, hp: 1, hpTotal: 1, maxHp: 1, air: false, summoned: false, level: 1, levy: false, capRank: 0 });

  it('is the value-weighted mean of M[c][e]; 0.5 without enemies', () => {
    const m = (a: string, b: string): number => Math.round((content.counters[a]?.[b] ?? 0) * 10000);
    const sample: CounterSample[] = [
      { card: 'bonker', weight: 50 },
      { card: 'tuskback', weight: 150 },
    ];
    const expected = Math.trunc((m('spear_hunter', 'bonker') * 50 + m('spear_hunter', 'tuskback') * 150) / 200);
    expect(counterScore(book, 'spear_hunter', sample)).toBe(expected);
    expect(counterScore(book, 'spear_hunter', [])).toBe(5000);
    // The Training Dummy has no matrix row: M reads even.
    expect(counterScore(book, 'training_dummy', sample)).toBe(5000);
  });

  it('matches the matrix orientation: anti-armor beats heavies, heavies beat infantry', () => {
    expect(counterScore(book, 'spear_hunter', [{ card: 'tuskback', weight: 1 }])).toBeGreaterThan(5000);
    expect(counterScore(book, 'tuskback', [{ card: 'bonker', weight: 1 }])).toBeGreaterThan(5000);
  });

  it('looks at enemies within 500 lu of the front, nearest the gate first, cut to the counter depth', () => {
    const foes = [seen('bonker', 900, 1), seen('tuskback', 400, 2), seen('pebbler', 650, 3), seen('spear_hunter', 1150, 4)];
    // Front at 300: 400, 650 are within 500 lu; 900 and 1150 are not.
    expect(counterTargets(foes, 300000, 1000).map((u) => u.id)).toEqual([2, 3]);
    expect(counterTargets(foes, 300000, 1).map((u) => u.id)).toEqual([2]);
    // No own ground units: the front is the own gate (p 0); nothing within 500 → all enemies.
    expect(counterTargets(foes, null, 1000).map((u) => u.id)).toEqual([2]);
    expect(counterTargets([seen('bonker', 900, 1)], null, 1000).map((u) => u.id)).toEqual([1]);
  });

  it('remembered composition weights by copies; prediction blends the next age in', () => {
    const mem = sampleOfMemory([{ card: 'tuskback', count: 3, lastTick: 0 }], book);
    expect(mem).toEqual([{ card: 'tuskback', weight: 450 }]);
    const now: CounterSample[] = [{ card: 'bonker', weight: 50 }];
    const next = sampleOfAge(book.unitsByAge[2] ?? []);
    expect(next.every((s) => book.units[s.card]?.age === 'medieval')).toBe(true);
    expect(next.some((s) => book.units[s.card]?.legendary)).toBe(false);
    const cur = counterScore(book, 'footman', now);
    const nxt = counterScore(book, 'footman', next);
    expect(fCounter({ book, now, next }, 'footman')).toBe(Math.trunc((cur * (10000 - PREDICT_BLEND_BP) + nxt * PREDICT_BLEND_BP) / 10000));
    expect(fCounter({ book, now, next: null }, 'footman')).toBe(cur);
  });
});
