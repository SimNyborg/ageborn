import { describe, expect, it } from 'vitest';
import { devGrantResearch, devSetPower, devSetXp, devSpawn, simCtx, stepN, unitById } from '../debug';
import { arena, L, ofKind, Stamper, stun } from './helpers';

describe('gold and XP (A2.3, A2.4)', () => {
  it('passive income: 6 gold/s and 4 XP/s, reported once per second', () => {
    const sim = arena();
    const ev = stepN(sim, 20);
    expect(sim.state.sides[0].gold).toBe(175000 + 6000);
    expect(sim.state.sides[1].xp).toBe(4000);
    const g = ofKind(ev, 'goldEarned').filter((e) => e.side === 0);
    expect(g).toEqual([{ e: 'goldEarned', side: 0, amount: 6000, reason: 'passive', tick: 20 }]);
  });

  it('Overdrive doubles base passive gold and XP, not Economy research income; power charge ×1.25', () => {
    const sim = arena();
    devGrantResearch(sim, 0, 'economy.granary');
    const ctx = simCtx(sim);
    ctx.overdriveTick = 2;
    stepN(sim, 1);
    const g0 = sim.state.sides[0].gold;
    const p0 = sim.state.sides[0].powerPpm;
    stepN(sim, 1);
    expect(sim.state.phase).toBe('overdrive');
    // 600 base (×2) + 75 Granary (A18.5.4: never doubled)
    expect(sim.state.sides[0].gold - g0).toBe(675);
    expect(sim.state.sides[0].powerPpm - p0).toBe(1250);
  });

  it('XP cap: 1.5 × the threshold (1,050 in Stone)', () => {
    const sim = arena();
    devSetXp(sim, 0, 1049);
    stepN(sim, 20);
    expect(sim.state.sides[0].xp).toBe(1050000);
  });

  it('Overcharge: in the final age every 1,200 XP becomes +25% charge while below 100%', () => {
    const sim = arena({ format: 'short' });
    const ctx = simCtx(sim);
    ctx.s.sides[0].ageIndex = 2; // Gunpowder is the last age of Short War
    devSetXp(sim, 0, 1199);
    devSetPower(sim, 0, 100000);
    stepN(sim, 1);
    // 1,199 + 0.2 = 1,199.2 → no conversion yet
    expect(sim.state.sides[0].powerPpm).toBe(101000);
    stepN(sim, 4);
    expect(sim.state.sides[0].xp).toBeLessThan(1000);
    expect(sim.state.sides[0].powerPpm).toBeGreaterThanOrEqual(355000);
  });

  function killWith(o: { killer: string; victim: string; summoned?: boolean; victimLevel?: number; power?: boolean }) {
    const sim = arena();
    const v = devSpawn(sim, 1, o.victim, { p: L - 60, summoned: o.summoned ?? false });
    stun(sim, v.id, 1000);
    const ctx = simCtx(sim);
    const vu = unitById(sim, v.id);
    if (vu) vu.hp = 100;
    devSpawn(sim, 0, o.killer, { p: 20 });
    const ev = stepN(sim, 60);
    return { ev, died: ofKind(ev, 'died').find((d) => d.id === v.id), ctx };
  }

  it('unit kill: 60% gold and 100% XP to the killer; the owner gets 40% XP; summons pay nothing', () => {
    const { ev, died } = killWith({ killer: 'bonker', victim: 'tuskback' });
    expect(died?.bountyGold).toBe(90000);
    expect(died?.bountyXp).toBe(150000);
    expect(ofKind(ev, 'goldEarned').find((g) => g.reason === 'bounty')).toMatchObject({ side: 0, amount: 90000 });
    expect(ofKind(ev, 'xpEarned').find((x) => x.reason === 'loss')).toMatchObject({ side: 1, amount: 60000 });
    const s = killWith({ killer: 'bonker', victim: 'tuskback', summoned: true });
    expect(s.died?.bountyGold).toBe(0);
    expect(ofKind(s.ev, 'xpEarned').filter((x) => x.reason !== 'passive')).toHaveLength(0);
  });

  it('underdog: +50% gold and XP for a higher-age victim, off while the killer can evolve', () => {
    const { died } = killWith({ killer: 'bonker', victim: 'footman' });
    expect(died?.bountyGold).toBe(45000);
    expect(died?.bountyXp).toBe(75000);
    const sim = arena();
    devSetXp(sim, 0, 800);
    const v = devSpawn(sim, 1, 'footman', { p: L - 60 });
    stun(sim, v.id, 1000);
    const vu = unitById(sim, v.id);
    if (vu) vu.hp = 100;
    devSpawn(sim, 0, 'bonker', { p: 20 });
    const d = ofKind(stepN(sim, 60), 'died')[0];
    expect(d?.bountyGold).toBe(30000);
  });

  it('power and Last Stand kills pay 30% gold and no XP', () => {
    const sim = arena();
    const v = devSpawn(sim, 1, 'tuskback', { p: L - 400 });
    stun(sim, v.id, 1000);
    const vu = unitById(sim, v.id);
    if (vu) vu.hp = 100;
    devSetPower(sim, 0, 1000000);
    const st = new Stamper(sim);
    const ev = [...st.step({ t: 'power', side: 0, p: 400 })];
    ev.push(...stepN(sim, 60));
    const d = ofKind(ev, 'died').find((x) => x.id === v.id);
    expect(d?.killerKind).toBe('power');
    expect(d?.killerId).toBeNull();
    expect(d?.bountyGold).toBe(45000);
    expect(d?.bountyXp).toBe(0);
  });
});
