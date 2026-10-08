/**
 * National flags in the visuals (PLAN 2d; owned by Track D): the picture of every `nationalFlag.<id>`
 * for the screens (`cosmeticImageUrl` routes here from `art.ts`), the lane's cloth (`nationalFlagTexture`,
 * used by the base dressing) and the Flag Atlas's region rewards (`REGION_PENNANTS`).
 *
 * **The designs are flag-icons 7.5.0 (MIT, Panayiotis Lipiridis)**, vendored by `tools/flags/vendor.ts`
 * into `public/art/flags/` (licence notice beside them, credited in Settings): every flag of the content
 * (the 195 and the Other flags) has
 * - `svg/<code>.svg`: the accurate 4:3 design (the big view, the lane cloth, VS, Profile);
 * - a cell in `atlas-64.webp` / `atlas-128.webp` (`atlas.json`): the grid pictures, one download.
 *
 * The API (PLAN 2f interfaces 2 and 5):
 * - `nationalFlagUrl(id, 'big')`: the SVG's URL (always at once).
 * - `nationalFlagUrl(id, 'tile')`: the atlas cell (a blob URL, cut once the atlas is in; the 128 px
 *   atlas on DPR ≥ 1.5); until then the SVG's URL, the same picture. With `{ cached: true }` only the
 *   cell, or null while the atlas loads (a grid that waits for it, the Flag Atlas).
 * - `nationalFlagTexture(id)`: the lane cloth, `{ texture, ready }`: a neutral cloth at once, the
 *   vendored design baked in (cel fold bands, sheen, an outline in the flag's own dark) when its SVG is
 *   in; one texture per flag, shared: never destroy it.
 * - `REGION_PENNANTS`: the region and total rewards as base flags (`art.ts` draws them like `BASE_FLAGS`).
 *
 * The 50 hand-drawn designs of before 2026-10-08 (`NATIONAL_FLAGS`, `nationalFlagSvg`,
 * `drawNationalFlag`) stay only as the fallback of the markup and canvas paths (`cosmeticSvg`,
 * `drawFlag`) until every caller uses the vendored art; they are removed then.
 *
 * Country flags only; no political or hate symbols; never defaced (the base collapse lowers a national
 * flag with its pole, intact). A player's flag is only ever their own pick.
 */
import { Texture } from 'pixi.js';
import { BANNER_OUTLINE, FLAG_H, FLAG_W, type FlagTier } from './flags';
import { band, cel, circle, drawShapes, group, INK, line, poly, polyPath, rect, ring, rotRect, roundRect, shapesToSvg, star, type Ctx2D, type Paints, type Shape } from './shapes';

// ---------------------------------------------------------------------------------------------
// The vendored designs (flag-icons 7.5.0, MIT; `tools/flags/vendor.ts`)
// ---------------------------------------------------------------------------------------------

/** Every vendored flag (item ids; `tools/flags/vendor.ts` writes one SVG and one atlas cell for each). */
export const VENDORED_FLAGS: readonly string[] = (
  'ad ae af ag al am ao ar at au az ba bb bd be bf bg bh bi bj bn bo br bs bt bw by bz ca cd cf cg ch ci cl cm cn co cr cu cv cy cz de dj dk dm ' +
  'do dz ec ee eg er es et fi fj fm fo fr ga gb gb_eng gb_sct gb_wls gd ge gh gl gm gn gq gr gt gw gy hn hr ht hu id ie il in iq ir is it jm jo ' +
  'jp ke kg kh ki km kn kp kr kw kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk ml mm mn mr mt mu mv mw mx my mz na ne ng ni nl no np ' +
  'nr nz om pa pe pg ph pk pl ps pt pw py qa ro rs ru rw sa sb sc sd se sg si sk sl sm sn so sr ss st sv sy sz td tg th tj tl tm tn to tr tt tv ' +
  'tz ua ug us uy uz va vc ve vn vu ws ye za zm zw'
).split(' ');
const VENDORED = new Set(VENDORED_FLAGS);

/** The vendored file name of a flag (`gb_eng` → `gb-eng`). */
export const flagFileName = (id: string): string => id.replace('_', '-');

function baseUrl(): string {
  return (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
}

/** The URL of a vendored flag's SVG, or null for a flag that has none. */
export function nationalFlagSvgUrl(id: string): string | null {
  return VENDORED.has(id) ? `${baseUrl()}art/flags/svg/${flagFileName(id)}.svg` : null;
}

interface AtlasJson {
  cols: number;
  sizes: Record<string, { file: string; cell: [number, number] }>;
  cells: Record<string, number>;
}

/** The atlas cells as blob URLs by item id, once the atlas is in (null before; false after a failure). */
let atlasCells: Map<string, string> | null | false = null;
let atlasLoading: Promise<boolean> | null = null;

/** The atlas size for this screen: 128 px cells on DPR ≥ 1.5, else 64. */
function atlasKey(): '64' | '128' {
  const dpr = (globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1;
  return dpr >= 1.5 ? '128' : '64';
}

/** One cell of the decoded atlas as a blob URL (WebP where the browser can encode it, else PNG). */
function cutCell(img: CanvasImageSource, x: number, y: number, w: number, h: number): Promise<string | null> {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  return new Promise((resolve) => {
    c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : null), 'image/webp', 0.92);
  });
}

/**
 * Loads the flag atlas once (`atlas.json` and the cells for this screen) and cuts every cell into its
 * own picture. Resolves true when the cells are in, false when the atlas cannot load (the pictures then
 * stay the SVGs). Starts by itself on the first `nationalFlagUrl(id, 'tile')`.
 */
