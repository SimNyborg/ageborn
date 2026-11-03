// DV14 "same start, same fight" (devlog #14): the R19 duel (shots/r19.mjs) recorded again on 2026-11-03, days after
// R19, to show that the simulation is deterministic (seeded RNG, integer math; DESIGN B2/B3).
import { recordDuel } from './duel.mjs';
import { SPEC } from './r19.mjs';

export async function record(ctx) {
  await recordDuel(ctx, SPEC);
}
