/**
 * Durability helpers (DESIGN B8 Durability): the `persist()` request on the first win, the gentle
 * backup reminder, and stamping a successful export.
 */
import type { SaveDoc } from '@/contracts';
import { BACKUP_REMINDER_MS } from './defaults';

/** The part of `StorageManager` that `persist()` uses. */
export interface StorageManagerLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

/**
 * `persisted`: already persistent. `granted` / `denied`: the browser's answer to this request.
 * `unsupported`: no StorageManager, or it threw.
 */
export type PersistOutcome = 'persisted' | 'granted' | 'denied' | 'unsupported';

function defaultManager(): StorageManagerLike | undefined {
  return typeof navigator !== 'undefined' ? navigator.storage : undefined;
}

/**
 * Asks the browser to keep this site's storage when space runs low (`navigator.storage.persist()`).
 * Never throws. The app calls it after the first win (`isFirstWin`), when the player has something
 * worth keeping; browsers may decide silently based on engagement, so asking late is better.
 */
export async function persist(manager: StorageManagerLike | null | undefined = defaultManager()): Promise<PersistOutcome> {
  if (!manager || typeof manager.persist !== 'function') return 'unsupported';
  try {
    if (typeof manager.persisted === 'function' && (await manager.persisted())) return 'persisted';
    return (await manager.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** True when a meta transition produced the profile's first win (the moment to call `persist()`). */
export function isFirstWin(before: SaveDoc | null, after: SaveDoc): boolean {
  return (before?.stats.wins ?? 0) === 0 && after.stats.wins > 0;
}

/**
 * Settings shows "Back up your progress" when the last export is more than 5 days old; a profile
 * that never exported counts from its creation, so a new player is not nagged at once.
 */
export function backupReminderDue(doc: SaveDoc, nowMs: number, afterMs: number = BACKUP_REMINDER_MS): boolean {
  return nowMs - (doc.lastExportAt ?? doc.createdAt) > afterMs;
}

/** The doc with `lastExportAt` set; save it after a code was copied or a file downloaded. */
export function markExported(doc: SaveDoc, nowMs: number): SaveDoc {
  return { ...doc, lastExportAt: nowMs };
}
