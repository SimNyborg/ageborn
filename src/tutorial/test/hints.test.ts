import { describe, expect, it } from 'vitest';
import { AdaptiveHints } from '../hints';
import { ADAPTIVE, sec } from '../scripts';
import { Harness, config } from './helpers';

/** Runs `n` quiet ticks and returns the ids of hints fired. */
function run(hints: AdaptiveHints, h: Harness, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    h.advance();
    const hint = hints.update(h.input());
    if (hint) out.push(hint.id);
  }
  return out;
}

describe('Adaptive hints (DESIGN A8)', () => {
  it('fire only on failure patterns: nothing happens in a quiet match', () => {
    const h = new Harness();
    expect(run(new AdaptiveHints(), h, sec(120))).toEqual([]);
  });

  it('"Their turret shreds melee": 3 melee units killed by turrets within 20 s', () => {
    const h = new Harness();
    const hints = new AdaptiveHints();
    h.advance();
    expect(hints.update(h.input([h.died('bonker', 'turret', 'rock_tosser'), h.died('bonker', 'turret', 'rock_tosser')]))).toBeNull();
    h.advance(sec(25));
    // The first two left the window.
    expect(hints.update(h.input([h.died('bonker', 'turret', 'rock_tosser')]))).toBeNull();
    h.advance();
    const hint = hints.update(h.input([h.died('tuskback', 'turret', 'rock_tosser'), h.died('bonker', 'turret', 'rock_tosser')]));
    expect(hint).toMatchObject({ id: 'turretShredsMelee', textKey: 'tutorial.hint.turretShredsMelee' });
    // Ranged losses to turrets do not count.
    h.advance(sec(40));
    const pebblers = [h.died('pebbler', 'turret', 'rock_tosser'), h.died('pebbler', 'turret', 'rock_tosser'), h.died('pebbler', 'turret', 'rock_tosser')];
    expect(hints.update(h.input(pebblers))).toBeNull();
  });

  it('"Heavies stop Bonkers": 3 Bonkers killed by Heavies, only with a Spear Hunter in the plan', () => {
    const h = new Harness();
    const byTusk = () => h.died('bonker', 'unit', 'tuskback');
    h.advance();
    expect(new AdaptiveHints().update(h.input([byTusk(), byTusk(), byTusk()]))?.id).toBe('heaviesStopInfantry');
    const cfg = config();
    cfg.sides[0].loadouts.stone = { ...cfg.sides[0].loadouts.stone!, units: ['bonker', 'pebbler', 'tuskback', null, null] };
    const h2 = new Harness(cfg);
    h2.advance();
    expect(new AdaptiveHints().update(h2.input([byTusk(), byTusk(), byTusk()]))).toBeNull();
  });

  it('"Your power is ready": full for 15 s with 3 enemies on your half', () => {
    const h = new Harness();
    const hints = new AdaptiveHints();
    h.state.sides[0].powerPpm = 1_000_000;
    for (const x of [400_000, 450_000, 500_000]) h.addUnit(1, 'bonker', x);
    const fired = run(hints, h, ADAPTIVE.powerIdleTicks + 1);
    expect(fired).toEqual(['powerReady']);
  });

  it('"Evolve before they do": evolve ready and unused for 10 s', () => {
    const h = new Harness();
    h.state.sides[0].xp = 700_000;
    expect(run(new AdaptiveHints(), h, ADAPTIVE.evolveIdleTicks + 1)).toEqual(['evolveFirst']);
  });

  it('"Buy another turret mount": mounts full, next affordable, base hit recently', () => {
    const h = new Harness();
    const hints = new AdaptiveHints();
    h.gold(200);
    h.state.sides[0].turrets[0] = { card: 'rock_tosser', age: 'stone', level: 1, state: 'active', readyTick: 0, attack: { targetId: 0, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 } };
    h.advance();
    expect(hints.update(h.input())).toBeNull();
    expect(hints.update(h.input([{ e: 'baseDamaged', side: 0, sourceId: 1, damage: 100, hp: 900_000, maxHp: 1_000_000 }]))?.id).toBe('buyMount');
  });

  it('"Hold": only when the stance is available (from match 1), on Charge, after losses while outnumbered', () => {
    const cfg = config({ training: { stanceEnabled: [false, true] } });
    const locked = new Harness(cfg);
    for (const x of [600_000, 650_000]) locked.addUnit(1, 'bonker', x);
    locked.advance();
    const deaths = () => [0, 1, 2, 3].map(() => locked.died('pebbler', 'unit', 'bonker'));
    expect(new AdaptiveHints().update(locked.input(deaths()))).toBeNull();
    const open = new Harness();
    for (const x of [600_000, 650_000]) open.addUnit(1, 'bonker', x);
    open.advance();
    expect(new AdaptiveHints().update(open.input(deaths()))?.id).toBe('hold');
  });

  it('"Old turret? Tap it to modernise": an older-age turret with Modernise affordable for 15 s', () => {
    const h = new Harness();
    // Medieval: position 2 in Short War since A17.8 (Stone, Bronze, Medieval, Gunpowder)
    h.state.sides[0].ageIndex = 2;
    h.state.sides[0].turrets[0] = { card: 'rock_tosser', age: 'stone', level: 1, state: 'active', readyTick: 0, attack: { targetId: 0, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 } };
    h.gold(50);
    expect(run(new AdaptiveHints({ disabled: ['evolveFirst'] }), h, ADAPTIVE.outdatedTicks + 1)).toEqual([]);
    h.gold(100);
    expect(run(new AdaptiveHints({ disabled: ['evolveFirst'] }), h, ADAPTIVE.outdatedTicks + 1)).toEqual(['modernise']);
  });

  it('the modernise hint points at the old turret\'s mount', () => {
    const h = new Harness();
    h.state.sides[0].ageIndex = 2;
    h.state.sides[0].turrets[1] = { card: 'rock_tosser', age: 'stone', level: 1, state: 'active', readyTick: 0, attack: { targetId: 0, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 } };
    h.gold(100);
    const hints = new AdaptiveHints({ disabled: ['evolveFirst'] });
    let got: ReturnType<AdaptiveHints['update']> = null;
    for (let k = 0; k <= ADAPTIVE.outdatedTicks + 1 && !got; k += 1) {
      got = hints.update(h.input());
      h.advance();
    }
    expect(got?.id).toBe('modernise');
    expect(got?.target).toBe('mount1');
  });

  it('the modernise hint stays quiet while Evolve is ready (evolving first is the better move)', () => {
    const h = new Harness();
    // Short War is 3 ages (A18.3.4): the 2nd age still has an evolve
    h.state.sides[0].ageIndex = 1;
    h.state.sides[0].xp = 5_000_000;
    h.state.sides[0].turrets[0] = { card: 'rock_tosser', age: 'stone', level: 1, state: 'active', readyTick: 0, attack: { targetId: 0, impactTick: 0, nextAttackTick: 0, lastAttackTick: 0 } };
    h.gold(100);
    expect(run(new AdaptiveHints({ disabled: ['evolveFirst'] }), h, ADAPTIVE.outdatedTicks + 1)).toEqual([]);
  });

  it('once per match, at most 3 times each over the profile (counts persist)', () => {
    const h = new Harness();
    h.state.sides[0].xp = 700_000;
    let shown: Record<string, number> = { evolveFirst: 1 };
    const fired: string[] = [];
    for (let match = 0; match < 4; match += 1) {
      const hints = new AdaptiveHints({ shown });
      fired.push(...run(hints, h, sec(120)));
      shown = hints.shown();
    }
    expect(fired).toEqual(['evolveFirst', 'evolveFirst']);
    expect(shown).toEqual({ evolveFirst: 3 });
  });

  it('two different patterns still wait 30 s between hints', () => {
    const h = new Harness();
    h.state.sides[0].xp = 700_000;
    h.state.sides[0].powerPpm = 1_000_000;
    for (const x of [400_000, 450_000, 500_000]) h.addUnit(1, 'bonker', x);
    const fired: [string, number][] = [];
    const hints = new AdaptiveHints();
    for (let i = 0; i < sec(60); i += 1) {
      h.advance();
      const x = hints.update(h.input());
      if (x) fired.push([x.id, h.state.tick]);
    }
    expect(fired.map((f) => f[0])).toEqual(['evolveFirst', 'powerReady']);
    expect(fired[1]![1] - fired[0]![1]).toBeGreaterThanOrEqual(ADAPTIVE.gapTicks);
  });

  it('each hint shows at most once per match (C5 #2), and the trickle pattern comes from the app (A16.6)', () => {
    const h = new Harness();
    const hints = new AdaptiveHints();
    h.advance();
    hints.report('trickle');
    expect(hints.update(h.input())).toMatchObject({ id: 'trickle', textKey: 'tutorial.hint.trickle' });
    h.advance(sec(40));
    hints.report('trickle');
    expect(run(hints, h, sec(40))).toEqual([]);
    // A new match (a new AdaptiveHints with the saved counts) may show it again.
    const next = new AdaptiveHints({ shown: hints.shown() });
    next.report('trickle');
    h.advance();
    expect(next.update(h.input())?.id).toBe('trickle');
  });
});

