/**
 * The local onboarding event log (DESIGN A8 Instrumentation, B8 key `ageborn.eventlog`): a ring
 * buffer of the last 500 events recording each onboarding step's time and drop-offs (beats shown,
 * done, timed out or skipped; matches started and ended). It can be exported from Settings for
 * playtests. It never leaves the device: there is no network code here or anywhere in v1.
 */
import type { Clock } from '@/contracts';

export const EVENT_LOG_KEY = 'ageborn.eventlog';
export const EVENT_LOG_CAPACITY = 500;

export interface EventLogEntry {
  /** Epoch ms. */
  at: number;
  /** For example `beatShown`, `matchStart`, `matchEnd`, `boot`. */
  kind: string;
  /** Beat, hint or match id. */
  id: string;
  data?: Record<string, string | number | boolean | null>;
}

/** The part of `Storage` the log uses (localStorage in the app, a map in tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface EventLogOptions {
  clock: Clock;
  store?: KeyValueStore | null;
  capacity?: number;
  key?: string;
}

function isEntry(x: unknown): x is EventLogEntry {
  if (x === null || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  return typeof e.at === 'number' && typeof e.kind === 'string' && typeof e.id === 'string';
}

export class EventLog {
  private readonly clock: Clock;
  private readonly store: KeyValueStore | null;
  private readonly capacity: number;
  private readonly key: string;
  private items: EventLogEntry[] = [];
  /** Set when storage refused a write (quota); the log keeps working in memory. */
  storageError: string | null = null;

  constructor(o: EventLogOptions) {
    this.clock = o.clock;
    this.store = o.store ?? null;
    this.capacity = Math.max(1, o.capacity ?? EVENT_LOG_CAPACITY);
    this.key = o.key ?? EVENT_LOG_KEY;
    this.items = this.load();
  }

  record(kind: string, id: string, data?: EventLogEntry['data']): void {
    const e: EventLogEntry = data ? { at: this.clock.now(), kind, id, data } : { at: this.clock.now(), kind, id };
    this.items.push(e);
    if (this.items.length > this.capacity) this.items.splice(0, this.items.length - this.capacity);
    this.persist();
  }

  /** Oldest first. */
  entries(): readonly EventLogEntry[] {
    return this.items;
  }

  /** Pretty JSON for the Settings export (a playtest hands this file over by hand). */
  export(): string {
    return JSON.stringify({ kind: 'ageborn.eventlog', v: 1, entries: this.items }, null, 1);
  }

  clear(): void {
    this.items = [];
    try {
      this.store?.removeItem(this.key);
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }

  private load(): EventLogEntry[] {
    try {
      const raw = this.store?.getItem(this.key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isEntry).slice(-this.capacity) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    if (!this.store) return;
    try {
      this.store.setItem(this.key, JSON.stringify(this.items));
      this.storageError = null;
    } catch (e) {
      this.storageError = e instanceof Error ? e.message : String(e);
    }
  }
}

/** An in-memory `KeyValueStore` (tests, private windows without storage). */
export class MemoryKeyValueStore implements KeyValueStore {
  private readonly m = new Map<string, string>();
  getItem(key: string): string | null {
    return this.m.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.m.set(key, value);
  }
  removeItem(key: string): void {
    this.m.delete(key);
  }
}
