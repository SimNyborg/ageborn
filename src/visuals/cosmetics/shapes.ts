/**
 * A tiny vector shape language for the cosmetic art (DESIGN A18.9.4): flags, emblems, decorations
 * and emotes are lists of shapes in a small view box, drawn by the same code to an SVG string (the
 * UI shows it as an image) and to a 2D canvas (the battle bakes it into a texture). One description,
 * two outputs, so the Customize preview and the lane always match.
 *
 * Paints are CSS colours or the team paints `team`, `teamDark` and `teamLight` (A11: the side's team
 * colour), resolved when drawn.
 */

export type Paint = string;

export interface PathShape {
  d: string;
  fill?: Paint;
  stroke?: Paint;
  width?: number;
  alpha?: number;
  /** Stroke line cap and join (default round). */
  cap?: 'round' | 'butt';
  /** A dashed stroke (stitching): dash and gap lengths in view-box units. */
  dash?: readonly number[];
  /** Fill with the even-odd rule (a shape with a hole). */
  evenodd?: boolean;
  /** Dropped at low detail (below 48 px: interior lines, stitching, texture strokes; AUDIT §3.2). */
  lo?: boolean;
}

/** A clipped group (a canton, a nested panel). */
export interface GroupShape {
  clip: [number, number, number, number];
  shapes: Shape[];
}

/** The materials of the art sheet's ramps (AUDIT §3.1). */
export type CelMaterial = 'matte' | 'cloth' | 'metal' | 'gold' | 'bronze' | 'gloss';

/**
 * A filled part with the art sheet's cel shading (AUDIT §3.1, the same cut as the avatar parts): the
 * fill, one hard shadow band on its lower edge (the part minus itself moved up by `sh`), one highlight
 * sliver near its top (the part minus itself moved down by `hl` and right by half of it) and an outline
 * in the fill's own dark (fill × 0.40, value ≤ 0.38), never black. Paints may be team paints.
 */
export interface CelShape {
  /** The fill. */
  cel: Paint;
  d: string;
  mat?: CelMaterial;
  /** Shadow band depth in units (0: none). */
  sh?: number;
  /**
   * The far side of an upright round form (a pole, a column): the band also runs down the right edge,
   * this many units wide (AUDIT §3.1 "the far side of round forms").
   */
  shx?: number;
  /** Highlight sliver depth in units (0: none). */
  hl?: number;
  /** Outline width in units (default 1.2; 0: none). */
  ln?: number;
  /** Outline colour: the fill's outer line (default), its softer interior line, or a paint. */
  lc?: 'line' | 'inner' | Paint;
  /** Dropped at low detail (below 48 px). */
  lo?: boolean;
}

/** A soft radial glow (an aura, a lamp): one of the few gradients the art sheet allows. */
export interface GlowShape {
  glow: [number, number, number];
  color: Paint;
  alpha?: number;
}

export type Shape = PathShape | GroupShape | CelShape | GlowShape;

/** Output options: `low` drops the shapes marked `lo` (art drawn under 48 px). */
export interface DrawOptions {
  low?: boolean;
}

export const INK = '#1b1330';

const f = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

// ---------------------------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------------------------

export function rect(x: number, y: number, w: number, h: number, fill: Paint, o: Partial<PathShape> = {}): PathShape {
  return { d: `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`, fill, ...o };
}

export function roundRect(x: number, y: number, w: number, h: number, r: number, fill: Paint, o: Partial<PathShape> = {}): PathShape {
  const k = Math.min(r, w / 2, h / 2);
  return {
    d:
      `M${f(x + k)} ${f(y)}h${f(w - 2 * k)}a${f(k)} ${f(k)} 0 0 1 ${f(k)} ${f(k)}v${f(h - 2 * k)}a${f(k)} ${f(k)} 0 0 1 ${f(-k)} ${f(k)}` +
      `h${f(-(w - 2 * k))}a${f(k)} ${f(k)} 0 0 1 ${f(-k)} ${f(-k)}v${f(-(h - 2 * k))}a${f(k)} ${f(k)} 0 0 1 ${f(k)} ${f(-k)}z`,
    fill,
    ...o,
  };
}

