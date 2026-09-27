import { describe, expect, it } from 'vitest';
import { createSim } from '../createSim';
import { devSetXp, stepN } from '../debug';
import { matchMods } from '../modifiers';
import { Stamper, matchConfig, ofKind } from './helpers';

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
});
