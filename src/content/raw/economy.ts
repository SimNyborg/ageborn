/**
 * Economy and battle numbers (DESIGN A2.1-A2.11, A5.1), in table units: gold, XP, lu, lu/s, ms,
 * bp for percentages. Data only. The WP1 compiler converts to milli-gold, ticks and so on (B3, B4).
 */
import type { EconomyRules, FormatDef } from '@/contracts/content';
import type { AgeId, FormatId } from '@/contracts/ids';
import type { RawAgeScale, RawBattleRules, RawDamageMods } from './types';

/**
 * DESIGN A17.8 power scale (P, base max HP = 10,000 × P; Bronze and Industrial are half steps of
 * ×1.16, the rest ×1.35) and XP to evolve out of each age (small steps cost less XP, big steps more).
 */
export const ageScale: Record<AgeId, RawAgeScale> = {
  stone: { id: 'stone', index: 0, pBp: 10000, baseHp: 10000, xpToNext: 550 },
  bronze: { id: 'bronze', index: 1, pBp: 11600, baseHp: 11600, xpToNext: 500 },
  medieval: { id: 'medieval', index: 2, pBp: 13500, baseHp: 13500, xpToNext: 900 },
  gunpowder: { id: 'gunpowder', index: 3, pBp: 18200, baseHp: 18200, xpToNext: 700 },
  industrial: { id: 'industrial', index: 4, pBp: 21200, baseHp: 21200, xpToNext: 800 },
  modern: { id: 'modern', index: 5, pBp: 24600, baseHp: 24600, xpToNext: 1200 },
  future: { id: 'future', index: 6, pBp: 33200, baseHp: 33200, xpToNext: 1300 },
  cosmic: { id: 'cosmic', index: 7, pBp: 44800, baseHp: 44800, xpToNext: null },
};

/**
 * DESIGN A17.8 match formats: every ladder format is a range of consecutive ages from Stone (Short 4,
 * Standard 6, Full 8). The tutorial alone skips ages and keeps its five-age run and retimed
 * thresholds, so onboarding match 1 is unchanged. Times are ms from match start; null means "none".
 */
export const formats: Record<FormatId, FormatDef> = {
  tutorial: {
    id: 'tutorial',
    ages: ['stone', 'medieval', 'gunpowder', 'modern', 'future'],
    overdriveMs: null,
    siegeMs: null,
    finalBellMs: null,
    retreatAfterMs: null,
    xpToNextOverride: [680, 690, 520, 700],
  },
  short: {
    id: 'short',
    ages: ['stone', 'bronze', 'medieval', 'gunpowder'],
    overdriveMs: 225000,
    siegeMs: 285000,
    finalBellMs: 375000,
    retreatAfterMs: 60000,
  },
  standard: {
    id: 'standard',
    ages: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern'],
    overdriveMs: 300000,
    siegeMs: 405000,
    finalBellMs: 510000,
    retreatAfterMs: 60000,
  },
  full: {
    id: 'full',
    ages: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'],
    overdriveMs: 405000,
    siegeMs: 525000,
    finalBellMs: 645000,
    retreatAfterMs: 60000,
  },
};

/** DESIGN A2.6 role-default damage mods, in order. Multipliers in bp (10,000 = ×1.0). */
export const damageMods: RawDamageMods = {
  blunt: [{ vs: 'armored', bp: 7000 }],
  meleeAntiArmor: [
    { vs: 'armored', bp: 20000 },
    { vs: 'mech', bp: 20000 },
    { vs: 'light', bp: 7500 },
  ],
  rangedAntiArmor: [
    { vs: 'armored', bp: 20000 },
    { vs: 'mech', bp: 20000 },
    { vs: 'light', bp: 5000 },
  ],
  grenadier: [
    { vs: 'armored', bp: 15000 },
    { vs: 'mech', bp: 15000 },
    { vs: 'light', bp: 5000 },
  ],
  flak: [{ vs: 'air', bp: 20000 }],
  congreve: [{ vs: 'air', bp: 15000 }],
};

/** DESIGN A2.3-A2.11 economy and rule constants (the contract's `EconomyRules`). */
export const economy: EconomyRules = {
  // A2.3 Gold
  startGold: 175,
  passiveGoldPerSec: 6,
  // A2.4 XP
  passiveXpPerSec: 4,
  // A2.3 Treasury: 3 levels, each +1.5 gold/s (1,500 milli-gold/s); never doubled by Overdrive
  treasuryCosts: [200, 350, 550],
  treasuryMilliGoldPerSecPerLevel: 1500,
  // A2.3 Turret slots: index i is the price of mount i + 1; mount 1 is free
  mountCosts: [0, 150, 350, 700],
  // A2.3 / A2.4 / A5.1 bounties
  bountyGoldBp: 6000,
  bountyXpBp: 10000,
  powerKillGoldBp: 3000,
  powerKillXpBp: 0,
  ownLossXpBp: 4000,
  underdogBp: 5000,
  // A2.4: 12 XP per 1% of the enemy base's current max HP
  baseDamageXpPerPct: 12,
  // A2.4: XP never exceeds 1.5× the current threshold
  xpCapBp: 15000,
  // A2.7 Population and training
  popCap: 60,
  popByGroup: { infantry: 2, ranged: 3, antiArmor: 4, support: 4, heavy: 6, epic: 8, legendary: 14 },
  queueMax: 5,
  legendaryLimit: 1,
  // A2.3 / A2.8 Turrets
  sellRefundBp: 5000,
  turretRangeCap: 480,
  turretBuildMs: 1000,
  turretSellMs: 1000,
  // A2.2 / A2.4 Evolve
  ascendMs: 2500,
  evolveHealBp: 500,
  vanguardCount: 2,
  // A2.9 Age Powers: 0 → 100% over 50 s; 50% carry cap across an evolve
  powerChargeMs: 50000,
  powerCarryCapBp: 5000,
  // A2.4 Overcharge: in the final age every 1,200 XP adds +25% charge
  overchargeXp: 1200,
  overchargeBp: 2500,
  // A2.10 phases
  overdrive: { baseGoldBp: 20000, xpBp: 20000, powerBp: 12500 },
  // A17.3 Siege forced march: unit movement ×1.2; A16.4 step 2 siege crowd: 60 lu before the enemy gate
  siege: { turretDamageBp: 5000, baseDamageBp: 20000, decayBpPerSec: 50, moveSpeedBp: 12000, gateCrowdLu: 60 },
  // A16.4 stall fix (A17 step 1): in Overdrive and Siege a unit killed within 120 lu of its own gate costs
  // its base its max HP, so spawn-camping a beaten side ends the match (docs/decisions.md)
  gateFall: { lu: 120, hpBp: 10000 },
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
  firstHitIdleMs: 2000,
  // A2.7 Stance: 2 s toggle cooldown
  stanceCooldownMs: 2000,
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
  },
  braceKnockbackResistBp: 10000,
  airKnockbackResistBp: 10000,
  markDamageBp: 12000,
  healPulseMs: 500,
  moderniseCreditBp: 5000,
  finalAgeXpCap: 1200,
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
