/**
 * Dust and crafting (DESIGN A6.2, A6.6).
 *
 * | | Common | Rare | Epic | Legendary |
 * |---|---|---|---|---|
 * | Card copy past L10 → Dust | 5 | 20 | 100 | 400 |
 * | Craft one card copy (also unlocks an unowned card) | 40 | 100 | 400 | 1,600 |
 * | Duplicate skin → Dust | - | 50 | 200 | 800 |
 * | Craft a crate skin | - | 200 | 800 | 3,000 |
 *
 * Crafting a card adds one copy; an unowned card is unlocked at L1 with that copy. A card at L10
 * cannot be crafted (the copy would only turn back into Dust). Only crate skins can be crafted, so
 * the Crystal Spire (the Arena 8 reward) cannot (A5.8).
 */
import type { CardId, Result, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { cardDef, isCollectable } from './tables';
import { unlockTitles } from './titles';

/** Dust to craft `id` (a card or a skin), or null when it cannot be crafted. */
export function craftCost(t: Content, id: string): number | null {
  const card = cardDef(t, id);
  if (card) return isCollectable(t, id) ? t.rarities.cards[card.rarity].craftCopyDust : null;
  const skin = t.skins[id];
  if (skin) return skin.craftable ? t.rarities.skins[skin.rarity].craftDust : null;
  return null;
}

function craftCard(s: SaveDoc, id: CardId, t: Content, cost: number): Result<SaveDoc> {
  const e = s.collection[id];
  if (e && e.level >= t.economy.maxLevel) return { ok: false, reason: 'maxLevel' };
  if (s.currencies.dust < cost) return { ok: false, reason: 'dust' };
  const entry = e && e.level >= 1 ? { ...e, copies: e.copies + 1 } : { level: 1, copies: 1, isNew: true, foil: 'none' as const };
  const save: SaveDoc = {
    ...s,
    currencies: { ...s.currencies, dust: s.currencies.dust - cost },
    collection: { ...s.collection, [id]: entry },
  };
  return { ok: true, value: unlockTitles(save, t).save };
}

/** Crafts one card copy or one crate skin with Dust. Reasons: notCraftable, owned, maxLevel, dust. */
export function craft(s: SaveDoc, id: string, t: Content): Result<SaveDoc> {
  const cost = craftCost(t, id);
  if (cost === null) return { ok: false, reason: 'notCraftable' };
  if (cardDef(t, id) !== null) return craftCard(s, id, t, cost);
  if (s.skins.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (s.currencies.dust < cost) return { ok: false, reason: 'dust' };
  return {
    ok: true,
    value: {
      ...s,
      currencies: { ...s.currencies, dust: s.currencies.dust - cost },
      skins: { ...s.skins, owned: [...s.skins.owned, id] },
    },
  };
}
