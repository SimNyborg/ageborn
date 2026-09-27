import { describe, expect, it } from 'vitest';
import { applyStatus, makeImpact, unitDamage } from '../damage';
import { devPlaceTurret, devSpawn, simCtx, stepN, unitById } from '../debug';
import { BASE_TARGET } from '../state';
import { arena, ofKind, pLu, stun, unitOf } from './helpers';

describe('attack cycle (A2.7)', () => {
  it('melee: 40% windup, impact on the impact tick, then the interval', () => {
    const sim = arena();
    const foe = devSpawn(sim, 1, 'tuskback', { p: 1200 - 60 });
    stun(sim, foe.id, 1000);
    const b = devSpawn(sim, 0, 'bonker', { p: 20 });
    const ev = stepN(sim, 80);
    const starts = ofKind(ev, 'attackStarted').filter((e) => e.id === b.id);
    const hits = ofKind(ev, 'hit').filter((e) => e.sourceId === b.id);
    expect(starts.length).toBeGreaterThan(1);
    expect(starts[0]?.windupTicks).toBe(8);
    expect(hits[0]?.tick).toBe((starts[0]?.tick ?? 0) + 8);
    expect((starts[1]?.tick ?? 0) - (starts[0]?.tick ?? 0)).toBe(20);
    // Blunt: armored ×0.70 → 20 × 0.7 = 14 HP
    expect(hits[0]?.damage).toBe(1400);
    expect(hits[0]?.modBp).toBe(7000);
  });

  it('attack speed buff shortens the interval: round(base × 10,000 / (10,000 + bp))', () => {
    const sim = arena();
    const foe = devSpawn(sim, 1, 'tuskback', { p: 1200 - 60 });
    stun(sim, foe.id, 1000);
    const b = devSpawn(sim, 0, 'bonker', { p: 20 });
    devSpawn(sim, 0, 'drum_shaman', { p: 20 });
    const starts = ofKind(stepN(sim, 120), 'attackStarted').filter((e) => e.id === b.id);
    // 20 ticks × 10,000 / 12,000 = 16.67 → 17
    expect((starts[2]?.tick ?? 0) - (starts[1]?.tick ?? 0)).toBe(17);
  });

  it('ranged: projectile travel = ceil(distance / speed / 0.05), homing', () => {
    const sim = arena();
    const foe = devSpawn(sim, 1, 'tuskback', { p: 1200 - 300 });
    stun(sim, foe.id, 1000);
    devSpawn(sim, 0, 'pebbler', { p: 100 });
    const ev = stepN(sim, 60);
    const fired = ofKind(ev, 'projectileFired')[0];
    const start = ofKind(ev, 'attackStarted')[0];
    expect(start?.windupTicks).toBe(14); // 28 ticks × 50%
    // fired at the end of the windup from p 100 to the Tuskback at p 300: 200 lu at 500 lu/s = 0.4 s
    expect(fired?.tick).toBe((start?.tick ?? 0) + 14);
    expect(fired?.travelTicks).toBe(8);
    const hit = ofKind(ev, 'hit')[0];
    expect(hit?.tick).toBe((fired?.tick ?? 0) + 8);
  });

  it('targets the enemy base only when no unit candidate exists; bases give 12 XP per 1%', () => {
    const sim = arena();
    const b = devSpawn(sim, 0, 'bonker', { p: 1200 - 20 });
    const ev = stepN(sim, 30);
    expect(unitById(sim, b.id)?.attacks[0]?.targetId).toBe(BASE_TARGET);
    const dmg = ofKind(ev, 'baseDamaged');
    expect(dmg[0]?.side).toBe(1);
    expect(dmg[0]?.damage).toBe(2000);
    // 20 HP of 10,000 = 0.2% → 2.4 XP
    const xp = ofKind(ev, 'xpEarned').filter((e) => e.reason === 'base');
    expect(xp[0]?.amount).toBe(2400);
    // an enemy unit in range takes priority after the next re-check
    const foe = devSpawn(sim, 1, 'bonker', { p: 1200 - 1200 + 20 + 8 });
    stun(sim, foe.id, 100);
    stepN(sim, 25);
    expect(unitById(sim, b.id)?.attacks[0]?.targetId).toBe(foe.id);
  });

  it('two-phase impacts: units that kill each other on the same tick both die', () => {
    const sim = arena();
    const a = devSpawn(sim, 0, 'bonker', { p: 588 });
    const b = devSpawn(sim, 1, 'bonker', { p: 588 });
    const ctx = simCtx(sim);
    for (const u of ctx.s.units) u.hp = 1000;
    const ev = stepN(sim, 12);
    const died = ofKind(ev, 'died');
    expect(died.map((d) => d.id).sort()).toEqual([a.id, b.id]);
    expect(died[0]?.tick).toBe(died[1]?.tick);
  });
});

