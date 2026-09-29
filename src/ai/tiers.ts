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
  /** ± lu added to the aim of area powers (A2.9.9: unchanged; strikes use `strikeK`). */
  powerAimErrorLu: number;
  /**
   * The power ROI bar (A2.9.9, replaces the old gold threshold): a cast needs value × 10,000 ÷ effective
   * cost ≥ this, in bp. P1 calibration: 6,000 at tier 0 rising to 12,000 at V, then 9,000 from VII
   * (the A2.9.9 starting bars were 15,000 at VII and 18,000 at X). A reload spent waiting is value lost,
   * so a picky bar made the upper tiers weaker, not stronger: tier VII vs V (Standard and Short, 240
   * mirrored each, draws half) scored 46% at 15,000 and 50-52% at 9,000. What the upper tiers do better
   * is choose: bait discipline, precise aim, the best strike target and the bait-then-wave play.
   */
  powerRoiBp: number;
  /** Strike aim (A2.9.9): the bot picks among its best k strike targets (3 at 0-II, 2 at III-VI, 1 from VII). */
  strikeK: number;
  /** Casts its Field slot too (A2.9.9: tiers 0-II use the Home slot only). */
  fieldSlot: boolean;
  /** Keeps its Home power's cost in reserve while the Home slot is ≥ 75% reloaded and an army comes (V+). */
  homeReserve: boolean;
  /** Reads the enemy's rings: the push gate wants 20% more while a scouted enemy Home damage power is ready (V+). */
  readsRings: boolean;
  /** Bait discipline (VII+): no Home cast on covered targets worth < 200 unless the base was just hit. */
  baitDiscipline: boolean;
  /** Bait, then wave (VII+): lure the enemy's Home power with cheap units, then send the banked wave. */
  bait: boolean;
  /** Counter-timing (X): the Home bar rises by 3,000 while the enemy banks, saving it for their wave. */
  counterTiming: boolean;
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
  /**
   * Owner feedback 2026-09-28 ("too easy"): the craft of the upper tiers, all fair play on the same
   * observation. Off below tier VI, so tiers 0-V play as A7.3 lists them.
   *
   * - `econPlan`: a Treasury goal is not spent into a push-gate wave, and against a passive foe (no
   *   enemy on the bot's half) a level is bought while it still pays back before the Final Bell.
   * - `waveCommit`: a wave that passed the push gate keeps charging until it has lost half its value
   *   or is worth less than the defence it faces, and a held army goes again only with a 15% margin
   *   over the gate (no charge/hold flapping).
   * - `baseTurrets`: turrets built on spare gold from Bronze on without waiting for pressure.
   */
  econPlan: boolean;
  waveCommit: boolean;
  baseTurrets: number;
  /**
   * War Council use (A18.5.8): the first research start, the least time between two starts, and how
   * the pick is made (0-I at random, II-IV by `aiHint`, V and up by counter scoring on the visible army).
   */
  researchFromTicks: number;
  researchGapTicks: number;
  researchMode: 'random' | 'hint' | 'counter';
  /**
   * How the tier uses research timing (A18.5.8 "Uses enemy research"): `none` (0-IV); `own` (V-VI)
   * pushes when its own Troops rank completes; `both` (VII-X) also strikes while the enemy's Troops item
   * is still running and waits out the first seconds after it lands, and times evolves away from it.
   */
  researchTiming: 'none' | 'own' | 'both';
  /** Moves the Hold flag (A18.4.2: tiers 0-II never move it). */
  movesFlag: boolean;
  /** Uses Fall back (A18.4.2: tiers V and up). */
  fallback: boolean;
  /**
   * Punishes a thin army (A18.6, from Normal = tier IV): pushes when its army value is ≥ 1.5× the
   * enemy's, even if the push gate would bank, so "a few soldiers, then evolve" loses.
   */
  punishThin: boolean;
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
  powerRoiBp: number;
  strikeK: number;
  treasuryMax: number;
  goldFloat: number;
  maxTurrets: number;
}

