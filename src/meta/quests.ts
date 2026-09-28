/**
 * Daily quests and the War Chest (DESIGN A6.7, A15.4, A15.5).
 *
 * - **Quest queue.** At each local 04:00, 3 new quests per day passed join the back of a queue of up
 *   to 21. Only the first 3 are active and progress; the rest wait unseen. A claimed quest leaves the
 *   queue and the next one becomes active. The free daily reroll replaces one active quest. Nothing
 *   in the queue expires.
 * - **Weights.** New quests are a weighted draw from the eligible pool (weight 1 for activity quests,
 *   2 for skill and variety quests), no id twice within any 3 neighbours, with an RNG seeded by the
 *   save and the day, so the capsule stream is never touched. Eligible: a Legendary owned for the
 *   Legendary quest; the Last Stand quest from match 5.
 * - **Progress** comes from `MatchStats`. Skirmish counts only for quests marked `skirmishCounts`.
 * - **War Chest** (`QuestState.weekly`, A15.5): filled by counting wins in `warChest.ts`; this module
 *   never resets it.
 */
import type { AgeId, FormatId, MatchResultInput, MatchStats, QuestSlot, Result, RewardStep, SaveDoc } from '@/contracts';
import type { Content, QuestDef, QuestMetric } from '@/content';
import { pickWeighted, seedSfc32 } from '@/core';
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

/**
 * Up to `n` new quest ids for the back of the queue `after`, a weighted draw (A15.4) seeded by the
 * save and `salt`. An id never repeats within any 3 neighbours while the pool allows it.
 */
export function drawQuests(s: SaveDoc, t: Content, n: number, exclude: ReadonlySet<string>, salt: string, after: readonly string[] = []): string[] {
  if (n <= 0) return [];
  const pool = eligibleDaily(s, t);
  if (pool.length === 0) return [];
  const rng = seedSfc32(`quests:${s.createdAt}:${salt}`);
  const out: string[] = [];
  const seq = [...after];
  for (let i = 0; i < n; i += 1) {
    const recent = new Set(seq.slice(-2));
    let options = pool.filter((q) => !exclude.has(q.id) && !recent.has(q.id));
    if (options.length === 0) options = pool.filter((q) => !recent.has(q.id));
    if (options.length === 0) options = pool;
    const q = options[pickWeighted(rng, options.map((x) => Math.max(1, x.weight)))] ?? options[0]!;
    out.push(q.id);
    seq.push(q.id);
  }
  return out;
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

/** The active quests: the front of the queue (A15.4). */
export function activeQuests(s: Pick<SaveDoc, 'quests'>, t: Content): QuestSlot[] {
  return s.quests.daily.slice(0, t.quests.dailyCount);
}

function isDone(t: Content, q: QuestSlot): boolean {
  const def = questDef(t, q.id);
  return !!def && q.progress >= def.target;
}

/**
 * Applies the 04:00 quest arrivals up to `lt` (A15.4): 3 new quests per day passed join the queue,
 * up to `queueMax`. The War Chest is never reset (A15.5).
 */
export function refreshQuests(s: SaveDoc, t: Content, lt: LocalTime): SaveDoc {
  const day = gameDay(lt, t.quests.resetHour);
  const dayKey = dayKeyOf(day);
  let q = s.quests;
  if (q.dayKey !== dayKey) {
    const prev = dayFromKey(q.dayKey);
    const days = prev === null || day <= prev ? 1 : day - prev;
    const kept = q.daily.filter((x) => !x.claimed);
    const room = Math.max(0, t.quests.queueMax - kept.length);
    const add = Math.min(room, t.quests.dailyCount * Math.min(days, t.quests.queueMax));
    const ids = drawQuests(s, t, add, new Set(activeQuests({ quests: { ...q, daily: kept } }, t).map((x) => x.id)), dayKey, kept.map((x) => x.id));
    q = { ...q, daily: [...kept, ...ids.map(fresh)], rerollUsed: false, dayKey };
  }
  if (q.weekly.id !== t.quests.weekly.id) q = { ...q, weekly: fresh(t.quests.weekly.id) };
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
    case 'countingWins':
      return 0;
  }
}

