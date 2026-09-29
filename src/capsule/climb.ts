/**
 * The Time Capsule itself (DESIGN A10): a carved stone-and-brass drum with 5 carved age rings that
 * light up as it climbs (Clay to Gold, each ring's gem in its own tier colour), a stone cap band
 * where summit gems settle for Platinum and Aeon, an upper brass band where Legendary crests stamp
 * (one per guaranteed Legendary), cracks that leak light in the current tier colour, the hammer, the
 * 4 strike pips and the pedestal. Pure drawing and small state; timing lives in the stage and plan.
 *
 * Honesty (A10 invariants): rings are carved stone until lit, and summit gems and crests are drawn
 * only once earned; there is never an empty socket, slot or outline for them.
 *
 * The drum is drawn once per state into a shared `GraphicsContext` and shown through two masked
 * halves, so the burst can split it apart. Origin: bottom centre of the drum.
 */
import { ColorMatrixFilter, Container, FillGradient, Graphics, GraphicsContext } from 'pixi.js';
import type { CapsuleTier } from '@/contracts';
import { mulberry32 } from '@/core';
import { clamp01, easeOutBack, easeOutBounce, easeOutCubic, lerp, span } from './ease';
import { AEON_FILIGREE, CREST, GROOVE_COLORS, HOLO_BANDS, ROOM, SUMMIT_GEM_UNLIT, TIER_COLORS, TIER_RAMPS, mixColor, shade, type TierRamp } from './palette';
import { crestCount, summitGemCount, SUMMIT_ABOVE, tierAt, tierIndex } from './tiers';

export const DRUM = { halfW: 90, height: 262 } as const;

/** Heights (drum coordinates, y up is negative) of the five carved age rings, bottom to top. */
const RING_Y = [-62, -91, -120, -149, -178];
/** Body, the upper brass (crest) band and the stone cap band. */
const BODY = { top: -192, bottom: -40 } as const;
const CREST_BAND = { top: -214, bottom: -192 } as const;
const CAP = { top: -236, bottom: -214 } as const;
/** Front centres of the crest band and the cap band (the bands sag 9 and 8 px at the front). */
const CREST_Y = (CREST_BAND.top + CREST_BAND.bottom) / 2 + 4.5;
const GEM_Y = (CAP.top + CAP.bottom) / 2 + 4;
const CREST_GAP = 24;
const GEM_GAP = 34;

/** What a drum shows: its material, the crests stamped and the summit gems that have risen. */
export interface DrumState {
  tier: CapsuleTier;
  /** Legendary crests on the upper brass band (0-3). */
  crests: number;
  /** Summit gems in the cap band: the tier each was ignited in, or null while risen but unlit. */
  gems: (CapsuleTier | null)[];
}

/** The full state of a drum that shows `tier` (all its crests, all its summit gems lit). */
export function drumState(tier: CapsuleTier): DrumState {
  const top = tierIndex(SUMMIT_ABOVE);
  return { tier, crests: crestCount(tier), gems: Array.from({ length: summitGemCount(tier) }, (_, i) => tierAt(top + 1 + i)) };
}

/** The n slots of a centred row, `gap` apart. */
function slotX(i: number, n: number, gap: number): number {
  return (i - (n - 1) / 2) * gap;
}

/** A cylinder band: flat top edge curving down in the middle (seen from slightly above). */
function band(g: GraphicsContext, yTop: number, yBot: number, hw: number, sag = 9): GraphicsContext {
  return g
    .moveTo(-hw, yTop)
    .quadraticCurveTo(0, yTop + sag, hw, yTop)
    .lineTo(hw, yBot)
    .quadraticCurveTo(0, yBot + sag, -hw, yBot)
    .closePath();
}

/** Horizontal cylinder shading: dark edge, highlight left of centre, base, darker right edge. */
function cylinder(color: number): FillGradient {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
    colorStops: [
      { offset: 0, color: shade(color, -0.42) },
      { offset: 0.2, color: shade(color, 0.22) },
      { offset: 0.34, color: shade(color, 0.08) },
      { offset: 0.72, color: shade(color, -0.12) },
      { offset: 1, color: shade(color, -0.5) },
    ],
  });
}

/**
 * The body gradient from a material ramp. Its stops are exactly the ramp's colours (plus darker
 * rims), which is what the palette test measures: highlight left of centre, the key, the mid-tone
 * across the right half, the shadow at the edge.
 */
export function bodyStops(tier: CapsuleTier): { offset: number; color: number }[] {
  const r: TierRamp = TIER_RAMPS[tier];
  if (tier === 'aeon') {
    // The time crystal: a midnight body lit from inside; the facets carry the key and highlight.
    return [
      { offset: 0, color: shade(r.shadow, -0.35) },
      { offset: 0.2, color: r.mid },
      { offset: 0.38, color: r.shadow },
      { offset: 0.8, color: r.shadow },
      { offset: 1, color: shade(r.shadow, -0.45) },
    ];
  }
  return [
    { offset: 0, color: shade(r.shadow, -0.2) },
    { offset: 0.17, color: r.highlight },
    { offset: 0.3, color: r.key },
    { offset: 0.64, color: r.mid },
    { offset: 0.9, color: r.shadow },
    { offset: 1, color: shade(r.shadow, -0.35) },
  ];
}

function bodyFill(tier: CapsuleTier): FillGradient {
  return new FillGradient({ type: 'linear', start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, colorStops: bodyStops(tier) });
}

/** Half-width of the body at height `y` is constant; a point on the cylinder's front curve at x. */
function frontY(y: number, x: number, sag = 9): number {
  const u = x / DRUM.halfW;
  return y + sag * (1 - u * u);
}