export function loadNationalFlagAtlas(): Promise<boolean> {
  if (atlasLoading) return atlasLoading;
  if (typeof document === 'undefined' || typeof fetch !== 'function' || typeof Image === 'undefined') {
    // no DOM (tests, workers): the SVGs stand in
    atlasCells = false;
    return (atlasLoading = Promise.resolve(false));
  }
  atlasLoading = (async () => {
    try {
      const res = await fetch(`${baseUrl()}art/flags/atlas.json`);
      if (!res.ok) throw new Error(`atlas.json ${res.status}`);
      const json = (await res.json()) as AtlasJson;
      const size = json.sizes[atlasKey()] ?? json.sizes['64'];
      if (!size) throw new Error('atlas.json has no sizes');
      const img = new Image();
      img.decoding = 'async';
      img.src = `${baseUrl()}art/flags/${size.file}`;
      await img.decode();
      const [w, h] = size.cell;
      const cells = new Map<string, string>();
      const jobs = Object.entries(json.cells).map(async ([code, i]) => {
        const url = await cutCell(img, (i % json.cols) * w, Math.floor(i / json.cols) * h, w, h);
        if (url) cells.set(code.replace('-', '_'), url);
      });
      await Promise.all(jobs);
      atlasCells = cells;
      return true;
    } catch {
      atlasCells = false;
      return false;
    }
  })();
  return atlasLoading;
}

/**
 * The flag's picture for the screens (PLAN 2f interface 2): `big` the SVG's URL; `tile` the atlas cell
 * when the atlas is in, else the SVG's URL (`cached: true`: null instead, while the atlas loads). Null
 * for a flag without vendored art (the router then uses {@link nationalFlagSvg}).
 */
export function nationalFlagUrl(id: string, size: 'tile' | 'big', o: { cached?: boolean } = {}): string | null {
  const svg = nationalFlagSvgUrl(id);
  if (!svg) return null;
  if (size === 'big') return svg;
  if (atlasCells) return atlasCells.get(id) ?? svg;
  if (atlasCells === null) void loadNationalFlagAtlas();
  // the atlas failed: the SVGs stand in, also for a grid that asked to wait
  if (atlasCells === false) return svg;
  return o.cached ? null : svg;
}

// ---------------------------------------------------------------------------------------------
// The lane cloth (PLAN 2d "Lane rendering"; the base dressing flies it, Track B)
// ---------------------------------------------------------------------------------------------

/** Pixels per view-box unit of the lane cloth: the dressing's texture density (its `TEX_PX`). */
const LANE_PX = 5;
/** The cloth's field: the 4:3 design at the full 40-unit height from the hoist (53.3 x 40 of the 60 x 40 field). */
const CLOTH_W = (FLAG_H * 4) / 3;
/** The neutral cloth shown until the design is in (parchment, AUDIT §3.3). */
const NEUTRAL = '#e8dfc8';

/**
 * The cloth finish over a design drawn in (x, y, w, h) (AUDIT §3.1): two hard fold shadow bands and a
 * light band, a sheen from the top left, a darker hoist hem and lower edge, then an outline in the
 * flag's own dark (black at 62% over its colours: fill × 0.38, never ink black). `u` = px per unit.
 */
