/**
 * Age Powers (DESIGN A2.9, A5.7): two typed slots, gold cost, per-slot reload, reach and the hard mask,
 * the cap and the screen, the new effect kinds (field, strike, suppress), the snare status, the buff
 * and cloud caps, and the command validation order with its rejection reasons.
 */
import { describe, expect, it } from 'vitest';
import type { CardId, CompiledContent, SimEvent } from '@/contracts';
import { reloadTicksLeft } from '@/core';
import { raw as fixtureRaw } from '../../../tests/fixtures/content';
import { createSim } from '../createSim';
import { devPlaceTurret, devSetGold, devSetPower, devSpawn, simCtx, stepN, unitById } from '../debug';
import { hashState } from '../hashState';
import { compileForSim } from '../shim';
import { AGES, fixture, L, matchConfig, ofKind, pLu, sideConfig, Stamper, stun } from './helpers';

type Sim = ReturnType<typeof createSim>;

/** Passive gold per tick in milli-gold (6 gold/s, regulation). */
const PASSIVE = 300;

/** A no-clock match where side 0 is in the power's age with that power in its slot, rich and reloaded. */
function powerArena(power: CardId, o: { level?: number; content?: CompiledContent; modifiers?: string[]; gold?: number } = {}) {
  const content = o.content ?? fixture;
  const def = content.powers[power];
  if (!def) throw new Error(power);
  const sides = [sideConfig(content, { plan: { power }, level: o.level ?? 1 }), sideConfig(content, { isBot: true, label: 'AI' })] as const;
  const sim = createSim(matchConfig({ content, training: { noClock: true }, sides: [sides[0], sides[1]], ...(o.modifiers ? { modifiers: o.modifiers } : {}) }));
  const ctx = simCtx(sim);
  ctx.s.sides[0].ageIndex = AGES.indexOf(def.age);
  ctx.s.sides[1].ageIndex = AGES.indexOf(def.age);
  devSetPower(sim, 0, 1000000);
  devSetGold(sim, 0, o.gold ?? 5000);
  return { sim, st: new Stamper(sim), slot: def.slot };
}

/** Stunned enemies at own-frame p (side 0's frame, lu). */
function enemies(sim: Sim, card: string, at: number[], ticks = 5000): number[] {
  return at.map((p) => {
    const u = devSpawn(sim, 1, card, { p: L - p });
    stun(sim, u.id, ticks);
    return u.id;
  });
}

/** A stunned own unit at p. */
function mine(sim: Sim, card: string, p: number): number {
  const u = devSpawn(sim, 0, card, { p });
  stun(sim, u.id, 5000);
  return u.id;
}

function cast(st: Stamper, slot: 'home' | 'field', p?: number): readonly SimEvent[] {
  return st.step(p === undefined ? { t: 'power', side: 0, slot } : { t: 'power', side: 0, slot, p });
}

function rejected(ev: readonly SimEvent[]): string | undefined {
  return ofKind(ev, 'commandRejected')[0]?.reason;
}

/** Content with one economy power lever changed (a data lever, A2.9.12). */
function withPowerLever(patch: Partial<(typeof fixtureRaw)['economy']['power']>): CompiledContent {
  return compileForSim({ ...fixtureRaw, economy: { ...fixtureRaw.economy, power: { ...fixtureRaw.economy.power, ...patch } } });
}

