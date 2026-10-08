/**
 * Decoded image memory (G7, Safari memory, 2026-10-08): what the art holds as decoded pixels, for the
 * `?dev=1` hook (`window.__agebornDev.memory()`) and the e2e budget test. iOS ends a Safari tab at
 * about 1-2 GB, and the HD unit sheets were the largest part of it (4096 x 4032 px each, up to 66 MB
 * decoded).
 *
 * - `gpu`: every texture the renderer has uploaded (width x height x 4, a third more with mipmaps).
 * - `cpu`: the decoded copies the page still keeps on the CPU side: the resources behind Pixi texture
 *   sources (ImageBitmaps, images, canvases; a closed ImageBitmap counts 0) and the images the art
 *   caches hold for the menus (`ImageLedger`). The DOM's own `<img>` elements are the browser's and are
 *   not counted.
 *
 * Presentation only: nothing here reaches the sim.
 */
import { Cache, Spritesheet, Texture, type TextureSource } from 'pixi.js';

/** Bytes of decoded pixels a texture resource holds on the CPU side (0 for a closed ImageBitmap). */
export function resourceBytes(r: unknown): number {
  if (!r || typeof r !== 'object') return 0;
  if (typeof ImageBitmap !== 'undefined' && r instanceof ImageBitmap) return r.width * r.height * 4;
  if (typeof HTMLImageElement !== 'undefined' && r instanceof HTMLImageElement) return r.complete ? r.naturalWidth * r.naturalHeight * 4 : 0;
  if (typeof HTMLCanvasElement !== 'undefined' && r instanceof HTMLCanvasElement) return r.width * r.height * 4;
  if (typeof OffscreenCanvas !== 'undefined' && r instanceof OffscreenCanvas) return r.width * r.height * 4;
  if (ArrayBuffer.isView(r)) return r.byteLength;
  return 0;
}

/** GPU bytes of an uploaded texture source (RGBA8; mipmaps add a third). */
function gpuBytes(s: TextureSource): number {
  const base = Math.max(1, s.pixelWidth) * Math.max(1, s.pixelHeight) * 4;
  return s.mipLevelCount > 1 ? Math.round((base * 4) / 3) : base;
}

/** Decoded images an art cache holds outside Pixi (menu portraits, scene strips, world sheets). */
export class ImageLedger {
  private readonly held = new Map<string, HTMLImageElement>();
  set(url: string, img: HTMLImageElement): void {
    this.held.set(url, img);
  }
  delete(url: string): void {
    this.held.delete(url);
  }
  get size(): number {
    return this.held.size;
  }
  images(): IterableIterator<HTMLImageElement> {
    return this.held.values();
  }
}

const ledgers = new Map<string, ImageLedger>();

/** The ledger of one image cache, by name (created on first use). */
export function imageLedger(name: string): ImageLedger {
  let l = ledgers.get(name);
  if (!l) {
    l = new ImageLedger();
    ledgers.set(name, l);
  }
  return l;
}

/** Texture sources the art tiers loaded themselves (unit sheets), so a source not uploaded yet still counts. */
const tracked = new Set<TextureSource>();

/** Counts a loaded sheet's source until it is destroyed. */
export function trackSource(s: TextureSource): void {
  if (tracked.has(s)) return;
  tracked.add(s);
  s.once('destroy', () => tracked.delete(s));
}

export interface TextureMemory {
  /** Decoded copies on the CPU side, bytes. */
  cpu: number;
  /** Textures uploaded to the GPU, bytes. */
  gpu: number;
  /** cpu + gpu. */
  total: number;
  /** Texture sources counted (uploaded or loaded). */
  sources: number;
  /** Per image cache: images held and their decoded bytes. */
  caches: Record<string, { images: number; bytes: number }>;
}

/** Sums the decoded image memory now. `renderer`: the app's Pixi renderer (its uploaded textures). */
export function textureMemory(renderer?: unknown): TextureMemory {
  const seen = new Set<TextureSource>();
  let gpu = 0;
  const managed = (renderer as { texture?: { managedTextures?: readonly (TextureSource | null)[] } } | undefined)?.texture?.managedTextures ?? [];
  for (const s of managed) {
    if (!s || s.destroyed) continue;
    seen.add(s);
    gpu += gpuBytes(s);
  }
  // sheets and images Pixi's loader holds, uploaded or not
  const cache = (Cache as unknown as { _cache?: Map<string, unknown> })._cache;
  for (const v of cache?.values() ?? []) {
    if (v instanceof Spritesheet && v.textureSource && !v.textureSource.destroyed) seen.add(v.textureSource);
    else if (v instanceof Texture && v.source && !v.source.destroyed) seen.add(v.source);
  }
  for (const s of tracked) if (!s.destroyed) seen.add(s);
  // one decoded copy per resource: a cached image a Pixi texture also draws counts once
  const counted = new Set<unknown>();
  let cpu = 0;
  for (const s of seen) {
    if (counted.has(s.resource)) continue;
    counted.add(s.resource);
    cpu += resourceBytes(s.resource);
  }
  const caches: Record<string, { images: number; bytes: number }> = {};
  for (const [name, l] of ledgers) {
    let bytes = 0;
    for (const im of l.images()) {
      if (counted.has(im)) continue;
      counted.add(im);
      bytes += resourceBytes(im);
    }
    caches[name] = { images: l.size, bytes };
    cpu += bytes;
  }
  return { cpu, gpu, total: cpu + gpu, sources: seen.size, caches };
}
