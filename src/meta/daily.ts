/**
 * The Daily Capsule bank (DESIGN A6.3) and the Daily Challenge (A9.1).
 *
 * - Daily Capsule: the first becomes available right after capsule 2 is opened; after that one per
 *   day (reset at local 04:00), banking up to 3. `dailyNextAt` is the next reset that adds one; it is
 *   null until the bank unlocks, and right after the unlock until the next `tickTimers` starts it.
 * - Daily Challenge: Standard War, one symmetric modifier per day seeded by the local date
 *   (`YYYYMMDD`, day starting 04:00). The first win of the day gives an Age Capsule; other wins pay
 *   20 Amber. `SaveDoc.daily` records whether today's first win happened.
 */
import type { AgeId, Result, SaveDoc } from '@/contracts';
import type { Content, ModifierId } from '@/content';
import { randInt, seedSfc32 } from '@/core';
import { grantCapsuleAt } from './capsules/grant';
import { META_FLAGS } from './rules';
import { dateNumberOf, dayKeyOf, gameDay, nextResetAt, type LocalTime } from './time';

/** Adds the Daily Capsules earned by the resets up to `lt` (capped by the bank). */
export function accrueDaily(s: SaveDoc, t: Content, lt: LocalTime): SaveDoc {
  if (!s.flags[META_FLAGS.dailyUnlocked]) return s;
  const cap = s.capsules;
  const hour = t.capsules.resetHour;
  const next = nextResetAt(lt, hour);
  if (cap.dailyNextAt === null || cap.dailyNextAt > next) {
    // Start the timer (or restart it after the clock moved backwards).
    return cap.dailyNextAt === next ? s : { ...s, capsules: { ...cap, dailyNextAt: next } };
  }
  if (lt.t < cap.dailyNextAt) return s;
  const crossed = gameDay(lt, hour) - gameDay({ t: cap.dailyNextAt - 1, offsetMs: lt.offsetMs }, hour);
  const dailyBank = Math.min(t.capsules.daily.bankMax, cap.dailyBank + Math.max(1, crossed));
  return { ...s, capsules: { ...cap, dailyBank, dailyNextAt: next } };
}

/** Moves one banked Daily Capsule into the tray, rolled now (A6.3). */
export function claimDaily(s: SaveDoc, t: Content, lt: LocalTime): Result<SaveDoc> {
  const accrued = accrueDaily(s, t, lt);
  if (accrued.capsules.dailyBank <= 0) return { ok: false, reason: 'noDailyCapsule' };
  return { ok: true, value: grantCapsuleAt(accrued, 'daily', t, lt.t).save };
}

/** The Daily Challenge modifier of a game day (A9.1), the same for every player on that date. */
export function dailyModifierOn(t: Content, day: number): ModifierId {
  const order = t.dailyModifiers.order;
  const rng = seedSfc32(dateNumberOf(day));
  return order[randInt(rng, order.length)] ?? order[0] ?? 'gold_rush';
}

/** The Daily Challenge modifier for `lt`'s local date. */
export function dailyModifierAt(t: Content, lt: LocalTime): ModifierId {
  return dailyModifierOn(t, gameDay(lt, t.dailyModifiers.challenge.resetHour));
}

/** `SaveDoc.daily` for today: a new day clears the first-win flag. */
export function dailyRecord(s: SaveDoc, t: Content, lt: LocalTime): SaveDoc['daily'] {
  const key = dayKeyOf(gameDay(lt, t.dailyModifiers.challenge.resetHour));
  return s.daily.dayKey === key ? s.daily : { dayKey: key, won: false };
}

/** Result of a Daily Challenge win: the first of the day gives an Age Capsule, later ones Amber. */
export function dailyWin(s: SaveDoc, t: Content, lt: LocalTime, age?: AgeId): { save: SaveDoc; capsuleId: string | null; amber: number } {
  const record = dailyRecord(s, t, lt);
  if (!record.won) {
    const g = grantCapsuleAt({ ...s, daily: { ...record, won: true } }, 'age', t, lt.t, age ? { age } : {});
    return { save: g.save, capsuleId: g.capsule.id, amber: 0 };
  }
  const amber = t.dailyModifiers.challenge.winAmber;
  return { save: { ...s, daily: record, currencies: { ...s.currencies, amber: s.currencies.amber + amber } }, capsuleId: null, amber };
}
