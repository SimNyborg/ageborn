/**
 * Barrel for all contracts (DESIGN B15). Type-only: importing this module has no runtime cost.
 * Fakes are not re-exported here; import them from `src/contracts/fakes` in tests and dev pages.
 */
export type * from './ids';
export type * from './content';
export type * from './commands';
export type * from './events';
export type * from './sim';
export type * from './observation';
export type * from './bot';
export type * from './art';
export type * from './audio';
export type * from './hud';
export type * from './save';
export type * from './meta';
export type * from './session';
export type * from './platform';
export type * from './feel';
export type * from './i18n';
