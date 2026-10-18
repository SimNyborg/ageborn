/**
 * Keeping sprite strips between visits (Home's still island, queue item 37 open item 1), shared by the strip
 * worker and the main thread: the Cache API store, what a strip is keyed by and the fingerprints of a sheet's
 * bytes. No imports and no DOM (the worker has `caches`, `Response` and `URL` too).
 *
 * A kept strip's key has two parts:
 * - the slot, what is drawn: the clip, the cell size, the team colour and the sheet (or the puppet);
 * - the version, from what: the renderer's fingerprint, the manifest's heights, and the sheet's JSON and PNG
 *   bytes (the HTTP cache serves them), so a release that changes the art or the drawing never shows an old
 *   strip. Writing a strip drops the older versions of its slot and the oldest strips over `KEEP_MAX`.
 */

/** A drawn strip: its PNG data URL and its layout (`StripInfo`, kept as JSON beside it). */
export interface KeptStrip<I = unknown> {
  url: string;
  info: I;
}

export interface StripStore<I = unknown> {
  get(slot: string, version: string): Promise<KeptStrip<I> | null>;
  put(slot: string, version: string, art: KeptStrip<I>): Promise<void>;
}

export const KEEP_CACHE = 'ageborn-strips-v1';
/** Strips kept on the device (one per slot; about 60-250 KB each). */
export const KEEP_MAX = 40;

/** A 53-bit hash of bytes (read as little-endian words) or a string, and its length (a fingerprint, not security). */
export function fingerprint(data: ArrayBuffer | string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  let n: number;
  if (typeof data === 'string') {
    n = data.length;
    for (let i = 0; i < n; i++) {
      const v = data.charCodeAt(i);
      h1 = Math.imul(h1 ^ v, 2654435761);
      h2 = Math.imul(h2 ^ v, 1597334677);
    }
  } else {
    n = data.byteLength;
    const words = n >>> 2;
    const w = new Uint32Array(data, 0, words);
    for (let i = 0; i < words; i++) {
      const v = w[i]!;
      h1 = Math.imul(h1 ^ v, 2654435761);
      h2 = Math.imul(h2 ^ v, 1597334677);
    }
    const tail = new Uint8Array(data, words * 4);
    for (let i = 0; i < tail.length; i++) {
      const v = tail[i]!;
      h1 = Math.imul(h1 ^ v, 2654435761);
      h2 = Math.imul(h2 ^ v, 1597334677);
    }
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}.${n.toString(36)}`;
}

export const hex6 = (c: number): string => (c & 0xffffff).toString(16).padStart(6, '0');

/** A sheet strip's slot: the clip, cell size, team colour and the sheet's path. */
export function sheetSlot(o: { clip: string; size: number; teamColor: number; url: string }): string {
  return `${o.clip}|${Math.round(o.size)}|${hex6(o.teamColor)}|${new URL(o.url).pathname}`;
}

/** A sheet strip's version: the renderer, the manifest's heights and the sheet's JSON and PNG bytes. */
export function sheetVersion(o: { tag: string; heightLu?: number; headLu: number; json: string; png: ArrayBuffer }): string {
  return `${o.tag}|${o.heightLu ?? ''}|${o.headLu}|${fingerprint(o.json)}|${fingerprint(o.png)}`;
}

function keepUrl(base: string, slot: string, version: string): string {
  return new URL(`__strips/${encodeURIComponent(slot)}/${encodeURIComponent(version)}`, base).href;
}

function slotOf(url: string): string {
  const parts = new URL(url).pathname.split('/');
  return parts[parts.length - 2] ?? '';
}

/**
 * The Cache API store under the app's `base` URL (the entries are never fetched; Safari has it too). Null
 * without the Cache API; a private window or blocked storage makes every read miss and every write a no-op.
 */
export function cacheStripStore<I>(base: string, o: { name?: string; max?: number } = {}): StripStore<I> | null {
  const c = (globalThis as { caches?: CacheStorage }).caches;
  if (!c || typeof c.open !== 'function') return null;
  const max = o.max ?? KEEP_MAX;
  let opened: Promise<Cache | null> | null = null;
  const open = (): Promise<Cache | null> => {
    if (!opened) {
      try {
        opened = c.open(o.name ?? KEEP_CACHE).catch(() => null);
      } catch {
        opened = Promise.resolve(null);
      }
    }
    return opened;
  };
  // opened at once, while the caller still fetches the sheet: the first lookup does not wait for it
  void open();
  return {
    async get(slot, version) {
      try {
        const cache = await open();
        const res = await cache?.match(keepUrl(base, slot, version));
        if (!res) return null;
        const info = JSON.parse(res.headers.get('x-strip-info') ?? 'null') as I | null;
        const url = await res.text();
        return info && url.startsWith('data:image/') ? { url, info } : null;
      } catch {
        return null;
      }
    },
    async put(slot, version, art) {
      try {
        const cache = await open();
        if (!cache) return;
        const url = keepUrl(base, slot, version);
        await cache.put(url, new Response(art.url, { headers: { 'content-type': 'text/plain', 'x-strip-info': JSON.stringify(art.info) } }));
        const keys = (await cache.keys()).map((r) => r.url);
        const mine = encodeURIComponent(slot);
        const stale = keys.filter((k) => k !== url && slotOf(k) === mine);
        const rest = keys.filter((k) => k !== url && slotOf(k) !== mine);
        const over = Math.max(0, rest.length + 1 - max);
        for (const k of [...stale, ...rest.slice(0, over)]) await cache.delete(k);
      } catch {
        // full or blocked storage: the strip is drawn again next time
      }
    },
  };
}
