/**
 * The capsule roll algorithm step by step (DESIGN A6.4 "MUST be implemented exactly", A6.5 pity).
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleTier, CardId, Rarity, SaveDoc } from '@/contracts';
import { seedSfc32 } from '@/core';
import { cardsForRoll, legendaryPityBp, planSlots, rollStacks, type PityDraw, type RollSpec } from '../capsules';
import { poolOf } from '../tables';
import { C, M, clock, lastPending, ownsAll, passesChi2, scripted } from './helpers';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const NO_PITY: PityDraw = { epicN: 1, legendaryN: 1, newCardN: 1 };
const ARENA1 = C.arenas.list[0]!;
const ARENA8 = C.arenas.list[7]!;

function tierSpec(tier: CapsuleTier, randomLegendaries = true): RollSpec {
  const d = C.capsules.tiers[tier];
  return { stacks: d.stacks, guaranteed: d.guaranteed, copies: d.copies, extraLegendaryCopies: d.extraLegendaryCopies, randomLegendaries };
}

function ctx(seed: number, owned: Iterable<CardId>, pity: PityDraw | null, ages = ARENA8.dropAges, need?: ReadonlyMap<CardId, number>) {
  return { t: C, rng: seedSfc32(seed), pool: poolOf(C, ages), owned: new Set(owned), pity, ...(need ? { need } : {}) };
}

/** Guaranteed Legendary stacks of a tier (Gold 1, Platinum 2, Aeon 3). */
const legendariesOf = (tier: CapsuleTier): number => C.capsules.tiers[tier].guaranteed.filter((r) => r === 'legendary').length;

const allCards = [...C.order.units, ...C.order.turrets];

describe('step 1: stack rarities', () => {
  it('guaranteed rarities come first and the rest roll 72/22/5/1', () => {
    const counts = [0, 0, 0, 0];
    const c = ctx(1, allCards, null);
    for (let i = 0; i < 20000; i += 1) {
      const slots = planSlots(tierSpec('bronze'), c);
      expect(slots[0]).toMatchObject({ rarity: 'rare', locked: true });
      for (const s of slots.slice(1)) counts[RARITIES.indexOf(s.rarity)]! += 1;
    }
    expect(passesChi2(counts, RARITIES.map((r) => C.capsules.stackRollBp[r]))).toBe(true);
  });

  it('without random Legendaries only the 1% roll moves to Common (73/22/5/0)', () => {
    const counts = [0, 0, 0, 0];
    const c = ctx(2, allCards, null, ARENA1.dropAges);
    for (let i = 0; i < 20000; i += 1) for (const s of planSlots(tierSpec('clay', false), c)) counts[RARITIES.indexOf(s.rarity)]! += 1;
    expect(counts[3]).toBe(0);
    expect(passesChi2(counts.slice(0, 3), [7300, 2200, 500])).toBe(true);
  });

  it('guarantees and pity still give Legendaries without random ones, from the pool ages', () => {
    const c = ctx(3, [], { ...NO_PITY, legendaryN: 40 }, ARENA1.dropAges);
    for (let i = 0; i < 200; i += 1) {
      const stacks = rollStacks(tierSpec('clay', false), c);
      const leg = stacks.filter((s) => s.rarity === 'legendary');
      expect(leg).toHaveLength(1);
      expect(ARENA1.dropAges).toContain(C.units[leg[0]!.card]!.age);
    }
  });

  it('no tier converts a guaranteed Rare to Legendary any more (step 1.3 removed with the ladder)', () => {
    const c = ctx(4, allCards, null);
    for (const tier of C.capsules.tierOrder) {
      const want = C.capsules.tiers[tier].guaranteed.filter((r) => r === 'rare').length;
      for (let i = 0; i < 500; i += 1) {
        expect(planSlots(tierSpec(tier), c).filter((s) => s.locked && s.rarity === 'rare'), tier).toHaveLength(want);
      }
    }
  });
});

