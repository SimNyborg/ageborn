import { describe, expect, it } from 'vitest';
import { devSpawn, simCtx, stepN, unitById } from '../debug';
import { arena, ofKind, pLu, stun } from './helpers';

function hurt(sim: ReturnType<typeof arena>, id: number, hp: number): void {
  const u = unitById(sim, id);
  if (u) u.hp = hp;
}

describe('heals (A2.7)', () => {
  it('a healer splits its pulse over the 2 lowest-HP% allies in radius, on the 10-tick grid', () => {
    const sim = arena();
    const friar = devSpawn(sim, 0, 'friar', { p: 100 });
    stun(sim, friar.id, 1); // keep it in place for a moment; heals start after the stun
    const a = devSpawn(sim, 0, 'bonker', { p: 150 });
    const b = devSpawn(sim, 0, 'bonker', { p: 150 });
    const c = devSpawn(sim, 0, 'bonker', { p: 150 });
    for (const u of [a, b, c]) stun(sim, u.id, 100);
    hurt(sim, a.id, 5000);
    hurt(sim, b.id, 8000);
    hurt(sim, c.id, 12000);
    const ev = stepN(sim, 10);
    const healed = ofKind(ev, 'healed');
    // 40 HP/s × 0.5 s = 20 HP per pulse, split over the 2 lowest: 10 HP each
    expect(healed.every((h) => h.tick % 10 === 0)).toBe(true);
    expect(healed.map((h) => [h.id, h.amount]).sort()).toEqual(
      [
        [a.id, 1000],
        [b.id, 1000],
      ].sort(),
    );
  });

  it('healers never stack: a unit receives only its single largest heal per pulse', () => {
    const sim = arena();
    const t = devSpawn(sim, 0, 'bonker', { p: 150 });
    stun(sim, t.id, 100);
    hurt(sim, t.id, 5000);
    devSpawn(sim, 0, 'friar', { p: 100 });
    devSpawn(sim, 0, 'field_surgeon', { p: 100 });
    const healed = ofKind(stepN(sim, 10), 'healed').filter((h) => h.id === t.id);
    // Friar alone: 20; Field Surgeon alone: 27.5 → 2,750 centi. Only the larger applies.
    expect(healed.map((h) => h.amount)).toEqual([2750]);
  });

  it('Legendaries receive 50% of healing; heals never exceed max HP', () => {
    const sim = arena();
    const m = devSpawn(sim, 0, 'mammoth_matriarch', { p: 150 });
    stun(sim, m.id, 100);
    const u = unitById(sim, m.id);
    if (u) u.hp = u.maxHp - 500;
    devSpawn(sim, 0, 'friar', { p: 60 });
    const healed = ofKind(stepN(sim, 10), 'healed').filter((h) => h.id === m.id);
    // 20 HP pool to one ally → 50% = 10 HP, capped at the missing 5 HP
    expect(healed.map((h) => h.amount)).toEqual([500]);
  });
});

