import { describe, expect, it } from 'vitest';
import { COUNTER_DEPTH_ALL, tierLabel, tierParams } from '../tiers';

/** DESIGN A7.3, listed rows. Times in ticks of 50 ms. */
describe('tier table (A7.3)', () => {
  it('reproduces every listed row', () => {
    const rows = [
      { tier: 0, dec: 40, snap: 20, mistake: 4500, actions: 2, depth: 0, evolve: 200, aim: 250, power: 100, treasury: 0, float: 450, hold: false, turrets: 1 },
      { tier: 1, dec: 32, snap: 18, mistake: 3500, actions: 3, depth: 0, evolve: 160, aim: 200, power: 100, treasury: 0, float: 400, hold: false, turrets: 4 },
      { tier: 3, dec: 27, snap: 15, mistake: 2500, actions: 5, depth: 1, evolve: 100, aim: 140, power: 250, treasury: 1, float: 250, hold: false, turrets: 4 },
      { tier: 5, dec: 22, snap: 13, mistake: 1600, actions: 7, depth: 3, evolve: 60, aim: 90, power: 350, treasury: 2, float: 180, hold: true, turrets: 4 },
      { tier: 7, dec: 17, snap: 10, mistake: 900, actions: 9, depth: COUNTER_DEPTH_ALL, evolve: 40, aim: 50, power: 450, treasury: 3, float: 120, hold: true, turrets: 4 },
      { tier: 10, dec: 10, snap: 6, mistake: 300, actions: 12, depth: COUNTER_DEPTH_ALL, evolve: 10, aim: 20, power: 600, treasury: 3, float: 80, hold: true, turrets: 4 },
    ];
    for (const r of rows) {
      const p = tierParams(r.tier);
      expect(p.decisionTicks, `tier ${r.tier} decision`).toBe(r.dec);
      expect(p.snapshotDelayTicks, `tier ${r.tier} snapshot`).toBe(r.snap);
      expect(p.mistakeBp).toBe(r.mistake);
      expect(p.maxActionsPer10s).toBe(r.actions);
      expect(p.counterDepth).toBe(r.depth);
      expect(p.evolveDelayTicks).toBe(r.evolve);
      expect(p.powerAimErrorLu).toBe(r.aim);
      expect(p.powerThreshold).toBe(r.power);
      expect(p.treasuryMax).toBe(r.treasury);
      expect(p.goldFloat).toBe(r.float);
      expect(p.hold).toBe(r.hold);
      expect(p.turretRebuild).toBe(r.hold);
      expect(p.maxTurrets).toBe(r.turrets);
    }
  });

  it('switches the yes/no columns on at the listed tier', () => {
    expect(tierParams(6).remembersComposition).toBe(false);
    expect(tierParams(7).remembersComposition).toBe(true);
    expect(tierParams(9).predictsNextAge).toBe(false);
    expect(tierParams(10).predictsNextAge).toBe(true);
    expect(tierParams(4).hold).toBe(false);
    expect(tierParams(5).hold).toBe(true);
    expect(tierParams(6).safeWindowEvolve).toBe(false);
    expect(tierParams(7).safeWindowEvolve).toBe(true);
    expect(tierParams(9).powerAnyWhenLowBase).toBe(false);
    expect(tierParams(10).powerAnyWhenLowBase).toBe(true);
  });

  it('interpolates numeric columns for II, IV, VI, VIII and IX', () => {
    // II: halfway between I and III.
    const ii = tierParams(2);
    expect(ii.mistakeBp).toBe(3000);
    expect(ii.maxActionsPer10s).toBe(4);
    expect(ii.goldFloat).toBe(325);
    expect(ii.powerThreshold).toBe(175);
    expect(ii.treasuryMax).toBe(0); // 0.5 truncates toward the lower tier
    // VIII and IX: one and two thirds of the way from VII to X.
    expect(tierParams(8).mistakeBp).toBe(700);
    expect(tierParams(9).mistakeBp).toBe(500);
    expect(tierParams(8).maxActionsPer10s).toBe(10);
    expect(tierParams(9).maxActionsPer10s).toBe(11);
    expect(tierParams(8).powerAimErrorLu).toBe(40);
    // Decision interval VI: (1,100 + 850) / 2 = 975 ms → 20 ticks (round half up).
    expect(tierParams(6).decisionTicks).toBe(20);
  });

  it('takes counter depth from the lower listed tier', () => {
    expect(tierParams(2).counterDepth).toBe(0);
    expect(tierParams(4).counterDepth).toBe(1);
    expect(tierParams(6).counterDepth).toBe(3);
    expect(tierParams(8).counterDepth).toBe(COUNTER_DEPTH_ALL);
  });

  it('never reacts faster than 300 ms and always decides slower than it sees', () => {
    for (let t = 0; t <= 10; t += 1) {
      const p = tierParams(t);
      expect(p.snapshotDelayTicks).toBeGreaterThanOrEqual(6);
      expect(p.decisionTicks).toBeGreaterThan(p.snapshotDelayTicks);
    }
  });

  it('clamps and accepts fractional tiers', () => {
    expect(tierParams(-3)).toEqual(tierParams(0));
    expect(tierParams(15)).toEqual(tierParams(10));
    expect(tierParams(Number.NaN)).toEqual(tierParams(0));
    expect(tierParams(1.5).mistakeBp).toBe(3250);
  });

  it('labels tiers with Roman numerals', () => {
    expect([0, 1, 5, 10].map(tierLabel)).toEqual(['0', 'I', 'V', 'X']);
  });
});
