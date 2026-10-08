/**
 * The cosmetic collections (DESIGN A18.9.4, owner direction 2026-09-28): emotes, quotes, base flags,
 * national flags, base skins, base decorations, battle backdrops (owner request 2026-09-30; the "Skies"
 * from save v14) and scenes (save v14, PLAN 2b).
 *
 * - Keys: an item's key is `<collection>.<id>` (`nationalFlag.dk`); owned keys live in
 *   `SaveDoc.cosmetics.owned` next to banner and title ids, the chosen items in `cosmetics.equipped`.
 * - Owning: starter items (`source.kind 'start'`) and the six starter emotes belong to everyone. The
 *   rest are earned: the Time Capsule and Wardrobe Crate drop pools (rolled at grant from their own
 *   RNG stream, `rng.cosmetic`, so a cosmetic never changes a capsule's cards; odds disclosed by
 *   {@link cosmeticOdds}), Trophy Road nodes, hidden feats, arenas, Codex Levels and the Flag Atlas
 *   (granted by state, {@link syncEarnedCosmetics}), and Dust: crafting of pool items and buying
 *   national flags at their one price ({@link craftCosmetic}, PLAN 2d). Nothing is sold for money (A6.2).
 * - The release gate (PLAN 2e): an item with `released: false` stays in the content but no player
 *   meets it: it is never rolled, granted by state, crafted or equipped, and never shows in a look,
 *   the odds or the completion counts.
 * - Drops: a rolled rarity, then an unowned item of that pool and rarity; a duplicate only when all
 *   of them are owned, and a duplicate turns into Dust when it is opened.
 * - Equipping: only owned, released items, each in its own slot; base skins and scenes only on their
 *   age, one base skin per age across both skin systems (a cosmetic base skin and the troop-system
 *   skin of that base, Crystal Spire, never both); the national flag is only ever the player's own pick
 *   (never inferred from location); one backdrop (the "Sky") re-grades the player's half in every age
 *   (null = each scene's own daylight); a scene per age (none = the age's classic scene).
 *
 * Pure and deterministic (B2).
 */
import type { AgeId, AvatarSlot, AvatarTint, BaseEmoteId, CapsuleTier, CosmeticLoadout, PendingCapsule, Rarity, Result, SaveDoc, SideLook } from '@/contracts';
import { isCosmeticReleased, type Content, type CosmeticCollection, type CosmeticItemDef, type FlagRegion } from '@/content';
import { cloneSfc32, pickWeighted, randInt, seedSfc32, type Sfc32State } from '@/core';
import { setAvatarLook } from './avatar';

export const COSMETIC_COLLECTIONS: readonly CosmeticCollection[] = ['emote', 'quote', 'baseFlag', 'nationalFlag', 'baseSkin', 'decoration', 'backdrop', 'scene', 'avatar'];
const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export const cosmeticKey = (x: Pick<CosmeticItemDef, 'collection' | 'id'>): string => `${x.collection}.${x.id}`;

const index = new WeakMap<Content, Map<string, CosmeticItemDef>>();

/** The item with this key, or undefined (an unknown or removed key). */
export function cosmeticItem(t: Content, key: string): CosmeticItemDef | undefined {
  let m = index.get(t);
  if (!m) {
    m = new Map(t.cosmetics.collections.items.map((x) => [cosmeticKey(x), x]));
    index.set(t, m);
  }
  return m.get(key);
}

/** True when players may meet the item (PLAN 2e release gate; `isCosmeticReleased` in the content). */
export const cosmeticReleased = isCosmeticReleased;

/**
 * Every released item of one collection, in content order (unreleased items stay in the content for
 * tests and dev pages, `t.cosmetics.collections.items`, but players never meet them).
 */
export function collectionItems(t: Content, c: CosmeticCollection): CosmeticItemDef[] {
  return t.cosmetics.collections.items.filter((x) => x.collection === c && isCosmeticReleased(x));
}

function isBaseEmote(t: Content, id: string): id is BaseEmoteId {
  return t.cosmetics.emotes.some((e) => e.id === id);
}

