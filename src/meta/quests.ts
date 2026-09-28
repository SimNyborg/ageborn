/**
 * Daily and weekly quests (DESIGN A6.7).
 *
 * - 3 daily quests per day with 1 free reroll; unclaimed quests bank up to 6. At each local 04:00
 *   reset, claimed quests leave the list and up to 3 new ones per day passed join it (never more
 *   than 6 unclaimed). Nothing unclaimed expires.
 * - The weekly quest ("Win 15 battles") resets each ISO week (Monday 04:00); a finished, unclaimed
 *   weekly waits until it is claimed.
 * - Progress comes from `MatchStats`. Skirmish matches count only for quests marked
 *   `skirmishCounts` ("Play 3 battles", "Train 30 units"). "Upgrade 2 cards" counts upgrades.
 * - New quests are drawn from the eligible pool (a Legendary owned for the Legendary quest; the
 *   Last Stand quest from match 5), distinct from the ones in the list, with an RNG seeded by the
 *   save and the day, so the capsule stream is never touched.
 */
import type { AgeId, FormatId, MatchResultInput, MatchStats, QuestSlot, Result, RewardStep, SaveDoc } from '@/contracts';
import type { Content, QuestDef, QuestMetric } from '@/content';
import { seedSfc32, shuffle } from '@/core';
import { grantCapsuleAt } from './capsules/grant';
import { grantCrateAt } from './capsules/wardrobe';
import { isOwned } from './tables';
import { dayFromKey, dayKeyOf, gameDay, weekKeyOf, type LocalTime } from './time';

export function questDef(t: Content, id: string): QuestDef | null {
  if (t.quests.weekly.id === id) return t.quests.weekly;
  return t.quests.daily.find((q) => q.id === id) ?? null;
}

function ownsLegendary(s: SaveDoc, t: Content): boolean {
  return Object.keys(s.collection).some((id) => t.units[id]?.rarity === 'legendary' && isOwned(s, id));
}

/** Daily quests that may be offered to this save now (A6.7 conditions). */
export function eligibleDaily(s: SaveDoc, t: Content): QuestDef[] {
  const legendary = ownsLegendary(s, t);
  return t.quests.daily.filter((q) => (!q.requiresLegendary || legendary) && q.fromMatch <= s.matchesPlayed + 1);
}

/** Up to `n` new daily quest ids, distinct from `exclude`, drawn with a seed of the save and `salt`. */
export function drawQuests(s: SaveDoc, t: Content, n: number, exclude: ReadonlySet<string>, salt: string): string[] {
  if (n <= 0) return [];
  const ids = eligibleDaily(s, t)
    .map((q) => q.id)
    .filter((id) => !exclude.has(id));
  return shuffle(seedSfc32(`quests:${s.createdAt}:${salt}`), ids).slice(0, n);
}

const fresh = (id: string): QuestSlot => ({ id, progress: 0, claimed: false });

/** The quest state of a new save on game day `day`. */
export function initialQuests(s: SaveDoc, t: Content, day: number): SaveDoc['quests'] {
  const dayKey = dayKeyOf(day);
  return {
    daily: drawQuests(s, t, t.quests.dailyCount, new Set(), dayKey).map(fresh),
    rerollUsed: false,
    dayKey,
    weekly: fresh(t.quests.weekly.id),
    weekKey: weekKeyOf(day),
  };
}

function isDone(t: Content, q: QuestSlot): boolean {
  const def = questDef(t, q.id);
  return !!def && q.progress >= def.target;
}

/** Applies the daily and weekly resets up to `lt` (A6.7). */
export function refreshQuests(s: SaveDoc, t: Content, lt: LocalTime): SaveDoc {
  const day = gameDay(lt, t.quests.resetHour);
  const dayKey = dayKeyOf(day);
  const weekKey = weekKeyOf(day);
  let q = s.quests;
  if (q.dayKey !== dayKey) {
    const prev = dayFromKey(q.dayKey);
    const days = prev === null || day <= prev ? 1 : day - prev;
    const kept = q.daily.filter((x) => !x.claimed);
    const room = Math.max(0, t.quests.bankMax - kept.length);
    const add = Math.min(room, t.quests.dailyCount * Math.min(days, t.quests.bankMax));
    const ids = drawQuests(s, t, add, new Set(kept.map((x) => x.id)), dayKey);
    q = { ...q, daily: [...kept, ...ids.map(fresh)], rerollUsed: false, dayKey };
  }
  if (q.weekKey !== weekKey && !(isDone(t, q.weekly) && !q.weekly.claimed)) {
    q = { ...q, weekly: fresh(t.quests.weekly.id), weekKey };
  }
  return q === s.quests ? s : { ...s, quests: q };
}

/** What a finished match contributes, for the quest metrics (A6.7). */
export interface QuestMatchFacts {
  mode: MatchResultInput['mode'];
  win: boolean;
  format: FormatId;
  outcome: MatchResultInput['outcome'];
  stats: MatchStats;
  /** The player's War Plan held a Legendary in the ages of this format. */
  legendaryInPlan: boolean;
}

