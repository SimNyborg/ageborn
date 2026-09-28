/**
 * The meta tables against DESIGN A5.8, A6.3-A6.10, A7.4 and A9.1. Expected values are typed in from
 * DESIGN, and the derived columns (expected copies, bag averages, totals) are recomputed from the
 * tables so the data and DESIGN's arithmetic check each other.
 */
import { describe, expect, it } from 'vitest';
import type { CapsuleTier, Rarity } from '@/contracts/ids';
import { seedSfc32 } from '@/core/rng';
import { AGE_ORDER, FORMAT_MODES, FORMAT_ORDER, commanderName, content, playerName, roadAmber } from '../index';

const { capsules, rarities, arenas, trophyRoad, generals, quests, dailyModifiers, cosmetics, names } = content;

/** Expected copies of one capsule tier before pity (A6.4 steps 1-3), ×10,000 to stay integral. */
function expectedCopies(tier: CapsuleTier): number {
  const t = capsules.tiers[tier];
  const copies = (r: Rarity): number => t.copies[r];
  // Guaranteed stacks; Jade may turn one guaranteed Rare into a Legendary.
  let sum = t.guaranteed.reduce((s, r) => s + copies(r) * 10000, 0);
  if (t.rareToLegendaryBp > 0) sum += (copies('legendary') - copies('rare')) * t.rareToLegendaryBp;
  const rolled = (Object.keys(capsules.stackRollBp) as Rarity[]).reduce((s, r) => s + capsules.stackRollBp[r] * copies(r), 0);
  return sum + rolled * (t.stacks - t.guaranteed.length);
}

describe('Time Capsules (A6.4)', () => {
  it('has the tier table', () => {
    const row = (t: CapsuleTier) => {
      const x = capsules.tiers[t];
      return [x.stacks, x.copies.common, x.copies.rare, x.copies.epic, x.copies.legendary, x.amber];
    };
    // A17.13: about ×1.75 copies and Amber (the pool grew 55 → 88 cards; time to max stays)
    expect(row('clay')).toEqual([2, 4, 1, 1, 1, 105]);
    expect(row('bronze')).toEqual([3, 5, 2, 2, 1, 210]);
    expect(row('silver')).toEqual([4, 10, 5, 2, 1, 530]);
    expect(row('jade')).toEqual([5, 24, 10, 5, 2, 1400]);
    expect(row('aeon')).toEqual([6, 26, 10, 5, 2, 2640]);
    expect(capsules.tiers.bronze.guaranteed).toEqual(['rare']);
    expect(capsules.tiers.silver.guaranteed).toEqual(['rare', 'rare', 'epic']);
    expect(capsules.tiers.jade).toMatchObject({ guaranteed: ['rare', 'rare', 'epic', 'epic'], rareToLegendaryBp: 2500, bonusDust: 100 });
    expect(capsules.tiers.aeon).toMatchObject({ guaranteed: ['legendary', 'epic', 'epic'], legendaryUnownedFirst: true, skinChanceBp: 3000 });
  });

  it('reproduces DESIGN\'s "Expected copies" column from the table', () => {
    for (const t of capsules.tierOrder) {
      // DESIGN rounds to one decimal: compare in tenths.
      const tenths = Math.round(expectedCopies(t) / 1000);
      expect(tenths, t).toBe(Math.round(capsules.tiers[t].expectedCopiesCenti / 10));
    }
    expect(capsules.tiers.clay.expectedCopiesCenti).toBe(630);
    expect(capsules.tiers.aeon.expectedCopiesCenti).toBe(7560);
  });

  it('averages 15.7 copies and 398.7 Amber per bag capsule (A6.4, A17.13)', () => {
    const bag = capsules.bag;
    expect(bag).toEqual({ clay: 30, bronze: 40, silver: 20, jade: 7, aeon: 3 });
    let copies = 0;
    let amber = 0;
    for (const t of capsules.tierOrder) {
      copies += bag[t] * expectedCopies(t);
      amber += bag[t] * capsules.tiers[t].amber;
    }
    expect(Math.round(copies / 100 / 1000)).toBe(157);
    expect(amber / 100).toBe(398.7);
  });

  it('has the odds, pity, charges and script', () => {
    expect(capsules.stackRollBp).toEqual({ common: 7200, rare: 2200, epic: 500, legendary: 100 });
    expect(capsules.dailyOddsBp).toEqual({ clay: 0, bronze: 7800, silver: 1500, jade: 500, aeon: 200 });
    expect(capsules.pity).toEqual({
      epicEvery: 10, legendaryFreeUntil: 25, legendaryStepBp: 500, legendaryGuaranteeAt: 40, newCardEvery: 5,
      wardrobeEpicEvery: 5, wardrobeLegendaryEvery: 25,
    });
    // Legendary pity reaches 70% at n = 39, then capsule 40 guarantees one (A6.5).
    expect((39 - capsules.pity.legendaryFreeUntil) * capsules.pity.legendaryStepBp).toBe(7000);
    expect(capsules.charges).toEqual({ start: 12, max: 28, regenMs: 6 * 3600 * 1000, freeCapsules: 10 });
    expect(capsules.clayMeterPips).toBe(3);
    expect(capsules.daily).toEqual({ firstAfterCapsule: 2, bankMax: 3 });
    expect(capsules.script.map((s) => [s.tier, s.cards])).toEqual([
      ['bronze', ['spear_hunter', 'phalangite']],
      ['silver', ['pikeman', 'grenadier']],
      ['bronze', ['log_roller']],
      ['silver', []],
      ['aeon', ['mammoth_matriarch']],
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
    // A6.9 / A17.13: maxing all 88 cards costs 437,360 Amber.
    expect(amber * (content.order.units.length + content.order.turrets.length)).toBe(437360);
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
    expect(a1).toMatchObject({ ladderFormats: ['short'], dropAges: AGE_ORDER.slice(0, 4), randomLegendaries: false, botMaxRarity: 'rare' });
    expect(a2).toMatchObject({ ladderFormats: ['short', 'standard'], dropAges: AGE_ORDER.slice(0, 6) });
    expect(a2?.gateRewards).toContainEqual({ kind: 'ageUnlock', ages: ['industrial', 'modern'] });
    expect(a3?.gateRewards).toContainEqual({ kind: 'ageUnlock', ages: ['future', 'cosmic'] });
    expect(a3?.gateRewards).toContainEqual({ kind: 'conquestUnlock' });
    for (const a of arenas.list.slice(2)) expect(a.dropAges, a.id).toEqual(AGE_ORDER);
    expect(arenas.list[7]?.gateRewards).toContainEqual({ kind: 'skin', skin: 'crystal_spire' });
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
      newPlayer: { matches: 2, mistakeBonusBp: 1000 },
      levelRollBp: { minus: 2500, zero: 5000, plus: 2500 },
      standardLevel: 7,
    });
  });
});