/** True when the save owns the item (starters are owned by everyone, as are the six starter emotes). */
export function ownsCosmetic(s: SaveDoc, t: Content, key: string): boolean {
  if (isBaseEmote(t, key)) return true;
  const x = cosmeticItem(t, key);
  if (!x) return false;
  return x.source.kind === 'start' || s.cosmetics.owned.includes(key);
}

/** A new profile's equipped items (content defaults). */
export function defaultLoadout(t: Content): CosmeticLoadout {
  const d = t.cosmetics.collections.defaults;
  return {
    emotes: [...d.emotes],
    quotes: [...d.quotes],
    baseFlag: d.baseFlag,
    nationalFlag: d.nationalFlag,
    baseSkins: {},
    decorations: [...d.decorations],
    backdrop: d.backdrop ?? null,
    scenes: { ...(d.scenes ?? {}) },
  };
}

/** The save's equipped items, falling back to the defaults for a save without them. */
export function equippedOf(s: SaveDoc, t: Content): CosmeticLoadout {
  const eq = (s.cosmetics as Partial<SaveDoc['cosmetics']>).equipped;
  if (!eq) return defaultLoadout(t);
  // a look from before save v8 (an in-memory doc) has no backdrop: the classic skies; one from before
  // save v14 has no scenes: the classic scenes
  if (eq.backdrop !== undefined && eq.scenes !== undefined) return eq;
  return { ...eq, backdrop: eq.backdrop ?? null, scenes: eq.scenes ?? {} };
}

// ---------------------------------------------------------------------------------------------
// Equipping
// ---------------------------------------------------------------------------------------------

/** One change of the equipped cosmetics. A null key clears the slot. */
export type CosmeticEquip =
  | { slot: 'baseFlag'; key: string | null }
  | { slot: 'nationalFlag'; key: string | null }
  /** A cosmetic base skin on its own age; it replaces the troop-system skin of that base (one per age). */
  | { slot: 'baseSkin'; age: AgeId; key: string | null }
  | { slot: 'decoration'; anchor: number; key: string | null }
  /** The sky (`backdrop.<id>`), one for every age. */
  | { slot: 'backdrop'; key: string | null }
  /** A scene (`scene.<id>`) on its own age (save v14); null returns the age to its classic scene. */
  | { slot: 'scene'; age: AgeId; key: string | null }
  | { slot: 'emotes'; keys: string[] }
  | { slot: 'quotes'; keys: string[] }
  /** The avatar creator's look (owner request 2026-10-07): starter parts and owned wearables only. */
  | { slot: 'avatar'; look: Partial<Record<AvatarSlot, string>>; tints?: Partial<Record<AvatarTint, number>> };

const fail = (reason: string): Result<SaveDoc> => ({ ok: false, reason });

/**
 * Equips owned, released items (A18.9.4). Reasons: `notOwned`, `wrongCollection` (also an unknown
 * key), `unreleased`, `wrongAge`, `badAnchor`, `wheelFull`, `duplicate`.
 */
