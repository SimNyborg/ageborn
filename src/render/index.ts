/**
 * The battle renderer (DESIGN B6, C2/WP5): battle view, event mapper, feel layer, HUD model,
 * graphics presets and the fixed-step clock helper. Layer rules (B2): contracts, core and pixi.js
 * only; the `ArtProvider` and `AudioService` arrive by injection.
 */
export { BattleView } from './battleView';
export type { BattleViewOptions } from './battleView';
export { Camera, followFraction } from './camera';
export { depthRows, rowForRank, AIR_ALTITUDE_LU } from './depth';
export {
  EventMapper,
  attackOf,
  coinCount,
  crumbleStage,
  decodeTurretSource,
  dieSoundFor,
  hitSoundFor,
  sparkFor,
  spawnSoundFor,
  transposeAfter,
} from './eventMapper';
export type { UnitInfo } from './eventMapper';
export { cloneFeelConfig, defaultFeelConfig, feelRule, validateFeelConfig } from './feelConfig';
export type { FeelRuleExt, FeelTuning, RenderFeelConfig } from './feelConfig';
export { HUD_HZ, HudModelBuilder, TrayUnlocks, ageOrder, buildHudModel, canEvolve, xpBarBp, xpThreshold } from './hudModel';
export type { HudExtras, HudSource } from './hudModel';
export { SCREEN_SPLIT, WORLD_WIDTH_LU, baseCenterX, gateX, pToX, screenLayout, xToP } from './layout';
export type { ScreenLayout } from './layout';
export { FixedStepClock, MAX_FRAME_MS, TICK_MS } from './loop';
export { hitTestMount, mountTapKind } from './mounts';
export type { MountTap, MountTapKind } from './mounts';
export { DRAG_THRESHOLD_PX, clampPowerP, powerZoneLu } from './powerTargeting';
export { AutoPresetMonitor, PRESETS, detectMobile, initialPreset, particleCap, presetDpr } from './presets';
export type { GraphicsPreset, GraphicsSetting, PresetSpec } from './presets';
export { SEAM_MAX_LU, SEAM_MIN_LU, SEAM_START_LU, frontMidpoint, stepSeam } from './seam';
export { showcaseMount } from './showcase';
export { TEAM_COLORS, teamColor } from './teamColors';
export { DEFAULT_VIEW_SETTINGS } from './types';
export type { Anchor, ViewAction, ViewEvent, ViewEventListener, ViewSettings } from './types';