/** The material details of each tier, over the body fill (A10 table). */
function drawMaterial(g: GraphicsContext, tier: CapsuleTier): void {
  const r = TIER_RAMPS[tier];
  const rnd = mulberry32(911 + tierIndex(tier) * 37);
  const hw = DRUM.halfW;
  const inBody = (): [number, number] => [(rnd.next() * 2 - 1) * (hw - 10), BODY.top + 8 + rnd.next() * (BODY.bottom - BODY.top - 14)];
  switch (tier) {
    case 'clay': {
      // Matte fired terracotta: wheel-thrown lines and a speckled grain.
      for (let y = BODY.top + 14; y < BODY.bottom - 4; y += 11) {
        g.moveTo(-hw + 4, y).quadraticCurveTo(0, y + 9, hw - 4, y).stroke({ width: 1.2, color: r.highlight, alpha: 0.1 });
      }
      for (let i = 0; i < 70; i++) {
        const [x, y] = inBody();
        g.circle(x, y, 0.8 + rnd.next() * 1.1).fill({ color: rnd.next() < 0.6 ? shade(r.shadow, -0.2) : r.highlight, alpha: 0.3 });
      }
      break;
    }
    case 'bronze': {
      // Cast bronze: hammered dimples; verdigris creeps out of the ring grooves.
      for (let i = 0; i < 46; i++) {
        const [x, y] = inBody();
        const w = 4 + rnd.next() * 4;
        g.ellipse(x, y, w, w * 0.6).fill({ color: r.shadow, alpha: 0.16 });
        g.ellipse(x - 1, y - 1.2, w * 0.7, w * 0.35).fill({ color: r.highlight, alpha: 0.18 });
      }
      const verd = GROOVE_COLORS.bronze ?? r.shadow;
      for (const y of RING_Y) {
        for (let k = 0; k < 5; k++) {
          const x = (rnd.next() * 2 - 1) * (hw - 16);
          const w = 6 + rnd.next() * 14;
          g.ellipse(x, frontY(y, x) + 5 + rnd.next() * 3, w, 2.5 + rnd.next() * 3).fill({ color: verd, alpha: 0.45 });
        }
      }
      break;
    }
    case 'silver': {
      // Polished sterling: a mirror horizon and two crisp highlight bands.
      g.rect(10, BODY.top + 4, 24, BODY.bottom - BODY.top - 4).fill({ color: shade(r.shadow, -0.1), alpha: 0.28 });
      g.rect(34, BODY.top + 4, 6, BODY.bottom - BODY.top - 4).fill({ color: r.highlight, alpha: 0.25 });
      g.rect(-60, BODY.top + 6, 9, BODY.bottom - BODY.top - 8).fill({ color: 0xffffff, alpha: 0.45 });
      g.rect(-44, BODY.top + 6, 3, BODY.bottom - BODY.top - 8).fill({ color: 0xffffff, alpha: 0.35 });
      break;
    }
    case 'jade': {
      // Carved translucent jade: a light glowing from inside, clouds and veins.
      for (let k = 0; k < 6; k++) g.ellipse(-18, -118, 64 - k * 9, 70 - k * 10).fill({ color: r.highlight, alpha: 0.07 });
      for (let v = 0; v < 6; v++) {
        let [x, y] = inBody();
        g.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          x = Math.max(-hw + 8, Math.min(hw - 8, x + (rnd.next() - 0.5) * 34));
          y = Math.max(BODY.top + 6, Math.min(BODY.bottom - 6, y + 8 + rnd.next() * 14));
          g.lineTo(x, y);
        }
        g.stroke({ width: 1.6, color: v % 2 ? r.highlight : shade(r.shadow, -0.1), alpha: 0.28, join: 'round' });
      }
      break;
    }
    case 'gold': {
      // Champagne gold, engraved scrollwork between the rings (the grooves hold lapis enamel).
      const line = shade(r.shadow, -0.15);
      for (let i = 0; i < RING_Y.length; i++) {
        const y0 = (RING_Y[i] ?? 0) - 15;
        for (let x = -hw + 20; x <= hw - 20; x += 26) {
          const y = frontY(y0, x);
          g.moveTo(x - 9, y + 3).bezierCurveTo(x - 5, y - 5, x + 1, y + 6, x + 5, y - 1).stroke({ width: 1.3, color: line, alpha: 0.42, cap: 'round' });
          g.circle(x + 7, y - 2, 1.4).fill({ color: line, alpha: 0.42 });
        }
      }
      g.rect(-58, BODY.top + 6, 8, BODY.bottom - BODY.top - 8).fill({ color: 0xffffff, alpha: 0.35 });
      break;
    }
    case 'platinum': {
      // Brushed platinum: fine horizontal grain, long streak highlights, a thin-film prismatic edge.
      for (let y = BODY.top + 3; y < BODY.bottom + 2; y += 2.6) {
        const light = rnd.next() < 0.5;
        g.moveTo(-hw + 2, y).quadraticCurveTo(0, y + 9, hw - 2, y).stroke({ width: 0.9, color: light ? r.highlight : r.shadow, alpha: 0.05 + rnd.next() * 0.1 });
      }
      for (const [x0, y0, w] of [
        [-64, -168, 118],
        [-52, -104, 84],
        [-30, -74, 126],
      ] as const) {
        g.moveTo(x0, frontY(y0, x0)).quadraticCurveTo(x0 + w / 2, frontY(y0, x0 + w / 2) + 1, x0 + w, frontY(y0, x0 + w)).stroke({ width: 2.2, color: 0xffffff, alpha: 0.5, cap: 'round' });
      }
      const edge = new FillGradient({
        type: 'linear',
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
        colorStops: [...HOLO_BANDS, HOLO_BANDS[0] ?? 0xffffff].map((c, i, a) => ({ offset: i / (a.length - 1), color: c })),
      });
      for (const side of [-1, 1]) {
        const x = side < 0 ? -hw + 1.5 : hw - 7.5;
        g.rect(x, BODY.top + 2, 6, BODY.bottom - BODY.top - 2).fill({ fill: edge, alpha: 0.42 });
      }
      break;
    }
    case 'aeon': {
      // The time crystal: indigo facets over a midnight body, fixed stars, white-gold filigree.
      const cols = 6;
      const rows = 4;
      const w = (hw * 2) / cols;
      const h = (BODY.bottom - BODY.top) / rows;
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const x0 = -hw + cx * w;
          const y0 = BODY.top + cy * h;
          const j = (): number => (rnd.next() - 0.5) * 10;
          const a: [number, number] = [x0 + (cx ? j() : 0), y0 + (cy ? j() : 0)];
          const b: [number, number] = [x0 + w + (cx < cols - 1 ? j() : 0), y0 + (cy ? j() : 0)];
          const c: [number, number] = [x0 + w + (cx < cols - 1 ? j() : 0), y0 + h];
          const d: [number, number] = [x0 + (cx ? j() : 0), y0 + h];
          const shadeOf = (k: number): { color: number; alpha: number } => (k < 0.35 ? { color: r.mid, alpha: 0.75 } : k < 0.6 ? { color: r.key, alpha: 0.38 } : k < 0.72 ? { color: r.highlight, alpha: 0.22 } : { color: r.shadow, alpha: 0.4 });
          g.poly([...a, ...b, ...c]).fill(shadeOf(rnd.next())).stroke({ width: 1, color: r.highlight, alpha: 0.22 });
          g.poly([...a, ...c, ...d]).fill(shadeOf(rnd.next())).stroke({ width: 1, color: r.highlight, alpha: 0.18 });
        }
      }
      for (let i = 0; i < 26; i++) {
        const [x, y] = inBody();
        g.circle(x, y, 0.7 + rnd.next() * 1.2).fill({ color: rnd.next() < 0.5 ? 0xffffff : r.highlight, alpha: 0.55 + rnd.next() * 0.4 });
      }
      // White-gold filigree along the body's rims and curls beside each ring gem.
      for (const y of [BODY.top + 6, BODY.bottom - 7]) {
        g.moveTo(-hw + 4, y).quadraticCurveTo(0, y + 9, hw - 4, y).stroke({ width: 1.6, color: AEON_FILIGREE, alpha: 0.85 });
      }
      for (const y of RING_Y) {
        for (const side of [-1, 1]) {
          const x = side * 17;
          const yy = frontY(y, x) + 5;
          g.moveTo(side * 11, yy).bezierCurveTo(side * 18, yy - 7, side * 27, yy - 2, side * 24, yy + 3).stroke({ width: 1.3, color: AEON_FILIGREE, alpha: 0.8, cap: 'round' });
        }
      }
      break;
    }
  }
}

