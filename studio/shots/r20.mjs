// R20 "1 Mammoth Matriarch vs 2 Tuskbacks" (Stone Age, narrated balance test): scouted on the sim 2026-11-01, the
// Mammoth Matriarch wins with about 36% HP; 3 Tuskbacks beat it. Stone uses scenes=game (shots/duel.mjs).
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'stone', bg: '2a2418', seed: 1, hero: 'mammoth_matriarch', horde: 'tuskback', n: 2, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
