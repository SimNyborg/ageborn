/**
 * The Hold flag on the lane (DESIGN A18.4.2): while your stance is Hold, a banner in your team colour
 * stands at your flag's p. Your ground units hold there. The HUD drags it (a grip over the flag) and
 * the view shows where a drop would plant it: a ghost flag, the allowed range [320, 800] as a strip
 * on the ground, and a dotted line from the old spot.
 *
 * Motion (A12): the flag drops in stretched and lands with a squash, a dust ring and a small kick of
 * the cloth; the cloth waves all the time (a slower, smaller wave with Reduce motion, which also drops
 * the squash). Drawn with plain Graphics every frame (a few dozen vertices), behind the units.
 * Presentation only: the sim owns where units stop (B5).
 */
import { Container, Graphics } from 'pixi.js';

/** Pole height and cloth size, lu. */
const POLE_LU = 92;
const CLOTH_W = 42;
const CLOTH_H = 27;
/** The flag stands just behind the back depth row, so units walk in front of it. */
const FLAG_Y = -22;
const DROP_MS = 300;
const DUST_MS = 420;
const INK = 0x1b1330;

export interface HoldFlagInput {
  /** Hold is active: the flag stands. */
  on: boolean;
  /** World x of the flag (lu). */
  x: number;
  color: number;
  /** A drag in progress: world x of the ghost, or null. */
  ghostX: number | null;
  /** The allowed range as world x (lu), for the strip shown while dragging. */
  range: [number, number];
  /** +1 when the owner faces right (side 0), −1 otherwise: the cloth flies toward the enemy. */
  dir: 1 | -1;
  reduce: boolean;
}

