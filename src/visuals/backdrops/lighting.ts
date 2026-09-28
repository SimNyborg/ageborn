/**
 * Backdrop lighting and depth (DESIGN A11 Split-age lane; the 3D art direction): the painted
 * silhouette layers get the same light as the pre-rendered units and bases (from above and in
 * front), and atmospheric perspective so the layers read as distance, not flat cut-outs.
 *
 * - `finishLayer` runs once per painted layer texture (far and mid): a lit rim along every top
 *   edge (the silhouette minus itself shifted down), a soft top-to-bottom shade, and a haze that
 *   rises from the layer's foot in the sky's horizon colour (farther layers get more of it).
 * - `extraAmbient` adds ambient life per age: flapping bird flocks and slow drifting mist banks.
 *
 * Pure canvas 2D work at bake time, so it costs nothing per frame (B16).
 */
import type { AgeId } from '@/contracts/ids';
import { BACKDROP_PALETTES, lighten, mix, toCss } from '../palette';
import { blob } from '../svg';
import { part } from '../parts/registry';
import type { AmbientSpec } from './silhouettes';
import type { Ctx2D, LayerFrame } from './sky';

export interface LayerLook {
  /** Rim light width (lu) and strength. */
  rimLu: number;
  rim: number;
  /** Haze at the layer's foot: 0..1, and how high it reaches (0..1 of the layer). */
  haze: number;
  hazeReach: number;
  /** Top light: how much lighter the top of a shape is than its foot. */
  shade: number;
}

export const LAYER_LOOK: Record<'far' | 'mid', LayerLook> = {
  far: { rimLu: 3.2, rim: 0.6, haze: 0.42, hazeReach: 0.4, shade: 0.12 },
  mid: { rimLu: 2.4, rim: 0.65, haze: 0.28, hazeReach: 0.3, shade: 0.16 },
};

function scratch(w: number, h: number): { c: HTMLCanvasElement; x: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  return x ? { c, x } : null;
}

/**
 * Lights a painted layer in place. `canvas` holds the layer at `f.pxPerLu` px per lu (its whole
 * area); `groundLu` is the world y of the ground line (0) so the haze sits at the foot.
 */
export function finishLayer(canvas: HTMLCanvasElement, ctx: Ctx2D, kind: 'far' | 'mid', age: AgeId, f: LayerFrame): void {
  const look = LAYER_LOOK[kind];
  const pal = BACKDROP_PALETTES[age];
  const W = canvas.width;
  const H = canvas.height;
  const k = f.pxPerLu;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 1. top light: a gentle vertical shade over every shape (lighter up, darker at the foot)
  ctx.globalCompositeOperation = 'source-atop';
  const sh = ctx.createLinearGradient(0, 0, 0, H);
  sh.addColorStop(0, toCss(lighten(pal.light, 0.1), look.shade));
  sh.addColorStop(0.55, toCss(pal.light, 0));
  sh.addColorStop(1, toCss(0x1c1a24, look.shade * 0.8));
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, W, H);
  // 2. rim light along every top edge: the layer minus itself shifted down
  const s = scratch(W, H);
  if (s) {
    const d = Math.max(1, Math.round(look.rimLu * k));
    s.x.drawImage(canvas, 0, 0);
    s.x.globalCompositeOperation = 'destination-out';
    s.x.drawImage(canvas, 0, d);
    s.x.globalCompositeOperation = 'source-in';
    s.x.fillStyle = toCss(lighten(pal.light, 0.15), 1);
    s.x.fillRect(0, 0, W, H);
    ctx.globalAlpha = look.rim;
    ctx.drawImage(s.c, 0, 0);
    ctx.globalAlpha = 1;
  }
  // 3. atmospheric haze rising from the foot of the layer (the ground line is at y = 0)
  const footPx = (0 - f.yTop) * k;
  const topPx = footPx - (f.height * look.hazeReach) * k;
  const horizon = mix(pal.skyBottom, pal.light, 0.35);
  const hz = ctx.createLinearGradient(0, topPx, 0, footPx);
  hz.addColorStop(0, toCss(horizon, 0));
  hz.addColorStop(0.7, toCss(horizon, look.haze * 0.55));
  hz.addColorStop(1, toCss(horizon, look.haze));
  ctx.fillStyle = hz;
  ctx.fillRect(0, Math.max(0, topPx), W, H);
  ctx.restore();
}

/** Ambient life added to every age's backdrop: bird flocks (flapping) and drifting mist banks. */
export function extraAmbient(age: AgeId): AmbientSpec[] {
  const pal = BACKDROP_PALETTES[age];
  const out: AmbientSpec[] = [];
  if (age !== 'future') {
    const birdTint = mix(pal.far, 0x2a2630, 0.45);
    const flocks: [number, number, number][] = [
      [120, -430, 16],
      [860, -500, -12],
    ];
    for (const [x, y, speed] of flocks) {
      for (let i = 0; i < 4; i++) {
        out.push({ kind: 'drift', part: 'bd.bird', x: x + i * 22 * Math.sign(speed) * -1 + (i % 2) * 6, y: y + (i % 2 ? 10 : 0) + i * 4, layer: 'sky', speed, scale: 0.7 + (i % 3) * 0.12, tint: birdTint, period: 420 + i * 60 });
      }
    }
  }
  const mist = mix(pal.skyBottom, 0xffffff, age === 'future' ? 0.1 : 0.35);
  for (const [x, y, sc, sp, a] of [
    [80, -70, 3.2, 5, 0.12],
    [700, -40, 4.2, -4, 0.1],
    [1180, -90, 2.8, 6, 0.1],
  ] as const) {
    out.push({ kind: 'drift', part: 'bd.mist', x, y, layer: 'mid', scale: sc, speed: sp, tint: mist, alpha: a });
  }
  return out;
}

part('bd.mist', [
  { d: blob([-60, 0, -40, -10, -6, -14, 30, -12, 60, -4, 52, 6, 10, 10, -34, 8], 0.9), zone: 'white', line: 0, shade: false, light: false, alpha: 0.9 },
]);
