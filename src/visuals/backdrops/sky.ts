/**
 * Backdrop layer 1: the sky gradient (DESIGN A11 Split-age lane). Painted small and stretched (it is
 * smooth), with a soft sun or moon glow. Clouds are separate drifting sprites (ambient motion).
 */
import type { AgeId } from '@/contracts/ids';
import { BACKDROP_PALETTES, lighten, mix, toCss } from '../palette';
import { blob, join } from '../svg';
import { part } from '../parts/registry';
import { mulberry32 } from '@/core/rng';

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Layer geometry in world lu (x = 0 is the left gate, y = 0 the ground line). */
export interface LayerFrame {
  x0: number;
  width: number;
  yTop: number;
  height: number;
  pxPerLu: number;
}

export const BACKDROP_X0 = -260;
export const BACKDROP_WIDTH = 1720;

export const SKY_FRAME: LayerFrame = { x0: BACKDROP_X0, width: BACKDROP_WIDTH, yTop: -780, height: 800, pxPerLu: 0.25 };

/** Sun or moon position per age (world lu) and its glow colour. */
const SUN: Record<AgeId, { x: number; y: number; r: number; color: number }> = {
  stone: { x: 980, y: -520, r: 46, color: 0xfff1d6 },
  medieval: { x: 250, y: -560, r: 40, color: 0xfffbea },
  gunpowder: { x: 1060, y: -470, r: 44, color: 0xfff3dc },
  modern: { x: 420, y: -600, r: 38, color: 0xf2eee4 },
  future: { x: 860, y: -560, r: 30, color: 0xe8f7f2 },
  // A17.12
  bronze: { x: 1000, y: -500, r: 48, color: 0xfff0d0 },
  industrial: { x: 380, y: -520, r: 40, color: 0xf4e8d0 },
  cosmic: { x: 900, y: -600, r: 26, color: 0xf2f0ff },
};

export function applyFrame(ctx: Ctx2D, f: LayerFrame): void {
  ctx.setTransform(f.pxPerLu, 0, 0, f.pxPerLu, -f.x0 * f.pxPerLu, -f.yTop * f.pxPerLu);
}

