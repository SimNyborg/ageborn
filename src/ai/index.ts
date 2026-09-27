/**
 * AI Generals (DESIGN A7, B10, C2/WP3): the utility brain, tiers 0-X, personalities, openings,
 * mistakes, the push gate, the attack clock, the gold estimator, the emote rule, and the scripted
 * brain of Old Grogg. Pure and deterministic (B2): integer math, seeded RNG, contracts and core only.
 *
 * Bots see only the delayed `Observation` (A7.1) and issue ordinary `Command`s.
 */
export { createBot } from './createBot';
export type { AiBotController } from './controller';
export { UtilityController, traceLine } from './controller';
export { ScriptedController, GROGG_SCRIPT, parseScript } from './scripted';
export type { ScriptAction, ScriptLine } from './scripted';
export { BALANCED_BRAIN_ID, BALANCED_WEIGHTS, botProfile, personalityFor, readGeneral, weightBp } from './personalities';
export type { BotProfileOptions, GeneralInfo, Personality, PersonalityId } from './personalities';
export { COUNTER_DEPTH_ALL, tierLabel, tierParams } from './tiers';
export type { TierParams } from './tiers';
export { BotMatch, runHeadless } from './harness';
export type { BotSeat, HeadlessResult } from './harness';
export { describeAction } from './actions';
export type { BotAction } from './actions';
export type { DecisionTrace, SavingGoal, Scored } from './brain';
export type { MistakeKind } from './mistakes';