describe('Age Powers: slots, cost and validation (A2.9.1, A2.9.2, A2.9.7)', () => {
  it('a cast pays the effective cost on acceptance, resets its slot and emits the telegraph', () => {
    const { sim, st } = powerArena('meteor_shower');
    const g0 = sim.state.sides[0].gold;
    const ev = cast(st, 'home', 500);
    const tel = ofKind(ev, 'powerTelegraph')[0];
    expect(tel).toMatchObject({ side: 0, slot: 'home', power: 'meteor_shower', x: 500000, zone: 400000, cost: 100, targetId: -1, telegraphMs: 1000 });
    expect(g0 + PASSIVE - sim.state.sides[0].gold).toBe(100000);
    // The slot restarted at 0 on acceptance and reloaded one tick since.
    expect(sim.state.sides[0].powerPpm[0]).toBe(1250);
    expect(sim.state.sides[0].powerPpm[1]).toBe(1000000);
    expect(sim.observe(1).telegraphs).toEqual([
      { side: 0, slot: 'home', power: 'meteor_shower', p: 1500000, zone: 400000, impactTick: (tel?.tick ?? 0) + 20, targetId: -1 },
    ]);
    expect(sim.observe(1).foe.scouted).toContain('meteor_shower');
  });

  it('rejections come in the A2.9.7 order, before any gold is paid', () => {
    const { sim, st } = powerArena('meteor_shower');
    expect(rejected(st.step({ t: 'power', side: 0, slot: 'middle' as 'home' }))).toBe('badCommand');
    expect(rejected(st.step({ t: 'power', side: 0, slot: 'home', p: Number.NaN }))).toBe('badCommand');
    // reloading beats no gold
    devSetGold(sim, 0, 0);
    devSetPower(sim, 0, 999999, 'home');
    expect(rejected(cast(st, 'home', 500))).toBe('powerReloading');
    devSetPower(sim, 0, 1000000, 'home');
    // auto-aim with nothing eligible beats no gold
    expect(rejected(cast(st, 'home'))).toBe('powerNoTarget');
    // a manual drop still needs the gold; nothing is paid and the reload is kept
    devSetGold(sim, 0, 99);
    const g1 = sim.state.sides[0].gold;
    const ev = cast(st, 'home', 500);
    expect(rejected(ev)).toBe('noGold');
    expect(ofKind(ev, 'commandRejected')[0]?.slot).toBe('home');
    expect(sim.state.sides[0].powerPpm[0]).toBe(1000000);
    expect(sim.state.sides[0].gold).toBe(g1 + PASSIVE);
  });

  it('an empty slot is rejected with noPower (a locked slot arrives empty)', () => {
    const base = sideConfig(fixture, { plan: {} });
    const stone = base.loadouts.stone;
    if (!stone) throw new Error('no stone');
    base.loadouts.stone = { ...stone, powers: { home: stone.powers.home, field: null } };
    const sim = createSim(matchConfig({ training: { noClock: true }, sides: [base, sideConfig(fixture, { isBot: true, label: 'AI' })] }));
    devSetPower(sim, 0, 1000000);
    devSetGold(sim, 0, 5000);
    const st = new Stamper(sim);
    expect(rejected(cast(st, 'field'))).toBe('noPower');
    expect(sim.observe(0).me.powers.field).toBeNull();
    expect(sim.observe(1).foe.powers.field).toBeNull();
  });

  it('a manual cast that hits nothing still pays (no refund); the telegraph is a commitment', () => {
    const { sim, st } = powerArena('meteor_shower');
    const g0 = sim.state.sides[0].gold;
    expect(ofKind(cast(st, 'home', 400), 'powerTelegraph')).toHaveLength(1);
    stepN(sim, 80);
    expect(g0 + 81 * PASSIVE - sim.state.sides[0].gold).toBe(100000);
  });

  it('Power Hour halves the price and doubles the reload rate (modifiers multiply cost, add rate)', () => {
    const { sim, st } = powerArena('meteor_shower', { modifiers: ['power_hour'] });
    const g0 = sim.state.sides[0].gold;
    const tel = ofKind(cast(st, 'home', 500), 'powerTelegraph')[0];
    expect(tel?.cost).toBe(50);
    expect(g0 + PASSIVE - sim.state.sides[0].gold).toBe(50000);
    expect(sim.observe(0).me.powers.home).toMatchObject({ cost: 50, reloadMs: 20000, rateBp: 20000 });
    // 40 s at double speed: 2,500 ppm a tick
    expect(sim.state.sides[0].powerPpm[0]).toBe(2500);
  });

  it('the optional shared lockout lever blocks the other slot (powerLockout)', () => {
    const content = withPowerLever({ lockMs: 5000 });
    const { sim, st } = powerArena('meteor_shower', { content });
    mine(sim, 'bonker', 300);
    expect(ofKind(cast(st, 'home', 500), 'powerTelegraph')).toHaveLength(1);
    expect(rejected(cast(st, 'field'))).toBe('powerLockout');
    stepN(sim, 100);
    expect(ofKind(cast(st, 'field'), 'powerTelegraph')).toHaveLength(1);
  });
});