/** A Legendary crest: the Legendary star gem on a dark enamel shield with a white-gold rim (A10). */
export function drawCrest(g: GraphicsContext | Graphics, x: number, y: number, scale = 1, alpha = 1): void {
  const k = scale;
  g.moveTo(x - 8 * k, y - 9 * k)
    .lineTo(x + 8 * k, y - 9 * k)
    .lineTo(x + 8 * k, y + 1 * k)
    .quadraticCurveTo(x + 7 * k, y + 7 * k, x, y + 10.5 * k)
    .quadraticCurveTo(x - 7 * k, y + 7 * k, x - 8 * k, y + 1 * k)
    .closePath()
    .fill({ color: CREST.shield, alpha })
    .stroke({ width: 1.5 * k, color: CREST.rim, alpha });
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = (i % 2 === 0 ? 5.6 : 2.3) * k;
    pts.push(x + Math.cos(a) * rr, y - 0.5 * k + Math.sin(a) * rr);
  }
  g.poly(pts).fill({ color: CREST.star, alpha });
  g.circle(x - 1.3 * k, y - 2.4 * k, 1.1 * k).fill({ color: 0xffffff, alpha: 0.7 * alpha });
}

/**
 * A summit gem in its small brass bezel: lit in the tier it was ignited in, or clear, colourless
 * crystal while it waits for its strike (never the next tier's colour).
 */
export function drawSummitGem(g: GraphicsContext | Graphics, x: number, y: number, tier: CapsuleTier | null, scale = 1, alpha = 1): void {
  const k = scale;
  g.ellipse(x, y + 1 * k, 10 * k, 10.5 * k).fill({ color: ROOM.brassDark, alpha }).stroke({ width: 1.5 * k, color: shade(ROOM.brassDark, -0.5), alpha });
  g.ellipse(x, y + 0.5 * k, 8.5 * k, 9 * k).fill({ color: ROOM.brass, alpha });
  const c = tier ? TIER_COLORS[tier] : SUMMIT_GEM_UNLIT;
  const pts = [x, y - 8 * k, x + 6 * k, y - 3 * k, x + 6 * k, y + 3.5 * k, x, y + 8.5 * k, x - 6 * k, y + 3.5 * k, x - 6 * k, y - 3 * k];
  g.poly(pts).fill({ color: tier ? c : mixColor(c, 0x8c93a0, 0.25), alpha }).stroke({ width: 1.5 * k, color: tier ? 0xffffff : 0x6b7280, alpha: 0.9 * alpha });
  g.poly([x, y - 8 * k, x + 6 * k, y - 3 * k, x, y - 0.5 * k, x - 6 * k, y - 3 * k]).fill({ color: 0xffffff, alpha: (tier ? 0.45 : 0.3) * alpha });
  g.poly([x, y - 0.5 * k, x + 6 * k, y + 3.5 * k, x, y + 8.5 * k]).fill({ color: tier ? shade(c, -0.35) : 0x9aa1ad, alpha: 0.5 * alpha });
}

export interface DrawOptions {
  /** Leave the crests out (they are being animated in the overlay). */
  crests?: boolean;
  /** Leave the summit gems out (a gem is rising in the overlay). */
  gems?: boolean;
}

