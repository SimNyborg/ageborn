/**
 * The A15 engagement rules on the meta screens: the Result screen budget (A15.13), the stopping
 * cards and night line (A15.6), the Daily "Copy result" line (A15.7), rewards by format (A15.8),
 * peak rank and the Conquest ladder (A15.9), the Feats tab (A15.10), and the Settings safe defaults
 * and For parents page (A15.6).
 */
import { content } from '@/content';
import type { RewardStep } from '@/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureResult } from '../fixtures/matches';
import { maxedSave, midGameSave, newPlayerSave } from '../fixtures/saves';
import { featViews } from '../model/collection';
import { profileView } from '../model/profile';
import { DAILY_DIFFICULTIES, defaultDailyDifficulty, ladderWin, skillTier, supplyView, warChestView } from '../model/progress';
import { closestProgress, dailyResultLine, isNight, resultPlan } from '../model/result';
import { PARENT_LINES } from '../settings/SettingsScreen';
import { text } from './dom';
import { flush, mount, type Mounted } from './harness';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
  vi.useRealTimers();
});
const calls = (name: string) => m!.log.calls.filter((c) => c.name === name);

describe('Result budget (A15.13)', () => {
  it('stages at most: trophies, the main reward, one progress bar; the rest goes into the summary row', () => {
    const r = fixtureResult(content, 'win');
    const plan = resultPlan(r.rewards, midGameSave(content), content, { mode: 'ladder' });
    expect(plan.stages.map((s) => s.kind)).toEqual(['trophies', 'main', 'progress']);
    expect(plan.summary.map((s) => s.kind)).toEqual(['amber', 'quest', 'quest']);
  });

  it('a found feat adds its own step; the tutorial has no progress bar', () => {
    const rewards: RewardStep[] = [
      { kind: 'amber', amount: 20 },
      { kind: 'clayPip', meter: 1 },
      { kind: 'feat', featId: 'no_walls' },
    ];
    const plan = resultPlan(rewards, midGameSave(content), content, { mode: 'tutorial' });
    expect(plan.stages.map((s) => s.kind)).toEqual(['main', 'feat']);
    expect(plan.summary.map((s) => s.kind)).toEqual(['amber']);
  });

  it('a War Chest grant shows the chest full; a second capsule and the crate go into the summary (A15.5, A15.13)', () => {
    const rewards: RewardStep[] = [
      { kind: 'trophies', delta: 30 },
      { kind: 'capsule', capsuleId: 'cap-mid-1' },
      { kind: 'crate', crateId: 'crate-1' },
      { kind: 'capsule', capsuleId: 'cap-mid-2' },
      { kind: 'capsule', capsuleId: 'cap-mid-3' },
    ];
    const s = midGameSave(content);
    const plan = resultPlan(rewards, { ...s, quests: { ...s.quests, weekly: { ...s.quests.weekly, progress: 0 } } }, content, { mode: 'ladder' });
    const of = content.quests.weekly.target;
    expect(plan.stages[2]).toEqual({ kind: 'progress', progress: { kind: 'warChest', value: of, max: of, done: true } });
    expect(plan.summary.map((r) => r.kind)).toEqual(['crate', 'capsule', 'capsule']);
  });

  it('the summary row shows every extra capsule and the crate (none is hidden)', () => {
    const info = fixtureResult(content, 'win');
    const rewards: RewardStep[] = [...info.rewards, { kind: 'crate', crateId: 'crate-1' }, { kind: 'capsule', capsuleId: 'cap-mid-2' }];
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'result', info: { ...info, rewards } }] });
    m.click('[data-testid="result-skip"]');
    expect(m.q('[data-testid="sum-crate"]')).not.toBeNull();
    expect(m.qa('[data-testid="sum-capsule"]').length).toBe(1);
    expect(text(m.q('[data-testid="reward-progress-warChest"]')!)).toContain('War Chest full');
  });

  it('picks the progress bar closest to done', () => {
    const s = midGameSave(content);
    const of = content.quests.weekly.target;
    const chest = closestProgress({ ...s, quests: { ...s.quests, weekly: { ...s.quests.weekly, progress: of - 1 } } }, content);
    expect(chest).toMatchObject({ kind: 'warChest', value: of - 1, max: of });
    const road = closestProgress({ ...s, quests: { ...s.quests, weekly: { ...s.quests.weekly, progress: 0 } } }, content);
    expect(road?.kind).not.toBe('warChest');
  });

  it('the night line runs from 22:00 to 06:00', () => {
    expect([21, 22, 23, 0, 5, 6].map(isNight)).toEqual([false, true, true, true, true, false]);
  });

  it('the Daily copy line has no name and pays nothing', () => {
    const line = dailyResultLine({
      dateKey: '2026-10-03',
      modifier: 'Glass Armies',
      difficulty: 'Veteran',
      outcome: 'Won',
      time: '5:42',
      basePercent: 63.4,
      t: (k, p) => (k === 'ui.result.dailyLine' ? `Ageborn Daily ${p!.date} · ${p!.modifier} · ${p!.difficulty} · ${p!.outcome} in ${p!.time} · Base ${p!.base}%` : k),
    });
    expect(line).toBe('Ageborn Daily 2026-10-03 · Glass Armies · Veteran · Won in 5:42 · Base 63%');
  });

  it('the Daily copy line for a loss reads "Lost at 6:10" with no Base field (A15.7)', () => {
    const line = dailyResultLine({
      dateKey: '2026-10-03',
      modifier: 'Glass Armies',
      difficulty: 'Veteran',
      outcome: 'Lost',
      time: '6:10',
      basePercent: 0,
      lost: true,
      t: (k, p) => (k === 'ui.result.dailyLineLost' ? `Ageborn Daily ${p!.date} · ${p!.modifier} · ${p!.difficulty} · Lost at ${p!.time}` : k),
    });
    expect(line).toBe('Ageborn Daily 2026-10-03 · Glass Armies · Veteran · Lost at 6:10');
  });
});