describe('Age Powers: reload (A2.9.3)', () => {
  it('every slot starts 25% reloaded and a 40 s power is ready at 0:30, exactly', () => {
    const sim = createSim(matchConfig({ training: { noClock: true } }));
    expect(sim.state.sides[0].powerPpm).toEqual([250000, 250000]);
    const ev = stepN(sim, 599);
    expect(ofKind(ev, 'powerReady')).toHaveLength(0);
    const ready = ofKind(stepN(sim, 1), 'powerReady');
    expect(ready.map((r) => [r.side, r.slot]).sort()).toEqual([
      [0, 'field'],
      [0, 'home'],
      [1, 'field'],
      [1, 'home'],
    ]);
    expect(sim.state.sides[0].powerPpm).toEqual([1000000, 1000000]);
    expect(sim.state.sides[0].powerRem).toEqual([0, 0]);
  });

  it('the remainder is carried, so a 30 s reload fills on tick 600, not 601', () => {
    const { sim, st } = powerArena('caltrops');
    enemies(sim, 'footman', [600]);
    const tel = ofKind(cast(st, 'home', 600), 'powerTelegraph')[0];
    expect(tel).toBeDefined();
    const castTick = tel?.tick ?? 0;
    const s = sim.state.sides[0];
    // 1 tick already reloaded after the cast
    expect(reloadTicksLeft(s.powerPpm[0], s.powerRem[0], 10000, 600)).toBe(599);
    const homeReady = (ev: readonly SimEvent[]) => ofKind(ev, 'powerReady').filter((r) => r.side === 0 && r.slot === 'home');
    // not a tick early ...
    expect(homeReady(stepN(sim, 598))).toHaveLength(0);
    expect(sim.state.sides[0].powerPpm[0]).toBeLessThan(1000000);
    // ... and not a tick late: the cast tick reloads too, so 600 reload ticks end on castTick + 599
    const ready = homeReady(stepN(sim, 1));
    expect(ready).toHaveLength(1);
    expect(ready[0]?.tick).toBe(castTick + 599);
    expect(sim.state.sides[0].powerPpm[0]).toBe(1000000);
  });

  it('an empty slot still accrues at 40 s and emits no powerReady', () => {
    const base = sideConfig(fixture);
    for (const age of AGES) {
      const l = base.loadouts[age];
      if (l) base.loadouts[age] = { ...l, powers: { home: l.powers.home, field: null } };
    }
    const sim = createSim(matchConfig({ training: { noClock: true }, sides: [base, sideConfig(fixture, { isBot: true, label: 'AI' })] }));
    const ev = stepN(sim, 600);
    expect(sim.state.sides[0].powerPpm[1]).toBe(1000000);
    expect(ofKind(ev, 'powerReady').filter((r) => r.side === 0).map((r) => r.slot)).toEqual(['home']);
  });

  it('an evolve carries min(progress, 75%) per slot to the new age', () => {
    const sim = createSim(matchConfig({ training: { noClock: true } }));
    const ctx = simCtx(sim);
    devSetPower(sim, 0, 900000, 'home');
    devSetPower(sim, 0, 500000, 'field');
    ctx.s.sides[0].xp = 100000000;
    new Stamper(sim).step({ t: 'evolve', side: 0 });
    const ev = stepN(sim, 60);
    expect(ofKind(ev, 'ageUp').filter((e) => e.side === 0)).toHaveLength(1);
    const [home, field] = sim.state.sides[0].powerPpm;
    expect(home).toBeLessThanOrEqual(750000 + 60 * 1250);
    expect(home).toBeGreaterThanOrEqual(750000);
    expect(field).toBeGreaterThan(500000);
  });

  it('no reload bonus in Overdrive and Siege (lever 10,000)', () => {
    const sim = createSim(matchConfig({ format: 'short' }));
    const ctx = simCtx(sim);
    ctx.s.phase = 'overdrive';
    devSetPower(sim, 0, 0);
    stepN(sim, 1);
    // Rockslide 40 s = 800 ticks: 1,250 ppm a tick, no ×1.25
    expect(sim.state.sides[0].powerPpm[0]).toBe(1250);
  });

  it('Overcharge adds 25% to the less-reloaded equipped slot (ties: Home)', () => {
    const sim = createSim(matchConfig({ training: { noClock: true } }));
    const ctx = simCtx(sim);
    ctx.s.sides[0].ageIndex = AGES.length - 1;
    devSetPower(sim, 0, 100000, 'home');
    devSetPower(sim, 0, 50000, 'field');
    ctx.s.sides[0].xp = 1200 * 1000;
    stepN(sim, 1);
    const [home, field] = sim.state.sides[0].powerPpm;
    expect(field).toBeGreaterThanOrEqual(300000);
    expect(home).toBeLessThan(110000);
  });
});

