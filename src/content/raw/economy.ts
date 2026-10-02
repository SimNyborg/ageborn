/**
 * Economy and battle numbers (DESIGN A2.1-A2.11, A5.1), in table units: gold, XP, lu, lu/s, ms,
 * bp for percentages. Data only. The WP1 compiler converts to milli-gold, ticks and so on (B3, B4).
 */
import type { DamageMod, EconomyRules, FormatDef } from '@/contracts/content';
import type { AgeId, FormatId, FormatKind } from '@/contracts/ids';
import type { RawAgeScale, RawBattleRules, RawDamageMods } from './types';

/**
 * DESIGN A17.8 power scale (P; Bronze and Industrial are half steps of ×1.16, the rest ×1.35) and XP to
 * evolve out of each age (small steps cost less XP, big steps more). Base max HP = 8,000 × P (MVP balance
 * pass 2026-10-01; was 10,000 × P): a full 60-pop army needed 126 s to raze an undefended base against a
 * 40-60 s target, and the tier V mirror reached the Final Bell in 39 / 43 / 21% of Short / Standard /
 * Full Wars. With the power trim and the falling gate at 300 lu: 16 / 13.5 / 3% (n = 200 per format).
 */
export const ageScale: Record<AgeId, RawAgeScale> = {
  stone: { id: 'stone', index: 0, pBp: 10000, baseHp: 8000, xpToNext: 550 },
  bronze: { id: 'bronze', index: 1, pBp: 11600, baseHp: 9280, xpToNext: 500 },
  medieval: { id: 'medieval', index: 2, pBp: 13500, baseHp: 10800, xpToNext: 900 },
  gunpowder: { id: 'gunpowder', index: 3, pBp: 18200, baseHp: 14560, xpToNext: 700 },
  industrial: { id: 'industrial', index: 4, pBp: 21200, baseHp: 16960, xpToNext: 800 },
  modern: { id: 'modern', index: 5, pBp: 24600, baseHp: 19680, xpToNext: 1200 },
  future: { id: 'future', index: 6, pBp: 33200, baseHp: 26560, xpToNext: 1300 },
  cosmic: { id: 'cosmic', index: 7, pBp: 44800, baseHp: 35840, xpToNext: null },
};

/**
 * XP to evolve out of each position of a window (DESIGN A18.3.2): thresholds follow the position in
 * the match's age window, not the age (every card costs the same in every age, so XP income does not
 * depend on the age). The first age stays shortest so a new player sees the first evolve by ~1:10.
 */
export const WINDOW_XP: readonly number[] = [620, 1300, 1580, 1800, 1850, 2000];

/** Clocks by window length (DESIGN A18.3.4), ms from match start, and the format family of each length. */
export const WINDOW_CLOCKS: Readonly<Record<number, { kind: FormatKind; overdriveMs: number; siegeMs: number; finalBellMs: number }>> = {
  1: { kind: 'window', overdriveMs: 210000, siegeMs: 270000, finalBellMs: 360000 },
  2: { kind: 'window', overdriveMs: 255000, siegeMs: 330000, finalBellMs: 435000 },
  3: { kind: 'short', overdriveMs: 300000, siegeMs: 390000, finalBellMs: 510000 },
  4: { kind: 'window', overdriveMs: 390000, siegeMs: 495000, finalBellMs: 630000 },
  5: { kind: 'standard', overdriveMs: 480000, siegeMs: 600000, finalBellMs: 750000 },
  7: { kind: 'full', overdriveMs: 720000, siegeMs: 870000, finalBellMs: 1050000 },
};

/** Retreat unlocks after 1:00 in every window (A2.10). */
const RETREAT_MS = 60000;

/** One step of the Siege rope in a timed format, timed from Siege (A2.10.2). */
export interface TimedRopeStep {
  afterSiegeMs: number;
  baseDamageBp: number;
  turretDamageBp: number;
  crumbleBpPerSec: number;
}

