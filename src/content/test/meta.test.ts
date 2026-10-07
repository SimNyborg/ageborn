/**
 * The meta tables against DESIGN A5.8, A6.3-A6.10, A7.4 and A9.1. Expected values are typed in from
 * DESIGN, and the derived columns (expected copies, bag averages, totals) are recomputed from the
 * tables so the data and DESIGN's arithmetic check each other.
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleTier, Rarity } from '@/contracts/ids';
import { seedSfc32 } from '@/core/rng';
import { AGE_ORDER, FORMAT_MODES, FORMAT_ORDER, commanderName, content, playerName, roadAmber } from '../index';
import { contentAllReleased as full } from '../../../tests/fixtures/allReleased';

const { capsules, rarities, arenas, trophyRoad, generals, quests, dailyModifiers, cosmetics, names } = content;

/** Expected copies of one capsule tier before pity (A6.4 steps 1-3), ×10,000 to stay integral. */
function expectedCopies(tier: CapsuleTier, allAges = false): number {
  const t = allAges ? { ...capsules.tiers[tier], ...capsules.allAges.tiers[tier] } : capsules.tiers[tier];
  const copies = (r: Rarity): number => t.copies[r];
  // Guaranteed stacks; the 2nd and later guaranteed Legendary stacks hold `extraLegendaryCopies`.
  let legendaries = 0;
  const sum = t.guaranteed.reduce((s, r) => {
    if (r !== 'legendary') return s + copies(r) * 10000;
    legendaries += 1;
    return s + (legendaries >= 2 ? t.extraLegendaryCopies : copies(r)) * 10000;
  }, 0);
  const rolled = (Object.keys(capsules.stackRollBp) as Rarity[]).reduce((s, r) => s + capsules.stackRollBp[r] * copies(r), 0);
  return sum + rolled * (t.stacks - t.guaranteed.length);
}