export function poly(pts: readonly number[], fill: Paint, o: Partial<PathShape> = {}): PathShape {
  let d = '';
  for (let i = 0; i + 1 < pts.length; i += 2) d += `${i === 0 ? 'M' : 'L'}${f(pts[i]!)} ${f(pts[i + 1]!)}`;
  return { d: `${d}z`, fill, ...o };
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, fill: Paint, o: Partial<PathShape> = {}): PathShape {
  return { d: `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0z`, fill, ...o };
}

export function circle(cx: number, cy: number, r: number, fill: Paint, o: Partial<PathShape> = {}): PathShape {
  return ellipse(cx, cy, r, r, fill, o);
}

/** A regular star with `n` points (outer radius r, inner ri), the first point at `rotDeg` from up. */
export function star(cx: number, cy: number, r: number, fill: Paint, o: { ri?: number; n?: number; rotDeg?: number } & Partial<PathShape> = {}): PathShape {
  const { ri = r * 0.42, n = 5, rotDeg = 0, ...rest } = o;
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i += 1) {
    const a = ((rotDeg + (i * 180) / n) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : ri;
    pts.push(cx + Math.sin(a) * rr, cy - Math.cos(a) * rr);
  }
  return poly(pts, fill, rest);
}

/** A thick straight band from (x1,y1) to (x2,y2) of width w (a four-point polygon). */
export function band(x1: number, y1: number, x2: number, y2: number, w: number, fill: Paint, o: Partial<PathShape> = {}): PathShape {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  return poly([x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, x1 - nx, y1 - ny], fill, o);
}

/** A stroked open path. */
export function line(d: string, stroke: Paint, width: number, o: Partial<PathShape> = {}): PathShape {
  return { d, stroke, width, ...o };
}

/** A ring (stroked circle). */
export function ring(cx: number, cy: number, r: number, stroke: Paint, width: number): PathShape {
  return { ...circle(cx, cy, r, 'none'), stroke, width };
}

/** A rectangle rotated by `deg` around its centre. */
export function rotRect(cx: number, cy: number, w: number, h: number, deg: number, fill: Paint, o: Partial<PathShape> = {}): PathShape {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts: number[] = [];
  for (const [x, y] of [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ] as const) {
    pts.push(cx + x * c - y * s, cy + x * s + y * c);
  }
  return poly(pts, fill, o);
}

export function group(clip: [number, number, number, number], shapes: Shape[]): GroupShape {
  return { clip, shapes };
}

/** A cel-shaded part (see {@link CelShape}); `o` sets the material, band depths and outline. */
export function cel(d: string, fill: Paint, o: Omit<Partial<CelShape>, 'cel' | 'd'> = {}): CelShape {
  return { cel: fill, d, sh: 2, hl: 1.2, ...o };
}

/** A soft round glow centred on (cx, cy). */
export function glow(cx: number, cy: number, r: number, color: Paint, alpha = 0.8): GlowShape {
  return { glow: [cx, cy, r], color, alpha };
}

/** A closed ellipse path (for {@link cel} parts). */
export function ellipsePath(cx: number, cy: number, rx: number, ry = rx): string {
  return ellipse(cx, cy, rx, ry, 'none').d;
}

/** A closed polygon path (for {@link cel} parts). */
export function polyPath(pts: readonly number[]): string {
  return poly(pts, 'none').d;
}

type Pt = readonly [number, number];

function catmull(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): [number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  const k = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [k(p0[0], p1[0], p2[0], p3[0]), k(p0[1], p1[1], p2[1], p3[1])];
}

/**
 * A filled ribbon along a smooth curve through `pts` (a trunk, a tail, a horn, a flame tongue): width
 * `w0` at the start tapering to `w1`, a round start and a round (or `point`) end.
 */
