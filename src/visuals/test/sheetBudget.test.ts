/**
 * The unit sheet memory governor (iPhone memory, 2026-10-18): every sheet a battle holds gets its HD or its
 * 1x copy by rank within the budget; an HD copy units on the lane draw keeps HD; ties go to the HD copy in
 * memory, then to the smaller sheet; no lower rank takes HD a higher rank could not get; the plan is the
 * same whatever order the sheets come in, and stays within the budget unless the 1x copies alone (and the
 * HD copies units draw) are more.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { planSheetDensities, plannedBytes, SHEET_RANK, UNIT_SHEET_BUDGET_BYTES, unitSheetBytes, type SheetWant } from '../sheetBudget';
import { UNIT_SHEET_PIXELS } from '../unitSheetPixels.gen';

const MB = 1_000_000;
/** A sheet of `hd` MB (its 1x copy a quarter of it). */
const want = (source: string, rank: number, hd: number, o: Partial<SheetWant> = {}): SheetWant => ({ source, rank, hdBytes: hd * MB, sdBytes: (hd / 4) * MB, ...o });

describe('unit sheet sizes', () => {
  it('reads a sheet\'s HD and 1x bytes (core and extras) from the generated table', () => {
    const px = UNIT_SHEET_PIXELS['bronze/hydra']!;
    expect(unitSheetBytes('art/units/bronze/hydra.json')).toEqual({ hd: (px[0] + px[1]) * 4, sd: (px[2] + px[3]) * 4 });
    // the largest units are the reason for the governor: a Hydra's HD copy is over 90 MB decoded
    expect(unitSheetBytes('art/units/bronze/hydra.json')!.hd).toBeGreaterThan(90 * MB);
    expect(unitSheetBytes('art/turrets/stone/rock_tosser.json')).toBeNull();
    expect(unitSheetBytes('art/units/stone/no_such_unit.json')).toBeNull();
  });

  it('the budget leaves room for the rest of a war under the 600 MB e2e budget', () => {
    expect(UNIT_SHEET_BUDGET_BYTES).toBeLessThanOrEqual(400 * MB);
    expect(UNIT_SHEET_BUDGET_BYTES).toBeGreaterThanOrEqual(300 * MB);
  });
});

