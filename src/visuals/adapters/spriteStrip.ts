/**
 * Sprite strips for the menus (UI art audit #6): one clip of a unit's Blender sheet (`idle`, `walk`)
 * composited into a horizontal strip of square cells, each frame over its grey `_team` twin tinted in
 * the side's colour, every frame standing on the same foot line (`spriteStripDraw.ts`). The UI plays the
 * strip with CSS `steps()` (it may not import Pixi or the visuals, B2), so the War Path's banner-bearer, the
 * Home card and Home's still island animate with the battle's own drawings.
 *
 * The UI asks through `ArtProvider.portrait` with the card id `strip:<clip>:<card>` (see `stripRequest`), so no
 * new contract field is needed; the frame count is the strip's width over its height. `stripinfo:<clip>:<card>`
 * answers with the strip's layout (`StripInfo`, a JSON data URL): its feet, scale, head height and clip length,
 * so Home's still island stands each troop exactly where and as large as the live island draws it, from the
 * first visit on.
 *
 * Home's island never looks empty at an app start (queue item 37, open item 1):
 * - Strips are kept between visits in the Cache API (`spriteStripKeep.ts`), versioned by the renderer and the
 *   sheet's own bytes, so a release that changes the art or the drawing never shows an old strip.
 * - A strip worker (`spriteStripWorker.ts`) looks a sheet strip up and, when it is new, draws it on an
 *   OffscreenCanvas, so neither waits for the main thread nor adds to its work. Where the browser has no
 *   OffscreenCanvas (Safari before 16.4) or the worker fails, the main thread looks up, and draws in idle time
 *   after Home's entrance.
 * - The sheet strips shown last (`RECENT_KEY`, a few small entries) are looked up again at boot, so a returning
 *   player's Home finds its troops ready.
 *
 * Skins (docs/requests/motion-m-skinned-strips.md): a troop's skin with its own sheet draws that sheet's strip;
 * a skin drawn as the procedural puppet (no sheet) draws the skinned puppet's idle clip as the lane draws it
 * (team colour, the skin's translucency and aura glow), on the main thread in idle time and kept like the rest;
 * a skin that cannot be drawn gets the card's own strip.
 */
import type { VisualDef } from '@/contracts/art';
import type { Side, TeamPreset } from '@/contracts/ids';
import { Animator } from '../animator';
import { drawPuppet, puppetBounds } from '../draw';
import { getPart } from '../parts/registry';
import { teamColor, teamStripes } from '../palette';
import { CanvasTarget } from '../targets';
import type { BoneDelta, PuppetDef } from '../types';
import { clipResolver, procContext } from './procedural/shared';
import { CPU_2D, drawStrip, stripLayout, stripRendererTag, type StripCtx, type StripInfo, type StripSheet } from './spriteStripDraw';
import { cacheStripStore, fingerprint, hex6, sheetSlot, sheetVersion, type StripStore } from './spriteStripKeep';
import type { StripJob, StripReply } from './spriteStripWorker';

export type { StripInfo } from './spriteStripDraw';

/** A drawn strip: its PNG data URL and layout. */
export interface StripArt {
  url: string;
  info: StripInfo;
}

/**
 * `strip:walk:standard_bearer` → { clip: 'walk', card: 'standard_bearer' }; `stripinfo:idle:footman` →
 * { clip: 'idle', card: 'footman', part: 'info' }; else null.
 */
export function stripRequest(card: string): { clip: string; card: string; part?: 'info' } | null {
  const m = /^strip(info)?:([a-z_]+):(.+)$/.exec(card);
  if (!m) return null;
  return m[1] ? { clip: m[2]!, card: m[3]!, part: 'info' } : { clip: m[2]!, card: m[3]! };
}

/** A strip's layout as the portrait channel carries it: a JSON data URL (`stripinfo:` requests). */
export function stripInfoUrl(info: StripInfo): string {
  return `data:application/json,${encodeURIComponent(JSON.stringify(info))}`;
}

