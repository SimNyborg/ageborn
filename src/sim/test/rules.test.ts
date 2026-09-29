import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '@/contracts';
import { content as realContent } from '@/content';
import { fakeContent } from '@/contracts/fakes/content';
import { createSim } from '../createSim';
import { devPlaceTurret, devSetGold, devSetPower, simCtx, stepN } from '../debug';
import { DEFAULT_BATTLE, battleOf, rulesFor } from '../rules';
import { xpCapOf } from '../state';
import { AGES, Stamper, fixture, matchConfig, ofKind } from './helpers';

/**
 * The battle numbers without a contract field (`content.battle`, DESIGN A2.1-A2.11) are content data:
 * the sim reads them from the content it is given, with the DESIGN values as the fallback.
 */
describe('battle table (content.battle)', () => {
  function withBattle(battle: Record<string, unknown>): CompiledContent {
    return { ...fixture, battle: { ...(fixture as { battle?: object }).battle, ...battle } } as CompiledContent;
  }

  it('the fixture, WP1’s content and the fakes all give the DESIGN values', () => {
    // The frozen fixture keeps the A17 final-age XP cap (1,200); A18.3.2 raised it to 1,650.
    expect(battleOf(fixture)).toEqual({ ...DEFAULT_BATTLE, finalAgeXpCap: 1200 });
    expect(battleOf(realContent)).toEqual(DEFAULT_BATTLE);
    // the contract fakes carry no battle table
    expect(battleOf(fakeContent)).toEqual(DEFAULT_BATTLE);
    const r = rulesFor(fixture);
    expect(r.econ.finalAgeXpCap).toBe(1200000);
    expect(r.econ.moderniseCreditBp).toBe(5000);
    expect(r.econ.stampedeFallbackP).toBe(200000);
    expect(r.econ.midLane).toBe(1000000);
    expect(r.econ.siege).toMatchObject({ decayStepTicks: 20, decayBpPerStep: 50, moveSpeedBp: 12000, gateCrowd: 60000 });
    expect(r.econ.frontWidth).toBe(3);
    // A17.2: walking speed × 1.25 at compile time (Bonker 70 lu/s → 4,375 mlu per tick)
    expect(r.units['bonker']?.speed).toBe(4375);
    // Brace and air resist 100%, large 50%
    expect(r.units['pikeman']?.kbResistBp).toBe(10000);
    expect(r.units['gyrocopter']?.kbResistBp).toBe(10000);
    expect(r.units['tuskback']?.kbResistBp).toBe(5000);
    expect(r.units['bonker']?.kbResistBp).toBe(0);
  });

  it('every field is read from the content', () => {
    const c = withBattle({
      midLane: 500,
      windupPct: { melee: 30, ranged: 60, turret: 10 },
      braceKnockbackResistBp: 8000,
      airKnockbackResistBp: 6000,
      moderniseCreditBp: 2000,
      finalAgeXpCap: 900,
      siegeDecayStepMs: 2000,
      stampedeFallbackP: 300,
    });
    const r = rulesFor(c);
    expect(r.econ.midLane).toBe(500000);
    expect(r.econ.moderniseCreditBp).toBe(2000);
    expect(r.econ.finalAgeXpCap).toBe(900000);
    expect(r.econ.stampedeFallbackP).toBe(300000);
    // 0.5%/s applied every 2 s = 1% per step
    expect(r.econ.siege).toMatchObject({ decayStepTicks: 40, decayBpPerStep: 100 });
    expect(r.units['pikeman']?.kbResistBp).toBe(8000);
    expect(r.units['gyrocopter']?.kbResistBp).toBe(6000);
    // a huge air unit keeps the stronger of its size resist (50%) and the air resist
    expect(r.units['balloon_admiral']?.kbResistBp).toBe(6000);

    // defaults only fill attacks that state no windup (every table attack states one)
    const bare = withBattle({ windupPct: { melee: 30, ranged: 60, turret: 10 } });
    const bonker = bare.units['bonker'];
    const rock = bare.turrets['rock_tosser'];
    if (!bonker || !rock) throw new Error('fixture cards missing');
    const noWindup = {
      ...bare,
      units: { ...bare.units, bonker: { ...bonker, attacks: bonker.attacks.map(({ windupPct: _w, ...a }) => a) } },
      turrets: { ...bare.turrets, rock_tosser: { ...rock, attack: (({ windupPct: _w, ...a }) => a)(rock.attack) } },
    } as CompiledContent;
    expect(rulesFor(noWindup).units['bonker']?.attacks[0]?.windupPct).toBe(30);
    expect(rulesFor(noWindup).turrets['rock_tosser']?.attack.windupPct).toBe(10);
    expect(rulesFor(fixture).units['bonker']?.attacks[0]?.windupPct).toBe(40);
  });

  it('malformed fields fall back to the DESIGN values', () => {
    const c = withBattle({ finalAgeXpCap: 'x', windupPct: { melee: null }, midLane: Number.NaN });
    const b = battleOf(c);
    expect(b.finalAgeXpCap).toBe(DEFAULT_BATTLE.finalAgeXpCap);
    expect(b.windupPct.melee).toBe(40);
    expect(b.midLane).toBe(1000);
  });

  it('the match uses them: final-age XP cap, modernise credit, Stampede fallback', () => {
    const c = withBattle({ finalAgeXpCap: 900, moderniseCreditBp: 2000, stampedeFallbackP: 300 });
    const sim = createSim(matchConfig({ content: c, training: { noClock: true } }));
    const ctx = simCtx(sim);
    ctx.s.sides[0].ageIndex = AGES.length - 1;
    expect(xpCapOf(ctx, 0)).toBe(900000);

    // modernise a Stone turret in Medieval: 150 − 20% of 150 = 120
    ctx.s.sides[0].ageIndex = 1;
    devSetGold(sim, 0, 1000);
    devPlaceTurret(sim, 0, 0, 'rock_tosser');
    const st = new Stamper(sim);
    const before = sim.state.sides[0].gold;
    expect(ofKind(st.step({ t: 'replaceTurret', side: 0, mount: 0, slot: 0 }), 'turretReplaced')).toHaveLength(1);
    expect(sim.state.sides[0].gold - before).toBe(-120000 + 300);

    // Stampede with no own ground units starts at p = 300: centre 300 + 250
    ctx.s.sides[0].ageIndex = 0;
    devSetPower(sim, 0, 1000000);
    const tel = ofKind(st.step({ t: 'power', side: 0 }), 'powerTelegraph')[0];
    expect(tel?.power).toBe('stampede');
    expect(tel?.x).toBe(550000);
    stepN(sim, 1);
  });
});

describe('A16.4 / A17 economy fields', () => {
  it('fall back to the DESIGN values for content that predates them', () => {
    const e = { ...fixture.economy } as Record<string, unknown>;
    delete e['marchSpeedBp'];
    delete e['frontWidth'];
    e['siege'] = { turretDamageBp: 5000, baseDamageBp: 20000, decayBpPerSec: 50 };
    const old = { ...fixture, economy: e } as unknown as CompiledContent;
    const r = rulesFor(old);
    expect(r.units['bonker']?.speed).toBe(4375);
    expect(r.econ.siege).toMatchObject({ moveSpeedBp: 12000, gateCrowd: 60000 });
    expect(r.econ.frontWidth).toBe(3);
  });
});