function mix(a: number, b: number, t: number): number {
  const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t;
  const g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t;
  const bl = (a & 255) * (1 - t) + (b & 255) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

function backOut(t: number): number {
  const s = 1.9;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

/** World y of the pole top above the ground line (for the HUD grip). */
export const HOLD_FLAG_TOP_Y = FLAG_Y - POLE_LU - 4;
export const HOLD_FLAG_FOOT_Y = FLAG_Y;

export class HoldFlagMarker {
  readonly root = new Container();
  private readonly ground = new Graphics();
  private readonly flag = new Graphics();
  private readonly ghost = new Graphics();
  private timeMs = 0;
  /** Where the flag was planted last (world x), and how long ago (ms), for the drop. */
  private plantedX: number | null = null;
  private sincePlantMs = 1e9;
  private kickMs = 1e9;

  constructor() {
    this.root.label = 'holdFlag';
    this.root.eventMode = 'none';
    this.root.addChild(this.ground, this.flag, this.ghost);
  }

  /** Hides the flag without an exit (match end, spectators). */
  hide(): void {
    this.plantedX = null;
    this.ground.clear();
    this.flag.clear();
    this.ghost.clear();
  }

  update(realDt: number, s: HoldFlagInput): void {
    this.timeMs += realDt;
    this.sincePlantMs += realDt;
    this.kickMs += realDt;
    if (!s.on) {
      this.plantedX = null;
      this.flag.clear();
      this.ground.clear();
      this.drawGhost(s);
      return;
    }
    if (this.plantedX === null || Math.abs(this.plantedX - s.x) > 0.5) {
      this.plantedX = s.x;
      this.sincePlantMs = 0;
      this.kickMs = 0;
    }
    this.drawGround(s);
    this.drawFlag(this.flag, s.x, s, 1, true);
    this.drawGhost(s);
  }

  private drawGround(s: HoldFlagInput): void {
    const g = this.ground;
    g.clear();
    const x = s.x;
    // A soft team-coloured ring where the line holds.
    g.ellipse(x, FLAG_Y + 2, 20, 5).fill({ color: s.color, alpha: 0.22 });
    g.ellipse(x, FLAG_Y + 2, 20, 5).stroke({ width: 1.5, color: s.color, alpha: 0.55 });
    // Dust ring on landing.
    const d = this.sincePlantMs / DUST_MS;
    if (d < 1 && !s.reduce) {
      const r = 10 + 34 * (1 - (1 - d) * (1 - d));
      g.ellipse(x, FLAG_Y + 2, r, r * 0.24).stroke({ width: 3 * (1 - d) + 0.5, color: 0xe8dcc0, alpha: 0.7 * (1 - d) });
    }
    if (s.ghostX !== null) {
      // The allowed range: a strip on the ground with end ticks.
      const [a, b] = s.range[0] <= s.range[1] ? s.range : [s.range[1], s.range[0]];
      g.roundRect(a, FLAG_Y - 1, b - a, 6, 3).fill({ color: s.color, alpha: 0.18 });
      g.moveTo(a, FLAG_Y - 6).lineTo(a, FLAG_Y + 8).stroke({ width: 2, color: s.color, alpha: 0.6 });
      g.moveTo(b, FLAG_Y - 6).lineTo(b, FLAG_Y + 8).stroke({ width: 2, color: s.color, alpha: 0.6 });
      // Dotted path from the flag to the ghost.
      const from = x;
      const to = s.ghostX;
      const n = Math.floor(Math.abs(to - from) / 10);
      for (let i = 1; i < n; i++) {
        const px = from + ((to - from) * i) / n;
        g.circle(px, FLAG_Y + 2, 1.6).fill({ color: 0xffffff, alpha: 0.75 });
      }
    }
  }

  private drawGhost(s: HoldFlagInput): void {
    const g = this.ghost;
    g.clear();
    if (s.ghostX === null) return;
    this.drawFlag(g, s.ghostX, s, 0.6, false);
  }

  /** Pole, finial and waving cloth; `alpha` < 1 for the ghost. */
  private drawFlag(g: Graphics, x: number, s: HoldFlagInput, alpha: number, live: boolean): void {
    if (live) g.clear();
    const dir = s.dir;
    // Drop and squash (the live flag only).
    let lift = 0;
    let sy = 1;
    if (live && !s.reduce) {
      const t = Math.min(1, this.sincePlantMs / DROP_MS);
      if (t < 0.55) {
        const u = t / 0.55;
        lift = (1 - u * u) * 46;
        sy = 1.14 - 0.14 * u;
      } else {
        const u = (t - 0.55) / 0.45;
        sy = 1 - 0.16 * Math.sin(u * Math.PI) * (1 - u) + 0.02 * (1 - backOut(u));
      }
    }
    const base = FLAG_Y;
    const top = base - POLE_LU * sy - lift;
    const foot = base - lift;
    // Shadow under the pole.
    if (live) g.ellipse(x, base + 1, 7 * (1 - lift / 60), 2).fill({ color: 0x000000, alpha: 0.28 * alpha });
    // Pole: dark outline, wood fill, highlight.
    g.roundRect(x - 2.6, top, 5.2, foot - top, 2).fill({ color: INK, alpha });
    g.roundRect(x - 1.5, top + 1, 3, foot - top - 1, 1.5).fill({ color: 0x9a6a3a, alpha });
    g.rect(x - 0.9, top + 2, 1, foot - top - 6).fill({ color: 0xd8a870, alpha: 0.8 * alpha });
    // Finial.
    g.circle(x, top - 2.5, 3.6).fill({ color: INK, alpha });
    g.circle(x, top - 2.5, 2.4).fill({ color: 0xffd447, alpha });
    // Cloth: a waving quad strip from the pole toward the enemy.
    const speed = s.reduce ? 0.0022 : 0.0055;
    const amp = s.reduce ? 1.2 : 2.6 + (this.kickMs < 500 ? 3 * (1 - this.kickMs / 500) : 0);
    const segs = 8;
    const topPts: number[] = [];
    const botPts: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const cx = x + dir * (2 + u * CLOTH_W);
      const wave = Math.sin(this.timeMs * speed - u * 5.2) * amp * u;
      const droop = u * u * 2.4;
      topPts.push(cx, top + 2 + wave + droop);
      botPts.push(cx, top + 2 + CLOTH_H * (1 - 0.14 * u) + wave + droop);
    }
    const poly: number[] = [...topPts];
    for (let i = segs; i >= 0; i--) poly.push(botPts[i * 2] ?? x, botPts[i * 2 + 1] ?? top);
    g.poly(poly).fill({ color: s.color, alpha });
    g.poly(poly).stroke({ width: 2, color: INK, alpha, join: 'round' });
    // Cel shading: a lighter band along the top, a darker one along the bottom.
    const hi: number[] = [];
    for (let i = 0; i <= segs; i++) hi.push(topPts[i * 2] ?? x, (topPts[i * 2 + 1] ?? top) + 1.2);
    for (let i = segs; i >= 0; i--) hi.push(topPts[i * 2] ?? x, (topPts[i * 2 + 1] ?? top) + 5);
    g.poly(hi).fill({ color: mix(s.color, 0xffffff, 0.35), alpha: 0.8 * alpha });
    // Emblem: a small white chevron pointing at the enemy (hold here, facing them).
    const mid = Math.floor(segs * 0.45);
    const ex = topPts[mid * 2] ?? x;
    const ey = ((topPts[mid * 2 + 1] ?? top) + (botPts[mid * 2 + 1] ?? top)) / 2;
    g.moveTo(ex - dir * 4, ey - 5).lineTo(ex + dir * 3, ey).lineTo(ex - dir * 4, ey + 5).stroke({ width: 2.6, color: 0xffffff, alpha: 0.9 * alpha, cap: 'round', join: 'round' });
  }
}
