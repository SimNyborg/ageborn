// R13 "1 Behemoth Tank vs 8 Riflemen" (Modern Age): scouted on the sim, the Behemoth Tank wins with about 4% HP.
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'modern', bg: '2a2a26', seed: 1, hero: 'behemoth_tank', horde: 'rifleman', n: 8, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
