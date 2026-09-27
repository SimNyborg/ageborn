import { it } from 'vitest';
import { STRATEGIES, fixture, matchConfig, runMatch, scriptedPlayer } from './helpers';

it('tutorial trace', () => {
  const cfg = matchConfig({
        seed: 505,
        format: 'tutorial',
        training: {
          noClock: true,
          enemyBaseStartBp: 5000,
          manualLastStand: [false, false],
          stanceEnabled: [false, false],
          trays: { stone: [0], medieval: [0, 1], gunpowder: [0, 1], modern: [0, 1], future: [0, 1] },
          script: [
            { tick: 400, side: 0, unlockSlot: 1 },
            { tick: 800, side: 0, grantGold: 150 },
            { tick: 1600, side: 0, setPowerPpm: 1000000 },
          ],
        },
      });
  const S = STRATEGIES;
  runMatch(cfg, [scriptedPlayer(fixture, 0, 1, S.rush!), scriptedPlayer(fixture, 1, 2, { ...S.greedy!, weights: [1, 0, 0, 0, 0], turrets: 0, treasury: 0, reserve: 400, every: 40 })], {
    maxTicks: 4000,
    onTick: (sim, ev) => {
      const s = sim.state;
      for (const e of ev) if (e.e === 'commandRejected' && e.side === 0 && s.tick < 2000) console.log('rej', e.tick, e.t, e.reason);
      if (s.tick % 400 !== 0) return;
      const f = [0, 1].map((side) => {
        const us = s.units.filter((u) => u.side === side && !u.air);
        const ps = us.map((u) => (side === 0 ? u.x : 1200000 - u.x) / 1000);
        return `n=${us.length} front=${Math.max(-1, ...ps).toFixed(0)} modes=${us.map(u=>u.mode[0]).join('')} pop=${s.sides[side].pop} q=${s.sides[side].queue.length} gold=${(s.sides[side].gold/1000)|0} age=${s.sides[side].ageIndex} base=${s.sides[side].baseHp/100}`;
      });
      console.log(s.tick, f.join(' | '));
    },
  });
});