/** What a strip is drawn from: a sheet (the card's or its skin's) or a skin's procedural puppet. */
export type StripSource =
  | { kind: 'atlas'; url: string; heightLu?: number; headLu: number }
  | { kind: 'puppet'; key: string; puppet: PuppetDef; def: VisualDef; headLu: number; aura: boolean };
type SheetSource = Extract<StripSource, { kind: 'atlas' }>;
type PuppetSource = Extract<StripSource, { kind: 'puppet' }>;

let tag: string | null = null;
/** The renderer's fingerprint (its drawing functions as this build wrote them; part of a kept strip's version). */
const rendererTag = (): string => (tag ??= stripRendererTag());

/**
 * The puppet strips' version: the build (a production chunk's URL carries its content hash, so any change to the
 * visuals code draws them again); on the dev server, this page load (never an old drawing while editing).
 */
const PUPPET_BUILD = ((): string => {
  const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
  if (env?.DEV) return `dev${Date.now().toString(36)}`;
  return fingerprint(import.meta.url);
})();

// ---------------------------------------------------------------------------------------------
// The strip worker

/** Finds or draws a sheet strip off the main thread; null: do it on the main thread (unsupported, failed or timed out). */
export interface StripWorkerJob {
  (job: Omit<StripJob, 'id'>): Promise<StripArt | null>;
  /** Starts the worker ahead of its first job (its canvas set-up is slow while the page starts its own work). */
  warm(): void;
}

/** How long a worker job may take before the main thread does it (ms). */
const JOB_TIMEOUT_MS = 10_000;
/**
 * An idle worker is let go after this long (a thread and a small heap; the next job starts one again). Long
 * enough to outlast a match, so the strips of Home after it find the worker set up.
 */
const WORKER_LINGER_MS = 300_000;

/**
 * The strip worker (one, started by `warm` or the first job, let go when idle). After an error, an
 * `unsupported` answer or a timeout it is not used again this page: the main thread does the jobs.
 */
export function stripWorker(make: () => Worker, o: { lingerMs?: number } = {}): StripWorkerJob {
  let w: Worker | null = null;
  let broken = false;
  let next = 1;
  let linger: ReturnType<typeof setTimeout> | null = null;
  const pending = new Map<number, { done: (a: StripArt | null) => void; timer: ReturnType<typeof setTimeout> }>();
  const idleOut = (): void => {
    if (linger) clearTimeout(linger);
    linger = setTimeout(() => {
      linger = null;
      if (pending.size > 0) return;
      w?.terminate();
      w = null;
    }, o.lingerMs ?? WORKER_LINGER_MS);
  };
  const settle = (id: number, a: StripArt | null): void => {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    clearTimeout(p.timer);
    p.done(a);
    if (pending.size === 0 && w && !broken) idleOut();
  };
  const fail = (): void => {
    broken = true;
    w?.terminate();
    w = null;
    for (const id of [...pending.keys()]) settle(id, null);
  };
  const start = (): Worker | null => {
    if (w) return w;
    try {
      w = make();
    } catch {
      broken = true;
      return null;
    }
    // the worker sends the replies that settle close together as one array: they settle in this one task
    w.onmessage = (e: MessageEvent<StripReply | StripReply[]>) => {
      for (const r of Array.isArray(e.data) ? e.data : [e.data]) {
        if (r.ok) settle(r.id, { url: r.url, info: r.info });
        else if (r.error === 'unsupported') fail();
        else settle(r.id, null);
      }
    };
    w.onerror = (e) => {
      e.preventDefault?.();
      fail();
    };
    return w;
  };
  const run = ((job: Omit<StripJob, 'id'>): Promise<StripArt | null> => {
    if (broken) return Promise.resolve(null);
    const worker = start();
    if (!worker) return Promise.resolve(null);
    if (linger) {
      clearTimeout(linger);
      linger = null;
    }
    const id = next++;
    return new Promise<StripArt | null>((done) => {
      pending.set(id, { done, timer: setTimeout(fail, JOB_TIMEOUT_MS) });
      try {
        worker.postMessage({ ...job, id });
      } catch {
        fail();
      }
    });
  }) as StripWorkerJob;
  run.warm = () => {
    if (broken || w) return;
    if (start()) idleOut();
  };
  return run;
}

