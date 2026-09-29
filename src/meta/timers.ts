/**
 * Clock-driven state (DESIGN A6.3, A6.7, A9.1, B8): capsule charges (+1 every 6 h, bank 12), the
 * Daily Capsule bank (one per day at local 04:00, bank 3), the daily and weekly quest resets, and
 * the Daily Challenge's first-win record. Clock tampering is accepted (A6.3): moving the clock only
 * changes when the next reset happens, the banks cap everything.
 */
import type { SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { accrueCharges } from './charges';
import { accrueDaily, dailyRecord } from './daily';
import { refreshQuests } from './quests';
import type { LocalTime } from './time';
import { fillNewTroopSlots } from './warplan';

/** Brings every timer up to `lt`. Returns the same object when nothing changed. */
export function tickTimersAt(s: SaveDoc, t: Content, lt: LocalTime): SaveDoc {
  // A18.9: the sixth troop slot a save v4 migration added is filled once at the first tick after load.
  let save = fillNewTroopSlots(s, t);
  save = accrueCharges(save, t, lt.t);
  save = accrueDaily(save, t, lt);
  save = refreshQuests(save, t, lt);
  const daily = dailyRecord(save, t, lt);
  return daily === save.daily ? save : { ...save, daily };
}
