// R17 "1 Drone Carrier vs 4 Pulse Troopers" (Future Age, narrated balance test): scouted on the sim 2026-10-27, the
// Drone Carrier wins with about 19% HP; 5 Pulse Troopers beat it with one left.
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'future', bg: '20242e', seed: 1, hero: 'drone_carrier', horde: 'pulse_trooper', n: 4, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
