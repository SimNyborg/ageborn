/**
 * Daily and weekly quests (DESIGN A6.7, C5 #26, #35).
 */
import { describe, expect, it } from 'vitest';
import type { QuestSlot, SaveDoc } from '@/contracts';
import { drawQuests, eligibleDaily, matchProgress, questDef, type QuestMatchFacts } from '../quests';
import { C, DAY, M, TestClock, T0, fresh, lastPending, ownsAll, play, scripted, stats } from './helpers';

function withQuests(s: SaveDoc, ids: string[], progress = 0): SaveDoc {
  return { ...s, quests: { ...s.quests, daily: ids.map((id): QuestSlot => ({ id, progress, claimed: false })) } };
}

function facts(o: Partial<QuestMatchFacts> = {}): QuestMatchFacts {
  return {
    mode: 'ladder',
    win: true,
    format: 'short',
    outcome: { winner: 0, reason: 'baseDestroyed', tick: 5000, baseHpBp: [5000, 0] },
    stats: stats(),
    legendaryInPlan: false,
    ...o,
  };
}

function def(id: string) {
  const d = questDef(C, id);
  if (!d) throw new Error(id);
  return d;
}

describe('quest progress from MatchStats (A6.7)', () => {
  it('each metric reads the right fact', () => {
    expect(matchProgress(def('win_2'), facts())).toBe(1);
    expect(matchProgress(def('win_2'), facts({ win: false }))).toBe(0);
    expect(matchProgress(def('play_3'), facts({ win: false }))).toBe(1);
    expect(matchProgress(def('train_30'), facts({ stats: stats({ trained: 17 }) }))).toBe(17);
    expect(matchProgress(def('evolve_6'), facts({ stats: stats({ evolves: 3 }) }))).toBe(3);
    expect(matchProgress(def('fast_final_age'), facts({ format: 'short', stats: stats({ reachedFinalAgeAtMs: 179_999 }) }))).toBe(1);
    expect(matchProgress(def('fast_final_age'), facts({ format: 'short', stats: stats({ reachedFinalAgeAtMs: 180_000 }) }))).toBe(0);
    expect(matchProgress(def('fast_final_age'), facts({ format: 'full', stats: stats({ reachedFinalAgeAtMs: 689_000 }) }))).toBe(1);
    expect(matchProgress(def('turret_kills_20'), facts({ stats: stats({ turretKills: 6 }) }))).toBe(6);
    expect(matchProgress(def('win_no_treasury'), facts({ stats: stats({ usedTreasury: false }) }))).toBe(1);
    expect(matchProgress(def('win_no_treasury'), facts({ stats: stats({ usedTreasury: true }) }))).toBe(0);
    expect(matchProgress(def('power_hits_5'), facts({ stats: stats({ powerMaxHits: 5 }) }))).toBe(1);
    expect(matchProgress(def('power_hits_5'), facts({ stats: stats({ powerMaxHits: 4 }) }))).toBe(0);
    expect(matchProgress(def('base_damage_15000'), facts({ stats: stats({ baseDamage: 4321 }) }))).toBe(4321);
    expect(matchProgress(def('aa_heavy_kills_5'), facts({ stats: stats({ heavyKillsByAA: 2 }) }))).toBe(2);
    expect(matchProgress(def('win_with_legendary'), facts({ legendaryInPlan: true }))).toBe(1);
    expect(matchProgress(def('win_with_legendary'), facts({ legendaryInPlan: false }))).toBe(0);
    expect(matchProgress(def('fast_base_kill'), facts({ stats: stats({ durationMs: 359_000 }) }))).toBe(1);
    expect(matchProgress(def('fast_base_kill'), facts({ stats: stats({ durationMs: 359_000 }), outcome: { winner: 0, reason: 'finalBell', tick: 1, baseHpBp: [1, 0] } }))).toBe(0);
    expect(matchProgress(def('win_after_last_stand'), facts({ stats: stats({ usedLastStand: true }) }))).toBe(1);
    expect(matchProgress(def('upgrade_2'), facts())).toBe(0);
    expect(matchProgress(def('daily_challenge_win'), facts({ mode: 'daily' }))).toBe(1);
    expect(matchProgress(def('daily_challenge_win'), facts({ mode: 'ladder' }))).toBe(0);
  });

  it('Skirmish counts only for "Play 3 battles" and "Train 30 units" (C5 #35)', () => {
    const sk = facts({ mode: 'skirmish', stats: stats({ trained: 12 }) });
    expect(matchProgress(def('play_3'), sk)).toBe(1);
    expect(matchProgress(def('train_30'), sk)).toBe(12);
    expect(matchProgress(def('win_2'), sk)).toBe(0);
    expect(matchProgress(C.quests.weekly, sk)).toBe(0);
  });

  it('matches move open quests, cap at the target and report steps', () => {
    const s = withQuests(scripted(), ['win_2', 'train_30', 'evolve_6']);
    const r = play(s, 'ladder', 'win', new TestClock(), { stats: { trained: 40, evolves: 1 } });
    expect(r.rewards).toContainEqual({ kind: 'quest', questId: 'win_2', progress: 1, done: false });
    expect(r.rewards).toContainEqual({ kind: 'quest', questId: 'train_30', progress: 30, done: true });
    expect(r.save.quests.daily.map((q) => q.progress)).toEqual([1, 30, 1]);
  });

  it('only the first 3 quests of the queue progress (A15.4)', () => {
    const s = withQuests(scripted(), ['win_2', 'train_30', 'evolve_6', 'play_3', 'win_no_treasury']);
    const r = play(s, 'ladder', 'win', new TestClock(), { stats: { trained: 5, evolves: 1 } });
    expect(r.save.quests.daily.map((q) => q.progress)).toEqual([1, 5, 1, 0, 0]);
    expect(r.rewards.filter((x) => x.kind === 'quest' && x.questId === 'play_3')).toEqual([]);
  });
});