describe('targeting (A2.7)', () => {
  it('priority armored: the Spear Hunter picks the Tuskback over a nearer Bonker', () => {
    const sim = arena();
    const near = devSpawn(sim, 1, 'bonker', { p: 1200 - 150 });
    const heavy = devSpawn(sim, 1, 'tuskback', { p: 1200 - 190 });
    stun(sim, near.id, 100);
    stun(sim, heavy.id, 100);
    const s = devSpawn(sim, 0, 'spear_hunter', { p: 100 });
    stepN(sim, 1);
    expect(unitById(sim, s.id)?.attacks[0]?.targetId).toBe(heavy.id);
  });

  it('priority air on a secondary attack: the Behemoth MG shoots the Gyrocopter', () => {
    const sim = arena();
    const ground = devSpawn(sim, 1, 'trench_raider', { p: 1200 - 200 });
    const gyro = devSpawn(sim, 1, 'gyrocopter', { p: 1200 - 230 });
    stun(sim, ground.id, 100);
    stun(sim, gyro.id, 100);
    const t = devSpawn(sim, 0, 'behemoth_tank', { p: 100 });
    stepN(sim, 1);
    const u = unitById(sim, t.id);
    expect(u?.attacks[0]?.targetId).toBe(ground.id);
    expect(u?.attacks[1]?.targetId).toBe(gyro.id);
  });

  it('stickiness: keeps its target unless another is ≥ 60 lu closer at the 1 s re-check', () => {
    const sim = arena();
    const far = devSpawn(sim, 1, 'tuskback', { p: 1200 - 400 });
    stun(sim, far.id, 1000);
    const peb = devSpawn(sim, 0, 'pebbler', { p: 200 });
    stepN(sim, 1);
    expect(unitById(sim, peb.id)?.attacks[0]?.targetId).toBe(far.id);
    const closer50 = devSpawn(sim, 1, 'tuskback', { p: 1200 - 350 });
    stun(sim, closer50.id, 1000);
    stepN(sim, 25);
    expect(unitById(sim, peb.id)?.attacks[0]?.targetId).toBe(far.id);
    const closer70 = devSpawn(sim, 1, 'tuskback', { p: 1200 - 330 });
    stun(sim, closer70.id, 1000);
    stepN(sim, 25);
    expect(unitById(sim, peb.id)?.attacks[0]?.targetId).toBe(closer70.id);
  });

  it('self-defence: a ranged unit switches at once to an enemy within 30 lu', () => {
    const sim = arena();
    const far = devSpawn(sim, 1, 'tuskback', { p: 1200 - 350 });
    stun(sim, far.id, 1000);
    const peb = devSpawn(sim, 0, 'pebbler', { p: 200 });
    stepN(sim, 2);
    expect(unitById(sim, peb.id)?.attacks[0]?.targetId).toBe(far.id);
    // wait for the windup to finish so the next decision is free
    stepN(sim, 20);
    const pp = pLu(sim, peb.id);
    const intruder = devSpawn(sim, 1, 'bonker', { p: 1200 - pp - 12 - 12 - 20 });
    stun(sim, intruder.id, 1000);
    let switched = false;
    for (let i = 0; i < 16 && !switched; i += 1) {
      stepN(sim, 1);
      switched = unitById(sim, peb.id)?.attacks[0]?.targetId === intruder.id;
    }
    expect(switched).toBe(true);
  });

  it('melee never hits air; turrets never target bases', () => {
    const sim = arena();
    const gyro = devSpawn(sim, 1, 'gyrocopter', { p: 1200 - 60 });
    stun(sim, gyro.id, 100);
    const b = devSpawn(sim, 0, 'bonker', { p: 50 });
    stepN(sim, 5);
    expect(unitById(sim, b.id)?.attacks[0]?.targetId).toBe(0);
    devPlaceTurret(sim, 0, 0, 'crossbow_nest');
    const ev = stepN(sim, 20);
    expect(ofKind(ev, 'baseDamaged').filter((d) => d.side === 1)).toHaveLength(0);
  });
});

