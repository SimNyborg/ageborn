/**
 * Onboarding (DESIGN A8, C2/WP11): scripts, the tutorial director, adaptive hints, Old Grogg's
 * scripted brain and the dev autopilot. Layering (B2): contracts, core and i18n only.
 */
export * from './scripts';
export { TutorialDirector, type DirectorLogEntry, type DirectorLogKind, type TutorialDirectorOptions, type TutorialPrompt } from './director';
export { AdaptiveHints, type AdaptiveHintsOptions } from './hints';
export { GroggBrain, createGroggBrain } from './grogg';
export { TutorialAutopilot, createTutorialAutopilot, type AutopilotOptions } from './autopilot';
export { evolveReady, xpThreshold, type TickInput } from './view';
