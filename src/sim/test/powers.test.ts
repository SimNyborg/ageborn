import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@/contracts';
import { createSim } from '../createSim';
import { devSetPower, devSpawn, simCtx, stepN, unitById } from '../debug';
import { AGES, Stamper, fixture, matchConfig, ofKind, pLu, sideConfig, stun } from './helpers';

/** A no-clock match where side 0 is in the power's age with that power equipped. */
function powerArena(power: string, o: { level?: number } = {}) {
  const def = fixture.powers[power];
  if (!def) throw new Error(power);
  const sides = [
    sideConfig(fixture, { plan: { altPower: def.slot === 'alternate' }, level: o.level ?? 1 }),
    sideConfig(fixture, { isBot: true, label: 'AI' }),
  ] as const;
  const sim = createSim(matchConfig({ training: { noClock: true }, sides: [sides[0], sides[1]] }));
  simCtx(sim).s.sides[0].ageIndex = AGES.indexOf(def.age);
  devSetPower(sim, 0, 1000000);
  return { sim, st: new Stamper(sim) };
}

function enemies(sim: ReturnType<typeof createSim>, card: string, at: number[]): number[] {
  return at.map((p) => {
    const u = devSpawn(sim, 1, card, { p: 1200 - p });
    stun(sim, u.id, 5000);
    return u.id;
  });
}

function cast(st: Stamper, p?: number): readonly SimEvent[] {
  return st.step(p === undefined ? { t: 'power', side: 0 } : { t: 'power', side: 0, p });
}

describe('Age Powers: casting (A2.9)', () => {
  it('needs 100% charge; a 1.0 s telegraph visible to both sides; the charge resets', () => {
    const { sim, st } = powerArena('meteor_shower');
    devSetPower(sim, 0, 999999);
    expect(ofKind(cast(st, 500), 'commandRejected')[0]?.reason).toBe('powerNotReady');
    devSetPower(sim, 0, 1000000);
    const ev = cast(st, 500);
    const tel = ofKind(ev, 'powerTelegraph')[0];
    expect(tel).toMatchObject({ side: 0, power: 'meteor_shower', x: 500000, zone: 400000 });
    expect(sim.state.sides[0].powerPpm).toBe(1000);
    expect(sim.observe(1).telegraphs).toEqual([
      { side: 0, power: 'meteor_shower', p: 700000, zone: 400000, impactTick: (tel?.tick ?? 0) + 20 },
    ]);
    // the opponent sees the cast card in its Scouted list
    expect(sim.observe(1).foe.scouted).toContain('meteor_shower');
  });

  it('aim is clamped to p ∈ [150, 1,050]; tap auto-aims at the densest enemies', () => {
    const { st } = powerArena('meteor_shower');
    expect(ofKind(cast(st, 1190), 'powerTelegraph')[0]?.x).toBe(1050000);
    const b = powerArena('meteor_shower');
    enemies(b.sim, 'bonker', [300, 820, 830, 840]);
    const x = ofKind(cast(b.st), 'powerTelegraph')[0]?.x ?? 0;
    expect(Math.abs(x - 830000)).toBeLessThanOrEqual(200000);
    expect(x).toBeGreaterThan(600000);
  });

  it('barrage sequencing: impact i at telegraphEnd + floor(i × D / count), x = zoneStart + (i + 0.5) × zone / count + jitter', () => {
    const { sim, st } = powerArena('meteor_shower');
    const ev = [...cast(st, 500)];
    const t0 = ofKind(ev, 'powerTelegraph')[0]?.tick ?? 0;
    ev.push(...stepN(sim, 90));
    const imp = ofKind(ev, 'powerImpact');
    expect(imp).toHaveLength(14);
    imp.forEach((e, i) => {
      expect(e.tick).toBe(t0 + 20 + Math.floor((i * 60) / 14));
      const ideal = 300000 + Math.trunc(((2 * i + 1) * 400000) / 28);
      expect(Math.abs(e.x - ideal)).toBeLessThanOrEqual(20000);
    });
    // the line pattern has no jitter (Carpet Bomber)
    const c = powerArena('carpet_bomber');
    const ev2 = [...cast(c.st, 600)];
    ev2.push(...stepN(c.sim, 60));
    const lines = ofKind(ev2, 'powerImpact');
    expect(lines).toHaveLength(12);
    lines.forEach((e, i) => expect(e.x).toBe(350000 + Math.trunc(((2 * i + 1) * 500000) / 24)));
  });

  it('powers hit units only (never bases), Legendaries take 50%, damage scales with the loadout multiplier', () => {
    const { sim, st } = powerArena('broadside', { level: 5 });
    const [legend] = enemies(sim, 'balloon_admiral', [500]);
    const [tank] = enemies(sim, 'cuirassier', [500]);
    const ev = [...cast(st, 500)];
    ev.push(...stepN(sim, 100));
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power');
    // Broadside is ground only: the airborne Admiral is never hit
    expect(hits.some((h) => h.targetId === legend)).toBe(false);
    // level 5 loadout: ×1.2 → 144 per cannonball, full damage to every unit in the radius (exempt)
    expect(hits.filter((h) => h.targetId === tank).every((h) => h.damage === 14400)).toBe(true);
    expect(ofKind(ev, 'baseDamaged')).toHaveLength(0);
    const l2 = powerArena('arrow_storm');
    const [paladin] = enemies(l2.sim, 'ursa_paladin', [500]);
    const ev2 = [...cast(l2.st, 500)];
    ev2.push(...stepN(l2.sim, 80));
    const onLegend = ofKind(ev2, 'hit').filter((h) => h.targetId === paladin);
    expect(onLegend.length).toBeGreaterThan(0);
    expect(onLegend.every((h) => h.damage === 2000)).toBe(true);
  });
});