describe('Time Capsules (A6.4)', () => {
  it('has the tier table', () => {
    const row = (t: CapsuleTier) => {
      const x = capsules.tiers[t];
      return [x.stacks, x.copies.common, x.copies.rare, x.copies.epic, x.copies.legendary, x.amber];
    };
    // A17.13: about ×1.75 copies and Amber (the pool grew 55 → 88 cards; time to max stays). The Amber
    // re-tune (owner feedback 2026-10-07) cut this table's Amber ×0.8 (was 105 / 210 / 530 / 1,400 / 2,640 / 2,800 / 3,600).
    expect(row('clay')).toEqual([2, 4, 1, 1, 1, 85]);
    expect(row('bronze')).toEqual([3, 5, 2, 2, 1, 170]);
    expect(row('silver')).toEqual([4, 10, 5, 2, 1, 425]);
    expect(row('jade')).toEqual([5, 24, 10, 5, 2, 1120]);
    // The 2026-09-29 ladder: Gold is the old Aeon (+100 Dust), then Platinum and the new Aeon
    expect(row('gold')).toEqual([6, 26, 10, 5, 2, 2110]);
    expect(row('platinum')).toEqual([7, 26, 12, 5, 2, 2240]);
    expect(row('aeon')).toEqual([8, 40, 14, 6, 2, 2880]);
    expect(capsules.tierOrder).toEqual(['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon']);
    expect(capsules.tiers.bronze.guaranteed).toEqual(['rare']);
    expect(capsules.tiers.silver.guaranteed).toEqual(['rare', 'rare', 'epic']);
    expect(capsules.tiers.jade).toMatchObject({ guaranteed: ['rare', 'rare', 'epic', 'epic'], rareToLegendaryBp: 0, bonusDust: 100 });
    expect(capsules.tiers.gold).toMatchObject({
      guaranteed: ['legendary', 'epic', 'epic'], legendaryUnownedFirst: true, skinChanceBp: 3000, skinMinRarity: 'rare', bonusDust: 100,
      extraLegendaryCopies: 2, exclusiveItems: false,
    });
    expect(capsules.tiers.platinum).toMatchObject({
      guaranteed: ['legendary', 'legendary', 'epic', 'epic'], legendaryUnownedFirst: true, skinChanceBp: 10000, skinMinRarity: 'rare',
      bonusDust: 200, extraLegendaryCopies: 1, exclusiveItems: false,
    });
    expect(capsules.tiers.aeon).toMatchObject({
      guaranteed: ['legendary', 'legendary', 'legendary', 'epic', 'epic', 'epic'], legendaryUnownedFirst: true, skinChanceBp: 10000,
      skinMinRarity: 'epic', bonusDust: 500, extraLegendaryCopies: 1, exclusiveItems: true,
    });
    for (const t of capsules.tierOrder) expect(capsules.tiers[t].rareToLegendaryBp, t).toBe(0);
    expect(capsules).toMatchObject({ summitAbove: 'gold', legendaryCatchUp: true, exclusiveCompleteDust: 500, exclusiveCraftDust: 3000 });
  });

  it('never falls going up the ladder (stacks, Legendaries, Epics, Amber, Dust, skin chance)', () => {
    const count = (t: CapsuleTier, r: Rarity): number => capsules.tiers[t].guaranteed.filter((x) => x === r).length;
    for (let i = 1; i < capsules.tierOrder.length; i += 1) {
      const lo = capsules.tierOrder[i - 1]!;
      const hi = capsules.tierOrder[i]!;
      const a = capsules.tiers[lo];
      const b = capsules.tiers[hi];
      expect(b.stacks, hi).toBeGreaterThanOrEqual(a.stacks);
      expect(count(hi, 'legendary'), hi).toBeGreaterThanOrEqual(count(lo, 'legendary'));
      expect(count(hi, 'epic'), hi).toBeGreaterThanOrEqual(count(lo, 'epic'));
      expect(b.amber, hi).toBeGreaterThanOrEqual(a.amber);
      expect(b.bonusDust, hi).toBeGreaterThanOrEqual(a.bonusDust);
      expect(b.skinChanceBp, hi).toBeGreaterThanOrEqual(a.skinChanceBp);
    }
  });

  it('summit tiers each guarantee more Legendaries than the tier below (A10)', () => {
    const order = capsules.tierOrder;
    const top = order.indexOf(capsules.summitAbove);
    expect(top).toBeGreaterThanOrEqual(0);
    const legs = (i: number): number => capsules.tiers[order[i]!].guaranteed.filter((r) => r === 'legendary').length;
    expect(legs(top)).toBeGreaterThan(0);
    for (let i = top + 1; i < order.length; i += 1) expect(legs(i), order[i]).toBeGreaterThan(legs(i - 1));
  });

  it('every arena drop pool holds at least 4 Legendaries (3 distinct ones always fit)', () => {
    const max = Math.max(...capsules.tierOrder.map((t) => capsules.tiers[t].guaranteed.filter((r) => r === 'legendary').length));
    for (const a of arenas.list) {
      const legendaries = [...content.order.units, ...content.order.turrets].filter((id) => {
        const def = content.units[id] ?? content.turrets[id];
        return def !== undefined && def.rarity === 'legendary' && a.dropAges.includes(def.age) && !(content.units[id]?.hidden ?? false);
      });
      expect(legendaries.length, a.id).toBeGreaterThanOrEqual(Math.max(4, max));
    }
  });

  it('reproduces DESIGN\'s "Expected copies" column from the table', () => {
    for (const t of capsules.tierOrder) {
      // DESIGN rounds to one decimal: compare in tenths.
      const tenths = Math.round(expectedCopies(t) / 1000);
      expect(tenths, t).toBe(Math.round(capsules.tiers[t].expectedCopiesCenti / 10));
    }
    expect(capsules.tiers.clay.expectedCopiesCenti).toBe(630);
    expect(capsules.tiers.jade.expectedCopiesCenti).toBe(4980);
    expect(capsules.tiers.gold.expectedCopiesCenti).toBe(7560);
    expect(capsules.tiers.platinum.expectedCopiesCenti).toBe(7790);
    expect(capsules.tiers.aeon.expectedCopiesCenti).toBe(8640);
  });

  it('averages 16.1 copies and 330.3 Amber per bag capsule (A6.4, A6.9; 411.3 Amber before 2026-10-07)', () => {
    const bag = capsules.bag;
    expect(bag).toEqual({ clay: 60, bronze: 80, silver: 40, jade: 13, gold: 4, platinum: 2, aeon: 1 });
    const size = capsules.tierOrder.reduce((n, t) => n + bag[t], 0);
    expect(size).toBe(200);
    let copies = 0;
    let amber = 0;
    for (const t of capsules.tierOrder) {
      copies += bag[t] * expectedCopies(t);
      amber += bag[t] * capsules.tiers[t].amber;
    }
    expect(Math.round(copies / size / 1000)).toBe(161);
    expect(amber / size).toBe(330.3);
  });

  it('has the all-ages table from Arena 3 (A6.4, content re-tune 2026-10-04)', () => {
    const w = capsules.allAges;
    expect(w.fromArena).toBe(3);
    expect(w.ageCapsuleStacks).toBe(capsules.ageCapsule.stacks + 1);
    const rows = capsules.tierOrder.map((t) => [t, w.tiers[t].stacks, w.tiers[t].copies.common, w.tiers[t].copies.rare, w.tiers[t].copies.epic, w.tiers[t].copies.legendary, w.tiers[t].amber]);
    expect(rows).toEqual([
      // Amber ×0.65 since the 2026-10-07 re-tune (was 181 / 363 / 916 / 2,419 / 4,562 / 4,838 / 6,221)
      ['clay', 3, 6, 2, 2, 2, 120],
      ['bronze', 4, 7, 5, 5, 2, 235],
      ['silver', 5, 13, 12, 5, 2, 595],
      ['jade', 6, 32, 23, 12, 4, 1570],
      ['gold', 7, 34, 23, 12, 4, 2965],
      ['platinum', 8, 34, 28, 12, 4, 3145],
      ['aeon', 9, 53, 32, 14, 4, 4045],
    ]);
    for (const t of capsules.tierOrder) {
      // One more stack than the base tier on every rung; its Expected copies column in tenths.
      expect(w.tiers[t].stacks, t).toBe(capsules.tiers[t].stacks + 1);
      expect(Math.round(expectedCopies(t, true) / 1000), t).toBe(Math.round(w.tiers[t].expectedCopiesCenti / 10));
    }
    // 38.5 copies and 462.0 Amber per bag capsule before pity (16.1 and 330.3 on the base table; 710.7 and
    // 411.3 Amber before the 2026-10-07 re-tune).
    const size = capsules.tierOrder.reduce((n, t) => n + capsules.bag[t], 0);
    const copies = capsules.tierOrder.reduce((n, t) => n + capsules.bag[t] * expectedCopies(t, true), 0);
    const amber = capsules.tierOrder.reduce((n, t) => n + capsules.bag[t] * w.tiers[t].amber, 0);
    expect(Math.round(copies / size / 1000)).toBe(385);
    expect(amber / size).toBeCloseTo(462.025, 3);
  });

  it('has the odds, pity, charges and script', () => {
    expect(capsules.stackRollBp).toEqual({ common: 7200, rare: 2200, epic: 500, legendary: 100 });
    expect(capsules.dailyOddsBp).toEqual({ clay: 0, bronze: 7800, silver: 1500, jade: 500, gold: 150, platinum: 35, aeon: 15 });
    expect(Object.values(capsules.dailyOddsBp).reduce((a, b) => a + b, 0)).toBe(10000);
    expect(capsules.pity).toEqual({
      epicEvery: 10, legendaryFreeUntil: 25, legendaryStepBp: 500, legendaryGuaranteeAt: 40, newCardEvery: 5,
      wardrobeEpicEvery: 5, wardrobeLegendaryEvery: 25,
    });
    // Legendary pity reaches 70% at n = 39, then capsule 40 guarantees one (A6.5).
    expect((39 - capsules.pity.legendaryFreeUntil) * capsules.pity.legendaryStepBp).toBe(7000);
    // The Sundial (2026-09-30, A6.3): one every 5 h, holds 34 (7 days), a new save starts with 12.
    expect(capsules.charges).toEqual({ start: 12, max: 34, regenMs: 5 * 3600 * 1000, freeCapsules: 10 });
    expect(capsules.charges.max * capsules.charges.regenMs).toBeGreaterThanOrEqual(7 * 24 * 3600 * 1000);
    expect(capsules.clayMeterPips).toBe(2);
    expect(capsules.supply).toEqual({ matchesPerCapsule: 3, allowanceMax: 7, accrues: false });
    expect(capsules.daily).toEqual({ firstAfterCapsule: 2, bankMax: 3 });
    expect(capsules.script.map((s) => [s.tier, s.cards])).toEqual([
      // The Anti-heavy Rares are in the starter kit (owner feedback 2026-09-29): the Support Rares come instead.
      ['bronze', ['drum_shaman', 'standard_bearer']],
      ['silver', ['friar', 'onager']],
      ['bronze', ['log_roller']],
      ['silver', ['field_surgeon']],
      ['gold', ['mammoth_matriarch']],
    ]);
    expect(capsules.script[3]?.randomUnownedEpic).toBe(true);
    expect(capsules.script[4]?.fullWalkout).toBe(true);
    expect(capsules.kinds.daily.climbFrom).toBe('bronze');
    expect(capsules.kinds.road.climbFrom).toBeNull();
    expect(capsules.kinds.ageUnlock.countsForPity).toBe(false);
    expect(capsules.ageCapsule).toEqual({ stacks: 4, copiesTier: 'silver', guaranteed: ['epic'] });
  });
});

