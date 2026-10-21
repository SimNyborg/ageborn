// R14 "1 Grand Marshal vs 8 Highlanders" (Gunpowder Age): scouted on the sim 2026-10-21, the Grand Marshal wins
// with about 6% HP (7 Highlanders: 16%, 9: the Highlanders win).
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'gunpowder', bg: '262019', seed: 1, hero: 'grand_marshal', horde: 'highlander', n: 8, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