describe('planSheetDensities', () => {
  it('a deck that fits keeps every sheet in HD', () => {
    const wants = [want('a', SHEET_RANK.field, 20), want('b', SHEET_RANK.deck, 30), want('c', SHEET_RANK.next, 40)];
    const plan = planSheetDensities(wants, 100 * MB);
    expect([...plan.values()]).toEqual(['hd', 'hd', 'hd']);
    expect(plannedBytes(wants, plan)).toBe(90 * MB);
  });

  it('over the budget the next age goes to 1x first, then the deck; the lane and the queue keep HD', () => {
    const wants = [want('field', SHEET_RANK.field, 40), want('queue', SHEET_RANK.soon, 30), want('deck', SHEET_RANK.deck, 30), want('next', SHEET_RANK.next, 30)];
    // all 1x: 32.5 MB; HD for field and queue (+52.5) = 85, the deck +22.5 = 107.5, the next age +22.5 = 130
    expect(Object.fromEntries(planSheetDensities(wants, 110 * MB))).toEqual({ field: 'hd', queue: 'hd', deck: 'hd', next: 'sd' });
    expect(Object.fromEntries(planSheetDensities(wants, 90 * MB))).toEqual({ field: 'hd', queue: 'hd', deck: 'sd', next: 'sd' });
    expect(Object.fromEntries(planSheetDensities(wants, 70 * MB))).toEqual({ field: 'hd', queue: 'sd', deck: 'sd', next: 'sd' });
    for (const budget of [50, 90, 100, 130]) expect(plannedBytes(wants, planSheetDensities(wants, budget * MB))).toBeLessThanOrEqual(budget * MB);
  });

  it('no lower rank takes HD a higher rank could not get, however small; within a rank the smaller sheet first', () => {
    const wants = [want('bigDeck', SHEET_RANK.deck, 80), want('smallDeck', SHEET_RANK.deck, 8), want('tinyNext', SHEET_RANK.next, 4)];
    // all 1x: 23 MB; within the deck the small sheet first (+6), the big one does not fit (+60), so the next age stays 1x
    const plan = planSheetDensities(wants, 60 * MB);
    expect(Object.fromEntries(plan)).toEqual({ bigDeck: 'sd', smallDeck: 'hd', tinyNext: 'sd' });
  });

  it('an HD copy units on the lane draw keeps HD and counts first, even over the budget', () => {
    const wants = [want('drawn', SHEET_RANK.field, 80, { hdResident: true, hdDrawn: true }), want('queue', SHEET_RANK.soon, 20)];
    const plan = planSheetDensities(wants, 70 * MB);
    expect(Object.fromEntries(plan)).toEqual({ drawn: 'hd', queue: 'sd' });
  });

  it('an equal rank goes to the HD copy already in memory, so a sheet does not flip back and forth', () => {
    const wants = [want('loaded', SHEET_RANK.deck, 30, { hdResident: true }), want('fresh', SHEET_RANK.deck, 20)];
    // room for one more HD copy: the loaded one keeps it although the fresh one is smaller
    expect(Object.fromEntries(planSheetDensities(wants, 42 * MB))).toEqual({ loaded: 'hd', fresh: 'sd' });
  });

  it('a sheet held twice counts once, at its best rank (and drawn if either says so)', () => {
    const wants = [want('x', SHEET_RANK.next, 40), want('x', SHEET_RANK.field, 40), want('y', SHEET_RANK.deck, 40)];
    const plan = planSheetDensities(wants, 60 * MB);
    expect(plan.size).toBe(2);
    expect(Object.fromEntries(plan)).toEqual({ x: 'hd', y: 'sd' });
    expect(plannedBytes(wants, plan)).toBe(50 * MB);
  });

  it('is deterministic: the same plan whatever order the sheets come in, within the budget unless the floor is over it', () => {
    const sheet = fc.record({ hd: fc.integer({ min: 4, max: 92 }), resident: fc.boolean(), drawn: fc.boolean() });
    const arb = fc.record({
      sheets: fc.array(sheet, { minLength: 12, maxLength: 12 }),
      holds: fc.array(fc.record({ id: fc.integer({ min: 0, max: 11 }), rank: fc.integer({ min: 0, max: 3 }) }), { maxLength: 30 }),
    });
    fc.assert(
      fc.property(arb, fc.integer({ min: 0, max: 600 }), fc.integer({ min: 0, max: 1000 }), ({ sheets, holds }, budgetMb, seed) => {
        const wants = holds.map((h) => {
          const s = sheets[h.id]!;
          return want(`s${h.id}`, h.rank, s.hd, { hdResident: s.resident || s.drawn, hdDrawn: s.drawn });
        });
        const plan = planSheetDensities(wants, budgetMb * MB);
        const shuffled = wants.map((w, i) => ({ w, k: (i * 7919 + seed * 104729) % 1009 })).sort((a, b) => a.k - b.k).map((x) => x.w);
        expect([...planSheetDensities(shuffled, budgetMb * MB)].sort()).toEqual([...plan].sort());
        // within the budget, or at the floor (every 1x copy and the HD copies units draw)
        const ids = [...new Set(holds.map((h) => h.id))];
        const total = ids.reduce((t, id) => t + (plan.get(`s${id}`) === 'hd' ? sheets[id]!.hd : sheets[id]!.hd / 4) * MB, 0);
        const floor = ids.reduce((t, id) => t + (sheets[id]!.drawn ? sheets[id]!.hd : sheets[id]!.hd / 4) * MB, 0);
        expect(total).toBeLessThanOrEqual(Math.max(budgetMb * MB, floor) + 1);
        for (const id of ids) if (sheets[id]!.drawn) expect(plan.get(`s${id}`)).toBe('hd');
        // no rank gets HD below a sheet of a better rank that is 1x (unless drawn)
        const rankOf = new Map<number, number>();
        for (const h of holds) rankOf.set(h.id, Math.min(rankOf.get(h.id) ?? 9, h.rank));
        const worstSd = Math.min(9, ...ids.filter((id) => plan.get(`s${id}`) === 'sd').map((id) => rankOf.get(id)!));
        for (const id of ids) if (plan.get(`s${id}`) === 'hd' && !sheets[id]!.drawn) expect(rankOf.get(id)!).toBeLessThanOrEqual(worstSd);
      }),
      { numRuns: 300 },
    );
  });
});