describe('Rarities, upgrades and Dust (A6.6, A6.7, A5.8)', () => {
  it('sums the copy and Amber columns to DESIGN\'s totals', () => {
    const total = (r: Rarity) => rarities.cards[r].upgradeCopies.reduce((a, b) => a + b, 0);
    expect(total('common')).toBe(153);
    expect(total('rare')).toBe(130);
    expect(total('epic')).toBe(44);
    expect(total('legendary')).toBe(11);
    const amber = rarities.upgradeAmber.reduce((a, b) => a + b, 0);
    expect(amber).toBe(4970);
    // A6.9 / A17.13: maxing the 88 original cards costs 437,360 Amber; each X0 wave card adds 4,970.
    expect(amber * 88).toBe(437360);
    expect(amber * (content.order.units.length + content.order.turrets.length)).toBe(4970 * (content.order.units.length + content.order.turrets.length));
  });

  it('has the Dust, Codex and foil rates', () => {
    const r = rarities.cards;
    expect([r.common, r.rare, r.epic, r.legendary].map((x) => [x.dustPerExtraCopy, x.craftCopyDust, x.codexPoints])).toEqual([
      [5, 40, 1], [20, 100, 2], [100, 400, 4], [400, 1600, 8],
    ]);
    const s = rarities.skins;
    expect([s.rare, s.epic, s.legendary].map((x) => [x.crateOddsBp, x.duplicateDust, x.craftDust])).toEqual([
      [7800, 50, 200], [1800, 200, 800], [400, 800, 3000],
    ]);
    expect(rarities.foilOrder.map((f) => rarities.foils[f].rollBp)).toEqual([25, 100, 400, 0]);
    expect(rarities.levelTrims.map((t) => [t.trim, t.fromLevel])).toEqual([['bronze', 4], ['silver', 7], ['gold', 10]]);
  });
});