describe('periodic abilities (A5)', () => {
  it('Ursa Roar: every 15 s while it has a target, the nearest 8 allies within 200 lu get a 60 HP shield for 6 s', () => {
    const sim = arena();
    const foe = devSpawn(sim, 1, 'tuskback', { p: 1200 - 200 });
    stun(sim, foe.id, 2000);
    const fu = unitById(sim, foe.id);
    if (fu) fu.hp = fu.maxHp = 100000000;
    const ursa = devSpawn(sim, 0, 'ursa_paladin', { p: 140 });
    const allies = Array.from({ length: 10 }, (_, i) => devSpawn(sim, 0, 'bonker', { p: 60 + i }));
    for (const a of allies) stun(sim, a.id, 2000);
    const ev = stepN(sim, 400);
    const roars = ofKind(ev, 'abilityUsed').filter((a) => a.ability === 'periodicShieldAura');
    expect(roars.length).toBe(2);
    expect((roars[1]?.tick ?? 0) - (roars[0]?.tick ?? 0)).toBe(300);
    const shields = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'shield' && s.tick === roars[0]?.tick);
    expect(shields).toHaveLength(8);
    expect(shields.every((s) => s.ms === 6000)).toBe(true);
    expect(shields.some((s) => s.id === ursa.id)).toBe(false);
  });

  it('Radio Operator: a called shell lands after 1 s as 120 splash r50 (area rule); one call-in per side per 3 s', () => {
    const sim = arena();
    const foes = [300, 320].map((p) => devSpawn(sim, 1, 'trench_raider', { p: 1200 - p }));
    for (const f of foes) stun(sim, f.id, 2000);
    const r1 = devSpawn(sim, 0, 'radio_operator', { p: 20 });
    const r2 = devSpawn(sim, 0, 'radio_operator', { p: 20 });
    const ev = stepN(sim, 200);
    const calls = ofKind(ev, 'abilityUsed').filter((a) => a.ability === 'callStrike');
    expect(calls[0]?.id).toBe(r1.id);
    expect(calls[1]?.id).toBe(r2.id);
    expect((calls[1]?.tick ?? 0) - (calls[0]?.tick ?? 0)).toBe(60);
    const shell = ofKind(ev, 'hit').filter((h) => h.sourceKind === 'ability' && h.tick === (calls[0]?.tick ?? 0) + 20);
    expect(shell.map((h) => h.damage)).toEqual([12000, 6000]);
  });

  it('EMP: strips shields from enemies within 120 lu and stuns mech enemies there for 1.5 s', () => {
    const sim = arena();
    const knight = devSpawn(sim, 1, 'photon_knight', { p: 1200 - 150 });
    const tank = devSpawn(sim, 1, 'tankette', { p: 1200 - 170 });
    stun(sim, knight.id, 5);
    devSpawn(sim, 0, 'emp_saboteur', { p: 60 });
    const ev = stepN(sim, 5);
    const used = ofKind(ev, 'abilityUsed').find((a) => a.ability === 'emp');
    expect(used).toBeDefined();
    expect(unitById(sim, knight.id)?.innateShield).toBe(0);
    const stuns = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'stun' && s.tick === used?.tick);
    expect(stuns.map((s) => s.id)).toEqual([tank.id]);
    expect(stuns[0]?.ms).toBe(1500);
  });

  it('Time Stop: enemies within 200 lu are frozen 1.5 s, Legendaries 0.75 s', () => {
    const sim = arena();
    const a = devSpawn(sim, 1, 'pulse_trooper', { p: 1200 - 300 });
    const l = devSpawn(sim, 1, 'behemoth_tank', { p: 1200 - 330 });
    devSpawn(sim, 0, 'chrono_titan', { p: 150 });
    const ev = stepN(sim, 3);
    const frozen = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'stun' && s.frozen);
    const byId = Object.fromEntries(frozen.map((s) => [s.id, s.ms]));
    expect(byId[a.id]).toBe(1500);
    expect(byId[l.id]).toBe(750);
  });

  it('Sabertooth Pounce: when blocked, leaps to the nearest ranged unit ≤ 150 lu beyond the blocker; first bite ×2', () => {
    const sim = arena();
    const blocker = devSpawn(sim, 1, 'tuskback', { p: 1200 - 200 });
    const archer = devSpawn(sim, 1, 'longbowman', { p: 1200 - 300 });
    stun(sim, blocker.id, 2000);
    stun(sim, archer.id, 2000);
    const s = devSpawn(sim, 0, 'sabertooth', { p: 160 });
    const ev = stepN(sim, 40);
    const leap = ofKind(ev, 'abilityUsed').find((a) => a.ability === 'pounce');
    expect(leap).toBeDefined();
    // landing at the target centre − (wT + wS)/2 = 300 − 28
    expect(leap?.x).toBe(272000);
    expect(pLu(sim, s.id)).toBe(272);
    const bite = ofKind(ev, 'hit').find((h) => h.sourceId === s.id && h.targetId === archer.id);
    expect(bite?.damage).toBe(6800);
  });

  it('Pounce without a target: no leap and no cooldown', () => {
    const sim = arena();
    const blocker = devSpawn(sim, 1, 'tuskback', { p: 1200 - 200 });
    stun(sim, blocker.id, 2000);
    const s = devSpawn(sim, 0, 'sabertooth', { p: 160 });
    stepN(sim, 30);
    expect(ofKind(stepN(sim, 1), 'abilityUsed')).toHaveLength(0);
    expect(unitById(sim, s.id)?.timers[0]).toBe(0);
  });

  it('Mammoth riders shoot as independent attacks; on death they jump off as 2 summoned Pebblers', () => {
    const sim = arena();
    const foe = devSpawn(sim, 1, 'bonker', { p: 1200 - 300 });
    stun(sim, foe.id, 2000);
    const m = devSpawn(sim, 0, 'mammoth_matriarch', { p: 150 });
    const ev = stepN(sim, 30);
    expect(ofKind(ev, 'attackStarted').filter((a) => a.id === m.id && a.attackIndex > 0).length).toBeGreaterThanOrEqual(2);
    hurt(sim, m.id, 0);
    const ctx = simCtx(sim);
    const mu = ctx.s.units.find((u) => u.id === m.id);
    if (mu) {
      mu.lastHitKind = 'unit';
      mu.lastHitSide = 1;
    }
    const ev2 = stepN(sim, 1);
    const summons = ofKind(ev2, 'unitSpawned');
    expect(summons.map((u) => [u.card, u.summoned])).toEqual([
      ['pebbler', true],
      ['pebbler', true],
    ]);
  });

  it('innate shield regenerates 30/s after 3 s without damage', () => {
    const sim = arena();
    const k = devSpawn(sim, 0, 'photon_knight', { p: 100 });
    stun(sim, k.id, 1000);
    const u = unitById(sim, k.id);
    if (u) {
      u.innateShield = 0;
      u.lastDamageTick = 0;
    }
    stepN(sim, 59);
    expect(unitById(sim, k.id)?.innateShield).toBe(0);
    stepN(sim, 2);
    expect(unitById(sim, k.id)?.innateShield).toBe(300);
  });

  it('Battering Ram: attacks units only while blocked, and hits the base for 160', () => {
    const sim = arena();
    const b = devSpawn(sim, 1, 'bonker', { p: 1200 - 200 });
    stun(sim, b.id, 2000);
    const ram = devSpawn(sim, 0, 'battering_ram', { p: 100 });
    const ev = stepN(sim, 80);
    const onUnit = ofKind(ev, 'hit').filter((h) => h.sourceId === ram.id);
    expect(onUnit[0]?.damage).toBe(1000);
    const sim2 = arena();
    devSpawn(sim2, 0, 'battering_ram', { p: 1200 - 40 });
    const base = ofKind(stepN(sim2, 60), 'baseDamaged');
    expect(base[0]?.damage).toBe(16000);
  });

  it('Balloon Admiral bombs ground enemies within ±40 lu and the base at the gate for 110', () => {
    const sim = arena();
    const f = devSpawn(sim, 1, 'bonker', { p: 1200 - 230 });
    stun(sim, f.id, 2000);
    const adm = devSpawn(sim, 0, 'balloon_admiral', { p: 200 });
    const ev = stepN(sim, 60);
    const bombs = ofKind(ev, 'hit').filter((h) => h.sourceId === adm.id);
    expect(bombs[0]?.damage).toBe(11000);
    const sim2 = arena();
    devSpawn(sim2, 0, 'balloon_admiral', { p: 1150 });
    expect(ofKind(stepN(sim2, 80), 'baseDamaged')[0]?.damage).toBe(11000);
  });

  it('Rifleman Suppressing Fire slows the target 15% for 1 s', () => {
    const sim = arena();
    const f = devSpawn(sim, 1, 'bonker', { p: 1200 - 300 });
    stun(sim, f.id, 2000);
    devSpawn(sim, 0, 'rifleman', { p: 100 });
    const st = ofKind(stepN(sim, 40), 'statusApplied').find((s) => s.kind === 'slow');
    expect(st?.ms).toBe(1000);
    expect(unitById(sim, f.id)?.statuses.find((s) => s.kind === 'slow')?.magnitudeBp).toBe(1500);
  });
});
