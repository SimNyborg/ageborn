/**
 * Backdrop layer 3 (mid-ground per age) and the arena ground and weather layer (DESIGN A11: "The
 * arena controls the ground and weather layer"; A14.1 `ground.<arena>`).
 */
import type { AgeId } from '@/contracts/ids';
import { BACKDROP_PALETTES, darken, lighten, mix, toCss } from '../palette';
import { blob, circle, ellipse, join, poly, rect, rrect } from '../svg';
import { mulberry32 } from '@/core/rng';
import { fbm, seedOf } from './noise';
import type { AmbientSpec } from './silhouettes';
import { applyFrame, BACKDROP_WIDTH, BACKDROP_X0, type Ctx2D, type LayerFrame } from './sky';

export const MID_FRAME: LayerFrame = { x0: BACKDROP_X0, width: BACKDROP_WIDTH, yTop: -300, height: 320, pxPerLu: 0.9 };
export const GROUND_FRAME: LayerFrame = { x0: BACKDROP_X0, width: BACKDROP_WIDTH, yTop: -40, height: 290, pxPerLu: 0.9 };

export const ARENAS = ['tar_pits', 'frostfang', 'kingsmoat', 'powder_bay', 'iron_front', 'neon_harbor', 'orbital_ring', 'chrono_rift'] as const;
export type ArenaId = (typeof ARENAS)[number];

function fillPath(ctx: Ctx2D, d: string, color: string): void {
  ctx.fillStyle = color;
  ctx.fill(new Path2D(d));
}

function band(ctx: Ctx2D, f: LayerFrame, color: string, yAt: (x: number) => number, bottom: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(f.x0, bottom);
  for (let x = f.x0; x <= f.x0 + f.width; x += 5) ctx.lineTo(x, yAt(x));
  ctx.lineTo(f.x0 + f.width, bottom);
  ctx.closePath();
  ctx.fill();
}