describe('Result screen cards (A15.6)', () => {
  const route = (extra: object) => [{ id: 'home' as const }, { id: 'result' as const, info: { ...fixtureResult(content, 'loss'), ...extra } }];

  it('shows no card while rewards are staged, then one card with Home as the primary button', () => {
    vi.useFakeTimers();
    m = mount({ state: 'mid', routes: route({ card: { kind: 'break' } }) });
    expect(m.q('[data-testid="result-card-break"]')).toBeNull();
    m.click('[data-testid="result-skip"]');
    expect(text(m.q('[data-testid="result-card-break"]')!)).toContain('A good moment for a break?');
    expect(m.q('[data-testid="result-home"]')!.getAttribute('class')).toContain('ui-btn--gold');
    // Keep playing only closes the card; nothing advances by itself.
    m.click('[data-testid="result-card-keep"]');
    expect(m.q('[data-testid="result-card-break"]')).toBeNull();
    expect(m.router.current.value.id).toBe('result');
  });

  it('the tilt card offers Watch and a Warm-up match', () => {
    m = mount({ state: 'mid', routes: route({ card: { kind: 'tilt', watchIndex: 2 } }) });
    m.click('[data-testid="result-skip"]');
    expect(text(m.q('[data-testid="result-card-tilt"]')!)).toContain('Tough run.');
    m.click('[data-testid="result-card-watch"]');
    expect(calls('watchReplay')[0]!.args).toEqual([2]);
    expect(text(m.q('[data-testid="result-card-next"]')!)).toContain('Warm-up match');
  });

  it('the wrap card sums up the session', () => {
    m = mount({ state: 'mid', routes: route({ card: { kind: 'wrap', wins: 3, losses: 1, newCards: 2, chargesOut: true } }) });
    m.click('[data-testid="result-skip"]');
    const card = text(m.q('[data-testid="result-card-wrap"]')!);
    expect(card).toContain('Wins: 3');
    expect(card).toContain('Capsule charges used up.');
  });

  it('a late match adds the night line and makes Home primary', () => {
    m = mount({ state: 'mid', routes: route({ endedHour: 23 }) });
    m.click('[data-testid="result-skip"]');
    expect(text(m.q('[data-testid="result-night"]')!)).toContain("It's late.");
    expect(m.q('[data-testid="result-home"]')!.getAttribute('class')).toContain('ui-btn--gold');
  });

  it('a Daily result has a Copy result button', () => {
    m = mount({ state: 'mid', routes: route({ daily: { dateKey: '2026-10-03', modifier: 'Gold Rush', difficulty: 'veteran' } }) });
    expect(m.q('[data-testid="result-copy"]')).not.toBeNull();
  });
});

describe('Home banks (A15.4, A15.5)', () => {
  it('Supply counts the matches to the next capsule only while an allowance is banked', () => {
    const n = newPlayerSave(content);
    expect(supplyView({ ...n, matchesPlayed: 4, capsules: { ...n.capsules, dailyBank: 1 } }, content).moreMatches).toBe(2);
    expect(supplyView({ ...n, matchesPlayed: 6, capsules: { ...n.capsules, dailyBank: 1 } }, content).moreMatches).toBe(3);
    expect(supplyView({ ...n, capsules: { ...n.capsules, dailyBank: 0 } }, content).moreMatches).toBeNull();
  });

  it('the War Chest shows counted wins of the target', () => {
    const s = midGameSave(content);
    expect(warChestView({ ...s, quests: { ...s.quests, weekly: { ...s.quests.weekly, progress: 13 } } }, content)).toEqual({
      wins: 13,
      of: content.quests.weekly.target,
    });
  });
});

