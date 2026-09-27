/**
 * SVG path data: the source format for every procedural part (DESIGN B5). Parts are authored in lu
 * with the pivot at (0, 0), +x = the facing direction, +y = down.
 *
 * Authoring subset: M L H V C S Q T Z (absolute and relative). Arcs (A) are not supported; use the
 * shape helpers below, which emit cubic Beziers. Every subpath is a closed fill; overlapping subpaths
 * use the SVG nonzero rule, so helpers keep one winding direction (shapes union, never cut holes).
 *
 * The same data feeds the canvas bake, the handoff SVG sheets and the Node rasteriser used by the
 * silhouette and colour-rule tests, so all three agree.
 */

export type PathCmd =
  | { c: 'M'; x: number; y: number }
  | { c: 'L'; x: number; y: number }
  | { c: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: 'Q'; x1: number; y1: number; x: number; y: number }
  | { c: 'Z' };

export interface Pt {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 2D affine matrix in canvas order: x' = a x + c y + e, y' = b x + d y + f. */
export type Mat = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export function matMul(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/** translate(x, y) · rotate(deg) · scale(sx, sy). */
export function matCompose(x: number, y: number, deg: number, sx = 1, sy = 1): Mat {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [cos * sx, sin * sx, -sin * sy, cos * sy, x, y];
}

export function matApply(m: Mat, x: number, y: number): Pt {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] };
}

export function matInvert(m: Mat): Mat {
  const det = m[0] * m[3] - m[1] * m[2];
  if (det === 0) return IDENTITY;
  const a = m[3] / det;
  const b = -m[1] / det;
  const c = -m[2] / det;
  const d = m[0] / det;
  return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
}

// ---------------------------------------------------------------------------------------------
// Parsing

const cache = new Map<string, readonly PathCmd[]>();

/** Parses SVG path data into absolute commands (cached). Throws on unsupported commands. */
export function parsePath(d: string): readonly PathCmd[] {
  const hit = cache.get(d);
  if (hit) return hit;
  const out = parseUncached(d);
  cache.set(d, out);
  return out;
}

