/**
 * The Sundial and the Clay meter (DESIGN A6.3, A15.4; the Sundial replaced capsule charges and the
 * Supply allowance on 2026-09-30).
 *
 * - The Sundial readies one capsule every 5 h (`content.capsules.charges.regenMs`), continuously, and
 *   holds up to 34 (`charges.max`); a new save starts with 12 ready (`charges.start`). The save keeps
 *   the ready count in `capsules.charges` and the start of the current period in `chargesUpdatedAt`
 *   (epoch ms, integer): `ready = min(max, ready + floor((now − chargesUpdatedAt) / regenMs))`, and
 *   the period start moves forward in whole periods. A full Sundial stops filling: its period start is
 *   `now`, so after a claim from a full Sundial the next capsule takes a full period. Time zones, the
 *   04:00 reset and daylight saving never touch it.
 * - Claiming: every finished match except the tutorial and a Retreat claims one ready capsule, win or
 *   lose (`claimSundial`; the caller grants a Sundial Capsule, kind `win`). The first 10 capsules of a
 *   save need no Sundial (`freeCapsulesLeft`, used first). One match claims at most one.
 * - The Clay meter: 2 pips make a Clay capsule without using the Sundial, with no cap. A meter at or
 *   above the pip count (a save from before the 3 → 2 change) turns into one at the next timer tick.
 * - Clock tampering is accepted (no money is involved): a clock moved backwards restarts the current
 *   period and never removes a ready capsule; moved forwards, it fills at most to the cap.
 */
import type { PendingCapsule, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { grantCapsuleAt } from './capsules/grant';
import { META_FLAGS } from './rules';

/** Adds the Sundial capsules readied up to `now`. Returns the same object when nothing changed. */
export function accrueCharges(s: SaveDoc, t: Content, now: number): SaveDoc {
  const c = t.capsules.charges;
  const cap = s.capsules;
  if (cap.charges >= c.max) return cap.charges > c.max ? { ...s, capsules: { ...cap, charges: c.max } } : s;
  if (now < cap.chargesUpdatedAt) return { ...s, capsules: { ...cap, chargesUpdatedAt: now } };
  const n = Math.floor((now - cap.chargesUpdatedAt) / c.regenMs);
  if (n <= 0) return s;
  const charges = Math.min(c.max, cap.charges + n);
  const chargesUpdatedAt = charges >= c.max ? now : cap.chargesUpdatedAt + n * c.regenMs;
  return { ...s, capsules: { ...cap, charges, chargesUpdatedAt } };
}

/**
 * A save that was full under the old 28-charge cap (the v10 migration's `sundial.restart` flag): the
 * old rule never moved `chargesUpdatedAt` while full, so its period restarts at `now` and the flag is
 * cleared. Runs at every timer tick before {@link accrueCharges}; a no-op without the flag.
 */
export function restartSundialOnce(s: SaveDoc, now: number): SaveDoc {
  if (s.flags[META_FLAGS.sundialRestart] !== true) return s;
  const { [META_FLAGS.sundialRestart]: _done, ...flags } = s.flags;
  return { ...s, flags, capsules: { ...s.capsules, chargesUpdatedAt: now } };
}

/** Ready Sundial capsules at `now` (the stored count brought up to `now`). */
export function sundialReady(s: SaveDoc, t: Content, now: number): number {
  return Math.max(0, accrueCharges(s, t, now).capsules.charges);
}

/**
 * When the Sundial readies its next capsule (epoch ms), or null while it is full. The Capsules tab
 * shows it as a local clock time ("Next one at 17:40"), never as a running countdown (A15.3 rule 4).
 */
export function nextSundialAt(s: SaveDoc, t: Content, now: number): number | null {
  const c = t.capsules.charges;
  const a = accrueCharges(s, t, now).capsules;
  if (a.charges >= c.max) return null;
  return a.chargesUpdatedAt + c.regenMs;
}

/** Milliseconds until the next Sundial capsule, or null when it is full (dev page). */
export function nextChargeInMs(s: SaveDoc, t: Content, now: number): number | null {
  const at = nextSundialAt(s, t, now);
  return at === null ? null : Math.max(0, at - now);
}

/**
 * Pays for one match's Sundial Capsule: a free capsule first (the first 10 of a save), then one ready
 * Sundial capsule; null when neither is left (a Ladder match then pays Amber and a Clay pip instead,
 * A6.3). With `useSundial` false only a free capsule can pay (the tutorial's scripted capsules).
 */
export function claimSundial(s: SaveDoc, t: Content, now: number, useSundial = true): { save: SaveDoc; paid: 'free' | 'sundial' } | null {
  const cap = s.capsules;
  if (cap.freeCapsulesLeft > 0) return { save: { ...s, capsules: { ...cap, freeCapsulesLeft: cap.freeCapsulesLeft - 1 } }, paid: 'free' };
  if (!useSundial) return null;
  const accrued = accrueCharges(s, t, now);
  const a = accrued.capsules;
  if (a.charges <= 0) return null;
  const wasFull = a.charges >= t.capsules.charges.max;
  return {
    save: { ...accrued, capsules: { ...a, charges: a.charges - 1, chargesUpdatedAt: wasFull ? now : a.chargesUpdatedAt } },
    paid: 'sundial',
  };
}

/** Adds one Clay meter pip; a full meter becomes a Clay capsule (kind `meter`) and empties. */
export function addClayPip(s: SaveDoc, t: Content, now: number): { save: SaveDoc; meter: number; capsule: PendingCapsule | null } {
  const meter = s.capsules.clayMeter + 1;
  if (meter < t.capsules.clayMeterPips) return { save: { ...s, capsules: { ...s.capsules, clayMeter: meter } }, meter, capsule: null };
  const emptied: SaveDoc = { ...s, capsules: { ...s.capsules, clayMeter: 0 } };
  const g = grantCapsuleAt(emptied, 'meter', t, now);
  return { save: g.save, meter, capsule: g.capsule };
}

/**
 * A meter already at or above the pip count (a save from before the 3 → 2 change of 2026-09-30) turns
 * into one Clay capsule and empties. Runs at every timer tick; a no-op once the meter is below the
 * pip count, so it converts exactly once.
 */
export function settleClayMeter(s: SaveDoc, t: Content, now: number): SaveDoc {
  if (s.capsules.clayMeter < t.capsules.clayMeterPips) return s;
  return grantCapsuleAt({ ...s, capsules: { ...s.capsules, clayMeter: 0 } }, 'meter', t, now).save;
}
