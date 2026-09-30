import type { CompiledContent, MatchConfig, QueueItem, UnitDef } from '@/contracts';
import { fakeContent, fakeSideConfig } from '@/contracts/fakes/content';
import { FakeSim, fakeMatchConfig } from '@/contracts/fakes/sim';
import { describe, expect, it } from 'vitest';
import { HudModelBuilder, TrayUnlocks, buildHudModel, canEvolve, xpBarBp, xpThreshold } from '../hudModel';

const EXTRAS = { speed: 1 as const, paused: false };

/** Fake content with a Legendary in the Stone tray (slot 3). */
function withLegendary(): MatchConfig {
  const base = fakeContent.units['tuskback'] as UnitDef;
  const content: CompiledContent = {
    ...fakeContent,
    units: { ...fakeContent.units, matriarch: { ...base, id: 'matriarch', group: 'legendary', rarity: 'legendary', cost: 500 } },
  };
  const me = fakeSideConfig();
  const stone = me.loadouts.stone;
  if (stone) me.loadouts.stone = { ...stone, units: ['bonker', 'pebbler', 'tuskback', 'matriarch', null] };
  return { ...fakeMatchConfig(), content, sides: [me, fakeSideConfig({ isBot: true, label: 'AI Grogg' })] };
}

/** Fake content with an Anti-heavy card in the Stone tray (slot 3). */
function withAntiHeavy(): MatchConfig {
  const base = fakeContent.units['bonker'] as UnitDef;
  const content: CompiledContent = {
    ...fakeContent,
    units: { ...fakeContent.units, spearman: { ...base, id: 'spearman', group: 'antiArmor', role: 'antiArmor', rarity: 'rare', cost: 100 } },
  };
  const me = fakeSideConfig();
  const stone = me.loadouts.stone;
  if (stone) me.loadouts.stone = { ...stone, units: ['bonker', 'pebbler', 'tuskback', 'spearman', null] };
  return { ...fakeMatchConfig(), content, sides: [me, fakeSideConfig({ isBot: true, label: 'AI Grogg' })] };
}

function q(card: string, o: Partial<QueueItem> = {}): QueueItem {
  return { card, group: 'infantry', progress: 0, total: 30, waiting: false, ...o };
}

