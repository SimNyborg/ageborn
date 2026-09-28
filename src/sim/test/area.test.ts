import { describe, expect, it } from 'vitest';
import { devPlaceTurret, devSetGold, devSpawn, simCtx, stepN, unitById } from '../debug';
import { applyStatus } from '../damage';
import { rulesFor } from '../rules';
import { arena, fixture, L, ofKind, pLu, Stamper, stun } from './helpers';

/** Spawns stunned enemies (side 1) at own-side-0 positions (lu). Returns their ids. */
function clump(sim: ReturnType<typeof arena>, card: string, at: number[]): number[] {
  return at.map((p) => {
    const u = devSpawn(sim, 1, card, { p: L - p });
    stun(sim, u.id, 2000);
    return u.id;
  });
}

describe('area rule (A2.6): primary 100%, others 50%, at most 4 unless the card says otherwise', () => {
  it('melee splash (Mammoth Matriarch r40) hits 4 of 5 clumped enemies', () => {
    const sim = arena();
    clump(sim, 'bonker', [140, 140, 150, 160, 170]);
    const m = devSpawn(sim, 0, 'mammoth_matriarch', { p: 80 });
    const hits = ofKind(stepN(sim, 40), 'hit').filter((h) => h.sourceId === m.id && (h.damage === 5500 || h.damage === 2750));
    const first = hits.filter((h) => h.tick === hits[0]?.tick);
    expect(first.map((h) => h.damage).sort()).toEqual([2750, 2750, 2750, 5500]);
  });

  it('cleave (Ursa Paladin): 2 targets, the second within 40 lu behind the primary', () => {
    const sim = arena();
    const [a, , c] = clump(sim, 'bonker', [150, 180, 260]);
    const u = devSpawn(sim, 0, 'ursa_paladin', { p: 80 });
    const hits = ofKind(stepN(sim, 30), 'hit').filter((h) => h.sourceId === u.id);
    const first = hits.filter((h) => h.tick === hits[0]?.tick);
    expect(first).toHaveLength(2);
    expect(first[0]?.targetId).toBe(a);
    expect(first[0]?.damage).toBe(7000);
    expect(first[1]?.damage).toBe(3500);
    expect(first.some((h) => h.targetId === c)).toBe(false);
  });

  it('chain (Pebbler ricochet): 2 targets, hop ≤ 40 lu from the previous', () => {
    const sim = arena();
    const [a, b] = clump(sim, 'bonker', [300, 340, 400]);
    const peb = devSpawn(sim, 0, 'pebbler', { p: 120 });
    const hits = ofKind(stepN(sim, 60), 'hit').filter((h) => h.sourceId === peb.id);
    const first = hits.filter((h) => h.tick === hits[0]?.tick);
    expect(first.map((h) => [h.targetId, h.damage])).toEqual([
      [a, 1800],
      [b, 900],
    ]);
  });

  it('pierce (Rail Gunner): 2 targets within 150 lu, instant', () => {
    const sim = arena();
    const [a, b] = clump(sim, 'bonker', [300, 420, 470]);
    const r = devSpawn(sim, 0, 'rail_gunner', { p: 60 });
    const ev = stepN(sim, 60);
    const fired = ofKind(ev, 'projectileFired').find((f) => f.from === r.id);
    expect(fired?.travelTicks).toBe(1);
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceId === r.id);
    const first = hits.filter((h) => h.tick === hits[0]?.tick);
    // ranged AA mods: light ×0.5 → 43; secondary 50% → 21.5
    expect(first.map((h) => [h.targetId, h.damage])).toEqual([
      [a, 4300],
      [b, 2150],
    ]);
  });

  it('line (Log Roller): ground enemies within 300 lu of the gate, nearest first, max 6', () => {
    const sim = arena();
    const ids = clump(sim, 'bonker', [60, 80, 100, 120, 140, 160, 180, 350]);
    devPlaceTurret(sim, 0, 0, 'log_roller');
    const hits = ofKind(stepN(sim, 40), 'hit');
    const first = hits.filter((h) => h.tick === hits[0]?.tick);
    expect(first).toHaveLength(6);
    expect(first[0]?.targetId).toBe(ids[0]);
    expect(first[0]?.damage).toBe(4500);
    expect(first[5]?.damage).toBe(2250);
    expect(first.some((h) => h.targetId === ids[7])).toBe(false);
  });

  it('gate zone (Pitch Cauldron): ground enemies within 130 lu of the gate, max 4', () => {
    const sim = arena();
    clump(sim, 'bonker', [40, 50, 60, 70, 80, 200]);
    devPlaceTurret(sim, 0, 0, 'pitch_cauldron');
    const hits = ofKind(stepN(sim, 3), 'hit');
    expect(hits).toHaveLength(4);
    expect(hits.map((h) => h.damage)).toEqual([1400, 700, 700, 700]);
  });

  it('follow-behind (Grapeshot Gun): the frontmost enemy and enemies within 90 lu behind it, max 4', () => {
    const sim = arena();
    const ids = clump(sim, 'bonker', [100, 150, 180, 195, 205, 300]);
    devPlaceTurret(sim, 0, 0, 'grapeshot_gun');
    const hits = ofKind(stepN(sim, 5), 'hit');
    expect(hits.map((h) => h.targetId)).toEqual(ids.slice(0, 4));
    expect(hits.map((h) => h.damage)).toEqual([5000, 2500, 2500, 2500]);
  });

  it('death explosions are exempt: the Balloon Admiral crash hits every ground enemy within 70 lu at full damage', () => {
    const sim = arena();
    clump(sim, 'tuskback', [590, 600, 610, 620, 630, 640]);
    const adm = devSpawn(sim, 0, 'balloon_admiral', { p: 600 });
    const u = unitById(sim, adm.id);
    if (u) u.hp = 1;
    const foe = devSpawn(sim, 1, 'pebbler', { p: L - 800 });
    stun(sim, foe.id, 1);
    const ev = stepN(sim, 40);
    const crash = ofKind(ev, 'hit').filter((h) => h.sourceId === adm.id && h.sourceKind === 'ability');
    expect(crash).toHaveLength(6);
    for (const h of crash) expect(h.damage).toBe(25000);
  });

  it('splash aimed at a point: the primary is the enemy nearest the impact, not the unit fired at (A2.6)', () => {
    const sim = arena();
    // The Trebuchet fires at the walking Tuskback at 400; slowed 25%, during the 18-tick flight it walks
    // 46.4 lu toward the gate (55 × 1.25 × 0.75 lu/s), still inside r50 of the impact point, while a stunned
    // Tuskback sits 5 lu from it.
    const walker = devSpawn(sim, 1, 'tuskback', { p: L - 400 });
    applyStatus(simCtx(sim), unitById(sim, walker.id) as NonNullable<ReturnType<typeof unitById>>, { kind: 'slow', magnitudeBp: 2500, ticks: 100, amount: 0, frozen: false }, 0);
    const [still] = clump(sim, 'tuskback', [405]);
    devPlaceTurret(sim, 0, 0, 'trebuchet');
    const ev = stepN(sim, 20);
    expect(ofKind(ev, 'turretFired')[0]?.targetId).toBe(walker.id);
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceCard === 'trebuchet');
    expect(hits.map((h) => [h.targetId, h.damage])).toEqual([
      [still, 11000],
      [walker.id, 5500],
    ]);
  });

  it('chain (Honk Ballista): 3 targets, each ≤ 80 lu from the previous, all slowed 30% for 2 s', () => {
    const sim = arena();
    const [a, b, c, far] = clump(sim, 'bonker', [300, 360, 420, 600]);
    devPlaceTurret(sim, 0, 0, 'honk_ballista');
    const ev = stepN(sim, 15);
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceCard === 'honk_ballista');
    expect(hits.map((h) => [h.targetId, h.damage])).toEqual([
      [a, 7000],
      [b, 3500],
      [c, 3500],
    ]);
    const slows = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'slow');
    expect(slows.map((s) => s.id)).toEqual([a, b, c]);
    expect(slows.every((s) => s.ms === 2000)).toBe(true);
    expect(unitById(sim, a as number)?.statuses.find((s) => s.kind === 'slow')?.magnitudeBp).toBe(3000);
    expect(hits.some((h) => h.targetId === far)).toBe(false);
  });

  it('pierce (Chainshot Cannon): 4 targets within 200 lu, starting at the frontmost', () => {
    const sim = arena();
    const ids = clump(sim, 'bonker', [200, 250, 300, 350, 390, 450]);
    devPlaceTurret(sim, 0, 0, 'chainshot_cannon');
    const hits = ofKind(stepN(sim, 8), 'hit').filter((h) => h.sourceCard === 'chainshot_cannon');
    expect(hits.map((h) => [h.targetId, h.damage])).toEqual([
      [ids[0], 7500],
      [ids[1], 3750],
      [ids[2], 3750],
      [ids[3], 3750],
    ]);
  });

  it('splash projectiles aim at the target x at fire time; minimum range is respected (Trebuchet)', () => {
    const sim = arena();
    const [inner] = clump(sim, 'tuskback', [120]);
    devPlaceTurret(sim, 0, 0, 'trebuchet');
    expect(ofKind(stepN(sim, 5), 'turretFired')).toHaveLength(0);
    const [outer] = clump(sim, 'tuskback', [300]);
    const ev = stepN(sim, 30);
    expect(ofKind(ev, 'turretFired')[0]?.targetId).toBe(outer);
    expect(ofKind(ev, 'hit').some((h) => h.targetId === inner)).toBe(false);
  });
});

