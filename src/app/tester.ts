/**
 * Test profiles (owner request 2026-10-06): `?tester=1` on the live site offers to replace the save in
 * this browser with a ready-made profile, so the owner can test the whole game on any device without
 * playing through the onboarding. Hidden from players: nothing in the game links to it, and without the
 * URL flag nothing changes.
 *
 * - **Everything unlocked**: every released card at level 9 with the copies for level 10, every power,
 *   fort, skin and cosmetic, the whole War Path beaten on Normal (3 stars), every Conquest General
 *   open, Iron Front (Arena 5, mid ladder) at 1,450 trophies with the Trophy Road claimed below that,
 *   500,000 Amber and 100,000 Dust, two capsules of each tier Clay to Aeon (a Trophy Road one that
 *   shows its tier and a Sundial one that climbs from Clay in the opening show), two Wardrobe Crates
 *   and a full Sundial.
 * - **Mid-game**: a realistic player about three weeks in: Kingsmoat (Arena 3) at 560 trophies, a mixed
 *   collection up to level 6, the War Path through Bronze L6, three Conquest Generals, a few capsules.
 *
 * Both are built on a real new save (`meta.newSave`) at the real time, so the version, RNG streams,
 * quests, Daily day and Sundial period are current; capsules are rolled by meta like any grant (the
 * reveal stays honest); timers start now. The save carries {@link TESTER_PROFILE_FLAG} so Settings
 * shows it is a test profile. The UI fixtures (`ui/screens/fixtures/saves.ts`) are not reused: they
 * import the contract fakes, which the production entry may not reach, and their fixed epoch timers
 * and empty capsule contents would not play in the real app.
 */
import type { AgeId, CardId, CompiledContent, Foil, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { grantCapsuleAt } from '@/meta/capsules/grant';
import { grantCrateAt } from '@/meta/capsules/wardrobe';
import { syncEarnedCosmetics } from '@/meta/cosmetics';
import { unlockFortSlot } from '@/meta/forts';
import { newSaveAt } from '@/meta/newSave';
import { withoutUnreleased } from '@/meta/release';
import { FIRST_PLAN_NAME, META_FLAGS } from '@/meta/rules';
import { cardRarity, tables } from '@/meta/tables';
import { localNow, type LocalClock } from '@/meta/time';
import { tickTimersAt } from '@/meta/timers';
import { unlockTitles } from '@/meta/titles';
import { arenaIndexFor } from '@/meta/trophies';
import { autoFill, PLAN_PRESETS, SIXTH_SLOT_FLAG } from '@/meta/warplan';
import { TESTER_PROFILE_FLAG } from '@/ui/screens/model/tester';
import { UNLOCK_ORDER, unlockFlag } from '@/ui/screens/model/warPath';

export { TESTER_PROFILE_FLAG };

export type TesterProfile = 'everything' | 'midGame';
export const TESTER_PROFILES: readonly TesterProfile[] = ['everything', 'midGame'];

/** The URL flag that offers the test profiles (`?tester=1`). */
export const TESTER_PARAM = 'tester';

export function testerRequested(search: string): boolean {
  return new URLSearchParams(search).get(TESTER_PARAM) === '1';
}

/** The URL without `tester=1` (other parameters and the hash are kept). */
export function urlWithoutTester(href: string): string {
  const u = new URL(href);
  u.searchParams.delete(TESTER_PARAM);
  return u.toString();
}

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** Highest card level (A6.6: the Amber table holds the steps from level 1). */
function maxLevel(t: Content): number {
  return t.rarities.upgradeAmber.length + 1;
}

/** Copies needed to go from `level` to `level + 1` (0 at the top). */
function copiesFor(t: Content, id: CardId, level: number): number {
  return t.rarities.cards[cardRarity(t, id)].upgradeCopies[level - 1] ?? 0;
}

function ageOf(t: Content, id: CardId): AgeId | undefined {
  return t.units[id]?.age ?? t.turrets[id]?.age;
}

function collectable(t: Content): CardId[] {
  return [...t.order.units, ...t.order.turrets];
}

/** Every flag a player past the onboarding has set: unlock moments and one-time hints seen. */
function pastOnboardingFlags(): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const f of UNLOCK_ORDER) flags[unlockFlag(f)] = true;
  for (const k of ['ui-seen.amber', 'ui-seen.dust', 'ui-seen.army', 'ui-seen.lastBase']) flags[k] = true;
  flags['tutorial.firstUpgrade'] = true;
  flags['tutorial.warPlanPrompt'] = true;
  flags[META_FLAGS.ladderPlayed] = true;
  flags[META_FLAGS.dailyUnlocked] = true;
  flags[META_FLAGS.powerField] = true;
  flags[SIXTH_SLOT_FLAG] = true;
  flags[TESTER_PROFILE_FLAG] = true;
  return flags;
}

