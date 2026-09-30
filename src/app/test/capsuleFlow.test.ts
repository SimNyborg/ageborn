/**
 * The app's capsule flow (A6.4, A10, B8, C5 #29): results are saved before the show starts, a reload
 * mid-animation replays the same result, Open all opens every waiting capsule, Wardrobe Crates open
 * with their pity, and the onboarding's first capsule changes no loadout (the Anti-heavy card is a starter card).
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { content } from '@/content';
import { createMeta } from '@/meta';
import { CapsuleShows, SHOW_KEY, hasUnownedInPool, loadShow, openCapsules } from '../capsules/capsuleFlow';
import type { KeyValueStore } from '../eventLog';

const M = createMeta(content);
const clock = { now: () => Date.UTC(2026, 2, 2, 12), offsetMs: () => 0 };

class MemoryKv implements KeyValueStore {
  readonly map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

function setup(seed = 3, kinds: ('win' | 'daily')[] = ['win']) {
  let s = M.newSave(content, clock, seed);
  for (const k of kinds) s = M.grantCapsule(s, k, content, clock);
  const kv = new MemoryKv();
  const commits: SaveDoc[] = [];
  const state = { save: s };
  const shows = new CapsuleShows({
    meta: M,
    content,
    save: () => state.save,
    commit: (next) => {
      // The record must not exist yet when the save is written: save first, then the show.
      expect(kv.getItem(SHOW_KEY)).toBeNull();
      commits.push(next);
      state.save = next;
    },
    kv,
  });
  return { shows, kv, commits, state };
}

describe('capsule flow (app)', () => {
  it('saves the opened result before the show starts, and keeps a record for a reload', () => {
    const { shows, kv, commits, state } = setup();
    const id = state.save.capsules.pending[0]!.id;
    expect(shows.open([id])).toBe(true);
    expect(commits).toHaveLength(1);
    expect(state.save.capsules.pending.some((p) => p.id === id)).toBe(false);
    const rec = shows.current.value;
    expect(rec?.kind).toBe('capsules');
    expect(loadShow(kv)).toEqual(rec);
  });

  it('a reload mid-animation shows the same result and never opens twice (C5 #29)', () => {
    const { shows, kv, state } = setup(4);
    shows.open([state.save.capsules.pending[0]!.id]);
    const rec = shows.current.value;
    const again = new CapsuleShows({ meta: M, content, save: () => state.save, commit: () => undefined, kv });
    expect(again.current.value).toEqual(rec);
    expect(again.active).toBe(true);
    again.done();
    expect(kv.getItem(SHOW_KEY)).toBeNull();
    expect(new CapsuleShows({ meta: M, content, save: () => state.save, commit: () => undefined, kv }).current.value).toBeNull();
  });

  it('Open all opens every waiting capsule in one show, oldest first', () => {
    const { shows, state } = setup(5, ['win', 'win', 'win']);
    const ids = state.save.capsules.pending.map((p) => p.id);
    expect(shows.openAll()).toBe(true);
    const rec = shows.current.value;
    expect(rec?.kind === 'capsules' && rec.reveals.map((r) => r.capsule.id)).toEqual(ids);
    expect(state.save.capsules.pending.filter((p) => ids.includes(p.id))).toEqual([]);
  });

  it('the copies bars come from the collection before and after opening', () => {
    const before = M.grantCapsule(M.newSave(content, clock, 6), 'win', content, clock);
    const o = openCapsules(M, before, [before.capsules.pending[0]!.id], content);
    expect(o).not.toBeNull();
    if (!o || o.record.kind !== 'capsules') return;
    for (const st of o.record.reveals[0]!.capsule.contents.stacks) {
      const p = o.record.progress[st.card];
      expect(p?.after).toBe(o.save.collection[st.card]?.copies);
      expect(p?.before).toBe(before.collection[st.card]?.copies ?? 0);
    }
  });

  it('the Spear Hunter is in the plan from the start; the first scripted capsule changes no loadout (A3, A8)', () => {
    const before = M.grantCapsule(M.newSave(content, clock, 7), 'win', content, clock);
    const cap = before.capsules.pending[0]!;
    expect(cap.scriptIndex).toBe(1);
    const planOf = (s: typeof before) => s.warPlans[s.activePlan]!;
    expect(planOf(before).loadouts.stone.units).toContain('spear_hunter');
    const o = openCapsules(M, before, [cap.id], content, 'capsule1');
    expect(planOf(o!.save)).toEqual(planOf(before));
    // Its NEW Support Rares are in the collection, for "Equip now" on the summary.
    expect(o!.save.collection['drum_shaman']?.level).toBe(1);
    expect(o!.record.kind === 'capsules' && o!.record.onboarding).toBe('capsule1');
  });

  it('opens a Wardrobe Crate with the card-flip data and the pity after', () => {
    let s = M.newSave(content, clock, 8);
    s = M.grantWardrobe(s, 'codex', content, clock);
    const { shows, state } = setup(8, []);
    state.save = s;
    expect(shows.openWardrobe(s.capsules.wardrobe[0]!.id)).toBe(true);
    const rec = shows.current.value;
    expect(rec?.kind).toBe('wardrobe');
    if (rec?.kind === 'wardrobe') {
      expect(rec.reveal.reelTiles).toEqual([]);
      expect(rec.pity).toEqual(state.save.pity);
    }
  });

  it('unknown ids open nothing', () => {
    const { shows, commits } = setup(9);
    expect(shows.open(['nope'])).toBe(false);
    expect(commits).toHaveLength(0);
    expect(shows.current.value).toBeNull();
  });

  it('new-card protection is off once the arena pool is fully owned', () => {
    const s = M.newSave(content, clock, 10);
    expect(hasUnownedInPool(s, content)).toBe(true);
    const collection = { ...s.collection };
    for (const id of [...content.order.units, ...content.order.turrets]) collection[id] = { level: 1, copies: 0, isNew: false, foil: 'none' };
    expect(hasUnownedInPool({ ...s, collection }, content)).toBe(false);
  });
});

describe('a stale or malformed show record never blocks the app (B8, C5 #29)', () => {
  it('drops a record with another shape, from another build, or with unknown ids, and clears the key', () => {
    const { shows, kv, state } = setup();
    shows.open([state.save.capsules.pending[0]!.id]);
    const good = kv.getItem(SHOW_KEY)!;
    expect(loadShow(kv, content)).not.toBeNull();

    const bad = [
      JSON.stringify({ v: 1, kind: 'capsules', reveals: [{ capsule: { id: 'x' } }], progress: {}, newCardProtection: true, onboarding: null }),
      JSON.stringify({ ...JSON.parse(good), content: 'another-build' }),
      good.replace(/"tier":"[a-z]+"/, '"tier":"obsidian"'),
      '{not json',
    ];
    for (const raw of bad) {
      kv.setItem(SHOW_KEY, raw);
      expect(loadShow(kv, content)).toBeNull();
      expect(kv.getItem(SHOW_KEY)).toBeNull();
    }
    // A new CapsuleShows over a stale record starts with no show.
    kv.setItem(SHOW_KEY, bad[0]!);
    const again = new CapsuleShows({ meta: M, content, save: () => state.save, commit: () => undefined, kv });
    expect(again.current.value).toBeNull();
  });
});
