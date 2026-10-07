/**
 * Economy pacing entry points (DESIGN A6.9, B9, B12 `sim:economy`): expected values straight from the
 * tables, before pity, so tools and tests can check A6.9's "9.1 copies and 227 Amber per bag capsule"
 * without simulating. The 365-day player model itself runs in `tools/economy.ts` through the `Meta`
 * contract.
 */
import type { CapsuleTier, Rarity } from '@/contracts';
import { capsuleTierFor, type Content } from '@/content';
import { roundDiv } from '@/core';
import { RARITY_ORDER, tierOrder } from './tables';

/**
 * Expected copies of one capsule of `tier`, × 10,000 (exact, before pity). `arenaIndex` (0-based) picks
 * the table that arena rolls (A6.4: the all-ages table from Arena 3); null = the base table.
 */
export function expectedCopiesX10k(t: Content, tier: CapsuleTier, randomLegendaries = true, arenaIndex: number | null = null): number {
  const def = capsuleTierFor(t.capsules, tier, arenaIndex);
  const roll = t.capsules.stackRollBp;
  const bp = (r: Rarity): number => {
    if (randomLegendaries) return roll[r];
    if (r === 'legendary') return 0;
    return r === 'common' ? roll.common + roll.legendary : roll[r];
  };
  const perRandom = RARITY_ORDER.reduce((n, r) => n + bp(r) * def.copies[r], 0);
  // The 2nd and later guaranteed Legendary stacks hold `extraLegendaryCopies` (A6.4 step 3).
  let legendaries = 0;
  const guaranteed = def.guaranteed.reduce((n, r) => {
    if (r !== 'legendary') return n + def.copies[r] * 10000;
    legendaries += 1;
    return n + (legendaries >= 2 ? def.extraLegendaryCopies : def.copies.legendary) * 10000;
  }, 0);
  const random = (def.stacks - def.guaranteed.length) * perRandom;
  return guaranteed + random;
}

/** Expected copies and Amber per Win Capsule drawn from the bag in an arena (null = the base table), before pity (A6.4, A6.9). */
export function bagCapsuleAverages(t: Content, arenaIndex: number | null = null): { copiesCenti: number; amberCenti: number } {
  const bag = t.capsules.bag;
  const order = tierOrder(t);
  const total = order.reduce((n, tier) => n + bag[tier], 0);
  const copies = order.reduce((n, tier) => n + bag[tier] * expectedCopiesX10k(t, tier, true, arenaIndex), 0);
  const amber = order.reduce((n, tier) => n + bag[tier] * capsuleTierFor(t.capsules, tier, arenaIndex).amber, 0);
  return { copiesCenti: roundDiv(copies, total * 100), amberCenti: roundDiv(amber * 100, total) };
}

/**
 * Copies a card of `rarity` at `level` still needs to reach the cap, counting the `owned` copies it
 * already holds (0 at the cap). A6.6 surplus rule (owner decision 2026-10-07): capsule copies beyond
 * this can never be used and turn into Dust when the capsule is opened.
 */
export function copiesStillNeeded(t: Pick<Content, 'rarities'>, rarity: Rarity, level: number, owned: number): number {
  const table = t.rarities.cards[rarity].upgradeCopies;
  const need = table.slice(Math.max(0, level - 1)).reduce((a, b) => a + b, 0);
  return Math.max(0, need - owned);
}

/** Total copies and Amber to take one card of `rarity` from L1 to the cap (A6.6). */
export function copiesToMax(t: Content, rarity: Rarity): { copies: number; amber: number } {
  return {
    copies: t.rarities.cards[rarity].upgradeCopies.reduce((a, b) => a + b, 0),
    amber: t.rarities.upgradeAmber.reduce((a, b) => a + b, 0),
  };
}