describe('Arenas and ladder (A6.3, A6.8)', () => {
  it('has the arena table', () => {
    expect(arenas.list.map((a) => [a.index, a.id, a.trophies, a.botTiers, a.botLevel])).toEqual([
      [1, 'tar_pits', 0, [0, 2], 1],
      [2, 'frostfang', 150, [1, 3], 2],
      [3, 'kingsmoat', 400, [2, 4], 3],
      [4, 'powder_bay', 800, [3, 5], 4],
      [5, 'iron_front', 1300, [4, 6], 5],
      [6, 'neon_harbor', 1900, [5, 7], 6],
      [7, 'orbital_ring', 2600, [6, 8], 7],
      [8, 'chrono_rift', 3400, [8, 10], 8],
    ]);
    const [a1, a2, a3] = arenas.list;
    // A17.13: the drop pools follow the formats' ages
    // Owner decision 2026-10-03: every ladder length (Long War and No clock too) is open from Arena 1.
    for (const a of arenas.list) expect(a.ladderFormats, a.id).toEqual(['short', 'standard', 'full', 'last']);
    expect(a1).toMatchObject({ dropAges: AGE_ORDER.slice(0, 4), randomLegendaries: false, botMaxRarity: 'rare' });
    expect(a2).toMatchObject({ dropAges: AGE_ORDER.slice(0, 6) });
    expect(a2?.gateRewards).toContainEqual({ kind: 'ageUnlock', ages: ['industrial', 'modern'] });
    expect(a3?.gateRewards).toContainEqual({ kind: 'ageUnlock', ages: ['future', 'cosmic'] });
    expect(a3?.gateRewards).toContainEqual({ kind: 'conquestUnlock' });
    for (const a of arenas.list.slice(2)) expect(a.dropAges, a.id).toEqual(AGE_ORDER);
    expect(arenas.list[7]?.gateRewards).toContainEqual({ kind: 'skin', skin: 'crystal_spire' });
    // The 2026-09-29 ladder: Gate 7 gives Gold (the old Aeon), Gate 8 Platinum
    expect(arenas.list[6]?.gateRewards).toContainEqual({ kind: 'capsule', tier: 'gold' });
    expect(arenas.list[7]?.gateRewards).toContainEqual({ kind: 'capsule', tier: 'platinum' });
    expect(arenas.list[7]?.wardenChanceBp).toBe(2000);
  });

  it('has the ladder results and matchmaking constants', () => {
    expect(arenas.ladder).toMatchObject({
      win: { trophies: 30, amber: 20, amberWithoutCharge: 40 },
      loss: { trophies: -20, amber: 15, noLossBelowTrophies: 400 },
      draw: { trophies: 0, amber: 15 },
      lossProtection: { streak: 3, tierDrop: 1 },
      skirmishWinAmber: 5,
      mmr: { start: 1000, k: 32, tierRatingBase: 800, tierRatingStep: 100, tierOffset: 870, tierDivisor: 100 },
      newPlayer: { matches: 2, mistakeBonusBp: 5000 },
      levelRollBp: { minus: 2500, zero: 5000, plus: 2500 },
      standardLevel: 7,
    });
  });
});

