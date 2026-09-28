/**
 * Bot tiers (DESIGN A7.3). Six listed rows (0, I, III, V, VII, X); the tiers in between interpolate.
 *
 * - Numeric columns interpolate linearly between the listed tiers and truncate toward the lower tier's
 *   side for counts (actions, Treasury levels).
 * - Counter depth takes the lower listed tier's value.
 * - Yes/no columns switch on at the listed tier.
 * - No bot reacts faster than 300 ms (snapshot delay floor).
 *
 * Tiers are numbers 0-10 (I = 1, X = 10). Fractional tiers are accepted and resolved to 1/100 tier.
 */
import { BP, clamp, msToTicks } from '@/core';

/** "all" in the counter depth column. */
export const COUNTER_DEPTH_ALL = 1000;

/** The resolved A7.3 parameters of one tier. Times are in ticks, money in whole gold. */
export interface TierParams {
  /** The tier the row was resolved for (0-10, may be fractional). */
  tier: number;
  decisionTicks: number;
  snapshotDelayTicks: number;
  /** Chance per decision to make a plausible human error instead of the best action (bp). */
  mistakeBp: number;
  maxActionsPer10s: number;
  /** How many enemies (nearest to the bot's gate first) the counter term looks at; 0 = random pick. */
  counterDepth: number;
  remembersComposition: boolean;
  predictsNextAge: boolean;
  evolveDelayTicks: number;
  /**
   * VII and above evolve only in a safe window: no enemy ground unit can reach 300 lu of the own gate
   * before the Ascension ends (brain.ts). Their evolve delay (2 s at VII, 0.5 s at X) is the reaction time.
   */
  safeWindowEvolve: boolean;
  /** ± lu added to the power aim. */
  powerAimErrorLu: number;
  /** Enemy card value (gold) the best power zone must hold before the bot casts. */
  powerThreshold: number;
  /** X: any zone value qualifies when the own base is below 25%. */
  powerAnyWhenLowBase: boolean;
  treasuryMax: number;
  /** Gold the bot lets pile up before it starts training (DESIGN A7.3 "Gold float target"). */
  goldFloat: number;
  /** Hold stance allowed (A7.3 "Hold / turret rebuild"). */
  hold: boolean;
  /** Rebuilds outdated turrets by modernising them (A7.3 "Hold / turret rebuild"). */
  turretRebuild: boolean;
  maxTurrets: number;
}

interface Row {
  tier: number;
  decisionMs: number;
  snapshotMs: number;
  mistakeBp: number;
  maxActions: number;
  counterDepth: number;
  evolveDelayMs: number;
  aimErrorLu: number;
  powerThreshold: number;
  treasuryMax: number;
  goldFloat: number;
  maxTurrets: number;
}

/** DESIGN A7.3, one row per listed tier. Counter depth "all" is COUNTER_DEPTH_ALL. */
const ROWS: readonly Row[] = [
  { tier: 0, decisionMs: 2000, snapshotMs: 1000, mistakeBp: 4500, maxActions: 2, counterDepth: 0, evolveDelayMs: 10000, aimErrorLu: 250, powerThreshold: 100, treasuryMax: 0, goldFloat: 450, maxTurrets: 1 },
  { tier: 1, decisionMs: 1600, snapshotMs: 900, mistakeBp: 3500, maxActions: 3, counterDepth: 0, evolveDelayMs: 8000, aimErrorLu: 200, powerThreshold: 100, treasuryMax: 0, goldFloat: 400, maxTurrets: 4 },
  { tier: 3, decisionMs: 1350, snapshotMs: 770, mistakeBp: 2500, maxActions: 5, counterDepth: 1, evolveDelayMs: 5000, aimErrorLu: 140, powerThreshold: 250, treasuryMax: 1, goldFloat: 250, maxTurrets: 4 },
  { tier: 5, decisionMs: 1100, snapshotMs: 640, mistakeBp: 1600, maxActions: 7, counterDepth: 3, evolveDelayMs: 3000, aimErrorLu: 90, powerThreshold: 350, treasuryMax: 2, goldFloat: 180, maxTurrets: 4 },
  { tier: 7, decisionMs: 850, snapshotMs: 510, mistakeBp: 900, maxActions: 9, counterDepth: COUNTER_DEPTH_ALL, evolveDelayMs: 2000, aimErrorLu: 50, powerThreshold: 450, treasuryMax: 3, goldFloat: 120, maxTurrets: 4 },
  { tier: 10, decisionMs: 500, snapshotMs: 300, mistakeBp: 300, maxActions: 12, counterDepth: COUNTER_DEPTH_ALL, evolveDelayMs: 500, aimErrorLu: 20, powerThreshold: 600, treasuryMax: 3, goldFloat: 80, maxTurrets: 4 },
];