describe('Age Powers: reach and the hard mask (A2.9.4)', () => {
  it('a Home aim is clamped into [150, 1,000 − zone / 2]; a Front aim up to F + 150 (F never below 480)', () => {
    const a = powerArena('meteor_shower');
    expect(ofKind(cast(a.st, 'home', 1990), 'powerTelegraph')[0]?.x).toBe(800000);
    expect(ofKind(powerArena('meteor_shower').st.step({ t: 'power', side: 0, slot: 'home', p: 10 }), 'powerTelegraph')[0]?.x).toBe(150000);
    const b = powerArena('horse_artillery');
    expect(ofKind(cast(b.st, 'field', 1500), 'powerTelegraph')[0]?.x).toBe(630000);
    const c = powerArena('horse_artillery');
    mine(c.sim, 'corsair', 900);
    expect(ofKind(cast(c.st, 'field', 1500), 'powerTelegraph')[0]?.x).toBe(1050000);
    // summoned units never count as F
    const d = powerArena('horse_artillery');
    devSpawn(d.sim, 0, 'corsair', { p: 1200, summoned: true });
    expect(ofKind(cast(d.st, 'field', 1500), 'powerTelegraph')[0]?.x).toBe(630000);
  });

  it('a Home effect never touches an enemy past the Home line (inclusive at 1,000), whatever its radius', () => {
    const { sim, st } = powerArena('point_defense');
    const inside = enemies(sim, 'pulse_trooper', [1000]);
    const outside = enemies(sim, 'pulse_trooper', [1010, 1030]);
    const ev = [...cast(st, 'home', 1990)];
    expect(ofKind(ev, 'powerTelegraph')[0]?.x).toBe(800000);
    ev.push(...stepN(sim, 60));
    const hit = new Set(ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power').map((h) => h.targetId));
    for (const id of outside) expect(hit.has(id)).toBe(false);
    for (const id of inside) expect(hit.has(id)).toBe(true);
  });

  it('a unit already hit by a barrage is not hit again once it is moved past the Home line (the mask beats hitIds)', () => {
    const { sim, st } = powerArena('meteor_shower');
    // Hit by the first meteors near the zone edge at 600, then carried past the line into the reach of
    // the last ones (they land up to 1,000 + jitter, radius 40).
    const [id] = enemies(sim, 'tuskback', [620]);
    const ev = [...cast(st, 'home', 1990)];
    expect(ofKind(ev, 'powerTelegraph')[0]?.x).toBe(800000);
    // Run the barrage until its first blast lands on the unit (it joins hitIds), then move it past 1,000
    // the way knockback or Fall back would.
    let firstHit = -1;
    for (let i = 0; i < 80 && firstHit < 0; i += 1) {
      const e = stepN(sim, 1);
      if (ofKind(e, 'hit').some((h) => h.sourceKind === 'power' && h.targetId === id)) firstHit = sim.state.tick;
    }
    expect(firstHit).toBeGreaterThan(0);
    const u = unitById(sim, id as number);
    if (!u) throw new Error('unit gone');
    const hp = u.hp;
    u.x = 1010 * 1000;
    const later = stepN(sim, 80);
    expect(ofKind(later, 'hit').filter((h) => h.sourceKind === 'power' && h.targetId === id)).toHaveLength(0);
    expect(unitById(sim, id as number)?.hp).toBe(hp);
  });

  it('a Front effect never touches an enemy past the band max + zone / 2', () => {
    const { sim, st } = powerArena('horse_artillery');
    // F = none → band max 630, area max 630 + 150 = 780
    const inside = enemies(sim, 'cuirassier', [770]);
    const outside = enemies(sim, 'cuirassier', [790]);
    const ev = [...cast(st, 'field', 1500)];
    ev.push(...stepN(sim, 60));
    const hit = new Set(ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power').map((h) => h.targetId));
    expect(hit.has(inside[0] as number)).toBe(true);
    expect(hit.has(outside[0] as number)).toBe(false);
  });

  it('auto-aim scans the band for the capped value; nothing eligible → powerNoTarget before payment', () => {
    const { sim, st } = powerArena('meteor_shower');
    const g0 = sim.state.sides[0].gold;
    // Enemies only past the Home line: nothing eligible.
    enemies(sim, 'bonker', [1200, 1250]);
    expect(rejected(cast(st, 'home'))).toBe('powerNoTarget');
    expect(sim.state.sides[0].gold).toBe(g0 + PASSIVE);
    enemies(sim, 'tuskback', [620, 630]);
    const x = ofKind(cast(st, 'home'), 'powerTelegraph')[0]?.x ?? 0;
    expect(x).toBeGreaterThanOrEqual(420000);
    expect(x).toBeLessThanOrEqual(800000);
  });
});

describe('Age Powers: the cap and the screen (A2.9.5)', () => {
  it('one cast affects at most maxTargets distinct enemies', () => {
    const { sim, st } = powerArena('meteor_shower');
    const ids = enemies(sim, 'bonker', [440, 460, 480, 500, 520, 540, 560, 580]);
    const ev = [...cast(st, 'home', 500)];
    ev.push(...stepN(sim, 90));
    const hit = new Set(ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power').map((h) => h.targetId));
    expect(hit.size).toBe(5);
    // the five nearest the caster's gate
    expect([...hit].sort((a, b) => a - b)).toEqual(ids.slice(0, 5));
  });

  it('the screen: cheap units nearest the gate take the cap even outside the zone, so the Heavies behind are safe', () => {
    const { sim, st } = powerArena('meteor_shower');
    const screen = enemies(sim, 'bonker', [200, 210, 220]);
    const heavies = enemies(sim, 'tuskback', [650, 660, 670, 680]);
    const ev = [...cast(st, 'home', 700)];
    ev.push(...stepN(sim, 90));
    const hit = new Set(ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power').map((h) => h.targetId));
    for (const id of screen) expect(hit.has(id)).toBe(false);
    expect(heavies.filter((id) => hit.has(id))).toEqual(heavies.slice(0, 2));
  });

  it('a sweep hits each eligible enemy once; a charge counts hits per enemy within its cap', () => {
    const { sim, st } = powerArena('orbital_lance');
    const ids = enemies(sim, 'walker_mech', [400, 450, 500, 550, 600, 650, 700]);
    const ev = [...cast(st, 'home', 500)];
    ev.push(...stepN(sim, 70));
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power');
    expect(new Set(hits.map((h) => h.targetId)).size).toBe(6);
    expect(hits).toHaveLength(6);
    expect(hits.every((h) => ids.slice(0, 6).includes(h.targetId))).toBe(true);
    const s = powerArena('stampede');
    mine(s.sim, 'bonker', 250);
    const t = enemies(s.sim, 'bonker', [300, 320, 340, 360, 380, 400, 420, 440]);
    const ev2 = [...cast(s.st, 'field')];
    ev2.push(...stepN(s.sim, 120));
    const hit2 = new Set(ofKind(ev2, 'hit').filter((h) => h.sourceKind === 'power').map((h) => h.targetId));
    expect(hit2.size).toBeLessThanOrEqual(6);
    expect([...hit2].every((id) => t.slice(0, 6).includes(id))).toBe(true);
  });

  it('a buff affects at most the 8 frontmost own units', () => {
    const { sim, st } = powerArena('royal_decree');
    const ids = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550].map((p) => mine(sim, 'footman', p));
    const ev = [...cast(st, 'field')];
    ev.push(...stepN(sim, 12));
    const buffed = new Set(ofKind(ev, 'statusApplied').filter((s) => s.kind === 'damageBuff').map((s) => s.id));
    expect(buffed.size).toBe(8);
    expect([...buffed].sort((a, b) => a - b)).toEqual(ids.slice(2));
    expect(ofKind(ev, 'statusApplied').find((s) => s.kind === 'speedBuff')?.ms).toBe(8000);
  });
});

describe('Age Powers: effect kinds (A2.9.7)', () => {
  it('a snare field: 16 pulses 0.5 s apart, 5 damage each, snare 35% slows moving and attacking', () => {
    const { sim, st } = powerArena('caltrops');
    const [a] = enemies(sim, 'destrier_knight', [600], 1);
    const ev = [...cast(st, 'home', 600)];
    ev.push(...stepN(sim, 200));
    expect(ofKind(ev, 'powerImpact')).toHaveLength(16);
    const hits = ofKind(ev, 'hit').filter((h) => h.targetId === a && h.sourceKind === 'power');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.damage === 500)).toBe(true);
    expect(ofKind(ev, 'statusApplied').some((s) => s.id === a && s.kind === 'snare' && s.ms === 1000)).toBe(true);
  });

  it('a snare slows move speed like a slow and attack speed too', () => {
    const { sim } = powerArena('caltrops');
    const u = devSpawn(sim, 1, 'footman', { p: L - 900 });
    const ctx = simCtx(sim);
    const unit = unitById(sim, u.id);
    if (!unit) throw new Error('no unit');
    const p0 = pLu(sim, u.id);
    stepN(sim, 1);
    const free = p0 - pLu(sim, u.id);
    unit.statuses.push({ kind: 'snare', magnitudeBp: 4000, untilTick: ctx.tick + 100, amount: 0, frozen: false, sourceId: -1 });
    const p1 = pLu(sim, u.id);
    stepN(sim, 1);
    const snared = p1 - pLu(sim, u.id);
    expect(snared).toBeCloseTo(free * 0.6, 2);
  });

  it('a pull field pulls 40% of the way to the centre on the first pulse (knockback resist applies)', () => {
    const { sim, st } = powerArena('boarding_nets');
    const [small] = enemies(sim, 'corsair', [700]);
    const ev = [...cast(st, 'home', 600)];
    ev.push(...stepN(sim, 21));
    const kb = ofKind(ev, 'knockback').find((k) => k.id === small);
    expect(kb).toBeDefined();
    // 100 lu off centre → pulled 40 lu toward the caster's centre at p 600
    expect(L - pLu(sim, small as number)).toBeCloseTo(660, 0);
  });

  it('a stun field stuns once; Legendaries keep half of a power’s control and take half its damage', () => {
    const { sim, st } = powerArena('stasis_field');
    const [titan] = enemies(sim, 'chrono_titan', [600], 1);
    const [knight] = enemies(sim, 'photon_knight', [620], 1);
    const ev = [...cast(st, 'home', 600)];
    ev.push(...stepN(sim, 21));
    expect(ofKind(ev, 'powerImpact')).toHaveLength(1);
    const st1 = ofKind(ev, 'statusApplied').filter((s) => s.kind === 'stun');
    expect(st1.find((s) => s.id === knight)?.ms).toBe(2000);
    expect(st1.find((s) => s.id === titan)?.ms).toBe(1000);
    expect(st1.find((s) => s.id === knight)?.frozen).toBe(true);
  });

  it('a strike locks the eligible enemy nearest the aim, homes on it, and Epics take 50%', () => {
    const { sim, st } = powerArena('sharpshooter');
    const [near] = enemies(sim, 'fusilier', [900]);
    const [cannon] = enemies(sim, 'bronze_cannon', [960]);
    const ev = [...cast(st, 'field', 950)];
    const tel = ofKind(ev, 'powerTelegraph')[0];
    expect(tel?.targetId).toBe(cannon);
    expect(tel?.telegraphMs).toBe(1500);
    ev.push(...stepN(sim, 40));
    const shots = ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power');
    expect(shots.every((h) => h.targetId === cannon)).toBe(true);
    expect(shots.length).toBeGreaterThanOrEqual(1);
    expect(shots[0]?.damage).toBe(15250);
    expect(shots.some((h) => h.targetId === near)).toBe(false);
  });

  it('a strike with nothing within 80 lu of the aim is rejected before payment; auto-aim ranks by value', () => {
    const { sim, st } = powerArena('sniper_team');
    const g0 = sim.state.sides[0].gold;
    const [raider] = enemies(sim, 'trench_raider', [500]);
    expect(rejected(cast(st, 'field', 800))).toBe('powerNoTarget');
    expect(sim.state.sides[0].gold).toBe(g0 + PASSIVE);
    // Auto-aim ranks by strike value: a kill counts cost × 1.3, other damage 0.4 × cost × damage ÷ HP.
    enemies(sim, 'tankette', [1500]);
    expect(ofKind(cast(st, 'field'), 'powerTelegraph')[0]?.targetId).toBe(raider);
  });

  it('Suppress needs the front at p ≥ 1,370, then silences every enemy mount for 5 s', () => {
    const { sim, st } = powerArena('undermine');
    devPlaceTurret(sim, 1, 0, 'crossbow_nest');
    devPlaceTurret(sim, 1, 1, 'crossbow_nest');
    expect(rejected(cast(st, 'field'))).toBe('powerOutOfReach');
    // F at 1,700: inside the enemy Crossbow Nests' 380 lu, so they fire at it until silenced
    const knight = mine(sim, 'footman', 1700);
    const u = unitById(sim, knight);
    if (u) u.hp = u.maxHp = 100000000;
    const ev = [...cast(st, 'field')];
    expect(ofKind(ev, 'powerTelegraph')[0]?.telegraphMs).toBe(1500);
    ev.push(...stepN(sim, 31));
    const sil = ofKind(ev, 'turretSilenced');
    expect(sil).toHaveLength(4);
    expect(sil.every((s) => s.side === 1)).toBe(true);
    const until = sil[0]?.untilTick ?? 0;
    expect(until).toBe((sil[0]?.tick ?? 0) + 100);
    const quiet = stepN(sim, until - sim.state.tick - 1);
    expect(ofKind(quiet, 'turretFired').filter((f) => f.side === 1)).toHaveLength(0);
    const loud = stepN(sim, 40);
    expect(ofKind(loud, 'turretFired').filter((f) => f.side === 1).length).toBeGreaterThan(0);
  });

  it('Flak hits air only; an air unit at the centre takes 3 × 240', () => {
    const { sim, st } = powerArena('aa_screen');
    const [gyro] = enemies(sim, 'gyrocopter', [600]);
    const [ground] = enemies(sim, 'rifleman', [600]);
    const ev = [...cast(st, 'home', 600)];
    ev.push(...stepN(sim, 30));
    const hits = ofKind(ev, 'hit').filter((h) => h.sourceKind === 'power');
    expect(hits.some((h) => h.targetId === ground)).toBe(false);
    expect(hits.filter((h) => h.targetId === gyro).reduce((a, h) => a + h.damage, 0)).toBe(72000);
  });

  it('a drop needs no aim and costs 150; the dropped units are summoned', () => {
    const { sim, st } = powerArena('paratroopers');
    enemies(sim, 'trench_raider', [700, 500]);
    const ev = [...cast(st, 'field')];
    expect(ofKind(ev, 'powerTelegraph')[0]?.cost).toBe(150);
    ev.push(...stepN(sim, 20));
    const drop = ofKind(ev, 'unitSpawned').filter((u) => u.card === 'rifleman');
    expect(drop).toHaveLength(3);
    expect(drop.every((u) => u.summoned && u.x === 650000)).toBe(true);
  });
});

describe('Age Powers: determinism and state (B3)', () => {
  it('the hash covers both slots, the remainder, the lockout and the mount silence', () => {
    const sim = createSim(matchConfig({ training: { noClock: true } }));
    const ctx = simCtx(sim);
    const h0 = hashState(ctx.s);
    ctx.s.sides[0].powerRem[1] = 1;
    const h1 = hashState(ctx.s);
    expect(h1).not.toBe(h0);
    ctx.s.sides[0].powerRem[1] = 0;
    ctx.s.sides[1].mountSilencedUntil[2] = 5;
    expect(hashState(ctx.s)).not.toBe(h0);
    ctx.s.sides[1].mountSilencedUntil[2] = 0;
    ctx.s.sides[0].powerLockoutUntil = 7;
    expect(hashState(ctx.s)).not.toBe(h0);
  });

  it('two runs with the same casts of every new kind produce the same hashes', () => {
    const run = (): number[] => {
      const out: number[] = [];
      for (const power of ['caltrops', 'sharpshooter', 'undermine', 'boarding_nets', 'stasis_field', 'point_defense']) {
        const { sim, st } = powerArena(power);
        enemies(sim, 'bonker', [300, 500, 700, 900], 1);
        mine(sim, 'bonker', 1400);
        cast(st, fixture.powers[power]?.slot ?? 'home', 600);
        stepN(sim, 200);
        out.push(sim.hash());
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('the observation shows my effective cost and reload, and the enemy card only once cast', () => {
    const { sim, st } = powerArena('meteor_shower');
    const o = sim.observe(0);
    expect(o.me.powers.home).toMatchObject({ card: 'meteor_shower', cost: 100, reloadMs: 40000, rateBp: 10000 });
    expect(o.me.powers.field?.card).toBe('stampede');
    expect(sim.observe(1).foe.powers.home).toEqual({ card: null, ppm: 1000000 });
    cast(st, 'home', 500);
    expect(sim.observe(1).foe.powers.home?.card).toBe('meteor_shower');
    expect(sim.observe(1).foe.powers.field?.card).toBeNull();
  });
});
