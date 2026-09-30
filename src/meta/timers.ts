/**
 * Clock-driven state (DESIGN A6.3, A6.7, A9.1, A15.4, B8): the Sundial (+1 ready capsule every 5 h,
 * holds 34), a Clay meter left full by the 3 → 2 pip change, the retired Supply allowance (it no
 * longer grows), the daily and weekly quest resets, and the Daily Challenge's reward bank. Clock
 * tampering is accepted (A6.3): moving the clock only changes when the next reset happens, the banks
 * cap everything.
 */
import type { SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { accrueCharges, restartSundialOnce, settleClayMeter } from './charges';
import { accrueDaily, dailyRecord } from './daily';
import { grantLegacySkillAeons } from './legacyAeons';
import { refreshQuests } from './quests';
import type { LocalTime } from './time';
import { fillNewTroopSlots } from './warplan';

/** Brings every timer up to `lt`. Returns the same object when nothing changed. */
export function tickTimersAt(s: SaveDoc, t: Content, lt: LocalTime): SaveDoc {
  // A18.9: the sixth troop slot a save v4 migration added is filled once at the first tick after load.
  let save = fillNewTroopSlots(s, t);
  // A6.4, B8: the capsule ladder migration's one-time legacy skill Aeons
  save = grantLegacySkillAeons(save, t, lt.t);
  // Save v10: a bank that was full at the old cap restarts its period now (one-for-one carry-over).
  save = restartSundialOnce(save, lt.t);
  save = accrueCharges(save, t, lt.t);
  // A6.3 (2026-09-30): a meter already at the new pip count becomes its Clay capsule once.
  save = settleClayMeter(save, t, lt.t);
  save = accrueDaily(save, t, lt);
  save = refreshQuests(save, t, lt);
  const daily = dailyRecord(save, t, lt);
  return daily === save.daily ? save : { ...save, daily };
}