export function drawDrum(g: GraphicsContext, state: DrumState, o: DrawOptions = {}): void {
  g.clear();
  const tier = state.tier;
  const ramp = TIER_RAMPS[tier];
  const metal = ROOM.brass;
  const metalLine = shade(metal, -0.5);
  const stone = ROOM.stone;
  const stoneLine = shade(stone, -0.5);
  const bodyLine = shade(ramp.shadow, -0.45);
  const hw = DRUM.halfW;
  const lit = Math.min(RING_Y.length, Math.min(tierIndex(tier), tierIndex(SUMMIT_ABOVE)) + 1);

  // Plinth.
  band(g, -30, -4, hw + 10, 10).fill(cylinder(ROOM.stoneDark)).stroke({ width: 4, color: stoneLine });
  // Lower brass band.
  band(g, BODY.bottom, -30, hw + 4).fill(cylinder(metal)).stroke({ width: 3, color: metalLine });
  // Body in the tier material.
  band(g, BODY.top, BODY.bottom, hw).fill(bodyFill(tier));
  drawMaterial(g, tier);
  band(g, BODY.top, BODY.bottom, hw).stroke({ width: 4, color: bodyLine });
  // Carved age rings: grooves (lapis for Gold, verdigris for Bronze) and a gem at the front, lit in
  // its own tier's colour (the ladder reads bottom-up), or carved stone until reached.
  const groove = GROOVE_COLORS[tier] ?? shade(ramp.shadow, -0.3);
  RING_Y.forEach((y, i) => {
    const on = i < lit;
    g.moveTo(-hw + 3, y).quadraticCurveTo(0, y + 10, hw - 3, y).stroke({ width: 7, color: shade(groove, -0.35), alpha: 0.9 });
    g.moveTo(-hw + 3, y).quadraticCurveTo(0, y + 10, hw - 3, y).stroke({ width: 4, color: groove, alpha: 0.95 });
    g.moveTo(-hw + 3, y + 3).quadraticCurveTo(0, y + 13, hw - 3, y + 3).stroke({ width: 1.6, color: ramp.highlight, alpha: tier === 'aeon' ? 0.35 : 0.5 });
    const gy = y + 5;
    const gc = TIER_COLORS[tierAt(i)];
    g.poly([0, gy - 9, 7, gy, 0, gy + 9, -7, gy]).fill(on ? shade(gc, 0.15) : shade(stone, -0.35)).stroke({ width: 2.5, color: on ? 0xffffff : stoneLine, alpha: on ? 0.9 : 1 });
    if (on) {
      g.poly([0, gy - 9, 7, gy, 0, gy]).fill({ color: shade(gc, 0.55), alpha: 0.9 });
      g.poly([0, gy - 6, 3, gy - 1, 0, gy + 1, -3, gy - 1]).fill({ color: 0xffffff, alpha: 0.9 });
    }
  });
  // Cel highlight: one shape per part (A11).
  g.roundRect(-hw + 22, BODY.top + 8, 13, BODY.bottom - BODY.top - 18, 7).fill({ color: 0xffffff, alpha: tier === 'aeon' ? 0.1 : 0.16 });
  g.roundRect(hw - 16, BODY.top + 10, 5, BODY.bottom - BODY.top - 30, 3).fill({ color: 0xffffff, alpha: 0.08 });
  // Upper brass band, wide enough for three crests on every drum (nothing moves when one stamps).
  band(g, CREST_BAND.top, CREST_BAND.bottom, hw + 3).fill(cylinder(metal)).stroke({ width: 3, color: metalLine });
  g.moveTo(-hw, CREST_BAND.top + 4).quadraticCurveTo(0, CREST_BAND.top + 13, hw, CREST_BAND.top + 4).stroke({ width: 1.5, color: ROOM.brassLight, alpha: 0.55 });
  if (o.crests !== false) for (let i = 0; i < state.crests; i++) drawCrest(g, slotX(i, state.crests, CREST_GAP), CREST_Y);
  // Stone cap band: plain stone; summit gems only once they have risen.
  band(g, CAP.top, CAP.bottom, hw + 7, 8).fill(cylinder(stone)).stroke({ width: 4, color: stoneLine });
  if (o.gems !== false) state.gems.forEach((gt, i) => drawSummitGem(g, slotX(i, state.gems.length, GEM_GAP), GEM_Y, gt));
  g.ellipse(0, CAP.top, hw + 7, 15).fill(shade(stone, 0.2)).stroke({ width: 4, color: stoneLine });
  g.ellipse(0, CAP.top + 1, hw - 12, 9).fill(shade(stone, -0.18));
  // Brass knob.
  g.ellipse(0, CAP.top - 4, 30, 9).fill(cylinder(metal)).stroke({ width: 3, color: metalLine });
  g.circle(0, CAP.top - 15, 11).fill(metal).stroke({ width: 3, color: metalLine });
  g.circle(-3, CAP.top - 18, 4).fill({ color: 0xffffff, alpha: 0.65 });
}

/** Seeded crack polylines across the body (drum coordinates). */
function makeCracks(seed: number): [number, number][][] {
  const r = mulberry32(seed);
  const cracks: [number, number][][] = [];
  const starts: [number, number][] = [
    [-60, -172],
    [55, -70],
    [-20, -120],
    [70, -160],
    [-72, -80],
    [15, -182],
    [30, -110],
  ];
  for (const [sx, sy] of starts) {
    const pts: [number, number][] = [[sx, sy]];
    let x = sx;
    let y = sy;
    const dir = r.next() * Math.PI * 2;
    for (let i = 0; i < 5; i++) {
      const a = dir + (r.next() - 0.5) * 1.6;
      const len = 10 + r.next() * 16;
      x = Math.max(-DRUM.halfW + 8, Math.min(DRUM.halfW - 8, x + Math.cos(a) * len));
      y = Math.max(BODY.top + 4, Math.min(BODY.bottom - 4, y + Math.sin(a) * len));
      pts.push([x, y]);
    }
    cracks.push(pts);
  }
  return cracks;
}

function flatColorFilter(color: number): ColorMatrixFilter {
  const f = new ColorMatrixFilter();
  const r = ((color >> 16) & 0xff) / 255;
  const gr = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  f.matrix = [0, 0, 0, 0, r, 0, 0, 0, 0, gr, 0, 0, 0, 0, b, 0, 0, 0, 1, 0];
  return f;
}