/**
 * The Siege rope of the timed formats (DESIGN A2.10.2, owner decision 2026-10-02): in Short, Medium and
 * Long War (every start era) Siege has no symmetric base decay; instead, every second the side whose own
 * half holds the fight (its front more than the dead band behind the other's, the Last Base Standing rope)
 * loses a share of its base's max HP, and the rope tightens once. The Final Bell still ends the war.
 * Shorter War Path and custom windows keep today's Siege. Short's Siege lasts only 2:00, so its rope is
 * stronger and its second step also raises base damage and cuts turret damage.
 */
export const TIMED_ROPE: Readonly<Record<'short' | 'standard' | 'full', readonly TimedRopeStep[]>> = {
  short: [
    { afterSiegeMs: 0, baseDamageBp: 20000, turretDamageBp: 5000, crumbleBpPerSec: 85 },
    { afterSiegeMs: 45000, baseDamageBp: 30000, turretDamageBp: 3500, crumbleBpPerSec: 135 },
  ],
  standard: [
    { afterSiegeMs: 0, baseDamageBp: 20000, turretDamageBp: 5000, crumbleBpPerSec: 65 },
    { afterSiegeMs: 60000, baseDamageBp: 20000, turretDamageBp: 5000, crumbleBpPerSec: 115 },
  ],
  full: [
    { afterSiegeMs: 0, baseDamageBp: 20000, turretDamageBp: 5000, crumbleBpPerSec: 75 },
    { afterSiegeMs: 60000, baseDamageBp: 20000, turretDamageBp: 5000, crumbleBpPerSec: 125 },
  ],
};

/** A timed format's Siege steps from its rope (A2.10.2); none for a window without one. */
function timedEscalation(kind: FormatKind, siegeMs: number): FormatDef['escalation'] {
  const rope = kind === 'short' || kind === 'standard' || kind === 'full' ? TIMED_ROPE[kind] : null;
  if (!rope) return undefined;
  return rope.map((x) => ({ atMs: siegeMs + x.afterSiegeMs, baseDamageBp: x.baseDamageBp, turretDamageBp: x.turretDamageBp, crumbleBpPerSec: x.crumbleBpPerSec }));
}

/**
 * The id of the window of `length` ages starting at `start` (DESIGN A18.3.4): the named formats from
 * Stone (`short`, `standard`, `full`), `short.bronze` style ids for later starts, `w<length>.<start>`
 * for the shorter War Path and custom windows (1, 2 and 4 ages).
 */
export function windowFormatId(length: number, start: AgeId): FormatId {
  const kind = WINDOW_CLOCKS[length]?.kind ?? 'window';
  if (kind === 'window') return `w${length}.${start}`;
  return start === 'stone' ? kind : `${kind}.${start}`;
}

/** Every window of every length in {@link WINDOW_CLOCKS} over these ages (in age order). */
function windowFormats(ageOrder: readonly AgeId[]): Record<FormatId, FormatDef> {
  const out: Record<FormatId, FormatDef> = {};
  for (const length of Object.keys(WINDOW_CLOCKS).map(Number)) {
    const c = WINDOW_CLOCKS[length];
    if (!c) continue;
    for (let i = 0; i + length <= ageOrder.length; i += 1) {
      const ages = ageOrder.slice(i, i + length);
      const id = windowFormatId(length, ages[0] as AgeId);
      const escalation = timedEscalation(c.kind, c.siegeMs);
      out[id] = {
        id,
        kind: c.kind,
        ages,
        overdriveMs: c.overdriveMs,
        siegeMs: c.siegeMs,
        finalBellMs: c.finalBellMs,
        retreatAfterMs: RETREAT_MS,
        xpToNextOverride: WINDOW_XP.slice(0, length - 1),
        ...(escalation ? { escalation } : {}),
      };
    }
  }
  return out;
}

