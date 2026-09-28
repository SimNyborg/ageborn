/**
 * Capsule charges and the Clay meter (DESIGN A6.3).
 *
 * - A new save starts with 12 charges; +1 charge every 6 h, continuously, banking up to 28 (A15.4;
 *   both numbers come from `content.capsules.charges`).
 *   `chargesUpdatedAt` is the start of the current 6 h period; while the bank is full it is reset
 *   when a charge is spent, so the next charge always takes a full period.
 * - The first 10 capsules of a save never use a charge (`freeCapsulesLeft`, spent by Win Capsules
 *   from matches). Only ladder wins use charges.
 * - The Clay meter: 3 pips make a Clay capsule without using a charge, with no cap.
 * - Clock tampering is accepted (no money is involved); a clock moved backwards only restarts the
 *   current period, it never takes charges away.
 */
import type { PendingCapsule, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { grantCapsuleAt } from './capsules/grant';

/** Adds the charges earned up to `now`. */
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

/** Milliseconds until the next charge, or null when the bank is full. */
export function nextChargeInMs(s: SaveDoc, t: Content, now: number): number | null {
  const c = t.capsules.charges;
  if (s.capsules.charges >= c.max) return null;
  const since = Math.max(0, now - s.capsules.chargesUpdatedAt);
  return c.regenMs - (since % c.regenMs);
}

/**
 * How a match's Win Capsule is paid for: a free capsule first, then a charge; null when neither is
 * left (the win then pays Amber and a Clay pip instead, A6.3).
 */
export function payForWinCapsule(s: SaveDoc, t: Content, now: number, useCharge: boolean): { save: SaveDoc; paid: 'free' | 'charge' } | null {
  const cap = s.capsules;
  if (cap.freeCapsulesLeft > 0) return { save: { ...s, capsules: { ...cap, freeCapsulesLeft: cap.freeCapsulesLeft - 1 } }, paid: 'free' };
  if (!useCharge) return null;
  const accrued = accrueCharges(s, t, now);
  const a = accrued.capsules;
  if (a.charges <= 0) return null;
  const wasFull = a.charges >= t.capsules.charges.max;
  return {
    save: { ...accrued, capsules: { ...a, charges: a.charges - 1, chargesUpdatedAt: wasFull ? now : a.chargesUpdatedAt } },
    paid: 'charge',
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
