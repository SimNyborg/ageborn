import { describe, expect, it } from 'vitest';
import type { Command, TimedCommand } from '@/contracts';
import { createSim } from '../createSim';
import { devSetBaseBp, devSetGold, devSpawn, simCtx, stepN } from '../debug';
import { arena, fixture, L, matchConfig, ofKind, sideConfig, Stamper, stun } from './helpers';

describe('formats and phases (A2.10)', () => {
  it('Short War: Overdrive 3:30, Siege 4:30 with base decay, Final Bell 6:00', () => {
    const sim = createSim(matchConfig({ format: 'short' }));
    const ev = stepN(sim, 7300);
    const phases = ofKind(ev, 'phaseChanged');
    expect(phases.map((p) => [p.phase, p.tick])).toEqual([
      ['overdrive', 4200],
      ['siege', 5400],
    ]);
    const decay = ofKind(ev, 'baseDamaged').filter((d) => d.sourceId === null);
    expect(decay[0]?.tick).toBe(5420);
    expect(decay[0]?.damage).toBe(5000); // 0.5% of 10,000 HP per second
    const end = ofKind(ev, 'matchEnded')[0];
    expect(end?.result).toMatchObject({ reason: 'finalBell', tick: 7200, winner: null });
    expect(sim.state.phase).toBe('ended');
    // after the end, step() does nothing
    expect(sim.step([])).toEqual([]);
  });

  it('Final Bell: a gap ≤ 0.5% (50 bp) is a draw, else the higher base HP% wins', () => {
    const run = (a: number, b: number) => {
      const sim = createSim(matchConfig({ format: 'short' }));
      simCtx(sim).finalBellTick = 5;
      devSetBaseBp(sim, 0, a);
      devSetBaseBp(sim, 1, b);
      return ofKind(stepN(sim, 5), 'matchEnded')[0]?.result.winner;
    };
    expect(run(5000, 4950)).toBeNull();
    expect(run(5000, 4949)).toBe(0);
    expect(run(3000, 9000)).toBe(1);
  });

  it('Sudden Siege starts Siege 1:15 earlier', () => {
    const sim = createSim(matchConfig({ format: 'short', modifiers: ['sudden_siege'] }));
    const ev = stepN(sim, 4000);
    expect(ofKind(ev, 'phaseChanged').find((p) => p.phase === 'siege')?.tick).toBe(3900);
  });

  it('a destroyed base loses; both on one tick is a draw', () => {
    const sim = arena();
    devSetBaseBp(sim, 1, 0);
    expect(ofKind(stepN(sim, 1), 'matchEnded')[0]?.result).toMatchObject({ winner: 0, reason: 'baseDestroyed' });
    const both = arena();
    devSetBaseBp(both, 0, 0);
    devSetBaseBp(both, 1, 0);
    expect(ofKind(stepN(both, 1), 'matchEnded')[0]?.result).toMatchObject({ winner: null, reason: 'bothDestroyed' });
  });

  it('retreat unlocks at 1:00 and counts as a loss; never in the Tutorial', () => {
    const sim = createSim(matchConfig({ format: 'short' }));
    const st = new Stamper(sim);
    expect(ofKind(st.step({ t: 'retreat', side: 0 }), 'commandRejected')[0]?.reason).toBe('retreatLocked');
    stepN(sim, 1200);
    const end = ofKind(st.step({ t: 'retreat', side: 0 }), 'matchEnded')[0];
    expect(end?.result).toMatchObject({ winner: 1, reason: 'retreat' });
    const tut = createSim(matchConfig({ format: 'tutorial' }));
    stepN(tut, 1300);
    expect(ofKind(new Stamper(tut).step({ t: 'retreat', side: 0 }), 'commandRejected')).toHaveLength(1);
  });
});

describe('Last Stand (A2.11)', () => {
  it('arms at ≤ 25%; tap → 1 s charge → volley within 450 lu for 200 × P × loadout, 80 lu knockback; once', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const near = devSpawn(sim, 1, 'bonker', { p: L - 300 });
    const air = devSpawn(sim, 1, 'gyrocopter', { p: L - 400 });
    const far = devSpawn(sim, 1, 'bonker', { p: L - 500 });
    const legend = devSpawn(sim, 1, 'mammoth_matriarch', { p: L - 200 });
    for (const u of [near, air, far, legend]) stun(sim, u.id, 1000);
    expect(ofKind(st.step({ t: 'lastStand', side: 0 }), 'commandRejected')[0]?.reason).toBe('lastStandNotArmed');
    devSetBaseBp(sim, 0, 2500);
    expect(ofKind(stepN(sim, 1), 'lastStandArmed')).toHaveLength(1);
    const ev = [...st.step({ t: 'lastStand', side: 0 })];
    expect(ofKind(ev, 'lastStandCharge')).toHaveLength(1);
    ev.push(...stepN(sim, 20));
    expect(ofKind(ev, 'lastStandFire')).toHaveLength(1);
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceKind === 'lastStand');
    const byId = Object.fromEntries(hits.map((h) => [h.targetId, h.damage]));
    // 200 × P 1.00 at L1 → 200 HP; the Legendary takes 50%; the far Bonker (> 450 lu) is untouched
    expect(byId[near.id]).toBe(20000);
    expect(byId[air.id]).toBe(20000);
    expect(byId[legend.id]).toBe(10000);
    expect(byId[far.id]).toBeUndefined();
    const kb = ofKind(ev, 'knockback');
    expect(kb.some((k) => k.id === air.id)).toBe(false);
    expect(sim.state.sides[0].lastStand).toBe('used');
    expect(ofKind(st.step({ t: 'lastStand', side: 0 }), 'commandRejected')).toHaveLength(1);
  });

  it('fires automatically at 10%; manual Last Stand can be disabled (first matches)', () => {
    const sim = createSim(matchConfig({ training: { noClock: true, manualLastStand: [false, true] } }));
    const st = new Stamper(sim);
    devSetBaseBp(sim, 0, 2000);
    stepN(sim, 1);
    expect(ofKind(st.step({ t: 'lastStand', side: 0 }), 'commandRejected')[0]?.reason).toBe('lastStandAuto');
    devSetBaseBp(sim, 0, 1000);
    const ev = stepN(sim, 22);
    expect(ofKind(ev, 'lastStandCharge')).toHaveLength(1);
    expect(ofKind(ev, 'lastStandFire')).toHaveLength(1);
  });
});

