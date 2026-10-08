/**
 * The simulated online opponent of the Ladder (owner decision 2026-10-07, DESIGN A7.1, A9 #21).
 *
 * Until real online play exists, a Ladder battle started from Home's Battle simulates matchmaking: Home
 * searches for a few seconds and "finds" a player, and the match is played against the bot that
 * matchmaking picked (`pickOpponentAt`, unchanged: the same General or Commander, tier, level, plan and
 * seed, so the difficulty does not change). This module builds that player: a gamer tag, a layered
 * avatar with plausible wearables, trophies near the player's inside their arena, the arena, a profile
 * banner, a national flag (or none) and connection bars. Everything is drawn from a stream seeded by the
 * match seed, so the same match always shows the same player (the search, VS, the battle, the Result
 * and the replay agree).
 *
 * Presentation only: {@link asOnlineOpponent} keeps `isAI: true`, the General id, tier, level, plan,
 * seed and disclosures, and `side.isBot` stays true; it sets the name (`displayName`, `side.label`),
 * `side.online` and the base look with the flag. When real online play ships, real players replace the
 * simulated ones (the same `OnlinePlayer` shape).
 *
 * Pure and deterministic (B2): integer draws from sfc32.
 */
import type { AvatarSlot, AvatarSpec, CosmeticKey, OnlinePlayer, OpponentSpec, SaveDoc, SideLook } from '@/contracts';
import type { AvatarPartDef, Content, CosmeticSource, OnlineNameTables } from '@/content';
import { chanceBp, pick, pickWeighted, randInt, seedSfc32, type Sfc32State } from '@/core';
import { botLook, collectionItems } from './cosmetics';
import { arenaOf } from './tables';

/** The trophy window of the search: the player's trophies ± `trophySpread`, inside the player's arena. */
export interface OnlineWindow {
  min: number;
  max: number;
  /** The player's arena number (1-based). */
  arena: number;
}

/** The window the search shows and the found player's trophies sit in (never below 0). */
export function onlineTrophyWindow(s: Pick<SaveDoc, 'trophies' | 'arenaIndex'>, t: Content): OnlineWindow {
  const a = arenaOf(s, t);
  const next = t.arenas.list[a.index];
  const lo = a.trophies;
  const hi = next ? next.trophies - 1 : Number.MAX_SAFE_INTEGER;
  const spread = t.names.online.trophySpread;
  const at = Math.max(lo, Math.min(hi, s.trophies.current));
  return { min: Math.max(0, lo, at - spread), max: Math.min(hi, at + spread), arena: a.index };
}

type Pattern = 'adjNoun' | 'adjNounNum' | 'nounNum' | 'givenNum' | 'givenNoun' | 'lower' | 'title' | 'xx' | 'the' | 'given' | 'nounNoun';

/** How often each tag shape appears (weights). */
const PATTERNS: readonly (readonly [Pattern, number])[] = [
  ['adjNoun', 22],
  ['adjNounNum', 10],
  ['nounNum', 12],
  ['givenNum', 20],
  ['givenNoun', 7],
  ['lower', 9],
  ['title', 3],
  ['xx', 3],
  ['the', 4],
  ['given', 4],
  ['nounNoun', 5],
];
const PATTERN_WEIGHTS = PATTERNS.map(([, w]) => w);

