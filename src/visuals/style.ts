/**
 * Style constants for the chunky cartoon cutout look (DESIGN A11). Every number an artist or a
 * future adapter needs to match lives here; `docs/art-style.md` explains them.
 *
 * Units are lu (lane units, DESIGN A2.1). At 1,280 px wide the whole 1,560 lu world fits, so one lu is
 * about 0.82 px at 720p.
 */

export const STYLE = {
  /** px per lu at 1,280 x 720 (1,280 / 1,560). */
  pxPerLuAt720p: 1280 / 1560,
  /** Outlines are 3 px at 720p (DESIGN A11). */
  outlineLu: 3.7,
  /** Inner detail lines (faces, straps). */
  detailLineLu: 2.2,
  /** Cel shadow = fill darkened 18% (DESIGN A11). */
  shadePct: 0.18,
  /** Outline = fill darkened 45% (DESIGN A11). */
  outlinePct: 0.45,
  /** Far limbs are darkened a little for depth. */
  backTonePct: 0.14,
  /** One highlight shape per part: white at this alpha. */
  highlightAlpha: 0.32,
  /** The cel shadow crescent: how far the lit copy of a shape is shifted (fraction of its short side). */
  shadeOffsetFrac: 0.16,
  shadeOffsetMinLu: 1.2,
  shadeOffsetMaxLu: 7,
  /** Parts smaller than this (short side, lu) get no automatic shade or highlight. */
  autoShadeMinLu: 5,
  /** Heights by class (DESIGN A11 Scale). */
  heightInfantryLu: 68,
  heightHeavyLu: [100, 120] as const,
  heightLegendaryLu: [170, 220] as const,
  /** Visual body width stays within this factor of the collision width (DESIGN A11). */
  maxWidthFactor: 1.4,
  /** Collision widths by size (DESIGN A2.7). */
  collisionWidthLu: { small: 24, medium: 32, large: 48, huge: 80 } as const,
  /** The 12 px role glyph at 720p (DESIGN A11). */
  roleGlyphLu: 12 / (1280 / 1560),
  /** Level trims are drawn at this scale beside the role glyph (they follow the colour rule, A11). */
  levelTrimScale: 0.8,
  /** Health-bar-free units still need a readable minimum on screen (A12 checklist item 7). */
  minReadablePx: 32,
} as const;

/** Where the camera places the ground line and how far art extends (backdrop layout, lu). */
export const WORLD = {
  /** Left gate at x = 0, right gate at x = 1,200 (DESIGN A2.1). */
  laneLu: 1200,
  baseDepthLu: 140,
  marginLu: 40,
  /** Full world width fitted by the camera: 1,200 + 2 x 140 + 2 x 40. */
  worldWidthLu: 1560,
  worldLeftLu: -180,
  worldRightLu: 1380,
  /** Backdrops cover y from skyTop (negative, up) to groundBottom (below the ground line). */
  skyTopLu: -760,
  groundBottomLu: 240,
  /** Seam rules (DESIGN A11 Split-age lane). */
  seamHomeLu: 600,
  seamMinLu: 450,
  seamMaxLu: 750,
  seamDriftLuPerSec: 20,
  seamBlendLu: 240,
  seamDesaturate: 0.3,
  evolveWipeMs: 1500,
} as const;

/** Clip timings from DESIGN A11 (Clip contract). */
export const CLIP_TIMING = {
  spawnMs: 180,
  spawnOvershoot: 1.15,
  idleMs: 1200,
  idleBobLu: 2 / (1280 / 1560),
  walkCycleMs: 500,
  walkRefSpeedLuPerSec: 80,
  walkLegDeg: 25,
  walkBobLu: 3 / (1280 / 1560),
  attackSquash: [1.1, 0.9] as const,
  attackWindupShare: 0.6,
  hitFlashMs: 80,
  hitRecoilLu: 4 / (1280 / 1560),
  dieMs: 800,
  propLifeMs: 6000,
  propPool: 40,
  victoryMs: 700,
  stunMs: 900,
  twirlEveryMs: [6000, 10000] as const,
  blinkEveryMs: [2200, 4800] as const,
  turretFireSquashMs: 120,
  baseMorphMs: 1800,
} as const;