export function paintSky(ctx: Ctx2D, age: AgeId, f: LayerFrame): void {
  const pal = BACKDROP_PALETTES[age];
  applyFrame(ctx, f);
  // a deeper zenith, a soft mid band and a bright horizon glow (lit from the sun's side)
  const horizon = mix(pal.skyBottom, pal.light, 0.45);
  const g = ctx.createLinearGradient(0, f.yTop, 0, f.yTop + f.height);
  g.addColorStop(0, toCss(mix(pal.skyTop, 0x1c2030, age === 'future' ? 0.35 : 0.12)));
  g.addColorStop(0.35, toCss(pal.skyTop));
  g.addColorStop(0.72, toCss(mix(pal.skyTop, pal.skyBottom, 0.75)));
  g.addColorStop(0.9, toCss(pal.skyBottom));
  g.addColorStop(1, toCss(horizon));
  ctx.fillStyle = g;
  ctx.fillRect(f.x0, f.yTop, f.width, f.height);
  const sun = SUN[age];
  // a warm side glow: the half of the sky around the sun is lighter
  const side = ctx.createRadialGradient(sun.x, sun.y + 200, 40, sun.x, sun.y + 200, 900);
  side.addColorStop(0, toCss(sun.color, 0.28));
  side.addColorStop(1, toCss(sun.color, 0));
  ctx.fillStyle = side;
  ctx.fillRect(f.x0, f.yTop, f.width, f.height);
  // soft light rays fanning down from the sun
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.5 + (i - 3) * 0.2 + (i % 2) * 0.05;
    const len = 900;
    const w = 0.035 + (i % 3) * 0.015;
    ctx.fillStyle = toCss(sun.color, age === 'future' ? 0.012 : 0.022); // halved (art review: rays washed out the sky)
    ctx.beginPath();
    ctx.moveTo(sun.x, sun.y);
    ctx.lineTo(sun.x + Math.cos(a - w) * len, sun.y + Math.sin(a - w) * len);
    ctx.lineTo(sun.x + Math.cos(a + w) * len, sun.y + Math.sin(a + w) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const glow = ctx.createRadialGradient(sun.x, sun.y, sun.r * 0.4, sun.x, sun.y, sun.r * 6);
  glow.addColorStop(0, toCss(sun.color, 0.6));
  glow.addColorStop(0.25, toCss(sun.color, 0.22));
  glow.addColorStop(1, toCss(sun.color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(f.x0, f.yTop, f.width, f.height);
  ctx.fillStyle = toCss(lighten(sun.color, 0.4), 0.95);
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = toCss(0xffffff, 0.55);
  ctx.beginPath();
  ctx.arc(sun.x - sun.r * 0.2, sun.y - sun.r * 0.2, sun.r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  if (age === 'future') {
    // nebula wisps and a ringed planet in the dusk
    for (const [x, y, r, c] of [
      [520, -620, 260, 0xb070c0],
      [1150, -560, 220, 0x60b0b0],
    ] as const) {
      const n = ctx.createRadialGradient(x, y, 10, x, y, r);
      n.addColorStop(0, toCss(c, 0.22));
      n.addColorStop(1, toCss(c, 0));
      ctx.fillStyle = n;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.fillStyle = toCss(0xb8a8d8, 0.7);
    ctx.beginPath();
    ctx.arc(300, -600, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = toCss(0x6a5a8a, 0.55);
    ctx.beginPath();
    ctx.arc(312, -592, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = toCss(0xe0d4f4, 0.6);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(300, -600, 92, 18, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // distant cloud banks along the horizon: cel-shaded (lit tops, shaded bellies), low contrast
  const rng = mulberry32(age.length * 7919 + 13);
  const lit = mix(horizon, 0xffffff, age === 'future' ? 0.15 : 0.55);
  const shade = mix(horizon, pal.skyTop, 0.35);
  for (let i = 0; i < 9; i++) {
    const cx = f.x0 + (i + 0.3 * rng.next()) * (f.width / 9);
    const cy = -240 + rng.next() * 110;
    const w = 90 + rng.next() * 90;
    const puffs: [number, number, number][] = [];
    for (let k = 0; k < 7; k++) puffs.push([cx + (k - 3) * w * 0.2 + (rng.next() - 0.5) * 10, cy - Math.sin((k / 6) * Math.PI) * w * 0.14, w * (0.2 + 0.08 * rng.next())]);
    ctx.fillStyle = toCss(shade, 0.16);
    for (const [x, y, r] of puffs) {
      ctx.beginPath();
      ctx.arc(x, y + r * 0.25, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = toCss(lit, 0.2);
    for (const [x, y, r] of puffs) {
      ctx.beginPath();
      ctx.arc(x - r * 0.1, y - r * 0.12, r * 0.86, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Two cloud shapes shared by every age (tinted per age at runtime). */
part('bd.cloud.a', [
  { d: join(blob([-60, 8, -52, -10, -30, -20, -8, -30, 18, -26, 38, -16, 58, -4, 62, 8], 0.9)), zone: 'white', line: 0, shade: 'auto', light: false, alpha: 0.9 },
]);
part('bd.cloud.c', [
  { d: join(blob([-84, 10, -74, -12, -48, -26, -20, -40, 12, -44, 40, -30, 66, -18, 86, 0, 80, 12], 0.9)), zone: 'white', line: 0, shade: 'auto', light: false, alpha: 0.92 },
  { d: blob([-50, -16, -30, -36, 0, -40, 24, -26, 10, -16, -30, -12], 0.9), zone: 'white', line: 0, shade: false, light: false, alpha: 0.6 },
]);
part('bd.cloud.b', [{ d: blob([-40, 6, -34, -8, -14, -16, 6, -14, 24, -20, 40, -6, 44, 6], 0.9), zone: 'white', line: 0, shade: 'auto', light: false, alpha: 0.85 }]);

export const CLOUD_TINT: Record<AgeId, number> = {
  stone: 0xf6efe2,
  medieval: 0xf7f5ee,
  gunpowder: 0xf1eee6,
  modern: 0xd9d8d2,
  future: 0x8f86aa,
  bronze: 0xf6efe2,
  industrial: 0xc9c4ba,
  cosmic: 0x7a6aa0,
};