/** A gamer tag and, for a given-name tag, the region it came from (it picks the flag). */
export function onlineTag(rng: Sfc32State, n: OnlineNameTables): { name: string; region: number | null } {
  const adj = () => pick(rng, n.adjectives);
  const noun = () => pick(rng, n.nouns);
  const num = () => pick(rng, n.numbers);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const shape = PATTERNS[pickWeighted(rng, PATTERN_WEIGHTS)]![0];
    const from: { region: number | null } = { region: null };
    const given = (): string => {
      const r = randInt(rng, n.given.length);
      from.region = r;
      return pick(rng, n.given[r]!.names);
    };
    let name: string;
    switch (shape) {
      case 'adjNoun':
        name = adj() + noun();
        break;
      case 'adjNounNum':
        name = adj() + noun() + num();
        break;
      case 'nounNum':
        name = noun() + (randInt(rng, 3) === 0 ? '_' : '') + num();
        break;
      case 'givenNum': {
        const g = given();
        const style = randInt(rng, 3);
        name = style === 0 ? `${g}_${num()}` : style === 1 ? `${g}${num()}` : `${g.toLowerCase()}.${num()}`;
        break;
      }
      case 'givenNoun':
        name = given() + noun();
        break;
      case 'lower':
        name = `${adj()}${randInt(rng, 2) === 0 ? '_' : ''}${noun()}`.toLowerCase();
        break;
      case 'title':
        name = pick(rng, n.titles) + noun();
        break;
      case 'xx':
        name = `xX${noun()}Xx`;
        break;
      case 'the':
        name = `The${adj()}${noun()}`;
        break;
      case 'given':
        name = given();
        break;
      case 'nounNoun': {
        const a = noun();
        let b = noun();
        if (b === a) b = noun();
        name = a + b;
        break;
      }
      default:
        name = noun() + num();
    }
    if (name.length <= n.maxLength && !isBlocked(name, n)) return { name, region: from.region };
  }
  return { name: noun() + num(), region: null };
}

/** True when a tag contains blocked letters anywhere, also across its word joins (any case). */
function isBlocked(name: string, n: OnlineNameTables): boolean {
  const low = name.toLowerCase();
  return n.blocked.some((b) => low.includes(b));
}

/** The part whose id ends in `_none` (an optional slot left empty), else the slot's first starter. */
function emptyPart(starters: readonly AvatarPartDef[]): string {
  return (starters.find((p) => p.id.endsWith('_none')) ?? starters[0])!.id;
}

/** True when a player with these trophies could plausibly have earned a wearable from this source. */
function plausible(src: CosmeticSource, arena: number, trophies: number): boolean {
  switch (src.kind) {
    case 'road':
      return trophies >= src.trophies;
    case 'arena':
      return arena >= src.arena;
    case 'warPathBoss':
    case 'warPathStars':
      return arena >= 2;
    case 'title':
    case 'codexLevel':
      return arena >= 5;
    default:
      return true;
  }
}

/**
 * A layered avatar built from the creator's parts: starter face pieces, and wearables earned in play at a
 * rate that grows with the arena (higher arenas wear more and rarer items), each one plausible for the
 * player's trophies (a Trophy Road item only past its node).
 */
function onlineAvatar(rng: Sfc32State, t: Content, arena: number, trophies: number): AvatarSpec {
  const A = t.cosmetics.avatar;
  const bySlot = (slot: AvatarSlot, starter: boolean) => A.parts.filter((p) => p.slot === slot && (p.rarity === 'starter') === starter);
  const starterOf = (slot: AvatarSlot) => pick(rng, bySlot(slot, true)).id;
  const filled = (slot: AvatarSlot) => {
    const list = bySlot(slot, true);
    const none = emptyPart(list);
    const rest = list.filter((p) => p.id !== none);
    return rest.length > 0 ? pick(rng, rest).id : none;
  };
  const rarityWeight = (p: AvatarPartDef): number => (p.rarity === 'common' ? 60 : p.rarity === 'rare' ? 28 : p.rarity === 'epic' ? 9 : arena >= 4 ? 3 : 1);
  const wear = (slot: AvatarSlot, chance: number): string | null => {
    if (!chanceBp(rng, chance)) return null;
    const list = bySlot(slot, false).filter((p) => plausible(p.source, arena, trophies));
    const i = pickWeighted(rng, list.map(rarityWeight));
    return i >= 0 ? list[i]!.id : null;
  };
  const look: Partial<Record<AvatarSlot, string>> = {
    face: starterOf('face'),
    eyes: starterOf('eyes'),
    brows: starterOf('brows'),
    nose: starterOf('nose'),
    mouth: starterOf('mouth'),
    hair: starterOf('hair'),
    facialHair: chanceBp(rng, 5500) ? emptyPart(bySlot('facialHair', true)) : filled('facialHair'),
    headwear: wear('headwear', Math.min(8000, 2500 + 900 * arena)) ?? (chanceBp(rng, 5000) ? emptyPart(bySlot('headwear', true)) : filled('headwear')),
    top: wear('top', Math.min(7500, 2000 + 900 * arena)) ?? starterOf('top'),
    accessory: wear('accessory', Math.min(4500, 600 + 500 * arena)) ?? (chanceBp(rng, 7000) ? emptyPart(bySlot('accessory', true)) : filled('accessory')),
    background: wear('background', Math.min(6000, 1000 + 700 * arena)) ?? starterOf('background'),
  };
  const tints = { skin: randInt(rng, A.tints.skin), hair: randInt(rng, A.tints.hair), eyes: randInt(rng, A.tints.eyes), cloth: randInt(rng, A.tints.cloth) };
  return { seed: randInt(rng, 0x7fffffff), parts: {}, look, tints };
}

