/**
 * Rarities, upgrade costs, Dust rates, Codex points, skin rarities and foils
 * (DESIGN A5.1, A5.8, A6.4 step 5, A6.6, A6.7).
 *
 * Rarity is a sidegrade: every card starts at L1 and gains the same +5% per level (A3, A5.1).
 */
import type { Rarities } from './types';

export const rarities: Rarities = {
  order: ['common', 'rare', 'epic', 'legendary'],
  cards: {
    // A6.6 copies per level (to L2 ... to L10); A6.7 codex points; A6.6 Dust rates
    common: {
      id: 'common', index: 0,
      upgradeCopies: [2, 3, 5, 8, 12, 18, 25, 35, 45],
      codexPoints: 1, dustPerExtraCopy: 5, craftCopyDust: 40, nameKey: 'rarity.common.name',
    },
    rare: {
      id: 'rare', index: 1,
      upgradeCopies: [1, 2, 4, 6, 10, 15, 22, 30, 40],
      codexPoints: 2, dustPerExtraCopy: 20, craftCopyDust: 100, nameKey: 'rarity.rare.name',
    },
    epic: {
      id: 'epic', index: 2,
      upgradeCopies: [1, 1, 1, 2, 3, 5, 7, 10, 14],
      codexPoints: 4, dustPerExtraCopy: 100, craftCopyDust: 400, nameKey: 'rarity.epic.name',
    },
    legendary: {
      id: 'legendary', index: 3,
      upgradeCopies: [1, 1, 1, 1, 1, 1, 1, 2, 2],
      codexPoints: 8, dustPerExtraCopy: 400, craftCopyDust: 1600, nameKey: 'rarity.legendary.name',
    },
  },
  // A6.6 Amber per level (to L2 ... to L10), total 4,970
  upgradeAmber: [20, 50, 100, 200, 350, 550, 800, 1200, 1700],
  skinOrder: ['rare', 'epic', 'legendary'],
  skins: {
    // A6.4 Wardrobe odds; A6.6 duplicate skin and craft Dust
    rare: { id: 'rare', crateOddsBp: 7800, duplicateDust: 50, craftDust: 200, nameKey: 'rarity.rare.name' },
    epic: { id: 'epic', crateOddsBp: 1800, duplicateDust: 200, craftDust: 800, nameKey: 'rarity.epic.name' },
    legendary: { id: 'legendary', crateOddsBp: 400, duplicateDust: 800, craftDust: 3000, nameKey: 'rarity.legendary.name' },
  },
  foilOrder: ['holo', 'silver', 'bronze', 'none'],
  foils: {
    // A6.4 step 5: Holo 0.25%, Silver foil 1%, Bronze foil 4%, else none
    holo: { id: 'holo', rank: 3, rollBp: 25, nameKey: 'foil.holo.name' },
    silver: { id: 'silver', rank: 2, rollBp: 100, nameKey: 'foil.silver.name' },
    bronze: { id: 'bronze', rank: 1, rollBp: 400, nameKey: 'foil.bronze.name' },
    none: { id: 'none', rank: 0, rollBp: 0, nameKey: 'foil.none.name' },
  },
  // A6.6: bronze trim at L4-6, silver at L7-9, gold at L10 (A14.1 trim ids)
  levelTrims: [
    { trim: 'bronze', fromLevel: 4, visualId: 'trim.bronze' },
    { trim: 'silver', fromLevel: 7, visualId: 'trim.silver' },
    { trim: 'gold', fromLevel: 10, visualId: 'trim.gold' },
  ],
};
