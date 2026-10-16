// R8 "1 Ursa Paladin vs 8 Footmen" (Medieval Age): scouted on the sim, the Paladin wins with about 4% HP.
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'medieval', bg: '2a2824', seed: 1, hero: 'ursa_paladin', horde: 'footman', n: 8, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
