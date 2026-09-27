/**
 * Team colours per preset (DESIGN A11 Team readability). The render uses them for its own overlays
 * (health bars, telegraph and power-target zones, mount markers); the art has its own copy in the
 * visual palette. Side 0 is the player (blue), side 1 the opponent.
 */
import type { Side, TeamPreset } from '@/contracts';

export const TEAM_COLORS: Record<TeamPreset, Record<Side, number>> = {
  default: { 0: 0x2f7df6, 1: 0xf28a1e },
  blueYellow: { 0: 0x2f7df6, 1: 0xf2c21e },
  highContrast: { 0: 0x1f5fd6, 1: 0xff6a00 },
};

export function teamColor(preset: TeamPreset, side: Side): number {
  return TEAM_COLORS[preset][side];
}

/** Mixes `color` toward white by `t` (0..1). */
export function tint(color: number, t: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const m = (c: number): number => Math.round(c + (255 - c) * t);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}

/** Darkens `color` by `t` (0..1). */
export function shade(color: number, t: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const m = (c: number): number => Math.round(c * (1 - t));
  return (m(r) << 16) | (m(g) << 8) | m(b);
}
