import { describe, expect, it } from 'vitest';
import { createSim } from '../createSim';
import { devSetBaseBp, devSetGold, devSetPower, devSetXp, stepN } from '../debug';
import { Stamper, arena, matchConfig, ofKind } from './helpers';

describe('evolving (A2.4)', () => {
  it('needs XP ≥ the threshold; 2.5 s Ascension; XP −= threshold; the tray swaps', () => {
    const sim = arena();
    const st = new Stamper(sim);
    expect(ofKind(st.step({ t: 'evolve', side: 0 }), 'commandRejected')[0]?.reason).toBe('notEnoughXp');
    devSetXp(sim, 0, 750);
    const ev = [...st.step({ t: 'evolve', side: 0 })];
    expect(ofKind(ev, 'ascendStart')[0]?.age).toBe('medieval');
    expect(ofKind(st.step({ t: 'evolve', side: 0 }), 'commandRejected')[0]?.reason).toBe('ascending');
    ev.push(...stepN(sim, 50));
    const up = ofKind(ev, 'ageUp')[0];
    expect(up?.tick).toBe((ofKind(ev, 'ascendStart')[0]?.tick ?? 0) + 50);
    expect(sim.state.sides[0].ageIndex).toBe(1);
    // 750 + 52 ticks × 0.2 passive (ticks 2-53) − 700; the cap was 1,050
    expect(sim.state.sides[0].xp).toBe(750000 + 52 * 200 - 700000);
    expect(sim.observe(0).me.tray[0]).toBe('footman');
  });

  it('base HP keeps its percentage, then heals 5% of the new max', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetBaseBp(sim, 0, 5000);
    devSetXp(sim, 0, 700);
    st.step({ t: 'evolve', side: 0 });
    stepN(sim, 50);
    expect(sim.state.sides[0].baseMaxHp).toBe(1350000);
    expect(sim.state.sides[0].baseHp).toBe(675000 + 67500);
  });

  it('Age Power charge is capped at 50% across an evolve', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetPower(sim, 0, 900000);
    devSetXp(sim, 0, 700);
    st.step({ t: 'evolve', side: 0 });
    stepN(sim, 50);
    expect(sim.state.sides[0].powerPpm).toBe(500000);
  });

  it('queue conversion keeps progress; 2 Vanguard Common Infantry spawn free', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    // Train two Tuskbacks: the second is still queued when the evolve lands.
    st.step({ t: 'train', side: 0, slot: 2 }, { t: 'train', side: 0, slot: 2 });
    stepN(sim, 90);
    devSetXp(sim, 0, 700);
    const ev = [...st.step({ t: 'evolve', side: 0 })];
    ev.push(...stepN(sim, 50));
    const conv = ofKind(ev, 'queueConverted');
    expect(conv).toEqual([expect.objectContaining({ from: 'tuskback', to: 'destrier_knight' })]);
    const item = sim.state.sides[0].queue[0];
    expect(item?.card).toBe('destrier_knight');
    expect(item?.progress).toBeGreaterThan(0);
    const vanguard = ofKind(ev, 'unitSpawned').filter((u) => u.summoned);
    expect(vanguard.map((v) => v.card)).toEqual(['footman', 'footman']);
    expect(vanguard[0]?.x).toBe(20000);
    const pop = sim.state.sides[0].pop;
    expect(pop).toBe(6); // the first Tuskback only; Vanguard uses no pop
  });

  it('no evolve past the format’s final age; Tutorial thresholds are 250 / 300 / 350 / 400', () => {
    const sim = createSim(matchConfig({ format: 'tutorial', training: { noClock: true } }));
    const st = new Stamper(sim);
    devSetXp(sim, 0, 250);
    expect(ofKind(st.step({ t: 'evolve', side: 0 }), 'ascendStart')).toHaveLength(1);
    const short = createSim(matchConfig({ format: 'short' }));
    const st2 = new Stamper(short);
    for (const xp of [700, 1000]) {
      devSetXp(short, 0, xp);
      st2.step({ t: 'evolve', side: 0 });
      stepN(short, 50);
    }
    expect(short.state.sides[0].ageIndex).toBe(2);
    devSetXp(short, 0, 1100);
    expect(ofKind(st2.step({ t: 'evolve', side: 0 }), 'commandRejected')[0]?.reason).toBe('finalAge');
  });
});