export function paintMid(ctx: Ctx2D, age: AgeId, f: LayerFrame): AmbientSpec[] {
  const pal = BACKDROP_PALETTES[age];
  const seed = seedOf(`mid.${age}`);
  applyFrame(ctx, f);
  const n = fbm(seed, 120, 3);
  const near = toCss(pal.near);
  const mid = toCss(pal.mid);
  const dark = toCss(darken(pal.near, 0.08));
  const ambient: AmbientSpec[] = [];
  band(ctx, f, mid, (x) => -48 - 14 * n(x), 20);
  switch (age) {
    case 'stone': {
      for (let i = 0; i < 26; i++) {
        const x = f.x0 + 30 + i * 67 + 20 * n(i * 31);
        const h = 70 + 50 * Math.abs(n(i * 17));
        const c = i % 3 === 0 ? dark : near;
        fillPath(ctx, join(poly([x - 22, -40, x, -40 - h, x + 22, -40]), poly([x - 17, -40 - h * 0.35, x, -40 - h * 1.08, x + 17, -40 - h * 0.35])), c);
        fillPath(ctx, rect(x - 3, -44, 6, 10), c);
      }
      for (const tx of [260, 980]) {
        fillPath(ctx, poly([tx - 26, -30, tx, -92, tx + 26, -30]), toCss(mix(pal.near, pal.light, 0.25)));
        fillPath(ctx, poly([tx - 6, -30, tx, -54, tx + 6, -30]), toCss(darken(pal.near, 0.25)));
        ambient.push({ kind: 'emit', part: 'fx.p.smoke', x: tx, y: -96, layer: 'mid', rate: 0.8, speed: 14, scale: 1.3, tint: lighten(pal.mid, 0.4), alpha: 0.45 });
      }
      for (let i = 0; i < 10; i++) fillPath(ctx, blob([0, 0, 8, -14, 24, -16, 34, 0].map((v, k) => v + (k % 2 === 0 ? f.x0 + i * 180 + 60 : -30)), 0.8), dark);
      break;
    }
    case 'medieval': {
      for (let i = 0; i < 22; i++) {
        const x = f.x0 + 40 + i * 80 + 22 * n(i * 13);
        const r = 26 + 12 * Math.abs(n(i * 7));
        fillPath(ctx, join(circle(x, -52 - r, r), circle(x - r * 0.6, -48 - r * 0.6, r * 0.7), circle(x + r * 0.7, -46 - r * 0.6, r * 0.65)), i % 2 ? near : dark);
        fillPath(ctx, rect(x - 3, -52, 6, 14), dark);
      }
      for (const cx of [140, 760, 1230]) {
        fillPath(ctx, rect(cx - 34, -76, 68, 44), toCss(mix(pal.near, pal.light, 0.3)));
        fillPath(ctx, poly([cx - 44, -74, cx, -118, cx + 44, -74]), toCss(darken(pal.mid, 0.15)));
        fillPath(ctx, rect(cx - 8, -52, 16, 20), toCss(darken(pal.near, 0.3)));
      }
      ctx.strokeStyle = toCss(darken(pal.mid, 0.2));
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = f.x0; x < f.x0 + f.width; x += 60) {
        ctx.moveTo(x, -30);
        ctx.lineTo(x, -52);
      }
      ctx.moveTo(f.x0, -46);
      ctx.lineTo(f.x0 + f.width, -46);
      ctx.moveTo(f.x0, -38);
      ctx.lineTo(f.x0 + f.width, -38);
      ctx.stroke();
      break;
    }
    case 'gunpowder': {
      band(ctx, f, near, (x) => -40 - 8 * n(x * 2), 20);
      for (let i = 0; i < 12; i++) {
        const x = f.x0 + 60 + i * 150;
        fillPath(ctx, blob([x - 50, -36, x - 40, -62, x - 10, -70, x + 30, -66, x + 50, -40], 0.8), dark);
      }
      for (const hx of [320, 900]) {
        fillPath(ctx, ellipse(hx, -44, 22, 26), toCss(mix(pal.light, pal.mid, 0.4)));
        fillPath(ctx, ellipse(hx + 40, -40, 16, 20), toCss(mix(pal.light, pal.mid, 0.5)));
      }
      fillPath(ctx, rect(560, -110, 110, 74), toCss(mix(pal.light, pal.near, 0.45)));
      fillPath(ctx, poly([548, -108, 615, -160, 682, -108]), toCss(darken(pal.mid, 0.2)));
      for (let k = 0; k < 3; k++) fillPath(ctx, rect(575 + k * 32, -94, 14, 16), toCss(darken(pal.near, 0.25)));
      ambient.push({ kind: 'emit', part: 'fx.p.smoke', x: 650, y: -160, layer: 'mid', rate: 0.7, speed: 14, scale: 1.2, tint: lighten(pal.mid, 0.4), alpha: 0.45 });
      break;
    }
    case 'modern': {
      for (let i = 0; i < 9; i++) {
        const x = f.x0 + 80 + i * 200;
        fillPath(ctx, poly([x, -36, x, -100 - 30 * Math.abs(n(i * 5)), x + 40, -110, x + 56, -80, x + 90, -84, x + 96, -36]), i % 2 ? near : dark);
        for (let w = 0; w < 3; w++) fillPath(ctx, rect(x + 12 + w * 26, -80, 12, 14), toCss(darken(pal.near, 0.3)));
      }
      ctx.strokeStyle = toCss(darken(pal.mid, 0.25));
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = f.x0 + 40; x < f.x0 + f.width; x += 170) {
        ctx.moveTo(x, -30);
        ctx.lineTo(x, -150);
        ctx.moveTo(x - 12, -140);
        ctx.lineTo(x + 12, -140);
      }
      for (let x = f.x0 + 40; x < f.x0 + f.width - 170; x += 170) {
        ctx.moveTo(x, -140);
        ctx.quadraticCurveTo(x + 85, -118, x + 170, -140);
      }
      ctx.stroke();
      for (let i = 0; i < 30; i++) fillPath(ctx, rrect(f.x0 + i * 60, -40, 24, 10, 5), toCss(mix(pal.near, pal.light, 0.3)));
      break;
    }
    case 'future': {
      for (const [x, r] of [
        [80, 70],
        [520, 90],
        [1050, 80],
      ] as const) {
        fillPath(ctx, ellipse(x, -34, r, r * 0.7), near);
        ctx.strokeStyle = toCss(0x9ff5d8, 0.6);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, -34, r * 0.8, r * 0.5, 0, Math.PI, 0);
        ctx.stroke();
        ambient.push({ kind: 'blink', part: 'bd.light', x, y: -34 - r * 0.7, layer: 'mid', period: 1300, tint: 0xd8fff0 });
      }
      for (let i = 0; i < 12; i++) {
        const x = f.x0 + 30 + i * 145;
        fillPath(ctx, join(rect(x - 4, -170, 8, 140), rect(x - 18, -176, 36, 8)), dark);
        fillPath(ctx, rect(x - 1.5, -160, 3, 120), toCss(i % 2 ? 0xf6c6e4 : 0x9ff5d8, 0.6));
      }
      fillPath(ctx, rect(f.x0, -60, f.width, 12), toCss(darken(pal.mid, 0.1)));
      break;
    }
  }
  return ambient;
}

