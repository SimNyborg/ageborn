/** Time Capsules and Wardrobe Crates (DESIGN A6.4, A6.5, A10): bag, roll, pity, foils, script, reveal. */
export { bagLeft, bagSize, drawFromBag, freshBag } from './bag';
export { betterFoil, rollFoil, FOIL_SCALE_BP } from './foil';
export { cardsForRoll, defaultCapsuleAge, grantCapsuleAt, promisedNew, type GrantOptions } from './grant';
export { openCapsuleWith, strikePattern, STRIKES } from './open';
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
export { crateSkins, grantCrateAt, openCrate, reelFor, rollSkinOfRarity, rollSkinRarity, skinsForRoll } from './wardrobe';