/** The page's strip worker, where the browser can draw on an OffscreenCanvas in a worker. */
function defaultWorker(): StripWorkerJob | null {
  if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function' || typeof createImageBitmap !== 'function') return null;
  return stripWorker(() => new Worker(new URL('./spriteStripWorker.ts', import.meta.url), { type: 'module' }));
}

// ---------------------------------------------------------------------------------------------
// The main thread (no worker, and skins drawn as puppets)

/** Main-thread strip drawing waits this long after the first strip request (Home's entrance), then for idle. */
const MAIN_AFTER_MS = 700;
const MAIN_IDLE_TIMEOUT_MS = 500;

function idle(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: timeoutMs });
    else setTimeout(resolve, 0);
  });
}

/**
 * Main-thread strips draw after Home's entrance (`MAIN_AFTER_MS`) in an idle moment, so their drawing never lands
 * on Home's first frames; the strips waiting when that moment comes then draw one after another, a task each (a
 * frame can come between them), without waiting for an idle moment each: one strip an idle moment put two skinned
 * troops 1.5-2 s apart on a busy start at 4x CPU, the second over 4 s after Home appeared.
 */
export function mainSlots(): () => Promise<void> {
  let first: number | null = null;
  const queue: (() => void)[] = [];
  let pump: Promise<void> | null = null;
  const now = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);
  const drain = async (): Promise<void> => {
    const wait = Math.max(0, (first ?? 0) + MAIN_AFTER_MS - now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    await idle(MAIN_IDLE_TIMEOUT_MS);
    for (let go = queue.shift(); go; go = queue.shift()) {
      go();
      if (queue.length > 0) await new Promise((r) => setTimeout(r, 0));
    }
    pump = null;
  };
  return () => {
    first ??= now();
    const slot = new Promise<void>((resolve) => queue.push(resolve));
    pump ??= drain();
    return slot;
  };
}

async function decode(png: ArrayBuffer): Promise<{ image: CanvasImageSource; close(): void } | null> {
  const blob = new Blob([png], { type: 'image/png' });
  if (typeof createImageBitmap === 'function') {
    try {
      const b = await createImageBitmap(blob);
      return { image: b, close: () => b.close() };
    } catch {
      // fall through to an image element
    }
  }
  if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  const src = URL.createObjectURL(blob);
  try {
    const im = new Image();
    im.src = src;
    await im.decode();
    return { image: im, close: () => undefined };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(src);
  }
}

function canvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** A canvas as a PNG data URL, encoded asynchronously where the browser can (`toBlob`). */
function pngUrl(c: HTMLCanvasElement): Promise<string> {
  if (typeof c.toBlob !== 'function' || typeof FileReader === 'undefined') return Promise.resolve(c.toDataURL('image/png'));
  return new Promise((resolve) => {
    c.toBlob((b) => {
      if (!b) {
        resolve(c.toDataURL('image/png'));
        return;
      }
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : c.toDataURL('image/png'));
      r.onerror = () => resolve(c.toDataURL('image/png'));
      r.readAsDataURL(b);
    }, 'image/png');
  });
}

/** Lets canvases' backing stores go at once (not at some later collection). */
function release(...cs: (HTMLCanvasElement | null | undefined)[]): void {
  for (const c of cs) if (c) c.width = c.height = 0;
}

