/**
 * Card upgrades (DESIGN A6.6). Every card starts at L1 and levels to 10; each level spends copies
 * (by rarity) and Amber (shared scale) and adds +5% HP, damage, heals and shields (the sim applies
 * the level). Turrets level the same way; Age Powers have no level.
 *
 * An upgrade earns Codex points (A6.7) and counts for "Upgrade 2 cards". Reaching L10 converts the
 * copies left over to Dust at once ("card copy past L10 → Dust"), so a maxed card never holds copies.
 */
import type { CardId, Result, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { addCodexPoints } from './codex';
import { countUpgrade } from './quests';
import { cardDef, lastKnownTime } from './tables';

export interface UpgradeCost {
  copies: number;
  amber: number;
}

/** Copies and Amber to go from `level` to `level + 1`, or null at the cap (A6.6). */
export function upgradeCost(t: Content, card: CardId, level: number): UpgradeCost | null {
  const def = cardDef(t, card);
  if (!def || level >= t.economy.maxLevel || level < 1) return null;
  const copies = t.rarities.cards[def.rarity].upgradeCopies[level - 1];
  const amber = t.rarities.upgradeAmber[level - 1];
  if (copies === undefined || amber === undefined) return null;
  return { copies, amber };
}

/** Why an upgrade cannot happen now, or null when it can. */
export function upgradeBlocker(s: SaveDoc, card: CardId, t: Content): string | null {
  if (!cardDef(t, card)) return 'unknownCard';
  const e = s.collection[card];
  if (!e || e.level < 1) return 'notOwned';
  const cost = upgradeCost(t, card, e.level);
  if (!cost) return 'maxLevel';
  if (e.copies < cost.copies) return 'copies';
  if (s.currencies.amber < cost.amber) return 'amber';
  return null;
}

/** Upgrades `card` one level (A6.6). Reasons: unknownCard, notOwned, maxLevel, copies, amber. */
export function upgradeCard(s: SaveDoc, card: CardId, t: Content): Result<SaveDoc> {
  const blocker = upgradeBlocker(s, card, t);
  if (blocker) return { ok: false, reason: blocker };
  const def = cardDef(t, card);
  const e = s.collection[card];
  const cost = e ? upgradeCost(t, card, e.level) : null;
  if (!def || !e || !cost) return { ok: false, reason: 'unknownCard' };
  const level = e.level + 1;
  let copies = e.copies - cost.copies;
  let dust = s.currencies.dust;
  if (level >= t.economy.maxLevel) {
    dust += copies * t.rarities.cards[def.rarity].dustPerExtraCopy;
    copies = 0;
  }
  const upgraded: SaveDoc = {
    ...s,
    collection: { ...s.collection, [card]: { ...e, level, copies } },
    currencies: { amber: s.currencies.amber - cost.amber, dust },
  };
  const counted = countUpgrade(upgraded, t);
  return { ok: true, value: addCodexPoints(counted, t, t.rarities.cards[def.rarity].codexPoints, lastKnownTime(counted)).save };
}