function parseUncached(d: string): PathCmd[] {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const out: PathCmd[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  // last control point for S / T reflection
  let lcx = 0;
  let lcy = 0;
  let lastKind: 'C' | 'Q' | '' = '';
  const num = (): number => {
    const t = tokens[i++];
    if (t === undefined || /[a-zA-Z]/.test(t)) throw new Error(`Bad path data near token ${i}: "${d.slice(0, 60)}"`);
    return parseFloat(t);
  };
  while (i < tokens.length) {
    const t = tokens[i];
    if (t !== undefined && /[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        out.push({ c: 'Z' });
        cx = sx;
        cy = sy;
        lastKind = '';
        continue;
      }
    } else if (cmd === '') {
      throw new Error(`Path must start with a command: "${d.slice(0, 60)}"`);
    }
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? cx : 0;
    const oy = rel ? cy : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        cx = ox + num();
        cy = oy + num();
        sx = cx;
        sy = cy;
        out.push({ c: 'M', x: cx, y: cy });
        cmd = rel ? 'l' : 'L'; // implicit lineto after moveto
        lastKind = '';
        break;
      }
      case 'L': {
        cx = ox + num();
        cy = oy + num();
        out.push({ c: 'L', x: cx, y: cy });
        lastKind = '';
        break;
      }
      case 'H': {
        cx = (rel ? cx : 0) + num();
        out.push({ c: 'L', x: cx, y: cy });
        lastKind = '';
        break;
      }
      case 'V': {
        cy = (rel ? cy : 0) + num();
        out.push({ c: 'L', x: cx, y: cy });
        lastKind = '';
        break;
      }
      case 'C': {
        const x1 = ox + num();
        const y1 = oy + num();
        const x2 = ox + num();
        const y2 = oy + num();
        cx = ox + num();
        cy = oy + num();
        out.push({ c: 'C', x1, y1, x2, y2, x: cx, y: cy });
        lcx = x2;
        lcy = y2;
        lastKind = 'C';
        break;
      }
      case 'S': {
        const x1 = lastKind === 'C' ? 2 * cx - lcx : cx;
        const y1 = lastKind === 'C' ? 2 * cy - lcy : cy;
        const x2 = ox + num();
        const y2 = oy + num();
        cx = ox + num();
        cy = oy + num();
        out.push({ c: 'C', x1, y1, x2, y2, x: cx, y: cy });
        lcx = x2;
        lcy = y2;
        lastKind = 'C';
        break;
      }
      case 'Q': {
        const x1 = ox + num();
        const y1 = oy + num();
        cx = ox + num();
        cy = oy + num();
        out.push({ c: 'Q', x1, y1, x: cx, y: cy });
        lcx = x1;
        lcy = y1;
        lastKind = 'Q';
        break;
      }
      case 'T': {
        const x1 = lastKind === 'Q' ? 2 * cx - lcx : cx;
        const y1 = lastKind === 'Q' ? 2 * cy - lcy : cy;
        cx = ox + num();
        cy = oy + num();
        out.push({ c: 'Q', x1, y1, x: cx, y: cy });
        lcx = x1;
        lcy = y1;
        lastKind = 'Q';
        break;
      }
      default:
        throw new Error(`Unsupported path command "${cmd}" (use M L H V C S Q T Z): "${d.slice(0, 60)}"`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Serialising and transforming

export function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

export function pathToString(cmds: readonly PathCmd[]): string {
  const parts: string[] = [];
  for (const k of cmds) {
    switch (k.c) {
      case 'M':
      case 'L':
        parts.push(`${k.c}${fmt(k.x)} ${fmt(k.y)}`);
        break;
      case 'C':
        parts.push(`C${fmt(k.x1)} ${fmt(k.y1)} ${fmt(k.x2)} ${fmt(k.y2)} ${fmt(k.x)} ${fmt(k.y)}`);
        break;
      case 'Q':
        parts.push(`Q${fmt(k.x1)} ${fmt(k.y1)} ${fmt(k.x)} ${fmt(k.y)}`);
        break;
      case 'Z':
        parts.push('Z');
        break;
    }
  }
  return parts.join('');
}

export function transformCmds(cmds: readonly PathCmd[], m: Mat): PathCmd[] {
  return cmds.map((k): PathCmd => {
    switch (k.c) {
      case 'M':
      case 'L': {
        const p = matApply(m, k.x, k.y);
        return { c: k.c, x: p.x, y: p.y };
      }
      case 'C': {
        const p1 = matApply(m, k.x1, k.y1);
        const p2 = matApply(m, k.x2, k.y2);
        const p = matApply(m, k.x, k.y);
        return { c: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y };
      }
      case 'Q': {
        const p1 = matApply(m, k.x1, k.y1);
        const p = matApply(m, k.x, k.y);
        return { c: 'Q', x1: p1.x, y1: p1.y, x: p.x, y: p.y };
      }
      case 'Z':
        return k;
    }
  });
}

/** Applies an affine transform to path data and returns new path data. */
export function transformPath(d: string, m: Mat): string {
  return pathToString(transformCmds(parsePath(d), m));
}

export const move = (d: string, dx: number, dy: number): string => transformPath(d, [1, 0, 0, 1, dx, dy]);
export const rotate = (d: string, deg: number, cx = 0, cy = 0): string =>
  transformPath(d, matMul(matCompose(cx, cy, deg), [1, 0, 0, 1, -cx, -cy]));
export const scale = (d: string, sx: number, sy = sx, cx = 0, cy = 0): string =>
  transformPath(d, [sx, 0, 0, sy, cx - cx * sx, cy - cy * sy]);
/**
 * Mirror across the vertical line x = cx. Mirroring reverses the winding, so the result is also
 * reversed to keep every shape counter-clockwise-consistent under the nonzero rule.
 */
export const mirrorX = (d: string, cx = 0): string => reversePath(transformPath(d, [-1, 0, 0, 1, 2 * cx, 0]));

/** Reverses the direction of every subpath (keeps shapes identical, flips the winding). */
export function reversePath(d: string): string {
  const subs = splitSubpaths(parsePath(d));
  const out: PathCmd[] = [];
  for (const sub of subs) {
    if (sub.length === 0) continue;
    const first = sub[0];
    if (!first || first.c !== 'M') continue;
    // collect segments with start points
    const segs: { from: Pt; cmd: PathCmd }[] = [];
    let cur: Pt = { x: first.x, y: first.y };
    let closed = false;
    for (let i = 1; i < sub.length; i++) {
      const k = sub[i];
      if (!k) continue;
      if (k.c === 'Z') {
        closed = true;
        if (cur.x !== first.x || cur.y !== first.y) segs.push({ from: cur, cmd: { c: 'L', x: first.x, y: first.y } });
        cur = { x: first.x, y: first.y };
        continue;
      }
      if (k.c === 'M') continue;
      segs.push({ from: cur, cmd: k });
      cur = { x: k.x, y: k.y };
    }
    out.push({ c: 'M', x: cur.x, y: cur.y });
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      if (!s) continue;
      const k = s.cmd;
      if (k.c === 'L') out.push({ c: 'L', x: s.from.x, y: s.from.y });
      else if (k.c === 'C') out.push({ c: 'C', x1: k.x2, y1: k.y2, x2: k.x1, y2: k.y1, x: s.from.x, y: s.from.y });
      else if (k.c === 'Q') out.push({ c: 'Q', x1: k.x1, y1: k.y1, x: s.from.x, y: s.from.y });
    }
    if (closed) out.push({ c: 'Z' });
  }
  return pathToString(out);
}

export function splitSubpaths(cmds: readonly PathCmd[]): PathCmd[][] {
  const subs: PathCmd[][] = [];
  let cur: PathCmd[] | null = null;
  for (const k of cmds) {
    if (k.c === 'M') {
      cur = [k];
      subs.push(cur);
    } else if (cur) {
      cur.push(k);
    }
  }
  return subs;
}

/** Concatenates path data strings (the subpaths union under the nonzero rule). */
export function join(...ds: (string | false | null | undefined)[]): string {
  return ds.filter((d): d is string => typeof d === 'string' && d.length > 0).join(' ');
}

// ---------------------------------------------------------------------------------------------
// Flattening and bounds

/** A flattened closed polygon (every subpath is treated as closed for filling). */
export type Poly = Pt[];

/**
 * Flattens path commands into polygons. `tol` is the target segment length in the output space;
 * curves get between 4 and 48 segments.
 */
export function flatten(cmds: readonly PathCmd[], m: Mat = IDENTITY, tol = 1): Poly[] {
  const polys: Poly[] = [];
  let cur: Poly | null = null;
  let px = 0;
  let py = 0;
  let sx = 0;
  let sy = 0;
  const push = (x: number, y: number): void => {
    const p = matApply(m, x, y);
    cur?.push(p);
  };
  const segCount = (len: number): number => Math.max(4, Math.min(48, Math.ceil(len / Math.max(0.05, tol))));
  const scaleFactor = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
  for (const k of cmds) {
    switch (k.c) {
      case 'M':
        cur = [];
        polys.push(cur);
        px = sx = k.x;
        py = sy = k.y;
        push(px, py);
        break;
      case 'L':
        push(k.x, k.y);
        px = k.x;
        py = k.y;
        break;
      case 'C': {
        const len =
          (Math.hypot(k.x1 - px, k.y1 - py) + Math.hypot(k.x2 - k.x1, k.y2 - k.y1) + Math.hypot(k.x - k.x2, k.y - k.y2)) *
          scaleFactor;
        const n = segCount(len);
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const u = 1 - t;
          const x = u * u * u * px + 3 * u * u * t * k.x1 + 3 * u * t * t * k.x2 + t * t * t * k.x;
          const y = u * u * u * py + 3 * u * u * t * k.y1 + 3 * u * t * t * k.y2 + t * t * t * k.y;
          push(x, y);
        }
        px = k.x;
        py = k.y;
        break;
      }
      case 'Q': {
        const len = (Math.hypot(k.x1 - px, k.y1 - py) + Math.hypot(k.x - k.x1, k.y - k.y1)) * scaleFactor;
        const n = segCount(len);
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const u = 1 - t;
          push(u * u * px + 2 * u * t * k.x1 + t * t * k.x, u * u * py + 2 * u * t * k.y1 + t * t * k.y);
        }
        px = k.x;
        py = k.y;
        break;
      }
      case 'Z':
        px = sx;
        py = sy;
        break;
    }
  }
  return polys.filter((p) => p.length >= 2);
}