describe('Trophy Road (A6.3)', () => {
  it('has 70 nodes, every 50 to 2,000 then every 100 to 5,000 (60 to 4,000 before the X0 extension)', () => {
    expect(trophyRoad.nodes).toHaveLength(70);
    expect(trophyRoad.nodes[0]?.trophies).toBe(50);
    expect(trophyRoad.nodes[39]?.trophies).toBe(2000);
    expect(trophyRoad.nodes[40]?.trophies).toBe(2100);
    expect(trophyRoad.nodes[59]?.trophies).toBe(4000);
    expect(trophyRoad.nodes[69]?.trophies).toBe(5000);
  });

  it('pays Amber by the formula, which matches every Amber cell of the table', () => {
    for (const n of trophyRoad.nodes) {
      for (const r of n.rewards) if (r.kind === 'amber') expect(r.amount, `${n.trophies}`).toBe(roadAmber(trophyRoad, n.trophies));
    }
    expect(roadAmber(trophyRoad, 50)).toBe(110);
    expect(roadAmber(trophyRoad, 3800)).toBe(860);
    // Always an integer (B3 integer state), even between nodes.
    expect(roadAmber(trophyRoad, 51)).toBe(110);
    expect(roadAmber(trophyRoad, 54)).toBe(110);
  });

  it('places the powers, gates and big rewards as DESIGN lists them', () => {
    const at = (t: number) => trophyRoad.nodes.find((n) => n.trophies === t)?.rewards;
    // A17.13 road
    expect(at(100)).toEqual([{ kind: 'power', card: 'meteor_shower' }]);
    expect(at(150)).toEqual([{ kind: 'gate', arena: 2 }]);
    expect(at(200)).toEqual([{ kind: 'power', card: 'aegis' }]);
    expect(at(250)).toEqual([{ kind: 'power', card: 'royal_decree' }]);
    expect(at(300)).toEqual([{ kind: 'power', card: 'broadside' }]);
    expect(at(350)).toEqual([{ kind: 'power', card: 'zeppelin_raid' }]);
    expect(at(400)).toEqual([{ kind: 'gate', arena: 3 }, { kind: 'power', card: 'carpet_bomber' }]);
    expect(at(450)).toEqual([{ kind: 'power', card: 'nanite_surge' }]);
    expect(at(500)).toEqual([{ kind: 'power', card: 'warp_strike' }]);
    // The displaced Silver Capsule, 100 Dust and Amber node join 550-650 as second items
    // (A2.9.8: from 550 the War Path power fallback items join as the last item)
    expect(at(550)).toEqual([{ kind: 'dust', amount: 100 }, { kind: 'capsule', tier: 'silver' }, { kind: 'power', card: 'sticky_tar' }]);
    expect(at(600)).toEqual([{ kind: 'amber', amount: 220 }, { kind: 'dust', amount: 100 }, { kind: 'power', card: 'hunt_cry' }]);
    expect(at(650)).toEqual([{ kind: 'capsule', tier: 'silver' }, { kind: 'amber', amount: 230 }, { kind: 'power', card: 'hunters_spear' }]);
    expect(at(1000)).toEqual([{ kind: 'wardrobe' }]);
    expect(at(1500)).toEqual([{ kind: 'capsule', tier: 'jade' }]);
    expect(at(1600)).toEqual([{ kind: 'dust', amount: 400 }, { kind: 'power', card: 'sniper_team' }]);
    expect(at(3400)).toEqual([{ kind: 'gate', arena: 8 }]);
    expect(at(4000)).toEqual([{ kind: 'capsule', tier: 'aeon' }]);
    const gates = trophyRoad.nodes.flatMap((n) => n.rewards.filter((r) => r.kind === 'gate').map(() => n.trophies));
    expect(gates).toEqual(arenas.list.slice(1).map((a) => a.trophies));
  });
});

describe('Generals and Conquest (A7.4, A6.10)', () => {
  it('has the personality weights table', () => {
    const w = (id: keyof typeof generals.list) => Object.values(generals.list[id].weights);
    expect(w('pip')).toEqual([50, 40, 30, 40, 30, 20, 20]);
    expect(w('kettle')).toEqual([90, 15, 10, 20, 20, 30, 0]);
    expect(w('moss')).toEqual([25, 90, 40, 40, 50, 30, 80]);
    expect(w('ledger')).toEqual([40, 40, 95, 95, 40, 40, 40]);
    expect(w('boomsworth')).toEqual([50, 70, 50, 50, 50, 40, 50]);
    expect(w('twins')).toEqual([60, 50, 50, 60, 60, 50, 40]);
    expect(w('rook')).toEqual([60, 50, 50, 60, 50, 50, 30]);
    expect(w('tempest')).toEqual([60, 40, 50, 70, 95, 50, 40]);
    expect(w('warden')).toEqual([70, 60, 60, 70, 80, 90, 40]);
  });

  it('has the tiers and signatures', () => {
    expect(generals.order).toEqual(['grogg', 'pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest', 'warden', 'echo']);
    expect(generals.list.pip.tiers).toEqual([0, 2]);
    expect(generals.list.kettle.tiers).toEqual([1, 5]);
    expect(generals.list.warden.tiers).toEqual([10, 10]);
    expect(generals.list.echo).toMatchObject({ tiers: null, mirror: true, warPlan: null });
    expect(generals.list.grogg).toMatchObject({ scripted: true, baseStartBp: 9000, neverEvolves: true });
    expect(generals.list.rook.counterWeightBp).toBe(15000);
    expect(generals.list.twins.portraits).toBe(2);
    expect(generals.list.warden.legendaryLevel).toBe(9);
    expect(generals.list.boomsworth.signatureCards).toEqual(['trebuchet', 'bronze_cannon', 'howitzer', 'grenadier', 'scorpion', 'boiler_mortar', 'starfall_battery']);
  });

  it('gives the Boss all eight Legendaries and Boomsworth his artillery', () => {
    const legendaries = Object.values(generals.list.warden.warPlan ?? {}).flatMap((l) => l.units).filter((u) => u && content.units[u]?.rarity === 'legendary');
    expect(legendaries.sort()).toEqual([
      'balloon_admiral', 'behemoth_tank', 'bronze_colossus', 'chrono_titan', 'land_dreadnought', 'mammoth_matriarch', 'mothership', 'ursa_paladin',
    ]);
    // A17.13: every General with a plan has all 8 loadouts
    for (const g of Object.values(generals.list)) {
      if (g.warPlan && !g.scripted) expect(Object.keys(g.warPlan).sort(), g.id).toEqual([...AGE_ORDER].sort());
    }
    const boom = Object.values(generals.list.boomsworth.warPlan ?? {}).flatMap((l) => [...l.units, ...l.turrets]);
    for (const c of generals.list.boomsworth.signatureCards) expect(boom).toContain(c);
  });

  it('has the Conquest board, stars and milestones', () => {
    expect(generals.conquest.board.map((b) => [b.general, b.tier, b.level])).toEqual([
      ['pip', 1, 1], ['kettle', 2, 2], ['moss', 3, 3], ['ledger', 4, 4], ['boomsworth', 5, 5],
      ['twins', 6, 6], ['rook', 7, 7], ['tempest', 8, 8], ['warden', 10, 9],
    ]);
    // A17.18 owner decision: Conquest plays Standard War
    expect(generals.conquest.format).toBe('standard');
    expect(generals.conquest.unlockArena).toBe(3);
    expect(generals.conquest.stars.map((s) => s.reward)).toEqual([
      { kind: 'amber', amount: 200 }, { kind: 'dust', amount: 100 }, { kind: 'ageCapsule' },
    ]);
    expect(generals.conquest.stars[1]?.condition).toEqual({ kind: 'winBaseAbove', bp: 5000 });
    expect(generals.conquest.stars[2]?.condition).toEqual({ kind: 'winBefore', ms: 345000 });
    expect(generals.conquest.milestones).toEqual([
      { stars: 9, capsule: 'jade', title: null },
      { stars: 18, capsule: 'jade', title: null },
      { stars: 27, capsule: 'aeon', title: 'conqueror' },
    ]);
  });
});

