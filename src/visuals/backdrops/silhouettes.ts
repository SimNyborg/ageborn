/**
 * Backdrop layer 2: far silhouettes per age (DESIGN A11: mountains → castles → windmills and masts →
 * city → megastructures). Low contrast and desaturated; drawn with seeded noise so every match of
 * the same ages looks the same.
 */
import type { AgeId } from '@/contracts/ids';
import { BACKDROP_PALETTES, darken, lighten, mix, toCss } from '../palette';
import { blob, circle, join, limb, poly, rect } from '../svg';
import { part } from '../parts/registry';
import { fbm, seedOf } from './noise';
import { applyFrame, BACKDROP_WIDTH, BACKDROP_X0, type Ctx2D, type LayerFrame } from './sky';

export const FAR_FRAME: LayerFrame = { x0: BACKDROP_X0, width: BACKDROP_WIDTH, yTop: -560, height: 580, pxPerLu: 0.7 };

/** Moving or blinking decorations placed by painters (world lu). */
export interface AmbientSpec {
  kind: 'rotate' | 'blink' | 'emit' | 'drift';
  part: string;
  x: number;
  y: number;
  layer: 'sky' | 'far' | 'mid' | 'ground';
  scale?: number;
  /** Degrees per second (rotate) or lu per second (drift, emit rise). */
  speed?: number;
  /** Blink period (ms). */
  period?: number;
  /** Emissions per second. */
  rate?: number;
  tint?: number;
  alpha?: number;
}

function ridge(ctx: Ctx2D, f: LayerFrame, color: string, yAt: (x: number) => number, bottom = 20): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(f.x0, bottom);
  for (let x = f.x0; x <= f.x0 + f.width; x += 6) ctx.lineTo(x, yAt(x));
  ctx.lineTo(f.x0 + f.width, bottom);
  ctx.closePath();
  ctx.fill();
}

function pathFill(ctx: Ctx2D, d: string, color: string): void {
  ctx.fillStyle = color;
  ctx.fill(new Path2D(d));
}

