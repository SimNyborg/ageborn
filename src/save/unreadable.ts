/**
 * `ageborn.backup.unreadable`: slot texts the store rejected, set aside before a fresh save can
 * overwrite them (DESIGN B8 Load order step 5). It is a last-resort copy for support and dev tools, so
 * a save from a newer build, or one a later fix could repair, is never silently destroyed.
 *
 * The key holds `{ copies: UnreadableCopy[] }` with up to `UNREADABLE_BACKUP_COPIES` distinct texts,
 * newest last. A text that is already kept is not added again (the same rejected slot is seen on every
 * load until the next write replaces it). When the list is full, or storage has no room, the oldest
 * copies go first: the newest rejection is the one a player will ask about. Everything here is best
 * effort and never throws; a backup must never stop a load.
 */
import { UNREADABLE_BACKUP_COPIES, UNREADABLE_BACKUP_KEY } from './defaults';
import { classifyStorageError, type KeyValueStorage } from './storage';

export interface UnreadableCopy {
  /** When it was set aside (epoch ms). */
  at: number;
  /** Where it came from and why it was rejected, for example `B: tooNew (v2 > v1)`. */
  source: string;
  /** The slot text exactly as it was stored. */
  raw: string;
}

function isCopy(x: unknown): x is UnreadableCopy {
  if (x === null || typeof x !== 'object') return false;
  const c = x as Record<string, unknown>;
  return typeof c.at === 'number' && typeof c.source === 'string' && typeof c.raw === 'string';
}

/** The kept copies, oldest first. Unknown content under the key is returned as one copy, not dropped. */
export function readUnreadableCopies(storage: KeyValueStorage): UnreadableCopy[] {
  let text: string | null;
  try {
    text = storage.getItem(UNREADABLE_BACKUP_KEY);
  } catch {
    return [];
  }
  if (text === null) return [];
  try {
    const copies = (JSON.parse(text) as { copies?: unknown } | null)?.copies;
    if (Array.isArray(copies) && copies.every(isCopy)) return copies;
  } catch {
    // Not ours or damaged: kept whole below.
  }
  return [{ at: 0, source: 'unknown', raw: text }];
}

/** Adds the copies in `found` that are not kept yet. */
export function keepUnreadableCopies(storage: KeyValueStorage, found: readonly UnreadableCopy[]): void {
  const kept = readUnreadableCopies(storage);
  const known = new Set(kept.map((k) => k.raw));
  const fresh: UnreadableCopy[] = [];
  for (const f of found) {
    if (known.has(f.raw)) continue;
    known.add(f.raw);
    fresh.push(f);
  }
  if (fresh.length === 0) return;
  let next = [...kept, ...fresh].slice(-UNREADABLE_BACKUP_COPIES);
  while (next.length > 0) {
    try {
      storage.setItem(UNREADABLE_BACKUP_KEY, JSON.stringify({ copies: next }));
      return;
    } catch (e) {
      // No room: give up the oldest copy and try again; any other error ends the attempt.
      if (classifyStorageError(e) !== 'quota') return;
      next = next.slice(1);
    }
  }
}