describe('Quests and Codex (A6.7)', () => {
  it('has the 15-quest daily pool and the weekly quest', () => {
    expect(quests.daily).toHaveLength(15);
    const byId = Object.fromEntries(quests.daily.map((q) => [q.id, q]));
    expect(byId.win_2).toMatchObject({ metric: 'wins', target: 2, rewards: [{ kind: 'amber', amount: 100 }] });
    expect(byId.play_3?.skirmishCounts).toBe(true);
    expect(byId.train_30?.skirmishCounts).toBe(true);
    expect(quests.daily.filter((q) => q.skirmishCounts).map((q) => q.id)).toEqual(['play_3', 'train_30']);
    expect(byId.fast_final_age?.beforeMsByFormat).toEqual({ short: 180000, standard: 405000, full: 690000 });
    expect(byId.win_with_legendary).toMatchObject({ requiresLegendary: true, rewards: [{ kind: 'dust', amount: 100 }] });
    expect(byId.win_after_last_stand).toMatchObject({ fromMatch: 5, rewards: [{ kind: 'amber', amount: 200 }] });
    expect(byId.daily_challenge_win?.rewards).toEqual([{ kind: 'ageCapsule' }]);
    expect(quests.weekly).toMatchObject({ id: 'war_chest', metric: 'countingWins', target: 20, rewards: [{ kind: 'wardrobe' }, { kind: 'ageCapsule' }] });
    expect([quests.dailyCount, quests.freeRerolls, quests.queueMax, quests.resetHour]).toEqual([3, 1, 21, 4]);
    // A15.4: activity quests weigh 1, skill and variety quests 2
    const light = quests.daily.filter((q) => q.weight === 1).map((q) => q.id);
    expect(light.sort()).toEqual(['play_3', 'train_30', 'upgrade_2']);
    expect(quests.daily.every((q) => q.weight === 1 || q.weight === 2)).toBe(true);
  });

  it('has the Codex rules: ~130 levels from all upgrades (A17.13)', () => {
    expect(quests.codex).toEqual({
      pointsPerLevel: 15, amberPerLevel: 100,
      capsule: { firstLevel: 5, every: 10, tier: 'silver' }, wardrobe: { firstLevel: 10, every: 10 },
    });
    // Every card to L10: 9 upgrades each (A17.13 "about 130 levels in total" for the 88 original cards;
    // the X0 waves add more, about 300 with all eight, CONTENT_PLAN 8).
    const pointsOf = (ids: readonly string[]): number =>
      ids.map((id) => content.units[id]?.rarity ?? content.turrets[id]?.rarity ?? 'common').reduce((s, r) => s + 9 * rarities.cards[r].codexPoints, 0);
    const all = [...content.order.units, ...content.order.turrets];
    const original = all.filter((id) => !(id in content.cardArena));
    expect(original).toHaveLength(88);
    expect(Math.floor(pointsOf(original) / quests.codex.pointsPerLevel)).toBe(129);
    expect(Math.floor(pointsOf(all) / quests.codex.pointsPerLevel)).toBeGreaterThanOrEqual(129);
  });
});

