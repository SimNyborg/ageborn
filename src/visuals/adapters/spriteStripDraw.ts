/**
 * Drawing a unit sheet's clip as a sprite strip (UI art audit #6), shared by the strip worker
 * (`spriteStripWorker.ts`, an OffscreenCanvas off the main thread) and the main-thread fallback
 * (`spriteStrip.ts`). Pure: no imports, no DOM and no globals, so the worker bundle stays a few KB and the
 * same code draws on either side.
 *
 * Each frame of the clip goes into a square cell over its grey `_team` twin tinted in the side's colour
 * (the lane's "tint-underlay" rule), every frame at one scale and standing on one foot line: the union of the
 * frames (and their team twins) fills 96% of the cell, centred, 2% above its bottom edge.
 *
 * The layout also says where the strip puts the unit (`StripInfo`): the feet (the frames' shared anchor) in a
 * cell, the cell px per lu at which the lane draws the unit, its head height, the clip's length and the union
 * of the drawn frames as the atlas view measures it (`extentLu`: the base frames' trimmed rectangles). The
 * still island places the strip by its feet and scale, exactly where the live layer draws the troop.
 */

export interface StripRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One frame of a TexturePacker-style sheet (the Blender pipeline writes no rotated frames). */
export interface StripSheetFrame {
  frame: StripRect;
  spriteSourceSize: StripRect;
  sourceSize: { w: number; h: number };
  /** The feet in the untrimmed frame, as fractions of `sourceSize`. */
  anchor?: { x: number; y: number };
}

/** The parts of a unit sheet's JSON the strip reads. */
export interface StripSheet {
  frames: Record<string, StripSheetFrame>;
  animations: Record<string, string[]>;
  meta: {
    image: string;
    ageborn?: { pxPerLu?: number; heightLu?: number; feetPx?: readonly number[]; clips?: Record<string, { durationMs?: number } | undefined> };
  };
}

/**
 * Where a strip puts its unit and how to play it, in one cell's px (y down). The still island reads it
 * through the portrait channel (`stripinfo:<clip>:<card>`, a JSON data URL; `spriteStrip.ts`).
 */
export interface StripInfo {
  /** Frames side by side (square cells of `cell` px). */
  frames: number;
  cell: number;
  /** The clip's length at the battle's pace (ms; 0 when the sheet does not say). */
  ms: number;
  /** The feet in a cell. */
  feet: [number, number];
  /** Cell px per lu at the size the lane draws the unit. */
  pxPerLu: number;
  /** Height of the head anchor above the feet (lu): the live island sizes troops by it. */
  headLu: number;
  /** The drawn frames' union (x0, x1, y0, y1; the base frames' trimmed rectangles). */
  box: [number, number, number, number];
}

export interface StripLayout {
  frames: { base: StripSheetFrame; team: StripSheetFrame | null }[];
  size: number;
  /** Cell px per sheet px, and where the sheet's frame origin lands in a cell. */
  k: number;
  ox: number;
  oy: number;
  info: StripInfo;
}

/** A canvas 2D context on either side (a DOM canvas or an OffscreenCanvas). */
export interface StripCtx {
  readonly canvas: unknown;
  globalCompositeOperation: string;
  fillStyle: string | CanvasGradient | CanvasPattern;
  imageSmoothingQuality: ImageSmoothingQuality;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number): void;
}

/**
 * The strips' canvases ask for a CPU-backed 2D context: a few small blits and one PNG encode need no GPU, and a
 * GPU canvas would queue behind the page's own GPU work while Home starts and need a readback to encode (seen
 * at about 1 s a strip while Home's island started).
 */
export const CPU_2D: CanvasRenderingContext2DSettings = { willReadFrequently: true };

/** The share of a cell the frames' union fills, and how far above the bottom edge they stand. */
const FILL = 0.96;
const FOOT = 0.02;

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Lays out `clip` of a sheet in square cells of `size` px. `heightLu` is the manifest entry's height (the
 * atlas view rescales a sheet whose own height differs by more than 2%), `headLu` its head anchor's height.
 * Null when the clip is missing or a frame is.
 */
