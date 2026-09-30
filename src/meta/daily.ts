/**
 * The Daily Capsule bank (DESIGN A6.3) and the Daily Challenge (A9.1).
 *
 * - Daily Capsule: the first becomes available right after capsule 2 is opened; after that one per
 *   day (reset at local 04:00), banking up to 3. `dailyNextAt` is the next reset that adds one; it is
 *   null until the bank unlocks, and right after the unlock until the next `tickTimers` starts it.
 * - Daily Challenge 2.0 (A15.7): `dailySeed = xmur3('daily' + YYYYMMDD)` for the local day starting
 *   04:00 picks the modifier, the General and the match seed, the same for everyone. Three
 *   difficulties (Recruit II, Veteran V, Warlord VIII), Standard War at L7. `SaveDoc.daily.bank` is
 *   the Daily reward bank (+1 a day, up to 7): a win uses one and pays an Age Capsule; with none
 *   banked a win pays 20 Amber. No streaks, no charges, no trophies or MMR.
 */
import type { AgeId, Result, SaveDoc } from '@/contracts';
import type { Content, DailyDifficulty, ModifierId } from '@/content';
import { randInt, seedSfc32, sfc32Next, xmur3 } from '@/core';
import { grantCapsuleAt } from './capsules/grant';
import { supplyRules } from './supply';
import { META_FLAGS } from './rules';
import { skillTier } from './warChest';
import { dateNumberOf, dayFromKey, dayKeyOf, gameDay, nextResetAt, type LocalTime } from './time';

/**
 * Adds the Supply allowance earned by the resets up to `lt` (capped by the bank). Nothing once the
 * Supply Capsule has retired (`supply.accrues` false, 2026-09-30): the bank only shrinks from then on.
 */
export function accrueDaily(s: SaveDoc, t: Content, lt: LocalTime): SaveDoc {
  if (!s.flags[META_FLAGS.dailyUnlocked]) return s;
  if (!supplyRules(t).accrues) return s;
  const cap = s.capsules;
  const hour = t.capsules.resetHour;
  const next = nextResetAt(lt, hour);
  if (cap.dailyNextAt === null || cap.dailyNextAt > next) {
    // Start the timer (or restart it after the clock moved backwards).
    return cap.dailyNextAt === next ? s : { ...s, capsules: { ...cap, dailyNextAt: next } };
  }
  if (lt.t < cap.dailyNextAt) return s;
  const crossed = gameDay(lt, hour) - gameDay({ t: cap.dailyNextAt - 1, offsetMs: lt.offsetMs }, hour);
  const dailyBank = Math.min(supplyRules(t).allowanceMax, cap.dailyBank + Math.max(1, crossed));
  return { ...s, capsules: { ...cap, dailyBank, dailyNextAt: next } };
}

/** Moves one banked Daily Capsule into the tray, rolled now (A6.3). */
export function claimDaily(s: SaveDoc, t: Content, lt: LocalTime): Result<SaveDoc> {
  const accrued = accrueDaily(s, t, lt);
  if (accrued.capsules.dailyBank <= 0) return { ok: false, reason: 'noDailyCapsule' };
  return { ok: true, value: grantCapsuleAt(accrued, 'daily', t, lt.t).save };
}

/** The Daily Challenge difficulties in picker order (A15.7). */
export const DAILY_DIFFICULTIES: readonly DailyDifficulty[] = ['recruit', 'veteran', 'warlord'];

/** What the shared Daily seed fixes for everyone on one date (A15.7). */
export interface DailyDraw {
  /** `YYYY-MM-DD` of the game day (starting 04:00 local). */
  dayKey: string;
  /** `xmur3('daily' + YYYYMMDD)`. */
  dailySeed: number;
  modifier: ModifierId;
  /** One of the 8 ladder Generals from Pip Quickstep to Madame Tempest. */
  generalId: string;
  /** The match seed. */
  matchSeed: number;
}