describe('commands (B3 step 1)', () => {
  it('applies in (side, seq) order; future commands wait; late ones run now and are logged at that tick', () => {
    const sim = arena();
    devSetGold(sim, 0, 1000);
    const cmds: TimedCommand[] = [
      { t: 'train', side: 0, slot: 0, tick: 1, seq: 2 },
      { t: 'train', side: 0, slot: 1, tick: 1, seq: 1 },
      { t: 'train', side: 0, slot: 2, tick: 3, seq: 3 },
    ];
    sim.step(cmds);
    expect(sim.state.sides[0].queue.map((q) => q.card)).toEqual(['pebbler', 'bonker']);
    sim.step([]);
    expect(sim.state.sides[0].queue).toHaveLength(2);
    sim.step([{ t: 'emote', side: 1, emote: 'gg', tick: 1, seq: 1 }]);
    expect(sim.state.sides[0].queue.map((q) => q.card)).toEqual(['pebbler', 'bonker', 'tuskback']);
  });

  it('stance: 2 s cooldown; can be locked by training', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const ev = [
      ...st.step({ t: 'stance', side: 0, stance: 'hold' }),
      ...st.step({ t: 'stance', side: 0, stance: 'charge' }),
      ...st.step({ t: 'stance', side: 0, stance: 'charge' }),
    ];
    expect(ofKind(ev, 'stanceChanged')).toHaveLength(1);
    expect(ofKind(ev, 'commandRejected').map((r) => r.reason)).toEqual(['stanceCooldown', 'stanceCooldown']);
    stepN(sim, 40);
    expect(ofKind(st.step({ t: 'stance', side: 0, stance: 'charge' }), 'stanceChanged')).toHaveLength(1);
    const locked = createSim(matchConfig({ training: { stanceEnabled: [false, true] } }));
    expect(ofKind(new Stamper(locked).step({ t: 'stance', side: 0, stance: 'hold' }), 'commandRejected')[0]?.reason).toBe(
      'stanceLocked',
    );
  });

  it('mounts: 1 free, then 150 / 350 / 700; building needs an owned, empty mount', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 2000);
    const ev = [
      ...st.step({ t: 'buildTurret', side: 0, mount: 1, slot: 0 }),
      ...st.step({ t: 'buyMount', side: 0 }, { t: 'buyMount', side: 0 }, { t: 'buyMount', side: 0 }, { t: 'buyMount', side: 0 }),
    ];
    expect(ofKind(ev, 'commandRejected').map((r) => r.reason)).toEqual(['mountLocked', 'maxMounts']);
    expect(ofKind(ev, 'mountBought').map((m) => m.mount)).toEqual([1, 2, 3]);
    expect(sim.state.sides[0].gold).toBe(2000000 - 1200000 + 2 * 300);
  });

  it('emotes have a cooldown', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const ev = [...st.step({ t: 'emote', side: 1, emote: 'laugh' }), ...st.step({ t: 'emote', side: 1, emote: 'gg' })];
    expect(ofKind(ev, 'emote')).toHaveLength(1);
    expect(ofKind(ev, 'commandRejected')[0]?.reason).toBe('emoteCooldown');
  });

  it('unknown emote ids are rejected, so events only carry the six emotes', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const bad = { t: 'emote', side: 0, emote: 'dance' } as unknown as Command;
    const ev = st.step(bad);
    expect(ofKind(ev, 'emote')).toHaveLength(0);
    expect(ofKind(ev, 'commandRejected')[0]?.reason).toBe('badCommand');
  });
});

describe('observation (A7.1)', () => {
  it('shows the own gold, queue and tray, never the foe’s gold or queue; positions are relative', () => {
    const sim = createSim(matchConfig({ sides: [sideConfig(fixture), sideConfig(fixture, { isBot: true })] }));
    const st = new Stamper(sim);
    devSetGold(sim, 1, 1000);
    st.step({ t: 'train', side: 1, slot: 0 }, { t: 'buildTurret', side: 1, mount: 0, slot: 1 });
    stepN(sim, 30);
    const o = sim.observe(0);
    expect(o.me.gold).toBe(sim.state.sides[0].gold);
    expect(o.me.tray).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman']);
    expect(o.me.turretCards).toEqual(['rock_tosser', 'angry_beehive']);
    expect(o.me.power).toBe('stampede');
    expect(Object.keys(o.foe)).not.toContain('gold');
    expect(Object.keys(o.foe)).not.toContain('queue');
    expect(o.foe.turrets[0]).toEqual({ card: 'angry_beehive', age: 'stone' });
    expect(o.foe.scouted).toEqual(['angry_beehive', 'bonker']);
    // spawned at tick 30 at p = 20, walked 2 ticks × 4.375 lu: p = 28.75 lu from its own gate
    const o1 = sim.observe(1);
    expect(o1.units.find((u) => u.side === 1)?.p).toBe(28750);
    expect(o.units.find((u) => u.side === 1)?.p).toBe(L * 1000 - 28750);
    expect(o1.me.queue).toEqual([]);
  });
});