/** Tiers where the yes/no columns switch on (A7.3). */
const HOLD_FROM = 5;
const REMEMBER_FROM = 7;
const SAFE_WINDOW_FROM = 7;
const PREDICT_FROM = 10;
/** "No bot reacts faster than 300 ms" (A7.3). */
const MIN_REACTION_MS = 300;

/** The tier's position in 1/100 tier, clamped to 0-10. */
function centiTier(tier: number): number {
  const t = Number.isFinite(tier) ? Math.round(tier * 100) : 0;
  return clamp(t, 0, 1000);
}

/** Linear interpolation of an integer column between rows a and b at `t` (1/100 tier), truncated. */
function lerp(a: number, b: number, t: number, ta: number, tb: number): number {
  if (tb === ta) return a;
  return a + Math.trunc(((b - a) * (t - ta)) / (tb - ta));
}

/** Resolves the A7.3 parameters for a tier (0-10). */
export function tierParams(tier: number): TierParams {
  const t = centiTier(tier);
  let lo = ROWS[0] as Row;
  let hi = lo;
  for (const r of ROWS) {
    if (r.tier * 100 <= t) lo = r;
  }
  hi = ROWS.find((r) => r.tier * 100 >= t) ?? lo;
  const ta = lo.tier * 100;
  const tb = hi.tier * 100;
  const num = (k: keyof Omit<Row, 'tier' | 'counterDepth' | 'maxTurrets'>): number => lerp(lo[k], hi[k], t, ta, tb);
  const snapshotMs = Math.max(MIN_REACTION_MS, num('snapshotMs'));
  const snapshotDelayTicks = msToTicks(snapshotMs);
  // The decision interval always exceeds the snapshot delay in A7.3; keep that true after rounding, so
  // every earlier command of the bot is visible when it decides again.
  const decisionTicks = Math.max(snapshotDelayTicks + 1, msToTicks(num('decisionMs')));
  return {
    tier: t / 100,
    decisionTicks,
    snapshotDelayTicks,
    mistakeBp: clamp(num('mistakeBp'), 0, BP),
    maxActionsPer10s: Math.max(1, num('maxActions')),
    counterDepth: lo.counterDepth,
    remembersComposition: t >= REMEMBER_FROM * 100,
    predictsNextAge: t >= PREDICT_FROM * 100,
    evolveDelayTicks: msToTicks(num('evolveDelayMs')),
    safeWindowEvolve: t >= SAFE_WINDOW_FROM * 100,
    powerAimErrorLu: num('aimErrorLu'),
    powerThreshold: num('powerThreshold'),
    powerAnyWhenLowBase: t >= PREDICT_FROM * 100,
    treasuryMax: num('treasuryMax'),
    goldFloat: num('goldFloat'),
    hold: t >= HOLD_FROM * 100,
    turretRebuild: t >= HOLD_FROM * 100,
    maxTurrets: lo.maxTurrets,
  };
}

/** Roman numeral label for a tier (0 stays "0"), for dev pages and logs. */
export function tierLabel(tier: number): string {
  const t = Math.trunc(clamp(tier, 0, 10));
  return ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][t] ?? String(t);
}