/**
 * Last Base Standing (DESIGN A2.10.1, owner request 2026-10-01): a 7-age war with no Final Bell. After
 * Overdrive (12:00) the Siege rises every 2:30 from 14:30 and the Crumble rope starts at 23:00, so a
 * base always falls (by `endByMs`, derived from the steps by a content test). Siege I is today's Siege
 * without the base decay; Siege II and III raise base damage and cut turret damage; Crumble keeps Siege
 * III's values and adds the rope (bp of base max HP per second), which rises by half at Crumble II.
 *
 * Tuned at gate size (fixer review 2026-10-01, `sim-cli lbs --mode full`, tier VII mirrors, n = 400 per
 * seed set): the first values (×3/×4, Crumble 22:00 at 0.5%/s) ended 41% of mirrors in Crumble against
 * the ≤ 35% gate; later or earlier steps alone, or stronger steps alone, moved it 1-5 points. A stronger
 * Siege II-III plus a later, faster rope gives 32.5% and 35.0% on two seed sets and an earlier guarantee
 * (25:44 instead of 26:35).
 */
export const UNTIMED = {
  overdriveMs: 720000,
  steps: [
    { atMs: 870000, baseDamageBp: 20000, turretDamageBp: 5000, crumbleBpPerSec: 0 },
    { atMs: 1020000, baseDamageBp: 35000, turretDamageBp: 3000, crumbleBpPerSec: 0 },
    { atMs: 1170000, baseDamageBp: 50000, turretDamageBp: 2000, crumbleBpPerSec: 0 },
    { atMs: 1380000, baseDamageBp: 50000, turretDamageBp: 2000, crumbleBpPerSec: 100 },
    { atMs: 1470000, baseDamageBp: 50000, turretDamageBp: 2000, crumbleBpPerSec: 150 },
  ],
  /** 23:00 + 90 s at ≥ 1 point/s + 74 s at ≥ 1.5 points/s of combined base HP (A2.10.1): 25:44. */
  endByMs: 1544000,
} as const;

/** The Last Base Standing windows (A2.10.1): `last` from Stone and, for Skirmish, `last.bronze`. */
function untimedFormats(ageOrder: readonly AgeId[]): Record<FormatId, FormatDef> {
  const out: Record<FormatId, FormatDef> = {};
  for (const start of ['stone', 'bronze'] as const) {
    const i = ageOrder.indexOf(start);
    if (i < 0 || i + 7 > ageOrder.length) continue;
    const id = start === 'stone' ? 'last' : `last.${start}`;
    out[id] = {
      id,
      kind: 'untimed',
      ages: ageOrder.slice(i, i + 7),
      overdriveMs: UNTIMED.overdriveMs,
      siegeMs: UNTIMED.steps[0].atMs,
      finalBellMs: null,
      retreatAfterMs: RETREAT_MS,
      xpToNextOverride: WINDOW_XP.slice(0, 6),
      escalation: UNTIMED.steps.map((x) => ({ ...x })),
      endByMs: UNTIMED.endByMs,
    };
  }
  return out;
}

/** Ages in `AgeDef.index` order. */
const AGE_LIST: readonly AgeId[] = (Object.values(ageScale) as RawAgeScale[]).sort((a, b) => a.index - b.index).map((a) => a.id);

/**
 * DESIGN A18.3.4 match formats: every format is a window of consecutive ages. Short War is 3 ages,
 * Standard 5, Full 7 (from Stone unless the player picks a later start era); War Path and custom
 * windows of 1, 2 and 4 ages use their own clocks. The tutorial alone skips ages and keeps its
 * five-age run and retimed thresholds (onboarding match 1 is unchanged).
 */
export const formats: Record<FormatId, FormatDef> = {
  tutorial: {
    id: 'tutorial',
    kind: 'tutorial',
    ages: ['stone', 'medieval', 'gunpowder', 'modern', 'future'],
    overdriveMs: null,
    siegeMs: null,
    finalBellMs: null,
    retreatAfterMs: null,
    // A8 beat times kept under the A18.3.2 XP sources (retimed 2026-09-29; A17 values 680 / 690 / 520 / 700)
    xpToNextOverride: [610, 580, 390, 900],
  },
  ...windowFormats(AGE_LIST),
  ...untimedFormats(AGE_LIST),
};

/**
 * DESIGN A2.6 role-default damage mods, in order. Multipliers in bp (10,000 = ×1.0).
 * Anti-heavy (the Anti-armor role, owner feedback 2026-09-29): a first `legendary` entry keeps every
 * Legendary matchup at the pre-change multiplier, so only Heavies and other armored or mech units
 * feel the raise.
 */
