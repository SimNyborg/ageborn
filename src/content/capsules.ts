/**
 * Time Capsules, pity, the Sundial (capsule charges until 2026-09-30), the onboarding script and Wardrobe Crates
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
  // Amber re-tune (owner feedback 2026-10-07, "you earn money a bit too fast compared to upgrading
  // everything you want"): capsule Amber ×0.8 on this table (Arenas 1-2 and the onboarding script) and
  // ×0.65 on the all-ages table, so Amber, not only copies, decides which card to upgrade from day 2
  // (A6.9 Amber gate). Copies are unchanged, so the per-card time to max stays on the A6.9 targets.
  tiers: {
    clay: {
      id: 'clay', index: 0, stacks: 2,
      copies: { common: 4, rare: 1, epic: 1, legendary: 1 },
      guaranteed: [], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0, skinMinRarity: 'rare',
      extraLegendaryCopies: 1, exclusiveItems: false, bonusDust: 0,
      amber: 85, expectedCopiesCenti: 630, nameKey: 'capsuleTier.clay.name',
    },
    bronze: {
      id: 'bronze', index: 1, stacks: 3,
      copies: { common: 5, rare: 2, epic: 2, legendary: 1 },
      // ≥ 1 Rare stack
      guaranteed: ['rare'], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0, skinMinRarity: 'rare',
      extraLegendaryCopies: 1, exclusiveItems: false, bonusDust: 0,
      amber: 170, expectedCopiesCenti: 1030, nameKey: 'capsuleTier.bronze.name',
    },
    silver: {
      id: 'silver', index: 2, stacks: 4,
      copies: { common: 10, rare: 5, epic: 2, legendary: 1 },
      // ≥ 2 Rare and ≥ 1 Epic stack
      guaranteed: ['rare', 'rare', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: false, skinChanceBp: 0,
      skinMinRarity: 'rare', extraLegendaryCopies: 1, exclusiveItems: false,
      bonusDust: 0, amber: 425, expectedCopiesCenti: 2040, nameKey: 'capsuleTier.silver.name',
    },
    jade: {
      id: 'jade', index: 3, stacks: 5,
      copies: { common: 24, rare: 10, epic: 5, legendary: 2 },
      // ≥ 2 Rare and ≥ 2 Epic stacks; +100 Dust ("the Epic capsule"; the 25% Rare-to-Legendary
      // conversion was removed with the 2026-09-29 ladder)
      guaranteed: ['rare', 'rare', 'epic', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: false,
      skinChanceBp: 0, skinMinRarity: 'rare', extraLegendaryCopies: 2, exclusiveItems: false,
      bonusDust: 100, amber: 1120, expectedCopiesCenti: 4980, nameKey: 'capsuleTier.jade.name',
    },
    gold: {
      id: 'gold', index: 4, stacks: 6,
      copies: { common: 26, rare: 10, epic: 5, legendary: 2 },
      // "A Legendary": 1 Legendary stack (unowned first), ≥ 2 Epic stacks; 30% chance of a skin
      // (Wardrobe odds); +100 Dust. The old Aeon's contents plus 100 Dust.
      guaranteed: ['legendary', 'epic', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: true,
      skinChanceBp: 3000, skinMinRarity: 'rare', extraLegendaryCopies: 2, exclusiveItems: false,
      bonusDust: 100, amber: 2110, expectedCopiesCenti: 7560, nameKey: 'capsuleTier.gold.name',
    },
    platinum: {
      id: 'platinum', index: 5, stacks: 7,
      copies: { common: 26, rare: 12, epic: 5, legendary: 2 },
      // "Two Legendaries and a sure skin": 2 different Legendaries (unowned first; the 2nd stack holds
      // 1 copy), ≥ 2 Epic stacks; a skin at Wardrobe odds; +200 Dust
      guaranteed: ['legendary', 'legendary', 'epic', 'epic'], rareToLegendaryBp: 0, legendaryUnownedFirst: true,
      skinChanceBp: 10000, skinMinRarity: 'rare', extraLegendaryCopies: 1, exclusiveItems: false,
      bonusDust: 200, amber: 2240, expectedCopiesCenti: 7790, nameKey: 'capsuleTier.platinum.name',
    },
    aeon: {
      id: 'aeon', index: 6, stacks: 8,
      copies: { common: 40, rare: 14, epic: 6, legendary: 2 },
      // "Three Legendaries, an Epic-or-better skin and an Aeon item": 3 different Legendaries (unowned
      // first; the 2nd and 3rd stacks hold 1 copy), ≥ 3 Epic stacks; a skin, Epic or better; an Aeon
      // Collection item while the set is incomplete (then +500 Dust); +500 Dust
      guaranteed: ['legendary', 'legendary', 'legendary', 'epic', 'epic', 'epic'], rareToLegendaryBp: 0,
      legendaryUnownedFirst: true, skinChanceBp: 10000, skinMinRarity: 'epic', extraLegendaryCopies: 1, exclusiveItems: true,
      bonusDust: 500, amber: 2880, expectedCopiesCenti: 8640, nameKey: 'capsuleTier.aeon.name',
    },
  },
  // A6.4 all-ages table (content re-tune 2026-10-04, CONTENT_PLAN 8 option B, set with the A6.9 economy
  // sim on the released 208-card pool). From Arena 3 (Kingsmoat), where all eight ages and 176-208 of
  // the 208 cards drop (88 before the content waves), every tier holds one more stack and more copies
  // and Amber, so the median card still maxes in about 110 / 101 / 69 / 112 days. Arenas 1-2 (pool
  // 44-102) and the onboarding script keep the table above exactly. Every column still rises (or stays)
  // going up the ladder; guarantees, odds, pity, Dust, skins and the bag are unchanged.
  // Amber ×0.65 since the 2026-10-07 re-tune (was 181 / 363 / 916 / 2,419 / 4,562 / 4,838 / 6,221).
  allAges: {
    fromArena: 3,
    ageCapsuleStacks: 5,
    tiers: {
      clay: { stacks: 3, copies: { common: 6, rare: 2, epic: 2, legendary: 2 }, amber: 120, expectedCopiesCenti: 1460 },
      bronze: { stacks: 4, copies: { common: 7, rare: 5, epic: 5, legendary: 2 }, amber: 235, expectedCopiesCenti: 2420 },
      silver: { stacks: 5, copies: { common: 13, rare: 12, epic: 5, legendary: 2 }, amber: 595, expectedCopiesCenti: 5350 },
      jade: { stacks: 6, copies: { common: 32, rare: 23, epic: 12, legendary: 4 }, amber: 1570, expectedCopiesCenti: 12750 },
      gold: { stacks: 7, copies: { common: 34, rare: 23, epic: 12, legendary: 4 }, amber: 2965, expectedCopiesCenti: 14870 },
      platinum: { stacks: 8, copies: { common: 34, rare: 28, epic: 12, legendary: 4 }, amber: 3145, expectedCopiesCenti: 15410 },
      aeon: { stacks: 9, copies: { common: 53, rare: 32, epic: 14, legendary: 4 }, amber: 4045, expectedCopiesCenti: 18580 },
    },
  },
  // A6.4 step 1.2: Common 72%, Rare 22%, Epic 5%, Legendary 1%
  stackRollBp: { common: 7200, rare: 2200, epic: 500, legendary: 100 },
  // A6.4: exactly 60 Clay, 80 Bronze, 40 Silver, 13 Jade, 4 Gold, 2 Platinum and 1 Aeon in every 200
  // Sundial Capsules (kind `win`, the Win Capsule until 2026-09-30; the bag size is the sum of these counts)
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
  // A6.3, A15.4 the Sundial (2026-09-30; capsule charges before): a new save starts with 12 ready; one
  // more every 5 h (18,000,000 ms), holding up to 34 (34 × 5 h = 170 h, the smallest bank of 5 h steps
  // that holds 7 days); any finished match but the tutorial or a Retreat claims one; the first 10
  // capsules of a save need none. Was +1 every 6 h, bank 28, Ladder wins only.
  charges: { start: 12, max: 34, regenMs: 18000000, freeCapsules: 10 },
  // A6.3: Ladder matches that bring no capsule fill it (3 pips until 2026-09-30; 2 keeps a 7-match
  // day's income within about 3% once the Supply Capsule retired, A15.4)
  clayMeterPips: 2,
  daily: { firstAfterCapsule: 2, bankMax: 3 },
  // A15.4 Supply Capsule, retired 2026-09-30 (folded into the Sundial): no new allowance accrues; an
  // allowance banked before still turns into a Supply Capsule on every 3rd finished match (banks 7)
  supply: { matchesPerCapsule: 3, allowanceMax: 7, accrues: false },
  resetHour: 4,
  // A6.4 "Other capsule types" and A10 (climb start; null = fixed tier, reveal starts at step 4)
  kinds: {
    // The Sundial Capsule (A6.3; the Win Capsule until 2026-09-30, the id stays `win` for saves)
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
    // The Anti-heavy Rares are in the starter kit (owner feedback 2026-09-29, A3), so the scripted
    // capsules bring the early Support Rares instead: Stone and Bronze, then Medieval. MVP fix
    // 2026-10-01 (FTUE audit #7): capsule 2 gave the Gunpowder Field Surgeon, which no Short War (the only
    // length at Arena 1) can use; it now brings the Bronze Onager turret, so capsules 1-3 all play in a
    // Short War. The Field Surgeon (A3: every age's Support Rare arrives) moves to capsule 4.
    { capsule: 1, tier: 'bronze', cards: ['drum_shaman', 'standard_bearer'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 2, tier: 'silver', cards: ['friar', 'onager'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 3, tier: 'bronze', cards: ['log_roller'], randomUnownedEpic: false, fullWalkout: false },
    { capsule: 4, tier: 'silver', cards: ['field_surgeon'], randomUnownedEpic: true, fullWalkout: false },
    { capsule: 5, tier: 'gold', cards: ['mammoth_matriarch'], randomUnownedEpic: false, fullWalkout: true },
  ],
  wardrobe: { noDuplicateUntilAllOwned: true },
};
