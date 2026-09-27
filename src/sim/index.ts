/**
 * The simulation package (DESIGN B3, C2/WP2). Pure and deterministic: integer math, seeded sfc32 RNG,
 * no time, DOM or rendering imports (B2).
 *
 * Provides `createSim`, `replayMatch`, the `Observation` projection (`sim.observe`), the `SimEvent`
 * stream (`sim.step`) and `MatchStats` (`createStatsTracker`, `computeMatchStats`).
 * Dev and test helpers live in `./debug` and are not re-exported here.
 */
export { createSim } from './createSim';
export { SIM_VERSION, ReplayContentMismatchError, buildReplay, replayConfig, replayMatch, verifyReplay } from './replay';
export type { ReplayCheck } from './replay';
export { computeMatchStats, createStatsTracker } from './stats';
export type { StatsConfig, StatsTracker } from './stats';
export { runDuel } from './duel';
export type { DuelResult } from './duel';
export { compileForSim } from './shim';
export type { RawContentLike } from './shim';
export { DAILY_MODIFIERS } from './modifiers';
export { BASE_TARGET, LAST_STAND_SOURCE_ID, NO_TARGET, POWER_SOURCE_ID, TURRET_SOURCE_BASE, turretSourceId } from './state';
