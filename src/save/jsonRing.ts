/**
 * A bounded list stored as one JSON array under one key: the replay ring (`ageborn.replays`, 20) and
 * the event log (`ageborn.eventlog`, 500) (DESIGN B8 Keys, A8 Instrumentation).
 *
 * The in-memory list is the ring for this session; storage holds the newest part of it that fits.
 * Both rings are expendable next to the save itself: on a quota error they keep halving what they
 * persist, and the save store can call `shrink()` to free space for a save write.
 *
 * The key may have a second writer (the app's `EventLog` shares `ageborn.eventlog`). Before it writes,
 * a ring checks that storage still holds the text it last read or wrote; if not, it reads the key
 * again, so it never puts a stale list over the other writer's newer entries.
 */
import { classifyStorageError, type KeyValueStorage, type StorageFailure } from './storage';

function jsonCopy<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

export interface JsonRingOptions<T> {
  storage: KeyValueStorage;
  key: string;
  capacity: number;
  /** Returns the item, or null to drop a damaged entry when reading back. */
  parse: (x: unknown) => T | null;
}

export class JsonRing<T> {
  readonly key: string;
  readonly capacity: number;
  private readonly storage: KeyValueStorage;
  private readonly parse: (x: unknown) => T | null;
  private list: T[] | null = null;
  /** The key's text as this ring last read or wrote it (null: absent). */
  private seenText: string | null = null;
  /** How many of the newest items storage may hold; lowered when space runs out. */
  private persistCap: number;
  /** How many of the newest items storage holds now. */
  private persistedCount = 0;
  /** Entries dropped when reading back (damaged or invalid). */
  droppedOnLoad = 0;
  /** The last storage failure, or null after a successful write. */
  lastError: StorageFailure | null = null;

  constructor(o: JsonRingOptions<T>) {
    if (!Number.isInteger(o.capacity) || o.capacity < 1) throw new Error('JsonRing capacity must be a positive integer');
    this.storage = o.storage;
    this.key = o.key;
    this.capacity = o.capacity;
    this.parse = o.parse;
    this.persistCap = o.capacity;
  }

  /** The ring, oldest first. Treat the items as read-only. */
  items(): readonly T[] {
    return this.ensure();
  }

  get persisted(): number {
    this.ensure();
    return this.persistedCount;
  }

  /** Adds a copy of `item` (as JSON would store it), so later changes to the caller's object never leak in. */
  push(item: T): void {
    this.syncWithStorage();
    const list = this.ensure();
    list.push(jsonCopy(item));
    if (list.length > this.capacity) list.splice(0, list.length - this.capacity);
    this.write();
  }

  /** Replaces the whole ring (keeps copies of the newest `capacity` items). */
  replace(items: readonly T[]): void {
    this.list = items.slice(-this.capacity).map(jsonCopy);
    this.write();
  }

  /**
   * Halves what storage holds to make room for something more important (the save). Returns false
   * when nothing is left to free.
   */
  shrink(): boolean {
    this.syncWithStorage();
    this.ensure();
    if (this.persistedCount === 0) return false;
    this.persistCap = Math.floor(this.persistedCount / 2);
    this.write();
    return true;
  }

  /** Empties the ring and removes the key. */
  clear(): void {
    this.list = [];
    this.seenText = null;
    this.persistedCount = 0;
    this.persistCap = this.capacity;
    this.lastError = null;
    try {
      this.storage.removeItem(this.key);
    } catch {
      // Storage unavailable: nothing to remove.
    }
  }

  /** Drops the cached list when another writer changed the key since this ring last saw it. */
  private syncWithStorage(): void {
    if (this.list === null) return;
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return;
    }
    if (raw !== this.seenText) this.list = null;
  }

  private ensure(): T[] {
    if (this.list) return this.list;
    let parsed: unknown;
    this.seenText = null;
    try {
      const raw = this.storage.getItem(this.key);
      this.seenText = raw;
      parsed = raw === null ? [] : (JSON.parse(raw) as unknown);
    } catch {
      parsed = [];
    }
    const out: T[] = [];
    const arr = Array.isArray(parsed) ? parsed : [];
    for (const x of arr) {
      const item = this.parse(x);
      if (item === null) this.droppedOnLoad += 1;
      else out.push(item);
    }
    if (!Array.isArray(parsed)) this.droppedOnLoad += 1;
    this.list = out.slice(-this.capacity);
    this.persistedCount = this.list.length;
    return this.list;
  }

  /** Persists the newest items that fit, halving on quota errors. */
  private write(): void {
    const list = this.ensure();
    let n = Math.min(list.length, this.persistCap);
    for (;;) {
      try {
        const text = n === 0 ? null : JSON.stringify(list.slice(list.length - n));
        if (text === null) this.storage.removeItem(this.key);
        else this.storage.setItem(this.key, text);
        this.seenText = text;
        this.persistedCount = n;
        this.lastError = null;
        return;
      } catch (e) {
        const kind = classifyStorageError(e);
        this.lastError = kind;
        if (kind !== 'quota' || n === 0) {
          this.persistedCount = Math.min(this.persistedCount, n);
          return;
        }
        n = Math.floor(n / 2);
        this.persistCap = n;
      }
    }
  }
}
