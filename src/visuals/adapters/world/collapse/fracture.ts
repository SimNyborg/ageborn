/**
 * Seeded fracture of a base frame into chunks (DESIGN A11 destroyed collapse). Pure and deterministic:
 * the same rect, mask, profile and seed always give the same chunks, so a replay collapses the same way.
 *
 * - Sites are dart-thrown inside the opaque art (a Poisson-disc spread, denser above the stump line),
 *   with an anisotropic metric so masonry breaks into wide blocks and spires into tall shards.
 * - Cells are the Voronoi cells of the sites, cut by half-plane clipping that remembers which neighbour
 *   made each edge, so every shared edge can be jittered identically from both sides (a zig-zag crack
 *   with no gaps).
 * - Each cell gets its centre of mass and area from the art's alpha mask, and a kind: the stump that
 *   stays standing as the ruin, a piece that topples with a tower, a free piece, or empty.
 * - The cracks between cells are listed with reveal times, so the build-up can draw them spreading
 *   from the top before the base gives way along exactly those lines.
 *
 * Coordinates: base-local lu, unmirrored, y DOWN (the ground is y = 0, the top about -300).
 */
import { mulberry32, xmur3 } from '@/core/rng';
import type { ToppleSpec } from './profiles';

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Occupancy of the base art at a point (lu, local, y down): 0 transparent, 1 opaque. */
export type Mask = (x: number, y: number) => number;

export interface FractureOptions {
  /** The frame's rect (lu, local, y down). */
  rect: Rect;
  /** Alpha occupancy; null treats the whole rect as opaque (tests, headless). */
  mask?: Mask | null;
  seed: number;
  /** Cells above the stump line. */
  cells: number;
  /** Cells whose centre stands lower than this (lu above the ground) form the stump. */
  stumpLu: number;
  aspect: number;
  topple: readonly ToppleSpec[];
  /** Where the cracks spread from (lu); default the upper middle of the rect. */
  origin?: Vec;
}

export type CellKind = 'stump' | 'free' | 'topple' | 'empty';

export interface Cell {
  id: number;
  /** Outline (lu), jittered along shared edges. */
  poly: Vec[];
  /** Centre of mass of the opaque part (lu). */
  cx: number;
  cy: number;
  /** Opaque area (lu²). */
  area: number;
  /** Farthest outline point from the centre (lu). */
  radius: number;
  kind: CellKind;
  /** Topple group index, or -1. */
  group: number;
  neighbors: number[];
}

/** A crack between two cells, revealed over t0..t1 of the build-up (0..1). */
export interface Crack {
  a: number;
  b: number;
  pts: Vec[];
  t0: number;
  t1: number;
  /** On the main break line (stump top, a toppling part's foot): drawn earlier and bolder. */
  main: boolean;
}

export interface ToppleGroup {
  index: number;
  hinge: Vec;
  dir: 1 | -1;
  delayMs: number;
  push: number;
  sinkLu: number;
  cells: number[];
  /** Centre of mass (lu). */
  cx: number;
  cy: number;
}

export interface Fracture {
  rect: Rect;
  cells: Cell[];
  cracks: Crack[];
  groups: ToppleGroup[];
}

const EPS = 1e-7;

/** A seed word from parts (xmur3 of their joined string). */
export function seedOf(...parts: (string | number)[]): number {
  return xmur3(parts.join('|'))();
}

// ---------------------------------------------------------------------------------------------
// Geometry

export function polyArea(p: readonly Vec[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const u = p[i]!;
    const v = p[(i + 1) % p.length]!;
    a += u.x * v.y - v.x * u.y;
  }
  return a / 2;
}