function clothFinish(ctx: Ctx2D, x: number, y: number, w: number, h: number, u: number): void {
  ctx.save();
  const bands: [number, number, string][] = [
    [0.29, 0.39, 'rgba(0,0,0,0.09)'],
    [0.47, 0.53, 'rgba(255,255,255,0.09)'],
    [0.66, 0.79, 'rgba(0,0,0,0.11)'],
  ];
  for (const [a, b, c] of bands) {
    ctx.fillStyle = c;
    ctx.fillRect(x + w * a, y, w * (b - a), h);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * 0.42, y);
  ctx.lineTo(x, y + h * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(x, y, 1.3 * u, h);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(x, y + h - 2.6 * u, w, 2.6 * u);
  ctx.restore();
}

/** Draws the cloth (the design, or the neutral cloth when `img` is null) into a lane texture canvas. */
function drawCloth(ctx: Ctx2D, img: CanvasImageSource | null): void {
  const u = LANE_PX;
  const x = 2 * u;
  const y = 2 * u;
  const w = CLOTH_W * u;
  const h = FLAG_H * u;
  const r = 2.4 * u;
  const outline = new Path2D(roundRect(x, y, w, h, r, 'none').d);
  ctx.save();
  ctx.clip(outline);
  if (img) ctx.drawImage(img, x, y, w, h);
  else {
    ctx.fillStyle = NEUTRAL;
    ctx.fillRect(x, y, w, h);
  }
  // the finish touches the cloth only (a flag with clear parts, Nepal, keeps them clear)
  ctx.globalCompositeOperation = 'source-atop';
  clothFinish(ctx, x, y, w, h, u);
  // the outline inside the edge (half of a 2.6-unit stroke), in the flag's own dark
  ctx.strokeStyle = 'rgba(0,0,0,0.62)';
  ctx.lineWidth = 2.6 * u;
  ctx.lineJoin = 'round';
  ctx.stroke(outline);
  ctx.restore();
}

const laneCloths = new Map<string, { texture: Texture; ready: Promise<void> }>();

/**
 * The lane cloth of a flag (PLAN 2f interface 5): the texture to show now and a promise for when the
 * vendored design is baked into it (it resolves on failure too; the neutral cloth then stays). Laid out
 * like {@link drawNationalFlag} at 5 px per unit: the 60 x 40-unit field with a 2-unit margin (320 x 220
 * px), the 4:3 design filling the field's height from the hoist and the rest of the field clear. One
 * texture per flag, cached and shared: never destroy it. Null without vendored art or a DOM (tests).
 */
export function nationalFlagTexture(id: string): { texture: Texture; ready: Promise<void> } | null {
  const url = nationalFlagSvgUrl(id);
  if (!url || typeof document === 'undefined' || typeof Image === 'undefined') return null;
  const hit = laneCloths.get(id);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = (FLAG_W + 4) * LANE_PX;
  canvas.height = (FLAG_H + 4) * LANE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawCloth(ctx, null);
  const texture = Texture.from(canvas);
  texture.source.scaleMode = 'linear';
  const ready = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawCloth(ctx, img);
        texture.source.update();
      } catch {
        /* the neutral cloth stays */
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
  const entry = { texture, ready };
  laneCloths.set(id, entry);
  return entry;
}

// ---------------------------------------------------------------------------------------------
// The 50 hand-drawn designs of before 2026-10-08 (fallback only, see the module note)
// ---------------------------------------------------------------------------------------------

const W = FLAG_W;
const H = FLAG_H;

// ---------------------------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------------------------

const hStripes = (colors: readonly string[], weights?: readonly number[]): Shape[] => {
  const ws = weights ?? colors.map(() => 1);
  const total = ws.reduce((a, b) => a + b, 0);
  let y = 0;
  return colors.map((c, i) => {
    const h = (H * ws[i]!) / total;
    const s = rect(0, y, W, h + 0.3, c);
    y += h;
    return s;
  });
};

const vStripes = (colors: readonly string[], weights?: readonly number[]): Shape[] => {
  const ws = weights ?? colors.map(() => 1);
  const total = ws.reduce((a, b) => a + b, 0);
  let x = 0;
  return colors.map((c, i) => {
    const w = (W * ws[i]!) / total;
    const s = rect(x, 0, w + 0.3, H, c);
    x += w;
    return s;
  });
};

/** Nordic cross: the upright sits toward the hoist (x 17-25 for w 8). */
const nordic = (bg: string, cross: string, w: number, inner?: { color: string; w: number }): Shape[] => {
  const cx = 21;
  const out: Shape[] = [rect(0, 0, W, H, bg), rect(cx - w / 2, 0, w, H, cross), rect(0, H / 2 - w / 2, W, w, cross)];
  if (inner) out.push(rect(cx - inner.w / 2, 0, inner.w, H, inner.color), rect(0, H / 2 - inner.w / 2, W, inner.w, inner.color));
  return out;
};

const centredCross = (bg: string, c: string, w: number): Shape[] => [rect(0, 0, W, H, bg), rect(W / 2 - w / 2, 0, w, H, c), rect(0, H / 2 - w / 2, W, w, c)];

const saltire = (bg: string, c: string, w: number, x = 0, y = 0, ww = W, hh = H): Shape[] => [
  rect(x, y, ww, hh, bg),
  band(x, y, x + ww, y + hh, w, c),
  band(x + ww, y, x, y + hh, w, c),
];

/** The Union Flag in a box (whole flag or a canton). */
function unionFlag(x: number, y: number, w: number, h: number): Shape[] {
  const k = h / 40;
  const blue = '#012169';
  const red = '#c8102e';
  const cx = x + w / 2;
  const cy = y + h / 2;
  const off = 1.6 * k;
  return [
    group(
      [x, y, w, h],
      [
        rect(x, y, w, h, blue),
        band(x, y, x + w, y + h, 8 * k, '#ffffff'),
        band(x + w, y, x, y + h, 8 * k, '#ffffff'),
        // the red diagonals are counterchanged like a pinwheel: facing out from the centre, each
        // arm's red lies on its anticlockwise side (below the white at the upper hoist)
        band(x - off, y + off, cx - off, cy + off, 2.6 * k, red),
        band(cx + off, cy - off, x + w + off, y + h - off, 2.6 * k, red),
        band(x + w - off, y - off, cx - off, cy - off, 2.6 * k, red),
        band(cx + off, cy + off, x + off, y + h + off, 2.6 * k, red),
        rect(cx - 6.5 * k, y, 13 * k, h, '#ffffff'),
        rect(x, cy - 6.5 * k, w, 13 * k, '#ffffff'),
        rect(cx - 4 * k, y, 8 * k, h, red),
        rect(x, cy - 4 * k, w, 8 * k, red),
      ],
    ),
  ];
}

function usStars(): Shape[] {
  const out: Shape[] = [];
  const cw = 24;
  const ch = (H * 7) / 13;
  for (let row = 0; row < 9; row += 1) {
    const n = row % 2 === 0 ? 6 : 5;
    for (let i = 0; i < n; i += 1) {
      const sx = row % 2 === 0 ? (cw / 12) * (1 + 2 * i) : (cw / 12) * (2 + 2 * i);
      const sy = (ch / 10) * (1 + row);
      out.push(star(sx, sy, 0.95, '#ffffff'));
    }
  }
  return out;
}

const MAPLE =
  'M30 7.5l-2 4.2c-.3.5-.7.4-1.2.2l-1.5-.8 1.1 5.9c.2 1.1-.4 1.1-.8.6l-2.6-2.9-.4 1.5c-.1.3-.4.5-.8.4l-3.3-.7.9 3.2c.2.7.3 1-.2 1.2l-1.2.5 5.7 4.6c.2.2.3.5.3.8l-.5 1.6c2-.2 3.8-.6 5.8-.8.2 0 .5.2.5.4l-.3 6.2h1.1l-.3-6.2c0-.2.3-.4.5-.4 2 .2 3.8.6 5.8.8l-.5-1.6c-.1-.3 0-.6.3-.8l5.7-4.6-1.2-.5c-.5-.2-.4-.5-.2-1.2l.9-3.2-3.3.7c-.4.1-.7-.1-.8-.4l-.4-1.5-2.6 2.9c-.4.5-1 .5-.8-.6l1.1-5.9-1.5.8c-.5.2-.9.3-1.2-.2z';

/**
 * Taegukgi. The taegeuk's S-line and the geon/gon trigrams lie on the upper-left to lower-right
 * diagonal (the gam/ri pair on the other one); red is on top with its head at the upper left, blue
 * below with its head at the lower right. Each trigram's bars stand across its diagonal, facing the
 * centre: geon ☰ upper left, gam ☵ upper right, ri ☲ lower left, gon ☷ lower right.
 */
function taeguk(): Shape[] {
  const cx = 30;
  const cy = 20;
  const r = 10; // diameter = half the flag's height
  const diag = (Math.atan2(H, W) * 180) / Math.PI; // 33.7° on a 3:2 field
  const rad = (diag * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const p = (t: number) => `${(cx + ux * t).toFixed(2)} ${(cy + uy * t).toFixed(2)}`;
  const red = '#cd2e3a';
  const blue = '#0047a0';
  // the big upper half, minus the lower-right small circle, plus the upper-left small circle
  const top = `M${p(-r)}A${r} ${r} 0 0 1 ${p(r)}A${r / 2} ${r / 2} 0 0 0 ${p(0)}A${r / 2} ${r / 2} 0 0 1 ${p(-r)}z`;
  const ink = '#111111';
  const barLen = H / 4; // 10
  const barW = 1.7;
  const step = 2.55; // bar thickness plus the gap
  const gap = 1.3;
  const dist = r + 5 + step; // trigram centre from the flag centre
  /** One trigram centred on the diagonal at angle `axisDeg`, bars across it; `broken` lists the bars from the centre out. */
  const trigram = (axisDeg: number, sign: 1 | -1, broken: readonly boolean[]): Shape[] => {
    const a = (axisDeg * Math.PI) / 180;
    const ax = Math.cos(a) * sign;
    const ay = Math.sin(a) * sign;
    // the bar direction is the axis turned 90°
    const bx = -ay;
    const by = ax;
    const barDeg = (Math.atan2(-bx, by) * 180) / Math.PI; // rotRect's long side (h) is (−sin, cos)
    return broken.flatMap((isBroken, i) => {
      const d = dist + (i - 1) * step;
      const ox = cx + ax * d;
      const oy = cy + ay * d;
      if (!isBroken) return [rotRect(ox, oy, barW, barLen, barDeg, ink)];
      const half = (barLen - gap) / 2;
      const o = (half + gap) / 2;
      return [rotRect(ox - bx * o, oy - by * o, barW, half, barDeg, ink), rotRect(ox + bx * o, oy + by * o, barW, half, barDeg, ink)];
    });
  };
  return [
    rect(0, 0, W, H, '#ffffff'),
    circle(cx, cy, r, blue),
    { d: top, fill: red },
    ...trigram(diag, -1, [false, false, false]), // geon, upper left
    ...trigram(diag, 1, [true, true, true]), // gon, lower right
    ...trigram(-diag, 1, [true, false, true]), // gam, upper right
    ...trigram(-diag, -1, [false, true, false]), // ri, lower left
  ];
}

function sunRays(cx: number, cy: number, r: number, color: string): Shape[] {
  return [star(cx, cy, r * 1.9, color, { ri: r * 1.1, n: 16 }), circle(cx, cy, r, color, { stroke: '#8a5a00', width: 0.4 })];
}

function chakra(cx: number, cy: number, r: number): Shape[] {
  const navy = '#000080';
  const out: Shape[] = [ring(cx, cy, r, navy, 0.9), circle(cx, cy, 1, navy)];
  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI) / 12;
    out.push(line(`M${cx - Math.cos(a) * r} ${cy - Math.sin(a) * r}L${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`, navy, 0.45));
  }
  return out;
}