/** Adds progress to the active quests; returns the reward-screen steps for the quests that moved. */
export function addQuestProgress(
  s: SaveDoc,
  t: Content,
  amountFor: (def: QuestDef) => number,
): { save: SaveDoc; steps: RewardStep[] } {
  const steps: RewardStep[] = [];
  const active = t.quests.dailyCount;
  const bump = (q: QuestSlot, i: number): QuestSlot => {
    if (i >= active) return q;
    const def = questDef(t, q.id);
    if (!def || q.claimed || q.progress >= def.target) return q;
    const add = Math.max(0, Math.trunc(amountFor(def)));
    if (add === 0) return q;
    const progress = Math.min(def.target, q.progress + add);
    steps.push({ kind: 'quest', questId: q.id, progress, done: progress >= def.target });
    return { ...q, progress };
  };
  const daily = s.quests.daily.map(bump);
  if (steps.length === 0) return { save: s, steps };
  return { save: { ...s, quests: { ...s.quests, daily } }, steps };
}

/** Counts one upgrade for "Upgrade 2 cards" (A6.7). */
export function countUpgrade(s: SaveDoc, t: Content): SaveDoc {
  return addQuestProgress(s, t, (d) => (d.metric === 'upgrades' ? 1 : 0)).save;
}

/**
 * Claims a finished active quest (queue index). The quest leaves the queue and the next one becomes
 * active (A15.4). An Age Capsule reward uses `o.age`, the age the player picked (A6.4). The War Chest
 * grants itself (A15.5), so `'weekly'` is only claimable for an old save whose chest is full.
 */
export function claimQuest(
  s: SaveDoc,
  slot: number | 'weekly',
  t: Content,
  now: number,
  o: { age?: AgeId } = {},
): Result<SaveDoc> {
  if (typeof slot === 'number' && slot >= t.quests.dailyCount) return { ok: false, reason: 'notActive' };
  const q = slot === 'weekly' ? s.quests.weekly : s.quests.daily[slot];
  if (!q) return { ok: false, reason: 'noQuest' };
  const def = questDef(t, q.id);
  if (!def) return { ok: false, reason: 'noQuest' };
  if (q.claimed) return { ok: false, reason: 'claimed' };
  if (q.progress < def.target) return { ok: false, reason: 'notDone' };
  let save: SaveDoc = {
    ...s,
    quests:
      slot === 'weekly'
        ? { ...s.quests, weekly: fresh(q.id) }
        : { ...s.quests, daily: s.quests.daily.filter((_, i) => i !== slot) },
  };
  for (const r of def.rewards) {
    if (r.kind === 'amber') save = { ...save, currencies: { ...save.currencies, amber: save.currencies.amber + r.amount } };
    else if (r.kind === 'dust') save = { ...save, currencies: { ...save.currencies, dust: save.currencies.dust + r.amount } };
    else if (r.kind === 'ageCapsule') save = grantCapsuleAt(save, 'age', t, now, o.age ? { age: o.age } : {}).save;
    else save = grantCrateAt(save, 'weekly', t, now).save;
  }
  return { ok: true, value: save };
}

/** The free daily reroll (A6.7): replaces an active, unfinished quest with another one. */
export function rerollQuest(s: SaveDoc, slot: number, t: Content): Result<SaveDoc> {
  if (slot >= t.quests.dailyCount) return { ok: false, reason: 'notActive' };
  const q = s.quests.daily[slot];
  if (!q) return { ok: false, reason: 'noQuest' };
  if (s.quests.rerollUsed) return { ok: false, reason: 'rerollUsed' };
  if (q.claimed || isDone(t, q)) return { ok: false, reason: 'done' };
  const active = activeQuests(s, t).map((x) => x.id);
  const pool = eligibleDaily(s, t).filter((d) => !active.includes(d.id));
  if (pool.length === 0) return { ok: false, reason: 'noOtherQuest' };
  const [id] = drawQuests(s, t, 1, new Set(active), `${s.quests.dayKey}:reroll:${slot}`, active);
  if (!id || active.includes(id)) return { ok: false, reason: 'noOtherQuest' };
  const daily = s.quests.daily.map((x, i) => (i === slot ? fresh(id) : x));
  return { ok: true, value: { ...s, quests: { ...s.quests, daily, rerollUsed: true } } };
}