export function equipCosmetic(s: SaveDoc, t: Content, e: CosmeticEquip): Result<SaveDoc> {
  if (e.slot === 'avatar') return setAvatarLook(s, t, e.look, e.tints ?? {});
  const col = t.cosmetics.collections;
  const cur = equippedOf(s, t);
  const check = (key: string | null, collection: CosmeticCollection): string | null => {
    if (key === null) return null;
    const x = cosmeticItem(t, key);
    if (!x || x.collection !== collection) return 'wrongCollection';
    if (!isCosmeticReleased(x)) return 'unreleased';
    if (!ownsCosmetic(s, t, key)) return 'notOwned';
    return null;
  };
  let skins = s.skins;
  let next: CosmeticLoadout;
  switch (e.slot) {
    case 'baseFlag':
    case 'nationalFlag':
    case 'backdrop': {
      const bad = check(e.key, e.slot);
      if (bad) return fail(bad);
      next = { ...cur, [e.slot]: e.key };
      break;
    }
    case 'baseSkin': {
      const bad = check(e.key, 'baseSkin');
      if (bad) return fail(bad);
      if (e.key !== null && cosmeticItem(t, e.key)?.age !== e.age) return fail('wrongAge');
      const baseSkins = { ...cur.baseSkins };
      if (e.key === null) delete baseSkins[e.age];
      else baseSkins[e.age] = e.key;
      next = { ...cur, baseSkins };
      // One base skin per age across both systems (PLAN 2c, save v14): a cosmetic skin replaces the
      // troop-system skin of that base (Crystal Spire on the Future base), which stays owned.
      const target = `base.${e.age}`;
      if (e.key !== null && s.skins.equipped[target] !== undefined) {
        const equipped = { ...s.skins.equipped };
        delete equipped[target];
        skins = { ...s.skins, equipped };
      }
      break;
    }
    case 'scene': {
      const bad = check(e.key, 'scene');
      if (bad) return fail(bad);
      if (e.key !== null && cosmeticItem(t, e.key)?.age !== e.age) return fail('wrongAge');
      const scenes = { ...cur.scenes };
      if (e.key === null) delete scenes[e.age];
      else scenes[e.age] = e.key;
      next = { ...cur, scenes };
      break;
    }
    case 'decoration': {
      if (!Number.isInteger(e.anchor) || e.anchor < 0 || e.anchor >= col.decorationAnchors) return fail('badAnchor');
      const bad = check(e.key, 'decoration');
      if (bad) return fail(bad);
      const decorations = Array.from({ length: col.decorationAnchors }, (_, i) => cur.decorations[i] ?? null);
      // one decoration shows once: moving it to a new anchor empties the old one
      for (let i = 0; i < decorations.length; i += 1) if (e.key !== null && decorations[i] === e.key) decorations[i] = null;
      decorations[e.anchor] = e.key;
      next = { ...cur, decorations };
      break;
    }
    case 'emotes': {
      if (e.keys.length > col.wheel.emotes) return fail('wheelFull');
      if (new Set(e.keys).size !== e.keys.length) return fail('duplicate');
      for (const k of e.keys) {
        if (isBaseEmote(t, k)) continue;
        const bad = check(k, 'emote');
        if (bad) return fail(bad);
      }
      next = { ...cur, emotes: [...e.keys] };
      break;
    }
    case 'quotes': {
      if (e.keys.length > col.wheel.quotes) return fail('wheelFull');
      if (new Set(e.keys).size !== e.keys.length) return fail('duplicate');
      for (const k of e.keys) {
        const bad = check(k, 'quote');
        if (bad) return fail(bad);
      }
      next = { ...cur, quotes: [...e.keys] };
      break;
    }
  }
  return { ok: true, value: { ...s, ...(skins !== s.skins ? { skins } : {}), cosmetics: { ...s.cosmetics, equipped: next } } };
}

/**
 * The side look a match shows for this save (A18.9.4: in battle and on the VS screen): owned,
 * released items only, base skins and scenes only on their own age.
 */
export function sideLook(s: SaveDoc, t: Content): SideLook {
  const e = equippedOf(s, t);
  const own = (k: string | null): string | null => {
    if (k === null || !ownsCosmetic(s, t, k)) return null;
    const x = cosmeticItem(t, k);
    return !x || isCosmeticReleased(x) ? k : null;
  };
  const perAge = (m: Partial<Record<AgeId, string>>): Partial<Record<AgeId, string>> => {
    const out: Partial<Record<AgeId, string>> = {};
    for (const age of t.order.ages) {
      const k = m[age];
      if (k !== undefined && own(k) && cosmeticItem(t, k)?.age === age) out[age] = k;
    }
    return out;
  };
  return {
    baseFlag: own(e.baseFlag),
    nationalFlag: own(e.nationalFlag),
    baseSkins: perAge(e.baseSkins),
    decorations: e.decorations.map(own),
    backdrop: own(e.backdrop),
    scenes: perAge(e.scenes),
  };
}

/**
 * An AI opponent's look, seeded by its name: a base flag and decorations from the whole collection
 * (the look is cosmetic and bots are labeled AI everywhere, A7.1). Bots never fly a national flag,
 * so no country is ever implied for an AI, and keep their age's classic sky and classic scenes
 * (A18.9.4), so the player's own sky and scenes mark the player's half.
 */
