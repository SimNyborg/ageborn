import { describe, expect, it } from 'vitest';
import { createSim } from '../createSim';
import { devSetGold, devSetXp, devSpawn, simCtx, stepN } from '../debug';
import { Stamper, arena, matchConfig, ofKind } from './helpers';

describe('training (A2.7)', () => {
  it('pays on enqueue and spawns at p = 20 after the train time (Infantry 1.5 s = 30 ticks)', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const ev = [...st.step({ t: 'train', side: 0, slot: 0 })];
    expect(sim.state.sides[0].gold).toBe(125000 + 300);
    expect(sim.state.sides[0].queue[0]?.card).toBe('bonker');
    ev.push(...stepN(sim, 30));
    const spawned = ofKind(ev, 'unitSpawned')[0];
    expect(spawned?.tick).toBe(30);
    expect(spawned?.card).toBe('bonker');
    expect(spawned?.x).toBe(20000);
    expect(sim.state.sides[0].pop).toBe(2);
    // side 1 spawns at its own p = 20
    st.step({ t: 'train', side: 1, slot: 0 });
    const s1 = ofKind(stepN(sim, 30), 'unitSpawned')[0];
    expect(s1?.x).toBe(1180000);
  });

  it('rejects empty slots, unaffordable cards and a full queue of 5', () => {
    const sim = createSim(matchConfig({ training: { noClock: true } }));
    const st = new Stamper(sim);
    const ctx = simCtx(sim);
    (ctx.cfg.sides[0].loadouts.stone as { units: (string | null)[] }).units[4] = null;
    devSetGold(sim, 0, 10000);
    const ev = [
      ...st.step({ t: 'train', side: 0, slot: 4 }),
      ...st.step(...[0, 0, 0, 0, 0, 0].map(() => ({ t: 'train' as const, side: 0 as const, slot: 0 as const }))),
    ];
    const reasons = ofKind(ev, 'commandRejected').map((r) => r.reason);
    expect(reasons).toEqual(['emptySlot', 'queueFull']);
    const sim2 = arena();
    devSetGold(sim2, 0, 10);
    expect(ofKind(new Stamper(sim2).step({ t: 'train', side: 0, slot: 0 }), 'commandRejected')[0]?.reason).toBe('noGold');
  });

  it('cancelTrain removes the last queued instance of that card (or the last item) with a full refund', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    st.step(
      { t: 'train', side: 0, slot: 0 },
      { t: 'train', side: 0, slot: 1 },
      { t: 'train', side: 0, slot: 0 },
      { t: 'train', side: 0, slot: 2 },
    );
    const g = sim.state.sides[0].gold;
    st.step({ t: 'cancelTrain', side: 0, slot: 0 });
    expect(sim.state.sides[0].queue.map((q) => q.card)).toEqual(['bonker', 'pebbler', 'tuskback']);
    expect(sim.state.sides[0].gold - g).toBe(50000 + 300);
    st.step({ t: 'cancelTrain', side: 0 });
    expect(sim.state.sides[0].queue.map((q) => q.card)).toEqual(['bonker', 'pebbler']);
    const rej = st.step({ t: 'cancelTrain', side: 0, slot: 3 });
    expect(ofKind(rej, 'commandRejected')[0]?.reason).toBe('nothingToCancel');
  });

  it('pop cap 60: a finished item that does not fit waits (ARMY FULL) and the next one trains and spawns', () => {
    const sim = arena();
    const st = new Stamper(sim);
    // 9 Tuskbacks and a Bonker = 56 pop on the lane
    for (let i = 0; i < 9; i += 1) devSpawn(sim, 0, 'tuskback', { p: 20 + i });
    devSpawn(sim, 0, 'bonker', { p: 30 });
    expect(sim.state.sides[0].pop).toBe(56);
    devSetGold(sim, 0, 1000);
    st.step({ t: 'train', side: 0, slot: 2 }, { t: 'train', side: 0, slot: 0 });
    const ev = stepN(sim, 120);
    const q = sim.state.sides[0].queue;
    expect(q).toHaveLength(1);
    expect(q[0]?.card).toBe('tuskback');
    expect(q[0]?.waiting).toBe(true);
    expect(ofKind(ev, 'unitSpawned').map((u) => u.card)).toEqual(['bonker']);
    expect(sim.state.sides[0].pop).toBe(58);
  });

  it('legendary limit: one Legendary alive or queued per side', () => {
    const sim = createSim(
      matchConfig({
        training: { noClock: true },
      }),
    );
    const ctx = simCtx(sim);
    (ctx.cfg.sides[0].loadouts.stone as { units: (string | null)[] }).units[4] = 'mammoth_matriarch';
    const st = new Stamper(sim);
    devSetGold(sim, 0, 2000);
    const ev = st.step({ t: 'train', side: 0, slot: 4 }, { t: 'train', side: 0, slot: 4 });
    expect(ofKind(ev, 'commandRejected')[0]?.reason).toBe('legendaryLimit');
    stepN(sim, 150);
    expect(sim.state.units.filter((u) => u.card === 'mammoth_matriarch')).toHaveLength(1);
    const ev2 = st.step({ t: 'train', side: 0, slot: 4 });
    expect(ofKind(ev2, 'commandRejected')[0]?.reason).toBe('legendaryLimit');
  });

  it('tutorial trays lock slots for the learner until a script unlockSlot', () => {
    const sim = createSim(
      matchConfig({
        training: { noClock: true, trays: { stone: [0] }, script: [{ tick: 5, side: 0, unlockSlot: 1, grantGold: 150 }] },
      }),
    );
    const st = new Stamper(sim);
    expect(ofKind(st.step({ t: 'train', side: 0, slot: 1 }), 'commandRejected')[0]?.reason).toBe('lockedSlot');
    // the bot side is not restricted
    expect(ofKind(st.step({ t: 'train', side: 1, slot: 1 }), 'commandRejected')).toHaveLength(0);
    expect(sim.observe(0).me.tray).toEqual(['bonker', null, null, null, null]);
    stepN(sim, 2);
    const g = sim.state.sides[0].gold;
    stepN(sim, 1);
    expect(sim.state.sides[0].gold - g).toBe(150000 + 300);
    expect(ofKind(st.step({ t: 'train', side: 0, slot: 1 }), 'commandRejected')).toHaveLength(0);
  });

  it('training pauses during Ascension; cards trained during it use the old age', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetXp(sim, 0, 700);
    devSetGold(sim, 0, 1000);
    st.step({ t: 'evolve', side: 0 }, { t: 'train', side: 0, slot: 0 });
    expect(sim.state.sides[0].queue[0]?.card).toBe('bonker');
    stepN(sim, 20);
    expect(sim.state.sides[0].queue[0]?.progress).toBe(0);
  });
});