/** Progress a match adds to one quest. */
export function matchProgress(def: QuestDef, f: QuestMatchFacts): number {
  if (f.mode === 'skirmish' && !def.skirmishCounts) return 0;
  const st = f.stats;
  const m: QuestMetric = def.metric;
  switch (m) {
    case 'wins':
      return f.win ? 1 : 0;
    case 'battles':
      return 1;
    case 'unitsTrained':
      return st.trained;
    case 'evolves':
      return st.evolves;
    case 'fastFinalAge': {
      const before = def.beforeMsByFormat?.[f.format];
      return before !== undefined && st.reachedFinalAgeAtMs !== null && st.reachedFinalAgeAtMs < before ? 1 : 0;
    }
    case 'turretKills':
      return st.turretKills;
    case 'winsWithoutTreasury':
      return f.win && !st.usedTreasury ? 1 : 0;
    case 'powerMultiHit':
      return st.powerMaxHits >= (def.minHits ?? 1) ? 1 : 0;
    case 'baseDamage':
      return st.baseDamage;
    case 'heavyKillsByAA':
      return st.heavyKillsByAA;
    case 'winsWithLegendary':
      return f.win && f.legendaryInPlan ? 1 : 0;
    case 'fastBaseKill':
      return f.win && f.outcome.reason === 'baseDestroyed' && st.durationMs < (def.beforeMs ?? 0) ? 1 : 0;
    case 'winsAfterLastStand':
      return f.win && st.usedLastStand ? 1 : 0;
    case 'upgrades':
      return 0;
    case 'dailyChallengeWins':
      return f.mode === 'daily' && f.win ? 1 : 0;
  }
}

/** Adds progress to every open quest; returns the reward-screen steps for the quests that moved. */
export function addQuestProgress(
  s: SaveDoc,
  t: Content,
  amountFor: (def: QuestDef) => number,
): { save: SaveDoc; steps: RewardStep[] } {
  const steps: RewardStep[] = [];
  const bump = (q: QuestSlot): QuestSlot => {
    const def = questDef(t, q.id);
    if (!def || q.claimed || q.progress >= def.target) return q;
    const add = Math.max(0, Math.trunc(amountFor(def)));
    if (add === 0) return q;
    const progress = Math.min(def.target, q.progress + add);
    steps.push({ kind: 'quest', questId: q.id, progress, done: progress >= def.target });
    return { ...q, progress };
  };
  const daily = s.quests.daily.map(bump);
  const weekly = bump(s.quests.weekly);
  if (steps.length === 0) return { save: s, steps };
  return { save: { ...s, quests: { ...s.quests, daily, weekly } }, steps };
}

/** Counts one upgrade for "Upgrade 2 cards" (A6.7). */
export function countUpgrade(s: SaveDoc, t: Content): SaveDoc {
  return addQuestProgress(s, t, (d) => (d.metric === 'upgrades' ? 1 : 0)).save;
}

/**
 * Claims a finished quest (daily slot index or `'weekly'`). An Age Capsule reward uses `o.age`, the
 * age the player picked in the dialog (A6.4), or the default age.
 */
export function claimQuest(
  s: SaveDoc,
  slot: number | 'weekly',
  t: Content,
  now: number,
  o: { age?: AgeId } = {},
): Result<SaveDoc> {
  const q = slot === 'weekly' ? s.quests.weekly : s.quests.daily[slot];
  if (!q) return { ok: false, reason: 'noQuest' };
  const def = questDef(t, q.id);
  if (!def) return { ok: false, reason: 'noQuest' };
  if (q.claimed) return { ok: false, reason: 'claimed' };
  if (q.progress < def.target) return { ok: false, reason: 'notDone' };
  const claimed: QuestSlot = { ...q, claimed: true };
  let save: SaveDoc = {
    ...s,
    quests:
      slot === 'weekly'
        ? { ...s.quests, weekly: claimed }
        : { ...s.quests, daily: s.quests.daily.map((x, i) => (i === slot ? claimed : x)) },
  };
  for (const r of def.rewards) {
    if (r.kind === 'amber') save = { ...save, currencies: { ...save.currencies, amber: save.currencies.amber + r.amount } };
    else if (r.kind === 'dust') save = { ...save, currencies: { ...save.currencies, dust: save.currencies.dust + r.amount } };
    else if (r.kind === 'ageCapsule') save = grantCapsuleAt(save, 'age', t, now, o.age ? { age: o.age } : {}).save;
    // Quest crates use the `weekly` source (the only quest with a crate in v1 is the weekly one).
    else save = grantCrateAt(save, 'weekly', t, now).save;
  }
  return { ok: true, value: save };
}

/** The free daily reroll (A6.7): replaces an open, unfinished quest with another one. */
export function rerollQuest(s: SaveDoc, slot: number, t: Content): Result<SaveDoc> {
  const q = s.quests.daily[slot];
  if (!q) return { ok: false, reason: 'noQuest' };
  if (s.quests.rerollUsed) return { ok: false, reason: 'rerollUsed' };
  if (q.claimed || isDone(t, q)) return { ok: false, reason: 'done' };
  const [id] = drawQuests(s, t, 1, new Set(s.quests.daily.map((x) => x.id)), `${s.quests.dayKey}:reroll:${slot}`);
  if (!id) return { ok: false, reason: 'noOtherQuest' };
  const daily = s.quests.daily.map((x, i) => (i === slot ? fresh(id) : x));
  return { ok: true, value: { ...s, quests: { ...s.quests, daily, rerollUsed: true } } };
}