describe('Age Powers: effects (A5.7)', () => {
  it('Stampede: 5 aurochs from the frontmost unit, 50 damage and 40 lu knockback, max 3 hits per enemy', () => {
    const { sim, st } = powerArena('stampede');
    const front = devSpawn(sim, 0, 'bonker', { p: 250 });
    stun(sim, front.id, 5000);
    const [a] = enemies(sim, 'tuskback', [400]);
    const ev = [...cast(st)];
    expect(ofKind(ev, 'powerTelegraph')[0]?.x).toBe(500000);
    ev.push(...stepN(sim, 120));
    const hits = ofKind(ev, 'hit').filter((h) => h.targetId === a);
    expect(hits).toHaveLength(3);
    expect(hits.every((h) => h.damage === 5000)).toBe(true);
    // large: 50% knockback resist → 20 lu per hit
    const kbs = ofKind(ev, 'knockback').filter((k) => k.id === a);
    expect(kbs).toHaveLength(3);
    expect(Math.abs((kbs[0]?.toX ?? 0) - (kbs[0]?.fromX ?? 0))).toBe(20000);
    expect(ofKind(ev, 'powerImpact')).toHaveLength(5);
  });

  it('Stampede starts at p = 200 when the caster has no ground units', () => {
    const { st } = powerArena('stampede');
    expect(ofKind(cast(st), 'powerTelegraph')[0]?.x).toBe(450000);
  });

  it('Arrow Storm hits air', () => {
    const { sim, st } = powerArena('arrow_storm');
    const [gyro] = enemies(sim, 'gyrocopter', [500]);
    const ev = [...cast(st, 500)];
    ev.push(...stepN(sim, 80));
    expect(ofKind(ev, 'hit').some((h) => h.targetId === gyro)).toBe(true);
  });

  it('Royal Decree: all own units get +30% damage and +25% move speed for 8 s', () => {
    const { sim, st } = powerArena('royal_decree');
    const u = devSpawn(sim, 0, 'footman', { p: 100 });
    const ev = [...cast(st)];
    ev.push(...stepN(sim, 21));
    const buffs = ofKind(ev, 'statusApplied').filter((s) => s.id === u.id);
    expect(buffs.map((b) => [b.kind, b.ms])).toEqual([
      ['damageBuff', 8000],
      ['speedBuff', 8000],
    ]);
    const p0 = pLu(sim, u.id);
    stepN(sim, 1);
    // 70 lu/s × 1.25 = 87.5 lu/s = 4.375 lu per tick
    expect(pLu(sim, u.id) - p0).toBeCloseTo(4.375, 5);
  });

  it('Smoke Screen: enemy ranged attacks into the cloud miss about 50%; own units inside deal +20%', () => {
    const { sim, st } = powerArena('smoke_screen');
    const mine = devSpawn(sim, 0, 'cuirassier', { p: 500 });
    const mu = unitById(sim, mine.id);
    if (mu) mu.hp = mu.maxHp = 100000000;
    const shooters = [650, 660, 670, 680].map((p) => devSpawn(sim, 1, 'fusilier', { p: 1200 - p }).id);
    const target = devSpawn(sim, 1, 'bonker', { p: 1200 - 510 });
    stun(sim, target.id, 5000);
    const tu = unitById(sim, target.id);
    if (tu) tu.hp = tu.maxHp = 100000000;
    const ev = [...cast(st, 500)];
    ev.push(...stepN(sim, 160));
    const fired = ofKind(ev, 'projectileFired').filter((p) => shooters.includes(p.from) && p.tick > 21);
    const landed = ofKind(ev, 'hit').filter((h) => shooters.includes(h.sourceId) && h.tick > 22);
    expect(fired.length).toBeGreaterThan(10);
    const rate = landed.length / fired.length;
    expect(rate).toBeGreaterThan(0.2);
    expect(rate).toBeLessThan(0.8);
    // Cuirassier 76 → +20% inside the cloud = 91.2 on the Bonker
    const mine2 = ofKind(ev, 'hit').filter((h) => h.sourceId === mine.id && h.tick > 21);
    expect(mine2.some((h) => h.damage === 9120)).toBe(true);
  });

  it('Paratroopers: 4 summoned Riflemen land 150 lu beyond the enemy front (clamped to 1,050; 600 when empty)', () => {
    const { sim, st } = powerArena('paratroopers');
    enemies(sim, 'trench_raider', [700, 500]);
    const ev = [...cast(st)];
    ev.push(...stepN(sim, 20));
    const drop = ofKind(ev, 'unitSpawned').filter((u) => u.card === 'rifleman');
    expect(drop).toHaveLength(4);
    expect(drop.every((u) => u.summoned && u.x === 650000)).toBe(true);
    expect(sim.state.sides[0].pop).toBe(0);
    const e = powerArena('paratroopers');
    expect(ofKind(cast(e.st), 'powerTelegraph')[0]?.x).toBe(600000);
  });

  it('Orbital Lance: a beam sweeps 500 lu over 2 s, dealing 450 once to each enemy it touches, air included', () => {
    const { sim, st } = powerArena('orbital_lance');
    const ids = [...enemies(sim, 'walker_mech', [400, 500]), ...enemies(sim, 'gyrocopter', [600])];
    const ev = [...cast(st, 500)];
    ev.push(...stepN(sim, 70));
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power');
    expect(hits.map((h) => h.targetId).sort()).toEqual([...ids].sort());
    expect(hits.every((h) => h.damage === 45000)).toBe(true);
  });

  it('Nanite Surge: regen of 40% max HP over 4 s and a 150 shield for 6 s on every own unit', () => {
    const { sim, st } = powerArena('nanite_surge');
    const u = devSpawn(sim, 0, 'walker_mech', { p: 100 });
    stun(sim, u.id, 5000);
    const w = unitById(sim, u.id);
    if (w) w.hp = 1000;
    const ev = [...cast(st)];
    ev.push(...stepN(sim, 120));
    const healed = ofKind(ev, 'healed').filter((h) => h.id === u.id);
    const total = healed.reduce((a, h) => a + h.amount, 0);
    // 40% of 1,860 HP = 744 HP
    expect(total).toBe(74400);
    expect(ofKind(ev, 'statusApplied').find((s) => s.kind === 'shield' && s.id === u.id)?.ms).toBe(6000);
  });
});
