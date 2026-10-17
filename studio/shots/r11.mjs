// R11 "1 Land Dreadnought vs 6 Riveters" (Industrial Age): scouted on the sim, the Dreadnought wins with
// about 13% HP. With 7 Riveters it falls and its crew bails out (an idea for a later "plot twist" Reel).
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'industrial', bg: '262220', seed: 1, hero: 'land_dreadnought', horde: 'riveter', n: 6, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
