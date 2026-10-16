// R7 "1 Hydra vs 5 Hoplites" (Bronze Age): scouted on the sim, the Hydra wins with about 14% HP.
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'bronze', bg: '2c2418', seed: 1, hero: 'hydra', horde: 'hoplite', n: 5, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