// ---------------------------------------------------------------------------------------------
// Arena ground and weather

interface GroundPalette {
  top: number;
  face: number;
  deep: number;
  detail: number;
  accent: number;
}

const GROUNDS: Record<ArenaId, GroundPalette> = {
  tar_pits: { top: 0x8a7a62, face: 0x6b5b48, deep: 0x4e4236, detail: 0x2c2724, accent: 0xe8dcc4 },
  frostfang: { top: 0xe9eef2, face: 0xb8c4cf, deep: 0x8c98a6, detail: 0xcfe0ea, accent: 0xffffff },
  kingsmoat: { top: 0x7e9160, face: 0x6c6252, deep: 0x4f4a42, detail: 0x9aa7ae, accent: 0x8fa9b8 },
  powder_bay: { top: 0xd9c9a2, face: 0xb49e78, deep: 0x8c7a5c, detail: 0x7a6552, accent: 0xa5bcc2 },
  iron_front: { top: 0x7a7060, face: 0x5c5448, deep: 0x433d36, detail: 0x3a3632, accent: 0x9a9084 },
  neon_harbor: { top: 0x5a5e6a, face: 0x40434e, deep: 0x2c2e36, detail: 0x3af0b4, accent: 0xf03aa8 },
  orbital_ring: { top: 0xc8ccd4, face: 0x9aa0ac, deep: 0x23262e, detail: 0xe8ecf2, accent: 0x3af0b4 },
  chrono_rift: { top: 0x6a5a86, face: 0x4c4064, deep: 0x2e2640, detail: 0xc9b8f0, accent: 0xf03aa8 },
};

/** Normalises 'tar_pits' or 'ground.tar_pits' to an arena id (falls back to tar_pits). */
export function arenaId(arena: string): ArenaId {
  const id = arena.startsWith('ground.') ? arena.slice(7) : arena;
  return (ARENAS as readonly string[]).includes(id) ? (id as ArenaId) : 'tar_pits';
}