describe('step 2: pity', () => {
  it('Epic pity: capsule 10 without an Epic always gets one; capsule 9 does not have to', () => {
    const c = ctx(5, allCards, { ...NO_PITY, epicN: 10 });
    for (let i = 0; i < 500; i += 1) expect(rollStacks(tierSpec('clay'), c).some((s) => s.rarity === 'epic')).toBe(true);
    const c9 = ctx(6, allCards, { ...NO_PITY, epicN: 9 });
    let without = 0;
    for (let i = 0; i < 500; i += 1) if (!rollStacks(tierSpec('clay'), c9).some((s) => s.rarity === 'epic')) without += 1;
    expect(without).toBeGreaterThan(400);
  });

  it('Legendary pity curve: 0 up to n = 25, (n − 25) × 5% for 26-39, sure at 40', () => {
    expect(legendaryPityBp(C.capsules, 25)).toBe(0);
    expect(legendaryPityBp(C.capsules, 26)).toBe(500);
    expect(legendaryPityBp(C.capsules, 39)).toBe(7000);
    expect(legendaryPityBp(C.capsules, 40)).toBe(10000);
    expect(legendaryPityBp(C.capsules, 55)).toBe(10000);
    for (const n of [25, 26, 30, 35, 39, 40]) {
      const c = ctx(100 + n, allCards, { ...NO_PITY, legendaryN: n }, ARENA1.dropAges);
      const trials = 4000;
      let hits = 0;
      for (let i = 0; i < trials; i += 1) if (planSlots(tierSpec('clay', false), c).some((s) => s.rarity === 'legendary')) hits += 1;
      const bp = legendaryPityBp(C.capsules, n);
      if (bp === 0 || bp === 10000) expect(hits).toBe(bp === 0 ? 0 : trials);
      else expect(passesChi2([hits, trials - hits], [bp, 10000 - bp])).toBe(true);
    }
  });

  it('pity upgrades the lowest-rarity non-guaranteed stack, ties to the last stack', () => {
    const c = ctx(7, allCards, { ...NO_PITY, epicN: 10 });
    for (let i = 0; i < 300; i += 1) {
      const slots = planSlots(tierSpec('bronze'), c);
      expect(slots[0]).toMatchObject({ rarity: 'rare', locked: true });
      expect(slots.some((s) => s.rarity === 'epic')).toBe(true);
    }
    // Two Common random stacks: the last one becomes the Epic.
    let found = false;
    for (let seed = 0; seed < 400 && !found; seed += 1) {
      const slots = planSlots(tierSpec('clay'), ctx(seed, allCards, { ...NO_PITY, epicN: 10 }));
      if (slots[0]?.rarity === 'common' && slots[1]?.rarity === 'epic' && slots[1].locked) found = true;
    }
    expect(found).toBe(true);
  });

  it('new-card protection picks an unowned card; with none at the stack rarities it upgrades a stack', () => {
    const noEpics = allCards.filter((id) => (C.units[id] ?? C.turrets[id])?.rarity !== 'epic');
    const c = ctx(8, noEpics, { ...NO_PITY, newCardN: 5 });
    for (let i = 0; i < 300; i += 1) {
      const stacks = rollStacks(tierSpec('clay'), c);
      expect(stacks.some((s) => s.isNew && s.rarity === 'epic')).toBe(true);
    }
    const commonsOwned = allCards.filter((id) => (C.units[id] ?? C.turrets[id])?.rarity === 'common');
    const c2 = ctx(9, commonsOwned, { ...NO_PITY, newCardN: 5 });
    for (let i = 0; i < 300; i += 1) expect(rollStacks(tierSpec('bronze'), c2).some((s) => s.isNew)).toBe(true);
  });
});