/** DESIGN A7.3, one row per listed tier. Counter depth "all" is COUNTER_DEPTH_ALL. */
const ROWS: readonly Row[] = [
  { tier: 0, decisionMs: 2000, snapshotMs: 1000, mistakeBp: 4500, maxActions: 2, counterDepth: 0, evolveDelayMs: 10000, aimErrorLu: 250, powerRoiBp: 6000, strikeK: 3, treasuryMax: 0, goldFloat: 450, maxTurrets: 1 },
  { tier: 1, decisionMs: 1600, snapshotMs: 900, mistakeBp: 3500, maxActions: 3, counterDepth: 0, evolveDelayMs: 8000, aimErrorLu: 200, powerRoiBp: 8000, strikeK: 3, treasuryMax: 0, goldFloat: 400, maxTurrets: 4 },
  { tier: 3, decisionMs: 1350, snapshotMs: 770, mistakeBp: 2500, maxActions: 5, counterDepth: 1, evolveDelayMs: 5000, aimErrorLu: 140, powerRoiBp: 10000, strikeK: 2, treasuryMax: 1, goldFloat: 250, maxTurrets: 4 },
  { tier: 5, decisionMs: 1100, snapshotMs: 640, mistakeBp: 1600, maxActions: 7, counterDepth: 3, evolveDelayMs: 3000, aimErrorLu: 90, powerRoiBp: 12000, strikeK: 2, treasuryMax: 2, goldFloat: 180, maxTurrets: 4 },
  { tier: 7, decisionMs: 850, snapshotMs: 510, mistakeBp: 900, maxActions: 9, counterDepth: COUNTER_DEPTH_ALL, evolveDelayMs: 2000, aimErrorLu: 50, powerRoiBp: 9000, strikeK: 1, treasuryMax: 3, goldFloat: 120, maxTurrets: 4 },
  { tier: 10, decisionMs: 500, snapshotMs: 300, mistakeBp: 300, maxActions: 12, counterDepth: COUNTER_DEPTH_ALL, evolveDelayMs: 500, aimErrorLu: 20, powerRoiBp: 9000, strikeK: 1, treasuryMax: 3, goldFloat: 80, maxTurrets: 4 },
];

/** Tiers where the yes/no columns switch on (A7.3). */
const HOLD_FROM = 5;
const REMEMBER_FROM = 7;
const SAFE_WINDOW_FROM = 7;
const PREDICT_FROM = 10;
/** A18.4.2: tiers 0-II never move the Hold flag. */
const FLAG_FROM = 3;
/** A18.6: Normal (tier IV) and up punish a thin army. */
const PUNISH_THIN_FROM = 4;
/** Owner feedback 2026-09-28: the upper-tier craft (`econPlan`, `waveCommit`, turrets). */
const CRAFT_FROM = 6;
/** A2.9.9 power columns: Field slot from III; reserve and ring reading from V; bait from VII; counter-timing at X. */
const FIELD_SLOT_FROM = 3;
const POWER_READ_FROM = 5;
const BAIT_FROM = 7;
const COUNTER_TIMING_FROM = 10;
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
  // A2.9.9: k interpolates and rounds down (a lower k is the sharper aim, so "down" favours the lower tier).
  const strikeK = Math.max(1, Math.floor(lerp(lo.strikeK * 100, hi.strikeK * 100, t, ta, tb) / 100));
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
    powerRoiBp: num('powerRoiBp'),
    strikeK,
    fieldSlot: t >= FIELD_SLOT_FROM * 100,
    homeReserve: t >= POWER_READ_FROM * 100,
    readsRings: t >= POWER_READ_FROM * 100,
    baitDiscipline: t >= BAIT_FROM * 100,
    bait: t >= BAIT_FROM * 100,
    counterTiming: t >= COUNTER_TIMING_FROM * 100,
    powerAnyWhenLowBase: t >= PREDICT_FROM * 100,
    treasuryMax: num('treasuryMax'),
    goldFloat: num('goldFloat'),
    hold: t >= HOLD_FROM * 100,
    turretRebuild: t >= HOLD_FROM * 100,
    maxTurrets: lo.maxTurrets,
    econPlan: t >= CRAFT_FROM * 100,
    waveCommit: t >= CRAFT_FROM * 100,
    baseTurrets: t >= 800 ? 2 : t >= CRAFT_FROM * 100 ? 1 : 0,
    // A18.5.8 tier columns: first research after 1:30 (0-I), 1:00 (II-IV), 0:45 (V-VI), 0:30 (VII-X)
    researchFromTicks: msToTicks(t < 200 ? 90000 : t < 500 ? 60000 : t < 700 ? 45000 : 30000),
    researchGapTicks: msToTicks(t < 200 ? 90000 : t < 500 ? 65000 : t < 700 ? 50000 : 45000),
    researchMode: t < 200 ? 'random' : t < 500 ? 'hint' : 'counter',
    researchTiming: t < 500 ? 'none' : t < 700 ? 'own' : 'both',
    movesFlag: t >= FLAG_FROM * 100,
    fallback: t >= HOLD_FROM * 100,
    punishThin: t >= PUNISH_THIN_FROM * 100,
  };
}

/** Roman numeral label for a tier (0 stays "0"), for dev pages and logs. */
export function tierLabel(tier: number): string {
  const t = Math.trunc(clamp(tier, 0, 10));
  return ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][t] ?? String(t);
}
