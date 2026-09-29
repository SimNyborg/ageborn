/**
 * The War Path (DESIGN A18.7, ui-plan 6.4): content shape, order and unlocks, tiers by difficulty,
 * stars and crowns, first-clear rewards, the onboarding levels, the loss streak and the opponent.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc, WarPathDifficulty } from '@/contracts';
import { BOSS_DISCLOSURE_KEY } from '../matchmaking';
import {
  applyWarPath,
  currentLevelId,
  featureUnlocked,
  levelOpen,
  levelTier,
  nextLevelId,
  starsFor,
  tryEasyDue,
  warPathNodes,
} from '../warPath';
import { C, M, TestClock, fresh, matchInput, stats } from './helpers';

const W = C.warPath;

function withStars(s: SaveDoc, ids: string[], n = 1): SaveDoc {
  const stars = { ...s.warPath.stars };
  for (const id of ids) stars[id] = n;
  return { ...s, warPath: { ...s.warPath, stars } };
}

function playLevel(s: SaveDoc, level: string, res: 'win' | 'loss' | 'draw', difficulty: WarPathDifficulty = 'normal', st: Parameters<typeof stats>[0] = {}) {
  const c = new TestClock();
  const opponent = M.pickOpponent(s, 'warPath', C, c, { warPath: { level, difficulty } });
  const input = { ...matchInput('warPath', res, opponent, { stats: st }), warPath: { level, difficulty } };
  return { ...M.applyMatchResult(s, input, C, c), opponent };
}

describe('War Path content (A18.7.1, A18.7.2)', () => {
  it('has 10 levels in each of the 8 regions, 80 in all, with stable ids and one boss per region', () => {
    expect(W.regions.map((r) => r.age)).toEqual(C.order.ages);
    expect(W.order).toHaveLength(80);
    for (const r of W.regions) {
      expect(r.levels).toEqual(Array.from({ length: 10 }, (_, i) => `wp.${r.age}.l${String(i + 1).padStart(2, '0')}`));
      expect(r.levels.map((id) => W.levels[id]!.role)).toEqual(['intro', 'practice', 'mix', 'feature', 'lieutenant', 'relief', 'ramp', 'puzzle', 'spike', 'boss']);
      const boss = W.levels[r.levels[9]!]!;
      expect(boss.boss).not.toBeNull();
      expect(C.turrets[boss.boss!.extraTurret]?.age).toBe(r.age);
      expect(boss.reward.capsule).not.toBeNull();
      expect(C.units[boss.reward.card!]?.rarity).toBe('epic');
      expect(C.units[W.levels[r.levels[2]!]!.reward.card!]?.rarity).toBe('rare');
    }
  });

  it('every level uses a real window that ends at its region age and is never 5 ages or longer', () => {
    for (const id of W.order) {
      const l = W.levels[id]!;
      const f = C.formats[l.format];
      expect(f, `${id} ${l.format}`).toBeDefined();
      expect(f!.ages[f!.ages.length - 1]).toBe(l.region);
      expect(f!.ages.length).toBeLessThan(5);
      if (l.region === 'stone') expect(f!.ages).toEqual(['stone']);
      expect(C.generals.list[l.general], id).toBeDefined();
      for (const m of l.modifiers) expect(C.dailyModifiers.list[m]).toBeDefined();
    }
    expect(W.levels['wp.bronze.l10']!.format).toBe('w2.stone');
    expect(W.levels['wp.medieval.l10']!.format).toBe('short');
    expect(W.levels['wp.cosmic.l10']!.format).toBe('w4.industrial');
  });

  it('the bosses are the A18.7.6 Generals', () => {
    expect(W.regions.map((r) => W.levels[r.levels[9]!]!.general)).toEqual(['pip', 'kettle', 'moss', 'boomsworth', 'twins', 'rook', 'tempest', 'warden']);
  });
});

describe('order, current level and unlocks', () => {
  it('a new save starts at Stone L1; only the current level is open', () => {
    const s = fresh();
    expect(currentLevelId(s, C)).toBe('wp.stone.l01');
    expect(levelOpen(s, C, 'wp.stone.l01')).toBe(true);
    expect(levelOpen(s, C, 'wp.stone.l02')).toBe(false);
    const nodes = warPathNodes(s, C);
    expect(nodes[0]!.state).toBe('current');
    expect(nodes.slice(1).every((n) => n.state === 'locked')).toBe(true);
  });

  it('beating a level opens the next; beaten levels stay open for replays', () => {
    const s = withStars(fresh(), ['wp.stone.l01', 'wp.stone.l02']);
    expect(currentLevelId(s, C)).toBe('wp.stone.l03');
    expect(levelOpen(s, C, 'wp.stone.l01')).toBe(true);
    expect(levelOpen(s, C, 'wp.stone.l04')).toBe(false);
    expect(M.warPathNodes(s, C).map((n) => n.state).slice(0, 4)).toEqual(['beaten', 'beaten', 'current', 'locked']);
  });

  it('after the whole path Play replays the last level', () => {
    const s = withStars(fresh(), [...W.order]);
    expect(currentLevelId(s, C)).toBeNull();
    expect(nextLevelId(s, C)).toBe('wp.cosmic.l10');
  });

  it('Home features open one per level beaten (ui-plan 2.6); a legacy save keeps all', () => {
    let s = fresh();
    expect(featureUnlocked(s, C, 'army')).toBe(false);
    s = withStars(s, ['wp.stone.l01']);
    expect(featureUnlocked(s, C, 'army')).toBe(true);
    expect(featureUnlocked(s, C, 'capsules')).toBe(false);
    s = withStars(s, ['wp.stone.l02', 'wp.stone.l03']);
    expect(featureUnlocked(s, C, 'modes')).toBe(true);
    expect(featureUnlocked(s, C, 'customize')).toBe(false);
    const legacy = { ...fresh(), warPath: { ...fresh().warPath, legacy: true } };
    expect(featureUnlocked(legacy, C, 'daily')).toBe(true);
  });
});

describe('tiers (A18.6.2)', () => {
  it('region base + level offset + difficulty offset, clamped; Legendary is always X', () => {
    const l1 = W.levels['wp.stone.l01']!;
    expect(levelTier(C, l1, 'easy')).toBe(0);
    expect(levelTier(C, l1, 'normal')).toBe(0);
    const boss = W.levels['wp.cosmic.l10']!;
    expect(levelTier(C, boss, 'normal')).toBe(9);
    expect(levelTier(C, boss, 'expert')).toBe(10);
    expect(levelTier(C, boss, 'legendary')).toBe(10);
    const lt = W.levels['wp.medieval.l05']!;
    expect([levelTier(C, lt, 'easy'), levelTier(C, lt, 'normal'), levelTier(C, lt, 'hard')]).toEqual([1, 3, 4]);
  });
});

describe('stars and crowns (A18.7.4)', () => {
  const l = W.levels['wp.stone.l01']!; // goal: base above 50%
  it('★ a win, ★★ the goal, ★★★ the goal on Hard or harder; nothing for a loss', () => {
    expect(starsFor(C, l, 'normal', false, stats({ ownBaseHpBpAtEnd: 9000 }))).toBe(0);
    expect(starsFor(C, l, 'normal', true, stats({ ownBaseHpBpAtEnd: 4000 }))).toBe(1);
    expect(starsFor(C, l, 'normal', true, stats({ ownBaseHpBpAtEnd: 9000 }))).toBe(2);
    expect(starsFor(C, l, 'hard', true, stats({ ownBaseHpBpAtEnd: 9000 }))).toBe(3);
    expect(starsFor(C, l, 'easy', true, stats({ ownBaseHpBpAtEnd: 9000 }))).toBe(2);
  });

  it('keeps the best stars and crown; new stars are reward steps', () => {
    const s = withStars(fresh(), ['wp.stone.l01', 'wp.stone.l02']);
    const a = applyWarPath(s, C, { level: 'wp.stone.l03', difficulty: 'easy' }, 'win', stats({ usedLastStand: true }), 1);
    expect(a.save.warPath.stars['wp.stone.l03']).toBe(1);
    expect(a.save.warPath.crowns['wp.stone.l03']).toBe(1);
    expect(a.steps.filter((x) => x.kind === 'pathStar')).toEqual([{ kind: 'pathStar', level: 'wp.stone.l03', star: 1 }]);
    const b = applyWarPath(a.save, C, { level: 'wp.stone.l03', difficulty: 'hard' }, 'win', stats({ usedLastStand: false }), 2);
    expect(b.save.warPath.stars['wp.stone.l03']).toBe(3);
    expect(b.save.warPath.crowns['wp.stone.l03']).toBe(3);
    expect(b.steps.filter((x) => x.kind === 'pathStar').map((x) => (x as { star: number }).star)).toEqual([2, 3]);
    const c = applyWarPath(b.save, C, { level: 'wp.stone.l03', difficulty: 'normal' }, 'win', stats({ usedLastStand: true }), 3);
    expect(c.save.warPath.stars['wp.stone.l03']).toBe(3);
    expect(c.save.warPath.crowns['wp.stone.l03']).toBe(3);
    expect(c.steps).toEqual([]);
  });
});

describe('first clear rewards (A18.7.8)', () => {
  it('Amber once; level 3 grants its named Rare as a NEW card', () => {
    const s = withStars(fresh(), ['wp.stone.l01', 'wp.stone.l02']);
    const card = W.levels['wp.stone.l03']!.reward.card!;
    expect(s.collection[card]).toBeUndefined();
    const a = playLevel(s, 'wp.stone.l03', 'win');
    expect(a.rewards).toContainEqual({ kind: 'amber', amount: 40 });
    expect(a.rewards).toContainEqual({ kind: 'card', card, copies: 0 });
    expect(a.save.collection[card]).toMatchObject({ level: 1, isNew: true });
    const again = playLevel(a.save, 'wp.stone.l03', 'win');
    expect(again.rewards.some((x) => x.kind === 'card' || (x.kind === 'amber' && x.amount === 40))).toBe(false);
  });

  it('a boss pays 60 Amber, its fixed capsule and its Epic; the boss base is disclosed', () => {
    const ids = W.regions[0]!.levels.slice(0, 9);
    const s = withStars(fresh(), ids);
    const a = playLevel(s, 'wp.stone.l10', 'win');
    expect(a.rewards).toContainEqual({ kind: 'amber', amount: 60 });
    const cap = a.save.capsules.pending.find((p) => p.kind === 'warPath');
    expect(cap?.tier).toBe(W.levels['wp.stone.l10']!.reward.capsule);
    expect(a.opponent.side.sideMods).toEqual({ baseHpBp: 5000, extraTurret: 'rock_tosser' });
    expect(a.opponent.disclosures).toContain(BOSS_DISCLOSURE_KEY);
    expect(currentLevelId(a.save, C)).toBe('wp.bronze.l01');
  });

  it('a level that is not open pays nothing', () => {
    const s = fresh();
    const a = applyWarPath(s, C, { level: 'wp.stone.l05', difficulty: 'normal' }, 'win', stats(), 1);
    expect(a.save).toBe(s);
    expect(a.steps).toEqual([]);
  });
});

describe('opponents', () => {
  it('uses the level General, window, modifiers and tier for the difficulty; never the Rookie bonus', () => {
    const s = withStars(fresh(), W.regions[0]!.levels.slice(0, 5));
    const o = M.pickOpponent(s, 'warPath', C, new TestClock(), { warPath: { level: 'wp.stone.l06', difficulty: 'normal' } });
    const l = W.levels['wp.stone.l06']!;
    expect(o.generalId).toBe(l.general);
    expect(o.format).toBe(l.format);
    expect(o.modifiers).toEqual(l.modifiers);
    expect(o.tier).toBe(levelTier(C, l, 'normal'));
    expect(o.isAI).toBe(true);
    expect(o.disclosures).not.toContain('app.disclosure.rookie');
    const hard = M.pickOpponent(s, 'warPath', C, new TestClock(), { warPath: { level: 'wp.stone.l06', difficulty: 'legendary' } });
    expect(hard.tier).toBe(10);
  });
});

describe('onboarding, loss streak and difficulty', () => {
  it('winning the training match beats Stone L1', () => {
    const s = fresh();
    const c = new TestClock();
    const opponent = M.pickOpponent(s, 'tutorial', C, c);
    const r = M.applyMatchResult(s, matchInput('tutorial', 'win', opponent), C, c);
    expect(r.save.warPath.stars['wp.stone.l01']).toBeGreaterThanOrEqual(1);
    expect(r.rewards.some((x) => x.kind === 'pathStar')).toBe(true);
    expect(currentLevelId(r.save, C)).toBe('wp.stone.l02');
  });

  it('three War Path losses in a row offer Try Easy; a win resets it', () => {
    let s = withStars(fresh(), ['wp.stone.l01', 'wp.stone.l02']);
    for (let i = 0; i < 3; i++) s = playLevel(s, 'wp.stone.l03', 'loss').save;
    expect(s.warPath.lossStreak).toBe(3);
    expect(tryEasyDue(s, C)).toBe(true);
    s = playLevel(s, 'wp.stone.l03', 'win').save;
    expect(s.warPath.lossStreak).toBe(0);
  });

  it('the difficulty is remembered per save', () => {
    const s = M.setWarPathDifficulty(fresh(), 'hard');
    expect(s.warPath.difficulty).toBe('hard');
    expect(M.setWarPathDifficulty(s, 'hard')).toBe(s);
  });
});