async function drawSheetHere(job: Omit<StripJob, 'id'>, sheet: StripSheet, png: ArrayBuffer): Promise<StripArt | null> {
  const layout = stripLayout(sheet, job.clip, job.size, { ...(job.heightLu ? { heightLu: job.heightLu } : {}), headLu: job.headLu });
  if (!layout) return null;
  const img = await decode(png);
  if (!img) return null;
  const c = canvas(layout.size * layout.frames.length, layout.size);
  const t = canvas(layout.size, layout.size);
  try {
    const ctx = c?.getContext('2d', CPU_2D);
    const tc = t?.getContext('2d', CPU_2D);
    if (!c || !ctx || !tc) return null;
    try {
      drawStrip(ctx as unknown as StripCtx, tc as unknown as StripCtx, img.image, layout, job.teamColor);
    } finally {
      img.close();
    }
    return { url: await pngUrl(c), info: layout.info };
  } finally {
    img.close();
    release(c, t);
  }
}

/** Frames per puppet strip: about the sheets' idle pace (115 ms a frame), at most 16. */
const PUPPET_FRAME_MS = 115;
/** The skin aura glow (`ProceduralUnitView`: `fx.p.glow`, its three discs, at the view's mean alpha and tints). */
const AURA_DISCS: readonly (readonly [number, number])[] = [
  [10, 0.14],
  [7, 0.18],
  [4, 0.3],
];
const AURA_ALPHA = 0.34;
const AURA_TINT: Readonly<Record<string, string>> = { ghost: '#e6f2ee', snow: '#f4f7fb', neon: '#f6d8ec' };

/** A puppet strip's poses and layout (`puppetStripLayout`). */
export interface PuppetStripLayout {
  poses: Map<string, BoneDelta>[];
  cell: number;
  /** Cell px per lu, and where the puppet's origin (its feet) lands in a cell. */
  k: number;
  ox: number;
  oy: number;
  /** The aura glow behind the body (the High preset's skin auras), or null. */
  aura: { x: number; y: number; r: number; tint: string } | null;
  alpha: number;
  info: StripInfo;
}

/**
 * Samples a skin puppet's `clip` (the clip's length over about 115 ms a frame) and lays it out in square cells of
 * `size` px like a sheet strip: the union of the poses (and the aura glow) fills 96% of the cell, 2% above its
 * bottom edge; the feet are the puppet's origin. Pure (no canvas). Null when the puppet draws nothing.
 */
export function puppetStripLayout(src: PuppetSource, clip: string, size: number): PuppetStripLayout | null {
  const p = src.puppet;
  const resolve = clipResolver(src.def);
  const anim = new Animator(resolve, procContext(p), 1);
  const r = resolve(clip);
  if (r && clip !== 'idle') anim.play(clip, { loop: true });
  const ms = r?.durationMs ?? 0;
  const n = ms > 0 ? Math.max(1, Math.min(16, Math.round(ms / PUPPET_FRAME_MS))) : 1;
  const poses: Map<string, BoneDelta>[] = [];
  for (let i = 0; i < n; i++) {
    poses.push(new Map(anim.sample()));
    anim.update(ms / n);
  }
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const d of poses) {
    const b = puppetBounds(p, getPart, (id) => d.get(id));
    x0 = Math.min(x0, b.minX);
    y0 = Math.min(y0, b.minY);
    x1 = Math.max(x1, b.maxX);
    y1 = Math.max(y1, b.maxY);
  }
  if (!(x1 > x0) || !(y1 > y0)) return null;
  const body = { x0, x1, y0, y1 };
  const tint = p.aura ? AURA_TINT[p.aura] : undefined;
  const aura = src.aura && tint ? { x: src.def.anchors.hitCenter.x, y: src.def.anchors.hitCenter.y, r: 10 * (p.heightLu / 20) * 1.05, tint } : null;
  if (aura) {
    x0 = Math.min(x0, aura.x - aura.r);
    x1 = Math.max(x1, aura.x + aura.r);
    y0 = Math.min(y0, aura.y - aura.r);
    y1 = Math.max(y1, aura.y + aura.r);
  }
  const cell = Math.max(8, Math.round(size));
  const k = Math.min((cell * 0.96) / (x1 - x0), (cell * 0.96) / (y1 - y0));
  const ox = cell / 2 - ((x0 + x1) / 2) * k;
  const oy = cell - cell * 0.02 - y1 * k;
  const r2 = (v: number): number => Math.round(v * 100) / 100;
  return {
    poses,
    cell,
    k,
    ox,
    oy,
    aura,
    alpha: p.alpha ?? src.def.filters?.alpha ?? 1,
    info: {
      frames: n,
      cell,
      ms: ms > 0 ? Math.round(ms) : 0,
      feet: [r2(ox), r2(oy)],
      pxPerLu: Math.round(k * 10000) / 10000,
      headLu: r2(src.headLu),
      box: [r2(ox + body.x0 * k), r2(ox + body.x1 * k), r2(oy + body.y0 * k), r2(oy + body.y1 * k)],
    },
  };
}

