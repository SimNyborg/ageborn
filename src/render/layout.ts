/**
 * World and screen layout (DESIGN A2.1).
 *
 * World units are lu. The lane runs from the left gate (x = 0) to the right gate (x = 1,200); each
 * base occupies 140 lu behind its gate and a 40 lu margin follows, so the world is 1,560 lu wide,
 * from x = -180 to x = 1,380. World y is in lu with 0 on the ground line and negative values up
 * (the same convention as the art: y points down, feet at 0).
 *
 * Screen layout (landscape): top bar 12% of the height, lane band 64%, bottom tray 24%.
 */
import type { Side } from '@/contracts';

export const LANE_LU = 1200;
export const BASE_DEPTH_LU = 140;
export const WORLD_MARGIN_LU = 40;
/** 1,560 lu: lane, both bases and both margins (A2.1). */
export const WORLD_WIDTH_LU = LANE_LU + 2 * (BASE_DEPTH_LU + WORLD_MARGIN_LU);
/** World x of the left screen edge at zoom 1. */
export const WORLD_LEFT_LU = -(BASE_DEPTH_LU + WORLD_MARGIN_LU);
export const WORLD_RIGHT_LU = WORLD_LEFT_LU + WORLD_WIDTH_LU;
/** Sim positions are milli-lu (B3). */
export const MILLI_LU = 1000;

export const SCREEN_SPLIT = { topBar: 0.12, laneBand: 0.64, tray: 0.24 } as const;

/**
 * The lane band must show at least this much world height; on very wide, short screens this caps
 * the scale so tall units and bases stay inside the band (decision WP5 "camera").
 */
export const MIN_WORLD_HEIGHT_LU = 330;

/** The ground line sits this far down the lane band. */
export const GROUND_IN_BAND = 0.8;

/** Pinch zoom is only offered on screens narrower than this many CSS px (A2.1). */
export const NARROW_SCREEN_PX = 900;

export interface ScreenLayout {
  width: number;
  height: number;
  topBarH: number;
  bandY: number;
  bandH: number;
  trayY: number;
  trayH: number;
  /** Screen y of the ground line. */
  groundY: number;
  /** px per lu at zoom 1. */
  scale: number;
  /** Screen x of world x = WORLD_LEFT_LU at zoom 1 (non-zero when the height caps the scale). */
  offsetX: number;
}

/** Computes the landscape layout for a screen of `width` × `height` CSS px. */
export function screenLayout(width: number, height: number): ScreenLayout {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const topBarH = h * SCREEN_SPLIT.topBar;
  const bandH = h * SCREEN_SPLIT.laneBand;
  const trayH = h * SCREEN_SPLIT.tray;
  const bandY = topBarH;
  const scale = Math.min(w / WORLD_WIDTH_LU, bandH / MIN_WORLD_HEIGHT_LU);
  const offsetX = (w - WORLD_WIDTH_LU * scale) / 2;
  return {
    width: w,
    height: h,
    topBarH,
    bandY,
    bandH,
    trayY: bandY + bandH,
    trayH,
    groundY: bandY + bandH * GROUND_IN_BAND,
    scale,
    offsetX,
  };
}

/** World x of a base's centre: 70 lu behind its gate. */
export function baseCenterX(side: Side): number {
  return side === 0 ? -BASE_DEPTH_LU / 2 : LANE_LU + BASE_DEPTH_LU / 2;
}

/** World x of a side's gate line. */
export function gateX(side: Side): number {
  return side === 0 ? 0 : LANE_LU;
}

/** Own-side progress p (lu) to world x (lu). */
export function pToX(p: number, side: Side): number {
  return side === 0 ? p : LANE_LU - p;
}

/** World x (lu) to own-side progress p (lu). */
export function xToP(x: number, side: Side): number {
  return side === 0 ? x : LANE_LU - x;
}

/** +1 for side 0 (faces right), -1 for side 1 (A2.1). */
export function facingOf(side: Side): 1 | -1 {
  return side === 0 ? 1 : -1;
}