describe('HUD model (A9.2)', () => {
  it('the counter hint: an Anti-heavy card beats Heavy while the enemy fields Heavies (owner feedback 2026-09-29)', () => {
    const sim = new FakeSim({ config: withAntiHeavy() });
    const foe = (card: string, id: number) => ({ id, side: 1, card, level: 1, x: 1_500_000, prevX: 1_500_000, hp: 100_000, maxHp: 100_000, shield: 0, innateShield: 0, mode: 'walk', attacks: [], statuses: [], air: false, summoned: false, timers: [], lastDamageTick: 0 }) as never;
    sim.state.units = [foe('bonker', 900)];
    let m = buildHudModel(sim, EXTRAS);
    expect(m.foe.heavyThreat).toBe(false);
    expect(m.me.cards.some((c) => c.beatsHeavy)).toBe(false);
    sim.state.units = [foe('tuskback', 901), foe('tuskback', 902), foe('bonker', 903)];
    m = buildHudModel(sim, EXTRAS);
    expect(m.foe.heavyThreat).toBe(true);
    expect(m.me.cards.filter((c) => c.beatsHeavy).map((c) => c.card)).toEqual(['spearman']);
    // Own Heavies never trigger it.
    sim.state.units = [{ ...(foe('tuskback', 904) as object), side: 0 } as never, { ...(foe('tuskback', 905) as object), side: 0 } as never];
    expect(buildHudModel(sim, EXTRAS).foe.heavyThreat).toBe(false);
  });

  it('reports gold, income (Economy research, A18.5.4), base HP, clock and phase marks', () => {
    const sim = new FakeSim();
    sim.state.tick = 600;
    sim.state.sides[0].gold = 212_345;
    // Granary owned (pick 0 of the fake War Council)
    sim.state.sides[0].research.owned = [0];
    sim.state.sides[0].treasury = 1;
    sim.state.sides[0].baseHp = 400_000;
    const m = buildHudModel(sim, EXTRAS);
    expect(m.clockMs).toBe(30_000);
    expect(m.me.gold).toBe(212);
    expect(m.me.goldPerSec).toBe(7.5);
    // Market is rank II: the fake observation opens rank I only
    expect(m.me.nextTreasuryCost).toBeNull();
    expect(m.me.baseHpBp).toBe(4000);
    expect(m.phaseMarks).toEqual({ overdriveMs: 210_000, siegeMs: 270_000, finalBellMs: 360_000 });
    sim.state.phase = 'overdrive';
    expect(buildHudModel(sim, EXTRAS).me.goldPerSec).toBe(13.5);
    sim.state.sides[0].research.owned = [];
    expect(buildHudModel(sim, EXTRAS).me.nextTreasuryCost).toBe(150);
    expect(buildHudModel(sim, EXTRAS).me.nextIncome).toEqual({ track: 'economy', rank: 1, pick: 0 });
  });

  it('carries both War Councils, the underdog discount, the Hold flag and the stance wait (A18.4.2, A18.5.7)', () => {
    const sim = new FakeSim();
    sim.state.tick = 100;
    const me = sim.state.sides[0];
    me.research.cur = 0;
    me.research.startTick = 60;
    me.research.endTick = 260;
    me.stance = 'hold';
    me.holdP = 560_000;
    me.stanceReadyTick = 130;
    const m = buildHudModel(sim, EXTRAS);
    expect(m.me.research?.current).toBe(sim.config.content.research.picks[0]?.id);
    expect(m.me.research?.leftMs).toBe(8000);
    expect(m.me.holdP).toBe(560);
    expect(m.me.stanceWaitMs).toBe(1500);
    expect(m.me.research?.discount).toBe(false);
    expect(m.foe.research?.current).toBeNull();
    // Behind by 20+ points of base HP: research costs less (A18.5.1).
    me.baseHp = Math.floor(me.baseMaxHp * 0.7);
    expect(buildHudModel(sim, EXTRAS).me.research?.discount).toBe(true);
    me.baseHp = me.baseMaxHp;
    // Behind in age position.
    sim.state.sides[1].ageIndex = 1;
    expect(buildHudModel(sim, EXTRAS).me.research?.discount).toBe(true);
  });

  it('labels the opponent as AI and lists what it has scouted', () => {
    const sim = new FakeSim();
    for (let i = 0; i < 3; i++) sim.step([]);
    const m = buildHudModel(sim, EXTRAS);
    expect(m.foe.isAI).toBe(true);
    expect(m.foe.label).toContain('AI');
    expect(m.foe.scouted).toEqual(['pebbler']);
  });

  it('gives every card state: ready, unaffordable, armyFull, legendaryInField, empty', () => {
    const cfg = withLegendary();
    const sim = new FakeSim({ config: cfg });
    const s = sim.state.sides[0];
    s.gold = 100_000;
    s.queue = [q('bonker', { progress: 15, total: 30 }), q('pebbler', { waiting: true, group: 'ranged', progress: 40, total: 40 }), q('bonker')];
    let m = buildHudModel(sim, EXTRAS);
    const [bonker, pebbler, tusk, matriarch, empty] = m.me.cards;
    expect(bonker).toMatchObject({ card: 'bonker', cost: 50, queued: 2, state: 'ready' });
    expect(pebbler).toMatchObject({ state: 'armyFull', trainFillBp: 10000, queued: 1 });
    // The first non-waiting item trains: the Bonker at 50%.
    expect(bonker?.trainFillBp).toBe(5000);
    expect(tusk).toMatchObject({ state: 'unaffordable', cost: 150 });
    expect(matriarch).toMatchObject({ state: 'unaffordable' });
    expect(empty).toMatchObject({ card: null, state: 'empty' });
    s.gold = 900_000;
    sim.state.units.push({ ...sim.state.units[0], id: 50, side: 0, card: 'matriarch', summoned: false } as never);
    m = buildHudModel(sim, EXTRAS);
    expect(m.me.cards[3]?.state).toBe('legendaryInField');
    // A full queue of 5 blocks training.
    s.queue = [q('bonker'), q('bonker'), q('bonker'), q('bonker'), q('bonker')];
    expect(buildHudModel(sim, EXTRAS).me.cards[0]?.state).toBe('unaffordable');
  });

  it('passes foils through and marks the Legendary as in field while one is queued', () => {
    const cfg = withLegendary();
    const sim = new FakeSim({ config: cfg });
    sim.state.sides[0].gold = 900_000;
    sim.state.sides[0].queue = [q('matriarch', { group: 'legendary', total: 140 })];
    const m = buildHudModel(sim, { ...EXTRAS, foils: { bonker: 'holo' } });
    expect(m.me.cards[0]?.foil).toBe('holo');
    expect(m.me.cards[3]?.state).toBe('legendaryInField');
  });

  it('computes XP, Evolve readiness (steady, never while ascending) and the final age', () => {
    const sim = new FakeSim();
    const cfg = sim.config;
    expect(xpThreshold(cfg, 0)).toBe(550);
    expect(xpThreshold(cfg, 1)).toBeNull(); // Medieval is the fake format's last age
    sim.state.sides[0].xp = 275_000;
    expect(buildHudModel(sim, EXTRAS).me.xpBp).toBe(5000);
    expect(canEvolve(sim.state, cfg, 0)).toBe(false);
    sim.state.sides[0].xp = 800_000;
    expect(buildHudModel(sim, EXTRAS).me.evolveReady).toBe(true);
    sim.state.sides[0].ascendUntil = sim.state.tick + 10;
    const asc = buildHudModel(sim, EXTRAS);
    expect(asc.me.evolveReady).toBe(false);
    expect(asc.me.ascending).toBe(true);
    // Final age: the bar measures toward Overcharge (1,200 XP).
    expect(xpBarBp(cfg, 1, 600_000)).toBe(5000);
  });

  it('follows the Daily Challenge modifiers as the sim does (A9.1): Fast Forward, Heavy Metal, Gold Rush, Sudden Siege', () => {
    const sim = new FakeSim({ config: { ...fakeMatchConfig(), modifiers: ['fast_forward', 'heavy_metal', 'gold_rush', 'sudden_siege'] } });
    const cfg = sim.config;
    // Fast Forward: 550 × 0.7 = 385 XP, so Evolve is ready (and the bar full) at 385, not 550.
    expect(xpThreshold(cfg, 0)).toBe(385);
    sim.state.sides[0].xp = 400_000;
    const m = buildHudModel(sim, EXTRAS);
    expect(m.me.evolveReady).toBe(true);
    expect(m.me.xpBp).toBe(10389);
    // Heavy Metal: the Tuskback (Heavy, 150) costs 105 and is affordable with 110 gold.
    sim.state.sides[0].gold = 110_000;
    const cards = buildHudModel(sim, EXTRAS).me.cards;
    expect(cards[2]?.cost).toBe(105);
    expect(cards[2]?.state).toBe('ready');
    expect(cards[0]?.cost).toBe(50);
    // Gold Rush: 6 × 1.5 = 9 gold/s; Sudden Siege: the Siege mark moves 1:15 earlier.
    expect(m.me.goldPerSec).toBe(9);
    expect(m.phaseMarks.siegeMs).toBe(270_000 - 75_000);
  });

  it('reports mounts, outdated turrets, stance, Last Stand and retreat', () => {
    const sim = new FakeSim();
    const s = sim.state.sides[0];
    s.mountsOwned = 2;
    s.ageIndex = 1;
    s.turrets[0] = { card: 'rock_tosser', age: 'stone', level: 1, state: 'active', readyTick: 0, attack: { targetId: 0, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 } };
    s.lastStand = 'armed';
    sim.state.sides[1].lastStand = 'armed';
    sim.state.tick = 1200;
    const m = buildHudModel(sim, EXTRAS);
    expect(m.mounts[0]).toEqual({ index: 0, owned: true, card: 'rock_tosser', outdated: true, state: 'active' });
    expect(m.mounts[1]).toEqual({ index: 1, owned: true, card: null, outdated: false, state: 'empty' });
    expect(m.mounts[2]?.owned).toBe(false);
    expect(m.me.lastStand).toBe('armed');
    expect(m.me.lastStandManual).toBe(true);
    expect(m.me.stanceVisible).toBe(true);
    expect(m.foe.lastStandArmed).toBe(true);
    expect(m.canRetreat).toBe(true);
    sim.state.tick = 100;
    expect(buildHudModel(sim, EXTRAS).canRetreat).toBe(false);
  });

  it('follows the onboarding flags: no clock, hidden stance, automatic Last Stand, tray unlocks', () => {
    const cfg: MatchConfig = {
      ...fakeMatchConfig(),
      format: 'tutorial',
      training: {
        noClock: true,
        stanceEnabled: [false, false],
        manualLastStand: [false, false],
        trays: { stone: [0] },
        script: [{ tick: 5, side: 0, unlockSlot: 1 }],
      },
    };
    const sim = new FakeSim({ config: cfg });
    const b = new HudModelBuilder(sim);
    let m = b.build(EXTRAS);
    expect(m.phaseMarks).toEqual({ overdriveMs: null, siegeMs: null, finalBellMs: null });
    expect(m.me.stanceVisible).toBe(false);
    expect(m.me.lastStandManual).toBe(false);
    expect(m.canRetreat).toBe(false);
    expect(m.me.cards.map((c) => c.state === 'empty')).toEqual([false, true, true, true, true, true]);
    for (let i = 0; i < 6; i++) {
      sim.step([]);
      b.afterStep();
    }
    m = b.build(EXTRAS);
    expect(m.me.cards.map((c) => c.state === 'empty')).toEqual([false, false, true, true, true, true]);
    // Trays only restrict the learner (side 0).
    expect(new TrayUnlocks(cfg).unlocked(1, 'stone', 4)).toBe(true);
  });

  it('rebuilds at most at 15 Hz unless forced', () => {
    const sim = new FakeSim();
    const b = new HudModelBuilder(sim);
    expect(b.update(0, EXTRAS)).not.toBeNull();
    expect(b.update(30, EXTRAS)).toBeNull();
    expect(b.update(67, EXTRAS)).not.toBeNull();
    expect(b.update(70, EXTRAS, true)).not.toBeNull();
  });
});
