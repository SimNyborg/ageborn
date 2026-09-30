/**
 * Save v9 (DESIGN A3, A2.6; owner feedback 2026-09-29, build phase H3): every age's Anti-heavy Rare
 * joins the starter kit. The step grants the missing cards at L1 and slots each into an empty unit
 * slot of its age, never replacing a card; it is additive and idempotent.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, SaveDoc } from '@/contracts';
import { migrate, SAVE_VERSION } from '../migrations';
import { V9_ANTI_HEAVY, v9 } from '../migrations/v9';
import { validateSaveDoc } from '../schema';
import { SAVE_FIXTURES } from './helpers';

const fixture = (ver: number): SaveDoc => JSON.parse(JSON.stringify(SAVE_FIXTURES[ver])) as SaveDoc;

describe('v8 → v9: the Anti-heavy Rares join the starter kit', () => {
  it('grants every missing Anti-heavy card at L1 and keeps the ones already owned', () => {
    const old = fixture(8);
    const m = migrate(old);
    if (!m.ok) throw new Error(m.reason);
    const doc = m.doc as SaveDoc;
    expect(doc.v).toBe(SAVE_VERSION);
    for (const card of Object.values(V9_ANTI_HEAVY)) {
      const before = old.collection[card];
      if (before) expect(doc.collection[card], card).toEqual(before);
      else expect(doc.collection[card], card).toEqual({ level: 1, copies: 0, isNew: true, foil: 'none' });
    }
    // Nothing else in the collection moves.
    for (const [id, e] of Object.entries(old.collection)) expect(doc.collection[id], id).toEqual(e);
    expect(validateSaveDoc(doc).ok).toBe(true);
  });

  it('puts each card into the first empty unit slot of its age and never replaces a card', () => {
    const old = fixture(8);
    const doc = v9.up!(JSON.parse(JSON.stringify(old))) as SaveDoc;
    doc.warPlans.forEach((plan, pi) => {
      for (const [age, card] of Object.entries(V9_ANTI_HEAVY) as [AgeId, string][]) {
        const was = old.warPlans[pi]!.loadouts[age]!.units;
        const now = plan.loadouts[age]!.units;
        expect(now.includes(card), `${plan.name} ${age}`).toBe(was.includes(card) || was.includes(null));
        // Every card that was there is still in the same slot.
        was.forEach((c, i) => {
          if (c !== null) expect(now[i], `${plan.name} ${age} slot ${i}`).toBe(c);
        });
        if (!was.includes(card) && was.includes(null)) expect(now.indexOf(card)).toBe(was.indexOf(null));
      }
    });
  });

  it('leaves a full loadout alone', () => {
    const doc = fixture(8) as unknown as Record<string, unknown> & SaveDoc;
    doc.warPlans[0]!.loadouts['stone']!.units = ['bonker', 'pebbler', 'tuskback', 'drum_shaman', 'sabertooth', 'mammoth_matriarch'];
    const out = v9.up!(doc) as SaveDoc;
    expect(out.warPlans[0]!.loadouts['stone']!.units).toEqual(['bonker', 'pebbler', 'tuskback', 'drum_shaman', 'sabertooth', 'mammoth_matriarch']);
  });

  it('is idempotent: a re-run changes nothing', () => {
    const once = v9.up!(fixture(8)) as SaveDoc;
    const twice = v9.up!(JSON.parse(JSON.stringify(once))) as SaveDoc;
    expect(twice).toEqual(once);
  });

  it('the frozen v9 fixture is what the step makes of the v8 fixture', () => {
    expect(v9.up!(fixture(8))).toEqual(fixture(9));
  });
});