describe('Trophy Road (A6.3)', () => {
  it('has 60 nodes, every 50 to 2,000 then every 100 to 4,000', () => {
    expect(trophyRoad.nodes).toHaveLength(60);
    expect(trophyRoad.nodes[0]?.trophies).toBe(50);
    expect(trophyRoad.nodes[39]?.trophies).toBe(2000);
    expect(trophyRoad.nodes[40]?.trophies).toBe(2100);
    expect(trophyRoad.nodes[59]?.trophies).toBe(4000);
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
    expect(at(550)).toEqual([{ kind: 'dust', amount: 100 }, { kind: 'capsule', tier: 'silver' }]);
    expect(at(600)).toEqual([{ kind: 'amber', amount: 220 }, { kind: 'dust', amount: 100 }]);
    expect(at(650)).toEqual([{ kind: 'capsule', tier: 'silver' }, { kind: 'amber', amount: 230 }]);
    expect(at(1000)).toEqual([{ kind: 'wardrobe' }]);
    expect(at(1500)).toEqual([{ kind: 'capsule', tier: 'jade' }]);
    expect(at(1600)).toEqual([{ kind: 'dust', amount: 400 }]);
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
    expect(byId.fast_final_age?.beforeMsByFormat).toEqual({ short: 160000, standard: 255000, full: 405000 });
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
    // Every card to L10: 9 upgrades each (A17.13 "about 130 levels in total").
    const points = [...content.order.units, ...content.order.turrets]
      .map((id) => content.units[id]?.rarity ?? content.turrets[id]?.rarity ?? 'common')
      .reduce((s, r) => s + 9 * rarities.cards[r].codexPoints, 0);
    expect(Math.floor(points / quests.codex.pointsPerLevel)).toBe(129);
  });
});

