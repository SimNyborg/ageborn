import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Command, Observation, Side, Sim } from '@/contracts';
import { LANE_MLU, randInt, seedSfc32 } from '@/core';
import { simCtx } from '../debug';
import { xpCapOf } from '../state';
import { STRATEGIES, fixture, matchConfig, runMatch, scriptedPlayer, sideConfig } from './helpers';

const PHASE_ORDER = ['regulation', 'overdrive', 'siege', 'ended'];
const EMOTES = ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg'] as const;

/** Random commands of every kind with in- and out-of-range parameters. */
function chaos(side: Side, seed: number): (obs: Observation) => Command[] {
  const rng = seedSfc32(`chaos:${seed}:${side}`);
  return () => {
    if (randInt(rng, 4) !== 0) return [];
    const slot = randInt(rng, 8) as 0 | 1 | 2 | 3 | 4 | 5;
    const mount = randInt(rng, 5) as 0 | 1 | 2 | 3;
    const two = randInt(rng, 3) as 0 | 1;
    switch (randInt(rng, 13)) {
      case 0:
        return [{ t: 'train', side, slot }];
      case 1:
        return [randInt(rng, 2) ? { t: 'cancelTrain', side, slot } : { t: 'cancelTrain', side }];
      case 2:
        return [{ t: 'buildTurret', side, mount, slot: two }];
      case 3:
        return [{ t: 'replaceTurret', side, mount, slot: two }];
      case 4:
        return [{ t: 'sellTurret', side, mount }];
      case 5:
        return [{ t: 'buyMount', side }];
      case 6:
        return [
          randInt(rng, 5) === 0
            ? { t: 'researchCancel', side }
            : {
                t: 'research',
                side,
                track: (['troops', 'defences', 'economy', 'command'] as const)[randInt(rng, 4)] ?? 'economy',
                group: (['infantry', 'ranged', 'heavy', 'antiArmor', 'support'] as const)[randInt(rng, 5)] ?? 'infantry',
                rank: (randInt(rng, 3) + 1) as 1 | 2 | 3,
                pick: randInt(rng, 2) as 0 | 1,
              },
        ];
      case 7:
        return [{ t: 'evolve', side }];
      case 8:
        return [randInt(rng, 2) ? { t: 'power', side } : { t: 'power', side, p: randInt(rng, 1400) - 100 }];
      case 9:
        return [
          {
            t: 'stance',
            side,
            mode: (['charge', 'hold', 'fallback'] as const)[randInt(rng, 3)] ?? 'charge',
            ...(randInt(rng, 2) ? { holdP: randInt(rng, 1200) - 100 } : {}),
          },
        ];
      case 10:
        return [{ t: 'lastStand', side }];
      case 11:
        return [{ t: 'emote', side, emote: EMOTES[randInt(rng, 6)] ?? 'gg' }];
      default:
        return randInt(rng, 50) === 0 ? [{ t: 'retreat', side }] : [];
    }
  };
}

function both(a: (o: Observation) => Command[], b: (o: Observation) => Command[]): (o: Observation) => Command[] {
  return (o) => [...a(o), ...b(o)];
}

function fail(msg: string): never {
  throw new Error(`invariant broken: ${msg}`);
}

/** Plain comparisons (expect() is too slow per tick). */
function checkInvariants(sim: Sim, lastPhase: { i: number }): void {
  const s = sim.state;
  const ctx = simCtx(sim);
  const phaseIdx = PHASE_ORDER.indexOf(s.phase);
  if (phaseIdx < lastPhase.i) fail(`phase went back to ${s.phase} at ${s.tick}`);
  lastPhase.i = phaseIdx;
  for (const side of [0, 1] as const) {
    const st = s.sides[side];
    if (st.gold < 0 || !Number.isSafeInteger(st.gold)) fail(`gold ${st.gold} side ${side}`);
    if (st.xp < 0 || st.xp > xpCapOf(ctx, side)) fail(`xp ${st.xp} side ${side}`);
    if (st.powerPpm < 0 || st.powerPpm > 1000000) fail(`power ${st.powerPpm}`);
    if (st.baseHp < 0 || st.baseHp > st.baseMaxHp) fail(`base ${st.baseHp}/${st.baseMaxHp}`);
    if (st.pop > 60) fail(`pop ${st.pop}`);
    if (st.queue.length > 5) fail(`queue ${st.queue.length}`);
    let pop = 0;
    let legends = 0;
    for (const u of s.units) {
      if (u.side !== side) continue;
      const def = fixture.units[u.card];
      if (!u.summoned) pop += def?.pop ?? 0;
      if (def?.rarity === 'legendary') legends += 1;
    }
    for (const q of st.queue) if (fixture.units[q.card]?.rarity === 'legendary') legends += 1;
    if (st.pop !== pop) fail(`pop ${st.pop} != ${pop}`);
    if (legends > 1) fail(`${legends} legendaries side ${side} at ${s.tick}`);
  }
  for (const u of s.units) {
    if (u.hp > u.maxHp || u.hp <= 0) fail(`hp ${u.hp}/${u.maxHp} unit ${u.id}`);
    if (u.x < 0 || u.x > LANE_MLU) fail(`x ${u.x} unit ${u.id} ${u.card}`);
    if (!Number.isSafeInteger(u.x) || !Number.isSafeInteger(u.hp) || !Number.isSafeInteger(u.shield)) fail(`non-integer unit ${u.id}`);
  }
}

describe('fast-check invariants (B13)', () => {
  it('HP ≤ max, gold ≥ 0, no unit beyond a gate, pop ≤ 60, ≤ 1 Legendary, phases monotonic', () => {
    const plans = [{}, { epic: true, legendary: true, epicTurret: true }, { legendary: true, rareTurret: true, altPower: true }];
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.constantFrom('short', 'standard', 'full'),
        fc.constantFrom(...Object.keys(STRATEGIES)),
        fc.constantFrom(...Object.keys(STRATEGIES)),
        fc.constantFrom(0, 1, 2),
        (seed, format, s0, s1, plan) => {
          const cfg = matchConfig({
            seed,
            format: format as 'short',
            sides: [
              sideConfig(fixture, { plan: plans[plan], level: 1 + (seed % 10) }),
              sideConfig(fixture, { plan: plans[(plan + 1) % 3], isBot: true }),
            ],
            // a rich economy fills the pop cap and the Legendary slot quickly
            training: { script: Array.from({ length: 10 }, (_, i) => ({ tick: 1 + i * 300, side: (i % 2) as Side, grantGold: 3000 })) },
          });
          const phase = { i: 0 };
          runMatch(
            cfg,
            [
              both(scriptedPlayer(fixture, 0, seed, STRATEGIES[s0]!), chaos(0, seed)),
              both(scriptedPlayer(fixture, 1, seed + 7, STRATEGIES[s1]!), chaos(1, seed)),
            ],
            { maxTicks: 3000, onTick: (sim) => checkInvariants(sim, phase) },
          );
        },
      ),
      { numRuns: 20, seed: 20260927 },
    );
    expect(true).toBe(true);
  }, 60000);
});