describe('Formats (A2.10 "Used in")', () => {
  it('lists the modes of each format, consistent with the arenas, Daily Challenge and Conquest', () => {
    expect(FORMAT_ORDER).toEqual(['tutorial', 'short', 'standard', 'full', 'last']);
    expect(FORMAT_MODES).toEqual({
      tutorial: ['tutorial'],
      short: ['ladder', 'skirmish'],
      standard: ['ladder', 'daily', 'conquest', 'skirmish'],
      full: ['ladder', 'skirmish'],
      last: ['ladder', 'skirmish'],
    });
    // Every ladder length is on the ladder from Arena 1 (owner decision 2026-10-03; Standard was from
    // Arena 2, Full and Last Base Standing from Arena 3).
    const firstArena = (f: string) => arenas.list.find((a) => a.ladderFormats.some((x) => x === f))?.index;
    expect([firstArena('short'), firstArena('standard'), firstArena('full'), firstArena('last')]).toEqual([1, 1, 1, 1]);
    for (const a of arenas.list) {
      for (const f of a.ladderFormats) expect(FORMAT_MODES[f], `${a.id} ${f}`).toContain('ladder');
      // Once a format is on the ladder it stays there.
      const next = arenas.list[a.index];
      if (next) for (const f of a.ladderFormats) expect(next.ladderFormats, `${next.id}`).toContain(f);
    }
    expect(FORMAT_MODES[dailyModifiers.challenge.format]).toContain('daily');
    expect(FORMAT_MODES[generals.conquest.format]).toContain('conquest');
    // A18.3.4: formats are windows of 3, 5 and 7 ages (from Stone unless a later start is picked)
    expect(content.formats.tutorial?.ages).toHaveLength(5);
    expect(content.formats.short?.ages).toEqual(AGE_ORDER.slice(0, 3));
    expect(content.formats.standard?.ages).toEqual(AGE_ORDER.slice(0, 5));
    expect(content.formats.full?.ages).toEqual(AGE_ORDER.slice(0, 7));
    expect(content.formats['full.bronze']?.ages).toEqual(AGE_ORDER.slice(1, 8));
  });
});

describe('Daily Challenge (A9.1)', () => {
  it('has the 6 modifiers in order', () => {
    expect(dailyModifiers.order.map((m) => [dailyModifiers.list[m].index, m, dailyModifiers.list[m].effect])).toEqual([
      [1, 'gold_rush', { kind: 'passiveGold', bp: 15000 }],
      [2, 'glass_armies', { kind: 'unitHp', bp: 7000 }],
      [3, 'power_hour', { kind: 'powers', reloadBp: 10000, costBp: 5000 }],
      [4, 'fast_forward', { kind: 'xpThreshold', bp: 7000 }],
      [5, 'heavy_metal', { kind: 'unitCost', groups: ['heavy', 'legendary'], bp: 7000 }],
      [6, 'sudden_siege', { kind: 'siegeShift', ms: -75000 }],
    ]);
    expect(dailyModifiers.challenge).toEqual({
      format: 'standard',
      firstWinReward: 'ageCapsule',
      winAmber: 20,
      resetHour: 4,
      bankMax: 7,
      bankStart: 1,
      standardLevel: 7,
      difficulties: { recruit: 2, veteran: 5, warlord: 8 },
      generals: ['pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest'],
    });
  });
});

describe('Hidden feats (A15.10)', () => {
  it('has the 12 feats in table order, 100 Dust each, 4 with a title', () => {
    expect(content.feats.order).toEqual([
      'caveman_diplomacy', 'arrows_into_tomorrow', 'stubborn', 'no_walls', 'photo_finish', 'horn_of_legends', 'lightspeed',
      'underdog', 'humble_beginnings', 'back_from_the_brink', 'stone_cold', 'old_guard',
    ]);
    const list = content.feats.order.map((id) => content.feats.list[id]!);
    expect(list.every((f) => f.dust === 100)).toBe(true);
    expect(list.filter((f) => f.title).map((f) => f.title)).toEqual(['the_stubborn', 'photo_finisher', 'stone_cold', 'keeper_of_ages']);
  });

  it('pays ladder wins by format from 0 trophies, longer wars more (A15.8, owner decision 2026-10-03)', () => {
    expect(arenas.ladder.winByFormat).toEqual({
      fromTrophies: 0,
      formats: {
        short: { trophies: 30, amber: 23, amberWithoutCharge: 46 },
        standard: { trophies: 36, amber: 31, amberWithoutCharge: 62 },
        full: { trophies: 46, amber: 45, amberWithoutCharge: 90 },
        // A2.10.1: Last Base Standing is ranked and pays the most per win
        last: { trophies: 48, amber: 47, amberWithoutCharge: 94 },
      },
    });
    // The Amber in brackets doubles the win Amber, as before.
    for (const row of Object.values(arenas.ladder.winByFormat.formats)) expect(row?.amberWithoutCharge).toBe(2 * (row?.amber ?? 0));
  });
});

