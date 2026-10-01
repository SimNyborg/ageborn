/**
 * Bakes parts into runtime texture atlases (DESIGN B5: "baked once at load into a runtime texture
 * atlas at min(devicePixelRatio, 2) (1 in Lite)").
 *
 * Each part becomes up to five textures on a shared atlas page:
 *  - `main`   the layers below the team layers (or the whole part when it has none)
 *  - `team`   the team layers in grey, tinted with the team colour at runtime (Team colour contract)
 *  - `teamStriped` the same with the high-contrast banner stripes
 *  - `over`   layers above the team layers plus the team layers' highlights
 *  - `white`  the silhouette, used for hit flashes (tinted for coloured flashes)
 *
 * Canvas 2D draws the SVG path data (exact nonzero fills, round-joined outlines); pages are Pixi
 * `CanvasSource`s whose resolution is the bake scale, so texture sizes are in lu and sprites need
 * no scaling. Without a DOM (Node tests) the baker hands out empty textures with correct bounds.
 */
import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import { partBounds, drawPart, splitLayers, type LayerGroup } from './draw';
import { isTeamZone, resolveZone, type Palette } from './palette';
import { STYLE } from './style';
import { IDENTITY, pathBounds, type Bounds } from './svg';
import { CanvasTarget } from './targets';
import type { PartDef } from './types';

export interface BakedPart {
  /** Top-left of every texture of this part, in part-local lu (sprites go here). */
  origin: { x: number; y: number };
  bounds: Bounds;
  main: Texture;
  team: Texture | null;
  teamStriped: Texture | null;
  over: Texture | null;
  white: Texture;
}

export interface BakeStats {
  parts: number;
  textures: number;
  pages: number;
  ms: number;
  pixels: number;
}

export interface BakerOptions {
  /** Pixels per lu in the atlas (world scale x min(devicePixelRatio, 2)). */
  pxPerLu: number;
  pageSize?: number;
  /**
   * Page size for parts baked one at a time while a battle runs (after `seal()`), default 512. A new
   * part on a 2048 page re-uploaded the whole 16 MB page (perf audit 2026-10-01: about 30 uploads a
   * minute, 20-50 ms each on a phone); on a 512 page the upload is 1 MB.
   */
  runtimePageSize?: number;
  /** Returns a canvas, or null when there is no DOM. */
  canvasFactory?: (w: number, h: number) => HTMLCanvasElement | OffscreenCanvas | null;
}

interface Page {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  source: CanvasSource;
  x: number;
  y: number;
  shelfH: number;
  dirty: boolean;
  /** Width and height in px. */
  size: number;
  /** A small page for one-at-a-time bakes (see `BakerOptions.runtimePageSize`). */
  runtime: boolean;
}

const PAD = 2;

function defaultCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Whether a team layer paints a highlight (then the part needs an `over` texture). */
function teamHighlights(part: PartDef): boolean {
  return splitLayers(part).team.some((l) => {
    if (l.light === false) return false;
    if (typeof l.light === 'string' && l.light !== 'auto') return true;
    const b = pathBounds(l.d);
    return Math.min(b.maxX - b.minX, b.maxY - b.minY) >= STYLE.autoShadeMinLu;
  });
}

export class PartBaker {
  readonly stats: BakeStats = { parts: 0, textures: 0, pages: 0, ms: 0, pixels: 0 };
  private readonly cache = new Map<string, BakedPart>();
  private readonly pages: Page[] = [];
  private readonly pageSize: number;
  private readonly runtimePageSize: number;
  /** Bulk bakes (boot, an age's preload) fill the big pages; after `seal()` single bakes use small ones. */
  private sealed = false;
  private bulkDepth = 0;
  private readonly makeCanvas: (w: number, h: number) => HTMLCanvasElement | OffscreenCanvas | null;
  readonly enabled: boolean;

  constructor(readonly o: BakerOptions) {
    this.pageSize = o.pageSize ?? 2048;
    this.runtimePageSize = Math.min(this.pageSize, o.runtimePageSize ?? 512);
    this.makeCanvas = o.canvasFactory ?? defaultCanvas;
    this.enabled = this.makeCanvas(1, 1) !== null;
  }

  get pxPerLu(): number {
    return this.o.pxPerLu;
  }

  /** Cache key: part, tone and the colours of the non-team zones it uses. */
  static key(part: PartDef, palette: Palette, tone: number): string {
    const zones = new Set<string>();
    for (const l of part.layers) if (!isTeamZone(l.zone)) zones.add(l.zone);
    const cols = [...zones].sort().map((z) => `${z}=${(resolveZone(palette, z) ?? -1).toString(16)}`);
    return `${part.id}|${tone}|${cols.join(',')}`;
  }

  has(part: PartDef, palette: Palette, tone = 0): boolean {
    return this.cache.has(PartBaker.key(part, palette, tone));
  }