export function paintGround(ctx: Ctx2D, arena: ArenaId, f: LayerFrame): AmbientSpec[] {
  const g = GROUNDS[arena];
  const seed = seedOf(`ground.${arena}`);
  const n = fbm(seed, 60, 3);
  applyFrame(ctx, f);
  const ambient: AmbientSpec[] = [];
  // lane floor (units walk at y -16..16), a lip, then the front soil
  const grad = ctx.createLinearGradient(0, -30, 0, 250);
  grad.addColorStop(0, toCss(lighten(g.top, 0.06)));
  grad.addColorStop(0.2, toCss(g.top));
  grad.addColorStop(0.24, toCss(g.face));
  grad.addColorStop(1, toCss(g.deep));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(f.x0, 250);
  for (let x = f.x0; x <= f.x0 + f.width; x += 5) ctx.lineTo(x, -26 + 3 * n(x));
  ctx.lineTo(f.x0 + f.width, 250);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = toCss(darken(g.top, 0.12));
  ctx.fillRect(f.x0, 28, f.width, 4);
  const rnd = fbm(seed + 3, 9, 1);
  ambient.push(...groundAmbient(arena));
  switch (arena) {
    case 'tar_pits':
      paintTarPits(ctx, f, g, seed);
      break;
    case 'frostfang':
      for (let i = 0; i < 14; i++) {
        const x = f.x0 + i * 130 + 30 * rnd(i);
        ctx.strokeStyle = toCss(g.detail);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 60);
        ctx.lineTo(x + 20, 90);
        ctx.lineTo(x + 8, 120);
        ctx.stroke();
      }
      break;
    case 'kingsmoat':
      for (let i = 0; i < 40; i++) fillPath(ctx, rrect(f.x0 + i * 44 + 10 * rnd(i), 36, 36, 12, 5), toCss(g.detail, 0.9));
      fillPath(ctx, rect(f.x0, 150, f.width, 100), toCss(g.accent, 0.8));
      for (let i = 0; i < 16; i++) fillPath(ctx, rrect(f.x0 + i * 110, 170 + 10 * rnd(i), 40, 3, 1.5), toCss(0xffffff, 0.35));
      break;
    case 'powder_bay':
      for (let i = 0; i < 44; i++) fillPath(ctx, rect(f.x0 + i * 40, 40, 36, 60), toCss(i % 2 ? g.detail : darken(g.detail, 0.08)));
      fillPath(ctx, rect(f.x0, 100, f.width, 150), toCss(g.accent, 0.85));
      for (let i = 0; i < 12; i++) fillPath(ctx, rect(f.x0 + 60 + i * 150, 96, 10, 90), toCss(darken(g.detail, 0.2)));
      break;
    case 'iron_front':
      for (let i = 0; i < 8; i++) {
        const x = f.x0 + 120 + i * 210 + 50 * rnd(i);
        fillPath(ctx, ellipse(x, 70, 60, 14), toCss(darken(g.face, 0.2)));
        fillPath(ctx, ellipse(x, 66, 44, 8), toCss(darken(g.face, 0.35)));
      }
      for (let i = 0; i < 30; i++) fillPath(ctx, rect(f.x0 + i * 60, 126, 44, 8), toCss(g.accent, 0.6));
      break;
    case 'neon_harbor':
      for (let i = 0; i < 22; i++) fillPath(ctx, rect(f.x0 + i * 80, 34, 76, 70), toCss(i % 2 ? g.face : darken(g.face, 0.08)));
      fillPath(ctx, rect(f.x0, 32, f.width, 3), toCss(g.detail, 0.9));
      fillPath(ctx, rect(f.x0, 104, f.width, 3), toCss(g.accent, 0.8));
      break;
    case 'orbital_ring':
      for (let i = 0; i < 30; i++) fillPath(ctx, rect(f.x0 + i * 60, 36, 56, 40), toCss(i % 2 ? g.top : darken(g.top, 0.06)));
      fillPath(ctx, rect(f.x0, 80, f.width, 180), toCss(g.deep));
      ctx.fillStyle = toCss(0xffffff, 0.8);
      for (let i = 0; i < 80; i++) {
        ctx.beginPath();
        ctx.arc(f.x0 + ((i * 211) % f.width), 100 + ((i * 53) % 140), 0.8 + Math.abs(rnd(i)), 0, Math.PI * 2);
        ctx.fill();
      }
      fillPath(ctx, rect(f.x0, 76, f.width, 4), toCss(g.accent, 0.8));
      break;
    case 'chrono_rift':
      for (let i = 0; i < 12; i++) {
        const x = f.x0 + i * 150 + 40 * rnd(i);
        ctx.strokeStyle = toCss(g.detail, 0.8);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x + 30, 80);
        ctx.lineTo(x + 10, 130);
        ctx.lineTo(x + 40, 180);
        ctx.stroke();
        fillPath(ctx, poly([x + 60, 60, x + 70, 30, x + 80, 60]), toCss(g.detail, 0.5));
      }
      break;
  }
  return ambient;
}