export function botLook(t: Content, seed: string): SideLook {
  const rng = seedSfc32(`look:${seed}`);
  const pick = (c: CosmeticCollection): string | null => {
    const all = collectionItems(t, c);
    const x = all[randInt(rng, all.length)];
    return x ? cosmeticKey(x) : null;
  };
  const baseSkins: Partial<Record<AgeId, string>> = {};
  for (const x of collectionItems(t, 'baseSkin')) if (x.age && baseSkins[x.age] === undefined && randInt(rng, 2) === 0) baseSkins[x.age] = cosmeticKey(x);
  const anchors = t.cosmetics.collections.decorationAnchors;
  const decorations = Array.from({ length: anchors }, () => (randInt(rng, 3) === 0 ? null : pick('decoration')));
  return { baseFlag: pick('baseFlag'), nationalFlag: null, baseSkins, decorations, backdrop: null, scenes: {} };
}

// ---------------------------------------------------------------------------------------------
// Granting and earning
// ---------------------------------------------------------------------------------------------

/**
 * Adds items to `owned`. An item already owned (or a starter) pays its duplicate Dust instead.
 * Unknown keys are ignored.
 */
export function grantCosmetics(s: SaveDoc, t: Content, keys: readonly string[]): { save: SaveDoc; fresh: string[]; dust: number } {
  const owned = [...s.cosmetics.owned];
  const fresh: string[] = [];
  let dust = 0;
  for (const k of keys) {
    const x = cosmeticItem(t, k);
    if (!x) continue;
    if (x.source.kind === 'start' || owned.includes(k)) dust += t.cosmetics.collections.drops.duplicateDust[x.rarity];
    else {
      owned.push(k);
      fresh.push(k);
    }
  }
  if (fresh.length === 0 && dust === 0) return { save: s, fresh, dust };
  return {
    save: { ...s, currencies: { ...s.currencies, dust: s.currencies.dust + dust }, cosmetics: { ...s.cosmetics, owned } },
    fresh,
    dust,
  };
}

/** Normal is the second difficulty: a boss crown of 2 or more is a clear on Normal or harder (A18.7.4). */
const NORMAL_CROWN = 2;

/** The released national flags that count toward the Atlas's "195": every region but the Other flags. */
function atlasFlags(t: Content, region?: FlagRegion): CosmeticItemDef[] {
  return collectionItems(t, 'nationalFlag').filter((x) => (region === undefined ? x.region !== 'other' : x.region === region));
}

/**
 * Owned released national flags (PLAN 2d): of one region, or (no region) of the six regions that make
 * the Atlas's 195 (the Other flags group does not count). The Flag Atlas's region and total rewards and
 * the `flagsOwned` title read it.
 */
export function ownedNationalFlags(s: SaveDoc, t: Content, region?: FlagRegion): number {
  const owned = new Set(s.cosmetics.owned);
  return atlasFlags(t, region).filter((x) => owned.has(cosmeticKey(x))).length;
}

/** True when every released national flag of `region` is owned (and the region has any). */
export function flagRegionComplete(s: SaveDoc, t: Content, region: FlagRegion): boolean {
  const all = atlasFlags(t, region).length;
  return all > 0 && ownedNationalFlags(s, t, region) === all;
}

/**
 * True when a state-earned item's condition holds (road node claimed, feat found, arena, Codex Level,
 * the Flag Atlas's region and total rewards, and for avatar wearables: an age's War Path boss beaten on
 * Normal or harder, every level of a region at 3 stars, or a milestone title owned).
 */
function earned(x: CosmeticItemDef, s: SaveDoc, t: Content): boolean {
  const src = x.source;
  switch (src.kind) {
    case 'flagRegion':
      return flagRegionComplete(s, t, src.region);
    case 'flagsOwned':
      return ownedNationalFlags(s, t) >= src.count;
    case 'warPathBoss': {
      const region = t.warPath.regions.find((r) => r.age === src.age);
      const bossId = region?.levels.find((id) => t.warPath.levels[id]?.role === 'boss');
      return bossId !== undefined && (s.warPath?.crowns?.[bossId] ?? 0) >= NORMAL_CROWN;
    }
    case 'warPathStars': {
      const region = t.warPath.regions.find((r) => r.age === src.age);
      return region !== undefined && region.levels.length > 0 && region.levels.every((id) => (s.warPath?.stars?.[id] ?? 0) >= 3);
    }
    case 'title':
      return s.cosmetics.owned.includes(src.title);
    case 'road':
      return s.trophies.roadClaimed.includes(src.trophies);
    case 'feat':
      return s.flags[`feat.${src.feat}`] === true;
    case 'arena':
      return s.arenaIndex + 1 >= src.arena;
    case 'codexLevel':
      return s.codexLevel >= src.level;
    default:
      return false;
  }
}