/** The Daily draw of a game day: modifier, General and match seed, the same for every player. */
export function dailyDrawOn(t: Content, day: number): DailyDraw {
  const ch = t.dailyModifiers.challenge;
  const dailySeed = xmur3(`daily${dateNumberOf(day)}`)() >>> 0;
  const rng = seedSfc32(dailySeed);
  const order = t.dailyModifiers.order;
  const modifier = order[randInt(rng, order.length)] ?? order[0] ?? 'gold_rush';
  const generalId = ch.generals[randInt(rng, ch.generals.length)] ?? ch.generals[0] ?? 'pip';
  const matchSeed = sfc32Next(rng) >>> 0;
  return { dayKey: dayKeyOf(day), dailySeed, modifier, generalId, matchSeed };
}

/** The Daily draw for `lt`'s local date. */
export function dailyDrawAt(t: Content, lt: LocalTime): DailyDraw {
  return dailyDrawOn(t, gameDay(lt, t.dailyModifiers.challenge.resetHour));
}

/** The Daily Challenge modifier of a game day (A9.1), the same for every player on that date. */
export function dailyModifierOn(t: Content, day: number): ModifierId {
  return dailyDrawOn(t, day).modifier;
}

/** The Daily Challenge modifier for `lt`'s local date. */
export function dailyModifierAt(t: Content, lt: LocalTime): ModifierId {
  return dailyDrawAt(t, lt).modifier;
}

/** The difficulty whose tier is nearest the player's skill tier (ties: the easier one; A15.7). */
export function defaultDailyDifficulty(s: Pick<SaveDoc, 'mmr'>, t: Content): DailyDifficulty {
  const tiers = t.dailyModifiers.challenge.difficulties;
  const skill = skillTier(s.mmr, t);
  let best: DailyDifficulty = 'recruit';
  for (const d of DAILY_DIFFICULTIES) if (Math.abs(tiers[d] - skill) < Math.abs(tiers[best] - skill)) best = d;
  return best;
}

/**
 * `SaveDoc.daily` brought up to `lt` (A15.7): the Daily reward bank gains +1 at each 04:00 passed
 * since `dayKey`, up to `bankMax`. A clock moved backwards only moves the key.
 */
export function dailyRecord(s: SaveDoc, t: Content, lt: LocalTime): SaveDoc['daily'] {
  const ch = t.dailyModifiers.challenge;
  const day = gameDay(lt, ch.resetHour);
  const key = dayKeyOf(day);
  if (s.daily.dayKey === key) return s.daily;
  const prev = dayFromKey(s.daily.dayKey);
  const gained = prev === null || day <= prev ? 0 : day - prev;
  return { dayKey: key, bank: Math.max(0, Math.min(ch.bankMax, s.daily.bank + gained)) };
}

/** The Daily Challenge overview for the mode screen (A15.7). */
export interface DailyInfo extends DailyDraw {
  bank: number;
  bankMax: number;
  defaultDifficulty: DailyDifficulty;
  tiers: Readonly<Record<DailyDifficulty, number>>;
}

export function dailyInfoAt(s: SaveDoc, t: Content, lt: LocalTime): DailyInfo {
  const ch = t.dailyModifiers.challenge;
  return { ...dailyDrawAt(t, lt), bank: dailyRecord(s, t, lt).bank, bankMax: ch.bankMax, defaultDifficulty: defaultDailyDifficulty(s, t), tiers: ch.difficulties };
}

/**
 * Result of a Daily Challenge win (A15.7): a banked reward pays an Age Capsule and uses one; with
 * the bank empty a win pays 20 Amber. No charges, trophies or MMR.
 */
export function dailyWin(s: SaveDoc, t: Content, lt: LocalTime, age?: AgeId): { save: SaveDoc; capsuleId: string | null; amber: number } {
  const record = dailyRecord(s, t, lt);
  if (record.bank > 0) {
    const g = grantCapsuleAt({ ...s, daily: { ...record, bank: record.bank - 1 } }, 'age', t, lt.t, age ? { age } : {});
    return { save: g.save, capsuleId: g.capsule.id, amber: 0 };
  }
  const amber = t.dailyModifiers.challenge.winAmber;
  return { save: { ...s, daily: record, currencies: { ...s.currencies, amber: s.currencies.amber + amber } }, capsuleId: null, amber };
}