describe('turrets (A2.8)', () => {
  it('build 1 s, fire from the gate, range capped at 480 lu, never at the base', () => {
    const sim = arena();
    const st = new Stamper(sim);
    const ev = [...st.step({ t: 'buildTurret', side: 0, mount: 0, slot: 0 })];
    expect(ofKind(ev, 'turretBuildStart')).toHaveLength(1);
    const [near] = clump(sim, 'bonker', [300]);
    ev.push(...stepN(sim, 25));
    const built = ofKind(ev, 'turretBuilt')[0];
    expect(built?.tick).toBe(21);
    const fired = ofKind(ev, 'turretFired');
    expect(fired[0]?.tick).toBe(21);
    expect(fired[0]?.targetId).toBe(near);
    // Rock Tosser costs 150 of the 175 start gold
    expect(sim.state.sides[0].gold).toBeLessThan(175000);
  });

  it('turret targeting measures from its own gate: the enemy nearest the gate', () => {
    const sim = arena();
    const [, closest] = clump(sim, 'bonker', [300, 200, 350]);
    devPlaceTurret(sim, 0, 0, 'crossbow_nest');
    expect(ofKind(stepN(sim, 1), 'turretFired')[0]?.targetId).toBe(closest);
  });

  it('priority air and air ×2 (Flak Gun); Searchlight marks for +20%', () => {
    const sim = arena();
    const [ground] = clump(sim, 'trench_raider', [200]);
    const [air] = clump(sim, 'gyrocopter', [300]);
    devPlaceTurret(sim, 0, 0, 'flak_gun');
    const hits = ofKind(stepN(sim, 12), 'hit');
    const onAir = hits.find((h) => h.targetId === air);
    expect(onAir?.damage).toBe(12000);
    expect(onAir?.modBp).toBe(20000);
    expect(hits.some((h) => h.targetId === ground)).toBe(false);

    const sim2 = arena();
    clump(sim2, 'tankette', [300]);
    devPlaceTurret(sim2, 0, 0, 'searchlight_sniper');
    devPlaceTurret(sim2, 0, 1, 'mg_nest');
    const ev = stepN(sim2, 20);
    expect(ofKind(ev, 'statusApplied').some((s) => s.kind === 'mark')).toBe(true);
    const mg = ofKind(ev, 'hit').filter((h) => h.sourceCard === 'mg_nest');
    // 15 before the mark lands, 18 after
    expect(mg.some((h) => h.damage === 1800)).toBe(true);
  });

  it('Congreve Rack: 4 rockets with RNG scatter, air ×1.5', () => {
    const sim = arena();
    clump(sim, 'gyrocopter', [400]);
    devPlaceTurret(sim, 0, 0, 'congreve_rack');
    const ev = stepN(sim, 20);
    const shots = ofKind(ev, 'projectileFired');
    expect(shots).toHaveLength(4);
    expect(new Set(shots.map((s) => s.toX)).size).toBeGreaterThan(1);
    for (const s of shots) expect(Math.abs(s.toX - 400000)).toBeLessThanOrEqual(40000);
    for (const h of ofKind(ev, 'hit')) expect([8250, 4125]).toContain(h.damage);
  });

  it('Grumpy Toad drags a backline unit 120 lu toward its gate, stopping at the enemy front', () => {
    const sim = arena();
    const [front, back] = clump(sim, 'bonker', [300, 400]);
    const [archer] = clump(sim, 'longbowman', [410]);
    expect(back).toBeDefined();
    devPlaceTurret(sim, 0, 0, 'grumpy_toad');
    const ev = stepN(sim, 3);
    expect(ofKind(ev, 'turretFired')[0]?.targetId).toBe(archer);
    const kb = ofKind(ev, 'knockback').find((k) => k.id === archer);
    // 410 → 290 would pass the frontmost ally at 300: it stops there
    expect(kb?.toX).toBe(300000);
    expect(pLu(sim, front as number)).toBe(L - 300);
  });

  it('Grumpy Toad without a backline target drags the second-frontmost small or medium ground enemy', () => {
    const sim = arena();
    // Tuskbacks (large) are never grabbed; of the two Bonkers the second-frontmost (250) is dragged
    // toward the gate and stops at the enemy's frontmost ground unit (the Bonker at 200).
    clump(sim, 'tuskback', [150]);
    const [, second] = clump(sim, 'bonker', [200, 250]);
    devPlaceTurret(sim, 0, 0, 'grumpy_toad');
    const ev = stepN(sim, 3);
    expect(ofKind(ev, 'turretFired')[0]?.targetId).toBe(second);
    expect(ofKind(ev, 'knockback').find((k) => k.id === second)?.toX).toBe(150000);

    // a single small enemy is dragged the full 120 lu
    const sim2 = arena();
    const [only] = clump(sim2, 'bonker', [400]);
    devPlaceTurret(sim2, 0, 0, 'grumpy_toad');
    expect(ofKind(stepN(sim2, 3), 'knockback').find((k) => k.id === only)?.toX).toBe(280000);

    // large units only: nothing to grab, the turret does not fire
    const sim3 = arena();
    clump(sim3, 'tuskback', [300]);
    devPlaceTurret(sim3, 0, 0, 'grumpy_toad');
    expect(ofKind(stepN(sim3, 5), 'turretFired')).toHaveLength(0);
  });

  it('Gravity Well: aims at the densest point, pulls 60% toward the centre, slows everyone in the radius', () => {
    const sim = arena();
    const ids = clump(sim, 'bonker', [250, 300, 300, 310, 350, 390]);
    devPlaceTurret(sim, 0, 0, 'gravity_well');
    const ev = stepN(sim, 30);
    // the densest 90 lu window holds the three Bonkers at 300-310 (plus 250 or 350)
    const aim = ofKind(ev, 'projectileFired')[0]?.toX ?? 0;
    expect(Math.abs(aim - 300000)).toBeLessThanOrEqual(50000);
    expect(ofKind(ev, 'hit').length).toBeLessThanOrEqual(4);
    const slowed = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'slow').map((s) => s.id);
    expect(slowed.length).toBeGreaterThanOrEqual(4);
    expect(ofKind(ev, 'knockback').length).toBeGreaterThan(0);
    expect(ids).toHaveLength(6);
  });

  it('sell: stops at once, frees the mount after 1 s and refunds 50%; modernise costs new − 50% old', () => {
    const sim = arena();
    const st = new Stamper(sim);
    devSetGold(sim, 0, 1000);
    devPlaceTurret(sim, 0, 0, 'rock_tosser');
    const e1 = st.step({ t: 'sellTurret', side: 0, mount: 0 });
    expect(ofKind(e1, 'turretSold')).toHaveLength(1);
    expect(sim.state.sides[0].turrets[0]?.state).toBe('selling');
    const before = sim.state.sides[0].gold;
    stepN(sim, 20);
    expect(sim.state.sides[0].turrets[0]).toBeNull();
    // +75 refund, plus 20 ticks of passive income (6 gold/s)
    expect(sim.state.sides[0].gold - before).toBe(75000 + 20 * 300);
    // modernise: an older-age turret only
    devPlaceTurret(sim, 0, 1, 'rock_tosser');
    const rej = st.step({ t: 'replaceTurret', side: 0, mount: 1, slot: 0 });
    expect(ofKind(rej, 'commandRejected')[0]?.reason).toBe('notOutdated');
  });

  it('modernise: an older-age turret becomes a current-age card for the new price minus 50% of the old one, in 1 s', () => {
    const sim = arena();
    const st = new Stamper(sim);
    simCtx(sim).s.sides[0].ageIndex = 1; // Medieval
    devSetGold(sim, 0, 1000);
    devPlaceTurret(sim, 0, 0, 'rock_tosser'); // Stone, 150
    const card = sim.config.sides[0].loadouts.medieval?.turrets[0];
    expect(card).toBe('crossbow_nest'); // 150
    const before = sim.state.sides[0].gold;
    const ev = [...st.step({ t: 'replaceTurret', side: 0, mount: 0, slot: 0 })];
    expect(ofKind(ev, 'turretReplaced')[0]).toMatchObject({ side: 0, mount: 0, card });
    // 150 − 75 = 75, plus one tick of passive income
    expect(sim.state.sides[0].gold - before).toBe(-75000 + 300);
    expect(sim.state.sides[0].turrets[0]).toMatchObject({ card, state: 'replacing' });
    ev.push(...stepN(sim, 20));
    expect(ofKind(ev, 'turretBuilt')[0]).toMatchObject({ mount: 0, card, tick: (ev[0]?.tick ?? 0) + 20 });
    expect(sim.state.sides[0].turrets[0]?.state).toBe('active');
  });
});