describe('damage pipeline (A2.7)', () => {
  function hitOn(target: string, attacker: string, o: { level?: number; setup?: (sim: ReturnType<typeof arena>, t: number) => void } = {}) {
    const sim = arena();
    const t = devSpawn(sim, 1, target, { p: 1200 - 150 });
    stun(sim, t.id, 1000);
    o.setup?.(sim, t.id);
    const a = devSpawn(sim, 0, attacker, { p: 100, level: o.level ?? 1 });
    const hit = ofKind(stepN(sim, 120), 'hit').find((h) => h.sourceId === a.id);
    return hit;
  }

  it('type mods: the first matching mod applies', () => {
    expect(hitOn('tuskback', 'spear_hunter')?.damage).toBe(5200); // armored ×2
    expect(hitOn('bonker', 'spear_hunter')?.damage).toBe(1950); // light ×0.75
    expect(hitOn('bonker', 'bonker')?.damage).toBe(2000); // no match ×1
  });

  it('level scaling: +5% per level as one integer step', () => {
    expect(hitOn('bonker', 'bonker', { level: 10 })?.damage).toBe(2900);
    expect(hitOn('bonker', 'bonker', { level: 2 })?.damage).toBe(2100);
  });

  it('Shield Wall: Footmen take 25% less from attacks with range ≥ 100, not from melee', () => {
    expect(hitOn('footman', 'pebbler')?.damage).toBe(1350);
    expect(hitOn('footman', 'bonker')?.damage).toBe(2000);
  });

  it('attacker damage buff and mark', () => {
    const buffed = (() => {
      const sim = arena();
      const t = devSpawn(sim, 1, 'bonker', { p: 1200 - 150 });
      stun(sim, t.id, 1000);
      const a = devSpawn(sim, 0, 'bonker', { p: 100 });
      const ctx = simCtx(sim);
      const u = ctx.s.units.find((x) => x.id === a.id);
      if (u) applyStatus(ctx, u, { kind: 'damageBuff', magnitudeBp: 3000, ticks: 400, amount: 0, frozen: false }, 0);
      const tu = ctx.s.units.find((x) => x.id === t.id);
      if (tu) applyStatus(ctx, tu, { kind: 'mark', magnitudeBp: 2000, ticks: 400, amount: 0, frozen: false }, 0);
      return ofKind(stepN(sim, 60), 'hit').find((h) => h.sourceId === a.id);
    })();
    // 20 × 1.3 = 26 → × 1.2 = 31.2
    expect(buffed?.damage).toBe(3120);
  });

  it('shields absorb first: temporary, then innate, then HP', () => {
    const sim = arena();
    const t = devSpawn(sim, 1, 'photon_knight', { p: 1200 - 150 });
    stun(sim, t.id, 1000);
    const ctx = simCtx(sim);
    const tu = ctx.s.units.find((x) => x.id === t.id);
    if (tu) applyStatus(ctx, tu, { kind: 'shield', magnitudeBp: 0, ticks: 400, amount: 1000, frozen: false }, 0, 1000);
    const a = devSpawn(sim, 0, 'bonker', { p: 100 });
    let hit;
    for (let i = 0; i < 60 && !hit; i += 1) hit = ofKind(stepN(sim, 1), 'hit').find((h) => h.sourceId === a.id);
    expect(hit?.damage).toBe(2000);
    expect(hit?.shieldAbsorbed).toBe(2000);
    const u = unitById(sim, t.id);
    // 10 from the temporary shield, 10 from the 90 innate shield, none from HP
    expect(u?.shield).toBe(0);
    expect(u?.innateShield).toBe(8000);
    expect(u?.hp).toBe(u?.maxHp);
  });

  it('minimum 1 HP per hit, and the Siege turret halving', () => {
    const sim = arena();
    const t = devSpawn(sim, 1, 'tuskback', { p: 1200 - 150 });
    const ctx = simCtx(sim);
    const tu = ctx.s.units.find((x) => x.id === t.id);
    if (!tu) throw new Error('no unit');
    const imp = makeImpact(0, 99, 'bonker');
    imp.dmg = 50;
    expect(unitDamage(ctx, imp, tu, true).dmg).toBe(100);
    imp.dmg = 1000;
    imp.turret = true;
    expect(unitDamage(ctx, imp, tu, true).dmg).toBe(1000);
    ctx.s.phase = 'siege';
    expect(unitDamage(ctx, imp, tu, true).dmg).toBe(500);
    // area secondary 50%, then Legendary target of a power 50%
    imp.turret = false;
    expect(unitDamage(ctx, imp, tu, false).dmg).toBe(500);
  });

  it('first-hit bonus: first hit of an engagement ×2 and 30 lu knockback; Brace ignores both', () => {
    const sim = arena();
    const t = devSpawn(sim, 1, 'bonker', { p: 1200 - 150 });
    stun(sim, t.id, 1000);
    const tusk = devSpawn(sim, 0, 'tuskback', { p: 100 });
    const ev = stepN(sim, 60);
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceId === tusk.id);
    expect(hits[0]?.damage).toBe(8400);
    expect(hits[1]?.damage).toBe(4200);
    const kb = ofKind(ev, 'knockback').filter((k) => k.id === t.id);
    expect(kb).toHaveLength(1);
    expect(Math.abs((kb[0]?.toX ?? 0) - (kb[0]?.fromX ?? 0))).toBe(30000);

    const sim2 = arena();
    const pike = devSpawn(sim2, 1, 'pikeman', { p: 1200 - 150 });
    stun(sim2, pike.id, 1000);
    const k2 = devSpawn(sim2, 0, 'tuskback', { p: 100 });
    const ev2 = stepN(sim2, 60);
    const h2 = ofKind(ev2, 'hit').filter((h) => h.sourceId === k2.id);
    expect(h2[0]?.damage).toBe(4200);
    expect(ofKind(ev2, 'knockback')).toHaveLength(0);
  });

  it('knockback: large units resist 50%, and it cancels a pending windup', () => {
    const sim = arena();
    const t = devSpawn(sim, 1, 'tuskback', { p: 1200 - 150 });
    const k = devSpawn(sim, 0, 'tuskback', { p: 100 });
    const ev = stepN(sim, 30);
    const kbs = ofKind(ev, 'knockback');
    // both gore on the same tick: each knocks the other back 30 × 50% = 15 lu
    expect(kbs.length).toBe(2);
    for (const kb of kbs) expect(Math.abs(kb.toX - kb.fromX)).toBe(15000);
    expect(unitOf(sim, t.id)).toBeDefined();
    expect(unitOf(sim, k.id)).toBeDefined();
  });

  it('Corsair Boarding Hook pulls the target 20 lu toward the Corsair', () => {
    const sim = arena();
    const t = devSpawn(sim, 1, 'fusilier', { p: 1200 - 150 });
    stun(sim, t.id, 1000);
    devSpawn(sim, 0, 'corsair', { p: 100 });
    const kb = ofKind(stepN(sim, 40), 'knockback')[0];
    expect(kb && kb.fromX - kb.toX).toBe(20000);
  });
});
