/**
 * The key-value storage the save system writes to (DESIGN B8 Storage).
 *
 * `KeyValueStorage` is the subset of the Web Storage API the store needs, so localStorage, a test
 * double or a later IndexedDB/Capacitor-backed cache can sit behind it. It matches the
 * `KeyValueStore` that the app's event log already takes (`src/app/eventLog.ts`).
 */

export interface KeyValueStorage {
  getItem(key: string): string | null;
  /** May throw a quota error (DESIGN B8 Durability) or, when storage is blocked, a security error. */
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Optional enumeration (Web Storage has both); used to find backup keys on reset. */
  readonly length?: number;
  key?(index: number): string | null;
}

/** What went wrong with a storage write, as the store reports it. */
export type StorageFailure = 'quota' | 'unavailable' | 'other';

/**
 * True for the quota errors browsers throw from `setItem` when storage is full:
 * `QuotaExceededError` (Chromium, WebKit, Firefox) and Firefox's legacy `NS_ERROR_DOM_QUOTA_REACHED`,
 * also recognised by their legacy DOMException codes 22 and 1014.
 */
export function isQuotaError(e: unknown): boolean {
  if (e === null || typeof e !== 'object') return false;
  const err = e as { name?: unknown; code?: unknown };
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

/** Classifies an error thrown by storage (quota, blocked storage, anything else). */
export function classifyStorageError(e: unknown): StorageFailure {
  if (isQuotaError(e)) return 'quota';
  const name = e !== null && typeof e === 'object' ? (e as { name?: unknown }).name : undefined;
  if (name === 'SecurityError' || name === 'InvalidAccessError') return 'unavailable';
  return 'other';
}

/** An error shaped like the browser's quota DOMException (used by `MemoryStorage` and tests). */
export function makeQuotaError(message = 'The quota has been exceeded.'): Error {
  const e = new Error(message);
  e.name = 'QuotaExceededError';
  return e;
}

export interface MemoryStorageOptions {
  /**
   * Simulated quota in UTF-16 code units over all keys and values, like browsers count
   * localStorage (about 5 million per origin). `setItem` throws a quota error beyond it.
   */
  quota?: number;
}

/**
 * An in-memory `KeyValueStorage` for tests, the dev page and browsers that block localStorage
 * (the game then still runs; progress lives only in the tab and the player is told).
 */
export class MemoryStorage implements KeyValueStorage {
  private readonly m = new Map<string, string>();
  /** Simulated quota; change it at any time (tests fill the storage up this way). */
  quota: number;
  /** Every successful `setItem`, oldest first (tests assert write order). */
  readonly writes: string[] = [];

  constructor(o: MemoryStorageOptions = {}) {
    this.quota = o.quota ?? Number.POSITIVE_INFINITY;
  }

  get length(): number {
    return this.m.size;
  }

  key(index: number): string | null {
    return [...this.m.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.m.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    const old = this.m.get(key);
    const next = this.used() - (old === undefined ? 0 : key.length + old.length) + key.length + value.length;
    if (next > this.quota) throw makeQuotaError();
    this.m.set(key, value);
    this.writes.push(key);
  }

  removeItem(key: string): void {
    this.m.delete(key);
  }

  /** UTF-16 code units in use (keys plus values). */
  used(): number {
    let n = 0;
    for (const [k, v] of this.m) n += k.length + v.length;
    return n;
  }

  /** A snapshot of every key and value (dev page, tests). */
  snapshot(): Record<string, string> {
    return Object.fromEntries([...this.m.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  }
}

/** Every key currently in `storage`, when it can enumerate them (Web Storage and `MemoryStorage` can). */
export function storageKeys(storage: KeyValueStorage): string[] {
  const n = storage.length;
  if (typeof n !== 'number' || typeof storage.key !== 'function') return [];
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const k = storage.key(i);
    if (k !== null) out.push(k);
  }
  return out;
}