/**
 * Grants every released road, feat, arena, Codex Level, War Path, milestone and Flag Atlas item the
 * save has earned and does not own yet.
 */
export function syncEarnedCosmetics(s: SaveDoc, t: Content): { save: SaveDoc; granted: string[] } {
  const owned = new Set(s.cosmetics.owned);
  const granted = t.cosmetics.collections.items.filter((x) => isCosmeticReleased(x) && !owned.has(cosmeticKey(x)) && earned(x, s, t)).map(cosmeticKey);
  if (granted.length === 0) return { save: s, granted };
  return { save: { ...s, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, ...granted] } }, granted };
}

// ---------------------------------------------------------------------------------------------
// Drops (Time Capsules and the Wardrobe Crate)
// ---------------------------------------------------------------------------------------------

export type CosmeticPool = 'capsule' | 'crate';

/** Released items of a drop pool and rarity, in content order (national flags are never in one). */
export function poolItems(t: Content, pool: CosmeticPool, rarity?: Rarity): CosmeticItemDef[] {
  return t.cosmetics.collections.items.filter((x) => x.source.kind === pool && (rarity === undefined || x.rarity === rarity) && isCosmeticReleased(x));
}

/** Owned items plus those waiting in unopened capsules and crates (a roll never hands one out twice). */
export function cosmeticsForRoll(s: SaveDoc): Set<string> {
  const out = new Set(s.cosmetics.owned);
  for (const p of s.capsules.pending) if (p.contents.cosmetic) out.add(p.contents.cosmetic);
  for (const c of s.capsules.wardrobe) if (c.cosmetic) out.add(c.cosmetic);
  return out;
}

/** The cosmetic stream of a save (derived from the capsule stream for a save that has none yet). */
export function cosmeticRng(s: SaveDoc): Sfc32State {
  return s.rng.cosmetic ? cloneSfc32(s.rng.cosmetic) : seedSfc32(`cosmetic:${s.rng.capsule.join(',')}`);
}

/** One item of a pool at the given rarity odds: unowned first; a duplicate only when all are owned. */
export function rollPoolItem(t: Content, rng: Sfc32State, pool: CosmeticPool, rarityBp: Record<Rarity, number>, owned: ReadonlySet<string>): string | null {
  const rarity = RARITIES[pickWeighted(rng, RARITIES.map((r) => rarityBp[r]))] ?? 'common';
  const all = poolItems(t, pool, rarity);
  if (all.length === 0) return null;
  const fresh = all.filter((x) => !owned.has(cosmeticKey(x)));
  const from = fresh.length > 0 ? fresh : all;
  const x = from[randInt(rng, from.length)];
  return x ? cosmeticKey(x) : null;
}

/** Released items only capsules of `tier` hold (source `capsuleTier`, e.g. the Aeon Collection; A6.4 step 8). */
export function tierExclusiveItems(t: Content, tier: CapsuleTier): CosmeticItemDef[] {
  return t.cosmetics.collections.items.filter((x) => x.source.kind === 'capsuleTier' && x.source.tier === tier && isCosmeticReleased(x));
}

/**
 * The collection item of a Time Capsule being granted: a chance by tier (A18.9.4 drop table), none in
 * onboarding script and Age Unlock capsules. An `exclusiveItems` tier (Aeon, A6.4 step 8) holds one
 * of its exclusive items the player lacks and no unopened capsule holds (uniform) in place of that
 * roll; once every one is owned or promised it rolls the normal pool and adds `exclusiveCompleteDust`.
 * Returns the key (or null), that bonus Dust and the advanced stream.
 */
