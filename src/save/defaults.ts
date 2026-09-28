/**
 * Storage keys, timings and default values of the save system (DESIGN B8).
 *
 * Everything here is plain data so the store, the dev page and the tests agree on one set of numbers.
 */
import type { Settings } from '@/contracts';

/** The localStorage keys the save system owns (DESIGN B8 Keys). */
export const SAVE_KEYS = {
  /** Two alternating slots, each `{ v, writtenAt, checksum, payload }`. */
  slotA: 'ageborn.save.A',
  slotB: 'ageborn.save.B',
  /** Ring of the last 20 replays. */
  replays: 'ageborn.replays',
  /** Onboarding event log (DESIGN A8 Instrumentation). */
  eventLog: 'ageborn.eventlog',
  /** Prefix of every backup key: `ageborn.backup.pre-v<N>` and `ageborn.backup.unreadable`. */
  backupPrefix: 'ageborn.backup.',
} as const;

export type SlotId = 'A' | 'B';

export const SLOT_KEYS: Readonly<Record<SlotId, string>> = { A: SAVE_KEYS.slotA, B: SAVE_KEYS.slotB };

/** `ageborn.backup.pre-v<N>`: the doc as it was before the migration that produces version `N`. */
export function preMigrationBackupKey(toVersion: number): string {
  return `${SAVE_KEYS.backupPrefix}pre-v${toVersion}`;
}

/**
 * Rejected slot texts are kept here before a fresh save can overwrite them, so a save from a newer
 * build (or a repairable one) is never silently destroyed (see `unreadable.ts`).
 */
export const UNREADABLE_BACKUP_KEY = `${SAVE_KEYS.backupPrefix}unreadable`;

/** How many distinct rejected slot texts `ageborn.backup.unreadable` keeps (newest last). */
export const UNREADABLE_BACKUP_COPIES = 4;

/** Writes are debounced by 2 s (DESIGN B8 Writes). */
export const SAVE_DEBOUNCE_MS = 2000;

/** `ageborn.replays` keeps the last 20 matches (DESIGN B8). */
export const REPLAY_RING_SIZE = 20;

/** The event log is a ring buffer of 500 events (DESIGN A8 Instrumentation). */
export const EVENT_LOG_CAPACITY = 500;

/** Settings shows the backup reminder when the last export is more than 5 days old (DESIGN B8). */
export const BACKUP_REMINDER_MS = 5 * 24 * 60 * 60 * 1000;

/** Extension of downloaded save files (DESIGN B8 Export/import). */
export const SAVE_FILE_EXTENSION = '.ageborn';

/**
 * Default player settings (DESIGN A9 #15, A12, A13, B6). Volumes and shake are 0-1 sliders; damage
 * numbers default to "Important" (A12); speed 1x (A2.12).
 */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  volume: Object.freeze({ master: 1, music: 1, sfx: 1, ui: 1 }),
  graphics: 'auto',
  reduceMotion: false,
  shake: 1,
  hitstop: true,
  damageNumbers: 'important',
  teamPreset: 'default',
  locale: 'en',
  defaultSpeed: 1,
  vibrate: false,
  mutedEmotes: false,
  breakReminder: true,
  quickReveal: false,
}) as Readonly<Settings>;

/** A fresh, mutable copy of the default settings (for a new profile or before any save exists). */
export function defaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS, volume: { ...DEFAULT_SETTINGS.volume } };
}
