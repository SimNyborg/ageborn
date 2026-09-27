/**
 * Backdrop layer 1: the sky gradient (DESIGN A11 Split-age lane). Painted small and stretched (it is
 * smooth), with a soft sun or moon glow. Clouds are separate drifting sprites (ambient motion).
 */
import type { AgeId } from '@/contracts/ids';
import { BACKDROP_PALETTES, lighten, mix, toCss } from '../palette';
import { blob, join } from '../svg';
import { part } from '../parts/registry';

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
};

export function applyFrame(ctx: Ctx2D, f: LayerFrame): void {
  ctx.setTransform(f.pxPerLu, 0, 0, f.pxPerLu, -f.x0 * f.pxPerLu, -f.yTop * f.pxPerLu);
}

export function paintSky(ctx: Ctx2D, age: AgeId, f: LayerFrame): void {
  const pal = BACKDROP_PALETTES[age];
  applyFrame(ctx, f);
  const g = ctx.createLinearGradient(0, f.yTop, 0, f.yTop + f.height);
  g.addColorStop(0, toCss(pal.skyTop));
  g.addColorStop(0.62, toCss(mix(pal.skyTop, pal.skyBottom, 0.7)));
  g.addColorStop(1, toCss(pal.skyBottom));
  ctx.fillStyle = g;
  ctx.fillRect(f.x0, f.yTop, f.width, f.height);
  const sun = SUN[age];
  const glow = ctx.createRadialGradient(sun.x, sun.y, sun.r * 0.4, sun.x, sun.y, sun.r * 6);
  glow.addColorStop(0, toCss(sun.color, 0.55));
  glow.addColorStop(0.25, toCss(sun.color, 0.2));
  glow.addColorStop(1, toCss(sun.color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(f.x0, f.yTop, f.width, f.height);
  ctx.fillStyle = toCss(lighten(sun.color, 0.4), 0.9);
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
  ctx.fill();
  if (age === 'future') {
    // a ringed planet in the dusk
    ctx.strokeStyle = toCss(0xd8c8f0, 0.5);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(300, -600, 90, 18, -0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = toCss(0xb8a8d8, 0.55);
    ctx.beginPath();
    ctx.arc(300, -600, 44, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Two cloud shapes shared by every age (tinted per age at runtime). */
part('bd.cloud.a', [
  { d: join(blob([-60, 8, -52, -10, -30, -20, -8, -30, 18, -26, 38, -16, 58, -4, 62, 8], 0.9)), zone: 'white', line: 0, shade: 'auto', light: false, alpha: 0.9 },
]);
part('bd.cloud.b', [{ d: blob([-40, 6, -34, -8, -14, -16, 6, -14, 24, -20, 40, -6, 44, 6], 0.9), zone: 'white', line: 0, shade: 'auto', light: false, alpha: 0.85 }]);

export const CLOUD_TINT: Record<AgeId, number> = {
  stone: 0xf6efe2,
  medieval: 0xf7f5ee,
  gunpowder: 0xf1eee6,
  modern: 0xd9d8d2,
  future: 0x8f86aa,
};