function crescentStar(bg: string, cx: number): Shape[] {
  return [rect(0, 0, W, H, bg), circle(cx, 20, 10, '#ffffff'), circle(cx + 2.6, 20, 8, bg), star(cx + 11.5, 20, 5, '#ffffff', { rotDeg: -90, ri: 2 })];
}

/** The Southern Cross: Australia's stars have seven points, New Zealand's five (red, white-edged). */
function southernCross(fill: string, outline?: string): Shape[] {
  const s = (x: number, y: number, r: number) =>
    outline ? star(x, y, r, fill, { stroke: outline, width: 0.8 }) : star(x, y, r * 1.1, fill, { n: 7, ri: r * 0.5 });
  return [s(45, 31, 2.6), s(38, 18, 2.4), s(46, 8, 2.2), s(52, 16.5, 2.4)];
}

// ---------------------------------------------------------------------------------------------
// National flags (country codes; ids use `_` for `-`)
// ---------------------------------------------------------------------------------------------

export const NATIONAL_FLAGS: Readonly<Record<string, readonly Shape[]>> = {
  dk: nordic('#c8102e', '#ffffff', 6),
  fo: nordic('#ffffff', '#0065bd', 9, { color: '#ed2939', w: 4.5 }),
  gl: [rect(0, 0, W, H / 2, '#ffffff'), rect(0, H / 2, W, H / 2, '#d00c33'), group([10, 8, 24, 12], [circle(22, 20, 12, '#d00c33')]), group([10, 20, 24, 12], [circle(22, 20, 12, '#ffffff')])],
  se: nordic('#006aa7', '#fecc02', 6),
  no: nordic('#ba0c2f', '#ffffff', 9, { color: '#00205b', w: 4.5 }),
  fi: nordic('#ffffff', '#002f6c', 8),
  is: nordic('#02529c', '#ffffff', 9, { color: '#dc1e35', w: 4.5 }),
  gb: unionFlag(0, 0, W, H),
  gb_eng: centredCross('#ffffff', '#ce1124', 7),
  gb_sct: saltire('#005eb8', '#ffffff', 7),
  ie: vStripes(['#169b62', '#ffffff', '#ff883e']),
  us: [
    ...hStripes(Array.from({ length: 13 }, (_, i) => (i % 2 === 0 ? '#b22234' : '#ffffff'))),
    rect(0, 0, 24, (H * 7) / 13, '#3c3b6e'),
    ...usStars(),
  ],
  ca: [rect(0, 0, W, H, '#ffffff'), rect(0, 0, 15, H, '#d52b1e'), rect(45, 0, 15, H, '#d52b1e'), { d: MAPLE, fill: '#d52b1e' }],
  de: hStripes(['#000000', '#dd0000', '#ffce00']),
  fr: vStripes(['#0055a4', '#ffffff', '#ef4135']),
  nl: hStripes(['#ae1c28', '#ffffff', '#21468b']),
  be: vStripes(['#000000', '#fdda24', '#ef3340']),
  lu: hStripes(['#ed2939', '#ffffff', '#00a1de']),
  ch: [rect(0, 0, W, H, '#da291c'), rect(26.5, 10, 7, 20, '#ffffff'), rect(20, 16.5, 20, 7, '#ffffff')],
  at: hStripes(['#c8102e', '#ffffff', '#c8102e']),
  it: vStripes(['#009246', '#ffffff', '#ce2b37']),
  es: hStripes(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]),
  pt: [
    rect(0, 0, 24, H, '#046a38'),
    rect(24, 0, 36, H, '#da291c'),
    ring(24, 20, 7.5, '#ffe900', 2.2),
    { d: 'M20 15h8v6.5c0 2.6-1.8 4-4 4.8-2.2-.8-4-2.2-4-4.8z', fill: '#ffffff', stroke: '#da291c', width: 1.4 },
    // the five blue quinas, set as a cross
    ...[
      [24, 17.6],
      [21.9, 20.2],
      [24, 20.2],
      [26.1, 20.2],
      [24, 22.8],
    ].map(([x, y]) => circle(x!, y!, 0.85, '#003399')),
  ],
  pl: hStripes(['#ffffff', '#dc143c']),
  cz: [rect(0, 0, W, H / 2, '#ffffff'), rect(0, H / 2, W, H / 2, '#d7141a'), poly([0, 0, 30, 20, 0, 40], '#11457e')],
  hu: hStripes(['#ce2939', '#ffffff', '#477050']),
  gr: [
    ...hStripes(Array.from({ length: 9 }, (_, i) => (i % 2 === 0 ? '#0d5eaf' : '#ffffff'))),
    rect(0, 0, 22.2, 22.2, '#0d5eaf'),
    rect(8.9, 0, 4.4, 22.2, '#ffffff'),
    rect(0, 8.9, 22.2, 4.4, '#ffffff'),
  ],
  ee: hStripes(['#0072ce', '#000000', '#ffffff']),
  lv: hStripes(['#9e3039', '#ffffff', '#9e3039'], [2, 1, 2]),
  lt: hStripes(['#fdb913', '#006a44', '#c1272d']),
  ua: hStripes(['#0057b7', '#ffd700']),
  ro: vStripes(['#002b7f', '#fcd116', '#ce1126']),
  bg: hStripes(['#ffffff', '#00966e', '#d62612']),
  tr: crescentStar('#e30a17', 21),
  jp: [rect(0, 0, W, H, '#ffffff'), circle(30, 20, 12, '#bc002d')],
  kr: taeguk(),
  in: [...hStripes(['#ff9933', '#ffffff', '#138808']), ...chakra(30, 20, 5.6)],
  th: hStripes(['#a51931', '#f4f5f8', '#2d2a4a', '#f4f5f8', '#a51931'], [1, 1, 2, 1, 1]),
  vn: [rect(0, 0, W, H, '#da251d'), star(30, 20.5, 11, '#ffff00')],
  id: hStripes(['#ce1126', '#ffffff']),
  au: [rect(0, 0, W, H, '#012169'), ...unionFlag(0, 0, 30, 20), star(15, 30, 5.4, '#ffffff', { n: 7, ri: 2.5 }), ...southernCross('#ffffff'), star(48.5, 24, 1.3, '#ffffff')],
  nz: [rect(0, 0, W, H, '#012169'), ...unionFlag(0, 0, 30, 20), ...southernCross('#cc142b', '#ffffff')],
  br: [
    rect(0, 0, W, H, '#009c3b'),
    poly([6, 20, 30, 4.5, 54, 20, 30, 35.5], '#ffdf00'),
    circle(30, 20, 10, '#002776'),
    group([20, 10, 20, 20], [{ d: 'M18 19.5c6-3.5 16-3.5 24 2.6v2.4c-8-6-18-6-24-2.4z', fill: '#ffffff' }]),
    star(26, 25, 0.8, '#ffffff'),
    star(31, 27, 0.8, '#ffffff'),
    star(34, 23.5, 0.8, '#ffffff'),
  ],
  ar: [...hStripes(['#74acdf', '#ffffff', '#74acdf']), ...sunRays(30, 20, 3.4, '#f6b40e')],
  cl: [rect(0, 0, W, H / 2, '#ffffff'), rect(0, H / 2, W, H / 2, '#d52b1e'), rect(0, 0, 20, 20, '#0039a6'), star(10, 10.4, 5, '#ffffff')],
  co: hStripes(['#fcd116', '#003893', '#ce1126'], [2, 1, 1]),
  za: [
    rect(0, 0, W, H / 2, '#e03c31'),
    rect(0, H / 2, W, H / 2, '#001489'),
    poly([0, 0, 9, 0, 29, 15, 60, 15, 60, 25, 29, 25, 9, 40, 0, 40], '#ffffff'),
    poly([0, 3.5, 4.5, 3.5, 25.5, 17.3, 60, 17.3, 60, 22.7, 25.5, 22.7, 4.5, 36.5, 0, 36.5], '#007749'),
    poly([0, 7.5, 17, 20, 0, 32.5], '#ffb81c'),
    poly([0, 10.5, 13, 20, 0, 29.5], '#000000'),
  ],
  ng: vStripes(['#008751', '#ffffff', '#008751']),
  gh: [...hStripes(['#ce1126', '#fcd116', '#006b3f']), star(30, 20.6, 6.5, '#000000')],
  jm: [
    rect(0, 0, W, H, '#009b3a'),
    poly([0, 0, 30, 20, 0, 40], '#000000'),
    poly([60, 0, 30, 20, 60, 40], '#000000'),
    band(0, 0, 60, 40, 6, '#fed100'),
    band(60, 0, 0, 40, 6, '#fed100'),
  ],
};