describe('Cosmetics and skins (A5.8)', () => {
  it('has banners from the arena gates, frames from Codex levels and 13 titles, 4 collection titles and 4 feat titles', () => {
    expect(cosmetics.banners.map((b) => b.id)).toEqual(['tar_pit', 'frostfang', 'moat', 'harbor', 'barbed', 'neon', 'starfield', 'rift']);
    for (const b of cosmetics.banners.slice(1)) {
      expect(arenas.list[b.arena - 1]?.gateRewards).toContainEqual({ kind: 'banner', banner: b.id });
    }
    expect(cosmetics.frames.map((f) => f.codexLevel)).toEqual([5, 15, 25, 35, 45, 55, 65, 75]);
    expect(cosmetics.titles.map((t) => t.id)).toEqual([
      'recruit', 'firestarter', 'evolver', 'mammoth_tamer', 'collector', 'siege_scholar', 'last_stander', 'speedrunner',
      'veteran', 'curator', 'wardens_bane', 'conqueror', 'ageborn', 'card_scout', 'archivist', 'master_smith', 'grand_curator',
      'the_stubborn', 'photo_finisher', 'stone_cold', 'keeper_of_ages',
    ]);
    expect(cosmetics.emotes.map((e) => e.id)).toEqual(['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg']);
    expect(cosmetics.defaults).toEqual({ banner: 'tar_pit', frame: 'none', title: 'recruit' });
  });

  it('has the 12 v1 skins and the X0 wave skins with targets and rarities', () => {
    // Every skin, with the release gate open (`full`): the wave skins are held back in the game.
    expect(full.order.skins.map((s) => [s, full.skins[s]?.target, full.skins[s]?.rarity])).toEqual([
      ['pumpkin_head', 'bonker', 'rare'],
      ['woolly_tuskback', 'tuskback', 'epic'],
      ['frost_matriarch', 'mammoth_matriarch', 'legendary'],
      ['tin_can', 'footman', 'rare'],
      ['panda_paladin', 'ursa_paladin', 'legendary'],
      ['toy_soldier', 'fusilier', 'rare'],
      ['ghost_corsair', 'corsair', 'epic'],
      ['arctic_rifleman', 'rifleman', 'rare'],
      ['shark_mouth', 'gyrocopter', 'epic'],
      ['synthwave', 'photon_knight', 'epic'],
      ['kaiju_walker', 'walker_mech', 'legendary'],
      ['crystal_spire', 'base.future', 'legendary'],
      // X0 Stone wave
      ['snowball_pebbler', 'pebbler', 'rare'],
      ['fossil_sabertooth', 'sabertooth', 'epic'],
      ['aurora_elk', 'elk_chieftain', 'legendary'],
      // W2 Bronze wave
      ['marble_hoplite', 'hoplite', 'rare'],
      ['sun_chariot', 'war_chariot', 'epic'],
      ['obsidian_colossus', 'bronze_colossus', 'legendary'],
      ['greenwood_archer', 'longbowman', 'rare'],
      ['chess_knight', 'destrier_knight', 'epic'],
      ['bone_wyrm', 'lindworm', 'legendary'],
      ['parade_cuirassier', 'cuirassier', 'rare'],
      ['fireworks_grenadier', 'grenadier', 'epic'],
      ['pufferfish_balloon', 'balloon_admiral', 'legendary'],
      // W5 Industrial wave
      ['chimney_sweep', 'riveter', 'rare'],
      ['teapot_golem', 'steam_golem', 'epic'],
      ['circus_train', 'armoured_train', 'legendary'],
      // W6 Modern wave
      ['desert_raider', 'trench_raider', 'rare'],
      ['tin_tankette', 'tankette', 'epic'],
      ['origami_fortress', 'sky_fortress', 'legendary'],
      ['space_cadet', 'pulse_trooper', 'rare'],
      ['chrome_rail', 'rail_gunner', 'epic'],
      ['grandfather_clock', 'chrono_titan', 'legendary'],
      // W8 Cosmic wave
      ['starlight_legionnaire', 'star_legionnaire', 'rare'],
      ['shadow_stalker', 'warp_stalker', 'epic'],
      ['classic_saucer', 'mothership', 'legendary'],
    ]);
    expect(content.skins.pumpkin_head?.visualId).toBe('unit.bonker@pumpkin_head');
    expect(content.skins.crystal_spire).toMatchObject({ visualId: 'base.future@crystal_spire', inCratePool: false, craftable: false });
  });
});

describe('Names (A6.1, A7.4)', () => {
  it('builds AI Commander names with the AI prefix, deterministically', () => {
    const a = commanderName(seedSfc32(7));
    expect(a.startsWith('AI · ')).toBe(true);
    expect(a).toMatch(/^AI · [A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(commanderName(seedSfc32(7))).toBe(a);
    const many = new Set(Array.from({ length: 50 }, (_, i) => commanderName(seedSfc32(i))));
    expect(many.size).toBeGreaterThan(40);
    expect(names.aiPrefix).toBe('AI · ');
  });

  it('builds profile names like "Chief-4821"', () => {
    for (let i = 0; i < 50; i += 1) expect(playerName(seedSfc32(i))).toMatch(/^[A-Z][a-z]+-[1-9]\d{3}$/);
    expect(names.player.prefixes).toContain('Chief');
  });
});