export function polysBounds(polys: readonly Poly[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polys) {
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

const boundsCache = new Map<string, Bounds>();

/** Bounds of path data in its own space (cached). */
export function pathBounds(d: string): Bounds {
  const hit = boundsCache.get(d);
  if (hit) return hit;
  const b = polysBounds(flatten(parsePath(d), IDENTITY, 0.5));
  boundsCache.set(d, b);
  return b;
}

export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export const EMPTY_BOUNDS: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

// ---------------------------------------------------------------------------------------------
// Shape helpers (all emit one consistent winding: positive signed area in y-down space, which is
// clockwise on screen)

const K = 0.5522847498;

/** Circle as four cubic arcs. */
export function circle(cx: number, cy: number, r: number): string {
  return ellipse(cx, cy, r, r);
}

export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  const kx = rx * K;
  const ky = ry * K;
  return (
    `M${fmt(cx + rx)} ${fmt(cy)}` +
    `C${fmt(cx + rx)} ${fmt(cy + ky)} ${fmt(cx + kx)} ${fmt(cy + ry)} ${fmt(cx)} ${fmt(cy + ry)}` +
    `C${fmt(cx - kx)} ${fmt(cy + ry)} ${fmt(cx - rx)} ${fmt(cy + ky)} ${fmt(cx - rx)} ${fmt(cy)}` +
    `C${fmt(cx - rx)} ${fmt(cy - ky)} ${fmt(cx - kx)} ${fmt(cy - ry)} ${fmt(cx)} ${fmt(cy - ry)}` +
    `C${fmt(cx + kx)} ${fmt(cy - ry)} ${fmt(cx + rx)} ${fmt(cy - ky)} ${fmt(cx + rx)} ${fmt(cy)}Z`
  );
}

/** Axis-aligned rectangle. */
export function rect(x: number, y: number, w: number, h: number): string {
  return `M${fmt(x)} ${fmt(y)}L${fmt(x + w)} ${fmt(y)}L${fmt(x + w)} ${fmt(y + h)}L${fmt(x)} ${fmt(y + h)}Z`;
}

/** Rounded rectangle; `r` is clamped to half the short side. */
export function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rr === 0) return rect(x, y, w, h);
  const k = rr * K;
  const x2 = x + w;
  const y2 = y + h;
  return normalizeWinding(
    `M${fmt(x + rr)} ${fmt(y)}` +
    `C${fmt(x + rr - k)} ${fmt(y)} ${fmt(x)} ${fmt(y + rr - k)} ${fmt(x)} ${fmt(y + rr)}` +
    `L${fmt(x)} ${fmt(y2 - rr)}` +
    `C${fmt(x)} ${fmt(y2 - rr + k)} ${fmt(x + rr - k)} ${fmt(y2)} ${fmt(x + rr)} ${fmt(y2)}` +
    `L${fmt(x2 - rr)} ${fmt(y2)}` +
    `C${fmt(x2 - rr + k)} ${fmt(y2)} ${fmt(x2)} ${fmt(y2 - rr + k)} ${fmt(x2)} ${fmt(y2 - rr)}` +
    `L${fmt(x2)} ${fmt(y + rr)}` +
    `C${fmt(x2)} ${fmt(y + rr - k)} ${fmt(x2 - rr + k)} ${fmt(y)} ${fmt(x2 - rr)} ${fmt(y)}Z`
  );
}