// ---------------------------------------------------------------------------------------------
// The finish of the hand-drawn flags (a copy of `flags.ts flagFinish`, so base flags can change theirs)
// ---------------------------------------------------------------------------------------------

/** Sheen and folds drawn over a flag's design (inside its outline). */
function nationalFinish(): Shape[] {
  return [
    poly([0, 0, 26, 0, 0, 22], '#ffffff', { alpha: 0.14 }),
    rect(16, 0, 5, H, '#000000', { alpha: 0.05 }),
    rect(36, 0, 6, H, '#000000', { alpha: 0.07 }),
    rect(22, 0, 3, H, '#ffffff', { alpha: 0.07 }),
    rect(0, H - 3, W, 3, '#000000', { alpha: 0.08 }),
  ];
}

/** The rounded field every national flag is cut to. */
const ROUNDED = roundRect(0, 0, W, H, 3, 'none').d;

/** National flags take no team colour; the paints only satisfy the shape renderer. */
const PAINTS: Paints = { team: 0x2f7df6 };

// ---------------------------------------------------------------------------------------------
// The markup and canvas paths of the router (`art.ts`): the hand-drawn fallback
// ---------------------------------------------------------------------------------------------

/** True when the visuals can draw `nationalFlag.<id>`: every vendored flag (and the hand-drawn fallbacks). */
export function hasNationalFlagArt(id: string): boolean {
  return VENDORED.has(id) || NATIONAL_FLAGS[id] !== undefined;
}

