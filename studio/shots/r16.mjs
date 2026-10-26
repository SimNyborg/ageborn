// R16 "1 Lindworm vs 5 Crossbowmen" (Medieval Age, balance test): scouted on the sim 2026-10-26, the Lindworm wins
// with about 17% HP; with 6 Crossbowmen it falls.
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'medieval', bg: '2a2824', seed: 1, hero: 'lindworm', horde: 'crossbowman', n: 5, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
