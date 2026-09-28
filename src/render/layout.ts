/**
 * World and screen layout (DESIGN A2.1, A17.3, A17.7).
 *
 * World units are lu. The lane runs from the left gate (x = 0) to the right gate (x = L, the lane from
 * core: 2,000 lu since A17); each base occupies 140 lu behind its gate and a 40 lu margin follows, so
 * the world is L + 360 lu wide, from x = -180 to x = L + 180. World y is in lu with 0 on the ground
 * line and negative values up (the same convention as the art: y points down, feet at 0).
 *
 * Screen layout (landscape) by device class (A17.7):
 *
 * | Class | Test (CSS px) | Top bar / lane band / tray | World scale s (px per lu) |
 * |---|---|---|---|
 * | Phone | height < 500 | 10% (min 36 px) / 68% / rest | lane band / 290 |
 * | Tablet, small laptop | width < 1,280 | 12% / 64% / 24% | min(width / 1,100, band / 330) |
 * | Desktop | width ≥ 1,280 | 12% / 64% / 24% | min(width / 1,400, band / 330) |
 *
 * The camera shows a window of the world at that scale (times an optional zoom) and scrolls.
 */
import type { Side } from '@/contracts';
import { LANE_MLU } from '@/core';

/** The lane from core (A17.15: 2,000 lu); the world width and the gates follow it. */
export const LANE_LU = LANE_MLU / 1000;
export const BASE_DEPTH_LU = 140;
export const WORLD_MARGIN_LU = 40;
/** 2,360 lu: lane, both bases and both margins (A17.3). */
export const WORLD_WIDTH_LU = LANE_LU + 2 * (BASE_DEPTH_LU + WORLD_MARGIN_LU);
/** World x of the far left edge (behind the left base). */
export const WORLD_LEFT_LU = -(BASE_DEPTH_LU + WORLD_MARGIN_LU);
export const WORLD_RIGHT_LU = WORLD_LEFT_LU + WORLD_WIDTH_LU;
/** Sim positions are milli-lu (B3). */
export const MILLI_LU = 1000;

/** The 12 / 64 / 24 split of tablets and desktops (A9.2). Phones use `PHONE_SPLIT`. */
export const SCREEN_SPLIT = { topBar: 0.12, laneBand: 0.64, tray: 0.24 } as const;
/** Phones (A17.7): a slimmer top bar (at least 36 px) and a taller lane band. */
export const PHONE_SPLIT = { topBar: 0.1, topBarMinPx: 36, laneBand: 0.68 } as const;

/** Screens shorter than this (CSS px, landscape) are phones (A17.7). */
export const PHONE_MAX_HEIGHT_PX = 500;
/** Screens at least this wide are desktops (A17.7). */
export const DESKTOP_MIN_WIDTH_PX = 1280;

/** World height (lu) a phone's lane band shows: enough for Legendaries above the ground line (A17.7). */
export const PHONE_BAND_LU = 290;
/** Tablets and desktops show at least this much world height in the lane band. */
export const MIN_WORLD_HEIGHT_LU = 330;
/** Target visible widths at zoom 1 (A17.7). */
export const TABLET_VIEW_LU = 1100;
export const DESKTOP_VIEW_LU = 1400;

/** The ground line sits this far down the lane band. */
export const GROUND_IN_BAND = 0.8;

export type DeviceClass = 'phone' | 'tablet' | 'desktop';

/** The A17.7 device class of a landscape screen of `width` × `height` CSS px. */
export function deviceClass(width: number, height: number): DeviceClass {
  if (height < PHONE_MAX_HEIGHT_PX) return 'phone';
  return width >= DESKTOP_MIN_WIDTH_PX ? 'desktop' : 'tablet';
}

export interface ScreenLayout {
  width: number;
  height: number;
  device: DeviceClass;
  topBarH: number;
  bandY: number;
  bandH: number;
  trayY: number;
  trayH: number;
  /** Screen y of the ground line. */
  groundY: number;
  /** World scale s: px per lu at zoom 1. */
  scale: number;
  /** Visible world width (lu) at zoom 1. */
  viewLu: number;
}

/** Computes the landscape layout for a screen of `width` × `height` CSS px (A17.7). */
export function screenLayout(width: number, height: number): ScreenLayout {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const device = deviceClass(w, h);
  let topBarH: number;
  let bandH: number;
  let scale: number;
  if (device === 'phone') {
    topBarH = Math.max(PHONE_SPLIT.topBarMinPx, h * PHONE_SPLIT.topBar);
    bandH = h * PHONE_SPLIT.laneBand;
    scale = bandH / PHONE_BAND_LU;
  } else {
    topBarH = h * SCREEN_SPLIT.topBar;
    bandH = h * SCREEN_SPLIT.laneBand;
    scale = Math.min(w / (device === 'desktop' ? DESKTOP_VIEW_LU : TABLET_VIEW_LU), bandH / MIN_WORLD_HEIGHT_LU);
  }
  const bandY = topBarH;
  const trayY = bandY + bandH;
  return {
    width: w,
    height: h,
    device,
    topBarH,
    bandY,
    bandH,
    trayY,
    trayH: Math.max(0, h - trayY),
    groundY: bandY + bandH * GROUND_IN_BAND,
    scale,
    viewLu: w / scale,
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
