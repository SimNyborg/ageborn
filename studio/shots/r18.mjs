// R18 "1 Elk Chieftain vs 5 Bonkers" (Stone Age, narrated balance test): scouted on the sim 2026-10-29, the Elk
// Chieftain wins with about 8% HP; 6 Bonkers beat it with two left. Stone uses scenes=game (shots/duel.mjs).
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'stone', bg: '2a2418', seed: 1, hero: 'elk_chieftain', horde: 'bonker', n: 5, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