interface Star {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

interface OrnamentAnim {
  kind: 'gem' | 'crest';
  u: number;
  /** Reduce motion: fade in place over 150 ms instead of rising or stamping (A10). */
  fade: boolean;
}

export interface DrumOptions {
  /** The Lite preset: a static starfield (A10). */
  lite?: boolean;
}

export class CapsuleDrum {
  readonly root = new Container();
  /** Squash and stretch pivot at the drum's feet. */
  readonly body = new Container();
  readonly left = new Container();
  readonly right = new Container();
  private readonly ctx = new GraphicsContext();
  private readonly white: Graphics;
  private readonly ringGlow = new Graphics();
  private readonly crackGlow = new Graphics();
  private readonly crackLines = new Graphics();
  /** Light beams shooting out of the cracks (grows with each strike and through the burst build). */
  private readonly leakG = new Graphics();
  /** Crests and summit gems while they animate (committed into the drum when they settle). */
  private readonly orn = new Graphics();
  /** The next material, revealed top-down by a wipe (transmutation). */
  private readonly nextCtx = new GraphicsContext();
  private readonly nextArt: Graphics;
  private readonly wipeMask = new Graphics();
  private readonly wipeG = new Graphics();
  /** The Aeon crystal's drifting starfield, clipped to the body. */
  private readonly starsG = new Graphics();
  private readonly starsMask = new Graphics();
  private readonly stars: Star[] = [];
  private readonly cracks: [number, number][][];
  private leak = 0;
  private stateNow: DrumState = drumState('clay');
  private nextState: DrumState | null = null;
  private wipe = 0;
  private anim: OrnamentAnim | null = null;
  private crackAmount = 0;
  private time = 0;
  private readonly lite: boolean;
  /** Extra glow pumped in by strikes and the charge. */
  energy = 0;

  constructor(seed: number, o: DrumOptions = {}) {
    this.lite = o.lite === true;
    this.cracks = makeCracks(seed);
    const split = (side: -1 | 1): Container => {
      const holder = new Container();
      const art = new Graphics(this.ctx);
      const mask = new Graphics();
      const pts: number[] = [0, 20];
      for (let i = 0; i <= 12; i++) pts.push((i % 2 === 0 ? 7 : -7) * (i % 4 === 1 ? 1.6 : 1), -i * 24);
      pts.push(side * 170, -300, side * 170, 20);
      mask.poly(pts).fill(0xffffff);
      holder.addChild(art, mask);
      art.mask = mask;
      return holder;
    };
    this.left.addChild(split(-1));
    this.right.addChild(split(1));
    this.white = new Graphics(this.ctx);
    this.white.filters = [flatColorFilter(0xffffff)];
    this.white.alpha = 0;
    this.nextArt = new Graphics(this.nextCtx);
    this.nextArt.mask = this.wipeMask;
    this.nextArt.visible = false;
    this.wipeMask.visible = false;
    band(this.starsMask.context, BODY.top + 2, BODY.bottom - 2, DRUM.halfW - 2).fill(0xffffff);
    this.starsG.mask = this.starsMask;
    const r = mulberry32(seed ^ 0x57a2);
    for (let i = 0; i < 34; i++) {
      this.stars.push({ x: (r.next() * 2 - 1) * DRUM.halfW, y: BODY.top + r.next() * (BODY.bottom - BODY.top + 10), r: 0.7 + r.next() * 1.6, speed: 4 + r.next() * 9, phase: r.next() * 6.28 });
    }
    this.ringGlow.blendMode = 'add';
    this.crackGlow.blendMode = 'add';
    this.leakG.blendMode = 'add';
    this.wipeG.blendMode = 'add';
    this.body.addChild(this.left, this.right, this.nextArt, this.wipeMask, this.starsG, this.starsMask, this.crackLines, this.crackGlow, this.ringGlow, this.orn, this.leakG, this.wipeG, this.white);
    this.root.addChild(this.body);
    this.setTier('clay');
  }

  get tier(): CapsuleTier {
    return this.stateNow.tier;
  }

  get state(): Readonly<DrumState> {
    return this.stateNow;
  }

  /** The drum of a tier with everything it has earned (rings, crests, summit gems). */
  setTier(tier: CapsuleTier): void {
    this.setState(drumState(tier));
  }

  setState(s: DrumState): void {
    this.stateNow = { tier: s.tier, crests: s.crests, gems: s.gems.slice() };
    this.anim = null;
    this.orn.clear();
    this.redraw();
    this.drawCracks();
    this.drawRingGlow();
  }

  private redraw(): void {
    const a = this.anim;
    drawDrum(this.ctx, this.stateNow, { crests: !(a && a.kind === 'crest'), gems: !(a && a.kind === 'gem') });
  }

  // --- Transmutation: the next material wipes down from the top (A10 steps 3 and 3d) -------------

  /** Starts a top-down wipe into `to`; the drum keeps its current state underneath until it ends. */
  beginTransmute(to: DrumState, o: DrawOptions = {}): void {
    this.nextState = { tier: to.tier, crests: to.crests, gems: to.gems.slice() };
    drawDrum(this.nextCtx, this.nextState, o);
    this.nextArt.visible = true;
    this.setTransmute(0);
  }

  /** 0..1: how far down the new material has spread. */
  setTransmute(u: number): void {
    if (!this.nextState) return;
    this.wipe = clamp01(u);
    const top = CAP.top - 30;
    const y = lerp(top, 6, this.wipe);
    this.wipeMask.clear().rect(-DRUM.halfW - 20, top - 4, DRUM.halfW * 2 + 40, y - top + 4).fill(0xffffff);
    const g = this.wipeG;
    g.clear();
    if (this.wipe > 0 && this.wipe < 1) {
      const c = TIER_COLORS[this.nextState.tier];
      const hw = DRUM.halfW + 6;
      g.moveTo(-hw, y).quadraticCurveTo(0, y + 9, hw, y).stroke({ width: 16, color: c, alpha: 0.45 });
      g.moveTo(-hw, y).quadraticCurveTo(0, y + 9, hw, y).stroke({ width: 4, color: 0xffffff, alpha: 0.95 });
    }
  }

  /** Ends the wipe: the drum becomes the new state (crests and gems as the state says). */
  endTransmute(): void {
    const next = this.nextState;
    this.nextState = null;
    this.nextArt.visible = false;
    this.wipeG.clear();
    this.wipe = 0;
    if (next) this.setState(next);
  }

  get transmuting(): boolean {
    return this.nextState !== null;
  }

  // --- Crests and summit gems ---------------------------------------------------------------------

  /** A summit gem starts to rise out of the cap's top face (it only ever rises when its strike will climb). */
  beginGemRise(fade: boolean): void {
    this.anim = { kind: 'gem', u: 0, fade };
    this.redraw();
    this.drawOrnaments();
  }

  /** A new crest starts to stamp onto the brass band. */
  beginCrestStamp(fade: boolean): void {
    this.anim = { kind: 'crest', u: 0, fade };
    this.redraw();
    this.drawOrnaments();
  }