describe('steps 3-5: copies, cards, foils', () => {
  it('copies come from the tier table by rarity; cards are distinct and from the pool', () => {
    for (const tier of C.capsules.tierOrder) {
      const def = C.capsules.tiers[tier];
      const c = ctx(10, [], null, ARENA1.dropAges);
      for (let i = 0; i < 200; i += 1) {
        const stacks = rollStacks(tierSpec(tier), c);
        expect(new Set(stacks.map((s) => s.card)).size).toBe(stacks.length);
        // The 1st guaranteed Legendary holds the table's copies, the 2nd and 3rd `extraLegendaryCopies`.
        const legs = stacks.filter((s) => s.rarity === 'legendary').map((s) => s.copies);
        const g = legendariesOf(tier);
        expect(legs.length, tier).toBeGreaterThanOrEqual(g);
        legs.forEach((n, k) => expect(n, `${tier} Legendary ${k}`).toBe(k >= 1 && k < g ? def.extraLegendaryCopies : def.copies.legendary));
        for (const s of stacks) {
          if (s.rarity !== 'legendary') expect(s.copies).toBe(def.copies[s.rarity]);
          expect(ARENA1.dropAges).toContain((C.units[s.card] ?? C.turrets[s.card])!.age);
          expect((C.units[s.card] ?? C.turrets[s.card])!.rarity).toBe(s.rarity);
        }
        // Rarest last (A10 step 5).
        const idx = stacks.map((s) => RARITIES.indexOf(s.rarity));
        expect([...idx].sort((a, b) => a - b)).toEqual(idx);
      }
    }
  });

  it('unowned cards weigh ×3', () => {
    const rares = poolOf(C, ARENA8.dropAges).byRarity.rare;
    const owned = rares.filter((_, i) => i % 2 === 0);
    const c = ctx(11, [...owned, ...allCards.filter((id) => !rares.includes(id))], null);
    let unowned = 0;
    let total = 0;
    const spec: RollSpec = { stacks: 1, guaranteed: ['rare'], copies: C.capsules.tiers.bronze.copies, randomLegendaries: true };
    for (let i = 0; i < 20000; i += 1) {
      for (const s of rollStacks(spec, c)) {
        total += 1;
        if (!owned.includes(s.card)) unowned += 1;
      }
    }
    const nU = rares.length - owned.length;
    expect(passesChi2([unowned, total - unowned], [3 * nU, owned.length])).toBe(true);
  });

  it('no duplicate Legendary until every Legendary in the pool is owned; extra stacks then pick owned ones, never an Epic', () => {
    const legs = poolOf(C, ARENA8.dropAges).byRarity.legendary;
    for (const tier of C.capsules.tierOrder.filter((t) => legendariesOf(t) > 0)) {
      const g = legendariesOf(tier);
      for (let owned = 0; owned <= legs.length; owned += 1) {
        const have = [...allCards.filter((id) => !legs.includes(id)), ...legs.slice(0, owned)];
        const c = ctx(20 + owned, have, null);
        for (let i = 0; i < 100; i += 1) {
          const leg = rollStacks(tierSpec(tier), c).filter((s) => s.rarity === 'legendary');
          expect(leg.length, `${tier} with ${owned} owned`).toBeGreaterThanOrEqual(g);
          expect(new Set(leg.map((s) => s.card)).size).toBe(leg.length);
          // As many unowned ones as there are (up to the stacks), before any owned one
          const unowned = legs.length - owned;
          expect(leg.filter((s) => !have.includes(s.card)).length).toBe(Math.min(unowned, leg.length));
        }
      }
    }
  });

  it('Legendary catch-up: with every Legendary owned, picks weigh 1 + copies still needed (A6.4 step 4)', () => {
    const legs = poolOf(C, ARENA8.dropAges).byRarity.legendary;
    const [far, ...rest] = legs;
    const need = new Map<CardId, number>(legs.map((id) => [id, id === far ? 70 : 0]));
    const spec: RollSpec = { stacks: 1, guaranteed: ['legendary'], copies: C.capsules.tiers.gold.copies, randomLegendaries: true };
    const c = ctx(30, allCards, null, ARENA8.dropAges, need);
    let hits = 0;
    const n = 4000;
    for (let i = 0; i < n; i += 1) if (rollStacks(spec, c)[0]!.card === far) hits += 1;
    // far weighs 71, each other Legendary 1
    expect(passesChi2([hits, n - hits], [71, rest.length])).toBe(true);
    // Without the need map every owned Legendary weighs 1
    const flat = ctx(31, allCards, null);
    let flatHits = 0;
    for (let i = 0; i < n; i += 1) if (rollStacks(spec, flat)[0]!.card === far) flatHits += 1;
    expect(passesChi2([flatHits, n - flatHits], [1, rest.length])).toBe(true);
  });

  it('catch-up applies to the 2nd stack after the 1st took the last unowned Legendary', () => {
    const legs = poolOf(C, ARENA8.dropAges).byRarity.legendary;
    const [last, far, ...rest] = legs;
    const have = allCards.filter((id) => id !== last);
    const need = new Map<CardId, number>([...rest.map((id): [CardId, number] => [id, 0]), [far!, 500]]);
    const c = ctx(32, have, null, ARENA8.dropAges, need);
    let farSecond = 0;
    const n = 400;
    for (let i = 0; i < n; i += 1) {
      const leg = rollStacks(tierSpec('platinum'), c).filter((s) => s.rarity === 'legendary');
      expect(leg.map((s) => s.card)).toContain(last);
      if (leg.some((s) => s.card === far)) farSecond += 1;
    }
    expect(farSecond / n).toBeGreaterThan(0.95);
  });

  it('a small pool falls back to a lower rarity instead of repeating a card', () => {
    // An Age Capsule of one age: at most 2 Epics and 1 Legendary exist.
    const c = ctx(12, [], { ...NO_PITY, legendaryN: 40 }, ['stone']);
    const spec: RollSpec = { stacks: 4, guaranteed: ['epic', 'epic', 'epic'], copies: C.capsules.tiers.silver.copies, randomLegendaries: true };
    for (let i = 0; i < 100; i += 1) {
      const stacks = rollStacks(spec, c);
      expect(stacks).toHaveLength(4);
      expect(new Set(stacks.map((s) => s.card)).size).toBe(4);
    }
  });
});