/** Signed area of a polygon given as flat [x0, y0, x1, y1, ...] (screen space, y down). */
function signedArea(pts: readonly number[]): number {
  let a = 0;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += (pts[2 * i] ?? 0) * (pts[2 * j + 1] ?? 0) - (pts[2 * j] ?? 0) * (pts[2 * i + 1] ?? 0);
  }
  return a / 2;
}

/** Returns the point list in the helpers' winding (positive signed area in y-down space). */
function orient(pts: readonly number[]): number[] {
  if (signedArea(pts) >= 0) return [...pts];
  const out: number[] = [];
  for (let i = pts.length - 2; i >= 0; i -= 2) out.push(pts[i] ?? 0, pts[i + 1] ?? 0);
  return out;
}

/** Straight-edged closed polygon from flat [x0, y0, x1, y1, ...]. */
export function poly(pts: readonly number[]): string {
  const p = orient(pts);
  let d = `M${fmt(p[0] ?? 0)} ${fmt(p[1] ?? 0)}`;
  for (let i = 2; i < p.length; i += 2) d += `L${fmt(p[i] ?? 0)} ${fmt(p[i + 1] ?? 0)}`;
  return d + 'Z';
}

/**
 * Smooth closed shape through the points (Catmull-Rom converted to cubic Beziers). `tension` 1 is
 * a standard Catmull-Rom; lower values give tighter corners. The workhorse for organic parts.
 */