/** Weather and ambient life of an arena's ground (shared by the painted and the pre-rendered ground). */
export function groundAmbient(arena: ArenaId): AmbientSpec[] {
  const ambient: AmbientSpec[] = [];
  switch (arena) {
    case 'tar_pits':
      ambient.push({ kind: 'emit', part: 'fx.p.ember', x: 600, y: 10, spreadX: 760, life: 3200, layer: 'ground', rate: 3, speed: 22, scale: 1.4, tint: 0xf0e0c0, alpha: 0.7 });
      break;
    case 'frostfang':
      ambient.push({ kind: 'emit', part: 'fx.p.snow', x: 600, y: -560, spreadX: 900, fall: true, life: 10000, layer: 'ground', rate: 14, speed: 60, scale: 1.4, alpha: 0.9 });
      break;
    case 'powder_bay':
      ambient.push({ kind: 'drift', part: 'bd.bird', x: 300, y: -420, layer: 'sky', speed: 30, tint: 0xf4f4f0 });
      break;
    case 'iron_front':
      ambient.push({ kind: 'emit', part: 'fx.p.ember', x: 600, y: -560, spreadX: 900, fall: true, life: 12000, layer: 'ground', rate: 8, speed: 48, scale: 1.2, tint: 0xc8c2b8, alpha: 0.6 });
      break;
    case 'neon_harbor':
      ambient.push({ kind: 'emit', part: 'fx.p.beam', x: 600, y: -560, spreadX: 900, fall: true, life: 1500, layer: 'ground', rate: 30, speed: 420, scale: 0.6, tint: 0xd8e8f0, alpha: 0.35 });
      break;
    case 'orbital_ring':
      ambient.push({ kind: 'emit', part: 'fx.p.snow', x: 600, y: 170, spreadX: 800, life: 5000, layer: 'ground', rate: 6, speed: 8, scale: 1, alpha: 0.6, tint: 0xd8fff0 });
      break;
    case 'chrono_rift':
      ambient.push({ kind: 'emit', part: 'fx.p.xp', x: 600, y: 20, spreadX: 760, life: 4000, layer: 'ground', rate: 5, speed: 18, scale: 1.2, tint: 0xc9b8f0, alpha: 0.8 });
      break;
    default:
      break;
  }
  return ambient;
}

/** An organic, perspective-squashed blob around (cx, cy): `k` points with seeded radius jitter. */
function lumpy(cx: number, cy: number, rx: number, ry: number, rng: () => number, k = 9, jitter = 0.22): string {
  const pts: number[] = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2;
    const r = 1 - jitter + 2 * jitter * rng();
    pts.push(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
  }
  return blob(pts, 1);
}

/**
 * Tar Pits front soil: glossy tar pools with a trodden rim, bubble rings and a wet highlight, plus
 * pebbles, bones and dry grass along the lane lip. Placement is seeded but irregular, and everything
 * scales up toward the camera (lower on screen) so the strip reads as depth, not a row of holes.
 */
