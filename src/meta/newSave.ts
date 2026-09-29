/**
 * A fresh profile (DESIGN A3 starter kit, A6.1-A6.3, A5.8, B8).
 *
 * - Owns every Common (3 units and 2 turrets per age) and each age's default Age Power, all at L1;
 *   the starter War Plan as preset A (Arena 1's gate reward).
 * - 12 capsule charges, the first 10 capsules free, an empty Clay meter, a fresh 100-slot bag; the
 *   Daily Capsule unlocks after capsule 2 (A6.3).
 * - An auto-generated editable name ("Chief-4821"), a procedural avatar seed, the Tar Pit banner and
 *   the Recruit title; Codex Level 1; MMR 1,000; today's quests.
 * - All currencies at 0: nothing is sold, everything is earned (A6.2).
 *
 * The seed feeds the capsule RNG stream (`rng.capsule`, B8) and the name; the same seed and clock
 * give the same save.
 */
import type { CompiledContent, SaveDoc, Settings } from '@/contracts';
import { playerName, type Content } from '@/content';
import { fnv1a32, seedSfc32 } from '@/core';
import { zeroPity } from './capsules/pity';
import { initialQuests } from './quests';
import { SAVE_VERSION } from './rules';
import { defaultPower, isCollectable, tables } from './tables';
import { dayKeyOf, gameDay, type LocalTime } from './time';
import { defaultLoadout } from './cosmetics';
import { unlockTitles } from './titles';
import { starterPlan } from './warplan';

/** Default settings of a new profile (A9 #15). */
export function defaultSettings(): Settings {
  return {
    volume: { master: 1, music: 1, sfx: 1, ui: 1 },
    graphics: 'auto',
    reduceMotion: false,
    shake: 1,
    hitstop: true,
    damageNumbers: 'important',
    teamPreset: 'default',
    locale: 'en',
    defaultSpeed: 1,
    vibrate: false,
    mutedEmotes: false,
    breakReminder: true,
    quickReveal: false,
  };
}

/** Every collectable Common unit and turret: the starter collection (A3). */
export function starterCollection(t: Content): SaveDoc['collection'] {
  const out: SaveDoc['collection'] = {};
  for (const id of [...t.order.units, ...t.order.turrets]) {
    const def = t.units[id] ?? t.turrets[id];
    if (def?.rarity === 'common' && isCollectable(t, id)) out[id] = { level: 1, copies: 0, isNew: false, foil: 'none' };
  }
  return out;
}

export function newSaveAt(c: CompiledContent, lt: LocalTime, seed: number): SaveDoc {
  const t = tables(c);
  const now = lt.t;
  const nameRng = seedSfc32(`name:${seed}`);
  const day = gameDay(lt, t.quests.resetHour);
  const d = t.cosmetics.defaults;
  const base: SaveDoc = {
    v: SAVE_VERSION,
    createdAt: now,
    profile: {
      name: playerName(nameRng, t.names),
      avatar: { seed: fnv1a32(`avatar:${seed}`), parts: {} },
      banner: d.banner,
      frame: d.frame,
      title: d.title,
    },
    currencies: { amber: 0, dust: 0 },
    trophies: { current: 0, best: 0, roadClaimed: [] },
    arenaIndex: 0,
    collection: starterCollection(t),
    powersOwned: t.order.ages.map((age) => defaultPower(t, age)),
    skins: { owned: [], equipped: {} },
    cosmetics: { owned: [d.banner], equipped: defaultLoadout(t) },
    warPlans: [starterPlan(t)],
    activePlan: 0,
    capsules: {
      pending: [],
      charges: t.capsules.charges.start,
      chargesUpdatedAt: now,
      freeCapsulesLeft: t.capsules.charges.freeCapsules,
      clayMeter: 0,
      dailyBank: 0,
      dailyNextAt: null,
      bag: [],
      wardrobe: [],
    },
    pity: zeroPity(),
    rng: { capsule: seedSfc32(`capsule:${seed}`), cosmetic: seedSfc32(`cosmetic:${seed}`) },
    scriptStep: 0,
    quests: { daily: [], rerollUsed: false, dayKey: dayKeyOf(day), weekly: { id: t.quests.weekly.id, progress: 0, claimed: false }, weekKey: '' },
    codexPoints: 0,
    codexLevel: 1,
    mmr: t.arenas.ladder.mmr.start,
    lossStreak: 0,
    matchesPlayed: 0,
    daily: { dayKey: dayKeyOf(gameDay(lt, t.dailyModifiers.challenge.resetHour)), bank: 1 },
    conquest: { stars: {}, milestonesClaimed: [] },
    warPath: { path: 'normal', stars: {}, crowns: {}, relics: [], difficulty: 'normal', lossStreak: 0, legacy: false },
    stats: {
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winsByTier: [],
      lossesByTier: [],
      trainedByCard: {},
      fastestWinMs: null,
      futureReached: 0,
    },
    settings: defaultSettings(),
    tutorial: { step: 0, hintsShown: {} },
    lastExportAt: null,
    flags: {},
  };
  const withQuests: SaveDoc = { ...base, quests: initialQuests(base, t, day) };
  return unlockTitles(withQuests, t).save;
}