export const damageMods: RawDamageMods = {
  blunt: [{ vs: 'armored', bp: 7000 }],
  meleeAntiArmor: [
    { vs: 'legendary', bp: 20000 },
    { vs: 'armored', bp: 30000 },
    { vs: 'mech', bp: 30000 },
    { vs: 'light', bp: 7500 },
  ],
  rangedAntiArmor: [
    { vs: 'legendary', bp: 20000 },
    { vs: 'armored', bp: 30000 },
    { vs: 'mech', bp: 30000 },
    { vs: 'light', bp: 5000 },
  ],
  grenadier: [
    { vs: 'legendary', bp: 15000 },
    { vs: 'armored', bp: 25000 },
    { vs: 'mech', bp: 25000 },
    { vs: 'light', bp: 5000 },
  ],
  flak: [{ vs: 'air', bp: 20000 }],
  congreve: [{ vs: 'air', bp: 15000 }],
};

/**
 * Per-card Anti-heavy mods outside the role defaults (A2.6; owner feedback 2026-09-29). Kept apart
 * from {@link damageMods} so the frozen raw fixture keeps its shape.
 */
export const antiHeavyMods: Readonly<Record<'harpoon' | 'rail', DamageMod[]>> = {
  /**
   * Harpoon Gunner: legendary ×2.0, armored ×3.0, mech ×3.0, light ×0.5 (×2.5 left Industrial as the
   * one age where mono Heavy still beat the tier VII bot, 87.5% in `w1.industrial`; review 2026-09-30).
   */
  harpoon: [
    { vs: 'legendary', bp: 20000 },
    { vs: 'armored', bp: 30000 },
    { vs: 'mech', bp: 30000 },
    { vs: 'light', bp: 5000 },
  ],
  /** Rail Gunner (pierces 2): armored ×2.0, mech ×2.0, light ×0.5 (unchanged). */
  rail: [
    { vs: 'armored', bp: 20000 },
    { vs: 'mech', bp: 20000 },
    { vs: 'light', bp: 5000 },
  ],
};