describe('turret range and Siege (A2.8, A2.10)', () => {
  it('turret range is measured from the own gate and capped at 480 lu', () => {
    const sim = arena();
    // Howitzer: range 480, min 180; a Bonker's edge at 480 lu from the gate is in range, at 481 it is not
    clump(sim, 'bonker', [481 + 12]);
    devPlaceTurret(sim, 0, 0, 'howitzer');
    expect(ofKind(stepN(sim, 1), 'turretFired')).toHaveLength(0);
    const [inside] = clump(sim, 'bonker', [480 + 12]);
    expect(ofKind(stepN(sim, 1), 'turretFired')[0]?.targetId).toBe(inside);
    // a content turret listing a longer range is capped by the rules
    const long = {
      ...fixture,
      turrets: { ...fixture.turrets, far: { ...fixture.turrets['howitzer']!, id: 'far', attack: { ...fixture.turrets['howitzer']!.attack, range: 900 } } },
    };
    expect(rulesFor(long).turrets['far']?.attack.range).toBe(480000);
  });

  it('Siege: damage to bases ×2', () => {
    const sim = arena();
    devSpawn(sim, 0, 'bonker', { p: L - 20 });
    simCtx(sim).s.phase = 'siege';
    expect(ofKind(stepN(sim, 12), 'baseDamaged')[0]?.damage).toBe(4000);
  });
});
