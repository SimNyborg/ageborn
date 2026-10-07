/**
 * Save v13, seven troops per battle (owner request 2026-10-07, DESIGN A18.9): every loadout of every
 * preset gains an empty seventh unit slot; the first six slots and everything else stay as they were.
 * `meta.fillNewTroopSlots` fills the new slot from the content on the next load (meta tests).
 */
import { describe, expect, it } from 'vitest';
import { migrate, SAVE_VERSION } from '../migrations';
import { v13, V13_UNIT_SLOTS } from '../migrations/v13';
import { validateSaveDoc } from '../schema';
import { SAVE_FIXTURES } from './helpers';

type Loadout = { units: (string | null)[]; turrets: unknown[]; powers: unknown; fort?: string | null };
type Doc = Record<string, unknown> & { v: number; warPlans: { name: string; loadouts: Record<string, Loadout> }[] };

const v12 = (): Doc => JSON.parse(JSON.stringify(SAVE_FIXTURES[12])) as Doc;

describe('save v13: seven troop slots (A18.9)', () => {
  it('adds an empty seventh slot to every loadout of every preset and keeps the first six', () => {
    const before = v12();
    expect(before.warPlans.length).toBeGreaterThan(1);
    const after = v13.up!(JSON.parse(JSON.stringify(before))) as Doc;
    expect(after.v).toBe(13);
    expect(V13_UNIT_SLOTS).toBe(7);
    after.warPlans.forEach((plan, i) => {
      for (const [age, l] of Object.entries(plan.loadouts)) {
        const old = before.warPlans[i]!.loadouts[age]!;
        expect(l.units).toEqual([...old.units, null]);
        expect({ ...l, units: undefined }).toEqual({ ...old, units: undefined });
      }
    });
    // nothing outside the War Plans changes
    expect({ ...after, v: 12, warPlans: undefined }).toEqual({ ...before, warPlans: undefined });
  });

  it('pads short loadouts and trims long ones to seven; odd shapes pass through', () => {
    const doc = v12();
    const stone = doc.warPlans[0]!.loadouts.stone!;
    doc.warPlans[0]!.loadouts.stone = { ...stone, units: ['bonker'] };
    doc.warPlans[0]!.loadouts.bronze = { ...stone, units: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] };
    const after = v13.up!(doc) as Doc;
    expect(after.warPlans[0]!.loadouts.stone!.units).toEqual(['bonker', null, null, null, null, null, null]);
    expect(after.warPlans[0]!.loadouts.bronze!.units).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect((v13.up!({ v: 12 }) as Doc).v).toBe(13);
  });

  it('the v12 fixture migrates to the current version and validates with seven slots everywhere', () => {
    const m = migrate(v12());
    expect(m).toMatchObject({ ok: true, to: SAVE_VERSION });
    if (!m.ok) return;
    const r = validateSaveDoc(m.doc);
    expect(r.ok).toBe(true);
    for (const plan of (m.doc as unknown as Doc).warPlans) for (const l of Object.values(plan.loadouts)) expect(l.units).toHaveLength(7);
  });

  it('a six-slot loadout no longer validates at v13', () => {
    const doc = migrate(v12());
    if (!doc.ok) throw new Error('migration failed');
    const bad = JSON.parse(JSON.stringify(doc.doc)) as Doc;
    bad.warPlans[0]!.loadouts.stone!.units = bad.warPlans[0]!.loadouts.stone!.units.slice(0, 6);
    expect(validateSaveDoc(bad).ok).toBe(false);
  });
});
