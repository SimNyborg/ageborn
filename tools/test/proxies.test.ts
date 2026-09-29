import { describe, expect, it } from 'vitest';
import type { Loadout } from '../../src/contracts';
import { content } from '../../src/content';
import { createSim } from '../../src/sim';
import { HeadlessMatch } from '../lib/driver';
import { MatchTally } from '../lib/metrics';
import { agesOf, planIssues, sideConfig } from '../lib/plans';
import { EXPLOIT_PROXIES, STRATEGIES, createProxy, isProxyId, type ProxyId } from '../proxies';

/** Plays `id` on side 0 against the balanced proxy for `seconds` and returns the sim and tallies. */
function play(id: ProxyId, seconds: number, seed = 3) {
  const sim = createSim({
    seed,
    format: 'full',
    content,
    sides: [
      sideConfig(content, STRATEGIES[id].plan(content), { level: 7, label: `Proxy ${id}`, isBot: false }),
      sideConfig(content, STRATEGIES.balanced.plan(content), { level: 7, label: 'Proxy balanced', isBot: false }),
    ],
  });
  const m = new HeadlessMatch(sim, [
    { side: 0, controller: createProxy(id, content, 0, seed, 'full') },
    { side: 1, controller: createProxy('balanced', content, 1, seed, 'full') },
  ]);
  const t = new MatchTally(content);
  m.run({ maxTicks: seconds * 20, onEvents: (e) => t.push(e) });
  return { sim, stats: t.summary({ seed, format: 'full', outcome: sim.state.outcome, ticks: sim.state.tick, hash: sim.hash() }), commands: m.commands };
}

describe('exploit proxies (DESIGN B12)', () => {
  it('lists the eight B12 proxies, the A16.5 random-spam and mono-heavy proxies and the five A18.12 proxies', () => {
    expect(EXPLOIT_PROXIES).toHaveLength(15);
    expect(EXPLOIT_PROXIES.slice(8, 10)).toEqual(['random_spam', 'mono_heavy']);
    expect(EXPLOIT_PROXIES.slice(10)).toEqual(['drill_rush', 'tech_turtle', 'flag_ball', 'fallback_turtle', 'stance_toggler']);
    expect(isProxyId('turret_turtle')).toBe(true);
    expect(isProxyId('nope')).toBe(false);
  });

  it.each(Object.keys(STRATEGIES) as ProxyId[])('%s plays an A3-valid War Plan', (id) => {
    expect(planIssues(content, STRATEGIES[id].plan(content), 'full')).toEqual([]);
  });

  it('mass splash fields the splash cards DESIGN names', () => {
    const plan = STRATEGIES.mass_splash.plan(content);
    const all = agesOf(content).flatMap((a) => (plan[a] as Loadout).units);
    for (const c of ['grenadier', 'bronze_cannon', 'radio_operator']) expect(all).toContain(c);
  });

  it('heal stacking puts every healer in its age plan', () => {
    const plan = STRATEGIES.heal_stack.plan(content);
    for (const u of Object.values(content.units).filter((x) => !x.hidden && x.abilities.some((a) => a.kind === 'heal'))) {
      expect((plan[u.age] as Loadout).units).toContain(u.id);
    }
  });

  it('Economy greed researches Granary and Market before any turret or mount (A18.12 eco_greed)', () => {
    // Market is rank II: in a 7-age window it opens in the third age (A18.5.1)
    const commands = play('eco_greed', 330).commands.filter((c) => c.side === 0);
    const econ = commands.filter((c) => c.t === 'research' && c.track === 'economy');
    expect(econ.slice(0, 2).map((c) => (c.t === 'research' ? [c.rank, c.pick] : []))).toEqual([
      [1, 0],
      [2, 0],
    ]);
    const firstBuild = commands.find((c) => c.t === 'buildTurret' || c.t === 'buyMount')?.tick ?? Number.POSITIVE_INFINITY;
    expect(firstBuild).toBeGreaterThan(econ[1]?.tick ?? Number.POSITIVE_INFINITY);
  });

  it('the Balanced reference researches (A18.12); no_research never does', () => {
    expect(play('balanced', 240).commands.some((c) => c.side === 0 && c.t === 'research')).toBe(true);
    expect(play('no_research', 240).commands.some((c) => c.side === 0 && c.t === 'research')).toBe(false);
  });

  it('flag ball holds at 800; fallback turtle falls back; the toggler flips its stance in fights', () => {
    const ball = play('flag_ball', 120).commands.filter((c) => c.side === 0 && c.t === 'stance');
    expect(ball[0]).toMatchObject({ mode: 'hold', holdP: 800 });
    const back = play('fallback_turtle', 120).commands.filter((c) => c.side === 0 && c.t === 'stance');
    expect(back[0]).toMatchObject({ mode: 'fallback' });
    const flips = play('stance_toggler', 240).commands.filter((c) => c.side === 0 && c.t === 'stance');
    expect(flips.length).toBeGreaterThan(2);
  });

  it('the turtle fills four mounts and holds', () => {
    // A18: the turtle also researches (the Balanced list), so the fourth mount comes later
    const { sim, commands } = play('turret_turtle', 600);
    expect(sim.state.sides[0].mountsOwned).toBe(4);
    expect(sim.state.sides[0].turrets.filter((t) => t !== null).length).toBeGreaterThanOrEqual(3);
    expect(commands.some((c) => c.side === 0 && c.t === 'stance' && c.mode === 'hold')).toBe(true);
  });

  it('heavy plus mass ranged holds while it masses', () => {
    const stances = play('heavy_ranged', 120).commands.filter((c) => c.side === 0 && c.t === 'stance');
    expect(stances[0]).toMatchObject({ mode: 'hold' });
  });

  it('cheap spam only trains the cheapest unit', () => {
    const { stats } = play('cheap_spam', 60);
    const costs = Object.keys(stats.sides[0].trained).map((c) => content.units[c]?.cost);
    expect(new Set(costs)).toEqual(new Set([Math.min(...Object.values(content.units).filter((u) => u.age === 'stone' && !u.hidden).map((u) => u.cost))]));
  });

  it('the XP banker waits for the XP cap before evolving', () => {
    const banker = play('xp_bank', 150).stats.sides[0].evolveTicks[0] ?? Number.POSITIVE_INFINITY;
    const plain = play('balanced', 150).stats.sides[0].evolveTicks[0] ?? Number.POSITIVE_INFINITY;
    expect(banker).toBeGreaterThan(plain);
  });

  it('never spams commands the sim must reject for timing', () => {
    for (const id of ['balanced', 'turret_turtle', 'power_on_evolve'] as const) {
      const r = play(id, 300).stats.sides[0].rejected;
      expect(r['ascending'] ?? 0).toBe(0);
      expect(r['mountBusy'] ?? 0).toBe(0);
    }
  });
});