export function blob(pts: readonly number[], tension = 1): string {
  const p = orient(pts);
  const n = p.length / 2;
  if (n < 3) return poly(p);
  const X = (i: number): number => p[2 * (((i % n) + n) % n)] ?? 0;
  const Y = (i: number): number => p[2 * (((i % n) + n) % n) + 1] ?? 0;
  let d = `M${fmt(X(0))} ${fmt(Y(0))}`;
  const t = tension / 6;
  for (let i = 0; i < n; i++) {
    const c1x = X(i) + (X(i + 1) - X(i - 1)) * t;
    const c1y = Y(i) + (Y(i + 1) - Y(i - 1)) * t;
    const c2x = X(i + 1) - (X(i + 2) - X(i)) * t;
    const c2y = Y(i + 1) - (Y(i + 2) - Y(i)) * t;
    d += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(X(i + 1))} ${fmt(Y(i + 1))}`;
  }
  return d + 'Z';
}

/** Cubic segments approximating a circular arc from angle a0 to a1 (degrees, y-down screen space). */
function arcSegments(cx: number, cy: number, r: number, a0: number, a1: number): string {
  let d = '';
  const total = a1 - a0;
  const n = Math.max(1, Math.ceil(Math.abs(total) / 90));
  const step = total / n;
  for (let i = 0; i < n; i++) {
    const s = ((a0 + step * i) * Math.PI) / 180;
    const e = ((a0 + step * (i + 1)) * Math.PI) / 180;
    const k = (4 / 3) * Math.tan((e - s) / 4) * r;
    const x0 = cx + r * Math.cos(s);
    const y0 = cy + r * Math.sin(s);
    const x3 = cx + r * Math.cos(e);
    const y3 = cy + r * Math.sin(e);
    const x1 = x0 - k * Math.sin(s);
    const y1 = y0 + k * Math.cos(s);
    const x2 = x3 + k * Math.sin(e);
    const y2 = y3 - k * Math.cos(e);
    d += `C${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} ${fmt(x3)} ${fmt(y3)}`;
  }
  return d;
}

/**
 * Tapered capsule between two circles (the hull of both): limbs, horns, weapons, tusks.
 * Falls back to the larger circle when one circle contains the other.
 */
export function limb(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  if (L <= Math.abs(r1 - r2) + 1e-6) return r1 >= r2 ? circle(x1, y1, r1) : circle(x2, y2, r2);
  const base = (Math.atan2(dy, dx) * 180) / Math.PI;
  const s = (r1 - r2) / L;
  const phi = (Math.acos(Math.max(-1, Math.min(1, s))) * 180) / Math.PI; // angle from axis to tangent normal
  // Tangent normals at base ± phi. Walk: circle 2 from (base - phi) to (base + phi) through the far side,
  // then circle 1 from (base + phi) to (base + 360 - phi) around the back.
  const aStart = base - phi;
  const p1 = { x: x1 + r1 * Math.cos((aStart * Math.PI) / 180), y: y1 + r1 * Math.sin((aStart * Math.PI) / 180) };
  const p2 = { x: x2 + r2 * Math.cos((aStart * Math.PI) / 180), y: y2 + r2 * Math.sin((aStart * Math.PI) / 180) };
  let d = `M${fmt(p1.x)} ${fmt(p1.y)}L${fmt(p2.x)} ${fmt(p2.y)}`;
  d += arcSegments(x2, y2, r2, base - phi, base + phi);
  const q1 = { x: x1 + r1 * Math.cos(((base + phi) * Math.PI) / 180), y: y1 + r1 * Math.sin(((base + phi) * Math.PI) / 180) };
  d += `L${fmt(q1.x)} ${fmt(q1.y)}`;
  d += arcSegments(x1, y1, r1, base + phi, base + 360 - phi);
  return normalizeWinding(d + 'Z');
}

/** Pie slice / wedge from angle a0 to a1 (degrees, y-down). */
export function wedge(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const s = (a0 * Math.PI) / 180;
  return normalizeWinding(`M${fmt(cx)} ${fmt(cy)}L${fmt(cx + r * Math.cos(s))} ${fmt(cy + r * Math.sin(s))}${arcSegments(cx, cy, r, a0, a1)}Z`);
}

/** Ring segment (thick arc) between radii r0 < r1 from a0 to a1 degrees. */
export function arcBand(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const s = (a0 * Math.PI) / 180;
  const e = (a1 * Math.PI) / 180;
  let d = `M${fmt(cx + r1 * Math.cos(s))} ${fmt(cy + r1 * Math.sin(s))}`;
  d += arcSegments(cx, cy, r1, a0, a1);
  d += `L${fmt(cx + r0 * Math.cos(e))} ${fmt(cy + r0 * Math.sin(e))}`;
  d += arcSegments(cx, cy, r0, a1, a0);
  return normalizeWinding(d + 'Z');
}

/** Star with `n` points between radii r0 (inner) and r1 (outer), smooth when `round` > 0. */
export function star(cx: number, cy: number, n: number, r0: number, r1: number, rotDeg = -90): string {
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rotDeg + (i * 180) / n) * Math.PI) / 180;
    const r = i % 2 === 0 ? r1 : r0;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return poly(pts);
}

/** Regular polygon with `n` sides. */
export function ngon(cx: number, cy: number, n: number, r: number, rotDeg = -90): string {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rotDeg + (i * 360) / n) * Math.PI) / 180;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return poly(pts);
}

/** Signed area of flattened path data (positive = the helpers' winding in y-down space). */
export function pathSignedArea(d: string): number {
  let a = 0;
  for (const p of flatten(parsePath(d), IDENTITY, 0.5)) {
    for (let i = 0; i < p.length; i++) {
      const u = p[i];
      const v = p[(i + 1) % p.length];
      if (u && v) a += u.x * v.y - v.x * u.y;
    }
  }
  return a / 2;
}

/** Makes every subpath use the helpers' winding (so unions never cut holes). */
export function normalizeWinding(d: string): string {
  const subs = splitSubpaths(parsePath(d));
  const out: string[] = [];
  for (const sub of subs) {
    const s = pathToString(sub);
    out.push(pathSignedArea(s) < 0 ? reversePath(s) : s);
  }
  return out.join('');
}
