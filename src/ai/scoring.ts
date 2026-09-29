/**
 * The A7.2 scoring terms. Every term is clamped to [0, 1] and expressed in bp (10,000 = 1); personality
 * multipliers m = 0.5 + w / 100 are bp too. Money is milli-gold, card values whole gold, positions
 * milli-lu in the bot's frame.
 *
 * | Term | Definition (A7.2) |
 * |---|---|
 * | f_push | 0.5 + (myArmy − foeArmy) / (2 × max(myArmy, foeArmy, 300)) |
 * | f_role(c) | 1 / (1 + own alive units in c's role group) |
 * | f_save(c) | 1 when a saving goal is active and gold − cost(c) would drop below it |
 * | f_pressure | enemy value within 480 lu of own gate / 400 |
 * | f_spare | (gold − cost) / 300 |
 */
import type { PowerDef } from '@/contracts';
import { BP, MILLI, clamp } from '@/core';
import type { View } from './view';

/** Truncated product of two bp values. */
export function mulBp(a: number, b: number): number {
  return Math.trunc((a * b) / BP);
}

export function clampBp(v: number): number {
  return clamp(v, 0, BP);
}

/** f_push, bp. */
export function fPush(myArmy: number, foeArmy: number): number {
  const den = 2 * Math.max(myArmy, foeArmy, 300);
  return clampBp(BP / 2 + Math.trunc(((myArmy - foeArmy) * BP) / den));
}

/** f_role for a group that already has `n` own units, bp. */
export function fRole(n: number): number {
  return Math.trunc(BP / (1 + Math.max(0, n)));
}

/** "enemy value within 480 lu of own gate". */
export const PRESSURE_RADIUS = 480 * MILLI;

/** f_pressure from the enemy value near the gate (whole gold), bp. */
export function fPressure(valueNearGate: number): number {
  return clampBp(Math.trunc((valueNearGate * BP) / 400));
}

/** f_spare for spending `cost` out of `gold` (both milli), bp. */
export function fSpare(gold: number, cost: number): number {
  return clampBp(Math.trunc(((gold - cost) * BP) / (300 * MILLI)));
}

/** A7.2 train score coefficients, bp of score. */
export const TRAIN = {
  counter: 10000,
  push: 6000,
  role: 4000,
  legendary: 3000,
  banking: 3000,
  save: 8000,
} as const;

/** Other A7.2 action scores and factors, bp of score. */
export const SCORE = {
  mount: 8000,
  modernise: 8000,
  evolve: 12000,
  power: 10000,
  lastStand: 20000,
  stance: 15000,
  /** A Hold flag move (A18.4.2): below a stance change, above training. */
  flag: 14000,
  /** A power cast right before an own Evolve, so the 50% carry cap does not waste charge (A2.13). */
  powerBeforeEvolve: 13000,
  /** While a saving goal is active, candidates below this wait (a train paused by f_save lands below it). */
  savingBar: 5000,
} as const;

/** "range ≥ 250" (A7.2 banking preference). */
export const BANKING_RANGE = 250 * MILLI;

/** Where a power would do the most good and how much enemy value (whole gold) it covers. */
export interface PowerZone {
  /** Zone centre in the bot's frame, milli-lu; null for powers that take no aim. */
  p: number | null;
  value: number;
}

/** Power aim scan step (A2.9 auto-aim uses 10 lu). */
const SCAN_STEP = 10 * MILLI;
/** A buff power is worth casting only when the bot's units are this close to a fight. */
const BUFF_ENGAGE = 300 * MILLI;
/** Paratroopers fight the enemy units this far behind the enemy front. */
const PARADROP_REACH = 450 * MILLI;
/** Stampede's start without own ground units (A5.7 "or p = 200"). */
const STAMPEDE_FALLBACK = 200 * MILLI;

/**
 * The best zone for the equipped power (A7.2 "the best zone's enemy value"), per effect kind:
 * barrage and sweep scan their zone over the clamp; the smoke cloud its width; the stampede runs from
 * the bot's front; buffs count the bot's own army when it is engaged; paratroopers the enemy value
 * just behind the enemy front.
 */
export function bestPowerZone(v: View, power: PowerDef, zoneMin: number, zoneMax: number): PowerZone {
  const fx = power.effect;
  switch (fx.kind) {
    case 'barrage':
    case 'sweep':
    case 'cloud': {
      const width = (fx.kind === 'cloud' ? fx.width : fx.zone) * MILLI;
      const hitsAir = fx.kind === 'cloud' ? true : fx.hitsAir;
      const half = Math.trunc(width / 2);
      let bestP: number | null = null;
      let best = 0;
      for (let p = zoneMin; p <= zoneMax; p += SCAN_STEP) {
        let sum = 0;
        for (const u of v.foes) {
          if (u.air && !hitsAir) continue;
          const d = u.p > p ? u.p - p : p - u.p;
          if (d <= half) sum += u.value;
        }
        if (sum > best) {
          best = sum;
          bestP = p;
        }
      }
      return { p: bestP, value: best };
    }
    case 'stampede': {
      const start = v.myFront ?? STAMPEDE_FALLBACK;
      let sum = 0;
      for (const u of v.foes) if (!u.air && u.p >= start && u.p <= start + fx.distance * MILLI) sum += u.value;
      return { p: null, value: sum };
    }
    case 'buffAll': {
      if (v.myFront === null || v.foeFront === null || v.foeFront - v.myFront > BUFF_ENGAGE) return { p: null, value: 0 };
      return { p: null, value: v.myArmy };
    }
    case 'paradrop': {
      if (v.foeFront === null) return { p: null, value: 0 };
      let sum = 0;
      for (const u of v.foes) if (u.p >= v.foeFront && u.p <= v.foeFront + PARADROP_REACH) sum += u.value;
      return { p: null, value: sum };
    }
  }
}