export function stripLayout(json: StripSheet, clip: string, size: number, o: { heightLu?: number; headLu: number }): StripLayout | null {
  const names = json.animations[clip];
  if (!names || names.length === 0) return null;
  const frames = names.map((n) => ({ base: json.frames[n], team: json.frames[`${n}_team`] ?? null }));
  if (frames.some((f) => !f.base)) return null;
  const cell = Math.max(8, Math.round(size));
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let bx0 = Infinity;
  let by0 = Infinity;
  let bx1 = -Infinity;
  let by1 = -Infinity;
  for (const f of frames) {
    for (const fr of [f.base!, f.team]) {
      if (!fr) continue;
      const s = fr.spriteSourceSize;
      x0 = Math.min(x0, s.x);
      y0 = Math.min(y0, s.y);
      x1 = Math.max(x1, s.x + s.w);
      y1 = Math.max(y1, s.y + s.h);
      if (fr !== f.base) continue;
      bx0 = Math.min(bx0, s.x);
      by0 = Math.min(by0, s.y);
      bx1 = Math.max(bx1, s.x + s.w);
      by1 = Math.max(by1, s.y + s.h);
    }
  }
  if (!(x1 > x0) || !(y1 > y0)) return null;
  const k = Math.min((cell * FILL) / (x1 - x0), (cell * FILL) / (y1 - y0));
  const ox = cell / 2 - ((x0 + x1) / 2) * k;
  const oy = cell - cell * FOOT - y1 * k;
  // the feet: the frames' shared anchor (else the sheet's feet, else the bottom middle of the frame)
  const first = frames[0]!.base!;
  const a = first.anchor;
  const feetPx = json.meta.ageborn?.feetPx;
  const fx = a ? a.x * first.sourceSize.w : (feetPx?.[0] ?? first.sourceSize.w / 2);
  const fy = a ? a.y * first.sourceSize.h : (feetPx?.[1] ?? first.sourceSize.h);
  // the atlas view: lu = sheet px / pxPerLu, times the manifest's height over the sheet's when they differ by over 2%
  const m = json.meta.ageborn;
  const pxPerLu = m?.pxPerLu && m.pxPerLu > 0 ? m.pxPerLu : 1;
  const hk = o.heightLu && m?.heightLu && m.heightLu > 0 ? o.heightLu / m.heightLu : 1;
  const luPerPx = (Math.abs(hk - 1) > 0.02 ? hk : 1) / pxPerLu;
  const ms = m?.clips?.[clip]?.durationMs ?? 0;
  return {
    frames: frames as StripLayout['frames'],
    size: cell,
    k,
    ox,
    oy,
    info: {
      frames: frames.length,
      cell,
      ms: ms > 0 ? Math.round(ms) : 0,
      feet: [round2(ox + fx * k), round2(oy + fy * k)],
      pxPerLu: Math.round((k / luPerPx) * 10000) / 10000,
      headLu: round2(o.headLu),
      box: [round2(ox + bx0 * k), round2(ox + bx1 * k), round2(oy + by0 * k), round2(oy + by1 * k)],
    },
  };
}

const css = (c: number): string => `#${(c & 0xffffff).toString(16).padStart(6, '0')}`;

/**
 * Draws a laid-out strip from the sheet's `image` into `ctx` (a `frames x size` by `size` canvas), each frame
 * over its team twin tinted `teamColor`; `tmp` is a `size` square scratch canvas.
 */
export function drawStrip(ctx: StripCtx, tmp: StripCtx, image: CanvasImageSource, layout: StripLayout, teamColor: number): void {
  const { size, k, ox, oy } = layout;
  ctx.imageSmoothingQuality = 'high';
  tmp.imageSmoothingQuality = 'high';
  const blit = (target: StripCtx, fr: StripSheetFrame, dx: number): void => {
    const r = fr.frame;
    const s = fr.spriteSourceSize;
    target.drawImage(image, r.x, r.y, r.w, r.h, dx + ox + s.x * k, oy + s.y * k, s.w * k, s.h * k);
  };
  layout.frames.forEach((f, i) => {
    if (f.team) {
      tmp.globalCompositeOperation = 'source-over';
      tmp.clearRect(0, 0, size, size);
      blit(tmp, f.team, 0);
      tmp.globalCompositeOperation = 'multiply';
      tmp.fillStyle = css(teamColor);
      tmp.fillRect(0, 0, size, size);
      tmp.globalCompositeOperation = 'destination-in';
      blit(tmp, f.team, 0);
      ctx.drawImage(tmp.canvas as CanvasImageSource, i * size, 0);
    }
    blit(ctx, f.base, i * size);
  });
  tmp.globalCompositeOperation = 'source-over';
}

/**
 * What the two drawing functions draw with besides their own text: the cell's fill and foot line (the build
 * inlines them, or refers to them by name) and the helpers they call, as this build wrote them (review 2 N-e: the
 * functions' text alone missed a change of `FILL`, `FOOT`, `round2` or `css`).
 */
export function drawParts(): string {
  return `${round2.toString()}\n${css.toString()}\nfill ${FILL} foot ${FOOT}`;
}

/**
 * A short fingerprint of the strip renderer: this module's two drawing functions, the helpers they call and the
 * constants they draw with, as the build wrote them (part of every kept strip's key, so a release that changes
 * how strips are drawn never shows an old one).
 */
export function stripRendererTag(): string {
  const fns = stripLayout.toString() + drawStrip.toString();
  const parts = drawParts();
  return `${fns.length}.${parts.length}.${fnv(`${fns}\n${parts}`)}`;
}

/** 32-bit FNV-1a of a string (a fingerprint, not security). */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
