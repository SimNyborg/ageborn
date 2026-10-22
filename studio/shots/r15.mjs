// R15 "1 Bronze Colossus vs 13 Hoplites" (Bronze Age): scouted on the sim 2026-10-22, the Colossus wins with
// about 1% HP (12 Hoplites: 6%).
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'bronze', bg: '2a2418', seed: 1, hero: 'bronze_colossus', horde: 'hoplite', n: 13, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
