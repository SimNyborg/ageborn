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
}

/** A clipped group (a canton, a nested panel). */
export interface GroupShape {
  clip: [number, number, number, number];
  shapes: Shape[];
}

export type Shape = PathShape | GroupShape;

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
// Output: SVG
// ---------------------------------------------------------------------------------------------

function svgShape(s: Shape, o: Paints): string {
  if ('clip' in s) {
    const [x, y, w, h] = s.clip;
    return `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}" overflow="hidden">${s.shapes.map((c) => svgShape(c, o)).join('')}</svg>`;
  }
  const fill = resolvePaint(s.fill, o);
  const stroke = resolvePaint(s.stroke, o);
  const cap = s.cap ?? 'round';
  const attrs = [
    `d="${s.d}"`,
    `fill="${fill ?? 'none'}"`,
    stroke ? `stroke="${stroke}" stroke-width="${f(s.width ?? 1)}" stroke-linecap="${cap}" stroke-linejoin="round"` : '',
    s.alpha !== undefined ? `opacity="${f(s.alpha)}"` : '',
  ];
  return `<path ${attrs.filter(Boolean).join(' ')}/>`;
}

export function shapesToSvg(shapes: readonly Shape[], o: Paints): string {
  return shapes.map((s) => svgShape(s, o)).join('');
}

// ---------------------------------------------------------------------------------------------
// Output: canvas
// ---------------------------------------------------------------------------------------------

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Draws shapes in view-box units; the caller sets the transform (scale, offset). */
export function drawShapes(ctx: Ctx2D, shapes: readonly Shape[], o: Paints): void {
  for (const s of shapes) {
    if ('clip' in s) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.clip[0], s.clip[1], s.clip[2], s.clip[3]);
      ctx.clip();
      drawShapes(ctx, s.shapes, o);
      ctx.restore();
      continue;
    }
    const p = new Path2D(s.d);
    const fill = resolvePaint(s.fill, o);
    const stroke = resolvePaint(s.stroke, o);
    ctx.globalAlpha = s.alpha ?? 1;
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(p);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = s.width ?? 1;
      ctx.lineCap = s.cap ?? 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(p);
    }
    ctx.globalAlpha = 1;
  }
}
