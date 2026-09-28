/**
 * Local calendar arithmetic for the daily timers (DESIGN A6.3, B8: "all daily timers reset at local
 * 04:00", A9.1 Daily Challenge seeded by the local date).
 *
 * Meta is pure (B2): no `Date`. Time arrives as epoch ms from the injected `Clock`; the local time
 * zone arrives through the optional {@link LocalClock.offsetMs}. Without it, days are UTC days. The
 * calendar is computed with integer civil-date formulas (proleptic Gregorian).
 */
import type { Clock } from '@/contracts';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

/**
 * A `Clock` that also knows the local time zone. The app passes
 * `{ now: () => Date.now(), offsetMs: (t) => -new Date(t).getTimezoneOffset() * 60_000 }`.
 * Any plain `Clock` works too (days are then UTC days).
 */
export interface LocalClock extends Clock {
  /** Local offset from UTC in ms at epoch time `t` (UTC+2 → 7,200,000). */
  offsetMs?(t: number): number;
}

/** The local UTC offset of `clock` at `t` (0 when the clock has no time zone). */
export function offsetAt(clock: LocalClock, t: number): number {
  return clock.offsetMs ? Math.trunc(clock.offsetMs(t)) : 0;
}

/** A point in time with its local offset, the unit every calendar helper takes. */
export interface LocalTime {
  t: number;
  offsetMs: number;
}

export function localNow(clock: LocalClock): LocalTime {
  const t = clock.now();
  return { t, offsetMs: offsetAt(clock, t) };
}

/**
 * The game day of `lt`: whole days since 1970-01-01 of local time, where each day starts at
 * `resetHour` (04:00). 03:59 still belongs to the previous game day.
 */
export function gameDay(lt: LocalTime, resetHour: number): number {
  return Math.floor((lt.t + lt.offsetMs - resetHour * HOUR_MS) / DAY_MS);
}

/** Epoch ms of the next reset (local `resetHour`) strictly after `lt.t`. */
export function nextResetAt(lt: LocalTime, resetHour: number): number {
  return (gameDay(lt, resetHour) + 1) * DAY_MS + resetHour * HOUR_MS - lt.offsetMs;
}

/** Civil date of a day index (days since 1970-01-01). */
export function civilFromDays(days: number): { y: number; m: number; d: number } {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d };
}

/** Day index (days since 1970-01-01) of a civil date. */
export function daysFromCivil(year: number, m: number, d: number): number {
  const y = m <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

const pad = (n: number, w: number): string => String(n).padStart(w, '0');

/** `YYYY-MM-DD` of a game day (the `QuestState.dayKey` / `SaveDoc.daily.dayKey` format). */
export function dayKeyOf(day: number): string {
  const { y, m, d } = civilFromDays(day);
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}

/** `YYYYMMDD` as a number, the Daily Challenge seed (A9.1). */
export function dateNumberOf(day: number): number {
  const { y, m, d } = civilFromDays(day);
  return y * 10000 + m * 100 + d;
}

/** ISO weekday of a day index: Monday 1 ... Sunday 7 (1970-01-01 was a Thursday). */
export function isoWeekday(day: number): number {
  return (((day + 3) % 7) + 7) % 7 + 1;
}

/** ISO week key `GGGG-Www` of a game day; weeks start on Monday at the daily reset. */
export function weekKeyOf(day: number): string {
  const thursday = day - isoWeekday(day) + 4;
  const year = civilFromDays(thursday).y;
  const week = Math.floor((thursday - daysFromCivil(year, 1, 1)) / 7) + 1;
  return `${pad(year, 4)}-W${pad(week, 2)}`;
}

/** Day index from a `YYYY-MM-DD` key, or null when the key does not parse. */
export function dayFromKey(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return daysFromCivil(Number(m[1]), Number(m[2]), Number(m[3]));
}