export function rollCapsuleCosmetic(
  s: SaveDoc,
  t: Content,
  tier: CapsuleTier,
  kind: PendingCapsule['kind'],
  scripted: boolean,
): { key: string | null; dust: number; rng: Sfc32State } {
  const rng = cosmeticRng(s);
  if (scripted || kind === 'ageUnlock') return { key: null, dust: 0, rng };
  const d = t.cosmetics.collections.drops;
  let dust = 0;
  if (t.capsules.tiers[tier].exclusiveItems) {
    const all = tierExclusiveItems(t, tier);
    const held = cosmeticsForRoll(s);
    const lacking = all.filter((x) => !held.has(cosmeticKey(x)));
    if (lacking.length > 0) {
      const x = lacking[randInt(rng, lacking.length)];
      if (x) return { key: cosmeticKey(x), dust: 0, rng };
    }
    // The set is complete (or has no items yet: then no Dust either).
    if (all.length > 0) dust = t.capsules.exclusiveCompleteDust;
  }
  const chance = d.capsuleChanceBp[tier];
  if (chance <= 0 || randInt(rng, 10000) >= chance) return { key: null, dust, rng };
  return { key: rollPoolItem(t, rng, 'capsule', d.capsuleRarityBp, cosmeticsForRoll(s)), dust, rng };
}

/** The collection item every Wardrobe Crate holds next to its skin (A18.9.4). */
export function rollCrateCosmetic(s: SaveDoc, t: Content): { key: string | null; rng: Sfc32State } {
  const rng = cosmeticRng(s);
  return { key: rollPoolItem(t, rng, 'crate', t.cosmetics.collections.drops.crateRarityBp, cosmeticsForRoll(s)), rng };
}

/** The Dust an opened item pays when it is a duplicate (0 for a new item or none). */
export function duplicateDustOf(s: SaveDoc, t: Content, key: string | null | undefined): number {
  const x = key ? cosmeticItem(t, key) : undefined;
  if (!x || !key) return 0;
  return x.source.kind === 'start' || s.cosmetics.owned.includes(key) ? t.cosmetics.collections.drops.duplicateDust[x.rarity] : 0;
}

/** Grants the collection item of a capsule or crate being opened (a duplicate pays Dust). */
export function grantOpened(s: SaveDoc, t: Content, key: string | null | undefined): { save: SaveDoc; fresh: string[]; dust: number } {
  return key ? grantCosmetics(s, t, [key]) : { save: s, fresh: [], dust: 0 };
}

/** The flag set when a save opens its first capsule of a Legendary tier (A6.4, A10 step 4b). */
export const firstOfTierFlag = (tier: CapsuleTier): string => `capsule.first.${tier}`;

/**
 * What the save's next national flag costs (PLAN 2d, owner decisions 2026-10-08): `drops.flagDust`
 * for every flag, except that a save owning no national flag yet gets its first one for 0 while
 * `drops.firstFlagFree` is on (once, any country; derived from ownership, so no save field).
 */
export function nationalFlagPrice(s: SaveDoc, t: Content): number {
  const d = t.cosmetics.collections.drops;
  if (d.firstFlagFree && !s.cosmetics.owned.some((k) => cosmeticItem(t, k)?.collection === 'nationalFlag')) return 0;
  return d.flagDust;
}

/**
 * The Dust price to craft an item, or null when it cannot be crafted: pool items at their rarity's
 * price; a tier-exclusive item (the Aeon Collection) at `capsules.exclusiveCraftDust`; a national
 * flag (source `dust`) at {@link nationalFlagPrice}, so buying a flag is the craft path (without a
 * save: `drops.flagDust`).
 */
export function cosmeticCraftPrice(t: Content, x: CosmeticItemDef, s?: SaveDoc): number | null {
  if (x.source.kind === 'capsule' || x.source.kind === 'crate') return t.cosmetics.collections.drops.craftDust[x.rarity];
  if (x.source.kind === 'capsuleTier') return t.capsules.exclusiveCraftDust;
  if (x.source.kind === 'dust') return s ? nationalFlagPrice(s, t) : t.cosmetics.collections.drops.flagDust;
  return null;
}

/**
 * Crafts a drop-pool item with Dust (A15.11-style fallback), or a tier-exclusive item once the save has
 * opened a capsule of that tier (A6.4), or buys a national flag at its one price (PLAN 2d). Reasons:
 * unknownItem, unreleased, notCraftable, locked, owned, pending, notEnoughDust.
 *
 * `pending`: an unopened capsule or crate already holds the item. Its pre-rolled promise ("an item you
 * don't have yet", A6.4 steps 7-8) must stay true, so crafting it now would turn that item into a
 * duplicate refund; the player gets it by opening what they already earned.
 */
