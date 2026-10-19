// R12 "1 Chrono Titan vs 8 Pulse Troopers" (Future Age): scouted on the sim, the Chrono Titan wins with about 13% HP.
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'future', bg: '20242e', seed: 1, hero: 'chrono_titan', horde: 'pulse_trooper', n: 8, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