  /** The baked textures of a part (baked now if needed). */
  get(part: PartDef, palette: Palette, tone = 0): BakedPart {
    const key = PartBaker.key(part, palette, tone);
    const hit = this.cache.get(key);
    if (hit) return hit;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const baked = this.bake(part, palette, tone);
    if (typeof performance !== 'undefined') this.stats.ms += performance.now() - t0;
    this.cache.set(key, baked);
    this.stats.parts++;
    return baked;
  }

  /**
   * Ends the boot bake: from now on a part baked on its own (an effect seen for the first time) goes
   * to a small page, so its upload stays small. `bulk()` bakes still fill the big pages.
   */
  seal(): void {
    this.sealed = true;
  }

  /** Runs a bulk bake (an age's preload): its parts go to the big pages and upload once at the end. */
  async bulk<T>(run: () => Promise<T> | T): Promise<T> {
    this.bulkDepth++;
    try {
      return await run();
    } finally {
      this.bulkDepth--;
    }
  }

  /** Uploads pages that changed since the last flush. */
  flush(): void {
    for (const p of this.pages) {
      if (p.dirty) {
        p.source.update();
        p.dirty = false;
      }
    }
  }

  /** The atlas pages (for the gallery's bake view). */
  pageCanvases(): (HTMLCanvasElement | OffscreenCanvas)[] {
    return this.pages.map((p) => p.canvas);
  }

  destroy(): void {
    for (const p of this.pages) p.source.destroy();
    this.pages.length = 0;
    this.cache.clear();
  }

  private bake(part: PartDef, palette: Palette, tone: number): BakedPart {
    const b = partBounds(part);
    const s = this.o.pxPerLu;
    const origin = { x: b.minX - PAD / s, y: b.minY - PAD / s };
    if (!this.enabled) {
      return { origin, bounds: b, main: Texture.EMPTY, team: null, teamStriped: null, over: null, white: Texture.EMPTY };
    }
    const w = Math.ceil((b.maxX - b.minX) * s) + PAD * 2;
    const h = Math.ceil((b.maxY - b.minY) * s) + PAD * 2;
    const split = splitLayers(part);
    const hasTeam = split.team.length > 0;
    const hasBanner = split.team.some((l) => l.banner);
    const draw = (group: LayerGroup, stripes = false): Texture => {
      const slot = this.alloc(w, h);
      if (!slot) return Texture.EMPTY;
      const { page, x, y } = slot;
      const t = new CanvasTarget(page.ctx, [s, 0, 0, s, x + PAD - b.minX * s, y + PAD - b.minY * s]);
      drawPart(part, t, IDENTITY, { palette, teamColor: null, group, tone: tone || undefined, stripes });
      page.dirty = true;
      this.stats.textures++;
      this.stats.pixels += w * h;
      return new Texture({ source: page.source, frame: new Rectangle(x / s, y / s, w / s, h / s) });
    };
    const baked: BakedPart = {
      origin,
      bounds: b,
      main: draw(hasTeam ? 'under' : 'all'),
      team: hasTeam ? draw('team') : null,
      teamStriped: hasBanner ? draw('team', true) : null,
      over: hasTeam && (split.over.length > 0 || teamHighlights(part)) ? draw('over') : null,
      white: draw('white'),
    };
    return baked;
  }

  private alloc(w: number, h: number): { page: Page; x: number; y: number } | null {
    if (w > this.pageSize || h > this.pageSize) return null;
    const runtime = this.sealed && this.bulkDepth === 0;
    // a runtime part too big for a small page gets a page of its own size class
    let want = this.pageSize;
    if (runtime) {
      want = this.runtimePageSize;
      while (want < this.pageSize && (w > want || h > want)) want *= 2;
    }
    let page: Page | undefined;
    for (let i = this.pages.length - 1; i >= 0; i--) {
      const p = this.pages[i]!;
      if (p.runtime === runtime && p.size === want) {
        page = p;
        break;
      }
    }
    const size = want;
    if (page && page.x + w > size) {
      page.x = 0;
      page.y += page.shelfH;
      page.shelfH = 0;
    }
    if (!page || page.y + h > size) {
      const fresh = this.newPage(size, runtime);
      if (!fresh) return null;
      page = fresh;
    }
    const x = page.x;
    const y = page.y;
    page.x += w;
    page.shelfH = Math.max(page.shelfH, h);
    return { page, x, y };
  }

  private newPage(size: number, runtime: boolean): Page | null {
    const canvas = this.makeCanvas(size, size);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return null;
    // Create at resolution 1 (keeps the canvas size exact), then set the bake scale so texture
    // sizes read in lu.
    const source = new CanvasSource({ resource: canvas, resolution: 1 });
    source.resolution = this.o.pxPerLu;
    const page: Page = { canvas, ctx, source, x: 0, y: 0, shelfH: 0, dirty: false, size, runtime };
    this.pages.push(page);
    this.stats.pages++;
    return page;
  }
}
