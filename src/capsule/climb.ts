/**
 * The Time Capsule itself (DESIGN A10): a carved stone-and-brass drum with 5 age rings that light
 * up as it climbs, cracks that leak light in the current tier colour, the hammer, the 4 strike
 * pips and the pedestal. Pure drawing and small state; timing lives in the stage and the plan.
 *
 * The drum is drawn once into a shared `GraphicsContext` and shown through two masked halves, so
 * the burst can split it apart. Origin: bottom centre of the drum.
 */
import { ColorMatrixFilter, Container, FillGradient, Graphics, GraphicsContext } from 'pixi.js';
import type { CapsuleTier } from '@/contracts';
import { mulberry32 } from '@/core';
import { AEON_RIM, ROOM, TIER_COLORS, shade } from './palette';
import { tierIndex } from './tiers';

export const DRUM = { halfW: 90, height: 246 } as const;

/** Heights (drum coordinates, y up is negative) of the five age rings, bottom to top. */
const RING_Y = [-58, -90, -122, -154, -186];

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

export function drawDrum(g: GraphicsContext, tier: CapsuleTier, litRings: number): void {
  g.clear();
  const c = TIER_COLORS[tier];
  const aeon = tier === 'aeon';
  const metal = aeon ? AEON_RIM : ROOM.brass;
  const metalLine = shade(metal, -0.5);
  const stone = ROOM.stone;
  const stoneLine = shade(stone, -0.5);
  const bodyLine = shade(c, -0.55);
  const hw = DRUM.halfW;

  // Plinth.
  band(g, -30, -4, hw + 10, 10).fill(cylinder(ROOM.stoneDark)).stroke({ width: 4, color: stoneLine });
  // Lower brass band.
  band(g, -40, -30, hw + 4).fill(cylinder(metal)).stroke({ width: 3, color: metalLine });
  // Body in the tier material.
  band(g, -202, -40, hw).fill(cylinder(c)).stroke({ width: 4, color: bodyLine });
  // Carved age rings with gems at the front.
  RING_Y.forEach((y, i) => {
    const lit = i < litRings;
    g.moveTo(-hw + 3, y).quadraticCurveTo(0, y + 10, hw - 3, y).stroke({ width: 7, color: shade(c, -0.5), alpha: 0.85 });
    g.moveTo(-hw + 3, y + 2).quadraticCurveTo(0, y + 12, hw - 3, y + 2).stroke({ width: 2, color: shade(c, 0.35), alpha: 0.5 });
    const gy = y + 5;
    g.poly([0, gy - 9, 7, gy, 0, gy + 9, -7, gy]).fill(lit ? shade(c, 0.45) : shade(stone, -0.35)).stroke({ width: 2.5, color: lit ? 0xffffff : stoneLine, alpha: lit ? 0.9 : 1 });
    if (lit) g.poly([0, gy - 6, 3, gy - 1, 0, gy + 1, -3, gy - 1]).fill({ color: 0xffffff, alpha: 0.9 });
  });
  // Cel highlight: one shape per part (A11).
  g.roundRect(-hw + 22, -190, 13, 136, 7).fill({ color: 0xffffff, alpha: 0.16 });
  g.roundRect(hw - 16, -186, 5, 120, 3).fill({ color: 0xffffff, alpha: 0.08 });
  // Upper brass band.
  band(g, -212, -202, hw + 3).fill(cylinder(metal)).stroke({ width: 3, color: metalLine });
  // Stone cap and top face.
  band(g, -232, -212, hw + 7, 8).fill(cylinder(stone)).stroke({ width: 4, color: stoneLine });
  g.ellipse(0, -232, hw + 7, 15).fill(shade(stone, 0.2)).stroke({ width: 4, color: stoneLine });
  g.ellipse(0, -231, hw - 12, 9).fill(shade(stone, -0.18));
  // Brass knob.
  g.ellipse(0, -236, 30, 9).fill(cylinder(metal)).stroke({ width: 3, color: metalLine });
  g.circle(0, -247, 11).fill(metal).stroke({ width: 3, color: metalLine });
  g.circle(-3, -250, 4).fill({ color: 0xffffff, alpha: 0.65 });
  if (aeon) {
    // Every Aeon holds a Legendary: a gold rim around the whole body.
    band(g, -202, -40, hw + 2).stroke({ width: 3, color: AEON_RIM, alpha: 0.95 });
    for (const y of [-72, -106, -138, -170]) g.circle(hw - 12, y + 4, 3).fill(AEON_RIM);
  }
}