  setOrnament(u: number): void {
    if (!this.anim) return;
    this.anim.u = clamp01(u);
    this.drawOrnaments();
  }

  /** The rising gem settles (unlit) or the crest is stamped for good. */
  endOrnament(): void {
    const a = this.anim;
    if (!a) return;
    const s = this.stateNow;
    if (a.kind === 'gem') this.setState({ ...s, gems: [...s.gems, null] });
    else this.setState({ ...s, crests: s.crests + 1 });
  }

  /** The summit strike ignites gem `i` in the tier it reached. */
  igniteGem(i: number, tier: CapsuleTier): void {
    const gems = this.stateNow.gems.slice();
    if (i < 0 || i >= gems.length) return;
    gems[i] = tier;
    this.setState({ ...this.stateNow, gems });
  }

  /** Where summit gem `i` of `n` sits (drum coordinates), for sparks and flashes. */
  gemPos(i: number, n: number): [number, number] {
    return [slotX(i, n, GEM_GAP), GEM_Y];
  }

  /** Where crest `i` of `n` sits (drum coordinates). */
  crestPos(i: number, n: number): [number, number] {
    return [slotX(i, n, CREST_GAP), CREST_Y];
  }

  private drawOrnaments(): void {
    const g = this.orn;
    g.clear();
    const a = this.anim;
    if (!a) return;
    const s = this.stateNow;
    const u = a.u;
    if (a.kind === 'gem') {
      const n = s.gems.length + 1;
      const slide = a.fade ? 1 : easeOutCubic(span(u, 0.2, 0.75));
      s.gems.forEach((gt, i) => drawSummitGem(g, lerp(slotX(i, n - 1, GEM_GAP), slotX(i, n, GEM_GAP), slide), GEM_Y, gt));
      const x = slotX(n - 1, n, GEM_GAP);
      if (a.fade) {
        drawSummitGem(g, x, GEM_Y, null, 1, u);
        return;
      }
      // Out of the top face, up in an arc, a turn, and down into the band with a little bounce.
      const up = easeOutCubic(span(u, 0, 0.45));
      const down = easeOutBounce(span(u, 0.5, 1));
      const peak = CAP.top - 44;
      const y = u < 0.5 ? lerp(CAP.top - 2, peak, up) : lerp(peak, GEM_Y, down);
      const scale = u < 0.5 ? lerp(0.5, 1.25, up) : lerp(1.25, 1, down);
      g.ellipse(x, CAP.top, 18 * (1 - span(u, 0.4, 0.6)), 5 * (1 - span(u, 0.4, 0.6))).fill({ color: 0xffffff, alpha: 0.35 * (1 - span(u, 0.3, 0.6)) });
      drawSummitGem(g, x, y, null, scale, span(u, 0, 0.15));
      return;
    }
    const n = s.crests + 1;
    const slide = a.fade ? 1 : easeOutCubic(span(u, 0, 0.5));
    for (let i = 0; i < s.crests; i++) drawCrest(g, lerp(slotX(i, n - 1, CREST_GAP), slotX(i, n, CREST_GAP), slide), CREST_Y);
    const x = slotX(n - 1, n, CREST_GAP);
    if (a.fade) {
      drawCrest(g, x, CREST_Y, 1, u);
      return;
    }
    // The crest slams on from above (scale and fall), then a white glint crosses it.
    const e = span(u, 0, 0.55);
    drawCrest(g, x, CREST_Y - 16 * (1 - easeOutCubic(e)), lerp(2.3, 1, easeOutBack(e, 1.6)), clamp01(e * 3));
    const glint = span(u, 0.55, 1);
    if (glint > 0 && glint < 1) g.circle(x, CREST_Y, 6 + 12 * glint).fill({ color: 0xffffff, alpha: 0.55 * (1 - glint) });
  }

  /** 0..1: how far the cracks have spread (the charge). */
  setCracks(amount: number): void {
    const a = Math.max(0, Math.min(1, amount));
    if (Math.abs(a - this.crackAmount) < 0.01) return;
    this.crackAmount = a;
    this.drawCracks();
  }

  /** 0..2: light beams pouring out of the visible cracks (0 = none, 1 = strong, 2 = about to burst). */
  setLeak(amount: number): void {
    this.leak = Math.max(0, Math.min(2, amount));
  }

  /** A white silhouette over the drum, 0..1. */
  setWhite(alpha: number): void {
    this.white.alpha = Math.max(0, Math.min(1, alpha));
  }

  /** The burst: light and cracks vanish with the shell; only the white silhouette fades out. */
  shatter(): void {
    if (this.nextState) this.endTransmute();
    if (this.anim) this.endOrnament();
    this.crackGlow.alpha = 0;
    this.ringGlow.alpha = 0;
    this.crackLines.alpha = 0;
    this.starsG.visible = false;
    this.crackAmount = 0;
    this.leak = 0;
    this.leakG.clear();
    this.shattered = true;
  }

  private shattered = false;

  /** Restores the whole drum after a burst (reuse between openings). */
  reassemble(): void {
    for (const h of [this.left, this.right]) {
      h.position.set(0, 0);
      h.rotation = 0;
      h.alpha = 1;
    }
    this.body.scale.set(1);
    this.body.alpha = 1;
    this.crackGlow.alpha = 1;
    this.ringGlow.alpha = 1;
    this.crackLines.alpha = 1;
    this.starsG.visible = true;
    this.shattered = false;
    this.setWhite(0);
  }

  private drawCracks(): void {
    const g = this.crackLines;
    const glow = this.crackGlow;
    g.clear();
    glow.clear();
    if (this.crackAmount <= 0) return;
    const key = TIER_COLORS[this.tier];
    const c = shade(key, 0.55);
    const n = this.cracks.length;
    this.cracks.forEach((pts, i) => {
      const local = Math.max(0, Math.min(1, this.crackAmount * n - i * 0.7));
      if (local <= 0) return;
      const segs = Math.max(1, Math.ceil(local * (pts.length - 1)));
      const draw = (target: Graphics, width: number, color: number, alpha: number) => {
        const p0 = pts[0];
        if (!p0) return;
        target.moveTo(p0[0], p0[1]);
        for (let k = 1; k <= segs; k++) {
          const p = pts[k];
          if (p) target.lineTo(p[0], p[1]);
        }
        target.stroke({ width, color, alpha, join: 'round', cap: 'round' });
      };
      draw(glow, 14, key, 0.35);
      draw(g, 4.5, shade(TIER_RAMPS[this.tier].shadow, -0.6), 0.9);
      draw(g, 2, c, 1);
    });
  }