export function ribbonPath(pts: readonly Pt[], w0: number, w1 = w0, end: 'round' | 'point' = 'round'): string {
  const sp: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(n - 1, i + 2)]!;
    for (let k = 0; k < 6; k += 1) sp.push(catmull(p0, p1, p2, p3, k / 6));
  }
  sp.push([pts[n - 1]![0], pts[n - 1]![1]]);
  const L: [number, number][] = [];
  const R: [number, number][] = [];
  let ex = 0;
  let ey = 0;
  for (let i = 0; i < sp.length; i += 1) {
    const a = sp[Math.max(0, i - 1)]!;
    const b = sp[Math.min(sp.length - 1, i + 1)]!;
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    if (i === sp.length - 1) {
      ex = dx;
      ey = dy;
    }
    const w = (w0 + (w1 - w0) * (i / (sp.length - 1))) / 2;
    L.push([sp[i]![0] - dy * w, sp[i]![1] + dx * w]);
    R.push([sp[i]![0] + dy * w, sp[i]![1] - dx * w]);
  }
  const P = (p: [number, number]) => `${f(p[0])} ${f(p[1])}`;
  const last = sp[sp.length - 1]!;
  let d = `M${P(L[0]!)}`;
  for (let i = 1; i < L.length; i += 1) d += `L${P(L[i]!)}`;
  if (end === 'point') d += `L${P([last[0] + ex * Math.max(w1, 0.6), last[1] + ey * Math.max(w1, 0.6)])}L${P(R[R.length - 1]!)}`;
  else d += `A${f(w1 / 2)} ${f(w1 / 2)} 0 0 0 ${P(R[R.length - 1]!)}`;
  for (let i = R.length - 2; i >= 0; i -= 1) d += `L${P(R[i]!)}`;
  d += `A${f(w0 / 2)} ${f(w0 / 2)} 0 0 0 ${P(L[0]!)}Z`;
  return d;
}

/** A stadium (a thick rounded bar) from (x1, y1) to (x2, y2), `w` wide: logs, handles, poles. */
export function stadiumPath(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  const r = f(w / 2);
  return `M${f(x1 + nx)} ${f(y1 + ny)}L${f(x2 + nx)} ${f(y2 + ny)}A${r} ${r} 0 0 0 ${f(x2 - nx)} ${f(y2 - ny)}L${f(x1 - nx)} ${f(y1 - ny)}A${r} ${r} 0 0 0 ${f(x1 + nx)} ${f(y1 + ny)}Z`;
}

