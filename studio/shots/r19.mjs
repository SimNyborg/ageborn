// R19 "1 Armoured Train vs 6 Riveters" (Industrial Age, narrated balance test): scouted on the sim 2026-10-30, the
// Armoured Train wins with about 9% HP; 7 Riveters beat it with one left.
import { recordDuel } from './duel.mjs';

export const SPEC = { age: 'industrial', bg: '262220', seed: 1, hero: 'armoured_train', horde: 'riveter', n: 6, gap: -8 };

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
