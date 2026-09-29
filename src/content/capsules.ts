/**
 * Time Capsules, pity, charges, the onboarding script and Wardrobe Crates
 * (DESIGN A6.3, A6.4, A6.5, A10). The roll algorithm itself lives in `src/meta/capsules` (WP7);
 * this module is its data. Results are pre-rolled at grant time (A6.4).
 */
import type { CapsuleTables } from './types';

export const capsules: CapsuleTables = {
  tierOrder: ['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon'],
  // A6.4 tier table. A17.13 / owner decision "keep today's time to max a card": the pool grew 55 → 88
  // cards, so copies per stack and Amber per capsule rise about ×1.75 (set with the A6.9 economy sim:
  // median card to max 119 / 108 / 68 / 109 days by rarity against 114 / 114 / 71 / 109 before A17).
  // The 2026-09-29 ladder (owner request "more capsule tiers"): Gold and Platinum above Jade, Aeon on
  // top; Gold is the old Aeon plus 100 Dust. Gold or better always holds 1, 2 or 3 Legendaries.
  // Stacks, Legendaries, Epic guarantees, Amber, Dust and skin chance never fall going up the ladder.
  tiers: {
    clay: {
      id: 'clay', index: 0, stacks: 2,
      copies: { common: 4, rare: 1, epic: 1, legendary: 1 },
      guaranteed: [], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0, skinMinRarity: 'rare',
      extraLegendaryCopies: 1, exclusiveItems: false, bonusDust: 0,
      amber: 105, expectedCopiesCenti: 630, nameKey: 'capsuleTier.clay.name',
    },
    bronze: {
      id: 'bronze', index: 1, stacks: 3,
      copies: { common: 5, rare: 2, epic: 2, legendary: 1 },
      // ≥ 1 Rare stack
      guaranteed: ['rare'], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0, skinMinRarity: 'rare',
      extraLegendaryCopies: 1, exclusiveItems: false, bonusDust: 0,
      amber: 210, expectedCopiesCenti: 1030, nameKey: 'capsuleTier.bronze.name',
    },
    silver: {
      id: 'silver', index: 2, stacks: 4,
      copies: { common: 10, rare: 5, epic: 2, legendary: 1 },
      // ≥ 2 Rare and ≥ 1 Epic stack
      guaranteed: ['rare', 'rare', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0,
      skinMinRarity: 'rare', extraLegendaryCopies: 1, exclusiveItems: false,
      bonusDust: 0, amber: 530, expectedCopiesCenti: 2040, nameKey: 'capsuleTier.silver.name',
    },
    jade: {
      id: 'jade', index: 3, stacks: 5,
      copies: { common: 24, rare: 10, epic: 5, legendary: 2 },
      // ≥ 2 Rare and ≥ 2 Epic stacks; +100 Dust ("the Epic capsule"; the 25% Rare-to-Legendary
      // conversion was removed with the 2026-09-29 ladder)
      guaranteed: ['rare', 'rare', 'epic', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: false,
      skinChanceBp: 0, skinMinRarity: 'rare', extraLegendaryCopies: 2, exclusiveItems: false,
      bonusDust: 100, amber: 1400, expectedCopiesCenti: 4980, nameKey: 'capsuleTier.jade.name',
    },
    gold: {
      id: 'gold', index: 4, stacks: 6,
      copies: { common: 26, rare: 10, epic: 5, legendary: 2 },
      // "A Legendary": 1 Legendary stack (unowned first), ≥ 2 Epic stacks; 30% chance of a skin
      // (Wardrobe odds); +100 Dust. The old Aeon's contents plus 100 Dust.
      guaranteed: ['legendary', 'epic', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: true,
      skinChanceBp: 3000, skinMinRarity: 'rare', extraLegendaryCopies: 2, exclusiveItems: false,
      bonusDust: 100, amber: 2640, expectedCopiesCenti: 7560, nameKey: 'capsuleTier.gold.name',
    },
    platinum: {
      id: 'platinum', index: 5, stacks: 7,
      copies: { common: 26, rare: 12, epic: 5, legendary: 2 },
      // "Two Legendaries and a sure skin": 2 different Legendaries (unowned first; the 2nd stack holds
      // 1 copy), ≥ 2 Epic stacks; a skin at Wardrobe odds; +200 Dust
      guaranteed: ['legendary', 'legendary', 'epic', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: true,
      skinChanceBp: 10000, skinMinRarity: 'rare', extraLegendaryCopies: 1, exclusiveItems: false,
      bonusDust: 200, amber: 2800, expectedCopiesCenti: 7790, nameKey: 'capsuleTier.platinum.name',
    },
    aeon: {
      id: 'aeon', index: 6, stacks: 8,
      copies: { common: 40, rare: 14, epic: 6, legendary: 2 },
      // "Three Legendaries, an Epic-or-better skin and an Aeon item": 3 different Legendaries (unowned
      // first; the 2nd and 3rd stacks hold 1 copy), ≥ 3 Epic stacks; a skin, Epic or better; an Aeon
      // Collection item while the set is incomplete (then +500 Dust); +500 Dust
      guaranteed: ['legendary', 'legendary', 'legendary', 'epic', 'epic', 'epic'], rareToLegendaryBp: 0,
      legendaryUnownedFirst: true, skinChanceBp: 10000, skinMinRarity: 'epic', extraLegendaryCopies: 1, exclusiveItems: true,
      bonusDust: 500, amber: 3600, expectedCopiesCenti: 8640, nameKey: 'capsuleTier.aeon.name',
    },
  },
  // A6.4 step 1.2: Common 72%, Rare 22%, Epic 5%, Legendary 1%
  stackRollBp: { common: 7200, rare: 2200, epic: 500, legendary: 100 },
  // A6.4: exactly 60 Clay, 80 Bronze, 40 Silver, 13 Jade, 4 Gold, 2 Platinum and 1 Aeon in every 200
  // Win Capsules (the bag size is the sum of these counts)
  bag: { clay: 60, bronze: 80, silver: 40, jade: 13, gold: 4, platinum: 2, aeon: 1 },
  // A6.4 Supply Capsule: Bronze 78%, Silver 15%, Jade 5%, Gold 1.5%, Platinum 0.35%, Aeon 0.15%
  dailyOddsBp: { clay: 0, bronze: 7800, silver: 1500, jade: 500, gold: 150, platinum: 35, aeon: 15 },
  // A10: the 4 main strikes climb up to Gold; Platinum and Aeon add 1 and 2 summit strikes
  summitAbove: 'gold',
  // A6.4 step 4: once every Legendary of the pool is owned, favour the ones furthest from max
  legendaryCatchUp: true,
  // A6.4 step 8: an Aeon after the Aeon Collection is complete adds 500 Dust
  exclusiveCompleteDust: 500,
  // A6.4, A18.9.4: an Aeon Collection item costs 3,000 Dust once the save has opened an Aeon
  exclusiveCraftDust: 3000,
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
  // A6.3, A15.4: a new save starts with 12; +1 every 6 h, banking up to 28 (7 days); the first 10 capsules use none
  charges: { start: 12, max: 28, regenMs: 21600000, freeCapsules: 10 },
  clayMeterPips: 3,
  daily: { firstAfterCapsule: 2, bankMax: 3 },
  // A15.4 Supply Capsule: every 3rd finished match turns one banked allowance (+1 a day, banks 7) into one
  supply: { matchesPerCapsule: 3, allowanceMax: 7 },
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
    // A18.7.8: a boss's fixed capsule, shown on its node
    warPath: { kind: 'warPath', climbFrom: null, countsForPity: true, nameKey: 'capsuleKind.warPath.name' },
  },
  ageCapsule: { stacks: 4, copiesTier: 'silver', guaranteed: ['epic'] },
  codexCapsuleTier: 'silver',
  ageUnlock: { rareCopies: 1, commonCopies: 4 },
  // A6.5 onboarding script
  script: [
    // A17.13: capsule 1 brings both early Anti-armor Rares (Stone and Bronze)
    { capsule: 1, tier: 'bronze', cards: ['spear_hunter', 'phalangite'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 2, tier: 'silver', cards: ['pikeman', 'grenadier'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 3, tier: 'bronze', cards: ['log_roller'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 4, tier: 'silver', cards: [], randomUnownedEpic: true, fullWalkout: false },
    { capsule: 5, tier: 'gold', cards: ['mammoth_matriarch'], randomUnownedEpic: false, fullWalkout: true },
  ],
  wardrobe: { noDuplicateUntilAllOwned: true },
};