/** Conquest stars: the first `open` Generals beaten once (so every one up to there is open). */
function conquestStars(t: Content, stars: (i: number) => number): SaveDoc['conquest']['stars'] {
  const out: SaveDoc['conquest']['stars'] = {};
  t.generals.conquest.board.forEach((b, i) => {
    const n = stars(i);
    if (n > 0) out[b.general] = [n >= 1, n >= 2, n >= 3];
  });
  return out;
}

/** The hidden MMR at the middle of the arena's bot tier range (`mmr.ts` ladderTier inverted). */
function mmrFor(t: Content, arenaIndex: number): number {
  const a = t.arenas.list[arenaIndex]!;
  const m = t.arenas.ladder.mmr;
  return m.tierOffset + m.tierDivisor * Math.round((a.botTiers[0] + a.botTiers[1]) / 2);
}

/** Road nodes up to `upTo` trophies claimed, with the powers they gave. */
function claimRoadUpTo(s: SaveDoc, t: Content, upTo: number): SaveDoc {
  const nodes = t.trophyRoad.nodes.filter((n) => n.trophies <= upTo);
  const powers = new Set(s.powersOwned);
  for (const n of nodes) for (const r of n.rewards) if (r.kind === 'power' && t.powers[r.card]) powers.add(r.card);
  return { ...s, powersOwned: t.order.powers.filter((id) => powers.has(id)), trophies: { ...s.trophies, roadClaimed: nodes.map((n) => n.trophies) } };
}

/** War Path levels in map order beaten (`stars(i)` 1-3, crown Normal), with their card rewards. */
function beatWarPath(s: SaveDoc, t: Content, count: number, stars: (i: number) => number): SaveDoc {
  const p = { ...s.warPath, stars: { ...s.warPath.stars }, crowns: { ...s.warPath.crowns } };
  const collection = { ...s.collection };
  t.warPath.order.slice(0, count).forEach((id, i) => {
    p.stars[id] = stars(i);
    p.crowns[id] = 2;
    const card = t.warPath.levels[id]?.reward.card;
    if (card && !collection[card] && (t.units[card] || t.turrets[card])) collection[card] = { level: 1, copies: 0, isNew: false, foil: 'none' };
  });
  return { ...s, warPath: p, collection };
}

/** Plan presets auto-filled from the collection (A3), named A, B, C. */
function plans(s: SaveDoc, t: Content, count: number): SaveDoc {
  const plan = autoFill(s, t);
  const names = [FIRST_PLAN_NAME, 'B', 'C'];
  const warPlans = Array.from({ length: Math.min(count, PLAN_PRESETS) }, (_, i) => ({ ...plan, name: names[i] ?? plan.name }));
  return { ...s, warPlans, activePlan: 0 };
}

function grantCapsules(s: SaveDoc, t: Content, now: number, list: readonly { kind: 'win' | 'road'; tier?: SaveDoc['capsules']['pending'][number]['tier'] }[]): SaveDoc {
  let out = s;
  for (const c of list) out = grantCapsuleAt(out, c.kind, t, now, c.tier ? { tier: c.tier } : {}).save;
  return out;
}

/** The last steps of both profiles: earned cosmetics and titles, timers, the release gate. */
function finish(s: SaveDoc, t: Content, clock: LocalClock): SaveDoc {
  let out = syncEarnedCosmetics(s, t).save;
  out = unlockTitles(out, t).save;
  out = tickTimersAt(out, t, localNow(clock));
  return withoutUnreleased(out, t);
}

/** A fresh save at the real time, already past the onboarding script (capsules roll from the bag). */
function base(t: Content, clock: LocalClock, seed: number): SaveDoc {
  const s = newSaveAt(t, localNow(clock), seed);
  return { ...s, scriptStep: t.capsules.script.length, tutorial: { step: 4, hintsShown: {} }, flags: { ...s.flags, ...pastOnboardingFlags() } };
}

