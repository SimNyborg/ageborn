/**
 * Local calendar arithmetic (DESIGN A6.3 "reset at local 04:00", A9.1 date seed) without `Date`
 * in the rules; checked here against `Date`.
 */
import { describe, expect, it } from 'vitest';
import { civilFromDays, dateNumberOf, dayFromKey, dayKeyOf, daysFromCivil, gameDay, nextResetAt, weekKeyOf } from '../time';
import { DAY, HOUR } from './helpers';

describe('calendar', () => {
  it('civil dates round-trip and match Date for 1900-2200', () => {
    for (let d = -25567; d < 84000; d += 97) {
      const c = civilFromDays(d);
      const js = new Date(d * DAY);
      expect([c.y, c.m, c.d]).toEqual([js.getUTCFullYear(), js.getUTCMonth() + 1, js.getUTCDate()]);
      expect(daysFromCivil(c.y, c.m, c.d)).toBe(d);
      expect(dayFromKey(dayKeyOf(d))).toBe(d);
    }
    expect(dayKeyOf(0)).toBe('1970-01-01');
    expect(dateNumberOf(daysFromCivil(2026, 9, 27))).toBe(20260927);
  });

  it('ISO week keys', () => {
    expect(weekKeyOf(daysFromCivil(2026, 1, 1))).toBe('2026-W01');
    expect(weekKeyOf(daysFromCivil(2027, 1, 1))).toBe('2026-W53');
    expect(weekKeyOf(daysFromCivil(2024, 12, 30))).toBe('2025-W01');
    expect(weekKeyOf(daysFromCivil(2026, 3, 1))).toBe('2026-W09');
    expect(weekKeyOf(daysFromCivil(2026, 3, 2))).toBe('2026-W10');
  });

  it('the game day starts at local 04:00', () => {
    const utc = Date.UTC(2026, 2, 2, 3, 59);
    expect(dayKeyOf(gameDay({ t: utc, offsetMs: 0 }, 4))).toBe('2026-03-01');
    expect(dayKeyOf(gameDay({ t: utc + 60_000, offsetMs: 0 }, 4))).toBe('2026-03-02');
    // UTC+2: 02:00 UTC is 04:00 local.
    expect(dayKeyOf(gameDay({ t: Date.UTC(2026, 2, 2, 2, 0), offsetMs: 2 * HOUR }, 4))).toBe('2026-03-02');
    expect(dayKeyOf(gameDay({ t: Date.UTC(2026, 2, 2, 1, 59), offsetMs: 2 * HOUR }, 4))).toBe('2026-03-01');
    // UTC−5: 09:00 UTC is 04:00 local.
    expect(nextResetAt({ t: Date.UTC(2026, 2, 2, 8, 0), offsetMs: -5 * HOUR }, 4)).toBe(Date.UTC(2026, 2, 2, 9, 0));
    expect(nextResetAt({ t: Date.UTC(2026, 2, 2, 9, 0), offsetMs: -5 * HOUR }, 4)).toBe(Date.UTC(2026, 2, 3, 9, 0));
  });
});
