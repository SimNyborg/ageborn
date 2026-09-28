/**
 * Wardrobe Crates and skin rolls (DESIGN A6.4 "Wardrobe Crate", A6.5 wardrobe pity, A6.6 skin Dust,
 * A10.1 reel).
 *
 * - A crate holds 1 skin: Rare 78%, Epic 18%, Legendary 4%; no duplicate until all crate skins of
 *   that rarity are owned. Epic or better at least every 5 crates; Legendary at least every 25.
 * - The skin is rolled when the crate is granted and saved before any animation; `openWardrobe`
 *   only reveals it. A skin owned by then turns into Dust (A6.6).
 * - The reel: 50 tiles with the winner at index 45. Filler tiles are drawn from the true odds with
 *   the cosmetic RNG (seeded by the crate id, so a reload shows the same reel), and the tile after
 *   the winner is never rarer than the winner, so there is no staged near miss.
 */
import type { PendingCrate, SaveDoc, SkinId, SkinRarity, WardrobeReveal } from '@/contracts';
import type { Content } from '@/content';
import { fnv1a32, mulberry32, pickWeighted, randInt, rngId, cloneSfc32, type Sfc32State } from '@/core';
import { REEL_TILES, REEL_WINNER_INDEX } from '../rules';
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
  const crate: PendingCrate = {
    id: rngId(rng, 'crate'),
    source,
    skin: got.skin,
    rarity: got.rarity,
    duplicateDust: s.skins.owned.includes(got.skin) ? t.rarities.skins[got.rarity].duplicateDust : 0,
    createdAt: now,
  };
  return {
    save: { ...s, rng: { capsule: rng }, capsules: { ...s.capsules, wardrobe: [...s.capsules.wardrobe, crate] } },
    crate,
  };
}

/** The reel for a crate (A10.1): 50 tiles, winner at 45, never a rarer tile right after it. */
export function reelFor(crate: PendingCrate, t: Content): { reelTiles: SkinId[]; stopOffsetBp: number } {
  const rng = mulberry32(fnv1a32(`reel:${crate.id}`));
  const odds = SKIN_RARITIES.map((r) => t.rarities.skins[r].crateOddsBp);
  const pickRarity = (maxIndex: number): SkinRarity => {
    const w = odds.map((x, i) => (i <= maxIndex ? x : 0));
    const total = w.reduce((a, b) => a + b, 0);
    let r = rng.int(total);
    for (let i = 0; i < w.length; i += 1) {
      const x = w[i] ?? 0;
      if (r < x) return SKIN_RARITIES[i] as SkinRarity;
      r -= x;
    }
    return 'rare';
  };
  const everything = SKIN_RARITIES.flatMap((r) => crateSkins(t, r));
  const tiles: SkinId[] = [];
  for (let i = 0; i < REEL_TILES; i += 1) {
    if (i === REEL_WINNER_INDEX) {
      tiles.push(crate.skin);
      continue;
    }
    const cap = i === REEL_WINNER_INDEX + 1 ? SKIN_RARITY_INDEX[crate.rarity] : SKIN_RARITIES.length - 1;
    let pool: SkinId[] = [];
    for (let r = SKIN_RARITY_INDEX[pickRarity(cap)]; r >= 0 && pool.length === 0; r -= 1) pool = crateSkins(t, SKIN_RARITIES[r] as SkinRarity);
    if (pool.length === 0) pool = everything.length > 0 ? everything : [crate.skin];
    tiles.push(pool[rng.int(pool.length)] ?? crate.skin);
  }
  return { reelTiles: tiles, stopOffsetBp: rng.int(10000) };
}

/** Opens a Wardrobe Crate: the pre-rolled skin, or its Dust when it is already owned (A6.6). */
export function openCrate(s: SaveDoc, id: string, t: Content): { save: SaveDoc; reveal: WardrobeReveal } {
  const crate = s.capsules.wardrobe.find((c) => c.id === id);
  if (!crate) throw new Error(`meta: no Wardrobe Crate "${id}"`);
  const dup = s.skins.owned.includes(crate.skin);
  const duplicateDust = dup ? t.rarities.skins[crate.rarity].duplicateDust : 0;
  const shown: PendingCrate = { ...crate, duplicateDust };
  const save: SaveDoc = {
    ...s,
    currencies: { ...s.currencies, dust: s.currencies.dust + duplicateDust },
    skins: dup ? s.skins : { ...s.skins, owned: [...s.skins.owned, crate.skin] },
    capsules: { ...s.capsules, wardrobe: s.capsules.wardrobe.filter((c) => c.id !== id) },
    pity: advanceWardrobePity(s.pity, crate.rarity),
  };
  const { reelTiles, stopOffsetBp } = reelFor(crate, t);
  return { save, reveal: { crate: shown, reelTiles, winnerIndex: REEL_WINNER_INDEX, stopOffsetBp } };
}