export function paintFar(ctx: Ctx2D, age: AgeId, f: LayerFrame): AmbientSpec[] {
  const pal = BACKDROP_PALETTES[age];
  const seed = seedOf(`far.${age}`);
  applyFrame(ctx, f);
  const back = toCss(mix(pal.far, pal.skyBottom, 0.45));
  const front = toCss(pal.far);
  const ambient: AmbientSpec[] = [];
  switch (age) {
    case 'stone': {
      const n1 = fbm(seed, 240, 3);
      const n2 = fbm(seed + 7, 170, 4);
      ridge(ctx, f, back, (x) => -230 - 120 * Math.abs(n1(x)) - 30 * n1(x * 3));
      // volcano
      pathFill(ctx, poly([700, 20, 845, -318, 872, -334, 902, -330, 930, -312, 1080, 20]), toCss(mix(pal.far, pal.mid, 0.3)));
      pathFill(ctx, poly([845, -318, 872, -334, 902, -330, 930, -312, 910, -300, 866, -302]), toCss(lighten(pal.far, 0.25)));
      ridge(ctx, f, front, (x) => -110 - 70 * Math.abs(n2(x)) - 20 * n2(x * 4));
      ambient.push({ kind: 'emit', part: 'fx.p.smoke', x: 886, y: -334, layer: 'far', rate: 1.2, speed: 16, scale: 3.2, tint: lighten(pal.far, 0.35), alpha: 0.55 });
      break;
    }
    case 'medieval': {
      const n1 = fbm(seed, 320, 2);
      const n2 = fbm(seed + 3, 260, 3);
      ridge(ctx, f, back, (x) => -170 - 60 * n1(x));
      ridge(ctx, f, front, (x) => -95 - 45 * n2(x) - (x > 200 && x < 470 ? 70 * Math.sin(((x - 200) / 270) * Math.PI) : 0));
      // castle on the hill
      const cx = 335;
      const gy = -95 - 45 * n2(cx) - 70;
      const c = toCss(darken(pal.far, 0.06));
      pathFill(ctx, join(rect(cx - 70, gy - 70, 140, 74), rect(cx - 86, gy - 110, 30, 114), rect(cx + 56, gy - 110, 30, 114), rect(cx - 22, gy - 150, 44, 154)), c);
      pathFill(ctx, join(poly([cx - 92, gy - 108, cx - 71, gy - 150, cx - 50, gy - 108]), poly([cx + 50, gy - 108, cx + 71, gy - 150, cx + 92, gy - 108]), poly([cx - 28, gy - 148, cx, gy - 196, cx + 28, gy - 148])), c);
      for (let i = 0; i < 7; i++) pathFill(ctx, rect(cx - 70 + i * 21, gy - 82, 11, 13), c);
      pathFill(ctx, join(rect(cx - 8, gy - 30, 16, 34)), toCss(darken(pal.far, 0.2)));
      // distant tower
      pathFill(ctx, join(rect(1105, -210, 26, 130), poly([1098, -208, 1118, -250, 1138, -208])), toCss(mix(pal.far, pal.skyBottom, 0.2)));
      ambient.push({ kind: 'drift', part: 'bd.bird', x: 600, y: -380, layer: 'sky', speed: 22, scale: 1, tint: darken(pal.far, 0.2) });
      ambient.push({ kind: 'drift', part: 'bd.bird', x: 640, y: -400, layer: 'sky', speed: 22, scale: 0.8, tint: darken(pal.far, 0.2) });
      break;
    }
    case 'gunpowder': {
      const n1 = fbm(seed, 300, 2);
      ridge(ctx, f, back, (x) => -120 - 40 * n1(x) - (x < 860 ? 30 : 0));
      // sea on the right with ships
      ctx.fillStyle = toCss(mix(pal.skyBottom, pal.far, 0.35));
      ctx.fillRect(860, -70, f.x0 + f.width - 860, 90);
      for (const [sx, s] of [
        [1010, 1],
        [1200, 0.8],
        [1330, 0.65],
      ] as const) {
        const c = toCss(mix(pal.far, pal.skyBottom, 0.15));
        pathFill(ctx, poly([sx - 60 * s, -70, sx + 60 * s, -70, sx + 48 * s, -54 * s - 50, sx - 50 * s, -54 * s - 50]), c);
        pathFill(ctx, join(rect(sx - 20 * s, -70 - 150 * s, 4 * s, 150 * s), rect(sx + 18 * s, -70 - 120 * s, 4 * s, 120 * s)), c);
        pathFill(ctx, join(poly([sx - 18 * s, -70 - 140 * s, sx + 6 * s, -70 - 130 * s, sx - 18 * s, -70 - 80 * s]), poly([sx + 20 * s, -70 - 110 * s, sx + 44 * s, -70 - 100 * s, sx + 20 * s, -70 - 60 * s])), toCss(lighten(pal.far, 0.35)));
      }
      const n2 = fbm(seed + 5, 220, 3);
      ridge(ctx, f, front, (x) => (x > 880 ? 40 : -70 - 35 * n2(x) - (x > 780 ? (x - 780) * 0.4 : 0)));
      for (const wx of [120, 420, 690]) {
        const gy = -70 - 35 * n2(wx);
        pathFill(ctx, poly([wx - 16, gy + 4, wx - 10, gy - 90, wx + 10, gy - 90, wx + 16, gy + 4]), toCss(darken(pal.far, 0.08)));
        pathFill(ctx, poly([wx - 14, gy - 88, wx, gy - 108, wx + 14, gy - 88]), toCss(darken(pal.far, 0.15)));
        ambient.push({ kind: 'rotate', part: 'bd.windmill.sails', x: wx, y: gy - 94, layer: 'far', speed: 40, tint: lighten(pal.far, 0.2) });
      }
      break;
    }
    case 'modern': {
      const n1 = fbm(seed, 200, 2);
      ridge(ctx, f, back, (x) => -110 - 30 * n1(x));
      let x = f.x0;
      let i = 0;
      const rnd = fbm(seed + 9, 37, 1);
      const winC = toCss(lighten(pal.far, 0.22));
      while (x < f.x0 + f.width) {
        const w = 34 + 40 * Math.abs(rnd(i * 13.7));
        const h = 90 + 210 * Math.abs(rnd(i * 7.3 + 3));
        const c = toCss(i % 2 ? pal.far : darken(pal.far, 0.07));
        pathFill(ctx, rect(x, -h, w - 3, h + 20), c);
        for (let wy = -h + 10; wy < -12; wy += 16) for (let wx = x + 5; wx < x + w - 10; wx += 10) if ((wx * 7 + wy * 3) % 5 !== 0) pathFill(ctx, rect(wx, wy, 4, 6), winC);
        if (i % 5 === 2) {
          pathFill(ctx, rect(x + w / 2 - 5, -h - 50, 10, 50), c);
          ambient.push({ kind: 'emit', part: 'fx.p.smoke', x: x + w / 2, y: -h - 52, layer: 'far', rate: 0.9, speed: 12, scale: 2.2, tint: lighten(pal.far, 0.4), alpha: 0.5 });
        }
        if (i % 7 === 4) {
          pathFill(ctx, join(rect(x + 8, -h - 120, 5, 120), rect(x + 8, -h - 120, 80, 5)), toCss(darken(pal.far, 0.1)));
          ambient.push({ kind: 'blink', part: 'bd.light', x: x + 10, y: -h - 124, layer: 'far', period: 1400, tint: 0xf2d6d6 });
        }
        x += w;
        i++;
      }
      break;
    }
    case 'future': {
      // stars in the upper sky
      const rnd = fbm(seed, 11, 1);
      ctx.fillStyle = toCss(0xf4f2ff, 0.8);
      for (let i = 0; i < 90; i++) {
        const sx = f.x0 + ((i * 197) % f.width);
        const sy = -540 + ((i * 83) % 300);
        const r = 0.8 + Math.abs(rnd(i)) * 1.6;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      const n1 = fbm(seed + 1, 260, 2);
      ridge(ctx, f, back, (x) => -90 - 30 * n1(x));
      const c1 = toCss(pal.far);
      const c2 = toCss(lighten(pal.far, 0.15));
      // ring arch
      ctx.strokeStyle = c2;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.ellipse(700, -40, 190, 300, 0, Math.PI, 0);
      ctx.stroke();
      for (const [sx, h, w] of [
        [60, 400, 34],
        [180, 300, 26],
        [470, 440, 40],
        [960, 380, 36],
        [1130, 470, 44],
        [1300, 320, 30],
      ] as const) {
        pathFill(ctx, poly([sx - w, 20, sx - w * 0.4, -h, sx, -h - 40, sx + w * 0.4, -h, sx + w, 20]), c1);
        pathFill(ctx, rect(sx - 2, -h + 30, 4, h - 40), toCss(0x9ff5d8, 0.55));
        ambient.push({ kind: 'blink', part: 'bd.light', x: sx, y: -h - 44, layer: 'far', period: 900 + (sx % 7) * 120, tint: 0xf6c6e4 });
      }
      pathFill(ctx, join(blob([560, -260, 600, -280, 660, -276, 690, -260, 640, -246, 580, -248], 0.8), blob([820, -330, 850, -344, 900, -340, 918, -328, 880, -318, 836, -318], 0.8)), c2);
      ambient.push({ kind: 'drift', part: 'bd.skycar', x: 200, y: -300, layer: 'sky', speed: 60, tint: 0xd8f3ea });
      ambient.push({ kind: 'drift', part: 'bd.skycar', x: 900, y: -360, layer: 'sky', speed: -45, tint: 0xf6d8ec, scale: 0.7 });
      break;
    }
  }
  return ambient;
}

// Ambient decoration parts
part('bd.windmill.sails', [
  { d: join(poly([-2, 0, -4, -46, 4, -46, 2, 0]), poly([0, -2, 46, -4, 46, 4, 0, 2]), poly([2, 0, 4, 46, -4, 46, -2, 0]), poly([0, 2, -46, 4, -46, -4, 0, -2])), zone: 'white', line: 0, shade: false, light: false },
  { d: circle(0, 0, 4), zone: 'white', line: 0, shade: false, light: false },
]);
part('bd.bird', [{ d: join(blob([-8, 0, -4, -3, 0, 0, 4, -3, 8, 0, 4, -1.2, 0, 1.4, -4, -1.2], 0.6)), zone: 'white', line: 0, shade: false, light: false }]);
part('bd.light', [
  { d: circle(0, 0, 7), zone: 'white', line: 0, alpha: 0.25, shade: false, light: false },
  { d: circle(0, 0, 2.6), zone: 'white', line: 0, shade: false, light: false },
]);
part('bd.skycar', [
  { d: blob([-16, 0, -10, -6, 8, -6, 18, 0, 10, 4, -12, 4], 0.7), zone: 'white', line: 0, shade: 'auto', light: false },
  { d: limb(-22, 1, 1, -34, 1, 0.5), zone: 'white', line: 0, alpha: 0.5, shade: false, light: false },
]);