/** A gear: `n` flat-topped teeth from radius `ri` to `ro`, the first centred at `rotDeg` from up. */
export function gearPath(cx: number, cy: number, ro: number, ri: number, n: number, rotDeg = 0): string {
  const pitch = 360 / n;
  const at = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}`;
  };
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a = rotDeg + i * pitch;
    d += `${i === 0 ? 'M' : 'L'}${at(ri, a - pitch * 0.3)}L${at(ro, a - pitch * 0.17)}L${at(ro, a + pitch * 0.17)}L${at(ri, a + pitch * 0.3)}`;
    d += `A${f(ri)} ${f(ri)} 0 0 1 ${at(ri, a + pitch * 0.7)}`;
  }
  return `${d}Z`;
}

/** A four-point sparkle with concave sides. */
export function sparklePath(cx: number, cy: number, r: number, rx = r): string {
  const c = `${f(cx)} ${f(cy)}`;
  return `M${f(cx)} ${f(cy - r)}Q${c} ${f(cx + rx)} ${f(cy)}Q${c} ${f(cx)} ${f(cy + r)}Q${c} ${f(cx - rx)} ${f(cy)}Q${c} ${f(cx)} ${f(cy - r)}Z`;
}

/**
 * A closed path symmetric about x = `cx`: `half` lists the right half from the top centre point to the
 * bottom centre point as `x y` pairs, with a quadratic control point before every point after the first
 * (`[x0, y0, qx, qy, x1, y1, qx, qy, x2, y2, …]`); the left half is its mirror, walked back up.
 */
export function symPath(half: readonly number[], cx = 0): string {
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < half.length; i += 2) pts.push([half[i]!, half[i + 1]!]);
  const P = (x: number, y: number) => `${f(x)} ${f(y)}`;
  let d = `M${P(cx + pts[0]![0], pts[0]![1])}`;
  for (let i = 1; i + 1 < pts.length; i += 2) d += `Q${P(cx + pts[i]![0], pts[i]![1])} ${P(cx + pts[i + 1]![0], pts[i + 1]![1])}`;
  for (let i = pts.length - 1; i >= 2; i -= 2) d += `Q${P(cx - pts[i - 1]![0], pts[i - 1]![1])} ${P(cx - pts[i - 2]![0], pts[i - 2]![1])}`;
  return `${d}Z`;
}

// ---------------------------------------------------------------------------------------------
// Path tools: move, mirror, rotate and scale a path (the cel band cut and symmetric emblems)
// ---------------------------------------------------------------------------------------------

type Cmd = { c: string; v: number[] };

const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const TOKEN = /([MLHVCSQTAZmlhvcsqtaz])|(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)/g;

/** Parses a path into absolute commands (H and V become L, relative commands absolute). */
function parsePath(d: string): Cmd[] {
  const out: Cmd[] = [];
  const toks = d.match(TOKEN) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  while (i < toks.length) {
    const t = toks[i]!;
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i += 1;
      if (cmd === 'Z' || cmd === 'z') {
        out.push({ c: 'Z', v: [] });
        x = sx;
        y = sy;
        continue;
      }
    }
    const up = cmd.toUpperCase();
    const n = ARGS[up] ?? 0;
    if (n === 0) {
      i += 1;
      continue;
    }
    const v = toks.slice(i, i + n).map(Number);
    i += n;
    const rel = cmd !== up;
    switch (up) {
      case 'M':
      case 'L':
      case 'T': {
        const nx = rel ? x + v[0]! : v[0]!;
        const ny = rel ? y + v[1]! : v[1]!;
        out.push({ c: up, v: [nx, ny] });
        x = nx;
        y = ny;
        if (up === 'M') {
          sx = nx;
          sy = ny;
          cmd = rel ? 'l' : 'L';
        }
        break;
      }
      case 'H': {
        const nx = rel ? x + v[0]! : v[0]!;
        out.push({ c: 'L', v: [nx, y] });
        x = nx;
        break;
      }
      case 'V': {
        const ny = rel ? y + v[0]! : v[0]!;
        out.push({ c: 'L', v: [x, ny] });
        y = ny;
        break;
      }
      case 'C':
      case 'S':
      case 'Q': {
        const a = v.map((k, j) => (rel ? k + (j % 2 === 0 ? x : y) : k));
        out.push({ c: up, v: a });
        x = a[a.length - 2]!;
        y = a[a.length - 1]!;
        break;
      }
      case 'A': {
        const nx = rel ? x + v[5]! : v[5]!;
        const ny = rel ? y + v[6]! : v[6]!;
        out.push({ c: 'A', v: [v[0]!, v[1]!, v[2]!, v[3]!, v[4]!, nx, ny] });
        x = nx;
        y = ny;
        break;
      }
    }
  }
  return out;
}

function writePath(cmds: Cmd[]): string {
  return cmds.map((k) => k.c + k.v.map(f).join(' ')).join('');
}

/**
 * Transforms a path: scale `s` about the origin, then mirror (x → −x) when `mirror`, then rotate by
 * `deg` (clockwise on screen), then move by (dx, dy). Arcs keep their shape (uniform scale only).
 */
export function xformPath(d: string, o: { dx?: number; dy?: number; deg?: number; s?: number; mirror?: boolean }): string {
  const s = o.s ?? 1;
  const a = ((o.deg ?? 0) * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const mx = o.mirror ? -1 : 1;
  const pt = (x: number, y: number): [number, number] => {
    const X = x * s * mx;
    const Y = y * s;
    return [X * c - Y * sn + (o.dx ?? 0), X * sn + Y * c + (o.dy ?? 0)];
  };
  return writePath(
    parsePath(d).map((k) => {
      if (k.c === 'A') {
        const [x, y] = pt(k.v[5]!, k.v[6]!);
        const rot = (o.mirror ? -k.v[2]! : k.v[2]!) + (o.deg ?? 0);
        return { c: 'A', v: [k.v[0]! * s, k.v[1]! * s, rot, k.v[3]!, o.mirror ? (k.v[4]! ? 0 : 1) : k.v[4]!, x, y] };
      }
      const v: number[] = [];
      for (let j = 0; j + 1 < k.v.length; j += 2) v.push(...pt(k.v[j]!, k.v[j + 1]!));
      return { c: k.c, v };
    }),
  );
}

/** Moves a path by (dx, dy). */
export function movePath(d: string, dx: number, dy: number): string {
  return xformPath(d, { dx, dy });
}

/**
 * Scales shapes by `s` about (cx, cy), then moves them by (dx, dy): an emblem fitted to its field.
 * Line widths stay as drawn (the art sheet's weights are per drawn size).
 */
export function fitShapes(shapes: readonly Shape[], s: number, cx: number, cy: number, dx = 0, dy = 0): Shape[] {
  const p = (d: string) => xformPath(xformPath(d, { dx: -cx, dy: -cy }), { s, dx: cx + dx, dy: cy + dy });
  return shapes.map((sh): Shape => {
    if ('clip' in sh) {
      const [x, y, w, h] = sh.clip;
      return { clip: [cx + (x - cx) * s + dx, cy + (y - cy) * s + dy, w * s, h * s], shapes: fitShapes(sh.shapes, s, cx, cy, dx, dy) };
    }
    if ('glow' in sh) return { ...sh, glow: [cx + (sh.glow[0] - cx) * s + dx, cy + (sh.glow[1] - cy) * s + dy, sh.glow[2] * s] };
    return { ...sh, d: p(sh.d) };
  });
}

/** Mirrors a path about the vertical line x = cx. */
export function mirrorPath(d: string, cx: number): string {
  return xformPath(xformPath(d, { dx: -cx }), { mirror: true, dx: cx });
}

/** Rotates a path by `deg` about (cx, cy). */
export function rotatePath(d: string, deg: number, cx: number, cy: number): string {
  return xformPath(xformPath(d, { dx: -cx, dy: -cy }), { deg, dx: cx, dy: cy });
}

/** Points along an SVG arc (endpoint form, SVG 1.1 F.6.5), for bounds. */
function arcPoints(x1: number, y1: number, v: number[]): [number, number][] {
  let [rx, ry] = [Math.abs(v[0]!), Math.abs(v[1]!)];
  const phi = (v[2]! * Math.PI) / 180;
  const [fa, fs, x2, y2] = [v[3]!, v[4]!, v[5]!, v[6]!];
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const xp = cp * dx + sp * dy;
  const yp = -sp * dx + cp * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  const k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (k * rx * yp) / ry;
  const cyp = (-k * ry * xp) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2;
  const cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI;
  if (fs && dt < 0) dt += 2 * Math.PI;
  const out: [number, number][] = [];
  for (let i = 1; i <= 24; i += 1) {
    const t = t1 + (dt * i) / 24;
    out.push([cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp]);
  }
  return out;
}

/** The bounding box of a path's outline (curves and arcs sampled; enough for layout tests). */
export function pathBounds(d: string): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const add = (x: number, y: number) => {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  };
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const k of parsePath(d)) {
    const v = k.v;
    if (k.c === 'Z') {
      cx = sx;
      cy = sy;
      continue;
    }
    if (k.c === 'A') {
      for (const [x, y] of arcPoints(cx, cy, v)) add(x, y);
    } else if (k.c === 'C' || k.c === 'Q' || k.c === 'S') {
      // sampled: a cubic through its controls (S and Q approximated as cubics)
      const [p1x, p1y, p2x, p2y] = k.c === 'C' ? [v[0]!, v[1]!, v[2]!, v[3]!] : k.c === 'S' ? [cx, cy, v[0]!, v[1]!] : [v[0]!, v[1]!, v[0]!, v[1]!];
      const [ex, ey] = [v[v.length - 2]!, v[v.length - 1]!];
      for (let i = 1; i <= 16; i += 1) {
        const t = i / 16;
        const u = 1 - t;
        add(u * u * u * cx + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * ex, u * u * u * cy + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * ey);
      }
    } else {
      add(v[0]!, v[1]!);
    }
    if (k.c === 'M') {
      sx = v[0]!;
      sy = v[1]!;
      add(sx, sy);
    }
    cx = v[v.length - 2]!;
    cy = v[v.length - 1]!;
  }
  return { x0, y0, x1, y1 };
}

// ---------------------------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------------------------

export function hex(n: number): string {
  return `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** Mixes a colour toward white (t > 0) or black (t < 0). */