export function craftCosmetic(s: SaveDoc, t: Content, key: string): Result<SaveDoc> {
  const x = cosmeticItem(t, key);
  if (!x) return fail('unknownItem');
  if (!isCosmeticReleased(x)) return fail('unreleased');
  const price = cosmeticCraftPrice(t, x, s);
  if (price === null) return fail('notCraftable');
  if (x.source.kind === 'capsuleTier' && s.flags[firstOfTierFlag(x.source.tier)] !== true) return fail('locked');
  if (ownsCosmetic(s, t, key)) return fail('owned');
  if (cosmeticsForRoll(s).has(key)) return fail('pending');
  if (s.currencies.dust < price) return fail('notEnoughDust');
  return {
    ok: true,
    value: { ...s, currencies: { ...s.currencies, dust: s.currencies.dust - price }, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, key] } },
  };
}

// ---------------------------------------------------------------------------------------------
// Odds and completion
// ---------------------------------------------------------------------------------------------

export interface PoolOdds {
  pool: CosmeticPool;
  /** Per rarity: its odds, the number of items and how many the save owns. */
  rarities: { rarity: Rarity; bp: number; items: number; owned: number }[];
}

/** A tier-exclusive set (the Aeon Collection): how many of its items the save owns (A6.4 step 8). */
export interface ExclusiveSetOdds {
  tier: CapsuleTier;
  owned: number;
  total: number;
  /** Craftable now: the save has opened a capsule of this tier. */
  craftable: boolean;
  craftDust: number;
  completeDust: number;
}

/** Every tier-exclusive set with at least one item, in ladder order. */
export function exclusiveSets(s: SaveDoc, t: Content): ExclusiveSetOdds[] {
  const out: ExclusiveSetOdds[] = [];
  for (const tier of t.capsules.tierOrder) {
    if (!t.capsules.tiers[tier].exclusiveItems) continue;
    const items = tierExclusiveItems(t, tier);
    if (items.length === 0) continue;
    out.push({
      tier,
      owned: items.filter((x) => s.cosmetics.owned.includes(cosmeticKey(x))).length,
      total: items.length,
      craftable: s.flags[firstOfTierFlag(tier)] === true,
      craftDust: t.capsules.exclusiveCraftDust,
      completeDust: t.capsules.exclusiveCompleteDust,
    });
  }
  return out;
}

/** The disclosed drop tables (A15.3 honesty): the capsule chance per tier and both pools' rarity odds. */
export function cosmeticOdds(
  s: SaveDoc,
  t: Content,
): { capsuleChanceBp: Record<CapsuleTier, number>; capsule: PoolOdds; crate: PoolOdds; exclusive: ExclusiveSetOdds[] } {
  const d = t.cosmetics.collections.drops;
  const pool = (p: CosmeticPool, odds: Record<Rarity, number>): PoolOdds => ({
    pool: p,
    rarities: RARITIES.map((rarity) => {
      const items = poolItems(t, p, rarity);
      return { rarity, bp: odds[rarity], items: items.length, owned: items.filter((x) => s.cosmetics.owned.includes(cosmeticKey(x))).length };
    }),
  });
  return {
    capsuleChanceBp: { ...d.capsuleChanceBp },
    capsule: pool('capsule', d.capsuleRarityBp),
    crate: pool('crate', d.crateRarityBp),
    exclusive: exclusiveSets(s, t),
  };
}

/** "12/40 found" per collection over its released items (A18.9.4 completion counts). Starters count as found. */
export function collectionProgress(s: SaveDoc, t: Content): Record<CosmeticCollection, { owned: number; total: number }> {
  const out = {} as Record<CosmeticCollection, { owned: number; total: number }>;
  for (const c of COSMETIC_COLLECTIONS) {
    const items = collectionItems(t, c);
    out[c] = { owned: items.filter((x) => ownsCosmetic(s, t, cosmeticKey(x))).length, total: items.length };
  }
  return out;
}