function paintTarPits(ctx: Ctx2D, f: LayerFrame, g: GroundPalette, seed: number): void {
  const rng = mulberry32(seed ^ 0x7a9);
  const r = (): number => rng.next();
  const lipShade = ctx.createLinearGradient(0, 30, 0, 64);
  lipShade.addColorStop(0, toCss(darken(g.face, 0.3), 0.55));
  lipShade.addColorStop(1, toCss(darken(g.face, 0.3), 0));
  ctx.fillStyle = lipShade;
  ctx.fillRect(f.x0, 30, f.width, 34);
  // soil speckle: darker clods and pale grit, denser near the lane
  for (let i = 0; i < 260; i++) {
    const y = 36 + 200 * r() ** 1.6;
    const s = 1 + (y - 30) / 70;
    const x = f.x0 + r() * f.width;
    const dark = r() < 0.6;
    fillPath(ctx, lumpy(x, y, 2.4 * s * (0.6 + r()), 1.2 * s * (0.6 + r()), r, 6, 0.3), toCss(dark ? darken(g.face, 0.18) : lighten(g.face, 0.14), dark ? 0.55 : 0.45));
  }
  // tar pools, spaced irregularly and shifted in depth
  const pools: [number, number, number][] = [];
  let x = f.x0 + 40 + 120 * r();
  while (x < f.x0 + f.width - 40) {
    const y = 64 + 110 * r();
    const s = 0.75 + (y - 60) / 180;
    const rx = (34 + 42 * r()) * s;
    pools.push([x, y, rx]);
    x += rx * 2 + 70 + 200 * r();
  }
  for (const [px, py, rx] of pools) {
    const ry = rx * (0.2 + 0.04 * r());
    fillPath(ctx, lumpy(px, py + ry * 0.25, rx * 1.18, ry * 1.5, r), toCss(darken(g.face, 0.22)));
    fillPath(ctx, lumpy(px, py, rx * 1.06, ry * 1.25, r), toCss(lighten(g.top, 0.04), 0.55));
    fillPath(ctx, lumpy(px, py, rx, ry, r, 10, 0.12), toCss(0x241c1a));
    fillPath(ctx, lumpy(px + rx * 0.08, py + ry * 0.2, rx * 0.8, ry * 0.62, r, 8, 0.1), toCss(0x33282a));
    // wet sheen: a long thin highlight up-left and a small glint
    fillPath(ctx, ellipse(px - rx * 0.3, py - ry * 0.45, rx * 0.42, Math.max(1.4, ry * 0.14)), toCss(0xf4ead8, 0.32));
    fillPath(ctx, ellipse(px + rx * 0.28, py - ry * 0.3, Math.max(2, rx * 0.07), Math.max(1, ry * 0.12)), toCss(0xffffff, 0.45));
    // bubble rings
    const bubbles = 1 + Math.floor(r() * 3);
    ctx.lineWidth = 1.4;
    for (let b = 0; b < bubbles; b++) {
      const bx = px + (r() - 0.5) * rx * 1.1;
      const by = py + (r() - 0.3) * ry * 0.8;
      const br = 2 + 4 * r();
      ctx.strokeStyle = toCss(0x6a5a58, 0.75);
      ctx.beginPath();
      ctx.ellipse(bx, by, br * 1.6, br * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      fillPath(ctx, ellipse(bx - br * 0.5, by - br * 0.2, br * 0.45, br * 0.18), toCss(0xffffff, 0.35));
    }
  }
  // pebbles with a lit top, avoiding the pools
  for (let i = 0; i < 70; i++) {
    const y = 38 + 190 * r() ** 1.3;
    const px = f.x0 + r() * f.width;
    if (pools.some(([qx, qy, rx]) => Math.abs(px - qx) < rx * 1.3 && Math.abs(y - qy) < rx * 0.4)) continue;
    const s = (1.6 + 3.4 * r()) * (1 + (y - 30) / 110);
    fillPath(ctx, ellipse(px + s * 0.25, y + s * 0.45, s * 1.25, s * 0.45), toCss(darken(g.deep, 0.25), 0.5));
    fillPath(ctx, lumpy(px, y, s * 1.2, s * 0.8, r, 7, 0.18), toCss(r() < 0.5 ? g.top : mix(g.top, g.face, 0.5)));
    fillPath(ctx, ellipse(px - s * 0.3, y - s * 0.35, s * 0.5, s * 0.22), toCss(lighten(g.top, 0.3), 0.8));
  }
  // a few old bones
  for (let i = 0; i < 7; i++) {
    const bx = f.x0 + 120 + i * (f.width / 7) + 90 * r();
    const by = 70 + 150 * r();
    const s = 1 + (by - 30) / 140;
    const a = (r() - 0.5) * 0.9;
    const c = Math.cos(a) * 9 * s;
    const sn = Math.sin(a) * 9 * s;
    ctx.strokeStyle = toCss(g.accent, 0.85);
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(bx - c, by - sn);
    ctx.lineTo(bx + c, by + sn);
    ctx.stroke();
    ctx.fillStyle = toCss(g.accent, 0.9);
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(bx + e * c - sn * 0.18, by + e * sn + c * 0.18 - 1.2 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.arc(bx + e * c + sn * 0.18, by + e * sn - c * 0.18 + 1.2 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // dry grass along the lane lip
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const gx = f.x0 + r() * f.width;
    const gy = 30 + 8 * r();
    const blades = 3 + Math.floor(r() * 3);
    ctx.strokeStyle = toCss(r() < 0.5 ? 0x8b8458 : 0x9d9468, 0.9);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let b = 0; b < blades; b++) {
      const lean = (b - blades / 2) * 2.4 + (r() - 0.5) * 2;
      ctx.moveTo(gx + b * 1.6, gy);
      ctx.quadraticCurveTo(gx + b * 1.6 + lean * 0.4, gy - 5, gx + b * 1.6 + lean, gy - 7 - 5 * r());
    }
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

export const GROUND_TINTS = GROUNDS;