/** Seeded crack polylines across the body (drum coordinates). */
function makeCracks(seed: number): [number, number][][] {
  const r = mulberry32(seed);
  const cracks: [number, number][][] = [];
  const starts: [number, number][] = [
    [-60, -180],
    [55, -70],
    [-20, -120],
    [70, -165],
    [-72, -80],
    [15, -190],
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
      y = Math.max(-200, Math.min(-44, y + Math.sin(a) * len));
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
  private readonly cracks: [number, number][][];
  tier: CapsuleTier = 'clay';
  private crackAmount = 0;
  private time = 0;
  /** Extra glow pumped in by strikes and the charge. */
  energy = 0;

  constructor(seed: number) {
    this.cracks = makeCracks(seed);
    const split = (side: -1 | 1): Container => {
      const holder = new Container();
      const art = new Graphics(this.ctx);
      const mask = new Graphics();
      const pts: number[] = [0, 20];
      for (let i = 0; i <= 12; i++) pts.push((i % 2 === 0 ? 7 : -7) * (i % 4 === 1 ? 1.6 : 1), -i * 23);
      pts.push(side * 170, -290, side * 170, 20);
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
    this.ringGlow.blendMode = 'add';
    this.crackGlow.blendMode = 'add';
    this.body.addChild(this.left, this.right, this.crackLines, this.crackGlow, this.ringGlow, this.white);
    this.root.addChild(this.body);
    this.setTier('clay');
  }

  /** Redraws for a tier; rings 1..tier+1 are lit (Clay lights the first). */
  setTier(tier: CapsuleTier): void {
    this.tier = tier;
    drawDrum(this.ctx, tier, tierIndex(tier) + 1);
    this.drawCracks();
    this.drawRingGlow();
  }

  /** 0..1: how far the cracks have spread (the charge). */
  setCracks(amount: number): void {
    const a = Math.max(0, Math.min(1, amount));
    if (Math.abs(a - this.crackAmount) < 0.01) return;
    this.crackAmount = a;
    this.drawCracks();
  }

  /** A white silhouette over the drum, 0..1. */
  setWhite(alpha: number): void {
    this.white.alpha = Math.max(0, Math.min(1, alpha));
  }

  /** The burst: light and cracks vanish with the shell; only the white silhouette fades out. */
  shatter(): void {
    this.crackGlow.alpha = 0;
    this.ringGlow.alpha = 0;
    this.crackLines.alpha = 0;
    this.crackAmount = 0;
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
    this.shattered = false;
    this.setWhite(0);
  }

  private drawCracks(): void {
    const g = this.crackLines;
    const glow = this.crackGlow;
    g.clear();
    glow.clear();
    if (this.crackAmount <= 0) return;
    const c = shade(TIER_COLORS[this.tier], 0.55);
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
      draw(glow, 14, TIER_COLORS[this.tier], 0.35);
      draw(g, 4.5, shade(TIER_COLORS[this.tier], -0.6), 0.9);
      draw(g, 2, c, 1);
    });
  }

  private drawRingGlow(): void {
    const g = this.ringGlow;
    g.clear();
    const c = TIER_COLORS[this.tier];
    const lit = tierIndex(this.tier) + 1;
    RING_Y.forEach((y, i) => {
      if (i >= lit) return;
      g.moveTo(-DRUM.halfW + 6, y).quadraticCurveTo(0, y + 10, DRUM.halfW - 6, y).stroke({ width: 12, color: c, alpha: 0.35 });
      g.moveTo(-DRUM.halfW + 6, y).quadraticCurveTo(0, y + 10, DRUM.halfW - 6, y).stroke({ width: 3, color: shade(c, 0.6), alpha: 0.95 });
      g.circle(0, y + 5, 16).fill({ color: c, alpha: 0.35 });
    });
  }

  /** Ambient: rings and cracks breathe with light. */
  update(dtMs: number): void {
    this.time += dtMs;
    this.energy = Math.max(0, this.energy - dtMs / 900);
    if (this.shattered) return;
    const pulse = 0.72 + 0.28 * Math.sin(this.time / 260);
    this.ringGlow.alpha = Math.min(1, pulse + this.energy * 0.6);
    this.crackGlow.alpha = Math.min(1, (0.6 + 0.4 * Math.sin(this.time / 90)) * (0.7 + this.energy));
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.ctx.destroy();
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
  constructor() {
    const g = new Graphics();
    const wood = 0x8a5a33;
    g.roundRect(-9, -150, 18, 160, 8).fill(cylinder(wood)).stroke({ width: 3, color: shade(wood, -0.55) });
    for (const y of [-12, -28]) g.roundRect(-11, y, 22, 7, 3).fill(0x5a3a22);
    g.roundRect(-52, -196, 104, 58, 14).fill(cylinder(ROOM.stoneDark)).stroke({ width: 4, color: shade(ROOM.stoneDark, -0.55) });
    for (const x of [-46, 34]) g.roundRect(x, -198, 12, 62, 4).fill(cylinder(ROOM.brass)).stroke({ width: 2.5, color: ROOM.brassDark });
    g.roundRect(-30, -188, 50, 9, 4).fill({ color: 0xffffff, alpha: 0.18 });
    this.root.addChild(g);
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