/** DESIGN A2.3-A2.11 economy and rule constants (the contract's `EconomyRules`). */
export const economy: EconomyRules = {
  // A2.3 Gold
  startGold: 175,
  passiveGoldPerSec: 6,
  // A18.3.2 XP: 5 XP/s passive (the Treasury is replaced by the War Council's Economy track, A18.5.4)
  passiveXpPerSec: 5,
  // A2.3 Turret slots: index i is the price of mount i + 1; mount 1 is free
  mountCosts: [0, 150, 350, 700],
  // A18.3.2 / A18.3.3 bounties: the winner is not paid twice (kill bounty 50%, kill XP 70%, loss XP 50%)
  bountyGoldBp: 5000,
  bountyXpBp: 7000,
  powerKillGoldBp: 3000,
  powerKillXpBp: 0,
  ownLossXpBp: 5000,
  underdogBp: 5000,
  // A18.3.2: 8 XP per 1% of the enemy base's current max HP
  baseDamageXpPerPct: 8,
  // A2.4: XP never exceeds 1.5× the current threshold
  xpCapBp: 15000,
  // A2.7 Population and training
  popCap: 60,
  // `fort`: the hidden fort twins (walls, towers, camps use 6; a trap's 3 is on its card, A16.14.2)
  popByGroup: { infantry: 2, ranged: 3, antiArmor: 4, support: 4, heavy: 6, epic: 8, legendary: 14, fort: 6 },
  queueMax: 5,
  legendaryLimit: 1,
  // A2.3 / A2.8 Turrets
  sellRefundBp: 5000,
  turretRangeCap: 480,
  // A18.2 rule 4: research, relics and modifiers never push a turret past 560 lu from its gate
  turretRangeHardCapLu: 560,
  turretBuildMs: 1000,
  turretSellMs: 1000,
  // A2.2 / A2.4 Evolve
  ascendMs: 2500,
  evolveHealBp: 500,
  vanguardCount: 2,
  // A2.9.3 Age Powers: each slot reloads on its own (PowerDef.reloadMs); 75% carry cap across an evolve
  powerCarryCapBp: 7500,
  // A18.3.2 Overcharge: in the final age every 1,650 XP adds +25% to the less-reloaded equipped slot
  overchargeXp: 1650,
  overchargeBp: 2500,
  // A2.10 phases; A2.9.3: no power reload bonus in Overdrive and Siege (`powerBp` 10,000, a lever)
  overdrive: { baseGoldBp: 20000, xpBp: 20000, powerBp: 10000 },
  // A2.9.3-A2.9.6 power rules and data levers (lu, bp, ms)
  power: {
    // every slot starts 25% reloaded; an empty slot accrues at 40 s and carries at an evolve
    startBp: 2500,
    emptyReloadMs: 40000,
    // Home powers touch only enemies with own-frame p ≤ 1,000 (mid-lane, inclusive)
    homeLineP: 1000,
    // Front reach: F (the frontRank-th frontmost trained ground unit) + 150, never below the 480 cover edge
    frontReachLu: 150,
    frontFloorP: 480,
    frontRank: 1,
    // a manual strike locks the eligible enemy nearest the aim within 80 lu; Epics take 50% from strikes
    strikePickLu: 80,
    strikeEpicBp: 5000,
    // Legendaries take 50% of a power's stun, snare, slow and mark duration and pull distance
    legendaryControlBp: 5000,
    // optional shared lockout after a cast (lever; 0 = off)
    lockMs: 0,
  },
  // A16.14 Forts (spec section 13): 5 pads (3 Home inside turret cover, 2 Field), at most 2 alive and 1 camp,
  // 25 s shared recharge (first at 0:20), 5 s scaffold at 50% HP, decay 1%/s from 60 s after completion and
  // 2%/s from the start of Siege, ×2 in Siege, ×0.5 from other attacks with range ≥ 100, ×2 structure mod
  // (Heavy, Legendary, siege, artillery), bounty at the unit rates, tower reach never past own-frame p 560,
  // a 5-attacker contact cap; kind stats from the age baselines (walls 1.0 H, towers 0.5 H with 1.5 R,
  // camps 0.6 H, levies 0.4 I with 16% of the Infantry cost as AI value)
  fort: {
    pads: [160, 230, 300, 640, 820],
    homePads: 3,
    padClearLu: 120,
    fieldBehindLu: 100,
    fieldFrontRank: 2,
    // 1 fort (or trap) up at a time (the A16.14.9 maxAlive lever, fixer 2026-10-01)
    maxAlive: 1,
    maxCamps: 1,
    maxTowers: 2,
    rechargeMs: 25000,
    firstReadyMs: 20000,
    scaffoldMs: 5000,
    scaffoldHpBp: 5000,
    safeMarginMs: 1000,
    decayStartMs: 60000,
    decayBpPerSec: 100,
    siegeDecayBp: 20000,
    decayCreditMs: 3000,
    siegeTakenBp: 20000,
    rangedTakenBp: 5000,
    rangedMinLu: 100,
    structureBp: 20000,
    bountyGoldBp: 5000,
    bountyXpBp: 7000,
    towerReachMaxP: 560,
    contactLu: 60,
    contactMax: 5,
    wallHpBp: 10000,
    towerHpBp: 5000,
    campHpBp: 6000,
    towerDamageBp: 15000,
    // levies 35% of the age's Infantry Common (was 40%: the levies supplied 15-28 points of a camp's edge;
    // then 30%, which left camps 6-7 points under the wall in Bronze and Gunpowder; MVP balance pass 2026-10-01)
    levyHpBp: 3500,
    levyDamageBp: 3500,
    levyAiValueBp: 1600,
  },
  // A17.3 Siege forced march: unit movement ×1.2; A16.4 step 2 siege crowd: 60 lu before the enemy gate
  // A2.10.1 Last Base Standing: the Crumble rope's dead band (fronts within 40 lu: both sides crumble)
  siege: { turretDamageBp: 5000, baseDamageBp: 20000, decayBpPerSec: 50, moveSpeedBp: 12000, gateCrowdLu: 60, ropeDeadBandLu: 40 },
  // A16.4 stall fix (A17 step 1): in Overdrive and Siege a unit killed within 300 lu of its own gate costs
  // its base its max HP, so spawn-camping a beaten side ends the match (docs/decisions.md). 300 lu (MVP
  // balance pass 2026-10-01; was 120): a side pushed back to its gate in the late game now bleeds, the
  // strongest single Bell lever measured (tier V Short 25 → 9%, with base HP ×0.6 and the power trim)
  gateFall: { lu: 300, hpBp: 10000 },
  // A17.2 unit walking speed: table speed ×1.25, applied once at compile time
  marchSpeedBp: 12500,
  // A2.7 / A16.4 L4: a three-wide front
  frontWidth: 3,
  // A2.11 Last Stand: arms at ≤ 25%, auto at 10%, 450 lu, 200 × P damage, 80 lu knockback, 1.0 s charge
  lastStand: { thresholdBp: 2500, autoBp: 1000, radius: 450, damagePerP: 200, knockback: 80, chargeMs: 1000 },
  // A2.1 / A2.7 positions and movement
  spawnP: 20,
  holdLine: 320,
  holdRetreatSpeedBp: 7000,
  leash: 20,
  spacingBp: 3000,
  // A2.7 Targeting
  retargetMs: 1000,
  retargetCloserLu: 60,
  rangedSelfDefenseLu: 30,
  // A18.4.2 engagement freshness: fresh after 4 s with no target (stance changes never reset it)
  firstHitIdleMs: 4000,
  // A18.4.2 Stance: a change at most once per 3 s; the Hold flag in [320, 800], 20 lu steps, moved once per 1 s
  stanceCooldownMs: 3000,
  holdFlag: { minP: 320, maxP: 800, snapLu: 20, moveCooldownMs: 1000 },
  fallbackP: 200,
  // A18.2 rule 4 hard stacking caps (all sources summed)
  statCaps: { damageBp: 3500, takenBp: 3500, hpBp: 3000, attackSpeedBp: 2500, speedBp: 2000, rangeLu: 60 },
  // A2.7 Sizes (collision widths) and knockback resist
  sizes: { small: 24, medium: 32, large: 48, huge: 80 },
  knockbackResistBp: { small: 0, medium: 0, large: 5000, huge: 5000 },
  // A2.6 Area attacks: 50% to secondary targets, at most 4 targets
  areaSecondaryBp: 5000,
  areaMaxTargets: 4,
  // A2.7 Heal: Legendaries receive 50% of all healing; A2.9: Legendaries take 50% power damage
  healLegendaryBp: 5000,
  legendaryPowerDamageBp: 5000,
  // A2.1 / A17.3 Power zone centres clamped to p ∈ [150, L − 150]
  powerZoneClamp: [150, 1850],
  // Not in DESIGN; see docs/decisions.md (WP0 raw content)
  emoteCooldownMs: 3000,
  // A2.10 Final Bell: a gap ≤ 0.5% is a draw
  drawGapBp: 50,
  // A5.1 +5% per level, max level 10
  levelStepBp: 500,
  maxLevel: 10,
};

/** DESIGN A2.1-A2.11 and A5.1 numbers that `EconomyRules` has no field for. */
export const battle: RawBattleRules = {
  laneLength: 2000,
  baseDepth: 140,
  cameraMargin: 40,
  midLane: 1000,
  windupPct: { melee: 40, ranged: 50, turret: 0 },
  trainMsByGroup: {
    infantry: 1500,
    ranged: 2000,
    antiArmor: 2500,
    support: 3000,
    heavy: 4000,
    epic: 4000,
    legendary: 7000,
    // the hidden fort twins are placed, never trained (A16.14.8)
    fort: 0,
  },
  braceKnockbackResistBp: 10000,
  airKnockbackResistBp: 10000,
  markDamageBp: 12000,
  healPulseMs: 500,
  moderniseCreditBp: 5000,
  finalAgeXpCap: 1650,
  siegeDecayStepMs: 1000,
  stampedeFallbackP: 200,
  projectileSpeed: {
    rock: 500,
    arrow: 650,
    musket: 1500,
    bullet: 1500,
    shell: 1200,
    rocket: 900,
    arc: 450,
    plasma: 1800,
  },
};