let clipSeq = 0;

/**
 * A hand-drawn flag as SVG markup (a 2-unit margin around the 60 x 40 field), or null: the fallback of
 * `cosmeticSvg` for the 50 flags of before 2026-10-08. The pictures players see are the vendored
 * designs ({@link nationalFlagUrl}).
 */
export function nationalFlagSvg(id: string): string | null {
  const shapes = NATIONAL_FLAGS[id];
  if (!shapes) return null;
  const clip = `nf${(clipSeq = (clipSeq + 1) % 1e6)}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${W + 4} ${H + 4}">` +
    `<defs><clipPath id="${clip}"><path d="${ROUNDED}"/></clipPath></defs>` +
    `<g clip-path="url(#${clip})">${shapesToSvg(shapes, PAINTS)}${shapesToSvg(nationalFinish(), PAINTS)}</g>` +
    `<path d="${ROUNDED}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></svg>`
  );
}

/**
 * Draws a hand-drawn flag into a canvas at `px` pixels per view-box unit, with a 2-unit margin: the
 * fallback of `drawFlag` for the 50 flags of before 2026-10-08. The lane flies {@link nationalFlagTexture}.
 */
export function drawNationalFlag(ctx: Ctx2D, id: string, px: number): boolean {
  const shapes = NATIONAL_FLAGS[id];
  if (!shapes) return false;
  ctx.save();
  ctx.scale(px, px);
  ctx.translate(2, 2);
  const outline = new Path2D(ROUNDED);
  ctx.save();
  ctx.clip(outline);
  drawShapes(ctx, shapes, PAINTS);
  drawShapes(ctx, nationalFinish(), PAINTS);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.stroke(outline);
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------------------------------------
// The Flag Atlas's rewards as base flags (PLAN 2d): six Region Pennants (Epic) and the World Compass
// (Legendary), on the 60 x 40 field and swallowtail cut of `flags.ts BASE_FLAGS` (team paints: the team
// reads first, A11). Each pennant is its continent's silhouette with a compass star.
// ---------------------------------------------------------------------------------------------

const GOLD = '#ffcf3a';
const GOLD_DEEP = '#c98a17';
const CREAM = '#f6ecd2';
const GLINT = '#fff3d6';

/** The continents in a 100 x 100 box (y down), each as its outline and islands. */
const CONTINENTS: Readonly<Record<string, readonly (readonly number[])[]>> = {
  europe: [
    [6, 70, 4, 62, 6, 55, 10, 52, 20, 52, 24, 47, 18, 41, 26, 39, 33, 35, 40, 33, 44, 31, 45, 23, 48, 23, 49, 31, 56, 31, 64, 29, 71, 25, 84, 19, 96, 21, 96, 56, 86, 58, 80, 61, 76, 64, 73, 70, 71, 78, 67, 81, 66, 74, 64, 66, 60, 60, 54, 57, 50, 56, 52, 61, 57, 67, 62, 72, 65, 74, 62, 77, 59, 76, 58, 83, 55, 83, 52, 75, 48, 67, 43, 61, 36, 61, 30, 61, 27, 65, 23, 72, 15, 77, 9, 76],
    [40, 21, 46, 11, 56, 4, 66, 2, 74, 6, 72, 13, 64, 13, 59, 19, 55, 27, 49, 29, 44, 27],
    [24, 37, 22, 31, 25, 25, 30, 19, 34, 23, 32, 29, 35, 35, 30, 39],
    [14, 31, 20, 29, 21, 35, 16, 37],
  ],
  asia: [
    [4, 32, 12, 27, 20, 24, 28, 17, 38, 12, 50, 9, 64, 6, 78, 7, 90, 10, 97, 16, 93, 21, 88, 22, 89, 30, 85, 36, 80, 38, 78, 46, 81, 54, 76, 60, 72, 66, 70, 74, 66, 80, 63, 76, 61, 68, 57, 63, 52, 64, 48, 72, 45, 76, 41, 66, 38, 56, 33, 55, 29, 53, 27, 60, 22, 67, 15, 70, 10, 63, 9, 54, 12, 46, 8, 41, 4, 38],
    [88, 40, 92, 44, 92, 52, 88, 57, 86, 52, 87, 46],
    [62, 86, 70, 84, 74, 88, 68, 90],
    [76, 88, 84, 86, 88, 90, 80, 92],
  ],
  africa: [
    [30, 6, 42, 3, 54, 5, 63, 8, 68, 11, 73, 13, 77, 21, 81, 30, 86, 34, 95, 34, 93, 40, 87, 47, 81, 55, 78, 64, 76, 71, 70, 79, 63, 88, 55, 95, 49, 93, 46, 85, 44, 75, 42, 65, 37, 57, 30, 52, 21, 50, 13, 47, 7, 41, 5, 32, 8, 23, 14, 15, 21, 10],
    [84, 66, 88, 70, 87, 80, 83, 86, 80, 82, 81, 72],
  ],
  northAmerica: [
    [3, 28, 8, 19, 16, 14, 26, 14, 34, 11, 44, 9, 50, 12, 52, 19, 57, 21, 60, 16, 62, 10, 70, 6, 80, 6, 88, 11, 93, 19, 87, 26, 82, 30, 79, 36, 76, 40, 73, 46, 72, 50, 75, 56, 74, 63, 70, 59, 68, 54, 62, 52, 56, 53, 52, 57, 52, 63, 57, 66, 60, 70, 65, 74, 70, 78, 68, 82, 61, 78, 55, 74, 48, 69, 42, 63, 37, 56, 32, 49, 28, 43, 24, 37, 20, 33, 14, 31, 8, 31],
  ],
  southAmerica: [
    [33, 3, 45, 2, 55, 6, 64, 11, 72, 15, 83, 21, 93, 29, 95, 36, 90, 45, 84, 55, 77, 61, 70, 66, 64, 73, 58, 80, 53, 87, 48, 96, 43, 97, 42, 90, 42, 80, 40, 68, 37, 56, 30, 46, 22, 38, 17, 30, 18, 21, 24, 12],
  ],
  oceania: [
    [10, 52, 16, 44, 26, 38, 34, 38, 40, 32, 46, 32, 50, 38, 54, 30, 57, 24, 60, 34, 66, 42, 70, 52, 68, 62, 61, 70, 52, 74, 44, 72, 37, 68, 30, 66, 22, 68, 14, 66, 9, 60],
    [50, 79, 56, 78, 55, 84, 51, 84],
    [80, 60, 84, 58, 88, 64, 86, 70, 82, 68],
    [76, 72, 80, 72, 79, 80, 74, 86, 72, 82],
    [56, 12, 70, 13, 80, 18, 76, 21, 66, 19, 58, 17],
  ],
};

/** A continent's path in the emblem box: its 100-unit drawing scaled by `s` with its top left at (x, y). */
function continentPath(id: string, x: number, y: number, s: number): string {
  return (CONTINENTS[id] ?? []).map((pts) => polyPath(pts.map((v, i) => (i % 2 === 0 ? x : y) + v * s))).join('');
}

/** The cloth of a reward flag: the team field with its light and shade bands, the gold hoist and a gold edge. */
function rewardField(edge: number): Shape[] {
  return [
    rect(0, 0, FLAG_W, FLAG_H, 'team'),
    rect(0, 0, FLAG_W, 5, 'teamLight', { alpha: 0.55 }),
    rect(0, 35, FLAG_W, 5, 'teamDark', { alpha: 0.6 }),
    // three weave strokes (AUDIT §3.1 texture)
    line('M14 4L22 12M30 26L37 33M40 6L46 12', 'teamDark', 0.7, { alpha: 0.35, lo: true }),
    // the edge follows the swallowtail (the cut clips its outer half away)
    line(BANNER_OUTLINE, GOLD, edge * 2, { cap: 'butt' }),
    line(BANNER_OUTLINE, GOLD_DEEP, 0.9, { cap: 'butt', alpha: 0.9 }),
    rect(0, 0, 4.5, FLAG_H, GOLD),
    rect(4.5, 0, 1.2, FLAG_H, GOLD_DEEP),
    rect(1, 0, 1.2, FLAG_H, GLINT, { alpha: 0.6 }),
  ];
}

/**
 * A compass rose: four long points and four short ones, each split along its axis into a lit and a
 * shaded half (the classic two-tone rose; the light comes from the top left), outlined in the gold's own
 * dark, with a glinting hub.
 */
function compassStar(cx: number, cy: number, r: number): Shape[] {
  const out: Shape[] = [];
  const point = (deg: number, len: number, half: number, lit: string, dark: string): void => {
    const a = (deg * Math.PI) / 180;
    const tip = [cx + Math.sin(a) * len, cy - Math.cos(a) * len];
    const l = [cx + Math.sin(a - Math.PI / 2) * half, cy - Math.cos(a - Math.PI / 2) * half];
    const rr = [cx + Math.sin(a + Math.PI / 2) * half, cy - Math.cos(a + Math.PI / 2) * half];
    // the half facing the top left is lit
    const leftLit = Math.sin(a - Math.PI / 4) <= 0;
    out.push(poly([cx, cy, tip[0]!, tip[1]!, l[0]!, l[1]!], leftLit ? lit : dark), poly([cx, cy, tip[0]!, tip[1]!, rr[0]!, rr[1]!], leftLit ? dark : lit));
  };
  for (const deg of [45, 135, 225, 315]) point(deg, r * 0.64, r * 0.24, CREAM, '#cbb98f');
  for (const deg of [0, 90, 180, 270]) point(deg, r, r * 0.3, GOLD, GOLD_DEEP);
  const outline: number[] = [];
  for (let i = 0; i < 16; i += 1) {
    const deg = i * 22.5;
    const a = (deg * Math.PI) / 180;
    const rr = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.64 : r * 0.27;
    outline.push(cx + Math.sin(a) * rr, cy - Math.cos(a) * rr);
  }
  out.push(poly(outline, 'none', { stroke: '#6b4a10', width: 0.5 }));
  out.push(circle(cx, cy, r * 0.13, GLINT, { stroke: '#6b4a10', width: 0.4 }));
  return out;
}

/** A Region Pennant: the continent in cream (cel band, outline in its own dark) and a compass star at the top of the fly. */
function pennant(region: string): Shape[] {
  // Europe reaches furthest to the north-east: a touch smaller, so it clears the star
  const [x, y, s] = region === 'europe' ? [8.5, 8, 0.26] : [9.5, 6.5, 0.28];
  return [...rewardField(1.5), cel(continentPath(region, x, y, s), CREAM, { sh: 1.4, hl: 0.8, ln: 1.1 }), ...compassStar(43, 9.6, 7)];
}

/** The World Compass: a gold globe ring with meridians behind a large compass rose, sparkles at the corners. */
function worldCompass(): Shape[] {
  const cx = 26;
  const cy = 20;
  return [
    ...rewardField(2),
    circle(cx, cy, 12.6, 'teamDark', { alpha: 0.55 }),
    ring(cx, cy, 12.6, GOLD, 2.2),
    { d: `M${cx} ${cy - 12.6}C${cx - 7} ${cy - 6} ${cx - 7} ${cy + 6} ${cx} ${cy + 12.6}M${cx} ${cy - 12.6}C${cx + 7} ${cy - 6} ${cx + 7} ${cy + 6} ${cx} ${cy + 12.6}M${cx - 12.3} ${cy - 3}H${cx + 12.3}M${cx - 12.3} ${cy + 3.4}H${cx + 12.3}`, stroke: GOLD, width: 0.8, fill: 'none', alpha: 0.8 },
    ...compassStar(cx, cy, 15.5),
    star(46, 7, 2.4, GLINT, { n: 4, ri: 0.6 }),
    star(44, 33, 1.8, GLINT, { n: 4, ri: 0.5 }),
    star(9.5, 33.5, 1.6, GLINT, { n: 4, ri: 0.45 }),
  ];
}

/**
 * The finish tier `art.ts` gives each reward base flag (PLAN 2d: the Region Pennants are Epic-styled, the
 * World Compass Legendary), matching their item rarities.
 */
export const REGION_PENNANT_TIER: Readonly<Record<string, FlagTier>> = {
  pennant_europe: 'epic',
  pennant_asia: 'epic',
  pennant_africa: 'epic',
  pennant_north_america: 'epic',
  pennant_south_america: 'epic',
  pennant_oceania: 'epic',
  world_compass: 'legendary',
};

/**
 * The Flag Atlas's region and total rewards as base flags, by item id (`raw/nationalFlags.ts
 * flagRewardItems`). `art.ts` draws a base flag from here when `BASE_FLAGS` has no design for it, with
 * the same cut, finish and outline.
 */
export const REGION_PENNANTS: Readonly<Record<string, readonly Shape[]>> = {
  pennant_europe: pennant('europe'),
  pennant_asia: pennant('asia'),
  pennant_africa: pennant('africa'),
  pennant_north_america: pennant('northAmerica'),
  pennant_south_america: pennant('southAmerica'),
  pennant_oceania: pennant('oceania'),
  world_compass: worldCompass(),
};
