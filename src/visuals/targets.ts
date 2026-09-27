/**
 * Draw targets for `draw.ts`: canvas 2D (bake, portraits, gallery), the Node rasteriser (tests) and
 * an SVG writer (artist handoff sheets). All three consume the same SVG path data.
 */
import type { DrawTarget, PaintTag } from './draw';
import { toCss } from './palette';
import { andMasks, type Raster } from './raster';
import { fmt, matMul, type Mat } from './svg';

// ---------------------------------------------------------------------------------------------
// Canvas 2D

const path2dCache = new Map<string, Path2D>();

function path2d(d: string): Path2D {
  let p = path2dCache.get(d);
  if (!p) {
    p = new Path2D(d);
    path2dCache.set(d, p);
  }
  return p;
}

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export class CanvasTarget implements DrawTarget {
  constructor(
    readonly ctx: Ctx2D,
    /** lu → canvas pixels. */
    readonly base: Mat,
  ) {}

  private set(m: Mat): void {
    const t = matMul(this.base, m);
    this.ctx.setTransform(t[0], t[1], t[2], t[3], t[4], t[5]);
  }

  fill(d: string, m: Mat, color: number, alpha: number, clip: { d: string; m: Mat } | null, _tag: PaintTag): void {
    const ctx = this.ctx;
    ctx.save();
    if (clip) {
      this.set(clip.m);
      ctx.clip(path2d(clip.d));
    }
    this.set(m);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = toCss(color);
    ctx.fill(path2d(d));
    ctx.restore();
  }

  stroke(d: string, m: Mat, width: number, color: number, alpha: number, _tag: PaintTag): void {
    const ctx = this.ctx;
    ctx.save();
    this.set(m);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = toCss(color);
    ctx.stroke(path2d(d));
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Rasteriser (Node tests and in-browser checks)

export class RasterTarget implements DrawTarget {
  private lastKey = '';
  private lastMask: Uint8Array | null = null;

  constructor(readonly raster: Raster) {}

  private cover(d: string, m: Mat): Uint8Array {
    const key = `${m.join(',')}|${d}`;
    if (key === this.lastKey && this.lastMask) return this.lastMask;
    const mask = this.raster.coverFill(d, m);
    this.lastKey = key;
    this.lastMask = mask;
    return mask;
  }

  fill(d: string, m: Mat, color: number, alpha: number, clip: { d: string; m: Mat } | null, tag: PaintTag): void {
    let mask = this.raster.coverFill(d, m);
    if (clip) mask = andMasks(mask, this.cover(clip.d, clip.m));
    this.raster.paint(mask, color, alpha, tag.team);
  }

  stroke(d: string, m: Mat, width: number, color: number, alpha: number, tag: PaintTag): void {
    this.raster.paint(this.raster.coverStroke(d, m, width), color, alpha, tag.team);
  }
}

// ---------------------------------------------------------------------------------------------
// SVG writer (handoff sheets for artists and image generators, DESIGN B5 Art gallery)

export class SvgTarget implements DrawTarget {
  readonly body: string[] = [];
  readonly defs: string[] = [];
  private clipIds = new Map<string, string>();

  /** `idPrefix` keeps clip-path ids unique when several targets share one SVG document. */
  constructor(
    readonly base: Mat = [1, 0, 0, 1, 0, 0],
    readonly idPrefix = 'c',
  ) {}

  private tf(m: Mat): string {
    const t = matMul(this.base, m);
    return `matrix(${t.map(fmt).join(' ')})`;
  }

  private clipRef(clip: { d: string; m: Mat }): string {
    const key = `${clip.m.join(',')}|${clip.d}`;
    let id = this.clipIds.get(key);
    if (!id) {
      id = `${this.idPrefix}${this.clipIds.size + 1}`;
      this.clipIds.set(key, id);
      this.defs.push(`<clipPath id="${id}"><path d="${clip.d}" transform="${this.tf(clip.m)}"/></clipPath>`);
    }
    return id;
  }

  fill(d: string, m: Mat, color: number, alpha: number, clip: { d: string; m: Mat } | null, tag: PaintTag): void {
    const op = alpha < 1 ? ` fill-opacity="${fmt(alpha)}"` : '';
    const team = tag.team ? ' data-zone="team"' : '';
    const path = `<path d="${d}" transform="${this.tf(m)}" fill="${toCss(color)}"${op}${team}/>`;
    this.body.push(clip ? `<g clip-path="url(#${this.clipRef(clip)})">${path}</g>` : path);
  }

  stroke(d: string, m: Mat, width: number, color: number, alpha: number, tag: PaintTag): void {
    const op = alpha < 1 ? ` stroke-opacity="${fmt(alpha)}"` : '';
    const team = tag.team ? ' data-zone="team"' : '';
    this.body.push(
      `<path d="${d}" transform="${this.tf(m)}" fill="none" stroke="${toCss(color)}" stroke-width="${fmt(width)}" stroke-linejoin="round" stroke-linecap="round"${op}${team}/>`,
    );
  }

  /** A complete SVG document of the given size (px). */
  toSvg(width: number, height: number, background?: string): string {
    const bg = background ? `<rect width="100%" height="100%" fill="${background}"/>` : '';
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(width)} ${fmt(height)}">` +
      `<defs>${this.defs.join('')}</defs>${bg}${this.body.join('')}</svg>`
    );
  }
}