export function shade(n: number, t: number): number {
  const ch = (v: number) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t));
  return (ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255);
}

export interface Paints {
  team: number;
}

export function resolvePaint(p: Paint | undefined, o: Paints): string | null {
  if (p === undefined || p === 'none') return null;
  if (p === 'team') return hex(o.team);
  if (p === 'teamDark') return hex(shade(o.team, -0.35));
  if (p === 'teamLight') return hex(shade(o.team, 0.35));
  return p;
}

// ---------------------------------------------------------------------------------------------
// The art sheet's ramps (AUDIT §3.1; the same numbers as the UI's `tone.ts` and the avatar's
// `color.ts`, so the lane bakes and the UI drawings read as one family)
// ---------------------------------------------------------------------------------------------

type Rgb = [number, number, number];

function parseHex(h: string): Rgb {
  let s = h.replace('#', '');
  if (s.length === 3) s = s.replace(/./g, (ch) => ch + ch);
  const n = parseInt(s.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(c: Rgb): string {
  return `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

function toHsv([r, g, b]: Rgb): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function fromHsv(h: number, s: number, v: number): Rgb {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Mixes two hex colours (t = 0 → a, 1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const A = parseHex(a);
  const B = parseHex(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** The value (HSV, 0..1) of a hex colour. */
export function hexValue(h: string): number {
  return toHsv(parseHex(h))[2];
}

export interface CelRamp {
  fill: string;
  shadow: string;
  light: string;
  line: string;
  inner: string;
}

const SHADOW_K: Record<CelMaterial, number> = { matte: 0.74, cloth: 0.72, metal: 0.65, gold: 0.65, bronze: 0.62, gloss: 0.7 };
const LIGHT_T: Record<CelMaterial, number> = { matte: 0.32, cloth: 0.28, metal: 0.6, gold: 0.6, bronze: 0.6, gloss: 0.6 };
const rampCache = new Map<string, CelRamp>();

/**
 * The ramp of one fill (AUDIT §3.1): shadow × 0.74 matte, × 0.65 metal and gold, × 0.62 polished
 * bronze, warm fills (hue 15-75°) shifted 8° toward red; highlight 32% toward white (60% for gloss and
 * metal, toward warm `#FFF3D6` for gold and bronze); outline fill × 0.40 with value ≤ 0.38; interior
 * lines fill × 0.60.
 */
export function celRamp(fill: string, mat: CelMaterial = 'matte'): CelRamp {
  const key = `${fill}|${mat}`;
  const hit = rampCache.get(key);
  if (hit) return hit;
  const [h, s, v] = toHsv(parseHex(fill));
  const shift = s > 0.12 && h >= 15 && h <= 75 ? -8 : 0;
  const hh = (h + shift + 360) % 360;
  const shadow = toHex(fromHsv(hh, Math.min(1, s * (mat === 'gold' || mat === 'bronze' ? 1.1 : 1)), Math.min(1, v * SHADOW_K[mat])));
  const light = mixHex(fill, mat === 'gold' || mat === 'bronze' ? '#fff3d6' : '#ffffff', LIGHT_T[mat]);
  const line = toHex(fromHsv(hh, Math.min(1, s * 1.15 + 0.08), Math.min(0.38, v * 0.4)));
  const inner = toHex(fromHsv(hh, Math.min(1, s * 1.1), v * 0.6));
  const r = { fill, shadow, light, line, inner };
  if (rampCache.size > 400) rampCache.clear();
  rampCache.set(key, r);
  return r;
}

/** The outline colour of a fill: fill × 0.40, value ≤ 0.38, never black (AUDIT §3.1). */
export function rim(fill: string): string {
  return celRamp(fill).line;
}

// ---------------------------------------------------------------------------------------------
// Output: SVG
// ---------------------------------------------------------------------------------------------

/** Ids for the clip paths and gradients the cel parts and glows write (unique within any one SVG). */
let svgIds = 0;
const nextSvgId = (p: string): string => `${p}${(svgIds = (svgIds + 1) % 1e7).toString(36)}`;

/** The outline colour of a cel part. */
function celLine(s: CelShape, r: CelRamp, o: Paints): string {
  if (!s.lc || s.lc === 'line') return r.line;
  if (s.lc === 'inner') return r.inner;
  return resolvePaint(s.lc, o) ?? r.line;
}

/**
 * A cel part as SVG: `<g data-part>` holding the fill, a clip group with at most one highlight and one
 * shadow band, and the outline (the tone test reads this structure).
 */
function celSvg(s: CelShape, o: Paints): string {
  const fill = resolvePaint(s.cel, o) ?? '#ffffff';
  const r = celRamp(fill, s.mat ?? 'matte');
  const ln = s.ln ?? 1.2;
  const outline = ln > 0 ? `<path d="${s.d}" fill="none" stroke="${celLine(s, r, o)}" stroke-width="${f(ln)}" stroke-linejoin="round" stroke-linecap="round" data-outline=""/>` : '';
  const sh = s.sh ?? 0;
  const shx = s.shx ?? 0;
  const hl = s.hl ?? 0;
  if (sh <= 0 && shx <= 0 && hl <= 0) return `<g data-part="" data-fill="${fill}"><path d="${s.d}" fill="${fill}"/>${outline}</g>`;
  const id = nextSvgId('k');
  let inner = '';
  if (hl > 0) inner += `<path d="${s.d}${movePath(s.d, hl * 0.5, hl)}" fill-rule="evenodd" fill="${r.light}" data-hl=""/>`;
  if (sh > 0 || shx > 0) inner += `<path d="${s.d}${movePath(s.d, -shx, -sh)}" fill-rule="evenodd" fill="${r.shadow}" data-sh=""/>`;
  return `<g data-part="" data-fill="${fill}"><clipPath id="${id}"><path d="${s.d}"/></clipPath><path d="${s.d}" fill="${fill}"/><g clip-path="url(#${id})">${inner}</g>${outline}</g>`;
}

function svgShape(s: Shape, o: Paints, low: boolean): string {
  if ('clip' in s) {
    const [x, y, w, h] = s.clip;
    return `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}" overflow="hidden">${s.shapes.map((c) => svgShape(c, o, low)).join('')}</svg>`;
  }
  if ('glow' in s) {
    const id = nextSvgId('g');
    const c = resolvePaint(s.color, o) ?? '#ffffff';
    const [cx, cy, r] = s.glow;
    return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${c}" stop-opacity="${f(s.alpha ?? 0.8)}"/><stop offset="0.55" stop-color="${c}" stop-opacity="${f((s.alpha ?? 0.8) * 0.4)}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="url(#${id})"/>`;
  }
  if (low && s.lo) return '';
  if ('cel' in s) return celSvg(s, o);
  const fill = resolvePaint(s.fill, o);
  const stroke = resolvePaint(s.stroke, o);
  const cap = s.cap ?? 'round';
  const attrs = [
    `d="${s.d}"`,
    `fill="${fill ?? 'none'}"`,
    s.evenodd ? 'fill-rule="evenodd"' : '',
    stroke ? `stroke="${stroke}" stroke-width="${f(s.width ?? 1)}" stroke-linecap="${cap}" stroke-linejoin="round"` : '',
    stroke && s.dash ? `stroke-dasharray="${s.dash.map(f).join(' ')}"` : '',
    s.alpha !== undefined ? `opacity="${f(s.alpha)}"` : '',
  ];
  return `<path ${attrs.filter(Boolean).join(' ')}/>`;
}

export function shapesToSvg(shapes: readonly Shape[], o: Paints, opts: DrawOptions = {}): string {
  return shapes.map((s) => svgShape(s, o, !!opts.low)).join('');
}

// ---------------------------------------------------------------------------------------------
// Output: canvas
// ---------------------------------------------------------------------------------------------

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** A cel part on a canvas: the same cut as {@link celSvg}. */
function drawCel(ctx: Ctx2D, s: CelShape, o: Paints): void {
  const fill = resolvePaint(s.cel, o) ?? '#ffffff';
  const r = celRamp(fill, s.mat ?? 'matte');
  const p = new Path2D(s.d);
  ctx.fillStyle = fill;
  ctx.fill(p);
  const sh = s.sh ?? 0;
  const shx = s.shx ?? 0;
  const hl = s.hl ?? 0;
  if (sh > 0 || shx > 0 || hl > 0) {
    ctx.save();
    ctx.clip(p);
    if (hl > 0) {
      ctx.fillStyle = r.light;
      ctx.fill(new Path2D(s.d + movePath(s.d, hl * 0.5, hl)), 'evenodd');
    }
    if (sh > 0 || shx > 0) {
      ctx.fillStyle = r.shadow;
      ctx.fill(new Path2D(s.d + movePath(s.d, -shx, -sh)), 'evenodd');
    }
    ctx.restore();
  }
  const ln = s.ln ?? 1.2;
  if (ln > 0) {
    ctx.strokeStyle = celLine(s, r, o);
    ctx.lineWidth = ln;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(p);
  }
}

/** Draws shapes in view-box units; the caller sets the transform (scale, offset). */
export function drawShapes(ctx: Ctx2D, shapes: readonly Shape[], o: Paints, opts: DrawOptions = {}): void {
  for (const s of shapes) {
    if ('clip' in s) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.clip[0], s.clip[1], s.clip[2], s.clip[3]);
      ctx.clip();
      drawShapes(ctx, s.shapes, o, opts);
      ctx.restore();
      continue;
    }
    if ('glow' in s) {
      const [cx, cy, r] = s.glow;
      const c = resolvePaint(s.color, o) ?? '#ffffff';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = s.alpha ?? 0.8;
      const [cr, cg, cb] = parseHex(c);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${a * 0.4})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (opts.low && s.lo) continue;
    if ('cel' in s) {
      drawCel(ctx, s, o);
      continue;
    }
    const p = new Path2D(s.d);
    const fill = resolvePaint(s.fill, o);
    const stroke = resolvePaint(s.stroke, o);
    ctx.globalAlpha = s.alpha ?? 1;
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(p, s.evenodd ? 'evenodd' : 'nonzero');
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = s.width ?? 1;
      ctx.lineCap = s.cap ?? 'round';
      ctx.lineJoin = 'round';
      if (s.dash) ctx.setLineDash([...s.dash]);
      ctx.stroke(p);
      if (s.dash) ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
}
