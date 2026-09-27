/**
 * Time Capsules, pity, charges, the onboarding script and Wardrobe Crates
 * (DESIGN A6.3, A6.4, A6.5, A10). The roll algorithm itself lives in `src/meta/capsules` (WP7);
 * this module is its data. Results are pre-rolled at grant time (A6.4).
 */
import type { CapsuleTables } from './types';

export const capsules: CapsuleTables = {
  tierOrder: ['clay', 'bronze', 'silver', 'jade', 'aeon'],
  // A6.4 tier table
  tiers: {
    clay: {
      id: 'clay', index: 0, stacks: 2,
      copies: { common: 2, rare: 1, epic: 1, legendary: 1 },
      guaranteed: [], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0, bonusDust: 0,
      amber: 60, expectedCopiesCenti: 340, nameKey: 'capsuleTier.clay.name',
    },
    bronze: {
      id: 'bronze', index: 1, stacks: 3,
      copies: { common: 3, rare: 1, epic: 1, legendary: 1 },
      // ≥ 1 Rare stack
      guaranteed: ['rare'], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0, bonusDust: 0,
      amber: 120, expectedCopiesCenti: 590, nameKey: 'capsuleTier.bronze.name',
    },
    silver: {
      id: 'silver', index: 2, stacks: 4,
      copies: { common: 6, rare: 3, epic: 1, legendary: 1 },
      // ≥ 2 Rare and ≥ 1 Epic stack
      guaranteed: ['rare', 'rare', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0,
      bonusDust: 0, amber: 300, expectedCopiesCenti: 1200, nameKey: 'capsuleTier.silver.name',
    },
    jade: {
      id: 'jade', index: 3, stacks: 5,
      copies: { common: 14, rare: 6, epic: 3, legendary: 1 },
      // ≥ 2 Rare and ≥ 2 Epic stacks; 25% one Rare stack becomes Legendary; +100 Dust
      guaranteed: ['rare', 'rare', 'epic', 'epic'], rareToLegendaryBp: 2500, legendaryUnownedFirst: false,
      skinChanceBp: 0, bonusDust: 100, amber: 800, expectedCopiesCenti: 2830, nameKey: 'capsuleTier.jade.name',
    },
    aeon: {
      id: 'aeon', index: 4, stacks: 6,
      copies: { common: 15, rare: 6, epic: 3, legendary: 1 },
      // 1 Legendary stack (unowned first), ≥ 2 Epic stacks; 30% chance of a skin (Wardrobe odds)
      guaranteed: ['legendary', 'epic', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: true,
      skinChanceBp: 3000, bonusDust: 0, amber: 1500, expectedCopiesCenti: 4380, nameKey: 'capsuleTier.aeon.name',
    },
  },
  // A6.4 step 1.2: Common 72%, Rare 22%, Epic 5%, Legendary 1%
  stackRollBp: { common: 7200, rare: 2200, epic: 500, legendary: 100 },
  // A6.4: exactly 30 Clay, 40 Bronze, 20 Silver, 7 Jade and 3 Aeon in every 100 Win Capsules
  bag: { clay: 30, bronze: 40, silver: 20, jade: 7, aeon: 3 },
  // A6.4 Daily Capsule: Bronze 78%, Silver 15%, Jade 5%, Aeon 2%
  dailyOddsBp: { clay: 0, bronze: 7800, silver: 1500, jade: 500, aeon: 200 },
  unownedWeight: 3,
  // A6.5
  pity: {
    epicEvery: 10,
    legendaryFreeUntil: 25,
    legendaryStepBp: 500,
    legendaryGuaranteeAt: 40,
    newCardEvery: 5,
    wardrobeEpicEvery: 5,
    wardrobeLegendaryEvery: 25,
  },
  // A6.3: a new save starts with 12; +1 every 6 h, banking up to 12; the first 10 capsules use none
  charges: { start: 12, max: 12, regenMs: 21600000, freeCapsules: 10 },
  clayMeterPips: 3,
  daily: { firstAfterCapsule: 2, bankMax: 3 },
  resetHour: 4,
  // A6.4 "Other capsule types" and A10 (climb start; null = fixed tier, reveal starts at step 4)
  kinds: {
    win: { kind: 'win', climbFrom: 'clay', countsForPity: true, nameKey: 'capsuleKind.win.name' },
    daily: { kind: 'daily', climbFrom: 'bronze', countsForPity: true, nameKey: 'capsuleKind.daily.name' },
    road: { kind: 'road', climbFrom: null, countsForPity: true, nameKey: 'capsuleKind.road.name' },
    meter: { kind: 'meter', climbFrom: 'clay', countsForPity: true, nameKey: 'capsuleKind.meter.name' },
    age: { kind: 'age', climbFrom: null, countsForPity: true, nameKey: 'capsuleKind.age.name' },
    codex: { kind: 'codex', climbFrom: null, countsForPity: true, nameKey: 'capsuleKind.codex.name' },
    conquest: { kind: 'conquest', climbFrom: null, countsForPity: true, nameKey: 'capsuleKind.conquest.name' },
    ageUnlock: { kind: 'ageUnlock', climbFrom: null, countsForPity: false, nameKey: 'capsuleKind.ageUnlock.name' },
  },
  ageCapsule: { stacks: 4, copiesTier: 'silver', guaranteed: ['epic'] },
  codexCapsuleTier: 'silver',
  ageUnlock: { rareCopies: 1, commonCopies: 4 },
  // A6.5 onboarding script
  script: [
    { capsule: 1, tier: 'bronze', cards: ['spear_hunter'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 2, tier: 'silver', cards: ['pikeman', 'grenadier'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 3, tier: 'bronze', cards: ['log_roller'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 4, tier: 'silver', cards: [], randomUnownedEpic: true, fullWalkout: false },
    { capsule: 5, tier: 'aeon', cards: ['mammoth_matriarch'], randomUnownedEpic: false, fullWalkout: true },
  ],
  wardrobe: { noDuplicateUntilAllOwned: true },
};
