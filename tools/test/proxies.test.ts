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
    expect(EXPLOIT_PROXIES).toHaveLength(20);
    expect(EXPLOIT_PROXIES.slice(8, 10)).toEqual(['random_spam', 'mono_heavy']);
    expect(EXPLOIT_PROXIES.slice(10, 15)).toEqual(['drill_rush', 'tech_turtle', 'flag_ball', 'fallback_turtle', 'stance_toggler']);
    // A2.9.12 power proxies (the wave pair, no_power and the gate sniper run in their own job set)
    expect(EXPLOIT_PROXIES.slice(15)).toEqual(['power_hoarder', 'home_turtle', 'power_spam', 'drop_spam', 'runner_reach']);
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
    // A18: the turtle also researches (the Balanced list), so the fourth mount comes later; since the
    // power rework (A2.9.2) its casts cost gold too, which moves the fourth mount to ~13 min.
    const { sim, commands } = play('turret_turtle', 800);
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

describe('Age Power proxies (A2.9.12)', () => {
  const casts = (commands: ReturnType<typeof play>['commands']) => commands.filter((c) => c.side === 0 && c.t === 'power');

  it('the power hoarder holds at 480 and casts only its Home slot, auto-aimed', () => {
    const { commands } = play('power_hoarder', 420);
    expect(commands.find((c) => c.side === 0 && c.t === 'stance')).toMatchObject({ mode: 'hold', holdP: 480 });
    const cs = casts(commands);
    expect(cs.length).toBeGreaterThan(0);
    for (const c of cs) expect(c).toMatchObject({ slot: 'home' });
    for (const c of cs) expect('p' in c && c.p !== undefined).toBe(false);
  });

  it('no_power never casts; power_spam casts both slots', () => {
    expect(casts(play('no_power', 300).commands)).toHaveLength(0);
    const slots = new Set(casts(play('power_spam', 300).commands).map((c) => (c.t === 'power' ? c.slot : '')));
    expect(slots).toEqual(new Set(['home', 'field']));
  });

  it('drop spam, the runner and the gate sniper carry their Field power where the age has one', () => {
    expect(STRATEGIES.drop_spam.plan(content).modern?.powers.field).toBe('paratroopers');
    expect(STRATEGIES.drop_spam.plan(content).cosmic?.powers.field).toBe('warp_strike');
    expect(STRATEGIES.runner_reach.plan(content).gunpowder?.powers.field).toBe('horse_artillery');
    expect(STRATEGIES.gate_sniper.plan(content).cosmic?.powers.field).toBe('ion_cannon');
  });

  it('the covered value reads the reach area, the cap and the screen (the save_counter trigger)', () => {
    const p = createProxy('save_counter', content, 0, 1, 'full');
    const unit = (id: number, p: number) => ({ id, side: 1 as const, card: 'bonker', level: 1, p: p * 1000, hp: 100, maxHp: 100, shield: 0, air: false, summoned: false });
    // Eight Bonkers in the Home half and a rich clump past mid-lane: Meteor Shower (cap 4) covers four.
    const units = [...[440, 460, 480, 500, 520, 540, 560, 580].map((x, i) => unit(10 + i, x)), ...[1300, 1310, 1320, 1330].map((x, i) => unit(30 + i, x))];
    const z = p.coveredZone({ side: 0, units } as never, 'meteor_shower');
    const cost = content.units.bonker?.cost ?? 0;
    expect(z.value).toBe(4 * cost);
    expect(z.count).toBe(4);
    // the aim stays inside the Home band (centre ≤ 1,000 − zone / 2)
    expect(z.p).not.toBeNull();
    expect(z.p as number).toBeLessThanOrEqual(1000 - (content.powers.meteor_shower?.effect as { zone: number }).zone / 2);
    // only the clump past mid-lane: nothing in reach
    expect(p.coveredZone({ side: 0, units: units.slice(8) } as never, 'meteor_shower').value).toBe(0);
  });

  it('bait, then wave lures the Home power before its banked wave goes', () => {
    const seed = 5;
    const sim = createSim({
      seed,
      format: 'standard',
      content,
      sides: [
        sideConfig(content, STRATEGIES.bait_wave.plan(content), { level: 7, label: 'Proxy bait_wave', isBot: false }),
        sideConfig(content, STRATEGIES.power_hoarder.plan(content), { level: 7, label: 'Proxy power_hoarder', isBot: false }),
      ],
    });
    const bait = createProxy('bait_wave', content, 0, seed, 'standard');
    const m = new HeadlessMatch(sim, [
      { side: 0, controller: bait },
      { side: 1, controller: createProxy('power_hoarder', content, 1, seed, 'standard') },
    ]);
    m.run({ maxTicks: 20 * 480 });
    expect(bait.baits.started).toBeGreaterThan(0);
  });
});
