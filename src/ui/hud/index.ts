/**
 * The battle HUD (DESIGN A9.2, B6): a Preact DOM overlay over the battle canvas.
 *
 * The app (WP11) mounts `<Hud model={session.hud} config={...} issue={session.issue} view={battleView} ... />`
 * in a box that covers the canvas exactly. `ui` may not import `render` (B2): the battle view is passed
 * in through the structural `HudViewBridge`, which `render/BattleView` satisfies.
 */
export { Hud, WIDE_HUD_PX } from './Hud';
export type { HudProps } from './Hud';
export type { HudViewBridge, HudViewEvent } from './bridge';
export type { Translate } from './context';
export type { PortraitFn } from './usePortrait';
export {
  HUD_TEAM_COLORS,
  POWER_DRAG_PX,
  clockView,
  formatClock,
  hudTeamColors,
  keyIntent,
  lowHp,
  mountMenu,
  nextSpeed,
  type DenyTarget,
  type HudIntent,
  type MountMenu,
} from './model';
export { hudSamples, sampleHudModel } from './samples';
export type { HudSample } from './samples';
