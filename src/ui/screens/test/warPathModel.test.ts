/**
 * War Path view models (ui-plan 2.3, 2.6, 4.1) agree with the meta rules they mirror (the UI may not
 * import meta, DESIGN B2), and the shell's tabs follow the unlock order.
 */
import { content } from '@/content';
import type { SaveDoc, WarPathDifficulty } from '@/contracts';
import { meta } from '@/meta';
import { featureUnlocked, levelTier as metaTier } from '@/meta/warPath';
import { describe, expect, it } from 'vitest';
import { fixtureSave, FIXTURE_STATES, newPlayerSave } from '../fixtures/saves';
import { featureOpen, levelTier, mapNodes, mapRegions, pendingUnlock, playLevelId, playTarget, UNLOCK_ORDER } from '../model/warPath';
import { shellTabs } from '../warPath/shell';

const DIFFS: WarPathDifficulty[] = ['easy', 'normal', 'hard', 'expert', 'legendary'];

/**
 * A save with the first `n` War Path levels beaten and `n` wins; the onboarding (its two matches) is
 * done from 2 wins on.
 */
function withBeaten(s: SaveDoc, n: number): SaveDoc {
  return {
    ...s,
    stats: { ...s.stats, wins: n },
    tutorial: { ...s.tutorial, step: n >= 2 ? 4 : n === 1 ? 2 : 0 },
    warPath: { ...s.warPath, legacy: false, stars: Object.fromEntries(content.warPath.order.slice(0, n).map((id) => [id, 1])) },
  };
}

describe('War Path view model = meta rules', () => {
  it('nodes and their states match meta.warPathNodes for every fixture', () => {
    for (const state of FIXTURE_STATES) {
      const s = fixtureSave(content, state);
      const ui = mapNodes(s, content).map((n) => [n.level.id, n.state, n.stars, n.crown]);
      const m = meta.warPathNodes(s, content).map((n) => [n.level.id, n.state, n.stars, n.crown]);
      expect(ui).toEqual(m);
    }
  });

  it('tiers per difficulty match A18.6.2 for every level', () => {
    for (const id of content.warPath.order) {
      const l = content.warPath.levels[id]!;
      for (const d of DIFFS) expect(levelTier(content, l, d)).toBe(metaTier(content, l, d));
    }
  });

  it('features open with their wins, in the unlock order (ui-plan 2.6, owner decision 2026-09-30)', () => {
    const s = newPlayerSave(content);
    for (let n = 0; n <= 8; n++) {
      const x = withBeaten(s, n);
      for (const f of UNLOCK_ORDER) if (f !== 'campaign') expect(featureOpen(x, content, f)).toBe(featureUnlocked(x, content, f));
    }
    expect(UNLOCK_ORDER).toEqual(['army', 'ladder', 'capsules', 'campaign', 'modes', 'customize', 'progress', 'daily']);
    expect(content.warPath.unlocks).toEqual({ army: 1, capsules: 2, modes: 3, customize: 4, progress: 5, ladder: 2, daily: 6 });
  });

  it('wins in any mode open features; the Ladder and the Campaign card open when the onboarding ends', () => {
    const s = withBeaten(newPlayerSave(content), 0);
    // Ladder wins, no War Path level beyond the onboarding: the tabs still open (the path is optional).
    const ladder = { ...withBeaten(s, 2), stats: { ...s.stats, wins: 5 } };
    expect(featureOpen(ladder, content, 'progress')).toBe(true);
    expect(featureUnlocked(ladder, content, 'progress')).toBe(true);
    expect(featureOpen(ladder, content, 'daily')).toBe(false);
    // Match 2 lost: one win, but the onboarding is over, so Home is the Ladder hub.
    const lost = { ...withBeaten(s, 1), tutorial: { ...s.tutorial, step: 4 } };
    expect(featureOpen(lost, content, 'ladder')).toBe(true);
    expect(featureUnlocked(lost, content, 'ladder')).toBe(true);
    expect(featureOpen(lost, content, 'campaign')).toBe(true);
    expect(featureOpen(lost, content, 'capsules')).toBe(false);
    // While the onboarding runs, neither is open.
    expect(featureOpen(withBeaten(s, 1), content, 'ladder')).toBe(false);
    expect(featureOpen(withBeaten(s, 1), content, 'campaign')).toBe(false);
  });

  it('regions sum their stars; Play targets the current level, or the onboarding match while due', () => {
    const mid = fixtureSave(content, 'mid');
    expect(mapRegions(mid, content)[0]).toMatchObject({ age: 'stone', from: 0, to: 9, max: 30, done: true });
    expect(playLevelId(mid, content)).toBe('wp.bronze.l07');
    const first = { ...withBeaten(newPlayerSave(content), 0), tutorial: { step: 0, hintsShown: {} } };
    expect(playTarget(first, content, 'wp.stone.l01')).toEqual({ kind: 'tutorial', match: 1 });
    expect(playTarget({ ...first, tutorial: { step: 4, hintsShown: {} } }, content, 'wp.stone.l01')).toEqual({ kind: 'level', level: 'wp.stone.l01' });
  });
});

describe('the shell tabs (ui-plan 2.2, 2.6)', () => {
  it('first launch shows no tabs; after level 1 Army is open, the rest locked, the next one says its level', () => {
    const s = withBeaten(newPlayerSave(content), 0);
    expect(shellTabs(s, content).every((t) => t.hidden)).toBe(true);
    const one = shellTabs(withBeaten(s, 1), content);
    expect(one.every((t) => !t.hidden)).toBe(true);
    expect(one.find((t) => t.id === 'army')!.lockedUntil).toBeNull();
    expect(one.find((t) => t.id === 'capsules')).toMatchObject({ lockedUntil: 2, showLevel: true });
    expect(one.find((t) => t.id === 'customize')).toMatchObject({ lockedUntil: 4, showLevel: false });
    expect(one.find((t) => t.id === 'battle')!.lockedUntil).toBeNull();
  });

  it('never more than 2 ready badges, and never on Customize', () => {
    for (const state of FIXTURE_STATES) {
      const tabs = shellTabs(fixtureSave(content, state), content);
      expect(tabs.filter((t) => typeof t.badge === 'number').length).toBeLessThanOrEqual(2);
      expect(tabs.find((t) => t.id === 'customize')!.badge ?? null).toBeNull();
    }
  });

  it('an unlock ceremony is due once per feature and never for a legacy save', () => {
    const s = withBeaten(newPlayerSave(content), 1);
    expect(pendingUnlock({ ...s, flags: {} }, content)).toBe('army');
    expect(pendingUnlock({ ...s, flags: { 'ui-unlock.army': true } }, content)).toBeNull();
    expect(pendingUnlock({ ...s, flags: {}, warPath: { ...s.warPath, legacy: true } }, content)).toBeNull();
  });
});
