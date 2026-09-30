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

  it('an unopened onboarding capsule 1 or 2 brings the new scripted Support Rares, NEW', () => {
    const old = fixture(8) as unknown as SaveDoc;
    const stack = (card: string) => ({ card, rarity: 'rare' as const, copies: 1, isNew: true, foil: 'none' as const, dust: 0 });
    const cap = (id: string, scriptIndex: number, cards: string[]) => ({
      id, kind: 'win' as const, tier: 'bronze' as const, startTier: 'clay' as const, scriptIndex, age: null,
      contents: { stacks: [...cards.map(stack), { card: 'bonker', rarity: 'common' as const, copies: 6, isNew: false, foil: 'none' as const, dust: 0 }], amber: 10, dust: 0, skin: null },
      createdAt: 0,
    });
    old.capsules.pending = [cap('cap-a', 1, ['spear_hunter', 'phalangite']), cap('cap-b', 2, ['pikeman', 'grenadier']), cap('cap-c', 3, ['pikeman'])];
    for (const c of ['drum_shaman', 'standard_bearer', 'friar', 'field_surgeon']) delete old.collection[c];
    const doc = v9.up!(JSON.parse(JSON.stringify(old))) as SaveDoc;
    const cards = (i: number) => doc.capsules.pending[i]!.contents.stacks.map((s) => [s.card, s.isNew]);
    expect(cards(0)).toEqual([['drum_shaman', true], ['standard_bearer', true], ['bonker', false]]);
    expect(cards(1)).toEqual([['friar', true], ['field_surgeon', true], ['bonker', false]]);
    // Only the onboarding capsules 1 and 2 change.
    expect(cards(2)).toEqual([['pikeman', true], ['bonker', false]]);
    // The v9 doc validates once the later steps have run (the schema is the newest version's).
    const later = migrate(JSON.parse(JSON.stringify(doc)));
    expect(later.ok && validateSaveDoc(later.doc).ok).toBe(true);
    expect(v9.up!(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
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