/** The national flag beside a tag: mostly the given name's region, now and then another, often none. */
function onlineFlag(rng: Sfc32State, t: Content, region: number | null): CosmeticKey | null {
  const all = collectionItems(t, 'nationalFlag').map((x) => x.id);
  if (all.length === 0) return null;
  if (region !== null) {
    const roll = randInt(rng, 100);
    const own = (t.names.online.given[region]?.flags ?? []).filter((f) => all.includes(f));
    if (roll < 62 && own.length > 0) return `nationalFlag.${pick(rng, own)}`;
    if (roll < 75) return `nationalFlag.${pick(rng, all)}`;
    return null;
  }
  return chanceBp(rng, 5500) ? `nationalFlag.${pick(rng, all)}` : null;
}

/** The profile banner: mostly the newest one their arena gave them. */
function onlineBanner(rng: Sfc32State, t: Content, arena: number): string {
  const owned = t.cosmetics.banners.filter((b) => b.arena <= arena);
  if (owned.length === 0) return t.cosmetics.defaults.banner;
  const newest = owned.reduce((a, b) => (b.arena > a.arena ? b : a));
  const older = owned.filter((b) => b !== newest);
  return older.length === 0 || chanceBp(rng, 5500) ? newest.id : pick(rng, older).id;
}

/**
 * The player the simulated matchmaking finds for the match with this seed (deterministic in the save
 * and the seed). `nationalFlag` goes into the side's look.
 */
export function onlinePlayerFor(s: Pick<SaveDoc, 'trophies' | 'arenaIndex' | 'profile'>, t: Content, seed: number): { player: OnlinePlayer; nationalFlag: CosmeticKey | null } {
  const rng = seedSfc32(`online:${seed}`);
  const n = t.names.online;
  const tag = onlineTag(rng, n);
  // Never the player's own name back.
  const name = tag.name.toLowerCase() === s.profile.name.toLowerCase() ? `${tag.name.slice(0, n.maxLength - 2)}${pick(rng, n.numbers).slice(0, 2)}` : tag.name;
  const w = onlineTrophyWindow(s, t);
  const span = w.max - w.min + 1;
  // Two draws averaged: players close to your trophies are found most often.
  const trophies = w.min + ((randInt(rng, span) + randInt(rng, span)) >> 1);
  const player: OnlinePlayer = {
    name,
    avatar: onlineAvatar(rng, t, w.arena, trophies),
    trophies,
    arena: w.arena,
    banner: onlineBanner(rng, t, w.arena),
    bars: chanceBp(rng, 8000) ? 3 : 2,
  };
  return { player, nationalFlag: onlineFlag(rng, t, tag.region) };
}

/**
 * A Ladder opponent shown as the simulated online player (owner decision 2026-10-07). Everything that
 * plays (General id, tier, level, plan, levels, seed, modifiers, disclosures, `isAI`, `side.isBot`) is
 * kept; the name, `side.online` and the base look (seeded by the player, with their flag) are set.
 */
export function asOnlineOpponent(s: SaveDoc, t: Content, o: OpponentSpec): OpponentSpec {
  const { player, nationalFlag } = onlinePlayerFor(s, t, o.seed);
  const look: SideLook = { ...botLook(t, `online:${o.seed}`), nationalFlag };
  return { ...o, displayName: player.name, side: { ...o.side, label: player.name, look, online: player } };
}
