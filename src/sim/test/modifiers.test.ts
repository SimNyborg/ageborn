import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '@/contracts';
import { content as realContent } from '@/content';
import { fakeContent } from '@/contracts/fakes/content';
import { createSim } from '../createSim';
import { devSetXp, stepN } from '../debug';
import { DAILY_MODIFIERS, matchMods } from '../modifiers';
import { Stamper, fixture, matchConfig, ofKind } from './helpers';

describe('Daily Challenge modifiers (A9.1)', () => {
  it('parses known ids and ignores unknown ones', () => {
    const m = matchMods(['gold_rush', 'nope', 'constructor']);
    expect(m.passiveGoldBp).toBe(15000);
    expect(m.unitHpBp).toBe(10000);
  });

  it('Gold Rush: passive gold ×1.5; Power Hour: charge ×2', () => {
    const sim = createSim(matchConfig({ modifiers: ['gold_rush', 'power_hour'] }));
    stepN(sim, 20);
    expect(sim.state.sides[0].gold).toBe(175000 + 9000);
    expect(sim.state.sides[0].powerPpm).toBe(40000);
  });

  it('Glass Armies: unit HP ×0.7; Heavy Metal: Heavy and Legendary cost −30%', () => {
    const sim = createSim(matchConfig({ modifiers: ['glass_armies', 'heavy_metal'] }));
    const st = new Stamper(sim);
    const ev = st.step({ t: 'train', side: 0, slot: 2 });
    expect(ofKind(ev, 'commandRejected')).toHaveLength(0);
    // Tuskback: 150 → 105 gold
    expect(sim.state.sides[0].gold).toBe(175000 - 105000 + 300);
    const spawned = ofKind(stepN(sim, 80), 'unitSpawned')[0];
    const u = sim.state.units.find((x) => x.id === spawned?.id);
    expect(u?.maxHp).toBe(39200);
  });

  it('Fast Forward: XP thresholds ×0.7', () => {
    const sim = createSim(matchConfig({ modifiers: ['fast_forward'] }));
    const st = new Stamper(sim);
    devSetXp(sim, 0, 489);
    expect(ofKind(st.step({ t: 'evolve', side: 0 }), 'commandRejected')).toHaveLength(1);
    devSetXp(sim, 0, 490);
    expect(ofKind(st.step({ t: 'evolve', side: 0 }), 'ascendStart')).toHaveLength(1);
  });

  it('Sudden Siege: a negative siege shift starts Siege earlier (Short War 4:30 → 3:15)', () => {
    expect(matchMods(['sudden_siege']).siegeEarlierMs).toBe(75000);
    const sim = createSim(matchConfig({ format: 'short', modifiers: ['sudden_siege'] }));
    const ev = stepN(sim, 3900);
    expect(ofKind(ev, 'phaseChanged').find((p) => p.phase === 'siege')?.tick).toBe(3900);
  });
});

describe('modifier effects are content data (CLAUDE.md "Content is data")', () => {
  /** A copy of the fixture content that carries its own modifier table, like WP1's compiled content. */
  function withTable(list: Record<string, { effect: unknown }>): CompiledContent {
    return { ...fixture, dailyModifiers: { order: Object.keys(list), list } };
  }

  it('reads the effects from `content.dailyModifiers` when the content has a table', () => {
    const c = withTable({
      gold_rush: { effect: { kind: 'passiveGold', bp: 12000 } },
      heavy_metal: { effect: { kind: 'unitCost', groups: ['heavy'], bp: 8000 } },
      sudden_siege: { effect: { kind: 'siegeShift', ms: -30000 } },
    });
    const m = matchMods(['gold_rush', 'heavy_metal', 'sudden_siege', 'glass_armies'], c);
    expect(m.passiveGoldBp).toBe(12000);
    expect(m.costBp.heavy).toBe(8000);
    expect(m.costBp.legendary).toBe(10000);
    expect(m.siegeEarlierMs).toBe(30000);
    // not in this content's table: ignored, never taken from the built-in defaults
    expect(m.unitHpBp).toBe(10000);
    // the match uses them: 6 gold/s × 1.2 = 7.2 gold/s
    const sim = createSim(matchConfig({ content: c, modifiers: ['gold_rush'] }));
    stepN(sim, 20);
    expect(sim.state.sides[0].gold).toBe(175000 + 7200);
  });

  it('ignores malformed effects in a content table', () => {
    const c = withTable({
      gold_rush: { effect: { kind: 'passiveGold', bp: 'lots' } },
      power_hour: { effect: { kind: 'somethingNew', bp: 20000 } },
      glass_armies: { effect: null },
    });
    const m = matchMods(['gold_rush', 'power_hour', 'glass_armies'], c);
    expect(m).toEqual(matchMods([], c));
  });

  it('WP1’s compiled content holds the A9.1 numbers the frozen defaults hold', () => {
    for (const id of Object.keys(DAILY_MODIFIERS)) expect(matchMods([id], realContent), id).toEqual(matchMods([id]));
  });

  it('content without a modifier table (the fixture, the contract fakes) uses the A9.1 defaults', () => {
    expect(matchMods(['gold_rush'], fixture).passiveGoldBp).toBe(15000);
    expect(matchMods(['glass_armies'], fakeContent).unitHpBp).toBe(7000);
  });
});