describe('pending capsules (rolled at grant, counted at open)', () => {
  function runWithPending(order: 'fifo' | 'lifo', seed: number): number {
    let s: SaveDoc = ownsAll(scripted(seed, 7));
    s = { ...s, collection: Object.fromEntries(Object.entries(s.collection).filter(([id]) => (C.units[id] ?? C.turrets[id])?.rarity !== 'legendary')) };
    let maxRun = 0;
    let run = 0;
    for (let round = 0; round < 30; round += 1) {
      for (let i = 0; i < 12; i += 1) s = M.grantCapsule(s, 'win', C, clock(), { tier: 'clay' });
      const ids = s.capsules.pending.map((p) => p.id);
      if (order === 'lifo') ids.reverse();
      for (const id of ids) {
        const o = M.openCapsule(s, id);
        s = o.save;
        run = o.reveal.capsule.contents.stacks.some((x) => x.rarity === 'epic') ? 0 : run + 1;
        maxRun = Math.max(maxRun, run);
        // A counter on screen never promises more than the rule: "within N" stays true.
        expect(o.reveal.pityAfter.sinceEpic).toBeLessThanOrEqual(C.capsules.pity.epicEvery - 1);
      }
    }
    return maxRun;
  }

  it('Epic pity holds in any order the player opens a pile of capsules', () => {
    for (const seed of [1, 2, 3]) {
      expect(runWithPending('fifo', seed)).toBeLessThanOrEqual(C.capsules.pity.epicEvery - 1);
      expect(runWithPending('lifo', seed)).toBeLessThanOrEqual(C.capsules.pity.epicEvery - 1);
    }
  });

  it('new-card protection holds in any order: a NEW card stays in the capsule that promised it', () => {
    for (const order of ['fifo', 'lifo'] as const) {
      for (const seed of [1, 2, 3, 4]) {
        let s = scripted(seed, 7);
        for (let round = 0; round < 8; round += 1) {
          for (let i = 0; i < 3 + ((seed + round) % 10); i += 1) s = M.grantCapsule(s, 'win', C, clock(), { tier: 'clay' });
          const ids = s.capsules.pending.map((p) => p.id);
          if (order === 'lifo') ids.reverse();
          for (const id of ids) {
            const promised = s.capsules.pending.find((p) => p.id === id)!.contents.stacks.map((x) => x.isNew);
            const o = M.openCapsule(s, id);
            s = o.save;
            expect(o.reveal.capsule.contents.stacks.map((x) => x.isNew)).toEqual(promised);
            expect(o.reveal.pityAfter.sinceNewCard).toBeLessThanOrEqual(C.capsules.pity.newCardEvery - 1);
          }
        }
      }
    }
  });

  it('an unopened capsule counts as owned while rolling, so a NEW card is never promised twice', () => {
    let s = scripted(9, 7);
    for (let i = 0; i < 20; i += 1) s = M.grantCapsule(s, 'win', C, clock());
    const seen = new Set<string>();
    for (const p of s.capsules.pending) {
      for (const st of p.contents.stacks) {
        if (st.isNew) expect(seen.has(st.card)).toBe(false);
        seen.add(st.card);
      }
    }
    expect(cardsForRoll(s).size).toBeGreaterThan(Object.keys(s.collection).length);
    const cap = lastPending(s);
    expect(cap.createdAt).toBe(clock().now());
  });
});
