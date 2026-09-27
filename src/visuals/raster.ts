/**
 * A tiny pure rasteriser for SVG path data (nonzero fill, round-joined strokes, clip masks). The
 * silhouette IoU test and the colour-rule test (DESIGN A5.8, A11) run it in Node, and the gallery
 * runs the same code in the browser, so the tests judge the same SVG sources the bake draws.
 *
 * Coverage is sampled at pixel centres (binary). That is exact enough for area ratios at the test
 * resolution and fully deterministic across machines.
 */
import { flatten, matMul, parsePath, type Bounds, type Mat, type Poly } from './svg';

export class Raster {
  /** Final colour per pixel (0xRRGGBB), or -1 when empty. */
  readonly color: Int32Array;
  /** 1 where the last paint came from a team layer. */
  readonly team: Uint8Array;
  readonly w: number;
  readonly h: number;
  /** lu → pixel transform. */
  readonly toPx: Mat;

  constructor(
    readonly bounds: Bounds,
    readonly pxPerLu: number,
  ) {
    this.w = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) * pxPerLu));
    this.h = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) * pxPerLu));
    this.color = new Int32Array(this.w * this.h).fill(-1);
    this.team = new Uint8Array(this.w * this.h);
    this.toPx = [pxPerLu, 0, 0, pxPerLu, -bounds.minX * pxPerLu, -bounds.minY * pxPerLu];
  }

  /** Nonzero coverage of path data transformed by `m` (lu space). */
  coverFill(d: string, m: Mat): Uint8Array {
    return fillPolys(flatten(parsePath(d), matMul(this.toPx, m), 0.75), this.w, this.h);
  }

  /** Coverage of a round-joined stroke of `widthLu` along path data transformed by `m`. */
  coverStroke(d: string, m: Mat, widthLu: number): Uint8Array {
    const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
    return strokePolys(flatten(parsePath(d), matMul(this.toPx, m), 0.75), this.w, this.h, (widthLu * scale * this.pxPerLu) / 2);
  }

  /** Paints covered pixels. Alpha below 1 blends over existing paint. */
  paint(mask: Uint8Array, color: number, alpha: number, team: boolean): void {
    const n = mask.length;
    for (let i = 0; i < n; i++) {
      if (mask[i] === 0) continue;
      const prev = this.color[i] ?? -1;
      if (alpha >= 1 || prev < 0) {
        this.color[i] = color;
      } else {
        this.color[i] = blend(prev, color, alpha);
      }
      this.team[i] = team ? 1 : 0;
    }
  }

  /** 1 for every painted pixel. */
  silhouette(): Uint8Array {
    const out = new Uint8Array(this.color.length);
    for (let i = 0; i < out.length; i++) out[i] = (this.color[i] ?? -1) >= 0 ? 1 : 0;
    return out;
  }
}

function blend(a: number, b: number, t: number): number {
  const r = ((a >> 16) & 0xff) * (1 - t) + ((b >> 16) & 0xff) * t;
  const g = ((a >> 8) & 0xff) * (1 - t) + ((b >> 8) & 0xff) * t;
  const bl = (a & 0xff) * (1 - t) + (b & 0xff) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

/** Nonzero scanline fill at pixel centres. */
export function fillPolys(polys: readonly Poly[], w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  // Edge list: [x0, y0, x1, y1] with y0 != y1.
  const edges: number[] = [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of polys) {
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      if (!a || !b || a.y === b.y) continue;
      edges.push(a.x, a.y, b.x, b.y);
      minY = Math.min(minY, a.y, b.y);
      maxY = Math.max(maxY, a.y, b.y);
    }
  }
  if (edges.length === 0) return out;
  const r0 = Math.max(0, Math.floor(minY - 0.5));
  const r1 = Math.min(h - 1, Math.ceil(maxY + 0.5));
  const xs: number[] = [];
  const ws: number[] = [];
  const order: number[] = [];
  for (let row = r0; row <= r1; row++) {
    const py = row + 0.5;
    xs.length = 0;
    ws.length = 0;
    for (let e = 0; e < edges.length; e += 4) {
      const x0 = edges[e] ?? 0;
      const y0 = edges[e + 1] ?? 0;
      const x1 = edges[e + 2] ?? 0;
      const y1 = edges[e + 3] ?? 0;
      const up = y1 > y0;
      const lo = up ? y0 : y1;
      const hi = up ? y1 : y0;
      if (py < lo || py >= hi) continue;
      xs.push(x0 + ((py - y0) * (x1 - x0)) / (y1 - y0));
      ws.push(up ? 1 : -1);
    }
    if (xs.length < 2) continue;
    order.length = 0;
    for (let i = 0; i < xs.length; i++) order.push(i);
    order.sort((a, b) => (xs[a] ?? 0) - (xs[b] ?? 0));
    let wind = 0;
    for (let k = 0; k < order.length - 1; k++) {
      const i = order[k] ?? 0;
      wind += ws[i] ?? 0;
      if (wind === 0) continue;
      const xa = xs[i] ?? 0;
      const xb = xs[order[k + 1] ?? 0] ?? 0;
      const c0 = Math.max(0, Math.ceil(xa - 0.5));
      const c1 = Math.min(w - 1, Math.ceil(xb - 0.5) - 1);
      const base = row * w;
      for (let c = c0; c <= c1; c++) out[base + c] = 1;
    }
  }
  return out;
}

/** Pixels within `halfPx` of any segment (closed polygons include the closing segment). */
export function strokePolys(polys: readonly Poly[], w: number, h: number, halfPx: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const r2 = halfPx * halfPx;
  for (const p of polys) {
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      if (!a || !b) continue;
      const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) - halfPx));
      const x1 = Math.min(w - 1, Math.ceil(Math.max(a.x, b.x) + halfPx));
      const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) - halfPx));
      const y1 = Math.min(h - 1, Math.ceil(Math.max(a.y, b.y) + halfPx));
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      for (let row = y0; row <= y1; row++) {
        const py = row + 0.5;
        for (let col = x0; col <= x1; col++) {
          const px = col + 0.5;
          let t = len2 > 0 ? ((px - a.x) * dx + (py - a.y) * dy) / len2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = a.x + dx * t - px;
          const ey = a.y + dy * t - py;
          if (ex * ex + ey * ey <= r2) out[row * w + col] = 1;
        }
      }
    }
  }
  return out;
}

export function andMasks(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = (a[i] ?? 0) & (b[i] ?? 0);
  return out;
}

export function maskArea(m: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) n += m[i] ?? 0;
  return n;
}

/** Intersection over union of two masks on the same grid. */
export function iou(a: Uint8Array, b: Uint8Array): number {
  let inter = 0;
  let uni = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    inter += x & y;
    uni += x | y;
  }
  return uni === 0 ? 1 : inter / uni;
}