export function polyCentroid(p: readonly Vec[]): Vec {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < p.length; i++) {
    const u = p[i]!;
    const v = p[(i + 1) % p.length]!;
    const k = u.x * v.y - v.x * u.y;
    a += k;
    cx += (u.x + v.x) * k;
    cy += (u.y + v.y) * k;
  }
  if (Math.abs(a) < 1e-9) {
    let sx = 0;
    let sy = 0;
    for (const q of p) {
      sx += q.x;
      sy += q.y;
    }
    return { x: sx / Math.max(1, p.length), y: sy / Math.max(1, p.length) };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

/** Even-odd point in polygon. */
export function insidePoly(p: readonly Vec[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i]!;
    const b = p[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Clips a convex polygon to the half-plane n·p <= c; edges keep their labels, the new edge gets `lab`. */
function clipLabelled(pts: Vec[], labels: number[], nx: number, ny: number, c: number, lab: number): { pts: Vec[]; labels: number[] } {
  const out: Vec[] = [];
  const outL: number[] = [];
  const n = pts.length;
  for (let k = 0; k < n; k++) {
    const S = pts[k]!;
    const E = pts[(k + 1) % n]!;
    const L = labels[k]!;
    const dS = nx * S.x + ny * S.y - c;
    const dE = nx * E.x + ny * E.y - c;
    const inS = dS <= 1e-9;
    const inE = dE <= 1e-9;
    if (inS) {
      out.push(S);
      outL.push(L);
    }
    if (inS !== inE) {
      const t = dS / (dS - dE);
      const I = { x: S.x + t * (E.x - S.x), y: S.y + t * (E.y - S.y) };
      out.push(I);
      outL.push(inS ? lab : L);
    }
  }
  // drop zero-length edges (a clip line through a vertex)
  const P: Vec[] = [];
  const PL: number[] = [];
  for (let k = 0; k < out.length; k++) {
    const a = out[k]!;
    const b = out[(k + 1) % out.length]!;
    if (out.length > 1 && Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS) continue;
    P.push(a);
    PL.push(outL[k]!);
  }
  return { pts: P, labels: PL };
}

function lexLess(a: Vec, b: Vec): boolean {
  if (Math.abs(a.x - b.x) > 1e-6) return a.x < b.x;
  return a.y < b.y;
}

// ---------------------------------------------------------------------------------------------
// Fracture

interface Site {
  x: number;
  /** In the anisotropic space (y × aspect). */
  y: number;
  stump: boolean;
}

function throwSites(o: FractureOptions, mask: Mask): Site[] {
  const { rect, aspect } = o;
  const rng = mulberry32(seedOf('sites', o.seed));
  const stumpY = -o.stumpLu;
  let above = 0;
  let below = 0;
  const g = 4;
  for (let y = rect.y + g / 2; y < rect.y + rect.h; y += g) {
    for (let x = rect.x + g / 2; x < rect.x + rect.w; x += g) {
      const m = mask(x, y);
      if (m <= 0) continue;
      if (y < stumpY) above += m * g * g;
      else below += m * g * g;
    }
  }
  const nDyn = Math.max(4, Math.round(o.cells));
  const nStump = Math.max(2, Math.min(6, Math.round(rect.w / 52)));
  // dart throwing reaches about 70% of the hexagonal density: spacing from the area per site
  let rDyn = 0.86 * Math.sqrt((Math.max(1, above) * aspect) / nDyn);
  let rStump = 0.86 * Math.sqrt((Math.max(1, below) * aspect) / nStump);
  const cand: Site[] = [];
  const want = 48 * (nDyn + nStump);
  for (let k = 0; k < want * 3 && cand.length < want; k++) {
    const x = rect.x + rng.next() * rect.w;
    const y = rect.y + rng.next() * rect.h;
    if (mask(x, y) < 0.5) continue;
    cand.push({ x, y: y * aspect, stump: y >= stumpY });
  }
  const out: Site[] = [];
  let dyn = 0;
  let stump = 0;
  for (let pass = 0; pass < 6 && (dyn < nDyn || stump < nStump); pass++) {
    for (const c of cand) {
      if (c.stump ? stump >= nStump : dyn >= nDyn) continue;
      const r = c.stump ? rStump : rDyn;
      let ok = true;
      for (const s of out) {
        const dx = s.x - c.x;
        const dy = s.y - c.y;
        // across the stump line the smaller spacing applies
        const rr = s.stump === c.stump ? r : Math.min(rDyn, rStump);
        if (dx * dx + dy * dy < rr * rr) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      out.push(c);
      if (c.stump) stump++;
      else dyn++;
    }
    rDyn *= 0.88;
    rStump *= 0.88;
  }
  if (out.length < 2) {
    // a degenerate mask: fall back to a 3 x 3 grid
    out.length = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out.push({ x: rect.x + rect.w * (i + 0.5) / 3, y: (rect.y + rect.h * (j + 0.5) / 3) * aspect, stump: j === 2 });
  }
  return out;
}

/** Inserts the zig-zag points of a shared edge (identical from both cells, reversed on one side). */
function jitterEdge(seed: number, i: number, j: number, A: Vec, B: Vec): Vec[] {
  const fwd = lexLess(A, B);
  const P = fwd ? A : B;
  const Q = fwd ? B : A;
  const dx = Q.x - P.x;
  const dy = Q.y - P.y;
  const len = Math.hypot(dx, dy);
  const m = len > 34 ? 2 : len > 15 ? 1 : 0;
  if (m === 0) return [];
  const rng = mulberry32(seedOf('edge', seed, Math.min(i, j), Math.max(i, j)));
  const nx = -dy / len;
  const ny = dx / len;
  const pts: Vec[] = [];
  for (let k = 0; k < m; k++) {
    const f = (k + 1) / (m + 1) + (rng.next() - 0.5) * (0.22 / m);
    const amp = Math.min(0.17 * len, 9);
    const off = (rng.next() - 0.5) * 2 * amp * (k % 2 === 0 ? 1 : -1) * (0.55 + 0.45 * rng.next());
    pts.push({ x: P.x + dx * f + nx * off, y: P.y + dy * f + ny * off });
  }
  return fwd ? pts : pts.reverse();
}

export function fracture(o: FractureOptions): Fracture {
  const rect = o.rect;
  const mask: Mask = o.mask ?? ((x, y) => (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h ? 1 : 0));
  const aspect = Math.max(0.4, Math.min(2.5, o.aspect));
  const sites = throwSites(o, mask);
  const box: Vec[] = [
    { x: rect.x, y: rect.y * aspect },
    { x: rect.x + rect.w, y: rect.y * aspect },
    { x: rect.x + rect.w, y: (rect.y + rect.h) * aspect },
    { x: rect.x, y: (rect.y + rect.h) * aspect },
  ];
  // 1. labelled Voronoi cells (anisotropic space), back to lu
  const raw: { pts: Vec[]; labels: number[] }[] = sites.map((s, i) => {
    let cell = { pts: box.slice(), labels: [-1, -1, -1, -1] };
    for (let j = 0; j < sites.length && cell.pts.length >= 3; j++) {
      if (j === i) continue;
      const t = sites[j]!;
      const nx = t.x - s.x;
      const ny = t.y - s.y;
      const c = nx * (s.x + t.x) * 0.5 + ny * (s.y + t.y) * 0.5;
      cell = clipLabelled(cell.pts, cell.labels, nx, ny, c, j);
    }
    return { pts: cell.pts.map((p) => ({ x: p.x, y: p.y / aspect })), labels: cell.labels };
  });
  // 2. zig-zag shared edges
  const polys: Vec[][] = raw.map((c, i) => {
    const out: Vec[] = [];
    for (let k = 0; k < c.pts.length; k++) {
      const A = c.pts[k]!;
      const B = c.pts[(k + 1) % c.pts.length]!;
      out.push(A);
      const j = c.labels[k]!;
      if (j >= 0) out.push(...jitterEdge(o.seed, i, j, A, B));
    }
    return out;
  });
  // 3. mass from the alpha mask
  const cells: Cell[] = polys.map((poly, i) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    // a 3.5 lu grid: about half the samples of 2.5 for the same masses within a few percent
    const g = 3.5;
    let w = 0;
    let sx = 0;
    let sy = 0;
    for (let y = minY + g / 2; y < maxY; y += g) {
      for (let x = minX + g / 2; x < maxX; x += g) {
        if (!insidePoly(poly, x, y)) continue;
        const m = mask(x, y);
        if (m <= 0) continue;
        w += m;
        sx += m * x;
        sy += m * y;
      }
    }
    const area = w * g * g;
    const c = w > 0 ? { x: sx / w, y: sy / w } : polyCentroid(poly);
    let radius = 0;
    for (const p of poly) radius = Math.max(radius, Math.hypot(p.x - c.x, p.y - c.y));
    const neighbors = [...new Set(raw[i]!.labels.filter((l) => l >= 0))].sort((a, b) => a - b);
    const kind: CellKind = area < 6 ? 'empty' : c.y >= -o.stumpLu ? 'stump' : 'free';
    return { id: i, poly, cx: c.x, cy: c.y, area, radius, kind, group: -1, neighbors };
  });
  // 4. topple groups
  const groups: ToppleGroup[] = [];
  o.topple.forEach((spec) => {
    const members = cells.filter((c) => c.kind === 'free' && c.group < 0 && c.cx >= spec.x0 && c.cx <= spec.x1 && -c.cy >= spec.y0);
    if (members.length === 0) return;
    const index = groups.length;
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const c of members) {
      for (const p of c.poly) {
        maxY = Math.max(maxY, p.y);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      }
    }
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (const c of members) {
      c.kind = 'topple';
      c.group = index;
      a += c.area;
      cx += c.cx * c.area;
      cy += c.cy * c.area;
    }
    cx = a > 0 ? cx / a : members[0]!.cx;
    cy = a > 0 ? cy / a : members[0]!.cy;
    // the hinge sits under the centre of mass, a little toward the fall: the tower tips and drops at
    // once instead of swinging up over a far corner like a lid
    const hx = Math.max(minX, Math.min(maxX, cx + spec.dir * (maxX - minX) * 0.12));
    groups.push({
      index,
      hinge: { x: hx, y: maxY },
      dir: spec.dir,
      delayMs: spec.delayMs,
      push: spec.push,
      sinkLu: spec.sinkLu,
      cells: members.map((c) => c.id),
      cx,
      cy,
    });
  });
  // 5. cracks, spreading from the origin
  const origin = o.origin ?? { x: rect.x + rect.w * 0.5, y: rect.y + rect.h * 0.3 };
  const rng = mulberry32(seedOf('cracks', o.seed));
  const far = Math.max(1, Math.hypot(rect.w, rect.h) * 0.75);
  const cracks: Crack[] = [];
  raw.forEach((c, i) => {
    const ci = cells[i]!;
    if (ci.kind === 'empty') return;
    for (let k = 0; k < c.pts.length; k++) {
      const j = c.labels[k]!;
      if (j <= i) continue;
      const cj = cells[j];
      if (!cj || cj.kind === 'empty') continue;
      if (ci.kind === 'stump' && cj.kind === 'stump') continue;
      const A = c.pts[k]!;
      const B = c.pts[(k + 1) % c.pts.length]!;
      const pts = [A, ...jitterEdge(o.seed, i, j, A, B), B];
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      // only where there is art to crack
      if (mask(mx, my) < 0.2 && mask(A.x, A.y) < 0.2 && mask(B.x, B.y) < 0.2) continue;
      const main = ci.kind === 'stump' || cj.kind === 'stump' || ci.group !== cj.group;
      const d = Math.min(1, Math.hypot(mx - origin.x, my - origin.y) / far);
      const t0 = Math.min(0.82, (main ? 0.04 : 0.1) + d * (main ? 0.42 : 0.62) + rng.next() * 0.1);
      cracks.push({ a: i, b: j, pts, t0, t1: Math.min(1, t0 + 0.18 + rng.next() * 0.12), main });
    }
  });
  return { rect, cells, cracks, groups };
}
