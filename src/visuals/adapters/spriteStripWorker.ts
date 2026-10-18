/**
 * The sprite strip worker (Home's still island, queue item 37 open item 1): finds or draws a unit clip's strip
 * off the main thread, so neither the lookup of a kept strip nor a new drawing ever waits for (or adds to) the
 * main thread's work while Home starts (the old main-thread strip cost about 0.9 s of one task at 4x CPU for the
 * Home card's bearer alone, and each lookup step waited behind Home's other first tasks).
 *
 * A job names the sheet; the worker fetches its JSON and PNG (the page's HTTP cache serves them), looks the strip
 * up in the Cache API (`spriteStripKeep.ts`), and otherwise draws it on an OffscreenCanvas, answers with the PNG
 * data URL and its layout (`StripInfo`) and keeps it. Answers that settle close together leave in one message
 * (an array of replies). Without OffscreenCanvas 2D (Safari before 16.4) a missing strip is answered
 * `unsupported` and the main thread draws it. Imports only the pure modules.
 */
import { CPU_2D, drawStrip, stripLayout, type StripCtx, type StripInfo, type StripSheet } from './spriteStripDraw';
import { cacheStripStore, sheetSlot, sheetVersion, type StripStore } from './spriteStripKeep';

/** A strip job (`spriteStrip.ts` posts it). */
export interface StripJob {
  id: number;
  /** The sheet JSON's absolute URL. */
  url: string;
  clip: string;
  size: number;
  teamColor: number;
  /** The manifest entry's height (the atlas view rescales a sheet whose own height differs). */
  heightLu?: number;
  headLu: number;
  /** The renderer's fingerprint (the main thread's, part of the kept strip's version). */
  tag: string;
  /** The app's base URL, where strips are kept; null: draw only. */
  keep: string | null;
}

export type StripReply = { id: number; ok: true; url: string; info: StripInfo; kept: boolean } | { id: number; ok: false; error: string };

type Scope = { onmessage: ((e: MessageEvent<StripJob>) => void) | null; postMessage(m: StripReply[]): void };
const scope = self as unknown as Scope;

/**
 * Replies go out together: one that settles while other jobs still run waits for them, at most this long (ms).
 * Each message is a task of its own on the page, and while Home starts the page runs long tasks between them,
 * so the kept strips looked up at boot (all found within a few ms, over a second before Home's first frame)
 * reached Home one or two at a time, up to half a second and a long task apart: troops came in a second
 * apart. Together, Home places them in one task.
 */
const BATCH_MS = 40;
let running = 0;
let replies: StripReply[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = null;
  if (replies.length === 0) return;
  const out = replies;
  replies = [];
  scope.postMessage(out);
}

function settle(r: StripReply): void {
  running--;
  replies.push(r);
  if (running <= 0) flush();
  else batchTimer ??= setTimeout(flush, BATCH_MS);
}