describe('quest lists (A6.7)', () => {
  it('a new save has 3 distinct eligible quests and the weekly', () => {
    const s = fresh();
    expect(s.quests.daily).toHaveLength(3);
    expect(new Set(s.quests.daily.map((q) => q.id)).size).toBe(3);
    const ok = new Set(eligibleDaily(s, C).map((q) => q.id));
    for (const q of s.quests.daily) expect(ok.has(q.id)).toBe(true);
    expect(s.quests.daily.some((q) => q.id === 'win_with_legendary' || q.id === 'win_after_last_stand')).toBe(false);
    expect(s.quests.weekly).toEqual({ id: 'war_chest', progress: 0, claimed: false });
  });

  it('draws skill quests about twice as often as activity quests (A15.4 weights)', () => {
    const s = { ...fresh(), matchesPlayed: 10 };
    const counts = new Map<string, number>();
    for (let i = 0; i < 400; i += 1) {
      for (const id of drawQuests(s, C, 3, new Set(), `w${i}`)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const light = ['play_3', 'train_30', 'upgrade_2'].reduce((n, id) => n + (counts.get(id) ?? 0), 0) / 3;
    const heavyIds = eligibleDaily(s, C).filter((q) => q.weight === 2).map((q) => q.id);
    const heavy = heavyIds.reduce((n, id) => n + (counts.get(id) ?? 0), 0) / heavyIds.length;
    expect(heavy / light).toBeGreaterThan(1.5);
    expect(heavy / light).toBeLessThan(2.6);
  });

  it('the Legendary quest needs a Legendary; the Last Stand quest waits for match 5', () => {
    const s = fresh();
    expect(eligibleDaily(s, C).map((q) => q.id)).not.toContain('win_with_legendary');
    expect(eligibleDaily(ownsAll(s), C).map((q) => q.id)).toContain('win_with_legendary');
    expect(eligibleDaily({ ...s, matchesPlayed: 3 }, C).map((q) => q.id)).not.toContain('win_after_last_stand');
    expect(eligibleDaily({ ...s, matchesPlayed: 4 }, C).map((q) => q.id)).toContain('win_after_last_stand');
  });

  it('at 04:00 3 new quests join a queue of up to 21; the first 3 stay active (A15.4)', () => {
    const c = new TestClock(T0);
    let s = fresh(1, c);
    const first = s.quests.daily.map((q) => q.id);
    c.t = Date.UTC(2026, 2, 3, 3, 59);
    expect(M.tickTimers(s, c).quests.daily.map((q) => q.id)).toEqual(first);
    c.t = Date.UTC(2026, 2, 3, 4, 0);
    s = M.tickTimers(s, c);
    expect(s.quests.dayKey).toBe('2026-03-03');
    expect(s.quests.daily).toHaveLength(6);
    expect(s.quests.daily.slice(0, 3).map((q) => q.id)).toEqual(first);
    c.advance(DAY);
    expect(M.tickTimers(s, c).quests.daily).toHaveLength(9);
    // A 30-day absence fills the queue to 21 and stops there.
    c.advance(30 * DAY);
    const full = M.tickTimers(s, c);
    expect(full.quests.daily).toHaveLength(21);
    expect(full.quests.daily.slice(0, 3).map((q) => q.id)).toEqual(first);
    // No id twice among any 3 neighbours.
    const ids = full.quests.daily.map((q) => q.id);
    for (let i = 2; i < ids.length; i += 1) expect(new Set(ids.slice(i - 2, i + 1)).size).toBe(3);
  });

  it('one free reroll per day (C5 #35)', () => {
    const c = new TestClock(T0);
    const s = fresh(1, c);
    const r = M.rerollQuest(s, 1, C);
    if (!r.ok) throw new Error(r.reason);
    expect(r.value.quests.daily[1]?.id).not.toBe(s.quests.daily[1]?.id);
    expect(r.value.quests.daily.map((q) => q.id).filter((id) => id === r.value.quests.daily[1]?.id)).toHaveLength(1);
    expect(M.rerollQuest(r.value, 0, C)).toEqual({ ok: false, reason: 'rerollUsed' });
    c.advance(DAY);
    expect(M.rerollQuest(M.tickTimers(r.value, c), 0, C).ok).toBe(true);
    const done = withQuests(s, ['win_2'], 2);
    expect(M.rerollQuest(done, 0, C)).toEqual({ ok: false, reason: 'done' });
  });

  it('claiming pays once and moves the next quest up; the Age Capsule reward uses the picked age', () => {
    const c = new TestClock(T0);
    const s = withQuests(scripted(1, 0, c), ['win_2', 'daily_challenge_win', 'train_30', 'evolve_6']);
    expect(M.claimQuest(s, 0, C, c)).toEqual({ ok: false, reason: 'notDone' });
    const done = { ...s, quests: { ...s.quests, daily: s.quests.daily.map((q) => ({ ...q, progress: 99 })) } };
    expect(M.claimQuest(done, 3, C, c)).toEqual({ ok: false, reason: 'notActive' });
    const a = M.claimQuest(done, 0, C, c);
    if (!a.ok) throw new Error(a.reason);
    expect(a.value.currencies.amber).toBe(done.currencies.amber + 100);
    expect(a.value.quests.daily.map((q) => q.id)).toEqual(['daily_challenge_win', 'train_30', 'evolve_6']);
    const b = M.claimQuest(a.value, 0, C, c, { age: 'medieval' });
    if (!b.ok) throw new Error(b.reason);
    const cap = lastPending(b.value);
    expect(cap).toMatchObject({ kind: 'age', age: 'medieval', tier: 'silver' });
    for (const st of cap.contents.stacks) expect((C.units[st.card] ?? C.turrets[st.card])?.age).toBe('medieval');
    expect(cap.contents.stacks.some((x) => x.rarity === 'epic')).toBe(true);
  });

  it('tickTimers never resets the War Chest (A15.5)', () => {
    const c = new TestClock(T0);
    const s = scripted(1, 0, c);
    const some = { ...s, quests: { ...s.quests, weekly: { ...s.quests.weekly, progress: 13 } } };
    c.advance(60 * DAY);
    expect(M.tickTimers(some, c).quests.weekly).toEqual({ id: 'war_chest', progress: 13, claimed: false });
  });
});