export function everythingSave(c: CompiledContent, clock: LocalClock, seed: number): SaveDoc {
  const t = tables(c);
  const now = clock.now();
  const top = maxLevel(t);
  let s = base(t, clock, seed);

  const collection: SaveDoc['collection'] = {};
  for (const id of collectable(t)) collection[id] = { level: top - 1, copies: copiesFor(t, id, top - 1), isNew: false, foil: 'none' };
  // A mid ladder arena (Iron Front, Arena 5) so matchmaking meets fitting AI Generals.
  const arenaIndex = Math.min(4, t.arenas.list.length - 1);
  const trophies = t.arenas.list[arenaIndex]!.trophies + 150;
  s = {
    ...s,
    createdAt: now - 60 * DAY,
    collection,
    powersOwned: [...t.order.powers],
    skins: { owned: [...t.order.skins], equipped: {} },
    cosmetics: {
      ...s.cosmetics,
      owned: [
        ...new Set([
          ...s.cosmetics.owned,
          ...t.cosmetics.banners.map((b) => b.id),
          ...t.cosmetics.frames.map((f) => f.id),
          ...t.cosmetics.titles.map((x) => x.id),
          ...t.cosmetics.collections.items.map((x) => `${x.collection}.${x.id}`),
        ]),
      ],
    },
    currencies: { amber: 500_000, dust: 100_000 },
    trophies: { current: trophies, best: trophies, roadClaimed: [] },
    arenaIndex: arenaIndexFor(t, trophies),
    mmr: mmrFor(t, arenaIndexFor(t, trophies)),
    codexLevel: 60,
    codexPoints: 59 * t.quests.codex.pointsPerLevel,
    matchesPlayed: 150,
    conquest: { stars: conquestStars(t, () => 1), milestonesClaimed: [] },
    stats: { ...s.stats, matches: 150, wins: 95, losses: 52, draws: 3, winsByTier: [8, 14, 18, 22, 20, 13], lossesByTier: [2, 5, 9, 12, 14, 10], fastestWinMs: 240_000, futureReached: 20 },
    lastExportAt: now,
  };
  // The road below the current trophies is claimed; the node at them is left to try a claim.
  s = claimRoadUpTo(s, t, trophies - 1);
  s = { ...s, powersOwned: [...t.order.powers] };
  s = beatWarPath(s, t, t.warPath.order.length, () => 3);
  // Every fort, and the Fort slot open with each age's wall in every plan (A16.14.6).
  s = unlockFortSlot({ ...s, fortsOwned: [...t.order.forts] }, t).save;
  s = plans(s, t, PLAN_PRESETS);
  // Two capsules of each tier: a Trophy Road one that shows its tier (top tier first, so the tray
  // shows the best ones), and a Sundial one that climbs from Clay in the opening show. Two crates.
  s = grantCapsules(s, t, now, [...t.capsules.tierOrder].reverse().map((tier) => ({ kind: 'road' as const, tier })));
  s = grantCapsules(s, t, now, t.capsules.tierOrder.map((tier) => ({ kind: 'win' as const, tier })));
  s = grantCrateAt(s, 'road', t, now).save;
  s = grantCrateAt(s, 'road', t, now).save;
  s = {
    ...s,
    capsules: { ...s.capsules, charges: t.capsules.charges.max, chargesUpdatedAt: now, freeCapsulesLeft: 0, clayMeter: 0, dailyBank: 0, dailyNextAt: null },
    pity: { ...s.pity, opened: 120 },
  };
  return finish(s, t, clock);
}

/** Levels by age index for the mid-game commons (Stone 6 ... Cosmic 2). */
const MID_COMMON_LEVEL = [6, 5, 5, 4, 4, 3, 2, 2];