/**
 * A skin's procedural puppet as the lane draws it, its clip in square cells (`puppetStripLayout`): team colour
 * (striped in the high-contrast preset's opponent), the skin's translucency, and its aura glow behind it on the
 * High preset (the lane's breath puffs are left out). The caller encodes the canvas and lets it go.
 */
export function drawPuppetStrip(src: PuppetSource, clip: string, size: number, color: number, striped: boolean): { canvas: HTMLCanvasElement; info: StripInfo } | null {
  const l = puppetStripLayout(src, clip, size);
  if (!l) return null;
  const { cell, k, ox, oy, aura, alpha } = l;
  const c = canvas(cell * l.poses.length, cell);
  const ctx = c?.getContext('2d', CPU_2D);
  const t = alpha < 1 ? canvas(cell, cell) : null;
  const tc = t?.getContext('2d', CPU_2D) ?? null;
  if (!c || !ctx || (alpha < 1 && !tc)) {
    release(c, t);
    return null;
  }
  l.poses.forEach((d, i) => {
    const dx = i * cell;
    if (aura) {
      ctx.save();
      ctx.fillStyle = aura.tint;
      for (const [rr, a] of AURA_DISCS) {
        ctx.globalAlpha = a * AURA_ALPHA;
        ctx.beginPath();
        ctx.arc(dx + ox + aura.x * k, oy + aura.y * k, (rr / 10) * aura.r * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    const target = tc ?? ctx;
    if (tc) tc.clearRect(0, 0, cell, cell);
    drawPuppet(src.puppet, new CanvasTarget(target, [k, 0, 0, k, (tc ? 0 : dx) + ox, oy]), [1, 0, 0, 1, 0, 0], { parts: getPart, teamColor: color, stripes: striped, deltas: (id) => d.get(id) });
    target.setTransform(1, 0, 0, 1, 0, 0);
    if (tc && t) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(t, dx, 0);
      ctx.restore();
    }
  });
  release(t);
  return { canvas: c, info: l.info };
}

// ---------------------------------------------------------------------------------------------
// The strip of a request

export interface StripDeps {
  fetch: (url: string) => Promise<Response>;
  /** The app's base URL where strips are kept (the Cache API), or null: nowhere. */
  keep: string | null;
  /** The main thread's store at `keep` (null: nowhere). */
  store: StripStore<StripInfo> | null;
  /** Finds or draws a sheet strip off the main thread (null: never). */
  worker: StripWorkerJob | null;
  /** Resolves when the main thread may draw a strip (an idle moment after Home's entrance). */
  mainSlot: () => Promise<void>;
  /** Keep puppet strips (off on the dev server, where their drawing code changes without a new build). */
  keepPuppets: boolean;
}

let pageDeps: StripDeps | null = null;

/**
 * The app's base URL (`/ageborn/` on the site), whatever page it runs on: kept strips are keyed under it. Outside
 * a page (unit tests) a file URL stands in.
 */
function baseUrl(): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const origin = typeof location !== 'undefined' && /^https?:/.test(location.origin) ? `${location.origin}/` : 'file:///';
  return new URL(base, origin).href;
}

function defaults(): StripDeps {
  if (pageDeps) return pageDeps;
  const dev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;
  const store = cacheStripStore<StripInfo>(baseUrl());
  pageDeps = {
    fetch: (url) => fetch(url),
    keep: store ? baseUrl() : null,
    store,
    worker: defaultWorker(),
    mainSlot: mainSlots(),
    keepPuppets: !dev,
  };
  return pageDeps;
}

/** Tests: replaces what the strips use (null restores the page's own). */
export function setStripDeps(d: Partial<StripDeps> | null): void {
  pageDeps = null;
  jobs.clear();
  recent = null;
  if (recentWrite) clearTimeout(recentWrite);
  recentWrite = null;
  if (d) pageDeps = { ...defaults(), ...d };
}

async function sheetStripHere(job: Omit<StripJob, 'id'>, d: StripDeps): Promise<StripArt | null> {
  const res = await d.fetch(job.url);
  if (!res.ok) return null;
  const json = await res.text();
  const sheet = JSON.parse(json) as StripSheet;
  if (!sheet.animations?.[job.clip]?.length || !sheet.meta?.image) return null;
  const img = await d.fetch(new URL(sheet.meta.image, job.url).href);
  if (!img.ok) return null;
  const png = await img.arrayBuffer();
  const slot = sheetSlot(job);
  const version = sheetVersion({ tag: job.tag, ...(job.heightLu ? { heightLu: job.heightLu } : {}), headLu: job.headLu, json, png });
  const kept = await d.store?.get(slot, version);
  if (kept) return kept;
  await d.mainSlot();
  const art = await drawSheetHere(job, sheet, png);
  if (art) void d.store?.put(slot, version, art);
  return art;
}

async function sheetStrip(src: SheetSource, clip: string, size: number, color: number, d: StripDeps): Promise<StripArt | null> {
  const job: Omit<StripJob, 'id'> = { url: new URL(src.url, baseUrl()).href, clip, size, teamColor: color, headLu: src.headLu, ...(src.heightLu ? { heightLu: src.heightLu } : {}), tag: rendererTag(), keep: d.keep };
  const off = d.worker ? await d.worker(job) : null;
  return off ?? sheetStripHere(job, d);
}

async function puppetStrip(src: PuppetSource, clip: string, size: number, color: number, striped: boolean, d: StripDeps): Promise<StripArt | null> {
  const slot = `${clip}|${Math.round(size)}|${hex6(color)}${striped ? 's' : ''}|${src.key}`;
  const version = `p1|${PUPPET_BUILD}|${src.headLu}|${src.aura ? 'a' : ''}`;
  const kept = d.keepPuppets ? await d.store?.get(slot, version) : null;
  if (kept) return kept;
  await d.mainSlot();
  const drawn = drawPuppetStrip(src, clip, size, color, striped);
  if (!drawn) return null;
  const art = { url: await pngUrl(drawn.canvas), info: drawn.info };
  release(drawn.canvas);
  if (d.keepPuppets) void d.store?.put(slot, version, art);
  return art;
}

/** Strips being drawn or drawn this page, by what they draw (the provider caches its answers too). */
const jobs = new Map<string, Promise<StripArt | null>>();

export interface StripRequestArgs {
  sources: readonly StripSource[];
  clip: string;
  size: number;
  side: Side;
  preset: TeamPreset;
}

function jobId(o: StripRequestArgs): string {
  const color = teamColor(o.side, o.preset);
  return `${o.sources.map((s) => (s.kind === 'atlas' ? s.url : s.key)).join('>')}|${o.clip}|${Math.round(o.size)}|${hex6(color)}${teamStripes(o.side, o.preset) ? 's' : ''}`;
}

/**
 * The strip of `clip` from the first of `sources` that can draw it (a skin's drawing, then the card's own
 * sheet), in `side`'s team colour; null when none can. Kept between visits and found or drawn off the main
 * thread where the browser can (see the module comment).
 */
export function spriteStripArt(o: StripRequestArgs & { deps?: StripDeps }): Promise<StripArt | null> {
  const id = jobId(o);
  const hit = o.deps ? undefined : jobs.get(id);
  if (hit) return hit;
  const d = o.deps ?? defaults();
  const color = teamColor(o.side, o.preset);
  const striped = teamStripes(o.side, o.preset);
  const job = (async (): Promise<StripArt | null> => {
    for (const s of o.sources) {
      try {
        const art = s.kind === 'atlas' ? await sheetStrip(s, o.clip, o.size, color, d) : await puppetStrip(s, o.clip, o.size, color, striped, d);
        if (art) return art;
      } catch {
        // the next source (the card's own sheet)
      }
    }
    return null;
  })();
  if (!o.deps) {
    jobs.set(id, job);
    void job.then((a) => {
      if (!a) {
        if (jobs.get(id) === job) jobs.delete(id);
      } else if (o.sources.every((s) => s.kind === 'atlas')) remember(id, o);
    });
  }
  return job;
}

// ---------------------------------------------------------------------------------------------
// Ready at boot: the sheet strips shown last are looked up again as soon as the visuals load

/** The last few sheet strips asked for (small JSON: what to look up at boot; the strips are in the Cache API). */
export const RECENT_KEY = 'ageborn.strips.recent';
const RECENT_MAX = 10;

type Recent = { id: string } & StripRequestArgs;

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readRecent(): Recent[] {
  try {
    const raw = storage()?.getItem(RECENT_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(v)) return [];
    return v.filter((r): r is Recent => !!r && typeof r === 'object' && typeof (r as Recent).id === 'string' && Array.isArray((r as Recent).sources) && (r as Recent).sources.every((s) => s && s.kind === 'atlas' && typeof s.url === 'string' && typeof s.headLu === 'number'));
  } catch {
    return [];
  }
}

let recent: Recent[] | null = null;
let recentWrite: ReturnType<typeof setTimeout> | null = null;

function remember(id: string, o: StripRequestArgs): void {
  recent ??= readRecent();
  const prev = recent.findIndex((r) => r.id === id);
  if (prev >= 0 && prev === recent.length - 1) return;
  if (prev >= 0) recent.splice(prev, 1);
  recent.push({ id, sources: o.sources, clip: o.clip, size: o.size, side: o.side, preset: o.preset });
  recent = recent.slice(-RECENT_MAX);
  if (recentWrite) return;
  recentWrite = setTimeout(() => {
    recentWrite = null;
    try {
      storage()?.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
      // a private window keeps nothing
    }
  }, 1000);
}

/**
 * Starts the strip worker, and looks up the sheet strips shown last with it, so Home finds them ready (only where
 * the strip worker runs: the main-thread lookup would add to the boot's own work). Runs once when the visuals
 * load; returns how many strips it looks up.
 */
export function warmRecentStrips(): number {
  const d = defaults();
  if (!d.worker) return 0;
  // set the worker up now, while nothing waits for it (also on a first visit, with nothing kept yet)
  d.worker.warm();
  if (!d.keep) return 0;
  const list = readRecent();
  recent = list;
  for (const r of list) {
    if (jobs.has(r.id)) continue;
    const args: StripRequestArgs = { sources: r.sources, clip: r.clip, size: r.size, side: r.side, preset: r.preset };
    if (jobId(args) !== r.id) continue;
    void spriteStripArt(args);
  }
  return list.length;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try {
    warmRecentStrips();
  } catch {
    // never in the way of the boot
  }
}
