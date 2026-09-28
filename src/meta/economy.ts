/**
 * Economy pacing entry points (DESIGN A6.9, B9, B12 `sim:economy`): expected values straight from the
 * tables, before pity, so tools and tests can check A6.9's "9.1 copies and 227 Amber per bag capsule"
 * without simulating. The 365-day player model itself runs in `tools/economy.ts` through the `Meta`
 * contract.
 */
import type { CapsuleTier, Rarity } from '@/contracts';
import type { Content } from '@/content';
import { roundDiv } from '@/core';
import { RARITY_ORDER, TIER_ORDER } from './tables';

/** Expected copies of one capsule of `tier`, × 10,000 (exact, before pity). */
export function expectedCopiesX10k(t: Content, tier: CapsuleTier, randomLegendaries = true): number {
  const def = t.capsules.tiers[tier];
  const roll = t.capsules.stackRollBp;
  const bp = (r: Rarity): number => {
    if (randomLegendaries) return roll[r];
    if (r === 'legendary') return 0;
    return r === 'common' ? roll.common + roll.legendary : roll[r];
  };
  const perRandom = RARITY_ORDER.reduce((n, r) => n + bp(r) * def.copies[r], 0);
  const guaranteed = def.guaranteed.reduce((n, r) => n + def.copies[r] * 10000, 0);
  const random = (def.stacks - def.guaranteed.length) * perRandom;
  const jade = def.guaranteed.includes('rare') ? def.rareToLegendaryBp * (def.copies.rare - def.copies.legendary) : 0;
  return guaranteed + random - jade;
}

/** Expected copies and Amber per Win Capsule drawn from the bag, before pity (A6.4, A6.9). */
export function bagCapsuleAverages(t: Content): { copiesCenti: number; amberCenti: number } {
  const bag = t.capsules.bag;
  const total = TIER_ORDER.reduce((n, tier) => n + bag[tier], 0);
  const copies = TIER_ORDER.reduce((n, tier) => n + bag[tier] * expectedCopiesX10k(t, tier), 0);
  const amber = TIER_ORDER.reduce((n, tier) => n + bag[tier] * t.capsules.tiers[tier].amber, 0);
  return { copiesCenti: roundDiv(copies, total * 100), amberCenti: roundDiv(amber * 100, total) };
}

/** Total copies and Amber to take one card of `rarity` from L1 to the cap (A6.6). */
export function copiesToMax(t: Content, rarity: Rarity): { copies: number; amber: number } {
  return {
    copies: t.rarities.cards[rarity].upgradeCopies.reduce((a, b) => a + b, 0),
    amber: t.rarities.upgradeAmber.reduce((a, b) => a + b, 0),
  };
}