/** Base64 of a blob's bytes (no FileReaderSync: every engine's workers have `btoa`). */
async function dataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || 'image/png'};base64,${btoa(bin)}`;
}

async function draw(j: StripJob, sheet: StripSheet, png: ArrayBuffer): Promise<{ url: string; info: StripInfo } | 'clip' | 'unsupported'> {
  const layout = stripLayout(sheet, j.clip, j.size, { ...(j.heightLu ? { heightLu: j.heightLu } : {}), headLu: j.headLu });
  if (!layout) return 'clip';
  if (typeof OffscreenCanvas !== 'function' || typeof createImageBitmap !== 'function') return 'unsupported';
  const c = new OffscreenCanvas(layout.size * layout.frames.length, layout.size);
  const t = new OffscreenCanvas(layout.size, layout.size);
  const ctx = c.getContext('2d', CPU_2D);
  const tc = t.getContext('2d', CPU_2D);
  if (!ctx || !tc || typeof c.convertToBlob !== 'function') return 'unsupported';
  const image = await createImageBitmap(new Blob([png], { type: 'image/png' }));
  try {
    drawStrip(ctx as unknown as StripCtx, tc as unknown as StripCtx, image, layout, j.teamColor);
  } finally {
    image.close();
  }
  try {
    return { url: await dataUrl(await c.convertToBlob({ type: 'image/png' })), info: layout.info };
  } finally {
    // the backing stores go now: an idle worker may not collect them for minutes
    c.width = c.height = t.width = t.height = 0;
  }
}

/** The store at each base URL (one Cache API handle for the worker's life). */
const stores = new Map<string, StripStore<StripInfo> | null>();
function storeAt(base: string): StripStore<StripInfo> | null {
  if (!stores.has(base)) stores.set(base, cacheStripStore<StripInfo>(base));
  return stores.get(base) ?? null;
}

/** The PNG a sheet's JSON names by the art pipeline's rule (`footman.json` draws from `footman.png`). */
function pngBeside(url: string): string {
  const u = new URL(url);
  u.pathname = u.pathname.replace(/\.json$/, '.png');
  return u.href;
}

/** Lets an unused response's body go. */
function drop(r: Promise<Response | null> | Response | null): void {
  void Promise.resolve(r)
    .then((x) => x?.body?.cancel())
    .catch(() => undefined);
}

async function run(j: StripJob): Promise<StripReply> {
  const store = j.keep ? storeAt(j.keep) : null;
  // the PNG is fetched beside the JSON rather than after it (one HTTP cache round trip less on the way to a
  // kept strip); a sheet whose JSON names another picture fetches that one
  const guess = pngBeside(j.url);
  const early = guess !== j.url ? fetch(guess).catch(() => null) : Promise.resolve(null);
  const res = await fetch(j.url);
  if (!res.ok) {
    drop(early);
    return { id: j.id, ok: false, error: `sheet ${res.status}` };
  }
  const json = await res.text();
  const sheet = JSON.parse(json) as StripSheet;
  if (!sheet.animations?.[j.clip]?.length || !sheet.meta?.image) {
    drop(early);
    return { id: j.id, ok: false, error: 'clip' };
  }
  const image = new URL(sheet.meta.image, j.url).href;
  const guessed = await early;
  const img = image === guess && guessed?.ok ? guessed : await fetch(image);
  if (guessed !== img) drop(guessed);
  if (!img.ok) return { id: j.id, ok: false, error: `image ${img.status}` };
  const png = await img.arrayBuffer();
  const slot = sheetSlot(j);
  const version = sheetVersion({ tag: j.tag, ...(j.heightLu ? { heightLu: j.heightLu } : {}), headLu: j.headLu, json, png });
  const kept = await store?.get(slot, version);
  if (kept) return { id: j.id, ok: true, url: kept.url, info: kept.info, kept: true };
  const art = await draw(j, sheet, png);
  if (art === 'clip' || art === 'unsupported') return { id: j.id, ok: false, error: art };
  void store?.put(slot, version, art);
  return { id: j.id, ok: true, url: art.url, info: art.info, kept: false };
}

// A fresh worker's first 2D drawing sets its canvas up, which took about 1 s while Home's island started (the page's
// other canvases and GPU work at the same moment): the main thread starts the worker as the visuals load, and this
// pays that set-up then, before any strip waits for it. It runs after the jobs already queued have started their
// fetches (30-40 ms at 4x CPU that a kept strip, which is never drawn, need not wait for).
setTimeout(() => {
  try {
    new OffscreenCanvas(1, 1).getContext('2d', CPU_2D)?.fillRect(0, 0, 1, 1);
  } catch {
    // no OffscreenCanvas 2D: a strip job answers `unsupported`
  }
}, 0);

scope.onmessage = (e) => {
  const j = e.data;
  running++;
  run(j).then(settle, (err: unknown) => settle({ id: j.id, ok: false, error: String(err) }));
};
