/**
 * Storage for the onboarding event log (DESIGN A8 Instrumentation, B8 `ageborn.eventlog`): a ring
 * of the last 500 events that never leaves the device except through the Settings export.
 *
 * The record shape and the JSON array format are the ones the app's `EventLog` (`src/app/eventLog.ts`)
 * reads and writes, so both can share the key. This store adds validation on read, quota handling
 * (the log shrinks before the save ever fails) and the reset path.
 */
import { EVENT_LOG_CAPACITY, SAVE_KEYS } from './defaults';
import { JsonRing } from './jsonRing';
import type { KeyValueStorage } from './storage';

export interface EventLogRecord {
  /** Epoch ms. */
  at: number;
  /** For example `beatShown`, `matchStart`, `matchEnd`, `boot`. */
  kind: string;
  /** Beat, hint or match id. */
  id: string;
  data?: Record<string, string | number | boolean | null>;
}

function isDataValue(x: unknown): x is string | number | boolean | null {
  return x === null || typeof x === 'string' || typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x));
}

/** The record, or null when `x` is not one (damaged entries are dropped on read). */
export function parseEventLogRecord(x: unknown): EventLogRecord | null {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return null;
  const e = x as Record<string, unknown>;
  if (typeof e.at !== 'number' || !Number.isFinite(e.at) || typeof e.kind !== 'string' || typeof e.id !== 'string') return null;
  const rec: EventLogRecord = { at: e.at, kind: e.kind, id: e.id };
  if (e.data !== undefined) {
    if (e.data === null || typeof e.data !== 'object' || Array.isArray(e.data)) return null;
    const data: Record<string, string | number | boolean | null> = {};
    for (const [k, val] of Object.entries(e.data as Record<string, unknown>)) {
      if (!isDataValue(val)) return null;
      data[k] = val;
    }
    rec.data = data;
  }
  return rec;
}

export class EventLogStore extends JsonRing<EventLogRecord> {
  constructor(storage: KeyValueStorage, capacity = EVENT_LOG_CAPACITY) {
    super({ storage, key: SAVE_KEYS.eventLog, capacity, parse: parseEventLogRecord });
  }

  /** Records one event now (`at` comes from the caller's clock). */
  record(at: number, kind: string, id: string, data?: EventLogRecord['data']): void {
    this.push(data ? { at, kind, id, data } : { at, kind, id });
  }

  /** The Settings export: the same JSON document the app's `EventLog.export()` produces. */
  exportJson(): string {
    return JSON.stringify({ kind: 'ageborn.eventlog', v: 1, entries: this.items() }, null, 1);
  }
}
