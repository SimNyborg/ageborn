/**
 * Every save meta produces passes the save system's schema (WP8, docs/requests/
 * wp8-meta-save-invariants.md): a new save and the save after a long session of every transition.
 * The real store refuses to write a doc that fails it.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { DEFAULT_SETTINGS } from '@/save/defaults';
import { SAVE_VERSION as STORE_VERSION } from '@/save/migrations';
import { validateSaveDoc } from '@/save/schema';
import { defaultSettings } from '../newSave';
import { SAVE_VERSION } from '../rules';
import { C, DAY, M, TestClock, T0, fresh, play } from './helpers';

function valid(s: SaveDoc): void {
  const r = validateSaveDoc(s);
  expect(r.ok ? [] : r).toEqual([]);
}

describe('meta saves pass the save schema (WP8)', () => {
  it('version and default settings agree with the save system', () => {
    expect(SAVE_VERSION).toBe(STORE_VERSION);
    expect(defaultSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('a new save', () => {
    for (const seed of [1, 2, 0xffffffff]) valid(fresh(seed));
  });

  it('after a long mixed session', () => {
    const c = new TestClock(T0);
    let s = fresh(9, c);
    for (let day = 0; day < 25; day += 1) {
      c.t = T0 + day * DAY;
      s = M.tickTimers(s, c);
      for (let m = 0; m < 5; m += 1) {
        const mode = s.matchesPlayed < 2 ? 'tutorial' : (['ladder', 'ladder', 'daily', 'skirmish', 'conquest'] as const)[m]!;
        s = play(s, mode, m % 3 === 0 ? 'loss' : 'win', c, { conquestGeneral: 'pip' }).save;
      }
      for (const n of C.trophyRoad.nodes) {
        const r = M.claimRoadNode(s, n.trophies, C, c);
        if (r.ok) s = r.value;
      }
      const d = M.claimDailyCapsule(s, C, c);
      if (d.ok) s = d.value;
      valid(s);
      while (s.capsules.pending.length > 0) s = M.openCapsule(s, s.capsules.pending[0]!.id).save;
      while (s.capsules.wardrobe.length > 0) s = M.openWardrobe(s, s.capsules.wardrobe[0]!.id).save;
      for (const id of Object.keys(s.collection)) {
        const r = M.upgrade(s, id, C);
        if (r.ok) s = r.value;
      }
      const p = M.setWarPlan(s, 0, M.autoFill(s, C));
      if (p.ok) s = p.value;
      valid(s);
    }
  });
});
