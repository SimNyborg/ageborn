/** Time Capsules and Wardrobe Crates (DESIGN A6.4, A6.5, A10): bag, roll, pity, foils, script, reveal. */
export { bagLeft, bagSize, bagTotal, drawFromBag, freshBag, tierCounts } from './bag';
export { betterFoil, rollFoil, FOIL_SCALE_BP } from './foil';
export { cardsForRoll, copiesStillNeeded, defaultCapsuleAge, grantCapsuleAt, promisedNew, type GrantOptions } from './grant';
export { openCapsuleWith, strikeCounts, strikePattern, STRIKES } from './open';
export {
  advancePity,
  advanceWardrobePity,
  countedPending,
  legendaryPityBp,
  pityDraw,
  wardrobeDraw,
  zeroPity,
  type OpenedFacts,
  type PityCounters,
  type PityDraw,
} from './pity';
export { pickCard, planSlots, rollStackRarity, rollStacks, sortStacks, type RollContext, type RollSpec } from './roll';
export { rollScripted, scriptFor } from './script';
export { crateSkins, grantCrateAt, openCrate, rollSkinOfRarity, rollSkinRarity, rollSkinRarityFrom, skinsForRoll } from './wardrobe';