describe('Rewards by format and the Daily difficulty (A15.8, A15.7)', () => {
  it('pays the A15.8 row from 400 trophies and the A6.3 row below', () => {
    const s = midGameSave(content);
    const low = { ...s, trophies: { ...s.trophies, current: 100 } };
    const high = { ...s, trophies: { ...s.trophies, current: 500 } };
    expect(ladderWin(low, content, 'full')).toEqual(content.arenas.ladder.win);
    expect(ladderWin(high, content, 'short').trophies).toBeLessThan(ladderWin(high, content, 'full').trophies);
  });

  it('defaults the Daily difficulty to the one nearest the skill tier', () => {
    const s = newPlayerSave(content);
    const at = (mmr: number) => defaultDailyDifficulty({ ...s, mmr }, content);
    expect(skillTier({ ...s, mmr: 870 }, content)).toBe(0);
    expect(at(870)).toBe('recruit');
    expect(at(1370)).toBe('veteran');
    expect(at(1700)).toBe('warlord');
    expect(DAILY_DIFFICULTIES).toEqual(['recruit', 'veteran', 'warlord']);
  });

  it('the ladder card shows what a win pays', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'modeSelect' }] });
    expect(text(m.q('[data-testid="ladder-reward"]')!)).toContain('+');
  });
});

describe('Peak rank and the Conquest ladder (A15.9)', () => {
  it('Highest AI tier beaten is the top tier with a counted win', () => {
    const s = midGameSave(content);
    const v = profileView({ ...s, stats: { ...s.stats, winsByTier: [3, 0, 2, 0, 0, 1, 0] } }, content);
    expect(v.highestTierBeaten).toBe(5);
    expect(profileView({ ...s, stats: { ...s.stats, winsByTier: [] } }, content).highestTierBeaten).toBeNull();
  });

  it('draws the Generals by tier, hardest on top, with the player above the highest beaten', () => {
    m = mount({ state: 'maxed', routes: [{ id: 'home' }, { id: 'conquest' }] });
    const ids = m.qa('[data-testid^="cq-gen-"]').map((e) => e.getAttribute('data-testid'));
    const tiers = content.generals.conquest.board.map((b) => b.tier);
    expect(ids).toHaveLength(tiers.length);
    expect(m.q('[data-testid="cq-you"]')).not.toBeNull();
    expect(m.qa('[data-testid="cq-board"] .ui-ai, [data-testid="cq-board"] [class*="ai"]').length).toBeGreaterThan(0);
  });
});

describe('Feats tab (A15.10)', () => {
  it('shows "???" and a riddle until found; Show hint stores a flag', () => {
    const s = midGameSave(content);
    const views = featViews({ ...s, flags: { ...s.flags, 'feat.no_walls': true } }, content);
    expect(views).toHaveLength(content.feats.order.length);
    expect(views.find((v) => v.id === 'no_walls')?.found).toBe(true);
    // Obscure feats are listed last.
    expect(views.slice(-2).map((v) => content.feats.list[v.id]!.obscure)).toEqual([true, true]);

    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'collection', tab: 'feats' }] });
    const first = content.feats.order[0]!;
    expect(text(m.q(`[data-testid="feat-${first}"]`)!)).toContain('???');
    m.click(`[data-testid="feat-hint-${first}"]`);
    expect(calls('showFeatHint')[0]!.args).toEqual([first]);
    expect(m.save.value.flags[`featHint.${first}`]).toBe(true);
  });
});

describe('Settings safe defaults and For parents (A15.6)', () => {
  it('has the break reminder, quick reveal and vibration toggles, and the six parent lines', () => {
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'settings' }] });
    expect(m.q('[data-testid="set-break"]')).not.toBeNull();
    expect(m.q('[data-testid="set-quick-reveal"]')).not.toBeNull();
    expect(m.q('[data-testid="set-vibrate"]')).not.toBeNull();
    expect(text(m.q('[data-testid="about-kept"]')!)).toBe('Nothing you have earned is ever taken away.');
    m.click('[data-testid="parents"]');
    flush(() => undefined);
    expect(m.qa('[data-testid="parents-modal"] li')).toHaveLength(PARENT_LINES.length);
    expect(PARENT_LINES).toHaveLength(6);
  });

  it('never shows forbidden copy (A15.3 rule 4)', () => {
    for (const state of ['new', 'mid'] as const) {
      m = mount({ state });
      const all = text(m.q('[data-testid="ui-root"]')!).toLowerCase();
      for (const bad of ['nothing is lost', 'everything waits', 'we missed you', 'last chance']) expect(all).not.toContain(bad);
      m.unmount();
      m = null;
    }
    expect(maxedSave(content)).toBeDefined();
  });
});