describe('Formats (A2.10 "Used in")', () => {
  it('lists the modes of each format, consistent with the arenas, Daily Challenge and Conquest', () => {
    expect(FORMAT_ORDER).toEqual(['tutorial', 'short', 'standard', 'full']);
    expect(FORMAT_MODES).toEqual({
      tutorial: ['tutorial'],
      short: ['ladder', 'skirmish'],
      standard: ['ladder', 'daily', 'conquest', 'skirmish'],
      full: ['ladder', 'skirmish'],
    });
    // Short War on the ladder in all arenas, Standard from Arena 2, Full from Arena 3.
    const firstArena = (f: string) => arenas.list.find((a) => a.ladderFormats.some((x) => x === f))?.index;
    expect([firstArena('short'), firstArena('standard'), firstArena('full')]).toEqual([1, 2, 3]);
    for (const a of arenas.list) {
      for (const f of a.ladderFormats) expect(FORMAT_MODES[f], `${a.id} ${f}`).toContain('ladder');
      // Once a format is on the ladder it stays there.
      const next = arenas.list[a.index];
      if (next) for (const f of a.ladderFormats) expect(next.ladderFormats, `${next.id}`).toContain(f);
    }
    expect(FORMAT_MODES[dailyModifiers.challenge.format]).toContain('daily');
    expect(FORMAT_MODES[generals.conquest.format]).toContain('conquest');
    expect(content.formats.tutorial.ages).toHaveLength(5);
    expect(content.formats.short.ages).toEqual(AGE_ORDER.slice(0, 4));
    expect(content.formats.standard.ages).toEqual(AGE_ORDER.slice(0, 6));
    expect(content.formats.full.ages).toEqual(AGE_ORDER);
  });
});

describe('Daily Challenge (A9.1)', () => {
  it('has the 6 modifiers in order', () => {
    expect(dailyModifiers.order.map((m) => [dailyModifiers.list[m].index, m, dailyModifiers.list[m].effect])).toEqual([
      [1, 'gold_rush', { kind: 'passiveGold', bp: 15000 }],
      [2, 'glass_armies', { kind: 'unitHp', bp: 7000 }],
      [3, 'power_hour', { kind: 'powerCharge', bp: 20000 }],
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

  it('pays ladder wins by format from 400 trophies (A15.8)', () => {
    expect(arenas.ladder.winByFormat).toEqual({
      fromTrophies: 400,
      formats: {
        short: { trophies: 26, amber: 20, amberWithoutCharge: 40 },
        standard: { trophies: 31, amber: 27, amberWithoutCharge: 54 },
        full: { trophies: 36, amber: 35, amberWithoutCharge: 70 },
      },
    });
  });
});

describe('Cosmetics and skins (A5.8)', () => {
  it('has banners from the arena gates, frames from Codex levels and 13 titles plus 4 feat titles', () => {
    expect(cosmetics.banners.map((b) => b.id)).toEqual(['tar_pit', 'frostfang', 'moat', 'harbor', 'barbed', 'neon', 'starfield', 'rift']);
    for (const b of cosmetics.banners.slice(1)) {
      expect(arenas.list[b.arena - 1]?.gateRewards).toContainEqual({ kind: 'banner', banner: b.id });
    }
    expect(cosmetics.frames.map((f) => f.codexLevel)).toEqual([5, 15, 25, 35, 45, 55, 65, 75]);
    expect(cosmetics.titles.map((t) => t.id)).toEqual([
      'recruit', 'firestarter', 'evolver', 'mammoth_tamer', 'collector', 'siege_scholar', 'last_stander', 'speedrunner',
      'veteran', 'curator', 'wardens_bane', 'conqueror', 'ageborn', 'the_stubborn', 'photo_finisher', 'stone_cold', 'keeper_of_ages',
    ]);
    expect(cosmetics.emotes.map((e) => e.id)).toEqual(['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg']);
    expect(cosmetics.defaults).toEqual({ banner: 'tar_pit', frame: 'none', title: 'recruit' });
  });

  it('has the 12 skins with targets and rarities', () => {
    expect(content.order.skins.map((s) => [s, content.skins[s]?.target, content.skins[s]?.rarity])).toEqual([
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