  private drawRingGlow(): void {
    const g = this.ringGlow;
    g.clear();
    const c = TIER_COLORS[this.tier];
    const lit = Math.min(tierIndex(this.tier), tierIndex(SUMMIT_ABOVE)) + 1;
    RING_Y.forEach((y, i) => {
      if (i >= lit) return;
      const own = TIER_COLORS[tierAt(i)];
      g.moveTo(-DRUM.halfW + 6, y).quadraticCurveTo(0, y + 10, DRUM.halfW - 6, y).stroke({ width: 10, color: c, alpha: 0.22 });
      g.moveTo(-DRUM.halfW + 6, y).quadraticCurveTo(0, y + 10, DRUM.halfW - 6, y).stroke({ width: 2.5, color: shade(c, 0.6), alpha: 0.7 });
      g.circle(0, y + 5, 17).fill({ color: own, alpha: 0.4 });
      g.circle(0, y + 5, 9).fill({ color: shade(own, 0.5), alpha: 0.35 });
    });
    this.stateNow.gems.forEach((gt, i, a) => {
      if (!gt) return;
      g.circle(slotX(i, a.length, GEM_GAP), GEM_Y, 20).fill({ color: TIER_COLORS[gt], alpha: 0.45 });
    });
  }

  /** Ambient: rings and cracks breathe with light; the Aeon starfield drifts. */
  update(dtMs: number): void {
    this.time += dtMs;
    this.energy = Math.max(0, this.energy - dtMs / 900);
    if (this.shattered) return;
    const pulse = 0.72 + 0.28 * Math.sin(this.time / 260);
    this.ringGlow.alpha = Math.min(1, pulse + this.energy * 0.6);
    this.crackGlow.alpha = Math.min(1, (0.6 + 0.4 * Math.sin(this.time / 90)) * (0.7 + this.energy));
    this.drawLeak();
    this.drawStars(dtMs);
  }

  private drawStars(dtMs: number): void {
    const g = this.starsG;
    const aeonNow = this.tier === 'aeon';
    const aeonNext = this.nextState?.tier === 'aeon';
    g.clear();
    if (!aeonNow && !aeonNext) return;
    const k = aeonNow ? 1 : this.wipe;
    const top = BODY.top;
    const h = BODY.bottom - BODY.top + 10;
    for (const s of this.stars) {
      if (!this.lite) {
        s.y -= (s.speed * dtMs) / 1000;
        s.x += (s.speed * 0.35 * dtMs) / 1000;
        if (s.y < top - 4) s.y += h;
        if (s.x > DRUM.halfW) s.x -= DRUM.halfW * 2;
      }
      const tw = this.lite ? 0.8 : 0.55 + 0.45 * Math.sin(this.time / 300 + s.phase);
      const a = k * tw;
      g.circle(s.x, s.y, s.r).fill({ color: s.r > 1.7 ? 0xffffff : TIER_RAMPS.aeon.highlight, alpha: a });
      if (s.r > 1.9) g.circle(s.x, s.y, s.r * 3).fill({ color: TIER_RAMPS.aeon.key, alpha: 0.18 * a });
    }
  }

  /** Beams fan out from the tip of every crack that has spread, flickering; longer as `leak` grows. */
  private drawLeak(): void {
    const g = this.leakG;
    g.clear();
    if (this.leak <= 0.01 || this.crackAmount <= 0) return;
    const c = TIER_COLORS[this.tier];
    const n = this.cracks.length;
    this.cracks.forEach((pts, i) => {
      const local = Math.max(0, Math.min(1, this.crackAmount * n - i * 0.7));
      if (local < 0.5) return;
      const idx = Math.max(1, Math.ceil(local * (pts.length - 1)));
      const tip = pts[idx];
      const prev = pts[idx - 1];
      if (!tip || !prev) return;
      // Out from the drum's axis, bent towards the crack's direction.
      const ax = tip[0] * 1.4 + (tip[0] - prev[0]) * 0.8;
      const ay = (tip[1] + 118) * 0.6 + (tip[1] - prev[1]) * 0.8;
      const len0 = Math.hypot(ax, ay) || 1;
      const flick = 0.75 + 0.25 * Math.sin(this.time / 37 + i * 2.1);
      const len = (40 + 110 * this.leak) * flick * (0.6 + 0.4 * local);
      const ux = ax / len0;
      const uy = ay / len0;
      const w = (5 + 7 * this.leak) * flick;
      const ex = tip[0] + ux * len;
      const ey = tip[1] + uy * len;
      // A tapered wedge: wide and soft outside, a white-hot core.
      g.poly([tip[0] - uy * 2, tip[1] + ux * 2, ex - uy * w, ey + ux * w, ex + uy * w, ey - ux * w, tip[0] + uy * 2, tip[1] - ux * 2]).fill({ color: c, alpha: 0.28 * Math.min(1, this.leak) });
      g.poly([tip[0] - uy, tip[1] + ux, ex - (uy * w) / 3, ey + (ux * w) / 3, ex + (uy * w) / 3, ey - (ux * w) / 3, tip[0] + uy, tip[1] - ux]).fill({ color: shade(c, 0.7), alpha: 0.55 * Math.min(1, this.leak) });
      g.circle(tip[0], tip[1], 5 + 4 * this.leak).fill({ color: 0xffffff, alpha: 0.7 * flick });
    });
  }

