import { it } from 'vitest';
import { computeMatchStats } from '../stats';
import { STRATEGIES, fixture, matchConfig, runMatch, scriptedPlayer } from './helpers';

it('smoke', () => {
  const cfg = matchConfig({ seed: 7 });
  const t0 = Date.now();
  const res = runMatch(cfg, [scriptedPlayer(fixture, 0, 1, STRATEGIES.balanced!), scriptedPlayer(fixture, 1, 2, STRATEGIES.rush!)], { keepEvents: true });
  const ms = Date.now() - t0;
  const s = res.sim.state;
  const counts: Record<string, number> = {};
  for (const e of res.events) counts[e.e] = (counts[e.e] ?? 0) + 1;
  console.log('ticks', res.ticks, 'ms', ms, 'outcome', JSON.stringify(s.outcome));
  console.log(JSON.stringify(counts));
  console.log('ages', s.sides[0].ageIndex, s.sides[1].ageIndex, 'units', s.units.length, 'pop', s.sides[0].pop, s.sides[1].pop);
  console.log(JSON.stringify(computeMatchStats(res.events, cfg, 0)));
  console.log(JSON.stringify(computeMatchStats(res.events, cfg, 1)));
  const rej: Record<string, number> = {};
  for (const e of res.events) if (e.e === 'commandRejected') rej[e.t + ':' + e.reason] = (rej[e.t + ':' + e.reason] ?? 0) + 1;
  console.log(JSON.stringify(rej));
});
