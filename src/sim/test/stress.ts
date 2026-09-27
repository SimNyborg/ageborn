/**
 * A worst-case Full War for the benchmark: both sides are showered with gold so they sit at the
 * 60-pop cap with mixed armies (Epics, Legendaries, splash and healers) for the whole match.
 */
import type { MatchConfig, ReplayDoc, Side } from '@/contracts';
import { buildReplay } from '../replay';
import { STRATEGIES, fixture, matchConfig, runMatch, scriptedPlayer, sideConfig } from './helpers';

export function stressConfig(seed = 4242): MatchConfig {
  return matchConfig({
    seed,
    format: 'full',
    sides: [
      sideConfig(fixture, { plan: { epic: true, legendary: true, rareTurret: true, epicTurret: true } }),
      sideConfig(fixture, { isBot: true, label: 'AI Stress', plan: { legendary: true, epicTurret: true } }),
    ],
    training: {
      script: Array.from({ length: 380 }, (_, i) => ({ tick: 1 + i * 30, side: (i % 2) as Side, grantGold: 400 })),
    },
  });
}

export function recordStress(seed = 4242): ReplayDoc {
  const { sim } = runMatch(stressConfig(seed), [
    scriptedPlayer(fixture, 0, seed, { ...STRATEGIES.heavy!, turrets: 4, every: 5, noisy: false }),
    scriptedPlayer(fixture, 1, seed + 1, { ...STRATEGIES.balanced!, turrets: 4, every: 5 }),
  ]);
  return buildReplay(sim);
}