  /** Where the cracks end, for sparks (drum coordinates, only cracks that have spread). */
  crackTips(): [number, number][] {
    const n = this.cracks.length;
    const out: [number, number][] = [];
    this.cracks.forEach((pts, i) => {
      const local = Math.max(0, Math.min(1, this.crackAmount * n - i * 0.7));
      if (local <= 0) return;
      const p = pts[Math.max(1, Math.ceil(local * (pts.length - 1)))];
      if (p) out.push(p);
    });
    return out;
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.ctx.destroy();
    this.nextCtx.destroy();
  }
}

/** The stone pedestal with glowing runes in the tier colour. Origin: centre of its top face. */
export class Pedestal {
  readonly root = new Container();
  private readonly runes = new Graphics();
  private readonly base = new Graphics();

  constructor() {
    const g = this.base;
    const s = ROOM.stone;
    const line = shade(s, -0.55);
    // Foot.
    band(g.context, 118, 150, 150, 12).fill(cylinder(ROOM.stoneDark)).stroke({ width: 4, color: line });
    // Column (a slight taper).
    g.moveTo(-112, 22).lineTo(112, 22).lineTo(126, 120).quadraticCurveTo(0, 134, -126, 120).closePath().fill(cylinder(s)).stroke({ width: 4, color: line });
    // Recessed band that holds the four strike pips.
    g.roundRect(-104, 48, 208, 46, 14).fill({ color: shade(s, -0.4), alpha: 0.85 }).stroke({ width: 3, color: shade(s, 0.15), alpha: 0.6 });
    // Top slab.
    band(g.context, 0, 24, 142, 12).fill(cylinder(shade(s, 0.1))).stroke({ width: 4, color: line });
    g.ellipse(0, 0, 142, 20).fill(shade(s, 0.28)).stroke({ width: 4, color: line });
    g.ellipse(0, 1, 118, 13).fill({ color: shade(s, 0.05) });
    this.runes.blendMode = 'add';
    this.root.addChild(this.base, this.runes);
  }

  setColor(color: number): void {
    const g = this.runes;
    g.clear();
    // Light spills along the recess and the slab edge in the tier colour.
    g.roundRect(-106, 46, 212, 50, 16).stroke({ width: 4, color, alpha: 0.55 });
    g.ellipse(0, 1, 120, 14).stroke({ width: 3, color, alpha: 0.35 });
    for (const x of [-120, 120]) g.circle(x, 108, 5).fill({ color, alpha: 0.8 });
  }

  setGlow(alpha: number): void {
    this.runes.alpha = alpha;
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

/** A chunky stone-and-brass hammer. Origin: the grip end; the head points along −y at rotation 0. */
export class Hammer {
  readonly root = new Container();
  /** The head heating white-hot before a summit strike (neutral white, never a tier colour). */
  private readonly heatG = new Graphics();
  /** Where the head's centre is (hammer coordinates). */
  static readonly HEAD = { x: 0, y: -167 } as const;
  constructor() {
    const g = new Graphics();
    const wood = 0x8a5a33;
    g.roundRect(-9, -150, 18, 160, 8).fill(cylinder(wood)).stroke({ width: 3, color: shade(wood, -0.55) });
    for (const y of [-12, -28]) g.roundRect(-11, y, 22, 7, 3).fill(0x5a3a22);
    g.roundRect(-52, -196, 104, 58, 14).fill(cylinder(ROOM.stoneDark)).stroke({ width: 4, color: shade(ROOM.stoneDark, -0.55) });
    for (const x of [-46, 34]) g.roundRect(x, -198, 12, 62, 4).fill(cylinder(ROOM.brass)).stroke({ width: 2.5, color: ROOM.brassDark });
    g.roundRect(-30, -188, 50, 9, 4).fill({ color: 0xffffff, alpha: 0.18 });
    this.heatG.blendMode = 'add';
    this.heatG.alpha = 0;
    this.heatG.roundRect(-70, -214, 140, 94, 30).fill({ color: 0xfff6e8, alpha: 0.18 });
    this.heatG.roundRect(-60, -204, 120, 74, 22).fill({ color: 0xfff6e8, alpha: 0.28 });
    this.heatG.roundRect(-52, -196, 104, 58, 14).fill({ color: 0xffffff, alpha: 0.55 });
    this.heatG.roundRect(-40, -186, 80, 12, 6).fill({ color: 0xffffff, alpha: 0.6 });
    this.root.addChild(g, this.heatG);
  }

  /** 0..1: how hot the head glows. */
  setHeat(k: number): void {
    this.heatG.alpha = clamp01(k);
  }
}

/** The four strike pips (A10 step 2): dull stone, lit in the tier colour on a climb. */
export class Pips {
  readonly root = new Container();
  private readonly gs: Graphics[] = [];
  readonly glows: Graphics[] = [];
  private readonly state: ('empty' | 'miss' | CapsuleTier)[] = ['empty', 'empty', 'empty', 'empty'];

  constructor() {
    for (let i = 0; i < 4; i++) {
      const glow = new Graphics();
      glow.blendMode = 'add';
      const g = new Graphics();
      const holder = new Container();
      holder.position.set((i - 1.5) * 44, 0);
      holder.addChild(glow, g);
      this.root.addChild(holder);
      this.gs.push(g);
      this.glows.push(glow);
    }
    this.redraw();
  }

  pip(i: number): Container | undefined {
    return this.gs[i]?.parent ?? undefined;
  }

  set(i: number, s: 'empty' | 'miss' | CapsuleTier): void {
    this.state[i] = s;
    this.redraw();
  }

  reset(): void {
    this.state.fill('empty');
    this.redraw();
  }

  private redraw(): void {
    this.gs.forEach((g, i) => {
      const s = this.state[i] ?? 'empty';
      const glow = this.glows[i];
      g.clear();
      glow?.clear();
      g.circle(0, 0, 13).fill(ROOM.stoneDark).stroke({ width: 3, color: shade(ROOM.stoneDark, -0.5) });
      if (s === 'miss') {
        g.circle(0, 0, 8).fill(shade(ROOM.dust, -0.2));
      } else if (s !== 'empty') {
        const c = TIER_COLORS[s];
        g.circle(0, 0, 10).fill(c).stroke({ width: 2, color: shade(c, 0.6) });
        g.circle(-3, -3, 3.5).fill({ color: 0xffffff, alpha: 0.8 });
        glow?.circle(0, 0, 24).fill({ color: c, alpha: 0.35 });
      }
    });
  }
}
