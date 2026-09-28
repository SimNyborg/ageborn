/**
 * Wardrobe Crates and skin rolls (DESIGN A6.4 "Wardrobe Crate", A6.5 wardrobe pity, A6.6 skin Dust,
 * A10 card-flip reveal).
 *
 * - A crate holds 1 skin: Rare 78%, Epic 18%, Legendary 4%; no duplicate until all crate skins of
 *   that rarity are owned. Epic or better at least every 5 crates; Legendary at least every 25.
 * - The skin is rolled when the crate is granted and saved before any animation; `openWardrobe`
 *   only reveals it. A skin owned by then turns into Dust (A6.6).
 * - There is no reel (A15.3): the crate is revealed with the card flip, so `WardrobeReveal.reelTiles`
 *   is empty and `stopOffsetBp` is 0. `winnerIndex` stays 45 for contract stability.
 */
import type { PendingCrate, SaveDoc, SkinId, SkinRarity, WardrobeReveal } from '@/contracts';
import type { Content } from '@/content';
import { pickWeighted, randInt, rngId, cloneSfc32, type Sfc32State } from '@/core';
import { REEL_WINNER_INDEX } from '../rules';
import { grantOpened, rollCrateCosmetic } from '../cosmetics';
import { advanceWardrobePity, wardrobeDraw } from './pity';

const SKIN_RARITIES: readonly SkinRarity[] = ['rare', 'epic', 'legendary'];
const SKIN_RARITY_INDEX: Readonly<Record<SkinRarity, number>> = { rare: 0, epic: 1, legendary: 2 };

/** Crate-pool skins of one rarity, in content order (Crystal Spire is not in the pool, A5.8). */
export function crateSkins(t: Content, rarity: SkinRarity): SkinId[] {
  return t.order.skins.filter((id) => {
    const d = t.skins[id];
    return d !== undefined && d.inCratePool && d.rarity === rarity;
  });
}

/** Skins owned or already inside an unopened capsule or crate (so a roll never hands one out twice). */
export function skinsForRoll(s: SaveDoc): Set<SkinId> {
  const out = new Set<SkinId>(s.skins.owned);
  for (const c of s.capsules.wardrobe) out.add(c.skin);
  for (const p of s.capsules.pending) if (p.contents.skin) out.add(p.contents.skin);
  return out;
}

/** A skin rarity at Wardrobe odds (A6.4), with wardrobe pity when `draw` is given (A6.5). */
export function rollSkinRarity(t: Content, rng: Sfc32State, draw: { epicN: number; legendaryN: number } | null): SkinRarity {
  const p = t.capsules.pity;
  const rolled = SKIN_RARITIES[pickWeighted(rng, SKIN_RARITIES.map((r) => t.rarities.skins[r].crateOddsBp))] ?? 'rare';
  if (!draw) return rolled;
  if (draw.legendaryN >= p.wardrobeLegendaryEvery) return 'legendary';
  if (draw.epicN >= p.wardrobeEpicEvery && rolled === 'rare') return 'epic';
  return rolled;
}

/** A crate-pool skin of `rarity`: unowned first; a duplicate only when all of that rarity are owned. */
export function rollSkinOfRarity(t: Content, rng: Sfc32State, rarity: SkinRarity, owned: ReadonlySet<SkinId>): { skin: SkinId; rarity: SkinRarity } | null {
  for (let r = SKIN_RARITY_INDEX[rarity]; r >= 0; r -= 1) {
    const rr = SKIN_RARITIES[r] as SkinRarity;
    const all = crateSkins(t, rr);
    if (all.length === 0) continue;
    const fresh = all.filter((id) => !owned.has(id));
    const from = fresh.length > 0 ? fresh : all;
    const skin = from[randInt(rng, from.length)];
    if (skin !== undefined) return { skin, rarity: rr };
  }
  return null;
}

/** Grants a Wardrobe Crate, rolled now (A6.4, A6.5). */
export function grantCrateAt(s: SaveDoc, source: PendingCrate['source'], t: Content, now: number): { save: SaveDoc; crate: PendingCrate } {
  const rng = cloneSfc32(s.rng.capsule);
  const rarity = rollSkinRarity(t, rng, wardrobeDraw(s));
  const got = rollSkinOfRarity(t, rng, rarity, skinsForRoll(s));
  if (!got) throw new Error('meta: the content has no crate skins');
  // A18.9.4: every crate also holds one collection item, rolled from the cosmetic stream
  const cos = rollCrateCosmetic(s, t);
  const crate: PendingCrate = {
    id: rngId(rng, 'crate'),
    source,
    skin: got.skin,
    rarity: got.rarity,
    duplicateDust: s.skins.owned.includes(got.skin) ? t.rarities.skins[got.rarity].duplicateDust : 0,
    createdAt: now,
    ...(cos.key ? { cosmetic: cos.key } : {}),
  };
  return {
    save: { ...s, rng: { ...s.rng, capsule: rng, cosmetic: cos.rng }, capsules: { ...s.capsules, wardrobe: [...s.capsules.wardrobe, crate] } },
    crate,
  };
}

/** Opens a Wardrobe Crate: the pre-rolled skin, or its Dust when it is already owned (A6.6). */
export function openCrate(s: SaveDoc, id: string, t: Content): { save: SaveDoc; reveal: WardrobeReveal } {
  const crate = s.capsules.wardrobe.find((c) => c.id === id);
  if (!crate) throw new Error(`meta: no Wardrobe Crate "${id}"`);
  const dup = s.skins.owned.includes(crate.skin);
  const duplicateDust = dup ? t.rarities.skins[crate.rarity].duplicateDust : 0;
  const shown: PendingCrate = { ...crate, duplicateDust };
  const opened: SaveDoc = {
    ...s,
    currencies: { ...s.currencies, dust: s.currencies.dust + duplicateDust },
    skins: dup ? s.skins : { ...s.skins, owned: [...s.skins.owned, crate.skin] },
    capsules: { ...s.capsules, wardrobe: s.capsules.wardrobe.filter((c) => c.id !== id) },
    pity: advanceWardrobePity(s.pity, crate.rarity),
  };
  // A18.9.4: the crate's collection item (a duplicate pays its Dust)
  const save = grantOpened(opened, t, crate.cosmetic).save;
  return { save, reveal: { crate: shown, reelTiles: [], winnerIndex: REEL_WINNER_INDEX, stopOffsetBp: 0 } };
}