export function midGameSave(c: CompiledContent, clock: LocalClock, seed: number): SaveDoc {
  const t = tables(c);
  const now = clock.now();
  let s = base(t, clock, seed);
  const ageIndex = (id: CardId): number => t.order.ages.indexOf(ageOf(t, id) ?? 'stone');
  const entry = (id: CardId, level: number, share: number, foil: Foil = 'none') => ({
    level,
    copies: Math.floor((copiesFor(t, id, level) * share) / 10),
    isNew: false,
    foil,
  });

  // Starter Commons and Anti-heavy Rares (the new save's), levelled by age.
  const collection: SaveDoc['collection'] = {};
  for (const id of Object.keys(s.collection)) {
    const byAge = MID_COMMON_LEVEL[ageIndex(id)] ?? 2;
    const level = cardRarity(t, id) === 'common' ? byAge : Math.max(1, byAge - 2);
    collection[id] = entry(id, level, 6);
  }
  // From capsules: a first extra Rare of the first five ages, two Epics and one Legendary.
  const pick = (rarity: string, ages: number, n: number) =>
    collectable(t).filter((id) => !collection[id] && cardRarity(t, id) === rarity && ageIndex(id) < ages && t.units[id]?.starter !== true).slice(0, n);
  for (const id of pick('rare', 5, 5)) collection[id] = entry(id, Math.max(1, (MID_COMMON_LEVEL[ageIndex(id)] ?? 2) - 2), 4);
  pick('epic', 2, 2).forEach((id, i) => (collection[id] = entry(id, 2 - i, 3, i === 0 ? 'bronze' : 'none')));
  for (const id of pick('legendary', 1, 1)) collection[id] = entry(id, 1, 0, 'bronze');
  // Two cards ready to upgrade, and a foil or two.
  const first = Object.keys(collection).filter((id) => cardRarity(t, id) === 'common');
  for (const id of first.slice(0, 2)) collection[id] = { ...collection[id]!, copies: copiesFor(t, id, collection[id]!.level), foil: 'silver' };

  const arenaIndex = Math.min(2, t.arenas.list.length - 1);
  const trophies = t.arenas.list[arenaIndex]!.trophies + 160;
  const best = trophies + 50;
  s = {
    ...s,
    createdAt: now - 23 * DAY,
    collection,
    currencies: { amber: 3_450, dust: 820 },
    trophies: { current: trophies, best, roadClaimed: [] },
    arenaIndex: arenaIndexFor(t, best),
    mmr: mmrFor(t, arenaIndexFor(t, best)),
    codexLevel: 18,
    codexPoints: 17 * t.quests.codex.pointsPerLevel + 7,
    matchesPlayed: 96,
    lossStreak: 1,
    conquest: { stars: conquestStars(t, (i) => [3, 2, 1][i] ?? 0), milestonesClaimed: [] },
    stats: { ...s.stats, matches: 96, wins: 58, losses: 35, draws: 3, winsByTier: [10, 16, 18, 14], lossesByTier: [3, 8, 12, 12], fastestWinMs: 312_000, futureReached: 21 },
    lastExportAt: now - 9 * DAY,
  };
  // The road up to the last node below the best trophies; the node at the best is left to claim.
  s = claimRoadUpTo(s, t, best - 1);
  // The Stone region and Bronze L1-L6 beaten, mixed stars; Bronze L7 is next.
  s = beatWarPath(s, t, 16, (i) => [3, 2, 3, 1, 2, 3, 2, 2, 1, 3, 2, 3, 1, 2, 3, 2][i] ?? 1);
  // Best trophies past 400 and Bronze L4 cleared: the Fort slot is open (A16.14.6).
  s = unlockFortSlot(s, t).save;
  s = plans(s, t, 1);
  // Three Sundial Capsules from the bag, a Silver from the road, a few ready on the Sundial.
  s = grantCapsules(s, t, now, [{ kind: 'win' }, { kind: 'win' }, { kind: 'win' }, { kind: 'road', tier: 'silver' }]);
  s = {
    ...s,
    capsules: { ...s.capsules, charges: 5, chargesUpdatedAt: now - 2 * HOUR, freeCapsulesLeft: 0, clayMeter: 1, dailyBank: 0, dailyNextAt: null },
    pity: { ...s.pity, sinceEpic: 6, sinceLegendary: 28, sinceNewCard: 2, opened: 57 },
  };
  return finish(s, t, clock);
}

/** Builds a test profile at the clock's time; `seed` feeds the name and the capsule rolls. */
export function testerSave(kind: TesterProfile, c: CompiledContent, clock: LocalClock, seed: number): SaveDoc {
  return kind === 'everything' ? everythingSave(c, clock, seed) : midGameSave(c, clock, seed);
}
