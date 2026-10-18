/**
 * The unit sheet memory governor (iPhone memory, 2026-10-18): every sheet a battle holds gets its HD or its
 * 1x copy by rank within the budget; an HD copy units on the lane draw keeps HD; ties go to the HD copy in
 * memory, then to the smaller sheet; no lower rank takes HD a higher rank could not get; the plan is the
 * same whatever order the sheets come in, and stays within the budget unless the 1x copies alone (and the
 * HD copies units draw) are more. An optional sheet (the next deck before its side hands over) gets HD where it
 * fits and otherwise no copy (review S1, 2026-10-18).
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { holdBackNewHd, planSheetDensities, plannedBytes, settlingBytes, SHEET_RANK, UNIT_SHEET_BUDGET_BYTES, unitSheetBytes, type SheetDensity, type SheetWant } from '../sheetBudget';
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

  it('a kept HD copy (a load in flight, a step down not confirmed) keeps HD like a drawn one', () => {
    const wants = [want('loading', SHEET_RANK.next, 80, { hdKeep: true }), want('queue', SHEET_RANK.soon, 20)];
    expect(Object.fromEntries(planSheetDensities(wants, 90 * MB))).toEqual({ loading: 'hd', queue: 'sd' });
  });

  it('a recent HD copy keeps HD before better ranks get any, within the budget only and up to the deck rank', () => {
    const recent = (rank: number) => want('recent', rank, 40, { hdResident: true, hdRecent: true });
    // the lane's sheet would take the room by rank; the recent copy keeps it (one fits)
    expect(Object.fromEntries(planSheetDensities([recent(SHEET_RANK.deck), want('lane', SHEET_RANK.field, 40)], 60 * MB))).toEqual({ recent: 'hd', lane: 'sd' });
    // never over the budget: a recent copy that does not fit steps down
    expect(Object.fromEntries(planSheetDensities([recent(SHEET_RANK.deck), want('lane', SHEET_RANK.field, 40, { hdDrawn: true, hdResident: true })], 60 * MB))).toEqual({ recent: 'sd', lane: 'hd' });
    // the next age's rank keeps no hysteresis (a side handing over lets its current deck go)
    expect(Object.fromEntries(planSheetDensities([recent(SHEET_RANK.next), want('lane', SHEET_RANK.field, 40)], 60 * MB))).toEqual({ recent: 'sd', lane: 'hd' });
  });

  it('S1: an optional sheet (the next deck before the hand-over) gets HD where it fits, else no copy; a 1x copy in or a kept HD copy stays', () => {
    const wants = [want('lane', SHEET_RANK.field, 40), want('small', SHEET_RANK.next, 8, { optional: true }), want('big', SHEET_RANK.next, 60, { optional: true })];
    // the lane's 1x copy 10 MB, its HD +30 = 40; the small optional sheet's whole HD copy +8 = 48; the big one does not fit
    const plan = planSheetDensities(wants, 60 * MB);
    expect(Object.fromEntries(plan)).toEqual({ lane: 'hd', small: 'hd', big: 'none' });
    expect(plannedBytes(wants, plan)).toBe(48 * MB);
    // with its 1x copy in already it keeps that (nothing is dropped for nothing); an HD load in flight finishes
    expect(planSheetDensities([want('lane', SHEET_RANK.field, 40), want('big', SHEET_RANK.next, 60, { optional: true, sdResident: true })], 60 * MB).get('big')).toBe('sd');
    expect(planSheetDensities([want('lane', SHEET_RANK.field, 40), want('big', SHEET_RANK.next, 60, { optional: true, hdKeep: true })], 60 * MB).get('big')).toBe('hd');
    // held twice, it is optional only when both holds say so
    expect(planSheetDensities([want('big', SHEET_RANK.next, 60, { optional: true }), want('big', SHEET_RANK.next, 60)], 20 * MB).get('big')).toBe('sd');
    // a sheet without a copy blocks lower ranks like a 1x one: nothing of a later rank gets HD past it
    expect(Object.fromEntries(planSheetDensities([want('big', SHEET_RANK.deck, 60, { optional: true }), want('tiny', SHEET_RANK.next, 4)], 20 * MB))).toEqual({ big: 'none', tiny: 'sd' });
  });

  it('S1: a noRaise sheet (its side is leaving its age) on its 1x copy stays at 1x and blocks nothing; with its HD copy in it may keep HD', () => {
    const leaving = want('leaving', SHEET_RANK.field, 40, { noRaise: true, sdResident: true });
    // room for both in HD: the leaving sheet stays at 1x, and the lower rank still gets HD
    expect(Object.fromEntries(planSheetDensities([leaving, want('next', SHEET_RANK.next, 20)], 200 * MB))).toEqual({ leaving: 'sd', next: 'hd' });
    // with its HD copy in, it is planned as any sheet (keeps HD where there is room)
    expect(planSheetDensities([want('leaving', SHEET_RANK.field, 40, { noRaise: true, hdResident: true })], 200 * MB).get('leaving')).toBe('hd');
    // no 1x copy in yet: a plain sheet (HD where it fits)
    expect(planSheetDensities([want('leaving', SHEET_RANK.field, 40, { noRaise: true })], 200 * MB).get('leaving')).toBe('hd');
    // held twice, noRaise only when both holds say so
    expect(planSheetDensities([leaving, want('leaving', SHEET_RANK.deck, 40, { sdResident: true })], 200 * MB).get('leaving')).toBe('hd');
  });

  it('counts both copies of a sheet moving between them until the other can draw (settlingBytes)', () => {
    const wants = [
      want('down', SHEET_RANK.next, 40, { hdResident: true }),
      want('up', SHEET_RANK.soon, 40, { sdResident: true }),
      want('done', SHEET_RANK.deck, 40, { hdResident: true, sdResident: true }),
      want('new', SHEET_RANK.deck, 20),
    ];
    const plan = new Map<string, SheetDensity>([['down', 'sd'], ['up', 'hd'], ['done', 'hd'], ['new', 'hd']]);
    // down: HD until its 1x copy is in (50); up: 1x until its HD copy is in (50); done: HD only (40); new: 20
    expect(settlingBytes(wants, plan)).toBe(160 * MB);
  });

  it('S1: new HD loads wait while the copies a plan leaves still take their memory: lowest rank first; optional or canWait ones without a copy, others on 1x', () => {
    const base = (): SheetWant[] => [
      // stepping down: its HD copy stays until its 1x copy is in
      want('down', SHEET_RANK.next, 60, { hdResident: true }),
      want('nextA', SHEET_RANK.deck, 40, { canWait: true }),
      want('nextB', SHEET_RANK.deck, 20, { canWait: true }),
      want('summon', SHEET_RANK.soon, 20),
    ];
    const planOf = (): Map<string, SheetDensity> => new Map<string, SheetDensity>([['down', 'sd'], ['nextA', 'hd'], ['nextB', 'hd'], ['summon', 'hd']]);
    // the plan counts 15 + 40 + 20 + 20 = 95 MB; in memory meanwhile 75 + 40 + 20 + 20 = 155 MB
    const plan = planOf();
    expect(plannedBytes(base(), plan)).toBe(95 * MB);
    const held = holdBackNewHd(base(), plan, 110 * MB, () => true);
    // the lowest-ranked new loads wait (deck before soon; within a rank the larger first): nextA (40), then
    // nextB (20) brings it to 95 MB; the summon keeps its HD load
    expect(held).toEqual(['nextA', 'nextB']);
    expect(Object.fromEntries(plan)).toEqual({ down: 'sd', nextA: 'none', nextB: 'none', summon: 'hd' });
    // a sheet that cannot wait gets its 1x copy instead; one with its 1x copy in keeps it
    const strict = base().map((w) => (w.source === 'nextA' ? { ...w, canWait: false } : w.source === 'nextB' ? { ...w, sdResident: true } : w));
    const plan2 = planOf();
    holdBackNewHd(strict, plan2, 110 * MB, () => true);
    expect(plan2.get('nextA')).toBe('sd');
    expect(plan2.get('nextB')).toBe('sd');
    // loads already on the way are not new; a settled plan holds nothing back
    expect(holdBackNewHd(base(), planOf(), 110 * MB, () => false)).toEqual([]);
    expect(holdBackNewHd(base(), planOf(), 200 * MB, () => true)).toEqual([]);
    // while a step down is pending, a sheet that can wait gets no new 1x copy either (its HD room is coming)
    const tight = new Map<string, SheetDensity>([['down', 'hd'], ['nextA', 'sd'], ['nextB', 'sd'], ['summon', 'hd']]);
    const pending = base().map((w) => (w.source === 'down' ? { ...w, hdKeep: true } : w));
    expect(holdBackNewHd(pending, tight, 1000 * MB, () => true, true)).toEqual(['nextA', 'nextB']);
    expect(Object.fromEntries(tight)).toEqual({ down: 'hd', nextA: 'none', nextB: 'none', summon: 'hd' });
  });

  it('is deterministic: the same plan whatever order the sheets come in, within the budget unless the floor is over it', () => {
    const sheet = fc.record({ hd: fc.integer({ min: 4, max: 92 }), resident: fc.boolean(), drawn: fc.boolean(), keep: fc.boolean(), recent: fc.boolean(), optional: fc.boolean(), sdIn: fc.boolean(), noRaise: fc.boolean() });
    const arb = fc.record({
      sheets: fc.array(sheet, { minLength: 12, maxLength: 12 }),
      holds: fc.array(fc.record({ id: fc.integer({ min: 0, max: 11 }), rank: fc.integer({ min: 0, max: 3 }) }), { maxLength: 30 }),
    });
    fc.assert(
      fc.property(arb, fc.integer({ min: 0, max: 600 }), fc.integer({ min: 0, max: 1000 }), ({ sheets, holds }, budgetMb, seed) => {
        const wants = holds.map((h) => {
          const s = sheets[h.id]!;
          return want(`s${h.id}`, h.rank, s.hd, { hdResident: s.resident || s.drawn, hdDrawn: s.drawn, hdKeep: s.keep && !s.drawn && !s.resident, hdRecent: s.recent && s.resident && !s.drawn, optional: s.optional, sdResident: s.sdIn, noRaise: s.noRaise });
        });
        const plan = planSheetDensities(wants, budgetMb * MB);
        const shuffled = wants.map((w, i) => ({ w, k: (i * 7919 + seed * 104729) % 1009 })).sort((a, b) => a.k - b.k).map((x) => x.w);
        expect([...planSheetDensities(shuffled, budgetMb * MB)].sort()).toEqual([...plan].sort());
        // within the budget, or at the floor (every 1x copy but optional sheets without one, and the HD copies
        // units draw or the plan keeps)
        const ids = [...new Set(holds.map((h) => h.id))];
        const bytesOf = (id: number): number => {
          const d = plan.get(`s${id}`);
          return d === 'hd' ? sheets[id]!.hd : d === 'none' ? 0 : sheets[id]!.hd / 4;
        };
        const total = ids.reduce((t, id) => t + bytesOf(id) * MB, 0);
        const pinned = (id: number): boolean => sheets[id]!.drawn || (sheets[id]!.keep && !sheets[id]!.resident);
        const recent = (id: number): boolean => sheets[id]!.recent && sheets[id]!.resident && !sheets[id]!.drawn;
        const goesWithout = (id: number): boolean => sheets[id]!.optional && !pinned(id) && !sheets[id]!.sdIn;
        const floor = ids.reduce((t, id) => t + (pinned(id) ? sheets[id]!.hd : goesWithout(id) ? 0 : sheets[id]!.hd / 4) * MB, 0);
        expect(total).toBeLessThanOrEqual(Math.max(budgetMb * MB, floor) + 1);
        for (const id of ids) if (pinned(id)) expect(plan.get(`s${id}`)).toBe('hd');
        // no copy only for an optional sheet without its 1x copy in; such a sheet never loads a 1x copy
        for (const id of ids) {
          if (plan.get(`s${id}`) === 'none') expect(goesWithout(id)).toBe(true);
          if (goesWithout(id)) expect(plan.get(`s${id}`)).not.toBe('sd');
        }
        // a noRaise sheet on its 1x copy (no HD copy in, not pinned) stays at 1x
        const staysSd = (id: number): boolean => sheets[id]!.noRaise && sheets[id]!.sdIn && !(sheets[id]!.resident || sheets[id]!.drawn) && !pinned(id);
        for (const id of ids) if (staysSd(id)) expect(plan.get(`s${id}`)).toBe('sd');
        // no rank gets HD below a sheet of a better rank left without HD (unless pinned or a recent HD copy;
        // a sheet kept at 1x by noRaise blocks nothing)
        const rankOf = new Map<number, number>();
        for (const h of holds) rankOf.set(h.id, Math.min(rankOf.get(h.id) ?? 9, h.rank));
        const worstSd = Math.min(9, ...ids.filter((id) => plan.get(`s${id}`) !== 'hd' && !staysSd(id)).map((id) => rankOf.get(id)!));
        for (const id of ids) if (plan.get(`s${id}`) === 'hd' && !pinned(id) && !recent(id)) expect(rankOf.get(id)!).toBeLessThanOrEqual(worstSd);
      }),
      { numRuns: 300 },
    );
  });
});
