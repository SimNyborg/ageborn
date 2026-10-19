import { describe, expect, it } from 'vitest';
import { CLASH_DEFAULTS, ClashDetector, clashWidth, countNear } from '../clash';

/** Queue item 38 A6: the clash moment's detector (pure). */

const both = (n: number) => (): readonly [number, number] => [n, n];

describe('the clash detector', () => {
  it('makes the first blow of a match a clash when both lines are near', () => {
    const d = new ClashDetector();
    expect(d.blow(5000, both(3))).toEqual([3, 3]);
  });

  it('needs two units a side near the contact, and may still fire while the lines arrive', () => {
    const d = new ClashDetector();
    // the front runners meet alone
    expect(d.blow(5000, () => [1, 1])).toBeNull();
    // the rest arrive 600 ms later: the same contact becomes the clash
    expect(d.blow(5600, () => [2, 3])).toEqual([2, 3]);
    // later blows of that contact are not
    expect(d.blow(5700, both(4))).toBeNull();
  });

  it('gives up on a contact that stays small past its window', () => {
    const d = new ClashDetector();
    expect(d.blow(5000, () => [1, 1])).toBeNull();
    expect(d.blow(5000 + CLASH_DEFAULTS.windowMs + 50, both(3))).toBeNull();
  });

  it('needs the fronts apart for 3 s, and plays at most once per 8 s', () => {
    const d = new ClashDetector();
    expect(d.blow(1000, both(2))).not.toBeNull();
    // the fight goes on (a blow every second): no new clash
    for (let t = 2000; t <= 3000; t += 1000) expect(d.blow(t, both(4))).toBeNull();
    // apart for 3.5 s, but only 5.5 s after the last clash: inside the gap, for the whole of that contact
    expect(d.blow(6500, both(4))).toBeNull();
    expect(d.blow(7000, both(4))).toBeNull();
    // apart again, 9.5 s after the last clash: a new clash
    expect(d.blow(10_500, both(4))).not.toBeNull();
  });

  it('asks for the counts only when a blow could be the clash', () => {
    const d = new ClashDetector();
    let asked = 0;
    const near = (): readonly [number, number] => {
      asked++;
      return [3, 3];
    };
    d.blow(1000, near);
    d.blow(1100, near);
    d.blow(1200, near);
    expect(asked).toBe(1);
  });

  it('counts the units of each side near the contact (forts never) and sizes the dust by them', () => {
    const units = [
      { side: 0 as const, x: 900 },
      { side: 0 as const, x: 960 },
      { side: 0 as const, x: 700 },
      { side: 1 as const, x: 1010 },
      { side: 1 as const, x: 1000, fort: true },
    ];
    expect(countNear(units, 980, 140)).toEqual([2, 1]);
    expect(clashWidth([2, 2])).toBe(116);
    expect(clashWidth([1, 1])).toBe(CLASH_DEFAULTS.width.minLu);
    expect(clashWidth([10, 10])).toBe(CLASH_DEFAULTS.width.maxLu);
  });
});
