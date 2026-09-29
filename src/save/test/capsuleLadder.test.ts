/**
 * The capsule ladder migration (save v6; DESIGN A6.4, B8): the bag in progress keeps its old mix
 * (index 4 → 6, sorted, `bagSize` 100), unopened old Aeons become Gold with +100 Dust, and the flags
 * for the legacy skill Aeons and the one-time notice are set. Nothing is re-rolled or taken back.
 */
import { describe, expect, it } from 'vitest';
import type { PendingCapsule, SaveDoc } from '@/contracts';
import { encodeSaveCode, importSaveCode } from '../exportImport';
import { migrate, SAVE_VERSION } from '../migrations';
import { CAPSULE_LADDER_NOTICE_FLAG, LEGACY_SKILL_AEON_FLAG, v6 } from '../migrations/v6';
import { validateSaveDoc } from '../schema';
import { capsuleLadderPreFixture, SAVE_FIXTURES } from './helpers';

type Loose = Record<string, unknown> & { capsules: SaveDoc['capsules']; flags: Record<string, boolean>; v: number };

function up(doc: Record<string, unknown>): Loose {
  if (!v6.up) throw new Error('v6 has no step');
  return v6.up(JSON.parse(JSON.stringify(doc))) as Loose;
}

const byId = (d: Loose, id: string): PendingCapsule => {
  const c = d.capsules.pending.find((p) => p.id === id);
  if (!c) throw new Error(`no capsule ${id}`);
  return c;
};

describe('save v6: the capsule ladder', () => {
  const pre = capsuleLadderPreFixture();
  const preCaps = (pre as unknown as Loose).capsules;

  it('is a v5 fixture outside the version glob', () => {
    expect(pre.v).toBe(5);
    expect(Object.values(SAVE_FIXTURES)).not.toContainEqual(pre);
  });

  it('remaps the old Aeon (4 → 6), sorts the bag and records a 100 bag', () => {
    const d = up(pre);
    expect(d.v).toBe(6);
    expect(d.capsules.bag).toEqual([0, 0, 1, 1, 2, 3, 6, 6]);
    expect(d.capsules.bagSize).toBe(100);
  });

  it('turns unopened old Aeons into Gold with +100 Dust and keeps their contents', () => {
    const d = up(pre);
    for (const id of ['cap-old-win', 'cap-old-road', 'cap-old-script5']) {
      const before = preCaps.pending.find((p) => p.id === id);
      const after = byId(d, id);
      expect(after.tier, id).toBe('gold');
      expect(after.contents.dust, id).toBe((before?.contents.dust ?? 0) + 100);
      expect(after.contents.stacks, id).toEqual(before?.contents.stacks);
      expect(after.contents.amber, id).toBe(before?.contents.amber);
      expect(after.kind, id).toBe(before?.kind);
      expect(after.scriptIndex, id).toBe(before?.scriptIndex);
    }
    expect(byId(d, 'cap-old-win').startTier).toBe('clay');
    expect(byId(d, 'cap-old-script5').startTier).toBe('clay');
    expect(byId(d, 'cap-old-road').startTier).toBe('gold');
    // other capsules are untouched
    const others = preCaps.pending.filter((p) => p.tier !== 'aeon');
    for (const p of others) expect(byId(d, p.id)).toEqual(p);
    expect(d.capsules.pending).toHaveLength(preCaps.pending.length);
  });

  it('sets the legacy skill Aeon and notice flags, keeps pity, rng and banks', () => {
    const d = up(pre);
    expect(d.flags[LEGACY_SKILL_AEON_FLAG]).toBe(true);
    expect(d.flags[CAPSULE_LADDER_NOTICE_FLAG]).toBe(true);
    for (const k of ['pity', 'rng', 'scriptStep', 'trophies', 'conquest', 'currencies', 'collection']) expect(d[k], k).toEqual(pre[k]);
    for (const k of ['charges', 'chargesUpdatedAt', 'clayMeter', 'dailyBank', 'dailyNextAt', 'wardrobe', 'freeCapsulesLeft'] as const) {
      expect(d.capsules[k], k).toEqual(preCaps[k]);
    }
  });

  it('is schema-valid after the whole chain', () => {
    const m = migrate(pre);
    expect(m).toMatchObject({ ok: true, from: 5, to: SAVE_VERSION });
    if (!m.ok) return;
    const valid = validateSaveDoc(m.doc);
    expect(valid.ok ? 'ok' : valid.issues).toBe('ok');
  });

  it('gives an empty bag bagSize 0 and a save still in the script no notice', () => {
    const young = JSON.parse(JSON.stringify(pre)) as Loose & { pity: { opened: number }; trophies: { roadClaimed: number[] } };
    young.capsules.bag = [];
    young.capsules.pending = young.capsules.pending.filter((p) => p.tier !== 'aeon');
    young.pity.opened = 3;
    young.trophies.roadClaimed = [];
    const d = up(young);
    expect(d.capsules.bag).toEqual([]);
    expect(d.capsules.bagSize).toBe(0);
    expect(d.flags[CAPSULE_LADDER_NOTICE_FLAG]).toBeUndefined();
    expect(d.flags[LEGACY_SKILL_AEON_FLAG]).toBe(true);
  });

  it('a pending old Aeon or a claimed skill Aeon alone sets the notice', () => {
    const base = JSON.parse(JSON.stringify(pre)) as Loose & { pity: { opened: number }; trophies: { roadClaimed: number[] }; conquest: { milestonesClaimed: number[] } };
    base.pity.opened = 2;
    base.trophies.roadClaimed = [];
    expect(up(base).flags[CAPSULE_LADDER_NOTICE_FLAG]).toBe(true); // pending old Aeons
    base.capsules.pending = base.capsules.pending.filter((p) => p.tier !== 'aeon');
    expect(up(base).flags[CAPSULE_LADDER_NOTICE_FLAG]).toBeUndefined();
    base.conquest.milestonesClaimed = [9, 18, 27];
    expect(up(base).flags[CAPSULE_LADDER_NOTICE_FLAG]).toBe(true);
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(pre);
    migrate(pre);
    expect(JSON.stringify(pre)).toBe(before);
  });

  it('an export code from v5 imports the same way', () => {
    const r = importSaveCode(encodeSaveCode(pre));
    expect(r).toMatchObject({ ok: true, fromVersion: 5 });
    if (!r.ok) return;
    const m = migrate(pre);
    const valid = m.ok ? validateSaveDoc(m.doc) : null;
    expect(r.value).toEqual(valid?.ok ? valid.value : null);
  });

  it('the frozen v6 fixture carries bagSize', () => {
    const v6Doc = SAVE_FIXTURES[6] as Loose;
    expect(v6Doc.v).toBe(6);
    expect(v6Doc.capsules.bagSize).toBe(200);
  });
});
